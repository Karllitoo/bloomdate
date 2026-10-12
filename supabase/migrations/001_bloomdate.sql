-- Run once in Supabase SQL Editor, or with `supabase db push`.
create extension if not exists pgcrypto;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name)<=60)
);
create table public.invitations (
  id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null, status text not null default 'draft' check(status in ('draft','published','revoked')),
  version integer not null default 1, share_token text unique,
  expires_at timestamptz, created_at timestamptz not null default now()
);
create index on public.invitations(owner_id);
create table public.invitation_date_options (
  id uuid primary key, invitation_id uuid not null references public.invitations(id) on delete cascade,
  date date not null, unique(invitation_id,date)
);
create table public.invitation_time_options (
  id uuid primary key, date_id uuid not null references public.invitation_date_options(id) on delete cascade,
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  time time not null, starts_at timestamptz not null, unique(date_id,time)
);
create table public.invitation_activity_options (
  id uuid primary key, invitation_id uuid not null references public.invitations(id) on delete cascade,
  label text not null check(length(label) between 1 and 80)
);
create table public.invitation_flower_options (
  id uuid primary key, invitation_id uuid not null references public.invitations(id) on delete cascade,
  label text not null check(length(label) between 1 and 80)
);
create table public.invitation_responses (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null unique references public.invitations(id) on delete cascade,
  version integer not null, choice text not null check(choice in ('yes','maybe','no')),
  date_id uuid references public.invitation_date_options(id), time_id uuid references public.invitation_time_options(id),
  activity_id uuid references public.invitation_activity_options(id), flower_id uuid references public.invitation_flower_options(id),
  suggested_date date, note text not null default '' check(length(note)<=1000),
  snapshot jsonb not null, edit_token_hash text not null unique, idempotency_hash text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.public_rate_limits (key text primary key, count integer not null, expires_at timestamptz not null);

alter table public.profiles enable row level security;
create policy profiles_owner on public.profiles for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
alter table public.invitations enable row level security;
create policy invitations_owner_read on public.invitations for select to authenticated using(owner_id=auth.uid());
alter table public.invitation_responses enable row level security;
create policy responses_owner_read on public.invitation_responses for select to authenticated using(exists(select 1 from public.invitations i where i.id=invitation_id and i.owner_id=auth.uid()));
alter table public.invitation_date_options enable row level security;
alter table public.invitation_time_options enable row level security;
alter table public.invitation_activity_options enable row level security;
alter table public.invitation_flower_options enable row level security;
create policy dates_owner_read on public.invitation_date_options for select to authenticated using(exists(select 1 from public.invitations i where i.id=invitation_id and i.owner_id=auth.uid()));
create policy times_owner_read on public.invitation_time_options for select to authenticated using(exists(select 1 from public.invitations i where i.id=invitation_id and i.owner_id=auth.uid()));
create policy activities_owner_read on public.invitation_activity_options for select to authenticated using(exists(select 1 from public.invitations i where i.id=invitation_id and i.owner_id=auth.uid()));
create policy flowers_owner_read on public.invitation_flower_options for select to authenticated using(exists(select 1 from public.invitations i where i.id=invitation_id and i.owner_id=auth.uid()));
alter table public.public_rate_limits enable row level security;
-- Guests have no table access. All writes use service-only functions after server validation.
revoke all on public.invitations, public.invitation_responses, public.invitation_date_options, public.invitation_time_options, public.invitation_activity_options, public.invitation_flower_options, public.public_rate_limits from anon, authenticated;
grant select on public.invitations, public.invitation_responses, public.invitation_date_options, public.invitation_time_options, public.invitation_activity_options, public.invitation_flower_options to authenticated;
grant all on public.profiles, public.invitations, public.invitation_responses, public.invitation_date_options, public.invitation_time_options, public.invitation_activity_options, public.invitation_flower_options, public.public_rate_limits to service_role;

create or replace function public.save_invitation(p_owner uuid,p_payload jsonb,p_publish boolean,p_token text)
returns uuid language plpgsql security definer set search_path=public as $$
declare inv public.invitations; d jsonb; t jsonb; o jsonb; iid uuid := (p_payload->>'id')::uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(iid::text,0));
  select * into inv from public.invitations where id=iid for update;
  if found and (inv.owner_id<>p_owner or inv.status<>'draft') then raise exception 'invitation_not_editable'; end if;
  insert into public.invitations(id,owner_id,payload) values(iid,p_owner,p_payload)
    on conflict(id) do update set payload=excluded.payload,version=invitations.version+1;
  delete from public.invitation_time_options where invitation_id=iid;
  delete from public.invitation_date_options where invitation_id=iid;
  delete from public.invitation_activity_options where invitation_id=iid;
  delete from public.invitation_flower_options where invitation_id=iid;
  for d in select * from jsonb_array_elements(p_payload->'dates') loop
    insert into public.invitation_date_options values((d->>'id')::uuid,iid,(d->>'date')::date);
    for t in select * from jsonb_array_elements(d->'times') loop
      if ((d->>'date')::date+(t->>'time')::time) at time zone 'Asia/Kuala_Lumpur' <= now() then raise exception 'past_date'; end if;
      insert into public.invitation_time_options values((t->>'id')::uuid,(d->>'id')::uuid,iid,(t->>'time')::time,((d->>'date')::date+(t->>'time')::time) at time zone 'Asia/Kuala_Lumpur');
    end loop;
  end loop;
  for o in select * from jsonb_array_elements(p_payload->'activities') loop
    insert into public.invitation_activity_options values((o->>'id')::uuid,iid,o->>'label');
  end loop;
  for o in select * from jsonb_array_elements(p_payload->'flowers') loop
    insert into public.invitation_flower_options values((o->>'id')::uuid,iid,o->>'label');
  end loop;
  if p_publish then
    update public.invitations set status='published',share_token=p_token,expires_at=now()+make_interval(days=>(p_payload->>'expiry_days')::integer) where id=iid;
  end if;
  return iid;
