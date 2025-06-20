import { Request, Response } from "express";
import crypto from "crypto";
import { storage } from "./storage";

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

// Satispay API configuration
const SATISPAY_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://authservices.satispay.com' 
  : 'https://staging.authservices.satispay.com';

function createDigest(body: string): string {
  // Step 1 & 2: Hash with SHA256 and encode in base64
  const hash = crypto.createHash('sha256').update(body, 'utf8').digest('base64');
  // Step 3: Prefix with SHA-256=
  return `SHA-256=${hash}`;
}

function createSignatureMessage(
  method: string,
  path: string,
  host: string,
  timestamp: string,
  digest: string
): string {
  // Step 4: Create the message according to Satispay documentation
  // Format: (request-target), host, date, digest - each on a new line
  const requestTarget = `(request-target): ${method.toLowerCase()} ${path}`;
  const hostHeader = `host: ${host}`;
  const dateHeader = `date: ${timestamp}`;
  const digestHeader = `digest: ${digest}`;
  
  // Compose the message with actual newline characters
  const message = `${requestTarget}\n${hostHeader}\n${dateHeader}\n${digestHeader}`;
  
  console.log('Signature message created:');
  console.log(message);
  
  return message;
}

function generateSatispaySignature(
  method: string,
  path: string,
  body: string,
  timestamp: string,
  digest: string
): string {
  if (!process.env.SATISPAY_KEY_ID || !process.env.SATISPAY_PRIVATE_KEY) {
    throw new Error("Satispay credentials not configured");
  }

  const host = process.env.NODE_ENV === 'production' 
    ? 'authservices.satispay.com' 
    : 'staging.authservices.satispay.com';

  // Create the message according to Satispay Step 4 specification
  const messageToSign = createSignatureMessage(method, path, host, timestamp, digest);
  
  // Handle private key with proper line breaks and format
  let privateKey = process.env.SATISPAY_PRIVATE_KEY;
  
  // Ensure proper formatting
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  
  // Create signature using RSA-SHA256 with explicit key object
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(messageToSign, 'utf8');
  
  let signature: string;
  try {
    signature = signer.sign({
      key: privateKey,
      format: 'pem',
      type: 'pkcs8'
    }, 'base64');
    
    console.log('Signature generated successfully with PKCS8 format');
  } catch (error) {
    console.error('Error signing with PKCS8, trying simple format:', error);
    // Fallback: try with simple string format
    try {
      signature = signer.sign(privateKey, 'base64');
      console.log('Signature generated successfully with simple format');
    } catch (fallbackError) {
      console.error('Failed to sign with any format:', fallbackError);
      throw new Error('Impossibile generare la firma digitale RSA-SHA256');
    }
  }

  console.log('Generated signature:', signature);

  // Step 6: Compose the Authorization header according to Satispay specification
  const authorizationHeader = `keyId="${process.env.SATISPAY_KEY_ID}", algorithm="rsa-sha256", headers="(request-target) host date digest", signature="${signature}"`;
  
  console.log('Authorization header created:', authorizationHeader);
  
  return authorizationHeader;
}

