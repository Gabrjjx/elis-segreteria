-- Crea tabella per i pagamenti della segreteria
CREATE TABLE IF NOT EXISTS secretariat_payments (
  id SERIAL PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  sigla TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_intent_id TEXT,
  payment_date TIMESTAMP,
  metadata TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Aggiungi indici per performance
CREATE INDEX IF NOT EXISTS idx_secretariat_payments_sigla ON secretariat_payments(sigla);
CREATE INDEX IF NOT EXISTS idx_secretariat_payments_status ON secretariat_payments(status);
CREATE INDEX IF NOT EXISTS idx_secretariat_payments_order_id ON secretariat_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_secretariat_payments_payment_intent_id ON secretariat_payments(payment_intent_id);