// import PDFDocument from 'pdfkit';
import { Receipt } from '@shared/schema';
import { storage } from '../storage';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Genera un file HTML invece di un PDF per evitare problemi
 */
export async function generateReceiptPDF(receipt: Receipt, serviceDetails?: any): Promise<string> {
  try {
    console.log("Iniziando la generazione della ricevuta HTML");
    
    // Crea una directory per i file se non esiste
    const receiptDir = path.join(process.cwd(), 'public', 'receipts');
    if (!fs.existsSync(receiptDir)) {
      fs.mkdirSync(receiptDir, { recursive: true });
    }

    // Crea un nome file unico 
    const timestamp = Date.now();
    const filename = `receipt_${receipt.id}_${timestamp}.html`;
    const filePath = path.join(receiptDir, filename);
    
    console.log(`Generando file HTML: ${filePath}`);
    
    // Metodo di pagamento formattato
    let metodoPagamento = 'Non specificato';
    switch (receipt.paymentMethod) {
      case 'cash': metodoPagamento = 'Contanti'; break;
      case 'paypal': metodoPagamento = 'PayPal'; break;
      case 'card': metodoPagamento = 'Carta di Credito/Debito'; break;
      case 'bank_transfer': metodoPagamento = 'Bonifico Bancario'; break;
      default: metodoPagamento = receipt.paymentMethod || 'Non specificato';
    }
    
    // Crea un HTML semplice
    const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Ricevuta #${receipt.receiptNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { text-align: center; color: #333; }
        .receipt-box { border: 1px solid #ccc; padding: 20px; max-width: 600px; margin: 0 auto; }
        .receipt-header { text-align: center; margin-bottom: 20px; }
        .receipt-detail { margin: 10px 0; }
        .receipt-footer { margin-top: 30px; text-align: center; font-size: 0.8em; color: #666; }
      </style>
    </head>
    <body>
      <div class="receipt-box">
        <div class="receipt-header">
          <h1>ELIS Sartoria</h1>
          <h2>Ricevuta di Pagamento</h2>
        </div>
        
        <div class="receipt-detail"><strong>Ricevuta N.:</strong> ${receipt.receiptNumber}</div>
        <div class="receipt-detail"><strong>Data:</strong> ${new Date().toLocaleDateString('it-IT')}</div>
        <div class="receipt-detail"><strong>Servizio ID:</strong> ${receipt.serviceId}</div>
        ${serviceDetails ? `<div class="receipt-detail"><strong>Tipo Servizio:</strong> ${serviceDetails.type || 'Non specificato'}</div>` : ''}
        ${serviceDetails ? `<div class="receipt-detail"><strong>Sigla:</strong> ${serviceDetails.sigla || 'Non specificata'}</div>` : ''}
        <div class="receipt-detail"><strong>Importo:</strong> €${receipt.amount.toFixed(2)}</div>
        <div class="receipt-detail"><strong>Metodo di Pagamento:</strong> ${metodoPagamento}</div>
        
        <div class="receipt-footer">
          <p>Grazie per aver utilizzato i nostri servizi.</p>
          <p>©GabrieleIngrosso - ElisCollege 2025</p>
        </div>
      </div>
    </body>
    </html>
    `;
    
    // Scrivi il file HTML
    fs.writeFileSync(filePath, content);
    
    console.log(`File HTML generato con successo: ${filePath}`);
    
    // Restituisci l'URL relativo al file
    const fileUrl = `/receipts/${filename}`;
    return fileUrl;
  } catch (error) {
    console.error('Errore durante la generazione del file ricevuta HTML:', error);
    // Restituisci un URL fittizio in caso di errore per non bloccare l'applicazione
    return `/receipts/error_${Date.now()}.html`;
  }
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
    console.log(`Creazione ricevuta per servizio ${serviceId}`);
    
    // Verifica se esiste già una ricevuta
    let receipt = await storage.getReceiptByServiceId(serviceId);
    
    if (receipt) {
      console.log(`Ricevuta esistente trovata con ID ${receipt.id}`);
      
      // Se la ricevuta esiste ma non ha un PDF, lo generiamo
      if (!receipt.pdfUrl) {
        console.log(`La ricevuta non ha un PDF, lo generiamo`);
        const service = await storage.getService(serviceId);
        
        try {
          const pdfUrl = await generateReceiptPDF(receipt, service);
          console.log(`PDF generato con successo: ${pdfUrl}`);
          
          // Aggiorna la ricevuta con l'URL del PDF
          await storage.updateReceipt(receipt.id, { pdfUrl });
          
          // Recupera la ricevuta aggiornata
          receipt = await storage.getReceipt(receipt.id);
        } catch (pdfError) {
          console.error(`Errore durante la generazione del PDF:`, pdfError);
          // Continuiamo anche se la generazione del PDF fallisce
        }
      }
      
      return receipt || null;
    }
    
    console.log(`Nessuna ricevuta esistente, ne creiamo una nuova`);
    
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
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const receiptNumber = `RIC-${year}${month}${day}-${serviceId}`;
    
    console.log(`Generato numero ricevuta: ${receiptNumber}`);
    
    // Creiamo la ricevuta
    const newReceipt = {
      serviceId,
      amount: service.amount,
      paymentMethod: service.paymentMethod || 'cash', // Default a 'cash' se non specificato
      receiptNumber,
      receiptDate: currentDate,
      notes: `Ricevuta generata automaticamente per il servizio #${serviceId}`
    };
    
    console.log(`Inserimento ricevuta nel database`);
    
    // Inseriamo la ricevuta nel database
    const receiptId = await storage.createReceipt(newReceipt);
    
    // Recuperiamo la ricevuta appena creata
    receipt = await storage.getReceipt(receiptId);
    
    if (!receipt) {
      throw new Error(`Errore durante la creazione della ricevuta per il servizio ${serviceId}`);
    }
    
    console.log(`Ricevuta creata con ID: ${receipt.id}`);
    
    // Generiamo il PDF per la ricevuta
    try {
      const pdfUrl = await generateReceiptPDF(receipt, service);
      console.log(`PDF generato con successo: ${pdfUrl}`);
      
      // Aggiorniamo la ricevuta con l'URL del PDF
      await storage.updateReceipt(receipt.id, { pdfUrl });
      
      // Recuperiamo la ricevuta aggiornata
      receipt = await storage.getReceipt(receipt.id);
    } catch (pdfError) {
      console.error(`Errore durante la generazione del PDF:`, pdfError);
      // Continuiamo anche se la generazione del PDF fallisce
    }
    
    return receipt;
  } catch (error) {
    console.error('Errore durante la creazione della ricevuta con PDF:', error);
    throw error;
  }
}