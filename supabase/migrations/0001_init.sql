create extension if not exists pgcrypto;
create table profiles(id uuid primary key references auth.users on delete cascade, max_hr int default 193, threshold_pace_s_per_km int default 248, weight_kg numeric default 67, created_at timestamptz default now());
create table garmin_credentials(user_id uuid primary key references profiles on delete cascade, token_encrypted text, expires_at timestamptz, updated_at timestamptz default now());
create table activities(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, garmin_activity_id text not null, start_time timestamptz not null, sport text, distance_m numeric, duration_s numeric, moving_s numeric, avg_hr numeric, max_hr numeric, avg_cadence numeric, elevation_gain_m numeric, calories numeric, aerobic_te numeric, anaerobic_te numeric, training_load numeric, avg_power numeric, raw jsonb, created_at timestamptz default now(), unique(user_id, garmin_activity_id));
create index on activities(user_id, start_time desc);
create table activity_laps(id uuid primary key default gen_random_uuid(), activity_id uuid not null references activities on delete cascade, lap_index int not null, distance_m numeric, duration_s numeric, avg_hr numeric, unique(activity_id, lap_index));
create table activity_records(activity_id uuid not null references activities on delete cascade, t_offset_s int not null, hr int, speed_mps numeric, cadence int, altitude_m numeric, primary key(activity_id, t_offset_s));
create table daily_health(user_id uuid not null references profiles on delete cascade, day date not null, resting_hr int, hrv_ms numeric, hrv_status text, sleep_s int, sleep_score int, body_battery_max int, body_battery_min int, stress_avg int, steps int, weight_kg numeric, raw jsonb, primary key(user_id, day));
create table daily_training_load(user_id uuid not null references profiles on delete cascade, day date not null, load numeric not null, source text not null, primary key(user_id, day));
create table races(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, name text not null, race_date date not null, distance_m numeric not null, goal_time_s int, is_active boolean default true);
create table training_plans(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, race_id uuid references races, name text, created_at timestamptz default now());
create table planned_workouts(id uuid primary key default gen_random_uuid(), plan_id uuid not null references training_plans on delete cascade, day date not null, title text not null, description text, target_km numeric, unique(plan_id, day));
create table workout_recommendations(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, day date not null, payload jsonb not null, created_at timestamptz default now());
create table coach_conversations(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, created_at timestamptz default now());
create table coach_messages(id uuid primary key default gen_random_uuid(), conversation_id uuid not null references coach_conversations on delete cascade, role text not null, content text not null, created_at timestamptz default now());
create table sync_logs(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, kind text not null, status text not null, imported int default 0, error text, started_at timestamptz default now(), finished_at timestamptz);
create table performance_estimates(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, computed_at timestamptz default now(), kind text not null, payload jsonb not null);
do $$ declare t text; begin
 foreach t in array array['profiles','garmin_credentials','activities','activity_laps','activity_records','daily_health','daily_training_load','races','training_plans','planned_workouts','workout_recommendations','coach_conversations','coach_messages','sync_logs','performance_estimates'] loop
  execute format('alter table %I enable row level security', t); end loop; end $$;
create policy own_profile on profiles for select using (id=auth.uid());
create policy own_activities on activities for select using (user_id=auth.uid());
create policy own_health on daily_health for select using (user_id=auth.uid());
create policy own_load on daily_training_load for select using (user_id=auth.uid());
create policy own_races on races for select using (user_id=auth.uid());
create policy own_sync on sync_logs for select using (user_id=auth.uid());
create policy own_est on performance_estimates for select using (user_id=auth.uid());
-- Other tables: no policies = no client access; the server uses the service role.
