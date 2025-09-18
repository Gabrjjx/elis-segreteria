import * as cron from 'node-cron';
import { reportService } from './reportService';
import * as fs from 'fs';
import * as path from 'path';
import { storage } from '../storage';
import { SecretariatPaymentStatus } from '@shared/schema';
import Stripe from 'stripe';

// Initialize Stripe client for scheduled reconciliation
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: "2024-12-18.acacia",
});

export class SchedulerService {
  private reportJob: any = null;
  private paymentReconciliationJob: any = null;

  async start() {
    console.log('Starting scheduler service...');
    
    // Schedule daily report generation at 23:00 (11 PM)
    this.reportJob = cron.schedule('0 23 * * *', async () => {
      await this.generateDailyReport();
    }, {
      timezone: 'Europe/Rome'
    });

    console.log('Daily report job scheduled for 23:00 (Europe/Rome timezone)');
    
    // 🚀 AUTOMAZIONE 100%: Schedule payment reconciliation every 5 minutes
    this.paymentReconciliationJob = cron.schedule('*/5 * * * *', async () => {
      await this.reconcileStuckPayments();
    }, {
      timezone: 'Europe/Rome'
    });

    console.log('🔄 Payment reconciliation job scheduled every 5 minutes for 100% automation');
    
    // Optional: Generate a test report immediately on startup (for development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: generating test report...');
      setTimeout(async () => {
        await this.generateDailyReport();
      }, 2000);
    }
  }

  async generateDailyReport(date?: Date) {
    const reportDate = date || new Date();
    console.log(`Generating daily report for ${reportDate.toDateString()}...`);
    
    try {
      const filePath = await reportService.saveDailyReport(reportDate);
      console.log(`Daily report generated successfully: ${filePath}`);
      
      // Log report statistics
      const stats = fs.statSync(filePath);
      console.log(`Report size: ${(stats.size / 1024).toFixed(2)} KB`);
      
      return filePath;
    } catch (error) {
      console.error('Failed to generate daily report:', error);
      throw error;
    }
  }

  // Method to generate report for a specific date (useful for manual execution)
  async generateReportForDate(dateString: string): Promise<string> {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }
    
    return await this.generateDailyReport(date);
  }

  // Get list of generated reports
  getGeneratedReports(): Array<{ fileName: string, date: string, size: number }> {
    const reportsDir = path.join(process.cwd(), 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      return [];
    }
    
    const files = fs.readdirSync(reportsDir)
      .filter(file => file.endsWith('.pdf') && file.startsWith('report_'))
      .map(file => {
        const filePath = path.join(reportsDir, file);
        const stats = fs.statSync(filePath);
        const dateMatch = file.match(/report_(\d{4}-\d{2}-\d{2})\.pdf/);
        
        return {
          fileName: file,
          date: dateMatch ? dateMatch[1] : 'unknown',
          size: stats.size
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date)); // Sort by date descending
    
    return files;
  }

  // Method to clean old reports (keep only last 30 days)
  cleanOldReports(daysToKeep: number = 30) {
    const reportsDir = path.join(process.cwd(), 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      return;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const files = fs.readdirSync(reportsDir);
    let deletedCount = 0;
    
    for (const file of files) {
      if (file.endsWith('.pdf') && file.startsWith('report_')) {
        const dateMatch = file.match(/report_(\d{4}-\d{2}-\d{2})\.pdf/);
        if (dateMatch) {
          const fileDate = new Date(dateMatch[1]);
          if (fileDate < cutoffDate) {
            const filePath = path.join(reportsDir, file);
            fs.unlinkSync(filePath);
            deletedCount++;
            console.log(`Deleted old report: ${file}`);
          }
        }
      }
    }
    
    console.log(`Cleaned ${deletedCount} old reports`);
  }

  // 🎯 AUTOMATIC RECONCILIATION: Check and fix stuck payments every 5 minutes
  private async reconcileStuckPayments() {
    try {
      console.log('🔍 Starting automatic payment reconciliation...');

      // Find payments stuck in PROCESSING status
      const processingPayments = await storage.getSecretariatPayments({
        status: SecretariatPaymentStatus.PROCESSING
      });
      
      if (processingPayments.length === 0) {
        console.log('✅ No processing payments found');
        return;
      }

      // Filter payments that are older than 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const stuckPayments = processingPayments.filter(payment => 
        new Date(payment.createdAt) < fiveMinutesAgo
      );

      if (stuckPayments.length === 0) {
        console.log(`⏳ Found ${processingPayments.length} processing payments but none older than 5 minutes`);
        return;
      }

      console.log(`🔧 Found ${stuckPayments.length} stuck payments to reconcile`);

      let reconciledCount = 0;
      let failedCount = 0;

      for (const payment of stuckPayments) {
        try {
          console.log(`🔄 Reconciling payment ${payment.orderId} (${payment.sigla})...`);

          // Query Stripe for payment intent status using metadata search
          const paymentIntents = await stripe.paymentIntents.list({
            limit: 100
          });

          const stripePayment = paymentIntents.data.find(pi => pi.metadata.orderId === payment.orderId);

          if (!stripePayment) {
            console.log(`⚠️  No Stripe payment found for ${payment.orderId}, skipping...`);
            continue;
          }

          console.log(`💳 Found Stripe payment ${stripePayment.id} with status: ${stripePayment.status}`);

          // If Stripe shows succeeded, update our database
          if (stripePayment.status === 'succeeded') {
            console.log(`💰 Reconciling succeeded payment: ${payment.orderId}`);

            // Update payment status
            await storage.updateSecretariatPaymentStatus(
              payment.orderId,
              SecretariatPaymentStatus.COMPLETED,
              new Date()
            );

            // Update associated services
            const serviceIdsStr = stripePayment.metadata.serviceIds;
            const serviceIds = serviceIdsStr ? 
              serviceIdsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : [];

            for (const serviceId of serviceIds) {
              try {
                await storage.updateService(serviceId, { status: "paid" });
                console.log(`✅ Reconciled service ${serviceId} to paid`);
              } catch (serviceError) {
                console.error(`❌ Failed to reconcile service ${serviceId}:`, serviceError);
              }
            }

            reconciledCount++;
            console.log(`🎉 Successfully reconciled payment ${payment.orderId} for sigla ${payment.sigla} (${serviceIds.length} services)`);

          } else if (stripePayment.status === 'canceled' || stripePayment.status === 'requires_payment_method') {
            // Update to failed status
            await storage.updateSecretariatPaymentStatus(
              payment.orderId,
              SecretariatPaymentStatus.FAILED,
              new Date()
            );
            console.log(`❌ Marked payment ${payment.orderId} as failed (Stripe status: ${stripePayment.status})`);

          } else {
            console.log(`⏳ Payment ${payment.orderId} still ${stripePayment.status} on Stripe, keeping as processing`);
          }

        } catch (paymentError) {
          console.error(`❌ Failed to reconcile payment ${payment.orderId}:`, paymentError);
          failedCount++;
        }
      }

      if (reconciledCount > 0 || failedCount > 0) {
        console.log(`🎯 Payment reconciliation completed: ${reconciledCount} reconciled, ${failedCount} failed`);
      }

    } catch (error) {
      console.error('❌ Payment reconciliation job failed:', error);
    }
  }

  stop() {
    if (this.reportJob) {
      this.reportJob.stop();
      console.log('Daily report job stopped');
    }
    
    if (this.paymentReconciliationJob) {
      this.paymentReconciliationJob.stop();
      console.log('Payment reconciliation job stopped');
    }
  }

  // Get next scheduled execution time
  getNextExecution(): string {
    if (this.reportJob) {
      const now = new Date();
      const next = new Date();
      next.setHours(23, 0, 0, 0);
      
      // If it's already past 23:00 today, schedule for tomorrow
      if (now.getHours() >= 23) {
        next.setDate(next.getDate() + 1);
      }
      
      return next.toLocaleString('it-IT');
    }
    
    return 'Not scheduled';
  }

  // Manual trigger for testing
  async triggerManualReport(): Promise<string> {
    console.log('Manual report generation triggered...');
    return await this.generateDailyReport();
  }
}

export const schedulerService = new SchedulerService();
