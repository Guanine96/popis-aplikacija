-- Popis sessions scoped counts + create/close RPC

ALTER TABLE public.count_events
  ADD COLUMN IF NOT EXISTS popis_id text REFERENCES public.popis(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_count_events_popis
  ON public.count_events (company_id, popis_id);

-- Backfill existing counts to newest active popis per company
UPDATE public.count_events ce
SET popis_id = sub.id
FROM (
  SELECT DISTINCT ON (p.company_id) p.company_id, p.id
  FROM public.popis p
  WHERE p.status = 'ACTIVE'
  ORDER BY p.company_id, p.created_at DESC
) sub
WHERE ce.company_id = sub.company_id
  AND ce.popis_id IS NULL;

CREATE OR REPLACE FUNCTION public.create_popis_session(
  p_company_id uuid,
  p_name text,
  p_team_label text DEFAULT NULL,
  p_location text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_popis_id text;
  v_version_id uuid;
  v_row public.popis%ROWTYPE;
BEGIN
  IF p_company_id <> public.current_company_id() THEN
    RAISE EXCEPTION 'Unauthorized company';
  END IF;

  SELECT id INTO v_version_id
  FROM public.sifrarnik_versions
  WHERE company_id = p_company_id AND is_active = true
  ORDER BY upload_date DESC
  LIMIT 1;

  v_popis_id := gen_random_uuid()::text;

  INSERT INTO public.popis (
    id, company_id, name, team_label, status,
    created_by, sifrarnik_version_id,
    end_date, expires_at
  )
  VALUES (
    v_popis_id,
    p_company_id,
    trim(p_name),
    NULLIF(trim(p_team_label), ''),
    'ACTIVE',
    auth.uid(),
    v_version_id,
    now() + interval '48 hours',
    now() + interval '48 hours'
  )
  RETURNING * INTO v_row;

  IF p_location IS NOT NULL AND trim(p_location) <> '' THEN
    UPDATE public.companies
    SET session_location = trim(p_location)
    WHERE id = p_company_id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'name', v_row.name,
    'team_label', v_row.team_label,
    'status', v_row.status,
    'created_at', v_row.created_at,
    'expires_at', v_row.expires_at,
    'closed_at', v_row.closed_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.close_popis_session(p_popis_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.popis%ROWTYPE;
BEGIN
  UPDATE public.popis
  SET status = 'CLOSED', closed_at = now()
  WHERE id = p_popis_id
    AND company_id = public.current_company_id()
    AND status = 'ACTIVE'
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Popis nije pronađen ili je već zatvoren';
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'closed_at', v_row.closed_at
  );
END;
$$;

-- Import popisna scoped to a popis session (optional p_popis_id)
CREATE OR REPLACE FUNCTION public.import_popisna_lista(
  p_company_id uuid,
  p_rows jsonb,
  p_reset boolean DEFAULT false,
  p_popis_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_popis_id text;
  v_updated integer := 0;
  v_missing integer := 0;
  v_row jsonb;
  v_sifra text;
  v_qty numeric;
  v_active_version uuid;
  v_found boolean;
BEGIN
  IF p_company_id <> public.current_company_id() THEN
    RAISE EXCEPTION 'Unauthorized company';
  END IF;

  v_popis_id := COALESCE(
    p_popis_id,
    (SELECT id FROM public.popis
     WHERE company_id = p_company_id AND status = 'ACTIVE'
     ORDER BY created_at DESC LIMIT 1)
  );

  IF v_popis_id IS NULL THEN
    RAISE EXCEPTION 'Nema aktivnog popisa';
  END IF;

  SELECT id INTO v_active_version
  FROM public.sifrarnik_versions
  WHERE company_id = p_company_id AND is_active = true
  ORDER BY upload_date DESC LIMIT 1;

  IF p_reset THEN
    DELETE FROM public.popis_items
    WHERE company_id = p_company_id AND popis_id = v_popis_id;
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_sifra := trim(v_row->>'sifra');
    v_qty := COALESCE((v_row->>'qty')::numeric, 0);
    IF v_sifra IS NULL OR v_sifra = '' THEN CONTINUE; END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.sifrarnik_items si
      WHERE si.sifrarnik_version_id = v_active_version AND si.sifra = v_sifra
    ) INTO v_found;

    IF NOT v_found THEN
      v_missing := v_missing + 1;
      CONTINUE;
    END IF;

    UPDATE public.popis_items pi
    SET ciljana_kolicina = v_qty, updated_at = now()
    FROM public.sifrarnik_items si
    WHERE pi.company_id = p_company_id
      AND pi.popis_id = v_popis_id
      AND pi.sifra = v_sifra
      AND si.sifrarnik_version_id = v_active_version
      AND si.sifra = v_sifra;

    IF FOUND THEN
      v_updated := v_updated + 1;
    ELSE
      INSERT INTO public.popis_items (
        company_id, popis_id, sifra, naziv, bar_kod, ciljana_kolicina, popisano, cena
      )
      SELECT
        p_company_id, v_popis_id, si.sifra, si.naziv,
        COALESCE(si.bar_kod, ''), v_qty, 0, COALESCE(si.cena, 0)
      FROM public.sifrarnik_items si
      WHERE si.sifrarnik_version_id = v_active_version AND si.sifra = v_sifra;
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('updated', v_updated, 'missing', v_missing, 'popis_id', v_popis_id);
END;
$$;
