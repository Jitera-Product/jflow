create table chat_tokens (
  id uuid primary key,
  name text not null unique,
  token text not null,
  created_by text not null,
  created_at timestamptz not null,
  last_used_at timestamptz
);