async function makeSatispayRequest(
  method: string,
  endpoint: string,
  data?: any
): Promise<any> {
  const timestamp = new Date().toUTCString();
  const body = data ? JSON.stringify(data) : '';
  const path = endpoint;
  
  // Create digest according to Satispay documentation
  const digest = createDigest(body);
  const signature = generateSatispaySignature(method, path, body, timestamp, digest);

  const requestOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Host': process.env.NODE_ENV === 'production' 
        ? 'authservices.satispay.com' 
        : 'staging.authservices.satispay.com',
      'Date': timestamp,
      'Digest': digest,
      'Authorization': `Signature ${signature}`,
    },
    body: body || undefined,
  };

  console.log('Satispay request headers:', requestOptions.headers);
  console.log('Satispay request body:', body);

  const response = await fetch(`${SATISPAY_BASE_URL}${endpoint}`, requestOptions);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Satispay API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
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
    const hasCredentials = process.env.SATISPAY_KEY_ID && 
                          process.env.SATISPAY_PRIVATE_KEY && 
                          process.env.SATISPAY_ACTIVATION_CODE;
    
    console.log('Satispay credentials check:', {
      hasKeyId: !!process.env.SATISPAY_KEY_ID,
      hasPrivateKey: !!process.env.SATISPAY_PRIVATE_KEY,
      hasActivationCode: !!process.env.SATISPAY_ACTIVATION_CODE,
      hasCredentials
    });
    
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
        "/g_business/v1/payments", 
        paymentData
      );
      
      console.log(`Created real Satispay payment: ${payment.id} for ${customerName} (${sigla}) - €${amount}`);
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
      
      console.log(`Created simulated Satispay payment: ${payment.id} for ${customerName} (${sigla}) - €${amount}`);
    }

    // Store payment in database
    await storage.createSecretariatPayment({
      orderId: payment.id,
      sigla,
      customerName,
      customerEmail: "", // Satispay doesn't require email
      amount,
      status: "pending",
      paymentMethod: "satispay",
      metadata: {
        satispayPaymentId: payment.id,
        description: payment.description
      }
    });

    res.json({
      success: true,
      paymentId: payment.id,
      amount,
      status: payment.status,
      message: hasCredentials 
        ? "Pagamento Satispay creato. Completare sull'app Satispay."
        : "Pagamento simulato creato. Completamento automatico in 10 secondi."
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

    const hasCredentials = process.env.SATISPAY_KEY_ID && 
                          process.env.SATISPAY_PRIVATE_KEY && 
                          process.env.SATISPAY_ACTIVATION_CODE;
    let payment: SatispayPayment;

    if (hasCredentials && !paymentId.startsWith('satispay_sim_')) {
      // Get payment from real Satispay API
      payment = await makeSatispayRequest(
        "GET",
        `/g_business/v1/payments/${paymentId}`
      );
      
      // Update local payment status based on Satispay response
      if (payment.status === 'ACCEPTED' && localPayment.status === 'pending') {
        await storage.updateSecretariatPaymentStatus(paymentId, "completed");
        
        // Mark services as paid
        const services = await storage.getServices({
          sigla: localPayment.sigla,
          status: "unpaid",
          page: 1,
          limit: 100
        });

        for (const service of services.services) {
          await storage.updateService(service.id, { 
            status: "paid", 
            paymentMethod: "satispay" 
          });
        }
        
        console.log(`Real Satispay payment ${paymentId} completed and services updated`);
      }
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
            await storage.updateService(service.id, { 
              status: "paid", 
              paymentMethod: "satispay" 
            });
          }
          
          console.log(`Simulated Satispay payment ${paymentId} auto-completed`);
        }
      } else {
        throw new Error("Invalid payment ID for current configuration");
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
    const { event_type, data } = req.body;

    if (event_type === "payment_update") {
      const paymentId = data.id;
      const status = data.status;

      // Update local payment status
      if (status === "ACCEPTED") {
        await storage.updateSecretariatPaymentStatus(paymentId, "completed");
        
        // Get payment details to update services
        const localPayment = await storage.getSecretariatPaymentByOrderId(paymentId);
        if (localPayment) {
          const services = await storage.getServices({
            sigla: localPayment.sigla,
            status: "unpaid",
            page: 1,
            limit: 100
          });

          for (const service of services.services) {
            await storage.updateService(service.id, { 
              status: "paid", 
              paymentMethod: "satispay" 
            });
          }
          
          console.log(`Webhook: Satispay payment ${paymentId} completed, services updated`);
        }
      } else if (status === "CANCELED" || status === "EXPIRED") {
        await storage.updateSecretariatPaymentStatus(paymentId, "failed");
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Error handling Satispay webhook:", error);
    res.status(500).json({ message: "Webhook error" });
  }
}

// Verify Satispay webhook signature (for production use)
export function verifySatispayWebhookSignature(
  signature: string,
  body: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}