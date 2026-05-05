-- 1. workers table
create table public.workers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  pin text not null unique,
  hourly_wage numeric(10, 2),
  fixed_salary numeric(10, 2),
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. templates table
create table public.templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. fairs table
create table public.fairs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  start_date date,
  end_date date,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. assignments table
create table public.assignments (
  id uuid primary key default uuid_generate_v4(),
  fair_id uuid references public.fairs(id) on delete cascade,
  worker_id uuid references public.workers(id) on delete cascade,
  template_id uuid references public.templates(id) on delete set null,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. transactions table
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid references public.assignments(id) on delete cascade,
  worker_id uuid references public.workers(id) on delete cascade,
  item_id text not null,
  item_name text not null,
  amount numeric(10, 2) not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Realtime for transactions table
alter publication supabase_realtime add table public.transactions;

-- Set up Row Level Security (RLS)
-- We disable strict RLS for now and allow anon/auth since custom PIN logic will handle worker security.
-- Realtime requires policy to be readable by anon if no JWT is passed.
alter table public.workers enable row level security;
alter table public.templates enable row level security;
alter table public.fairs enable row level security;
alter table public.assignments enable row level security;
alter table public.transactions enable row level security;

create policy "Enable all for anon and auth" on public.workers for all using (true) with check (true);
create policy "Enable all for anon and auth" on public.templates for all using (true) with check (true);
create policy "Enable all for anon and auth" on public.fairs for all using (true) with check (true);
create policy "Enable all for anon and auth" on public.assignments for all using (true) with check (true);
create policy "Enable all for anon and auth" on public.transactions for all using (true) with check (true);
