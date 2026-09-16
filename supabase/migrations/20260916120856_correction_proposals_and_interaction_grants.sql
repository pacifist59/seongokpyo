-- Community corrections are proposals, never direct edits to the canonical setlist.
-- Two independent confirmations make a proposal visible as community-confirmed;
-- applying it remains an explicit trusted-editor action.
create table if not exists public.setlist_corrections (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  issue_type text not null check (issue_type in ('song_order', 'song_title', 'concert_info', 'venue', 'tour', 'festival', 'other')),
  proposed_value text not null check (char_length(trim(proposed_value)) between 1 and 2000),
  reason text not null check (char_length(trim(reason)) between 10 and 2000),
  evidence_url text check (evidence_url is null or evidence_url ~* '^https://'),
  status text not null default 'pending' check (status in ('pending', 'community_confirmed', 'rejected', 'applied')),
  confirmation_count integer not null default 0 check (confirmation_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists setlist_corrections_setlist_created_idx
  on public.setlist_corrections(setlist_id, created_at desc);

create table if not exists public.setlist_correction_votes (
  correction_id uuid not null references public.setlist_corrections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (correction_id, user_id)
);

alter table public.setlist_corrections enable row level security;
alter table public.setlist_correction_votes enable row level security;

drop policy if exists "corrections readable by members" on public.setlist_corrections;
drop policy if exists "members submit own corrections" on public.setlist_corrections;
create policy "corrections readable by members" on public.setlist_corrections
  for select to authenticated using (true);
create policy "members submit own corrections" on public.setlist_corrections
  for insert to authenticated with check (reporter_id = auth.uid());

drop policy if exists "members read correction votes" on public.setlist_correction_votes;
drop policy if exists "members vote once on another correction" on public.setlist_correction_votes;
drop policy if exists "members remove own correction vote" on public.setlist_correction_votes;
create policy "members read correction votes" on public.setlist_correction_votes
  for select to authenticated using (true);
create policy "members vote once on another correction" on public.setlist_correction_votes
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.setlist_corrections c
      where c.id = correction_id and c.reporter_id <> auth.uid()
    )
  );
create policy "members remove own correction vote" on public.setlist_correction_votes
  for delete to authenticated using (user_id = auth.uid());

grant select, insert on public.setlist_corrections to authenticated;
grant select, insert, delete on public.setlist_correction_votes to authenticated;

create or replace function public.refresh_setlist_correction_confirmation_count()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_correction_id uuid := coalesce(new.correction_id, old.correction_id);
begin
  update public.setlist_corrections c
  set
    confirmation_count = (
      select count(*)::integer
      from public.setlist_correction_votes v
      where v.correction_id = c.id and v.user_id <> c.reporter_id
    ),
    status = case
      when c.status = 'pending' and (
        select count(*) from public.setlist_correction_votes v
        where v.correction_id = c.id and v.user_id <> c.reporter_id
      ) >= 2 then 'community_confirmed'
      else c.status
    end,
    updated_at = now()
  where c.id = target_correction_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists refresh_setlist_correction_confirmation_count on public.setlist_correction_votes;
create trigger refresh_setlist_correction_confirmation_count
after insert or delete on public.setlist_correction_votes
for each row execute function public.refresh_setlist_correction_confirmation_count();

-- Re-state the production interaction grants in migration history.  Existing
-- RLS policies still limit every row to auth.uid(), so these grants do not
-- allow anonymous access or cross-account reads.
grant select, insert, delete on public.attendances to authenticated;
grant select, insert, delete on public.setlist_bookmarks to authenticated;
