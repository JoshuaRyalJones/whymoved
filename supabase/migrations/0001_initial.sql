create table securities (
  ticker text primary key,
  exchange text not null,
  name text not null,
  benchmark_ticker text not null,
  currency text not null check (currency in ('USD', 'CAD'))
);

create table portfolio_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('manual', 'csv', 'snaptrade', 'demo')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table holdings_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  ticker text not null references securities(ticker),
  quantity numeric not null,
  price numeric not null,
  value numeric not null,
  primary key (user_id, date, ticker)
);

create table price_history (
  ticker text not null references securities(ticker),
  date date not null,
  close numeric not null,
  adj_close numeric not null,
  primary key (ticker, date)
);

create table betas (
  ticker text primary key references securities(ticker),
  as_of date not null,
  beta numeric not null,
  resid_sigma numeric not null,
  n_obs integer not null,
  low_confidence boolean not null
);

create table daily_attribution (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  ticker text not null references securities(ticker),
  benchmark_ticker text not null,
  weight numeric not null,
  return numeric not null,
  contribution numeric not null,
  market_component numeric not null,
  residual numeric not null,
  z_score numeric not null,
  label text not null check (label in ('idiosyncratic', 'moved_with_market', 'normal_noise')),
  approximate boolean not null default false,
  primary key (user_id, date, ticker)
);

create table articles (
  id uuid primary key default gen_random_uuid(),
  local_id text not null,
  ticker text not null references securities(ticker),
  published_at timestamptz not null,
  source text not null,
  headline text not null,
  summary text not null,
  url text not null
);

create table explanations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  ticker text not null references securities(ticker),
  verdict text not null check (verdict in ('explained', 'partial', 'no_driver')),
  summary text not null,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  model text not null,
  prompt_version text not null,
  created_at timestamptz not null default now(),
  unique (user_id, date, ticker)
);

create table explanation_citations (
  explanation_id uuid not null references explanations(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  primary key (explanation_id, article_id)
);

create table explanation_ratings (
  explanation_id uuid not null references explanations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating text not null check (rating in ('correct', 'plausible_unverified', 'wrong')),
  note text,
  created_at timestamptz not null default now(),
  primary key (explanation_id, user_id)
);

alter table portfolio_sources enable row level security;
alter table holdings_snapshots enable row level security;
alter table daily_attribution enable row level security;
alter table explanations enable row level security;
alter table explanation_ratings enable row level security;

create policy own_sources on portfolio_sources for all using (auth.uid() = user_id);
create policy own_holdings on holdings_snapshots for all using (auth.uid() = user_id);
create policy own_attribution on daily_attribution for all using (auth.uid() = user_id);
create policy own_explanations on explanations for all using (auth.uid() = user_id);
create policy own_ratings on explanation_ratings for all using (auth.uid() = user_id);
