-- SaaS foundation: multi-tenant RLS, multi-popis, 48h auto-delete, subscription fields
-- Apply via Supabase SQL Editor or: supabase db push

-- ---------------------------------------------------------------------------
-- 1. Companies — subscription & billing fields
-- ---------------------------------------------------------------------------
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS pib text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'Mediolitics'
    CHECK (plan_type IN ('Mediolitics', 'Extralitics')),
  ADD COLUMN IF NOT EXISTS max_licenses integer,
  ADD COLUMN IF NOT EXISTS subscription_active boolean DEFAULT true;

-- Align legacy seats_total with max_licenses
UPDATE public.companies
SET max_licenses = seats_total
WHERE max_licenses IS NULL AND seats_total IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Popis — multiple sessions per company + 48h TTL
-- ---------------------------------------------------------------------------
ALTER TABLE public.popis
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS team_label text;

UPDATE public.popis
SET
  name = COALESCE(name, 'Popis ' || to_char(created_at, 'YYYY-MM-DD')),
  expires_at = COALESCE(expires_at, created_at + interval '48 hours')
WHERE expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_popis_company_status ON public.popis (company_id, status);
CREATE INDEX IF NOT EXISTS idx_popis_expires_at ON public.popis (expires_at) WHERE status = 'ACTIVE';

-- ---------------------------------------------------------------------------
-- 3. Helper: current user's company_id (for RLS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 4. Row Level Security — tenant isolation
-- ---------------------------------------------------------------------------
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popis_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sifrarnik_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sifrarnik_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.count_events ENABLE ROW LEVEL SECURITY;

-- Companies: users see only their org
DROP POLICY IF EXISTS companies_tenant_select ON public.companies;
CREATE POLICY companies_tenant_select ON public.companies
  FOR SELECT TO authenticated
  USING (id = public.current_company_id());

DROP POLICY IF EXISTS companies_tenant_update ON public.companies;
CREATE POLICY companies_tenant_update ON public.companies
  FOR UPDATE TO authenticated
  USING (id = public.current_company_id())
  WITH CHECK (id = public.current_company_id());

-- Profiles: same company only
DROP POLICY IF EXISTS profiles_tenant_select ON public.profiles;
CREATE POLICY profiles_tenant_select ON public.profiles
  FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());

DROP POLICY IF EXISTS profiles_tenant_insert ON public.profiles;
CREATE POLICY profiles_tenant_insert ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id());

DROP POLICY IF EXISTS profiles_tenant_update ON public.profiles;
CREATE POLICY profiles_tenant_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

-- Popis
DROP POLICY IF EXISTS popis_tenant_all ON public.popis;
CREATE POLICY popis_tenant_all ON public.popis
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

-- Popis items
DROP POLICY IF EXISTS popis_items_tenant_all ON public.popis_items;
CREATE POLICY popis_items_tenant_all ON public.popis_items
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

-- Sifrarnik versions
DROP POLICY IF EXISTS sifrarnik_versions_tenant_all ON public.sifrarnik_versions;
CREATE POLICY sifrarnik_versions_tenant_all ON public.sifrarnik_versions
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

-- Sifrarnik items (via version join)
DROP POLICY IF EXISTS sifrarnik_items_tenant_select ON public.sifrarnik_items;
CREATE POLICY sifrarnik_items_tenant_select ON public.sifrarnik_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sifrarnik_versions sv
      WHERE sv.id = sifrarnik_items.sifrarnik_version_id
        AND sv.company_id = public.current_company_id()
    )
  );

DROP POLICY IF EXISTS sifrarnik_items_tenant_write ON public.sifrarnik_items;
CREATE POLICY sifrarnik_items_tenant_write ON public.sifrarnik_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sifrarnik_versions sv
      WHERE sv.id = sifrarnik_items.sifrarnik_version_id
        AND sv.company_id = public.current_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sifrarnik_versions sv
      WHERE sv.id = sifrarnik_items.sifrarnik_version_id
        AND sv.company_id = public.current_company_id()
    )
  );

-- Count events — append-only for workers, read for company
DROP POLICY IF EXISTS count_events_tenant_select ON public.count_events;
CREATE POLICY count_events_tenant_select ON public.count_events
  FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());

DROP POLICY IF EXISTS count_events_tenant_insert ON public.count_events;
CREATE POLICY count_events_tenant_insert ON public.count_events
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id());

-- ---------------------------------------------------------------------------
-- 5. Šifrarnik import — replace per company (RPC)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.replace_sifrarnik_for_company(
  p_company_id uuid,
  p_version_label text,
  p_column_mapping jsonb,
  p_items jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version_id uuid;
  v_count integer := 0;
BEGIN
  IF p_company_id <> public.current_company_id() THEN
    RAISE EXCEPTION 'Unauthorized company';
  END IF;

  UPDATE public.sifrarnik_versions SET is_active = false WHERE company_id = p_company_id;

  INSERT INTO public.sifrarnik_versions (company_id, version, is_active, column_mapping)
  VALUES (p_company_id, p_version_label, true, p_column_mapping)
  RETURNING id INTO v_version_id;

  INSERT INTO public.sifrarnik_items (sifrarnik_version_id, sifra, naziv, bar_kod, kolicina_na_zal, cena)
  SELECT
    v_version_id,
    (item->>'sifra')::text,
    (item->>'naziv')::text,
    COALESCE(item->>'bar_kod', ''),
    COALESCE((item->>'kolicina_na_zal')::numeric, 0),
    COALESCE((item->>'cena')::numeric, 0)
  FROM jsonb_array_elements(p_items) AS item;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Auto-delete expired popisi (run hourly via pg_cron or Edge Function)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_expired_popisi()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer := 0;
BEGIN
  WITH doomed AS (
    SELECT id FROM public.popis
    WHERE expires_at IS NOT NULL
      AND expires_at < now()
      AND status IN ('ACTIVE', 'CLOSED')
  ),
  del_items AS (
    DELETE FROM public.popis_items pi
    USING doomed d
    WHERE pi.popis_id = d.id
    RETURNING 1
  ),
  del_popis AS (
    DELETE FROM public.popis p
    USING doomed d
    WHERE p.id = d.id
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM del_popis;

  RETURN v_deleted;
END;
$$;

-- Optional pg_cron (enable extension in Supabase Dashboard first):
-- SELECT cron.schedule('purge-expired-popisi', '0 * * * *', $$SELECT public.purge_expired_popisi()$$);

-- ---------------------------------------------------------------------------
-- 7. Realtime merge: count_events always SUM (no overwrite)
-- bump_profile_stats already increments popisano; ensure trigger uses +=
-- ---------------------------------------------------------------------------
-- Verify bump_profile_stats uses popisano = popisano + NEW.quantity (already fixed in prior migration)
