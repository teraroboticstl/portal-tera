BEGIN;
-- A student cannot undo an administrator's withdrawal through self-enrollment.
-- Leave the original AVA RPC, audience checks, RLS and progress records intact.
CREATE OR REPLACE FUNCTION public.ava_guard_enrollment_reactivation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF OLD.status='revoked' AND NEW.status='active' AND auth.uid() IS NOT NULL AND NOT public.ava_is_admin() THEN
  RAISE EXCEPTION 'Esta matrícula foi retirada pelo administrador. Solicite sua reativação.';
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.ava_guard_enrollment_reactivation() FROM PUBLIC;
DROP TRIGGER IF EXISTS ava_enrollment_reactivation_guard ON public.ava_enrollments;
CREATE TRIGGER ava_enrollment_reactivation_guard BEFORE UPDATE OF status ON public.ava_enrollments
 FOR EACH ROW EXECUTE FUNCTION public.ava_guard_enrollment_reactivation();
COMMIT;
