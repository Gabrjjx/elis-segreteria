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
    const { customerEmail, customerName, orderId } = req.body;

    if (!customerEmail || !customerName || !orderId) {
      return res.status(400).json({
        error: "Missing required fields: customerEmail, customerName, orderId"
      });
    }

    // Fixed amount for bike service
    const amount = 250; // 2.50 EUR in cents
    const currency = "EUR";

    // Create payment data for Nexi
    const paymentData = {
      amount: amount,
      currency: currency,
      orderId: orderId,
      description: "Servizio Bici ELIS - Prenotazione",
      customerId: customerEmail,
      paymentMethod: ["CARD"],
      customField: {
        name: customerName,
        email: customerEmail,
        service: "bike_rental"
      }
    };

    // For now, return the payment data structure
    // When you get Nexi API credentials, this will make the actual API call
    res.json({
      success: true,
      paymentData: paymentData,
      paymentUrl: `${NEXI_BASE_URL}/payment/redirect`, // This will be the actual Nexi payment URL
      message: "Payment order created successfully. Awaiting Nexi integration."
    });

  } catch (error) {
    console.error("Failed to create Nexi payment:", error);
    res.status(500).json({ error: "Failed to create payment order." });
  }
}

// Handle Nexi payment callback/webhook
export async function handleNexiCallback(req: Request, res: Response) {
  try {
    const { orderId, status, transactionId } = req.body;

    console.log("Nexi payment callback received:", { orderId, status, transactionId });

    // Update the service payment status based on callback
    if (status === "AUTHORIZED" || status === "CAPTURED") {
      // Payment successful - update service status to paid
      // This will integrate with your service creation logic
      res.json({ 
        success: true, 
        message: "Payment confirmed",
        orderId: orderId,
        transactionId: transactionId
      });
    } else {
      // Payment failed
      res.json({ 
        success: false, 
        message: "Payment failed or cancelled",
        orderId: orderId
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