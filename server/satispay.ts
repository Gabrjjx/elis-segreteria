import { Request, Response } from "express";
import crypto from "crypto";
import { storage } from "./storage";

// Satispay API Configuration
const SATISPAY_BASE_URL = process.env.NODE_ENV === "production" 
  ? "https://authservices.satispay.com" 
  : "https://staging.authservices.satispay.com";

const SATISPAY_API_BASE_URL = process.env.NODE_ENV === "production"
  ? "https://services.satispay.com"
  : "https://staging.services.satispay.com";

interface SatispayPaymentRequest {
  sigla: string;
  amount: number;
  customerName: string;
  description?: string;
}

interface SatispayPayment {
  id: string;
  amount_unit: number;
  currency: string;
  status: string;
  description: string;
  redirect_url?: string;
  callback_url?: string;
  metadata?: Record<string, string>;
  created_at: string;
}

// Generate Satispay authentication signature
function generateSatispaySignature(
  method: string,
  path: string,
  timestamp: string,
  body: string = ""
): string {
  const keyId = process.env.SATISPAY_KEY_ID;
  const privateKey = process.env.SATISPAY_PRIVATE_KEY;
  
  if (!keyId || !privateKey) {
    throw new Error("Satispay credentials not configured");
  }

  const stringToSign = `${method}\n${path}\n${timestamp}\n${body}`;
  
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(stringToSign);
  const signature = sign.sign(privateKey, 'base64');
  
  return `keyId="${keyId}",algorithm="rsa-sha256",headers="(request-target) date",signature="${signature}"`;
}

// Make authenticated request to Satispay API
async function makeSatispayRequest(
  method: string,
  endpoint: string,
  body?: any
): Promise<any> {
  const timestamp = new Date().toISOString();
  const bodyString = body ? JSON.stringify(body) : "";
  const path = endpoint.replace(SATISPAY_API_BASE_URL, "");
  
  const signature = generateSatispaySignature(method, path, timestamp, bodyString);
  
  const headers: Record<string, string> = {
    'Authorization': signature,
    'Date': timestamp,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const requestOptions: RequestInit = {
    method,
    headers,
    body: bodyString || undefined
  };

  try {
    const response = await fetch(`${SATISPAY_API_BASE_URL}${path}`, requestOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Satispay API error: ${response.status} - ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Satispay API request failed:", error);
    throw error;
  }
}

// Create Satispay payment
export async function createSatispayPayment(req: Request, res: Response) {
  try {
    const { sigla, amount, customerName, description }: SatispayPaymentRequest = req.body;

    if (!sigla || !amount || !customerName) {
      return res.status(400).json({ 
        message: "Sigla, amount e customerName sono richiesti" 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ 
        message: "L'importo deve essere maggiore di zero" 
      });
    }

    // Check if Satispay credentials are configured
    const hasCredentials = process.env.SATISPAY_KEY_ID && process.env.SATISPAY_PRIVATE_KEY;
    
    let payment: SatispayPayment;
    
    if (hasCredentials) {
      // Use real Satispay API
      const paymentData = {
        flow: "MATCH_CODE",
        amount_unit: Math.round(amount * 100), // Convert to cents
        currency: "EUR",
        description: description || `Pagamento servizi ELIS - ${sigla}`,
        callback_url: `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/api/satispay/webhook`,
        metadata: {
          sigla,
          customerName,
          source: "secretariat_payment"
        }
      };

      payment = await makeSatispayRequest(
        "POST", 
        "/wally-services/protocol/tests/simulations", 
        paymentData
      );
    } else {
      // Simulate Satispay payment for development/demo
      const simulatedPaymentId = `satispay_sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      payment = {
        id: simulatedPaymentId,
        amount_unit: Math.round(amount * 100),
        currency: "EUR",
        status: "PENDING",
        description: description || `Pagamento servizi ELIS - ${sigla}`,
        created_at: new Date().toISOString(),
        metadata: {
          sigla,
          customerName,
          source: "secretariat_payment"
        }
      };
      
      console.log(`Created simulated Satispay payment: ${payment.id}`);
    }

    // Store payment in database
    await storage.createSecretariatPayment({
      orderId: payment.id,
      sigla,
      customerName,
      customerEmail: "", // Satispay non richiede email
      amount,
      status: "pending",
      paymentMethod: "satispay",
      metadata: JSON.stringify({
        satispayPaymentId: payment.id,
        description: payment.description
      })
    });

    console.log(`Satispay payment created: ${payment.id} for ${customerName} (${sigla}) - €${amount}`);

    res.json({
      paymentId: payment.id,
      amount,
      currency: "EUR",
      status: payment.status,
      description: payment.description,
      redirectUrl: payment.redirect_url,
      qrCode: `satispay://payment/${payment.id}`,
      metadata: {
        sigla,
        customerName
      }
    });

  } catch (error) {
    console.error("Error creating Satispay payment:", error);
    res.status(500).json({ 
      message: "Errore nella creazione del pagamento Satispay" 
    });
  }
}

// Check Satispay payment status
export async function checkSatispayPaymentStatus(req: Request, res: Response) {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({ message: "Payment ID richiesto" });
    }

    // Get local payment record
    const localPayment = await storage.getSecretariatPaymentByOrderId(paymentId);
    
    if (!localPayment) {
      return res.status(404).json({ message: "Pagamento non trovato" });
    }

    const hasCredentials = process.env.SATISPAY_KEY_ID && process.env.SATISPAY_PRIVATE_KEY;
    let payment: SatispayPayment;

    if (hasCredentials) {
      // Get payment from Satispay API
      payment = await makeSatispayRequest(
        "GET",
        `/wally-services/protocol/tests/simulations/${paymentId}`
      );
    } else {
      // Simulate payment status for development
      const isSimulated = paymentId.startsWith('satispay_sim_');
      
      if (isSimulated) {
        // For demo purposes, simulate payment acceptance after 10 seconds
        const paymentAge = Date.now() - parseInt(paymentId.split('_')[2]);
        const shouldBeAccepted = paymentAge > 10000; // 10 seconds
        
        payment = {
          id: paymentId,
          amount_unit: Math.round(localPayment.amount * 100),
          currency: "EUR",
          status: shouldBeAccepted ? "ACCEPTED" : "PENDING",
          description: `Pagamento servizi ELIS - ${localPayment.sigla}`,
          created_at: new Date(parseInt(paymentId.split('_')[2])).toISOString()
        };

        // Auto-complete the payment in simulation mode
        if (shouldBeAccepted && localPayment.status === "pending") {
          await storage.updateSecretariatPaymentStatus(paymentId, "completed");
          
          // Mark services as paid
          const services = await storage.getServices({
            sigla: localPayment.sigla,
            status: "unpaid",
            page: 1,
            limit: 100
          });

          for (const service of services.services) {
            await storage.updateService(service.id, { status: "paid" });
          }
          
          console.log(`Simulated Satispay payment ${paymentId} auto-completed`);
        }
      } else {
        throw new Error("Invalid payment ID for simulation mode");
      }
    }

    // Refresh local payment status
    const updatedLocalPayment = await storage.getSecretariatPaymentByOrderId(paymentId);

    res.json({
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount_unit / 100,
      currency: payment.currency,
      description: payment.description,
      createdAt: payment.created_at,
      localStatus: updatedLocalPayment?.status || localPayment.status,
      sigla: localPayment.sigla,
      customerName: localPayment.customerName
    });

  } catch (error) {
    console.error("Error checking Satispay payment status:", error);
    res.status(500).json({ 
      message: "Errore nella verifica dello stato del pagamento" 
    });
  }
}

