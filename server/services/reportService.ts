import { storage } from "../storage";
import { jsPDF } from "jspdf";
import * as fs from "fs";
import * as path from "path";
import sgMail from "@sendgrid/mail";

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface DailyReportData {
  date: string;
  services: {
    total: number;
    paid: number;
    unpaid: number;
    byType: {
      siglatura: number;
      riparazione: number;
      happyHour: number;
    };
    totalAmount: number;
    paidAmount: number;
  };
  payments: {
    secretariat: Array<{
      orderId: string;
      sigla: string;
      customerName: string;
      amount: number;
      status: string;
      createdAt: string;
    }>;
    totalSecretariatAmount: number;
  };
  maintenance: {
    newRequests: number;
    completedRequests: number;
    urgentRequests: number;
  };
  students: {
    newStudents: number;
  };
}

export class ReportService {
  
  async getDailyReportData(date: Date): Promise<DailyReportData> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get services data
    const servicesData = await storage.getServices({
      startDate: startOfDay.toISOString().split('T')[0],
      endDate: endOfDay.toISOString().split('T')[0],
      page: 1,
      limit: 1000
    });

    const serviceMetrics = {
      total: servicesData.services.length,
      paid: servicesData.services.filter(s => s.status === 'paid').length,
      unpaid: servicesData.services.filter(s => s.status === 'unpaid').length,
      byType: {
        siglatura: servicesData.services.filter(s => s.type === 'siglatura').length,
        riparazione: servicesData.services.filter(s => s.type === 'riparazione').length,
        happyHour: servicesData.services.filter(s => s.type === 'happy_hour').length,
      },
      totalAmount: servicesData.services.reduce((sum, s) => sum + s.amount, 0),
      paidAmount: servicesData.services.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.amount, 0)
    };

    // Get secretariat payments (from new table)
    const secretariatPayments = await this.getSecretariatPayments(startOfDay, endOfDay);

    // Get maintenance requests
    const maintenanceRequests = await storage.getMaintenanceRequests({
      startDate: startOfDay.toISOString().split('T')[0],
      endDate: endOfDay.toISOString().split('T')[0],
      page: 1,
      limit: 1000
    });

    const maintenanceMetrics = {
      newRequests: maintenanceRequests.requests.length,
      completedRequests: maintenanceRequests.requests.filter(r => r.status === 'completed').length,
      urgentRequests: maintenanceRequests.requests.filter(r => r.priority === 'urgent').length
    };

    // Get new students
    const studentsData = await storage.getStudents({
      page: 1,
      limit: 1000
    });

    const newStudents = studentsData.students.filter(student => {
      const createdAt = new Date(student.createdAt);
      return createdAt >= startOfDay && createdAt <= endOfDay;
    });

    return {
      date: date.toISOString().split('T')[0],
      services: serviceMetrics,
      payments: {
        secretariat: secretariatPayments,
        totalSecretariatAmount: secretariatPayments.reduce((sum, p) => sum + p.amount, 0)
      },
      maintenance: maintenanceMetrics,
      students: {
        newStudents: newStudents.length
      }
    };
  }

  private async getSecretariatPayments(startDate: Date, endDate: Date) {
    try {
      // Use Drizzle ORM to query secretariat_payments table
      const { db } = await import("../db");
      const { secretariatPayments } = await import("@shared/schema");
      const { gte, lte } = await import("drizzle-orm");
      
      const { and } = await import("drizzle-orm");
      
      const result = await db.select().from(secretariatPayments)
        .where(
          and(
            gte(secretariatPayments.createdAt, startDate),
            lte(secretariatPayments.createdAt, endDate)
          )
        );

      return result.map(payment => ({
        orderId: payment.orderId,
        sigla: payment.sigla,
        customerName: payment.customerName,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt.toISOString()
      }));
    } catch (error) {
      console.error("Error fetching secretariat payments:", error);
      return [];
    }
  }

  generatePDF(data: DailyReportData): Buffer {
    const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('it-IT');

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Header
    doc.setFontSize(24);
    doc.setTextColor(0, 123, 255);
    doc.text('Report Giornaliero ELIS', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 10;
    doc.setFontSize(14);
    doc.setTextColor(102, 102, 102);
    doc.text(formatDate(data.date), pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 20;

    // Services section
    doc.setFontSize(16);
    doc.setTextColor(0, 123, 255);
    doc.text('Servizi di Sartoria', 20, yPosition);
    yPosition += 15;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    
    // Services stats in grid format
    const stats = [
      ['Servizi Totali', data.services.total.toString()],
      ['Pagati', data.services.paid.toString()],
      ['In Sospeso', data.services.unpaid.toString()],
      ['Importo Totale', formatCurrency(data.services.totalAmount)],
      ['Siglature', data.services.byType.siglatura.toString()],
      ['Riparazioni', data.services.byType.riparazione.toString()],
      ['Happy Hour', data.services.byType.happyHour.toString()],
      ['Incassato', formatCurrency(data.services.paidAmount)]
    ];

    let col = 0;
    for (const [label, value] of stats) {
      const x = 20 + (col * 90);
      doc.text(`${label}: ${value}`, x, yPosition);
      col++;
      if (col >= 2) {
        col = 0;
        yPosition += 8;
      }
    }
    if (col > 0) yPosition += 8;

    yPosition += 15;

    // Payments section
    doc.setFontSize(16);
    doc.setTextColor(0, 123, 255);
    doc.text('Pagamenti Segreteria', 20, yPosition);
    yPosition += 15;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    if (data.payments.secretariat.length > 0) {
      for (const payment of data.payments.secretariat.slice(0, 10)) { // Limit to first 10
        doc.text(`${payment.customerName} (${payment.sigla})`, 20, yPosition);
        doc.text(`${formatCurrency(payment.amount)} - ${payment.status}`, 120, yPosition);
        yPosition += 8;
        
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }
      }
      
      yPosition += 10;
      doc.setFontSize(14);
      doc.setTextColor(0, 123, 255);
      doc.text(`Totale: ${formatCurrency(data.payments.totalSecretariatAmount)}`, 20, yPosition);
      yPosition += 15;
    } else {
      doc.text('Nessun pagamento registrato oggi', 20, yPosition);
      yPosition += 15;
    }

    // Maintenance section
    doc.setFontSize(16);
    doc.setTextColor(0, 123, 255);
    doc.text('Richieste di Manutenzione', 20, yPosition);
    yPosition += 15;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Nuove Richieste: ${data.maintenance.newRequests}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Completate: ${data.maintenance.completedRequests}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Urgenti: ${data.maintenance.urgentRequests}`, 20, yPosition);
    yPosition += 15;

    // Students section
    doc.setFontSize(16);
    doc.setTextColor(0, 123, 255);
    doc.text('Nuovi Studenti', 20, yPosition);
    yPosition += 15;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Registrati Oggi: ${data.students.newStudents}`, 20, yPosition);
    yPosition += 20;

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(102, 102, 102);
    const footerText = `Report generato automaticamente il ${new Date().toLocaleString('it-IT')}`;
    doc.text(footerText, pageWidth / 2, pageHeight - 15, { align: 'center' });
    doc.text('©GabrieleIngrosso - ElisCollege 2025', pageWidth / 2, pageHeight - 10, { align: 'center' });

    return Buffer.from(doc.output('arraybuffer'));
  }

  async sendEmailReport(data: DailyReportData, pdfBuffer: Buffer): Promise<void> {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error("SendGrid API key not configured");
    }

    const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('it-IT');

    const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #007bff;">Report Giornaliero ELIS - ${formatDate(data.date)}</h2>
      
      <h3>Servizi di Sartoria</h3>
      <ul>
        <li>Servizi totali: <strong>${data.services.total}</strong></li>
        <li>Pagati: <strong>${data.services.paid}</strong></li>
        <li>In sospeso: <strong>${data.services.unpaid}</strong></li>
        <li>Importo totale: <strong>${formatCurrency(data.services.totalAmount)}</strong></li>
        <li>Incassato: <strong>${formatCurrency(data.services.paidAmount)}</strong></li>
      </ul>

      <h3>Pagamenti Segreteria</h3>
      <p>Totale pagamenti: <strong>${formatCurrency(data.payments.totalSecretariatAmount)}</strong></p>
      <p>Numero transazioni: <strong>${data.payments.secretariat.length}</strong></p>

      <h3>Manutenzione</h3>
      <ul>
        <li>Nuove richieste: <strong>${data.maintenance.newRequests}</strong></li>
        <li>Completate: <strong>${data.maintenance.completedRequests}</strong></li>
        <li>Urgenti: <strong>${data.maintenance.urgentRequests}</strong></li>
      </ul>

      <h3>Studenti</h3>
      <p>Nuovi registrati: <strong>${data.students.newStudents}</strong></p>

      <hr style="margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        Report generato automaticamente il ${new Date().toLocaleString('it-IT')}<br>
        Sistema ELIS - Amministrazione Residenza
      </p>
    </div>
    `;

    const msg = {
      to: [
        'amministrazione@elis.org',
        'segreteria@elis.org'
      ],
      from: {
        email: 'noreply@replit.dev',
        name: 'Sistema ELIS'
      },
      subject: `Report Giornaliero ELIS - ${formatDate(data.date)}`,
      html: emailContent,
      attachments: [
        {
          content: pdfBuffer.toString('base64'),
          filename: `report_${data.date}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    };

    try {
      await sgMail.sendMultiple(msg);
      console.log(`Email report sent successfully for ${data.date}`);
    } catch (error) {
      console.error('Failed to send email report:', error);
      throw error;
    }
  }

  async saveDailyReport(date: Date, sendEmail: boolean = true): Promise<string> {
    const data = await this.getDailyReportData(date);
    const pdf = this.generatePDF(data);
    
    // Create reports directory if it doesn't exist
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const fileName = `report_${data.date}.pdf`;
    const filePath = path.join(reportsDir, fileName);
    
    fs.writeFileSync(filePath, pdf);
    console.log(`Daily report saved: ${filePath}`);

    // Send email if enabled
    if (sendEmail && process.env.SENDGRID_API_KEY) {
      try {
        await this.sendEmailReport(data, pdf);
        console.log(`Email sent successfully for report: ${fileName}`);
      } catch (error) {
        console.error(`Failed to send email for report ${fileName}:`, error);
      }
    }
    
    return filePath;
  }
}

export const reportService = new ReportService();