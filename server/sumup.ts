import { Request, Response } from "express";

interface SumUpPaymentRequest {
  sigla: string;
  amount: number;
  customerName: string;
  description?: string;
}

interface SumUpPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  checkout_reference?: string;
  next_step?: {
    action: string;
    url: string;
  };
  metadata?: Record<string, string>;
  created_at: string;
}

/**
 * Create a SumUp payment
 * Currently returns a mock response for development.
 * TODO: Implement actual SumUp API integration
 */
export async function createSumUpPayment(req: Request, res: Response) {
  try {
    const { sigla, amount, customerName, description }: SumUpPaymentRequest = req.body;

    if (!sigla || !amount || !customerName) {
      return res.status(400).json({
        success: false,
        message: "Parametri mancanti: sigla, amount e customerName sono obbligatori"
      });
    }

    // Mock payment creation - replace with actual SumUp API call
    const mockPayment: SumUpPayment = {
      id: `sumup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: amount,
      currency: 'EUR',
      status: 'PENDING',
      description: description || `Pagamento servizi ELIS - ${sigla}`,
      checkout_reference: `checkout_${Math.random().toString(36).substr(2, 9)}`,
      next_step: {
        action: 'redirect',
        url: `${req.protocol}://${req.get('host')}/secretariat-payment?success=true&sigla=${sigla}`
      },
      metadata: {
        sigla: sigla,
        customerName: customerName
      },
      created_at: new Date().toISOString()
    };

    console.log('SumUp payment created (mock):', mockPayment);

    res.json({
      success: true,
      paymentId: mockPayment.id,
      checkout_reference: mockPayment.checkout_reference,
      redirect_url: mockPayment.next_step?.url,
      status: mockPayment.status,
      message: "Pagamento SumUp creato con successo (modalità sviluppo)"
    });

  } catch (error: any) {
    console.error("Errore nella creazione pagamento SumUp:", error);
    res.status(500).json({
      success: false,
      message: "Errore interno del server nella creazione del pagamento SumUp"
    });
  }
}

/**
 * Check SumUp payment status
 * Currently returns a mock response for development.
 * TODO: Implement actual SumUp payment status checking
 */
export async function checkSumUpPaymentStatus(req: Request, res: Response) {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "ID pagamento mancante"
      });
    }

    // Mock status check - replace with actual SumUp API call
    const mockStatus = {
      id: paymentId,
      status: 'PAID', // SumUp uses 'PAID' for successful payments
      localStatus: 'completed',
      amount: 0, // This would come from the actual API
      currency: 'EUR',
      date: new Date().toISOString(),
      transaction_code: `txn_${Math.random().toString(36).substr(2, 9)}`
    };

    console.log('SumUp payment status check (mock):', mockStatus);

    res.json({
      success: true,
      ...mockStatus
    });

  } catch (error: any) {
    console.error("Errore nel controllo stato pagamento SumUp:", error);
    res.status(500).json({
      success: false,
      message: "Errore nel controllo dello stato del pagamento SumUp"
    });
  }
}

/**
 * Handle SumUp webhook
 * Currently returns a mock response for development.
 * TODO: Implement actual SumUp webhook handling and signature verification
 */
export async function handleSumUpWebhook(req: Request, res: Response) {
  try {
    const webhookData = req.body;
    
    console.log('SumUp webhook received (mock):', webhookData);

    // Mock webhook processing
    // In a real implementation, you would:
    // 1. Verify the webhook signature
    // 2. Process the payment status update
    // 3. Update the database accordingly

    res.status(200).json({
      success: true,
      message: "Webhook SumUp processato con successo"
    });

  } catch (error: any) {
    console.error("Errore nel processare webhook SumUp:", error);
    res.status(500).json({
      success: false,
      message: "Errore nel processare il webhook SumUp"
    });
  }
}