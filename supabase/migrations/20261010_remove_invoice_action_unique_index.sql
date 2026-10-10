-- Allow separate invoices for the same owner, property, type, amount, and day.
-- Invoice IDs and agency-scoped references already provide unique identifiers.
DROP INDEX IF EXISTS public.uq_invoice_unique_action;
DROP INDEX IF EXISTS public.uq_invoice_travaux_unique;
