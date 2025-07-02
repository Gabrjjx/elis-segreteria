import { Request, Response } from "express";

interface RevolutPaymentRequest {
  sigla: string;
  amount: number;
  customerName: string;
  description?: string;
}

interface RevolutPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  redirect_url?: string;
  metadata?: Record<string, string>;
  created_at: string;
}

/**
 * Create a Revolut payment
 * Currently returns a mock response for development.
 * TODO: Implement actual Revolut Merchant API integration
 */
export async function createRevolutPayment(req: Request, res: Response) {
  try {
    const { sigla, amount, customerName, description }: RevolutPaymentRequest = req.body;

    if (!sigla || !amount || !customerName) {
      return res.status(400).json({
        success: false,
        message: "Parametri mancanti: sigla, amount e customerName sono obbligatori"
      });
    }

    // Mock payment creation - replace with actual Revolut API call
    const mockPayment: RevolutPayment = {
      id: `revolut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: amount,
      currency: 'EUR',
      status: 'PENDING',
      description: description || `Pagamento servizi ELIS - ${sigla}`,
      redirect_url: `${req.protocol}://${req.get('host')}/secretariat-payment?success=true&sigla=${sigla}`,
      metadata: {
        sigla: sigla,
        customerName: customerName
      },
      created_at: new Date().toISOString()
    };

    console.log('Revolut payment created (mock):', mockPayment);

    res.json({
      success: true,
      paymentId: mockPayment.id,
      redirect_url: mockPayment.redirect_url,
      status: mockPayment.status,
      message: "Pagamento Revolut creato con successo (modalità sviluppo)"
    });

  } catch (error: any) {
    console.error("Errore nella creazione pagamento Revolut:", error);
    res.status(500).json({
      success: false,
      message: "Errore interno del server nella creazione del pagamento Revolut"
    });
  }
}

/**
 * Check Revolut payment status
 * Currently returns a mock response for development.
 * TODO: Implement actual Revolut payment status checking
 */
export async function checkRevolutPaymentStatus(req: Request, res: Response) {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "ID pagamento mancante"
      });
    }

    // Mock status check - replace with actual Revolut API call
    const mockStatus = {
      id: paymentId,
      status: 'COMPLETED', // Simulate successful payment
      localStatus: 'completed',
      amount: 0, // This would come from the actual API
      currency: 'EUR',
      completed_at: new Date().toISOString()
    };

    console.log('Revolut payment status check (mock):', mockStatus);

    res.json({
      success: true,
      ...mockStatus
    });

  } catch (error: any) {
    console.error("Errore nel controllo stato pagamento Revolut:", error);
    res.status(500).json({
      success: false,
      message: "Errore nel controllo dello stato del pagamento Revolut"
    });
  }
}

/**
 * Handle Revolut webhook
 * Currently returns a mock response for development.
 * TODO: Implement actual Revolut webhook handling and signature verification
 */
export async function handleRevolutWebhook(req: Request, res: Response) {
  try {
    const webhookData = req.body;
    
    console.log('Revolut webhook received (mock):', webhookData);

    // Mock webhook processing
    // In a real implementation, you would:
    // 1. Verify the webhook signature
    // 2. Process the payment status update
    // 3. Update the database accordingly

    res.status(200).json({
      success: true,
      message: "Webhook Revolut processato con successo"
    });

  } catch (error: any) {
    console.error("Errore nel processare webhook Revolut:", error);
    res.status(500).json({
      success: false,
      message: "Errore nel processare il webhook Revolut"
    });
  }
}