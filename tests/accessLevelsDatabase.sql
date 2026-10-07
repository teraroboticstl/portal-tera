-- Test with real authenticated roles; all fixtures and scope changes roll back.
BEGIN;
DO $$
DECLARE leader_id uuid; test_id uuid; target_level text; result jsonb; denied boolean; n integer; track_id uuid:=gen_random_uuid(); module_id uuid:=gen_random_uuid(); project_id uuid;
BEGIN
 SELECT id INTO leader_id FROM profiles WHERE role='admin' LIMIT 1;
 SELECT id INTO test_id FROM profiles WHERE role!='admin' AND member_role!='admin' AND lower(email) NOT IN ('teraroboticstl@gmail.com','nathannovaes16@gmail.com') LIMIT 1;
 SELECT id INTO project_id FROM projects LIMIT 1;
 IF leader_id IS NULL OR test_id IS NULL OR project_id IS NULL THEN RAISE EXCEPTION 'Missing rollback audit fixtures'; END IF;
 PERFORM set_config('request.jwt.claim.sub',leader_id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',leader_id,'role','authenticated')::text,true);
 SET LOCAL ROLE authenticated;
 PERFORM ava_mutate('save_track',jsonb_build_object('id',track_id,'title','Levels rollback audit','status','published'));
 PERFORM ava_mutate('save_module',jsonb_build_object('id',module_id,'track_id',track_id,'title','Audit text','status','published','contents',jsonb_build_array(jsonb_build_object('id','read','type','text','text','Audit'))));
 FOREACH target_level IN ARRAY ARRAY['public','student','trainee','member','leader'] LOOP
  PERFORM set_config('request.jwt.claim.sub',leader_id::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',leader_id,'role','authenticated')::text,true);
  PERFORM ava_mutate('set_access',jsonb_build_object('user_id',test_id,'access_level',target_level,'status','approved'));
  PERFORM set_config('request.jwt.claim.sub',test_id::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',test_id,'role','authenticated')::text,true);
  result:=ava_identity();
  IF result->>'access_level'!=target_level THEN RAISE EXCEPTION 'Wrong level identity: %',target_level; END IF;
  IF (result->>'portal_internal')::boolean IS DISTINCT FROM (target_level IN ('trainee','member','leader')) THEN RAISE EXCEPTION 'Wrong read scope: %',target_level; END IF;
  IF (result->>'portal_can_edit')::boolean IS DISTINCT FROM (target_level IN ('member','leader')) THEN RAISE EXCEPTION 'Wrong write scope: %',target_level; END IF;
  IF public.ava_has_access() IS DISTINCT FROM (target_level!='public') THEN RAISE EXCEPTION 'Wrong AVA scope: %',target_level; END IF;
  IF public.is_admin() IS DISTINCT FROM (target_level='leader') THEN RAISE EXCEPTION 'Wrong admin scope: %',target_level; END IF;
  IF target_level IN ('public','student') THEN SELECT count(*) INTO n FROM daily_logs; IF n!=0 THEN RAISE EXCEPTION 'External account leaked internal logs'; END IF; END IF;
  UPDATE projects SET title=title WHERE id=project_id; GET DIAGNOSTICS n=ROW_COUNT;
  IF n!=(CASE WHEN target_level IN ('member','leader') THEN 1 ELSE 0 END) THEN RAISE EXCEPTION 'Project write scope violated: %',target_level; END IF;
  IF target_level!='leader' THEN
   denied:=false; BEGIN PERFORM ava_mutate('set_access',jsonb_build_object('user_id',test_id,'access_level','leader','status','approved')); EXCEPTION WHEN others THEN denied:=true; END;
   IF NOT denied THEN RAISE EXCEPTION 'Self escalation allowed'; END IF;
   denied:=false; BEGIN PERFORM ava_mutate_legacy('set_access',jsonb_build_object('user_id',test_id,'ava_status','active','portal_internal',true)); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
   IF NOT denied THEN RAISE EXCEPTION 'Legacy scope RPC still callable'; END IF;
  END IF;
  IF target_level='student' THEN
   PERFORM ava_mutate('enroll',jsonb_build_object('track_id',track_id));
   result:=ava_mutate('progress',jsonb_build_object('module_id',module_id,'version',1,'block_id','read','value',true));
   IF NOT (result->>'completed')::boolean THEN RAISE EXCEPTION 'Student cannot save own learning'; END IF;
  END IF;
 END LOOP;
 PERFORM set_config('request.jwt.claim.sub',leader_id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',leader_id,'role','authenticated')::text,true);
 PERFORM ava_mutate('set_access',jsonb_build_object('user_id',test_id,'access_level','student','status','pending'));
 PERFORM set_config('request.jwt.claim.sub',test_id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',test_id,'role','authenticated')::text,true);
 PERFORM ava_mutate('request_access',jsonb_build_object('team_name','Rollback external team'));
 IF public.ava_has_access() OR public.portal_internal_access() OR public.portal_can_edit() THEN RAISE EXCEPTION 'Request grants access before approval'; END IF;
 RESET ROLE;
 RAISE NOTICE 'Five access levels passed: read scope, writes, admin, approval, learning and escalation';
END $$;
ROLLBACK;
