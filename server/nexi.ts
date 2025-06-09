import { Request, Response } from "express";
import crypto from "crypto";
import { storage } from "./storage";
import { BikeReservationStatus } from "@shared/schema";

/* Nexi Payment Service for Bike Reservations (2.50 EUR) */

// Nexi configuration - these will need to be set as environment variables
const NEXI_BASE_URL = process.env.NODE_ENV === "production" 
  ? "https://ecommerce.nexi.it" 
  : "https://int-ecommerce.nexi.it"; // Sandbox URL

// Create Nexi payment order for bike service (2.50 EUR)
export async function createNexiPayment(req: Request, res: Response) {
  try {
    const { customerEmail, customerName, sigla, orderId } = req.body;

    if (!customerEmail || !customerName || !sigla || !orderId) {
      return res.status(400).json({
        error: "Missing required fields: customerEmail, customerName, sigla, orderId"
      });
    }

    // Verify student exists
    const student = await storage.getStudentBySigla(sigla);
    if (!student) {
      return res.status(400).json({
        error: "Sigla non trovata. Inserisci una sigla valida."
      });
    }

    // Create bike reservation in database
    const reservationData = {
      orderId: orderId,
      sigla: sigla,
      customerName: customerName,
      customerEmail: customerEmail,
      amount: 2.50,
      currency: "EUR",
      status: BikeReservationStatus.PENDING_PAYMENT,
    };

    const reservation = await storage.createBikeReservation(reservationData);

    // Create payment data for Nexi
    const paymentData = {
      amount: 250, // 2.50 EUR in cents
      currency: "EUR",
      orderId: orderId,
      description: "Servizio Bici ELIS - Prenotazione",
      customerId: customerEmail,
      paymentMethod: ["CARD"],
      customField: {
        name: customerName,
        email: customerEmail,
        service: "bike_rental",
        sigla: sigla
      }
    };

    res.json({
      success: true,
      reservationId: reservation.id,
      paymentData: paymentData,
      paymentUrl: `${NEXI_BASE_URL}/payment/redirect`,
      message: "Bike reservation created. Ready for payment processing."
    });

  } catch (error) {
    console.error("Failed to create bike reservation:", error);
    res.status(500).json({ error: "Failed to create bike reservation." });
  }
}

// Handle Nexi payment callback/webhook
export async function handleNexiCallback(req: Request, res: Response) {
  try {
    const { orderId, status, transactionId } = req.body;

    console.log("Nexi payment callback received:", { orderId, status, transactionId });

    // Find the bike reservation by order ID
    const reservation = await storage.getBikeReservationByOrderId(orderId);
    if (!reservation) {
      return res.status(404).json({ error: "Bike reservation not found" });
    }

    // Update reservation status based on payment result
    if (status === "AUTHORIZED" || status === "CAPTURED") {
      // Payment successful - update status to paid
      await storage.updateBikeReservationStatus(
        reservation.id, 
        BikeReservationStatus.PAID,
        new Date() // Set payment date
      );

      console.log(`Payment confirmed for bike reservation ${reservation.id}`);
      
      res.json({ 
        success: true, 
        message: "Payment confirmed - bike reservation updated",
        orderId: orderId,
        transactionId: transactionId,
        reservationId: reservation.id
      });
    } else {
      // Payment failed - update status to cancelled
      await storage.updateBikeReservationStatus(
        reservation.id, 
        BikeReservationStatus.CANCELLED
      );

      console.log(`Payment failed for bike reservation ${reservation.id}`);
      
      res.json({ 
        success: false, 
        message: "Payment failed - bike reservation cancelled",
        orderId: orderId,
        reservationId: reservation.id
      });
    }

  } catch (error) {
    console.error("Failed to handle Nexi callback:", error);
    res.status(500).json({ error: "Failed to process payment callback." });
  }
}

// Verify Nexi payment status
export async function verifyNexiPayment(req: Request, res: Response) {
  try {
    const { orderId } = req.params;

    // This will query Nexi API to verify payment status
    // For now, return a placeholder response
    res.json({
      orderId: orderId,
      status: "PENDING", // Will be AUTHORIZED, CAPTURED, FAILED, etc.
      amount: 250,
      currency: "EUR",
      message: "Awaiting Nexi API integration for status verification"
    });

  } catch (error) {
    console.error("Failed to verify Nexi payment:", error);
    res.status(500).json({ error: "Failed to verify payment status." });
  }
}