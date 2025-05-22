import PDFDocument from 'pdfkit';
import { Receipt } from '@shared/schema';
import { storage } from '../storage';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Genera un PDF per una ricevuta
 */
export async function generateReceiptPDF(receipt: Receipt, serviceDetails?: any): Promise<string> {
  // Crea una directory per i PDF se non esiste
  const pdfDir = path.join(process.cwd(), 'public', 'receipts');
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  // Crea un nome file unico per il PDF
  const filename = `receipt_${receipt.id}_${Date.now()}.pdf`;
  const pdfPath = path.join(pdfDir, filename);
  
  // Crea un nuovo documento PDF
  const doc = new PDFDocument({ margin: 50 });
  
  // Pipe il PDF in un file
  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);
  
  // Aggiungi l'intestazione
  doc.fontSize(20).text('ELIS Sartoria', { align: 'center' });
  doc.fontSize(14).text('Ricevuta di Pagamento', { align: 'center' });
  doc.moveDown();
  
  // Aggiungi una linea separatrice
  doc.moveTo(50, doc.y)
     .lineTo(doc.page.width - 50, doc.y)
     .stroke();
  doc.moveDown();
  
  // Dettagli della ricevuta
  doc.fontSize(12).text(`Numero Ricevuta: ${receipt.receiptNumber}`);
  doc.text(`Data: ${new Date(receipt.receiptDate).toLocaleDateString('it-IT')}`);
  doc.moveDown();
  
  // Dettagli del servizio
  if (serviceDetails) {
    doc.text(`Servizio: ${serviceDetails.type}`);
    doc.text(`Sigla: ${serviceDetails.sigla}`);
    doc.text(`Pezzi: ${serviceDetails.pieces}`);
    if (serviceDetails.notes) {
      doc.text(`Note: ${serviceDetails.notes}`);
    }
  } else {
    doc.text(`Servizio ID: ${receipt.serviceId}`);
  }
  doc.moveDown();
  
  // Dettagli del pagamento
  doc.text(`Importo: €${receipt.amount.toFixed(2)}`);
  doc.text(`Metodo di Pagamento: ${formatPaymentMethod(receipt.paymentMethod)}`);
  doc.moveDown();
  
  // Note aggiuntive
  if (receipt.notes) {
    doc.text(`Note: ${receipt.notes}`);
    doc.moveDown();
  }
  
  // Piè di pagina
  doc.fontSize(10).text('Grazie per aver utilizzato i nostri servizi.', { align: 'center' });
  doc.text('ELIS Sartoria - Servizi di sartoria per gli studenti ELIS', { align: 'center' });
  
  // Finalizza il PDF
  doc.end();
  
  // Attendi che il file sia stato scritto completamente
  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      // Restituisci l'URL relativo al PDF
      const pdfUrl = `/receipts/${filename}`;
      resolve(pdfUrl);
    });
    
    writeStream.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Formatta il metodo di pagamento per la visualizzazione
 */
function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    'cash': 'Contanti',
    'paypal': 'PayPal',
    'card': 'Carta di Credito/Debito',
    'bank_transfer': 'Bonifico Bancario'
  };
  
  return methods[method] || method;
}

/**
 * Crea una ricevuta per un servizio e genera il relativo PDF
 */
export async function createReceiptWithPDF(serviceId: number): Promise<Receipt | null> {
  try {
    // Verifica se esiste già una ricevuta
    let receipt = await storage.getReceiptByServiceId(serviceId);
    
    if (receipt) {
      // Se la ricevuta esiste ma non ha un PDF, lo generiamo
      if (!receipt.pdfUrl) {
        const service = await storage.getService(serviceId);
        const pdfUrl = await generateReceiptPDF(receipt, service);
        
        // Aggiorna la ricevuta con l'URL del PDF
        await storage.updateReceipt(receipt.id, { pdfUrl });
        
        // Recupera la ricevuta aggiornata
        receipt = await storage.getReceipt(receipt.id);
      }
      
      return receipt || null;
    }
    
    // Se non esiste una ricevuta, ne creiamo una nuova
    const service = await storage.getService(serviceId);
    
    if (!service) {
      throw new Error(`Servizio con ID ${serviceId} non trovato`);
    }
    
    // Verifichiamo se il servizio è stato pagato
    const isPaid = service.status === 'paid' || 
                   service.status === 'completed' || 
                   service.paymentMethod; // Se ha un metodo di pagamento, lo consideriamo come pagato
    
    if (!isPaid) {
      throw new Error(`Il servizio ${serviceId} non risulta pagato, impossibile generare la ricevuta`);
    }
    
    // Generiamo un numero di ricevuta unico
    const now = new Date();
    const receiptNumber = `RIC-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${serviceId}`;
    
    // Creiamo la ricevuta
    const newReceipt: any = {
      serviceId: serviceId,
      amount: service.amount,
      paymentMethod: service.paymentMethod || 'cash', // Default a 'cash' se non specificato
      receiptNumber: receiptNumber,
      receiptDate: new Date(),
      notes: `Ricevuta generata automaticamente per il servizio #${serviceId}`
    };
    
    // Inseriamo la ricevuta nel database
    const receiptId = await storage.createReceipt(newReceipt);
    
    // Recuperiamo la ricevuta appena creata
    receipt = await storage.getReceipt(receiptId);
    
    if (!receipt) {
      throw new Error(`Errore durante la creazione della ricevuta per il servizio ${serviceId}`);
    }
    
    // Generiamo il PDF per la ricevuta
    const pdfUrl = await generateReceiptPDF(receipt, service);
    
    // Aggiorniamo la ricevuta con l'URL del PDF
    await storage.updateReceipt(receipt.id, { pdfUrl });
    
    // Recuperiamo la ricevuta aggiornata
    receipt = await storage.getReceipt(receipt.id);
    
    return receipt;
  } catch (error) {
    console.error('Errore durante la creazione della ricevuta con PDF:', error);
    throw error;
  }
}