create table settings (
  id int primary key check (id = 1),
  value jsonb not null,
  updated_by text not null,
  updated_at timestamptz not null
);
