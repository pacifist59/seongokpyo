begin;
select plan(43);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'artists', 'artists table exists');
select has_table('public', 'venues', 'venues table exists');
select has_table('public', 'festivals', 'festivals table exists');
select has_table('public', 'tours', 'tours table exists');
select has_table('public', 'concerts', 'concerts table exists');
select has_table('public', 'setlists', 'setlists table exists');
select has_table('public', 'songs', 'songs table exists');
select has_table('public', 'setlist_songs', 'setlist_songs table exists');
select has_table('public', 'attendances', 'attendances table exists');
select has_table('public', 'setlist_revisions', 'setlist_revisions table exists');
select has_table('public', 'albums', 'albums table exists');
select has_table('public', 'comments', 'comments table exists');
select has_table('public', 'setlist_bookmarks', 'bookmarks table exists');
select has_table('public', 'setlist_activity', 'activity table exists');

select has_view('public', 'setlist_overview', 'setlist overview view exists');
select has_view('public', 'setlist_song_details', 'setlist song details view exists');
select has_view('public', 'artist_statistics', 'artist statistics view exists');
select has_view('public', 'venue_statistics', 'venue statistics view exists');
select has_view('public', 'festival_statistics', 'festival statistics view exists');
select has_view('public', 'song_statistics', 'song statistics view exists');
select has_view('public', 'artist_song_statistics', 'artist song statistics view exists');
select has_view('public', 'comment_details', 'comment details view exists');
select has_view('public', 'song_catalog', 'song catalog view exists');

select policies_are(
  'public', 'setlists',
  array['setlists_delete_own', 'setlists_insert_own', 'setlists_public_read', 'setlists_update_own'],
  'setlists has explicit read and owner-write policies'
);
select policies_are(
  'public', 'attendances',
  array['attendances_delete_own', 'attendances_insert_own', 'attendances_select_own'],
  'attendances is private to its owner'
);
select policies_are(
  'public', 'profiles',
  array['profiles_public_read', 'profiles_update_own'],
  'profiles expose display metadata while retaining owner-only updates'
);
select policies_are(
  'public', 'comments',
  array['comments_delete_own', 'comments_insert_own', 'comments_public_read', 'comments_update_own'],
  'comments are public-read and owner-write'
);
select policies_are(
  'public', 'setlist_bookmarks',
  array['bookmarks_delete_own', 'bookmarks_insert_own', 'bookmarks_select_own'],
  'bookmarks are private to their owner'
);
select policies_are(
  'public', 'setlist_activity',
  array['activity_insert_own', 'activity_select_own'],
  'activity is private to its actor'
);

select has_function('public', 'delete_setlist', array['uuid'], 'owner-safe delete function exists');

select has_table_privilege('anon', 'public.setlists', 'SELECT', 'visitors can read public setlists');
select hasnt_table_privilege('anon', 'public.setlists', 'INSERT', 'visitors cannot insert setlists');
select has_table_privilege('authenticated', 'public.setlists', 'INSERT', 'members can insert their setlists');
select hasnt_table_privilege('authenticated', 'public.artists', 'UPDATE', 'members cannot rewrite shared artist records');
select has_table_privilege('anon', 'public.comments', 'SELECT', 'visitors can read comments');
select hasnt_table_privilege('anon', 'public.comments', 'INSERT', 'visitors cannot create comments');
select hasnt_table_privilege('anon', 'public.setlist_bookmarks', 'INSERT', 'visitors cannot create bookmarks');

select ok(
  not has_function_privilege('anon', 'public.delete_setlist(uuid)', 'EXECUTE'),
  'visitors cannot execute the delete RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.delete_setlist(uuid)', 'EXECUTE'),
  'members can execute the owner-checked delete RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_setlist(text,date,text,text,text,text,text,text,text,jsonb)',
    'EXECUTE'
  ),
  'visitors cannot execute the create RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.replace_setlist(uuid,text,date,text,text,text,text,text,text,text,jsonb)',
    'EXECUTE'
  ),
  'visitors cannot execute the replace RPC'
);
select ok(
  (
    select count(*) = 6 and bool_and(c.relrowsecurity)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'setlists', 'attendances', 'comments', 'setlist_bookmarks',
        'setlist_revisions', 'setlist_activity'
      )
  ),
  'all account-sensitive tables have RLS enabled'
);

select * from finish();
rollback;
