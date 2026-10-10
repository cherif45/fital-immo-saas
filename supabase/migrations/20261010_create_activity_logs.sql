CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id UUID,
    user_nom VARCHAR(150),
    activity_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100),
    entity_id TEXT,
    entity_ref VARCHAR(150),
    title TEXT NOT NULL,
    description TEXT,
    montant NUMERIC(15, 2),
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    activity_hour VARCHAR(10),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.activity_logs
    ADD COLUMN IF NOT EXISTS user_id UUID,
    ADD COLUMN IF NOT EXISTS user_nom VARCHAR(150),
    ADD COLUMN IF NOT EXISTS activity_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS entity_id TEXT,
    ADD COLUMN IF NOT EXISTS entity_ref VARCHAR(150),
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS montant NUMERIC(15, 2),
    ADD COLUMN IF NOT EXISTS activity_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS activity_hour VARCHAR(10),
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_activity_logs_agency_created
    ON public.activity_logs (agency_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_agency_date
    ON public.activity_logs (agency_id, activity_date DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_select_policy" ON public.activity_logs;
CREATE POLICY "activity_logs_select_policy" ON public.activity_logs
    FOR SELECT TO authenticated
    USING (
        agency_id = public.get_user_agency_id()
        AND public.get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE')
    );

DROP POLICY IF EXISTS "activity_logs_insert_policy" ON public.activity_logs;
CREATE POLICY "activity_logs_insert_policy" ON public.activity_logs
    FOR INSERT TO authenticated
    WITH CHECK (agency_id = public.get_user_agency_id());
