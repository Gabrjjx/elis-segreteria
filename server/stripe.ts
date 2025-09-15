import { Request, Response } from "express";
import Stripe from "stripe";
import { storage } from "./storage";
import { SecretariatPaymentStatus, BikeReservationStatus } from "@shared/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

// Create Stripe payment intent for secretariat service (variable amount)
export async function createBikePaymentIntent(req: Request, res: Response) {
  try {
    const { customerEmail, customerName, sigla } = req.body;

    if (!customerEmail || !customerName || !sigla) {
      return res.status(400).json({
        error: "Missing required fields: customerEmail, customerName, sigla"
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

    // Get ALL unpaid services to track specific service IDs (no pagination limit)
    const { services: unpaidServices } = await storage.getServices({
      sigla: sigla,
      status: "unpaid",
      page: 1,
      limit: 10000 // High limit to capture all unpaid services
    });
    
    // SECURITY: Calculate authoritative amount server-side (never trust client)
    // CRITICAL FIX: Ensure each amount is a number and handle potential NaN
    const numAmount = unpaidServices.reduce((sum, service) => {
      const amount = Number(service.amount);
      if (!Number.isFinite(amount)) {
        console.error(`Invalid service amount for service ${service.id}: ${service.amount}`);
        return sum;
      }
      return sum + amount;
    }, 0);
    
    console.log(`Payment calculation for sigla ${sigla}: ${unpaidServices.length} services, total €${numAmount.toFixed(2)}`);
    
    // Validate calculated amount is reasonable and not NaN
    if (!Number.isFinite(numAmount) || numAmount < 0.50 || numAmount > 1000) {
      console.error(`Invalid calculated amount: ${numAmount}, services: ${unpaidServices.map(s => ({id: s.id, amount: s.amount})).join(', ')}`);
      return res.status(400).json({
        error: `Invalid calculated amount: €${Number.isFinite(numAmount) ? numAmount.toFixed(2) : 'NaN'}. Must be between 0.50 and 1000.00 EUR`
      });
    }
    
    if (unpaidServices.length === 0) {
      return res.status(400).json({
        error: "No unpaid services found for this sigla"
      });
    }
    
    const serviceIds = unpaidServices.map(s => s.id.toString());

    // Create secretariat payment record in database
    const paymentData = {
      orderId: orderId,
      sigla: sigla,
      customerName: customerName,
      customerEmail: customerEmail,
      amount: numAmount,
      currency: "EUR",
      status: SecretariatPaymentStatus.PENDING,
    };

    const payment = await storage.createSecretariatPayment(paymentData);

    // Create Stripe payment intent with variable amount
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(numAmount * 100), // Convert EUR to cents
      currency: "eur",
      metadata: {
        orderId: orderId,
        sigla: sigla,
        customerName: customerName,
        customerEmail: customerEmail,
        paymentId: payment.id.toString(),
        service: "secretariat_service",
        amount: numAmount.toString(),
        serviceIds: serviceIds.join(',') // Store specific service IDs
      },
      description: "Servizio Segreteria ELIS - Pagamento",
      receipt_email: customerEmail,
    });

    // Update payment record with payment intent ID
    await storage.updateSecretariatPaymentStatus(orderId, SecretariatPaymentStatus.PROCESSING);

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      paymentId: payment.id,
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
      // Skip webhook verification in development for testing
      if (process.env.NODE_ENV === 'production' && process.env.STRIPE_WEBHOOK_SECRET) {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } else {
        // Parse directly in development
        event = JSON.parse(req.body.toString());
      }
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
        const serviceType = paymentIntent.metadata.service;
        
        if (sigla && orderId) {
          console.log(`Processing payment for sigla: ${sigla}, orderId: ${orderId}, service: ${serviceType}`);
          
          // Update secretariat payment status to completed
          if (serviceType === "secretariat_service") {
            try {
              await storage.updateSecretariatPaymentStatus(
                orderId, 
                SecretariatPaymentStatus.COMPLETED,
                new Date()
              );
              console.log(`Secretariat payment ${orderId} marked as completed`);
            } catch (error) {
              console.error(`Failed to update secretariat payment ${orderId}:`, error);
            }
          }
          
          // Mark specific services as paid (from metadata)
          const serviceIdsStr = paymentIntent.metadata.serviceIds;
          const serviceIds = serviceIdsStr ? serviceIdsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : [];
          
          console.log(`Processing specific service IDs: ${serviceIds.join(', ')}`);
          
          // Update each specific service to paid status
          for (const serviceId of serviceIds) {
            try {
              await storage.updateService(serviceId, {
                status: "paid"
              });
              console.log(`Updated service ${serviceId} to paid status`);
            } catch (error) {
              console.error(`Failed to update service ${serviceId}:`, error);
            }
          }
          
          console.log(`Payment confirmed for sigla ${sigla}. Updated ${serviceIds.length} services from unpaid to paid`);
        } else {
          console.log('Missing sigla or orderId in payment metadata');
        }
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        const failedOrderId = failedPayment.metadata.orderId;
        const failedServiceType = failedPayment.metadata.service;
        
        if (failedOrderId) {
          // Handle secretariat payment failures
          if (failedServiceType === "secretariat_service") {
            try {
              await storage.updateSecretariatPaymentStatus(
                failedOrderId, 
                SecretariatPaymentStatus.FAILED,
                new Date()
              );
              console.log(`Secretariat payment ${failedOrderId} marked as failed`);
            } catch (error) {
              console.error(`Failed to update secretariat payment ${failedOrderId} to FAILED:`, error);
            }
          } else {
            // Handle bike reservation failures (existing logic)
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