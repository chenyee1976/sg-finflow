
ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS card_number text,
  ADD COLUMN IF NOT EXISTS payment_due_date date,
  ADD COLUMN IF NOT EXISTS statement_period_end date,
  ADD COLUMN IF NOT EXISTS miles_opening numeric,
  ADD COLUMN IF NOT EXISTS miles_earned numeric,
  ADD COLUMN IF NOT EXISTS miles_bonus numeric,
  ADD COLUMN IF NOT EXISTS miles_redeemed numeric,
  ADD COLUMN IF NOT EXISTS miles_ending numeric;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS credit_card_id uuid REFERENCES public.credit_cards(id) ON DELETE SET NULL;
