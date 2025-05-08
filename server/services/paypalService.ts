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
 */
export async function createOrder(serviceId: number, amount: string, currency: string = 'EUR'): Promise<{ id: string }> {
  try {
    // Validazione
    if (!serviceId || isNaN(Number(serviceId))) {
      throw new Error('Invalid service ID');
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Invalid amount');
    }

    // Recupera il servizio dal database
    const service = await storage.getService(serviceId);
    if (!service) {
      throw new Error(`Service with ID ${serviceId} not found`);
    }

    // Genera un ID ordine simulato
    const orderId = `PPORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Salva le informazioni dell'ordine
    await storage.storePaypalOrderInfo(orderId, {
      serviceId,
      amount: numAmount,
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

    // Aggiorna lo stato del servizio a "pagato"
    const serviceId = orderInfo.serviceId;
    if (serviceId) {
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
        
        updatedOrder.receiptId = receiptId;
        await storage.updatePaypalOrderInfo(orderId, updatedOrder);
      }
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