// Handle Satispay webhook
export async function handleSatispayWebhook(req: Request, res: Response) {
  try {
    console.log("Satispay webhook received:", JSON.stringify(req.body, null, 2));

    const { id: paymentId, status, amount_unit } = req.body;

    if (!paymentId) {
      return res.status(400).json({ message: "Payment ID mancante nel webhook" });
    }

    // Get local payment record
    const payment = await storage.getSecretariatPaymentByOrderId(paymentId);
    
    if (!payment) {
      console.error(`Payment not found for ID: ${paymentId}`);
      return res.status(404).json({ message: "Pagamento non trovato" });
    }

    console.log(`Processing Satispay webhook for payment ${paymentId}, status: ${status}`);

    // Update payment status based on Satispay status
    let newStatus = payment.status;
    
    switch (status) {
      case "ACCEPTED":
        newStatus = "completed";
        break;
      case "CANCELED":
      case "EXPIRED":
        newStatus = "failed";
        break;
      case "PENDING":
        newStatus = "pending";
        break;
      default:
        console.warn(`Unknown Satispay status: ${status}`);
        break;
    }

    // Update payment status
    await storage.updateSecretariatPaymentStatus(paymentId, newStatus);

    // If payment is completed, mark services as paid
    if (newStatus === "completed") {
      try {
        const services = await storage.getServices({
          sigla: payment.sigla,
          status: "unpaid",
          page: 1,
          limit: 100
        });

        console.log(`Found ${services.services.length} unpaid services for sigla ${payment.sigla}`);

        // Mark all unpaid services for this sigla as paid
        for (const service of services.services) {
          await storage.updateService(service.id, { status: "paid" });
          console.log(`Marked service ${service.id} as paid`);
        }

        console.log(`Satispay payment ${paymentId} completed successfully. Updated ${services.services.length} services.`);
        
      } catch (error) {
        console.error(`Error updating services for completed payment ${paymentId}:`, error);
      }
    }

    res.json({ received: true, status: newStatus });

  } catch (error) {
    console.error("Error processing Satispay webhook:", error);
    res.status(500).json({ message: "Errore nell'elaborazione del webhook" });
  }
}

// Verify Satispay webhook signature (for production use)
export function verifySatispayWebhookSignature(
  signature: string,
  payload: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error("Error verifying Satispay webhook signature:", error);
    return false;
  }
}