end $$;

create or replace function public.submit_response(p_token text,p_response jsonb,p_edit_hash text,p_idempotency_hash text,p_is_edit boolean default false)
returns uuid language plpgsql security definer set search_path=public as $$
declare inv public.invitations; existing public.invitation_responses; rid uuid; c text := p_response->>'choice';
did uuid := nullif(p_response->>'date_id','')::uuid; tid uuid := nullif(p_response->>'time_id','')::uuid;
aid uuid := nullif(p_response->>'activity_id','')::uuid; fid uuid := nullif(p_response->>'flower_id','')::uuid;
suggested date := nullif(p_response->>'suggested_date','')::date;
begin
  if p_is_edit then
    select * into existing from public.invitation_responses where edit_token_hash=p_edit_hash;
    if not found then raise exception 'unavailable'; end if;
    select * into inv from public.invitations where id=existing.invitation_id for update;
  else
    select * into inv from public.invitations where share_token=p_token for update;
  end if;
  if inv.id is null or inv.status<>'published' or inv.expires_at<=now() then raise exception 'unavailable'; end if;
  if (p_response->>'version')::integer<>inv.version then raise exception 'outdated'; end if;
  select * into existing from public.invitation_responses where invitation_id=inv.id;
  if found and not p_is_edit then
    if existing.idempotency_hash=p_idempotency_hash then return existing.id; end if;
    raise exception 'already_responded';
  end if;
  if c='yes' then
    if not exists(select 1 from public.invitation_time_options where id=tid and date_id=did and invitation_id=inv.id and starts_at>now()) then raise exception 'invalid_options'; end if;
    if not exists(select 1 from public.invitation_activity_options where id=aid and invitation_id=inv.id) then raise exception 'invalid_options'; end if;
    if fid is not null and not exists(select 1 from public.invitation_flower_options where id=fid and invitation_id=inv.id) then raise exception 'invalid_options'; end if;
  elsif c='maybe' then
    if not (inv.payload->>'allow_suggestion')::boolean or suggested is null or suggested <= (now() at time zone 'Asia/Kuala_Lumpur')::date then raise exception 'invalid_suggestion'; end if;
    did:=null;tid:=null;aid:=null;fid:=null;
  elsif c='no' then did:=null;tid:=null;aid:=null;fid:=null;suggested:=null;
  else raise exception 'invalid_choice'; end if;
  if c='yes' then suggested:=null; end if;
  if p_is_edit then
    update public.invitation_responses set choice=c,date_id=did,time_id=tid,activity_id=aid,flower_id=fid,suggested_date=suggested,note=p_response->>'note',updated_at=now() where id=existing.id returning id into rid;
  else
    insert into public.invitation_responses(invitation_id,version,choice,date_id,time_id,activity_id,flower_id,suggested_date,note,snapshot,edit_token_hash,idempotency_hash)
    values(inv.id,inv.version,c,did,tid,aid,fid,suggested,p_response->>'note',inv.payload || jsonb_build_object('version',inv.version,'status','published'),p_edit_hash,p_idempotency_hash) returning id into rid;
  end if;
  return rid;
end $$;

create or replace function public.consume_rate_limit(p_key text,p_limit integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare hits integer;
begin
  insert into public.public_rate_limits(key,count,expires_at) values(p_key,1,now()+interval '1 minute')
  on conflict(key) do update set count=case when public_rate_limits.expires_at<now() then 1 else public_rate_limits.count+1 end,
    expires_at=case when public_rate_limits.expires_at<now() then now()+interval '1 minute' else public_rate_limits.expires_at end
  returning count into hits;
  delete from public.public_rate_limits where expires_at<now()-interval '1 day';
  return hits<=p_limit;
end $$;
revoke all on function public.save_invitation(uuid,jsonb,boolean,text), public.submit_response(text,jsonb,text,text,boolean), public.consume_rate_limit(text,integer) from public, anon, authenticated;
grant execute on function public.save_invitation(uuid,jsonb,boolean,text), public.submit_response(text,jsonb,text,text,boolean), public.consume_rate_limit(text,integer) to service_role;
