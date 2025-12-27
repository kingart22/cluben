-- Create enum for card status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_status') THEN
    CREATE TYPE public.card_status AS ENUM ('active', 'blocked', 'lost', 'expired');
  END IF;
END$$;

-- Create smart_cards table
CREATE TABLE IF NOT EXISTS public.smart_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status public.card_status NOT NULL DEFAULT 'active',
  registered_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  blocked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  blocked_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger for updated_at on smart_cards
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_smart_cards_updated_at'
  ) THEN
    CREATE TRIGGER set_smart_cards_updated_at
    BEFORE UPDATE ON public.smart_cards
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- Index for fast lookup by code
CREATE INDEX IF NOT EXISTS idx_smart_cards_code
  ON public.smart_cards USING btree (code);

-- Enable RLS on smart_cards
ALTER TABLE public.smart_cards ENABLE ROW LEVEL SECURITY;

-- RLS: Admins and security can view smart cards
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'smart_cards' AND policyname = 'Admins and security can view smart cards'
  ) THEN
    CREATE POLICY "Admins and security can view smart cards"
      ON public.smart_cards
      FOR SELECT
      USING (
        public.get_user_role(auth.uid()) IN ('admin', 'security')
      );
  END IF;
END$$;

-- RLS: Admins and security can manage smart cards (insert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'smart_cards' AND policyname = 'Admins and security can manage smart cards'
  ) THEN
    CREATE POLICY "Admins and security can manage smart cards"
      ON public.smart_cards
      FOR INSERT
      WITH CHECK (
        public.get_user_role(auth.uid()) IN ('admin', 'security')
      );
  END IF;
END$$;

-- RLS: Admins and security can update smart cards
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'smart_cards' AND policyname = 'Admins and security can update smart cards'
  ) THEN
    CREATE POLICY "Admins and security can update smart cards"
      ON public.smart_cards
      FOR UPDATE
      USING (
        public.get_user_role(auth.uid()) IN ('admin', 'security')
      )
      WITH CHECK (
        public.get_user_role(auth.uid()) IN ('admin', 'security')
      );
  END IF;
END$$;


-- Create card_events table for logging
CREATE TABLE IF NOT EXISTS public.card_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES public.smart_cards(id) ON DELETE SET NULL,
  code_scanned text NOT NULL,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  details jsonb,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index to query events by card and recency
CREATE INDEX IF NOT EXISTS idx_card_events_card_created_at
  ON public.card_events USING btree (card_id, created_at DESC);

-- Enable RLS on card_events
ALTER TABLE public.card_events ENABLE ROW LEVEL SECURITY;

-- RLS: Admins and security can view card events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'card_events' AND policyname = 'Admins and security can view card events'
  ) THEN
    CREATE POLICY "Admins and security can view card events"
      ON public.card_events
      FOR SELECT
      USING (
        public.get_user_role(auth.uid()) IN ('admin', 'security')
      );
  END IF;
END$$;

-- RLS: Admins and security can insert card events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'card_events' AND policyname = 'Admins and security can insert card events'
  ) THEN
    CREATE POLICY "Admins and security can insert card events"
      ON public.card_events
      FOR INSERT
      WITH CHECK (
        public.get_user_role(auth.uid()) IN ('admin', 'security')
      );
  END IF;
END$$;