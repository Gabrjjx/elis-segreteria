import { storage } from '../storage';
import { Service } from '@shared/schema';

// Verifica la presenza dei client ID e secret di PayPal
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  console.warn('PayPal credentials not found. PayPal payment processing will not work.');
}

/**
 * Crea un nuovo ordine PayPal per il pagamento di uno o più servizi
 * @param serviceIds ID dei servizi da pagare (array per pagamenti multipli)
 * @param amount Importo totale
 * @param currency Valuta (default EUR)
 * @param sigla Sigla dell'utente (per pagamenti pubblici)
 */
export async function createOrder(
  serviceIds: number | number[], 
  amount: number, 
  currency: string = 'EUR',
  sigla?: string
): Promise<{ id: string }> {
  // Convertiamo serviceIds in array se è un numero singolo
  const serviceIdsList = Array.isArray(serviceIds) ? serviceIds : [serviceIds];
  
  // Genera un ID ordine simulato
  const orderId = `PPORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Salva le informazioni dell'ordine
  await storage.storePaypalOrderInfo(orderId, {
    serviceIds: serviceIdsList,
    sigla,
    amount,
    currency,
    status: 'CREATED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  return { id: orderId };
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
      return { success: true, order: orderInfo };
    }

    // Impostiamo lo stato a COMPLETED senza eliminare l'ordine
    await storage.updatePaypalOrderInfo(orderId, {
      status: 'COMPLETED'
    });
    
    // Recupera l'ordine aggiornato
    const updatedOrderInfo = await storage.getPaypalOrderInfo(orderId);

    // Aggiorna lo stato dei servizi a "pagati" se presenti ID servizi
    if (orderInfo.serviceIds && Array.isArray(orderInfo.serviceIds)) {
      for (const serviceId of orderInfo.serviceIds) {
        if (serviceId > 0) {
          const service = await storage.getService(serviceId);
          
          if (service && service.status !== 'paid') {
            await storage.updateService(serviceId, { status: 'paid' });
          }
        }
      }
    } 
    // Supporto per vecchio formato con singolo serviceId
    else if (orderInfo.serviceId) {
      const service = await storage.getService(orderInfo.serviceId);
      
      if (service && service.status !== 'paid') {
        await storage.updateService(orderInfo.serviceId, { status: 'paid' });
      }
    }

    return { success: true, order: updatedOrderInfo || orderInfo };
  } catch (error) {
    console.error("Errore durante la cattura dell'ordine:", error);
    throw error;
  }
}

/**
 * Controlla lo stato di un ordine PayPal
 */
export async function checkOrderStatus(orderId: string): Promise<any> {
  const orderInfo = await storage.getPaypalOrderInfo(orderId);
  
  if (!orderInfo) {
    throw new Error(`PayPal order ${orderId} not found`);
  }

  return orderInfo;
}