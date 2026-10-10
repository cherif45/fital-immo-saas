DROP POLICY IF EXISTS "activity_logs_select_policy" ON public.activity_logs;
CREATE POLICY "activity_logs_select_policy" ON public.activity_logs
    FOR SELECT TO authenticated
    USING (agency_id = public.get_user_agency_id());

DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (agency_id = public.get_user_agency_id());
