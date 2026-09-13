begin;
select plan(25);

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

select has_view('public', 'setlist_overview', 'setlist overview view exists');
select has_view('public', 'setlist_song_details', 'setlist song details view exists');
select has_view('public', 'artist_statistics', 'artist statistics view exists');
select has_view('public', 'venue_statistics', 'venue statistics view exists');
select has_view('public', 'festival_statistics', 'festival statistics view exists');
select has_view('public', 'song_statistics', 'song statistics view exists');
select has_view('public', 'artist_song_statistics', 'artist song statistics view exists');

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
  array['profiles_select_own', 'profiles_update_own'],
  'profiles are private to their owner'
);

select has_table_privilege('anon', 'public.setlists', 'SELECT', 'visitors can read public setlists');
select hasnt_table_privilege('anon', 'public.setlists', 'INSERT', 'visitors cannot insert setlists');
select has_table_privilege('authenticated', 'public.setlists', 'INSERT', 'members can insert their setlists');
select hasnt_table_privilege('authenticated', 'public.artists', 'UPDATE', 'members cannot rewrite shared artist records');

select * from finish();
rollback;
