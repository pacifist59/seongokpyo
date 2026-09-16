-- Production-safe operational RLS audit.
--
-- Run this as a single statement in the Supabase SQL Editor. The final
-- AUDIT_PASS exception is intentional: PostgreSQL rolls back every fixture
-- written by this DO statement. Any AUDIT_FAIL exception identifies a failed
-- assertion and also rolls the whole statement back.

do $audit$
declare
  v_user_a uuid := gen_random_uuid();
  v_user_b uuid := gen_random_uuid();
  v_setlist uuid;
  v_artist_name text := 'RLS audit ' || gen_random_uuid()::text;
  v_comment uuid;
  v_affected integer;
  v_count integer;
  v_deleted boolean;
begin
  -- Disposable auth fixtures. The metadata supplies a valid 2+ character
  -- display name for the profile trigger.
  insert into auth.users (id, raw_user_meta_data)
  values
    (v_user_a, '{"display_name":"감사A"}'::jsonb),
    (v_user_b, '{"display_name":"감사B"}'::jsonb);

  -- Author A creates a setlist through the real RPC.
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_user_a,
      'role', 'authenticated',
      'is_anonymous', false
    )::text,
    true
  );
  execute 'set local role authenticated';

  select public.create_setlist(
    v_artist_name,
    current_date,
    'Operational RLS audit',
    null,
    null,
    null,
    null,
    null,
    null,
    '[{"title":"Audit song","section":"main","is_cover":false}]'::jsonb
  ) into v_setlist;

  if v_setlist is null then
    raise exception 'AUDIT_FAIL: author A could not create a setlist';
  end if;

  insert into public.attendances (user_id, setlist_id)
  values (v_user_a, v_setlist);

  insert into public.setlist_bookmarks (user_id, setlist_id)
  values (v_user_a, v_setlist);

  insert into public.comments (setlist_id, user_id, content)
  values (v_setlist, v_user_a, 'Operational RLS audit')
  returning id into v_comment;

  insert into public.setlist_activity (setlist_id, actor_id, action, snapshot)
  values (
    v_setlist,
    v_user_a,
    'created',
    jsonb_build_object('audit_setlist_id', v_setlist)
  );

  perform public.replace_setlist(
    v_setlist,
    v_artist_name,
    current_date,
    'Operational RLS audit edited',
    null,
    null,
    null,
    null,
    null,
    null,
    '[{"title":"Audit song edited","section":"main","is_cover":false}]'::jsonb
  );

  insert into public.setlist_activity (setlist_id, actor_id, action, reason, snapshot)
  values (
    v_setlist,
    v_user_a,
    'edited',
    'Operational RLS audit',
    jsonb_build_object('audit_setlist_id', v_setlist)
  );

  select count(*) into v_count
  from public.setlist_revisions
  where setlist_id = v_setlist and changed_by = v_user_a;

  if v_count <> 1 then
    raise exception 'AUDIT_FAIL: replace_setlist did not create exactly one revision';
  end if;

  execute 'reset role';

  -- Author B must not see A's private per-account records or mutate A's data.
  perform set_config('request.jwt.claim.sub', v_user_b::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_user_b,
      'role', 'authenticated',
      'is_anonymous', false
    )::text,
    true
  );
  execute 'set local role authenticated';

  select count(*) into v_count from public.attendances;
  if v_count <> 0 then
    raise exception 'AUDIT_FAIL: B can see A attendance rows';
  end if;

  select count(*) into v_count from public.setlist_bookmarks;
  if v_count <> 0 then
    raise exception 'AUDIT_FAIL: B can see A bookmark rows';
  end if;

  select count(*) into v_count
  from public.comments
  where user_id = v_user_b;
  if v_count <> 0 then
    raise exception 'AUDIT_FAIL: B mypage comment filter includes A rows';
  end if;

  select count(*) into v_count from public.setlist_revisions;
  if v_count <> 0 then
    raise exception 'AUDIT_FAIL: B can see A revision rows';
  end if;

  select count(*) into v_count from public.setlist_activity;
  if v_count <> 0 then
    raise exception 'AUDIT_FAIL: B can see A activity rows';
  end if;

  update public.setlists
  set updated_at = updated_at
  where id = v_setlist;
  get diagnostics v_affected = row_count;
  if v_affected <> 0 then
    raise exception 'AUDIT_FAIL: B directly updated A setlist';
  end if;

  delete from public.setlists where id = v_setlist;
  get diagnostics v_affected = row_count;
  if v_affected <> 0 then
    raise exception 'AUDIT_FAIL: B directly deleted A setlist';
  end if;

  update public.comments
  set content = 'B changed A comment'
  where id = v_comment;
  get diagnostics v_affected = row_count;
  if v_affected <> 0 then
    raise exception 'AUDIT_FAIL: B updated A comment';
  end if;

  begin
    perform public.replace_setlist(
      v_setlist,
      v_artist_name,
      current_date,
      'B must not edit this',
      null,
      null,
      null,
      null,
      null,
      null,
      '[{"title":"Blocked","section":"main","is_cover":false}]'::jsonb
    );
    raise exception 'AUDIT_FAIL: B replace_setlist unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.delete_setlist(v_setlist);
    raise exception 'AUDIT_FAIL: B delete_setlist unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  execute 'reset role';

  -- Anonymous callers must be blocked at the grant boundary.
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config(
    'request.jwt.claims',
    '{"role":"anon","is_anonymous":true}',
    true
  );
  execute 'set local role anon';

  begin
    insert into public.comments (setlist_id, user_id, content)
    values (v_setlist, v_user_a, 'Anonymous must not write');
    raise exception 'AUDIT_FAIL: anonymous comment insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.setlist_bookmarks (user_id, setlist_id)
    values (v_user_a, v_setlist);
    raise exception 'AUDIT_FAIL: anonymous bookmark insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.delete_setlist(v_setlist);
    raise exception 'AUDIT_FAIL: anonymous delete_setlist unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  execute 'reset role';

  -- Author A can delete through the RPC. Its deleted activity survives because
  -- setlist_activity.setlist_id uses ON DELETE SET NULL; revisions do not.
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_user_a,
      'role', 'authenticated',
      'is_anonymous', false
    )::text,
    true
  );
  execute 'set local role authenticated';

  select public.delete_setlist(v_setlist) into v_deleted;
  if v_deleted is distinct from true then
    raise exception 'AUDIT_FAIL: author A delete_setlist did not return true';
  end if;

  select count(*) into v_count
  from public.setlist_activity
  where actor_id = v_user_a and action = 'deleted' and setlist_id is null;
  if v_count <> 1 then
    raise exception 'AUDIT_FAIL: delete activity was not retained';
  end if;

  select count(*) into v_count
  from public.setlist_revisions
  where changed_by = v_user_a;
  if v_count <> 0 then
    raise exception 'AUDIT_FAIL: revision cascade behavior changed unexpectedly';
  end if;

  execute 'reset role';

  raise exception 'AUDIT_PASS: all fixtures rolled back; no production rows changed';
end
$audit$;
