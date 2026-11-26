create table feature_chats (
  feature text primary key,
  chat_id text not null,
  updated_at timestamptz
);
