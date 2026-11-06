-- Only after protected backup, isolated validation and compatible deployment.
BEGIN;
UPDATE public.member_registration_settings SET modality_access_enabled=true WHERE singleton;
COMMIT;
