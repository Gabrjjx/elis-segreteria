-- Add payment_method column to secretariat_payments table
ALTER TABLE secretariat_payments 
ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'stripe';

-- Update customerEmail to allow empty values
ALTER TABLE secretariat_payments 
ALTER COLUMN customer_email DROP NOT NULL,
ALTER COLUMN customer_email SET DEFAULT '';

-- Update existing records to have default payment method
UPDATE secretariat_payments 
SET payment_method = 'stripe' 
WHERE payment_method IS NULL;