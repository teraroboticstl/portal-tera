BEGIN;
-- Non-destructive rollback: keep all registrations/proposals and all old data.
UPDATE public.member_registration_settings SET enabled=false WHERE singleton;
COMMIT;
