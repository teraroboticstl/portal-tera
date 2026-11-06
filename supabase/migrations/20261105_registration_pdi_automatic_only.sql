BEGIN;
-- Only the authenticated completion RPC / its owner-run trigger creates a PDI.
-- Legacy clients, including administrators, cannot reintroduce manual creation.
CREATE POLICY registration_pdi_automatic_only ON public.pdis AS RESTRICTIVE
 FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY registration_pdi_automatic_only ON public.pdi_frcs AS RESTRICTIVE
 FOR INSERT TO authenticated WITH CHECK (false);
COMMIT;
