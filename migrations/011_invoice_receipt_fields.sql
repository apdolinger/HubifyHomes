-- Migration 011: Add receipt / payment-method detail columns to client_invoices
-- Idempotent: safe to re-run.

ALTER TABLE client_invoices ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE client_invoices ADD COLUMN IF NOT EXISTS payment_method_brand VARCHAR;
ALTER TABLE client_invoices ADD COLUMN IF NOT EXISTS payment_method_last4 VARCHAR;
