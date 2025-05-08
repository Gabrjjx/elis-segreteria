import { storage } from '../storage';
import { Service } from '@shared/schema';

// Verifica la presenza dei client ID e secret di PayPal
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  console.warn('PayPal credentials not found. PayPal payment processing will not work.');
}

// In un'implementazione completa, qui si utilizzerebbe il PayPal SDK
// per creare e gestire gli ordini. Per semplicità, simuliamo i passaggi.

/**
 * Crea un nuovo ordine PayPal
 * @param serviceIds ID dei servizi da pagare (array per pagamenti multipli)
 * @param amount Importo totale
 * @param currency Valuta (default EUR)
 * @param sigla Opzionale, sigla dell'utente per pagamenti pubblici
 */
export async function createOrder(
  serviceIds: number | number[], 
  amount: number, 
  currency: string = 'EUR',
  sigla?: string
): Promise<{ id: string }> {
  try {
    // Convertiamo serviceIds in array se è un numero singolo
    const serviceIdsList = Array.isArray(serviceIds) ? serviceIds : [serviceIds];
    
    // Validazione
    if (serviceIdsList.length === 0) {
      throw new Error('No service IDs provided');
    }

    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid amount');
    }

    // Verifichiamo che tutti i servizi esistano
    for (const id of serviceIdsList) {
      if (id > 0) { // Ignoriamo l'ID speciale -1 usato nelle richieste pubbliche
        const service = await storage.getService(id);
        if (!service) {
          throw new Error(`Service with ID ${id} not found`);
        }
        
        if (service.status === 'paid') {
          throw new Error(`Service with ID ${id} is already paid`);
        }
      }
    }

    // Genera un ID ordine simulato
    const orderId = `PPORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Salva le informazioni dell'ordine
    await storage.storePaypalOrderInfo(orderId, {
      serviceIds: serviceIdsList,
      sigla, // Salviamo anche la sigla se presente
      amount,
      currency,
      status: 'CREATED', // Stati PayPal: CREATED, APPROVED, COMPLETED, VOIDED, EXPIRED
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return { id: orderId };
  } catch (error) {
    console.error('Error creating PayPal order:', error);
    throw error;
  }
}

/**
 * Cattura un pagamento PayPal (completa la transazione)
 */
export async function captureOrder(orderId: string): Promise<{ success: boolean, order: any }> {
  try {
    // Recupera le informazioni dell'ordine
    const orderInfo = await storage.getPaypalOrderInfo(orderId);
    
    if (!orderInfo) {
      throw new Error(`PayPal order ${orderId} not found`);
    }

    if (orderInfo.status === 'COMPLETED') {
      throw new Error('Order has already been captured');
    }

    // Aggiorna lo stato dell'ordine
    const updatedOrder = {
      ...orderInfo,
      status: 'COMPLETED',
      updatedAt: new Date().toISOString(),
      capturedAt: new Date().toISOString()
    };

    await storage.updatePaypalOrderInfo(orderId, updatedOrder);

    // Gestisci i servizi associati all'ordine
    const receiptIds = [];
    
    // Supporto per il vecchio formato con serviceId singolo
    if (orderInfo.serviceId && !orderInfo.serviceIds) {
      const serviceId = orderInfo.serviceId;
      const service = await storage.getService(serviceId);
      
      if (service) {
        await storage.updateService(serviceId, { status: 'paid' });
        
        // Crea una ricevuta
        const receiptId = await storage.createReceipt({
          serviceId,
          amount: orderInfo.amount,
          currency: orderInfo.currency || 'EUR',
          paymentMethod: 'paypal',
          paymentReference: orderId,
          date: new Date(),
        });
        
        receiptIds.push(receiptId);
      }
    } 
    // Nuovo formato con array di serviceIds
    else if (orderInfo.serviceIds && Array.isArray(orderInfo.serviceIds)) {
      // Contatore per verificare il numero di servizi effettivamente aggiornati
      let updatedServices = 0;
      
      // Se è un pagamento multiplo, creiamo una ricevuta per ogni servizio
      for (const serviceId of orderInfo.serviceIds) {
        if (serviceId > 0) { // Ignoriamo eventuali ID speciali come -1
          const service = await storage.getService(serviceId);
          
          if (service && service.status !== 'paid') {
            // Aggiorna lo stato del servizio
            await storage.updateService(serviceId, { status: 'paid' });
            updatedServices++;
            
            // Crea una ricevuta individuale per questo servizio
            const receiptId = await storage.createReceipt({
              serviceId,
              amount: service.amount, // Usiamo l'importo specifico di questo servizio
              currency: orderInfo.currency || 'EUR',
              paymentMethod: 'paypal',
              paymentReference: orderId,
              date: new Date(),
            });
            
            receiptIds.push(receiptId);
          }
        }
      }
      
      // Se non abbiamo aggiornato nessun servizio, creiamo una ricevuta generica
      if (updatedServices === 0 && orderInfo.sigla) {
        // Creiamo una ricevuta generica con la sigla
        const receiptId = await storage.createReceipt({
          amount: orderInfo.amount,
          currency: orderInfo.currency || 'EUR',
          paymentMethod: 'paypal',
          paymentReference: orderId,
          date: new Date(),
          notes: `Pagamento multiplo per sigla: ${orderInfo.sigla}`
        });
        receiptIds.push(receiptId);
      }
    }
    
    // Aggiorna l'ordine con i riferimenti alle ricevute
    if (receiptIds.length > 0) {
      updatedOrder.receiptIds = receiptIds;
      await storage.updatePaypalOrderInfo(orderId, updatedOrder);
    }

    return { success: true, order: updatedOrder };
  } catch (error) {
    console.error('Error capturing PayPal order:', error);
    throw error;
  }
}

/**
 * Annulla un ordine PayPal
 */
export async function cancelOrder(orderId: string): Promise<{ success: boolean }> {
  try {
    // Recupera le informazioni dell'ordine
    const orderInfo = await storage.getPaypalOrderInfo(orderId);
    
    if (!orderInfo) {
      throw new Error(`PayPal order ${orderId} not found`);
    }

    if (orderInfo.status === 'COMPLETED') {
      throw new Error('Cannot cancel a completed order');
    }

    // Aggiorna lo stato dell'ordine
    await storage.updatePaypalOrderInfo(orderId, {
      ...orderInfo,
      status: 'VOIDED',
      updatedAt: new Date().toISOString(),
      canceledAt: new Date().toISOString()
    });

    return { success: true };
  } catch (error) {
    console.error('Error canceling PayPal order:', error);
    throw error;
  }
}

/**
 * Controlla lo stato di un ordine PayPal
 */
export async function checkOrderStatus(orderId: string): Promise<any> {
  try {
    const orderInfo = await storage.getPaypalOrderInfo(orderId);
    
    if (!orderInfo) {
      throw new Error(`PayPal order ${orderId} not found`);
    }

    return orderInfo;
  } catch (error) {
    console.error('Error checking PayPal order status:', error);
    throw error;
  }
}