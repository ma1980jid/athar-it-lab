-- Teacher-only access. Credentials and follow-up data never belong in GitHub.
create table public.athar_allowed_teachers (email text primary key check (email = lower(email)));
alter table public.athar_allowed_teachers enable row level security;
revoke all on public.athar_allowed_teachers from anon, authenticated;
grant select on public.athar_allowed_teachers to authenticated;
create policy teacher_reads_own_access on public.athar_allowed_teachers for select to authenticated
using ((select auth.uid()) is not null and email = lower((select auth.jwt())->>'email'));
insert into public.athar_allowed_teachers(email) values ('majid.alaghbari@moe.om');

create function public.athar_is_teacher() returns boolean language sql stable security invoker set search_path = '' as $$
 select (select auth.uid()) is not null
 and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean, false)
 and exists(select 1 from public.athar_allowed_teachers where email = lower((select auth.jwt())->>'email'));
$$;
revoke all on function public.athar_is_teacher() from public, anon;
grant execute on function public.athar_is_teacher() to authenticated;

create table public.athar_workspaces (
 owner_id uuid primary key,
 payload jsonb not null check(jsonb_typeof(payload) = 'object' and jsonb_typeof(payload->'classes') = 'array' and octet_length(payload::text) < 16777216),
 revision bigint not null default 1 check(revision > 0),
 updated_at timestamptz not null default now()
);
alter table public.athar_workspaces enable row level security;
revoke all on public.athar_workspaces from anon, authenticated;
grant select, insert, update on public.athar_workspaces to authenticated;
create policy teacher_reads_workspace on public.athar_workspaces for select to authenticated
using ((select public.athar_is_teacher()) and owner_id = (select auth.uid()));
create policy teacher_creates_workspace on public.athar_workspaces for insert to authenticated
with check ((select public.athar_is_teacher()) and owner_id = (select auth.uid()));
create policy teacher_updates_workspace on public.athar_workspaces for update to authenticated
using ((select public.athar_is_teacher()) and owner_id = (select auth.uid()))
with check ((select public.athar_is_teacher()) and owner_id = (select auth.uid()));

create table public.athar_import_package (
 singleton boolean primary key default true check(singleton),
 payload jsonb not null check(jsonb_typeof(payload) = 'object')
);
alter table public.athar_import_package enable row level security;
revoke all on public.athar_import_package from anon, authenticated;
grant select on public.athar_import_package to authenticated;
create policy teacher_reads_import on public.athar_import_package for select to authenticated
using ((select public.athar_is_teacher()));

-- Compare-and-swap prevents a stale device silently overwriting newer records.
create function public.athar_save_workspace(expected_revision bigint, document jsonb)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare new_revision bigint;
begin
 if not public.athar_is_teacher() then raise exception 'Access denied' using errcode = '42501'; end if;
 if expected_revision = 0 then
  insert into public.athar_workspaces(owner_id,payload,revision) values(auth.uid(),document,1)
  on conflict(owner_id) do nothing returning revision into new_revision;
 else
  update public.athar_workspaces set payload=document, revision=revision+1, updated_at=now()
  where owner_id=auth.uid() and revision=expected_revision returning revision into new_revision;
 end if;
 if new_revision is null then raise exception 'ATHAR_REVISION_CONFLICT' using errcode='40001'; end if;
 return new_revision;
end;
$$;
revoke all on function public.athar_save_workspace(bigint,jsonb) from public, anon;
grant execute on function public.athar_save_workspace(bigint,jsonb) to authenticated;
