import {
  Client,
  Environment,
  LogLevel,
  OrdersController,
} from "@paypal/paypal-server-sdk";
import { Request, Response } from "express";
import { storage } from "../storage";

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;

if (!PAYPAL_CLIENT_ID) {
  throw new Error("Missing PAYPAL_CLIENT_ID");
}
if (!PAYPAL_CLIENT_SECRET) {
  throw new Error("Missing PAYPAL_CLIENT_SECRET");
}

// Configura il client PayPal
const client = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: PAYPAL_CLIENT_ID,
    oAuthClientSecret: PAYPAL_CLIENT_SECRET,
  },
  timeout: 0,
  environment:
    process.env.NODE_ENV === "production"
      ? Environment.Production
      : Environment.Sandbox,
  logging: {
    logLevel: LogLevel.Info,
    logRequest: {
      logBody: true,
    },
    logResponse: {
      logHeaders: true,
    },
  },
});

// Inizializza il controller PayPal
const ordersController = new OrdersController(client);

/**
 * Crea un ordine PayPal per un servizio
 */
export async function createPaypalOrder(req: Request, res: Response) {
  try {
    const { serviceId, amount, currency = "EUR" } = req.body;

    if (!serviceId) {
      return res.status(400).json({ error: "ID servizio mancante" });
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        error: "Importo non valido. L'importo deve essere un numero positivo.",
      });
    }

    // Crea l'ordine PayPal
    const collect = {
      body: {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toString(),
            },
            reference_id: `service_${serviceId}`,
            description: `Pagamento per servizio ID: ${serviceId}`,
          },
        ],
        application_context: {
          brand_name: "ELIS Residence",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
          return_url: `${req.protocol}://${req.get("host")}/api/paypal/capture`,
          cancel_url: `${req.protocol}://${req.get("host")}/api/paypal/cancel`,
        },
      },
      prefer: "return=representation",
    };

    const { body, ...httpResponse } = await ordersController.createOrder(collect);
    const jsonResponse = JSON.parse(String(body));

    // Memorizza temporaneamente l'ID dell'ordine e l'ID del servizio per il callback
    // In una implementazione reale, questo dovrebbe essere memorizzato in un database
    // ma per semplicità utilizziamo una variabile di stato
    await storage.storePaypalOrderInfo(jsonResponse.id, {
      serviceId: parseInt(serviceId),
      amount: parseFloat(amount),
      currency,
      status: "created",
      created: new Date()
    });

    res.status(httpResponse.statusCode).json(jsonResponse);
  } catch (error: any) {
    console.error("Errore durante la creazione dell'ordine PayPal:", error);
    res.status(500).json({ error: "Errore durante la creazione dell'ordine PayPal.", details: error.message });
  }
}

/**
 * Cattura un pagamento PayPal completato
 */
export async function capturePaypalOrder(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ error: "ID ordine mancante" });
    }

    // Ottieni le informazioni sull'ordine
    const orderInfo = await storage.getPaypalOrderInfo(orderId);
    if (!orderInfo) {
      return res.status(404).json({ error: "Informazioni sull'ordine non trovate" });
    }

    // Cattura l'ordine PayPal
    const collect = {
      id: orderId,
      prefer: "return=representation",
    };

    const { body, ...httpResponse } = await ordersController.captureOrder(collect);
    const jsonResponse = JSON.parse(String(body));

    // Se la cattura è andata a buon fine, aggiorna lo stato del servizio a "pagato"
    if (jsonResponse.status === "COMPLETED") {
      // Aggiorna lo stato del pagamento del servizio
      await storage.updateService(orderInfo.serviceId, {
        status: "paid",
        paymentDate: new Date(),
        paymentMethod: "paypal",
        notes: `Pagamento PayPal completato (OrderID: ${orderId})`
      });

      // Aggiorna lo stato dell'ordine nel nostro sistema
      await storage.updatePaypalOrderInfo(orderId, {
        status: "completed",
        completed: new Date()
      });

      // Genera la ricevuta (in una implementazione reale, questo dovrebbe generare un PDF)
      await generateReceipt(orderInfo);
    }

    res.status(httpResponse.statusCode).json({
      ...jsonResponse,
      serviceId: orderInfo.serviceId,
      redirectUrl: `/services/${orderInfo.serviceId}`
    });
  } catch (error: any) {
    console.error("Errore durante la cattura dell'ordine PayPal:", error);
    res.status(500).json({ error: "Errore durante la cattura dell'ordine PayPal.", details: error.message });
  }
}

