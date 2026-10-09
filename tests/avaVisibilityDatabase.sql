BEGIN;
DO $$
DECLARE leader uuid; student uuid; t uuid:=gen_random_uuid(); m uuid:=gen_random_uuid(); result jsonb; denied boolean;
BEGIN
 SELECT id INTO leader FROM profiles WHERE role='admin' LIMIT 1;
 SELECT id INTO student FROM profiles WHERE email='zebertolotto@gmail.com';
 IF leader IS NULL OR student IS NULL THEN RAISE EXCEPTION 'Missing audit identities'; END IF;
 PERFORM set_config('request.jwt.claim.sub',leader::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',leader,'role','authenticated')::text,true);
 SET LOCAL ROLE authenticated;
 PERFORM ava_mutate('save_track',jsonb_build_object('id',t,'title','Visibility rollback audit','status','draft','audience','all'));
 PERFORM ava_mutate('save_module',jsonb_build_object('id',m,'track_id',t,'title','Private draft material','status','draft','contents',jsonb_build_array(jsonb_build_object('id','text','type','text','text','Do not expose this draft'))));
 PERFORM set_config('request.jwt.claim.sub',student::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',student,'role','authenticated')::text,true);
 result:=ava_read('dashboard');
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(result->'catalog') c WHERE c->>'id'=t::text AND c->>'status'='draft') THEN RAISE EXCEPTION 'Draft missing from authenticated catalog'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(ava_catalog()) c WHERE c->>'id'=t::text) THEN RAISE EXCEPTION 'Anonymous catalog exposed draft'; END IF;
 PERFORM ava_mutate('request_enrollment',jsonb_build_object('track_id',t));
 PERFORM set_config('request.jwt.claim.sub',leader::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',leader,'role','authenticated')::text,true);
 PERFORM ava_mutate('enroll_user',jsonb_build_object('user_id',student,'track_id',t,'status','active'));
 PERFORM set_config('request.jwt.claim.sub',student::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',student,'role','authenticated')::text,true);
 result:=ava_read('dashboard');
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(result->'tracks') c WHERE c->>'id'=t::text AND (c->>'enrolled')::boolean AND NOT (c->>'can_access')::boolean) THEN RAISE EXCEPTION 'Approved draft enrollment missing or unlocked'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(result->'modules') c WHERE c->>'id'=m::text) THEN RAISE EXCEPTION 'Draft module metadata leaked'; END IF;
 denied:=false; BEGIN PERFORM ava_read('module',m); EXCEPTION WHEN others THEN denied:=SQLERRM LIKE '%AVA_ENROLLMENT_REQUIRED%'; END;
 IF NOT denied THEN RAISE EXCEPTION 'Approved draft enrollment exposed draft lesson'; END IF;
 PERFORM set_config('request.jwt.claim.sub',leader::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',leader,'role','authenticated')::text,true);
 PERFORM ava_mutate('save_track',jsonb_build_object('id',t,'title','Visibility rollback audit','status','published','audience','all'));
 PERFORM ava_mutate('save_module',jsonb_build_object('id',m,'track_id',t,'title','Private draft material','status','published','contents',jsonb_build_array(jsonb_build_object('id','text','type','text','text','Now published'))));
 PERFORM set_config('request.jwt.claim.sub',student::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',student,'role','authenticated')::text,true);
 result:=ava_read('dashboard');
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(result->'tracks') c WHERE c->>'id'=t::text AND (c->>'can_access')::boolean) THEN RAISE EXCEPTION 'Publishing did not unlock approved enrollment'; END IF;
 PERFORM ava_read('module',m);
 IF portal_internal_access() THEN RAISE EXCEPTION 'Enrollment changed internal access'; END IF;
 RESET ROLE;
END $$;
SELECT 'PASS: approved draft enrollments visible, draft requests allowed, draft lessons protected, publication unlocks approved lessons. Fixtures rolled back.' AS visibility_audit;
ROLLBACK;
-- Read the real student's unchanged dashboard through the authenticated RPC.
BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM profiles WHERE email='zebertolotto@gmail.com'),true);
SET LOCAL ROLE authenticated;
SELECT count(*) AS catalog_tracks,count(*) FILTER(WHERE (t->>'enrolled')::boolean) AS approved_enrollments,
 string_agg(t->>'title',', ' ORDER BY t->>'position') AS track_titles
FROM jsonb_array_elements(ava_read('dashboard')->'tracks') t;
ROLLBACK;
