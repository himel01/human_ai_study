create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  prolific_pid text unique not null,
  study_id text,
  session_id text,
  condition text,
  created_at timestamptz default now()
);

create table if not exists ai_logs (
  id uuid primary key default gen_random_uuid(),
  prolific_pid text not null,
  study_id text,
  session_id text,
  condition text,
  prompt text,
  response text,
  created_at timestamptz default now()
);

create table if not exists completions (
  id uuid primary key default gen_random_uuid(),
  prolific_pid text not null,
  study_id text,
  session_id text,
  condition text,
  code_snapshot text,
  created_at timestamptz default now()
);
