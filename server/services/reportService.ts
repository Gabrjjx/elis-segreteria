import { storage } from "../storage";
import jsPDF from "jspdf";
import * as fs from "fs";
import * as path from "path";

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

  generateReportHTML(data: DailyReportData): string {
    const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('it-IT');

    return `
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Report Giornaliero ELIS - ${formatDate(data.date)}</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
                color: #333;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                border-bottom: 3px solid #007bff;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .header h1 {
                margin: 0;
                color: #007bff;
                font-size: 28px;
            }
            .header .date {
                font-size: 16px;
                color: #666;
                margin-top: 5px;
            }
            .section {
                margin-bottom: 25px;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #007bff;
                background-color: #f8f9fa;
            }
            .section h2 {
                margin-top: 0;
                color: #007bff;
                font-size: 20px;
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }
            .stat-card {
                background: white;
                padding: 15px;
                border-radius: 6px;
                text-align: center;
                border: 1px solid #e9ecef;
            }
            .stat-value {
                font-size: 24px;
                font-weight: bold;
                color: #007bff;
            }
            .stat-label {
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
                margin-top: 5px;
            }
            .payment-list {
                background: white;
                border-radius: 6px;
                padding: 15px;
                margin-top: 15px;
            }
            .payment-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 0;
                border-bottom: 1px solid #eee;
            }
            .payment-item:last-child {
                border-bottom: none;
            }
            .payment-info {
                flex: 1;
            }
            .payment-amount {
                font-weight: bold;
                color: #28a745;
            }
            .status-badge {
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
            }
            .status-completed { background: #d4edda; color: #155724; }
            .status-processing { background: #fff3cd; color: #856404; }
            .status-pending { background: #f8d7da; color: #721c24; }
            .summary-total {
                background: #007bff;
                color: white;
                padding: 15px;
                border-radius: 6px;
                text-align: center;
                margin-top: 20px;
            }
            .summary-total h3 {
                margin: 0;
                font-size: 18px;
            }
            .summary-amount {
                font-size: 24px;
                font-weight: bold;
                margin-top: 5px;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e9ecef;
                color: #666;
                font-size: 12px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 Report Giornaliero ELIS</h1>
                <div class="date">${formatDate(data.date)}</div>
            </div>

            <!-- Servizi di Sartoria -->
            <div class="section">
                <h2>👔 Servizi di Sartoria</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${data.services.total}</div>
                        <div class="stat-label">Servizi Totali</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${data.services.paid}</div>
                        <div class="stat-label">Pagati</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${data.services.unpaid}</div>
                        <div class="stat-label">In Sospeso</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${formatCurrency(data.services.totalAmount)}</div>
                        <div class="stat-label">Importo Totale</div>
                    </div>
                </div>
                
                <div class="stats-grid" style="margin-top: 15px;">
                    <div class="stat-card">
                        <div class="stat-value">${data.services.byType.siglatura}</div>
                        <div class="stat-label">Siglature</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${data.services.byType.riparazione}</div>
                        <div class="stat-label">Riparazioni</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${data.services.byType.happyHour}</div>
                        <div class="stat-label">Happy Hour</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${formatCurrency(data.services.paidAmount)}</div>
                        <div class="stat-label">Incassato</div>
                    </div>
                </div>
            </div>

            <!-- Pagamenti Segreteria -->
            <div class="section">
                <h2>💳 Pagamenti Segreteria</h2>
                ${data.payments.secretariat.length > 0 ? `
                    <div class="payment-list">
                        ${data.payments.secretariat.map(payment => `
                            <div class="payment-item">
                                <div class="payment-info">
                                    <strong>${payment.customerName}</strong> (${payment.sigla})<br>
                                    <small>Ordine: ${payment.orderId}</small>
                                </div>
                                <div>
                                    <div class="payment-amount">${formatCurrency(payment.amount)}</div>
                                    <span class="status-badge status-${payment.status}">${payment.status}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="summary-total">
                        <h3>Totale Pagamenti Segreteria</h3>
                        <div class="summary-amount">${formatCurrency(data.payments.totalSecretariatAmount)}</div>
                    </div>
                ` : `
                    <p style="text-align: center; color: #666; font-style: italic;">Nessun pagamento registrato oggi</p>
                `}
            </div>

            <!-- Manutenzione -->
            <div class="section">
                <h2>🔧 Richieste di Manutenzione</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${data.maintenance.newRequests}</div>
                        <div class="stat-label">Nuove Richieste</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${data.maintenance.completedRequests}</div>
                        <div class="stat-label">Completate</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${data.maintenance.urgentRequests}</div>
                        <div class="stat-label">Urgenti</div>
                    </div>
                </div>
            </div>

            <!-- Studenti -->
            <div class="section">
                <h2>👥 Nuovi Studenti</h2>
                <div class="stat-card" style="max-width: 200px;">
                    <div class="stat-value">${data.students.newStudents}</div>
                    <div class="stat-label">Registrati Oggi</div>
                </div>
            </div>

            <div class="footer">
                Report generato automaticamente il ${new Date().toLocaleString('it-IT')}<br>
                Sistema ELIS - Amministrazione Residenza
            </div>
        </div>
    </body>
    </html>
    `;
  }

  async generatePDF(data: DailyReportData): Promise<Buffer> {
    const html = this.generateReportHTML(data);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        printBackground: true
      });
      
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  async saveDailyReport(date: Date): Promise<string> {
    const data = await this.getDailyReportData(date);
    const pdf = await this.generatePDF(data);
    
    // Create reports directory if it doesn't exist
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const fileName = `report_${data.date}.pdf`;
    const filePath = path.join(reportsDir, fileName);
    
    fs.writeFileSync(filePath, pdf);
    
    console.log(`Daily report saved: ${filePath}`);
    return filePath;
  }
}

export const reportService = new ReportService();