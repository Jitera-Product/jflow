create table personal_settings (
  email text primary key,
  github_token text not null,
  github_login text not null,
  updated_at timestamptz not null
);