/**
 * Genera una ricevuta per un pagamento
 */
async function generateReceipt(orderInfo: any) {
  try {
    // Ottieni i dettagli del servizio
    const service = await storage.getService(orderInfo.serviceId);
    if (!service) {
      throw new Error("Servizio non trovato");
    }

    // In una implementazione reale, qui genereremmo un PDF con i dettagli della ricevuta
    console.log(`Generazione ricevuta per il servizio ID ${service.id}`);
    console.log(`Data: ${new Date().toLocaleDateString()}`);
    console.log(`Importo: ${orderInfo.amount} ${orderInfo.currency}`);
    console.log(`Cliente: ${service.customerName}`);
    console.log(`Tipo servizio: ${service.type}`);
    console.log(`Metodo pagamento: PayPal`);

    // Crea una ricevuta nel database
    const receiptId = await storage.createReceipt({
      serviceId: service.id,
      paymentMethod: "paypal",
      amount: orderInfo.amount,
      receiptDate: new Date(),
      receiptNumber: `RCV-${Date.now()}`,
      notes: `Pagamento PayPal per ${service.type}`
    });

    return receiptId;
  } catch (error) {
    console.error("Errore durante la generazione della ricevuta:", error);
    return null;
  }
}

/**
 * Gestisce la cancellazione di un pagamento PayPal
 */
export async function cancelPaypalOrder(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ error: "ID ordine mancante" });
    }

    // Ottieni le informazioni sull'ordine
    const orderInfo = await storage.getPaypalOrderInfo(orderId);
    if (!orderInfo) {
      return res.status(404).json({ error: "Informazioni sull'ordine non trovate" });
    }

    // Aggiorna lo stato dell'ordine nel nostro sistema
    await storage.updatePaypalOrderInfo(orderId, {
      status: "cancelled",
      updated: new Date()
    });

    // Aggiorna le note del servizio
    await storage.updateService(orderInfo.serviceId, {
      notes: `${service.notes || ''}\nPagamento PayPal annullato (OrderID: ${orderId})`
    });

    res.json({
      status: "cancelled",
      serviceId: orderInfo.serviceId,
      redirectUrl: `/services/${orderInfo.serviceId}`
    });
  } catch (error: any) {
    console.error("Errore durante la cancellazione dell'ordine PayPal:", error);
    res.status(500).json({ error: "Errore durante la cancellazione dell'ordine PayPal.", details: error.message });
  }
}

/**
 * Verifica lo stato di un ordine PayPal
 */
export async function checkPaypalOrderStatus(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ error: "ID ordine mancante" });
    }

    // Ottieni le informazioni sull'ordine dal database
    const orderInfo = await storage.getPaypalOrderInfo(orderId);
    if (!orderInfo) {
      return res.status(404).json({ error: "Informazioni sull'ordine non trovate" });
    }

    // Verifica lo stato dell'ordine su PayPal
    const collect = {
      id: orderId,
    };

    const { body, ...httpResponse } = await ordersController.getOrder(collect);
    const jsonResponse = JSON.parse(String(body));

    res.status(httpResponse.statusCode).json({
      ...jsonResponse,
      localStatus: orderInfo.status,
      serviceId: orderInfo.serviceId
    });
  } catch (error: any) {
    console.error("Errore durante la verifica dello stato dell'ordine PayPal:", error);
    res.status(500).json({ error: "Errore durante la verifica dello stato dell'ordine PayPal.", details: error.message });
  }
}