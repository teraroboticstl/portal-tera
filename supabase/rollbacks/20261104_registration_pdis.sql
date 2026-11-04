-- Non-destructive rollback: stop automatic generation; keep created PDIs and privacy rules.
UPDATE public.member_registration_settings SET pdi_generation_enabled=false WHERE singleton;
-- Do not drop the RPC while the compatible frontend is deployed.
