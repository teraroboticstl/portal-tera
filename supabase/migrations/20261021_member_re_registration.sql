BEGIN;
-- Additive and staged: installing this migration does not activate the UI gate.
CREATE TABLE public.member_registration_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 enabled boolean NOT NULL DEFAULT false,
 required_version integer NOT NULL DEFAULT 1 CHECK(required_version=1)
);
INSERT INTO public.member_registration_settings(singleton) VALUES(true);
ALTER TABLE public.member_registration_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_registration_settings FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.member_registration_settings TO authenticated;
CREATE POLICY registration_settings_read ON public.member_registration_settings FOR SELECT TO authenticated USING(true);

-- Intentionally separate from profiles/PDI: existing shared SELECT rules must not expose age or narrative.
CREATE TABLE public.member_registrations (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE RESTRICT,
 completed_version integer NOT NULL DEFAULT 0 CHECK(completed_version IN (0,1)),
 profile jsonb,
 initial_pdi jsonb,
 completed_at timestamptz,
 CHECK ((completed_version=0 AND profile IS NULL AND initial_pdi IS NULL AND completed_at IS NULL)
     OR (completed_version=1 AND profile IS NOT NULL AND initial_pdi IS NOT NULL AND completed_at IS NOT NULL))
);
INSERT INTO public.member_registrations(user_id) SELECT id FROM public.profiles ON CONFLICT DO NOTHING;
ALTER TABLE public.member_registrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_registrations FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.member_registrations TO authenticated;
CREATE FUNCTION public.member_registration_reviewer() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND public.portal_internal_access() AND
  (public.is_admin() OR public.ava_identity()->>'access_level'='leader'
   OR coalesce((public.ava_identity()->>'mentor')::boolean,false));
$$;
REVOKE ALL ON FUNCTION public.member_registration_reviewer() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.member_registration_reviewer() TO authenticated;
CREATE POLICY registration_private_read ON public.member_registrations FOR SELECT TO authenticated
 USING ((user_id=auth.uid() AND public.portal_internal_access()) OR public.member_registration_reviewer());

CREATE FUNCTION public.member_registration_status() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE settings public.member_registration_settings; record public.member_registrations;
BEGIN
 IF auth.uid() IS NULL OR NOT public.portal_internal_access() THEN RAISE EXCEPTION 'REGISTRATION_ACCESS_DENIED'; END IF;
 SELECT * INTO STRICT settings FROM public.member_registration_settings WHERE singleton;
 SELECT * INTO record FROM public.member_registrations WHERE user_id=auth.uid();
 RETURN jsonb_build_object('actor',auth.uid(),'enabled',settings.enabled,
  'required',settings.enabled AND coalesce(record.completed_version,0)<settings.required_version,
  'completed_version',coalesce(record.completed_version,0),
  'preferred_name',record.profile->>'preferred_name');
END $$;
CREATE FUNCTION public.member_registration_complete(p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE clean jsonb; field text; item jsonb; age_years integer; modes text[]; settings public.member_registration_settings;
BEGIN
 IF auth.uid() IS NULL OR NOT public.portal_internal_access() THEN RAISE EXCEPTION 'REGISTRATION_ACCESS_DENIED'; END IF;
 SELECT * INTO STRICT settings FROM public.member_registration_settings WHERE singleton FOR SHARE;
 IF NOT settings.enabled THEN RAISE EXCEPTION 'REGISTRATION_NOT_ACTIVE'; END IF;
 IF jsonb_typeof(p_data) IS DISTINCT FROM 'object' OR octet_length(p_data::text)>16000 THEN RAISE EXCEPTION 'REGISTRATION_INVALID'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_data) k WHERE k NOT IN
  ('preferred_name','age','reason','modalities','areas','experience','contribution','season','objectives','competencies')) THEN RAISE EXCEPTION 'REGISTRATION_INVALID'; END IF;
 clean:='{}'::jsonb;
 FOREACH field IN ARRAY ARRAY['preferred_name','reason','experience','contribution','season'] LOOP
  IF jsonb_typeof(p_data->field) IS DISTINCT FROM 'string' OR char_length(trim(p_data->>field))<1
   OR char_length(trim(p_data->>field))>(CASE WHEN field='preferred_name' THEN 80 WHEN field='season' THEN 100 ELSE 2000 END)
   THEN RAISE EXCEPTION 'REGISTRATION_INVALID'; END IF;
  clean:=clean||jsonb_build_object(field,trim(p_data->>field));
 END LOOP;
 IF jsonb_typeof(p_data->'age') IS DISTINCT FROM 'number' OR (p_data->>'age')!~'^[0-9]{1,3}$' THEN RAISE EXCEPTION 'REGISTRATION_INVALID'; END IF;
 age_years:=(p_data->>'age')::integer;
 IF age_years<1 OR age_years>120 THEN RAISE EXCEPTION 'REGISTRATION_INVALID'; END IF;
 clean:=clean||jsonb_build_object('age',age_years);
 FOREACH field IN ARRAY ARRAY['modalities','areas','objectives','competencies'] LOOP
  IF jsonb_typeof(p_data->field) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'REGISTRATION_INVALID'; END IF;
  IF jsonb_array_length(p_data->field)<1 OR jsonb_array_length(p_data->field)>12 THEN RAISE EXCEPTION 'REGISTRATION_INVALID'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_data->field) LOOP
   IF jsonb_typeof(item)!='string' OR char_length(trim(item#>>'{}'))<1 OR char_length(item#>>'{}')>500 THEN RAISE EXCEPTION 'REGISTRATION_INVALID'; END IF;
  END LOOP;
  clean:=clean||jsonb_build_object(field,(SELECT jsonb_agg(trim(value)) FROM jsonb_array_elements_text(p_data->field)));
 END LOOP;
 SELECT array_agg(value) INTO modes FROM jsonb_array_elements_text(clean->'modalities');
 IF NOT modes <@ ARRAY['FLL','FTC','FRC','OBR','OBR Resgate Nível 1','OBR Resgate Nível 2','OBR Artística Nível 1','OBR Artística Nível 2']::text[] THEN RAISE EXCEPTION 'REGISTRATION_INVALID'; END IF;
 INSERT INTO public.member_registrations(user_id) VALUES(auth.uid()) ON CONFLICT DO NOTHING;
 PERFORM 1 FROM public.member_registrations WHERE user_id=auth.uid() FOR UPDATE;
 -- A repeated submission cannot overwrite an existing proposal, including concurrent retries.
 IF (SELECT completed_version FROM public.member_registrations WHERE user_id=auth.uid())>=settings.required_version THEN
  RETURN public.member_registration_status();
 END IF;
 UPDATE public.member_registrations SET profile=clean,completed_version=settings.required_version,completed_at=now(),
 initial_pdi=jsonb_build_object('participant_id',auth.uid(),'status','pending_mentor_review','origin','self_declared_registration',
  'season',clean->'season','modalities',clean->'modalities','areas',clean->'areas',
  'objectives',clean->'objectives','competencies',clean->'competencies','version',settings.required_version)
 WHERE user_id=auth.uid();
 RETURN public.member_registration_status();
END $$;
REVOKE ALL ON FUNCTION public.member_registration_status(),public.member_registration_complete(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.member_registration_status(),public.member_registration_complete(jsonb) TO authenticated;
COMMIT;
