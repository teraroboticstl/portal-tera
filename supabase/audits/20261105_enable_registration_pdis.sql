-- After backup, schema migration, compatible frontend and access validation.
BEGIN;
-- Serialize the cutover with questionnaire submissions so none fall in a gap.
LOCK TABLE public.member_registrations IN SHARE ROW EXCLUSIVE MODE;
UPDATE public.member_registration_settings SET pdi_generation_enabled=true WHERE singleton;
SELECT public.registration_pdis_generate(user_id) FROM public.member_registrations WHERE completed_version=1;
DO $$ BEGIN
 IF EXISTS (
  SELECT 1 FROM public.member_registrations r
  CROSS JOIN LATERAL jsonb_array_elements_text(r.profile->'modalities') m
  WHERE r.completed_version=1 AND NOT EXISTS (
   SELECT 1 FROM public.pdis p WHERE p.participant_id=r.user_id AND p.modality=m.value AND p.registration_version=r.completed_version
   UNION ALL
   SELECT 1 FROM public.pdi_frcs p WHERE p.participant_id=r.user_id AND p.modality=m.value AND p.registration_version=r.completed_version
  )
 ) THEN RAISE EXCEPTION 'PDI_RECONCILIATION_INCOMPLETE'; END IF;
END $$;
COMMIT;
