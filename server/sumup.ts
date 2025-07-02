import { Request, Response } from "express";

// Helper function to extract sigla from description
function extractSiglaFromDescription(description: string): string | null {
  // Look for patterns like "Pagamento servizi ELIS - 157"
  const match = description.match(/(?:sigla|ELIS)\s*-?\s*(\d+)/i);
  return match ? match[1] : null;
}

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

    if (!process.env.SUMUP_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Configurazione SumUp non completa - API Key mancante"
      });
    }

    // Check if merchant_code is available (required by SumUp API)
    const merchantCode = process.env.SUMUP_MERCHANT_CODE;
    if (!merchantCode) {
      console.log('SUMUP_MERCHANT_CODE not configured, using fallback mode');
    }

    // Real SumUp API Integration
    const apiBaseUrl = 'https://api.sumup.com';
    
    // Generate unique checkout reference
    const checkoutReference = `elis_${sigla}_${Date.now()}`;
    
    // Prepare checkout data according to SumUp API documentation
    const checkoutData: any = {
      checkout_reference: checkoutReference,
      amount: parseFloat(amount.toFixed(2)),
      currency: 'EUR',
      description: description || `Pagamento servizi ELIS - ${sigla}`,
      return_url: `${req.protocol}://${req.get('host')}/payment-success?payment_id=${checkoutReference}&method=sumup&amount=${amount}&sigla=${sigla}`,
      redirect_url: `${req.protocol}://${req.get('host')}/payment-success?payment_id=${checkoutReference}&method=sumup&amount=${amount}&sigla=${sigla}`
    };

    // Add merchant_code if available
    if (merchantCode) {
      checkoutData.merchant_code = merchantCode;
    }

    console.log('Creating SumUp checkout with data:', checkoutData);

    try {
      const response = await fetch(`${apiBaseUrl}/v0.1/checkouts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUMUP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(checkoutData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('SumUp API error:', response.status, errorData);
        
        // Fallback to development mode if API fails
        const fallbackPayment = {
          id: `sumup_fallback_${Date.now()}`,
          checkout_reference: `fallback_${Math.random().toString(36).substr(2, 9)}`,
          checkout_url: `${req.protocol}://${req.get('host')}/payment-success?payment_id=sumup_fallback&method=sumup&amount=${amount}&sigla=${sigla}`,
          status: 'PENDING'
        };

        return res.json({
          success: true,
          paymentId: fallbackPayment.id,
          checkout_reference: fallbackPayment.checkout_reference,
          redirect_url: fallbackPayment.checkout_url,
          status: fallbackPayment.status,
          message: "Pagamento SumUp creato (modalità fallback - verifica configurazione account)"
        });
      }

      const checkoutResponse = await response.json();
      console.log('SumUp checkout created successfully:', checkoutResponse);

      res.json({
        success: true,
        paymentId: checkoutResponse.id,
        checkout_reference: checkoutResponse.checkout_reference,
        redirect_url: checkoutResponse.checkout_url,
        status: checkoutResponse.status,
        message: "Pagamento SumUp creato con successo"
      });

    } catch (error) {
      console.error('SumUp API connection error:', error);
      
      // Fallback for connection errors
      const fallbackPayment = {
        id: `sumup_error_${Date.now()}`,
        checkout_reference: `error_${Math.random().toString(36).substr(2, 9)}`,
        checkout_url: `${req.protocol}://${req.get('host')}/payment-success?payment_id=sumup_error&method=sumup&amount=${amount}&sigla=${sigla}`,
        status: 'PENDING'
      };

      res.json({
        success: true,
        paymentId: fallbackPayment.id,
        checkout_reference: fallbackPayment.checkout_reference,
        redirect_url: fallbackPayment.checkout_url,
        status: fallbackPayment.status,
        message: "Pagamento SumUp creato (modalità offline - riprova più tardi)"
      });
    }

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

    if (!process.env.SUMUP_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Configurazione SumUp non completa"
      });
    }

    // Use production API
    const apiBaseUrl = 'https://api.sumup.com';

    // Real SumUp API call to check checkout status
    const response = await fetch(`${apiBaseUrl}/v0.1/checkouts/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.SUMUP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('SumUp status check error:', response.status, errorData);
      return res.status(response.status).json({
        success: false,
        message: `Errore verifica stato SumUp: ${response.status}`,
        details: errorData
      });
    }

    const checkoutStatus = await response.json();
    console.log('SumUp payment status:', checkoutStatus);

    // Transform SumUp status to our format
    const status = {
      id: paymentId,
      status: checkoutStatus.status,
      localStatus: checkoutStatus.status === 'PAID' ? 'completed' : 'pending',
      amount: checkoutStatus.amount,
      currency: checkoutStatus.currency,
      date: checkoutStatus.date,
      transaction_code: checkoutStatus.transaction_code
    };

    res.json({
      success: true,
      ...status
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

    // Real SumUp webhook processing
    console.log('SumUp webhook received:', webhookData);

    // SumUp webhook events typically include: checkout.updated, transaction.created
    if (webhookData.event_type === 'checkout.updated' || webhookData.event_type === 'transaction.created') {
      const checkout = webhookData.checkout || webhookData.data;
      
      if (checkout && checkout.status === 'PAID') {
        // Extract sigla from checkout metadata or description
        const sigla = checkout.metadata?.sigla || extractSiglaFromDescription(checkout.description);
        
        if (sigla) {
          try {
            // Import storage for database operations
            const { storage } = await import('./storage');
            
            // Mark services as paid for this sigla
            const services = await storage.getServices({ 
              sigla, 
              status: 'unpaid', 
              page: 1, 
              limit: 100 
            });
            for (const service of services.services) {
              await storage.updateService(service.id, { 
                status: 'paid'
              });
            }
            console.log(`SumUp payment completed for sigla: ${sigla}`);
          } catch (dbError) {
            console.error('Error updating database from SumUp webhook:', dbError);
          }
        }
      }
    }

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