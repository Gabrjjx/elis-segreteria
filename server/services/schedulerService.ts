import cron from 'node-cron';
import { reportService } from './reportService';
import * as fs from 'fs';
import * as path from 'path';

export class SchedulerService {
  private reportJob: cron.ScheduledTask | null = null;

  async start() {
    console.log('Starting scheduler service...');
    
    // Schedule daily report generation at 23:00 (11 PM)
    this.reportJob = cron.schedule('0 23 * * *', async () => {
      await this.generateDailyReport();
    }, {
      scheduled: true,
      timezone: 'Europe/Rome'
    });

    console.log('Daily report job scheduled for 23:00 (Europe/Rome timezone)');
    
    // Optional: Generate a test report immediately on startup (for development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: generating test report...');
      await this.generateDailyReport();
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

  stop() {
    if (this.reportJob) {
      this.reportJob.stop();
      console.log('Daily report job stopped');
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