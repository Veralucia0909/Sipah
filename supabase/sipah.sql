-- Sipah: banco do ranking global (Supabase / PostgreSQL)
-- Já aplicado no projeto "sipah". Guarde este arquivo para recriar o banco se precisar:
-- painel do Supabase → SQL Editor → cole tudo e rode.
--
-- As tabelas ficam fechadas (RLS ligado, sem políticas); o jogo só acessa pelas funções abaixo.

create table if not exists public.sipah_players (
  id text primary key check (id ~ '^[A-Za-z0-9-]{8,40}$'),
  nick text not null check (char_length(nick) between 1 and 14),
  arch_id text not null check (arch_id in ('caos','ceo','genio','prota','clt','npc','hacker','maker')),
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create table if not exists public.sipah_run_tokens (
  token uuid primary key default gen_random_uuid(),
  player_id text not null references public.sipah_players(id) on delete cascade,
  started_at timestamptz not null default now()
);

create table if not exists public.sipah_runs (
  id bigint generated always as identity primary key,
  player_id text not null references public.sipah_players(id) on delete cascade,
  nick text not null,
  arch_id text not null,
  score int not null check (score >= 0),
  coins int not null check (coins >= 0),
  dist int not null check (dist >= 0),
  secs int not null,
  created_at timestamptz not null default now()
);

create index if not exists sipah_runs_created_idx on public.sipah_runs (created_at desc);
create index if not exists sipah_runs_player_idx on public.sipah_runs (player_id, score desc);
create index if not exists sipah_players_seen_idx on public.sipah_players (last_seen desc);
create index if not exists sipah_tokens_player_idx on public.sipah_run_tokens (player_id);

alter table public.sipah_players enable row level security;
alter table public.sipah_run_tokens enable row level security;
alter table public.sipah_runs enable row level security;

-- "Hoje" no fuso de São Paulo
create or replace function public.sipah_today_start() returns timestamptz
language sql stable set search_path = public, pg_temp as $$
  select (date_trunc('day', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo';
$$;

-- Mesma física do jogo: velocidade = min(34, 14 + 0,35·t) m/s
create or replace function public.sipah_max_dist(t double precision) returns double precision
language sql immutable set search_path = public, pg_temp as $$
  select case when t <= 20/0.35 then 14*t + 0.175*t*t
              else 14*(20/0.35) + 0.175*(20/0.35)^2 + 34*(t - 20/0.35) end;
$$;

create or replace function public.sipah_join(p_id text, p_nick text, p_arch text) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare n text;
begin
  n := left(regexp_replace(regexp_replace(trim(coalesce(p_nick,'')), '\s+', '_', 'g'), '[^[:alnum:]_.-]', '', 'g'), 14);
  if p_id is null or p_id !~ '^[A-Za-z0-9-]{8,40}$' or n = ''
     or p_arch not in ('caos','ceo','genio','prota','clt','npc','hacker','maker') then
    return json_build_object('ok', false, 'error', 'dados');
  end if;
  if regexp_replace(n, '[_.-]', ' ', 'g') ~* '\m(porra|caralho|merda|puta|puto|buceta|fdp|viado|bosta|cu|pau|pinto|corno|vagabund\w*|arrombad\w*|retardad\w*)\M' then
    return json_build_object('ok', false, 'error', 'apelido');
  end if;
  insert into sipah_players (id, nick, arch_id) values (p_id, n, p_arch)
  on conflict (id) do update set nick = excluded.nick, arch_id = excluded.arch_id, last_seen = now();
  return json_build_object('ok', true, 'nick', n);
end $$;

create or replace function public.sipah_run_start(p_id text) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare t uuid;
begin
  if not exists (select 1 from sipah_players where id = p_id) then
    return json_build_object('ok', false, 'error', 'jogador');
  end if;
  delete from sipah_run_tokens where player_id = p_id or started_at < now() - interval '1 hour';
  insert into sipah_run_tokens (player_id) values (p_id) returning token into t;
  update sipah_players set last_seen = now() where id = p_id;
  return json_build_object('ok', true, 'token', t);
end $$;

create or replace function public.sipah_run_finish(p_token uuid, p_dist int, p_coins int, p_score int) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  tk record; pl record; elapsed double precision; pos int; tot int; best int;
begin
  delete from sipah_run_tokens where token = p_token returning * into tk;
  if tk is null then return json_build_object('ok', false, 'error', 'sem corrida'); end if;
  elapsed := extract(epoch from now() - tk.started_at);
  if p_dist is null or p_coins is null or p_score is null or p_dist < 0 or p_coins < 0
     or p_dist > sipah_max_dist(elapsed) * 1.08 + 15
     or p_coins > p_dist / 1.4 + 5
     or p_score <> p_dist + p_coins * 10 then
    return json_build_object('ok', false, 'error', 'pontuação inválida');
  end if;
  select * into pl from sipah_players where id = tk.player_id;
  insert into sipah_runs (player_id, nick, arch_id, score, coins, dist, secs)
  values (pl.id, pl.nick, pl.arch_id, p_score, p_coins, p_dist, round(elapsed));
  update sipah_players set last_seen = now() where id = pl.id;

  with b as (
    select player_id, max(score) s from sipah_runs where created_at >= sipah_today_start() group by player_id
  )
  select (select count(*) from b where s > (select s from b where player_id = pl.id)) + 1,
         (select count(*) from b),
         (select s from b where player_id = pl.id)
  into pos, tot, best;

  return json_build_object('ok', true, 'position', pos, 'total', tot, 'isBest', best = p_score);
end $$;

create or replace function public.sipah_state() returns json
language sql stable security definer set search_path = public, pg_temp as $$
  with today as (select * from sipah_runs where created_at >= sipah_today_start()),
  best as (
    select distinct on (player_id) player_id, nick, arch_id, score, coins, created_at
    from today order by player_id, score desc, created_at asc
  ),
  seen as (select arch_id from sipah_players where last_seen >= sipah_today_start())
  select json_build_object(
    'top', coalesce((select json_agg(json_build_object('id', player_id, 'nick', nick, 'archId', arch_id, 'score', score, 'coins', coins, 'ts', (extract(epoch from created_at)*1000)::bigint) order by score desc, created_at asc)
                     from (select * from best order by score desc, created_at asc limit 10) t), '[]'::json),
    'feed', coalesce((select json_agg(json_build_object('id', player_id, 'nick', nick, 'archId', arch_id, 'score', score, 'ts', (extract(epoch from created_at)*1000)::bigint) order by created_at desc)
                     from (select * from today order by created_at desc limit 8) f), '[]'::json),
    'archCounts', (select json_object_agg(a, (select count(*) from seen where arch_id = a))
                   from unnest(array['caos','ceo','genio','prota','clt','npc','hacker','maker']) a),
    'totalPlayers', (select count(*) from seen),
    'totalRuns', (select count(*) from today)
  );
$$;

revoke all on public.sipah_players, public.sipah_run_tokens, public.sipah_runs from anon, authenticated;
revoke execute on function public.sipah_join(text,text,text), public.sipah_run_start(text), public.sipah_run_finish(uuid,int,int,int), public.sipah_state() from public;
grant execute on function public.sipah_join(text,text,text), public.sipah_run_start(text), public.sipah_run_finish(uuid,int,int,int), public.sipah_state() to anon, authenticated;
