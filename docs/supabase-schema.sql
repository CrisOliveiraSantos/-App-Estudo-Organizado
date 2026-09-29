-- Execute este arquivo no SQL Editor do projeto Supabase da Cris.
-- Ele é idempotente: pode ser executado novamente sem recriar policies ou publication entries.
-- A chave service_role nunca deve ser colocada no aplicativo.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_email text not null,
  sender_name text not null,
  room text not null check (room in ('public', 'private')),
  recipient_id uuid references auth.users(id) on delete cascade,
  recipient_email text,
  text text not null check (char_length(text) between 1 and 4000),
  created_at timestamptz not null default now(),
  constraint private_message_recipient check (
    (room = 'public' and recipient_id is null and recipient_email is null)
    or
    (room = 'private' and recipient_id is not null and recipient_email is not null)
  )
);

-- Compatibilidade caso uma tentativa anterior tenha criado a tabela sem recipient_id.
alter table public.messages add column if not exists recipient_id uuid references auth.users(id) on delete cascade;
update public.messages message
set recipient_id = profile.id
from public.profiles profile
where message.room = 'private'
  and message.recipient_id is null
  and message.recipient_email = profile.email;
alter table public.messages drop constraint if exists private_message_recipient;
alter table public.messages add constraint private_message_recipient check (
  (room = 'public' and recipient_id is null and recipient_email is null)
  or
  (room = 'private' and recipient_id is not null and recipient_email is not null)
);

create index if not exists messages_public_created_idx
  on public.messages (room, created_at desc) where room = 'public';
create index if not exists messages_private_participants_created_idx
  on public.messages (sender_id, recipient_id, created_at desc) where room = 'private';

-- Cada usuário mantém seu próprio namespace de IDs locais, como s1, g1 e note-123.
create table if not exists public.study_items (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('subject', 'event', 'goal', 'task', 'document')),
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

-- Migra uma tabela criada por versão anterior, que usava UUID como ID global.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'study_items'
      and column_name = 'id'
      and data_type = 'uuid'
  ) then
    alter table public.study_items drop constraint if exists study_items_pkey;
    alter table public.study_items alter column id type text using id::text;
    alter table public.study_items add primary key (user_id, id);
  end if;
end $$;

create index if not exists study_items_user_updated_idx
  on public.study_items (user_id, updated_at desc);

alter table public.profiles enable row level security;
alter table public.messages enable row level security;
alter table public.study_items enable row level security;

drop policy if exists "profiles are readable by authenticated users" on public.profiles;
drop policy if exists "users can create their own profile" on public.profiles;
drop policy if exists "users can update their own profile" on public.profiles;
create policy "profiles are readable by authenticated users"
  on public.profiles for select to authenticated using (true);
create policy "users can create their own profile"
  on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "users can update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "authenticated users can read public messages" on public.messages;
drop policy if exists "participants can read private messages" on public.messages;
drop policy if exists "users can send as themselves" on public.messages;
create policy "authenticated users can read public messages"
  on public.messages for select to authenticated using (room = 'public');
create policy "participants can read private messages"
  on public.messages for select to authenticated using (
    room = 'private' and (sender_id = auth.uid() or recipient_id = auth.uid())
  );
create policy "users can send as themselves"
  on public.messages for insert to authenticated with check (
    sender_id = auth.uid()
    and sender_email = coalesce(auth.jwt() ->> 'email', '')
    and (
      (room = 'public' and recipient_id is null and recipient_email is null)
      or
      (room = 'private' and recipient_id is not null and recipient_email is not null)
    )
  );

drop policy if exists "users manage their study items" on public.study_items;
create policy "users manage their study items"
  on public.study_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.messages replica identity full;
alter table public.study_items replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'study_items'
  ) then
    alter publication supabase_realtime add table public.study_items;
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = excluded.display_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- A função é interna ao gatilho e não deve ser exposta por RPC.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
