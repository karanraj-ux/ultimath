
create table group_chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default 'Group Chat',
  persona_ids jsonb not null default '[]'::jsonb,
  personas    jsonb not null default '[]'::jsonb,
  messages    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_group_chat_sessions_updated on group_chat_sessions(updated_at desc);

-- simple open policy (no auth required, same pattern as rest of app)
alter table group_chat_sessions enable row level security;
create policy "allow_all_group_chat_sessions" on group_chat_sessions
  for all using (true) with check (true);
