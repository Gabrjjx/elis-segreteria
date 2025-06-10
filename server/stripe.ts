import { Request, Response } from "express";
import Stripe from "stripe";
import { storage } from "./storage";
import { BikeReservationStatus } from "@shared/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Create Stripe payment intent for bike service (2.50 EUR)
export async function createBikePaymentIntent(req: Request, res: Response) {
  try {
    const { customerEmail, customerName, sigla, amount } = req.body;

    if (!customerEmail || !customerName || !sigla || !amount) {
      return res.status(400).json({
        error: "Missing required fields: customerEmail, customerName, sigla, amount"
      });
    }

    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0.50 || numAmount > 100) {
      return res.status(400).json({
        error: "Invalid amount. Must be between 0.50 and 100.00 EUR"
      });
    }

    // Verify student exists
    const student = await storage.getStudentBySigla(sigla);
    if (!student) {
      return res.status(400).json({
        error: "Sigla non trovata. Inserisci una sigla valida."
      });
    }

    // Generate unique order ID for the secretariat service
    const orderId = `SEC_${sigla}_${Date.now()}`;

    // Create secretariat service reservation in database
    const reservationData = {
      orderId: orderId,
      sigla: sigla,
      customerName: customerName,
      customerEmail: customerEmail,
      amount: numAmount,
      currency: "EUR",
      status: BikeReservationStatus.PENDING_PAYMENT,
    };

    const reservation = await storage.createBikeReservation(reservationData);

    // Create Stripe payment intent with variable amount
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(numAmount * 100), // Convert EUR to cents
      currency: "eur",
      metadata: {
        orderId: orderId,
        sigla: sigla,
        customerName: customerName,
        customerEmail: customerEmail,
        reservationId: reservation.id.toString(),
        service: "secretariat_service",
        amount: numAmount.toString()
      },
      description: "Servizio Segreteria ELIS - Pagamento",
      receipt_email: customerEmail,
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      reservationId: reservation.id,
      orderId: orderId,
      amount: numAmount,
      message: "Secretariat service payment created. Ready for payment."
    });

  } catch (error) {
    console.error("Failed to create secretariat payment intent:", error);
    res.status(500).json({ error: "Failed to create secretariat payment intent." });
  }
}

// Handle Stripe webhook for payment confirmation
export async function handleStripeWebhook(req: Request, res: Response) {
  try {
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      return res.status(400).json({ error: 'No signature provided' });
    }

    let event;
    try {
      // In production, you should set STRIPE_WEBHOOK_SECRET
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test');
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.orderId;
        const sigla = paymentIntent.metadata.sigla;
        
        if (orderId && sigla) {
          // Find the reservation by order ID
          const reservation = await storage.getBikeReservationByOrderId(orderId);
          if (reservation) {
            // Update reservation status to paid
            await storage.updateBikeReservationStatus(
              reservation.id, 
              BikeReservationStatus.PAID,
              new Date() // Set payment date
            );
            
            // Mark all unpaid services for this sigla as paid
            const { services } = await storage.getServices({
              sigla: sigla,
              status: "unpaid",
              page: 1,
              limit: 100
            });
            
            // Update each service to paid status
            for (const service of services) {
              await storage.updateService(service.id, {
                status: "paid"
              });
            }
            
            console.log(`Payment confirmed for order ${orderId}. Updated ${services.length} services for sigla ${sigla}`);
          }
        }
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        const failedOrderId = failedPayment.metadata.orderId;
        
        if (failedOrderId) {
          const reservation = await storage.getBikeReservationByOrderId(failedOrderId);
          if (reservation) {
            // Update reservation status to cancelled
            await storage.updateBikeReservationStatus(
              reservation.id, 
              BikeReservationStatus.CANCELLED
            );
            
            console.log(`Payment failed for bike reservation ${reservation.id}`);
          }
        }
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error("Failed to handle Stripe webhook:", error);
    res.status(500).json({ error: "Failed to process webhook." });
  }
}

// Verify payment status
export async function verifyBikePaymentStatus(req: Request, res: Response) {
  try {
    const { orderId } = req.params;

    // Find reservation by order ID
    const reservation = await storage.getBikeReservationByOrderId(orderId);
    if (!reservation) {
      return res.status(404).json({ error: "Bike reservation not found" });
    }

    res.json({
      orderId: orderId,
      reservationId: reservation.id,
      status: reservation.status,
      amount: reservation.amount,
      currency: reservation.currency,
      customerName: reservation.customerName,
      customerEmail: reservation.customerEmail,
      sigla: reservation.sigla,
      createdAt: reservation.createdAt,
      paymentDate: reservation.paymentDate,
    });

  } catch (error) {
    console.error("Failed to verify payment status:", error);
    res.status(500).json({ error: "Failed to verify payment status." });
  }
}