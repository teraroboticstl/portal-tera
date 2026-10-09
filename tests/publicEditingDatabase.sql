BEGIN;
DO $$
DECLARE leader uuid; member uuid; photo uuid; blocked boolean; n integer; tab text; level text;
BEGIN
 SELECT id INTO leader FROM profiles WHERE role='admin' LIMIT 1;
 SELECT id INTO member FROM profiles WHERE role!='admin' AND member_role!='admin' AND lower(email) NOT IN ('teraroboticstl@gmail.com','nathannovaes16@gmail.com') LIMIT 1;
 IF leader IS NULL OR member IS NULL THEN RAISE EXCEPTION 'Missing audit fixtures'; END IF;
 -- Check the minimum level on all three write operations, without changing reads.
 FOREACH tab IN ARRAY ARRAY['tir_equipes','tir_regras','tir_fotos','robots','products','sponsors','seasons','event_galleries','event_medias','tournament_memorials'] LOOP
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname='public' AND tablename=tab AND permissive='RESTRICTIVE' AND policyname IN ('portal_public_insert_level','portal_public_update_level','portal_public_delete_level') AND (coalesce(qual,'')||coalesce(with_check,'')) LIKE '%portal_can_edit()%';
  IF n!=3 THEN RAISE EXCEPTION 'Missing restrictive write policies: %',tab; END IF;
 END LOOP;
 PERFORM set_config('request.jwt.claim.sub',leader::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',leader,'role','authenticated')::text,true);
 SET LOCAL ROLE authenticated;
 INSERT INTO tir_fotos(url,uploaded_by,legenda) VALUES('https://example.invalid/rollback-test.jpg',leader::text,'AUDITORIA REVERSÍVEL') RETURNING id INTO photo;
 FOREACH level IN ARRAY ARRAY['public','student','trainee'] LOOP
  PERFORM set_config('request.jwt.claim.sub',leader::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',leader,'role','authenticated')::text,true);
  PERFORM portal_set_access(jsonb_build_object('user_id',member,'access_level',level,'status','approved'));
  PERFORM set_config('request.jwt.claim.sub',member::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',member,'role','authenticated')::text,true);
  IF portal_can_edit() THEN RAISE EXCEPTION 'Lower level can edit: %',level; END IF;
  SELECT count(*) INTO n FROM tir_fotos WHERE id=photo; IF n!=1 THEN RAISE EXCEPTION 'Public reading broken: %',level; END IF;
  blocked:=false; BEGIN INSERT INTO tir_fotos(url,uploaded_by) VALUES('https://example.invalid/forbidden.jpg',member::text); EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Lower level registers public photo: %',level; END IF;
  UPDATE tir_fotos SET legenda='forbidden' WHERE id=photo; GET DIAGNOSTICS n=ROW_COUNT; IF n!=0 THEN RAISE EXCEPTION 'Lower level updates photo'; END IF;
  DELETE FROM tir_fotos WHERE id=photo; GET DIAGNOSTICS n=ROW_COUNT; IF n!=0 THEN RAISE EXCEPTION 'Lower level deletes photo'; END IF;
 END LOOP;
 PERFORM set_config('request.jwt.claim.sub',leader::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',leader,'role','authenticated')::text,true);
 PERFORM portal_set_access(jsonb_build_object('user_id',member,'access_level','member','status','approved'));
 PERFORM set_config('request.jwt.claim.sub',member::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',member,'role','authenticated')::text,true);
 INSERT INTO tir_fotos(url,uploaded_by) VALUES('https://example.invalid/member-test.jpg',member::text);
 IF NOT portal_can_edit() THEN RAISE EXCEPTION 'Approved integrated member denied'; END IF;
 -- Existing admin-only deletion is deliberately retained.
 DELETE FROM tir_fotos WHERE id=photo; GET DIAGNOSTICS n=ROW_COUNT; IF n!=0 THEN RAISE EXCEPTION 'Section admin rule widened'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claim.sub','',true);
 PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
 SET LOCAL ROLE anon;
 SELECT count(*) INTO n FROM tir_fotos WHERE id=photo; IF n!=1 THEN RAISE EXCEPTION 'Anonymous public read denied'; END IF;
 blocked:=false; BEGIN INSERT INTO tir_fotos(url,uploaded_by) VALUES('https://example.invalid/anon-test.jpg','anonymous'); EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Anonymous photo upload accepted'; END IF;
 RESET ROLE;
END $$;
SELECT 'PASS: anonymous/public/student/trainee writes denied; approved member/leader writes preserved; public reads preserved; stricter section rules retained. All fixtures rolled back.' AS permission_audit;
ROLLBACK;
