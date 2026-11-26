-- ESTUDIANTINA 2027 - Ejecutar completo en Supabase > SQL Editor
create table if not exists public.cursos (
  id int primary key generated always as identity,
  nombre text not null unique check (length(trim(nombre)) > 0),
  orden int not null default 0
);
create table if not exists public.juegos (
  id bigint primary key generated always as identity,
  nombre text not null check (length(trim(nombre)) > 0),
  descripcion text,
  orden int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.puntuaciones (
  id bigint primary key generated always as identity,
  curso_id int not null references public.cursos(id) on delete cascade,
  juego_id bigint not null references public.juegos(id) on delete cascade,
  puntos int not null check (puntos >= 0),
  updated_at timestamptz not null default now(),
  unique (curso_id, juego_id)  -- una sola puntuación por curso y juego
);
create table if not exists public.administradores (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch on public.puntuaciones;
create trigger trg_touch before update on public.puntuaciones
  for each row execute function public.touch_updated_at();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.administradores where user_id = auth.uid())
$$;

alter table public.cursos enable row level security;
alter table public.juegos enable row level security;
alter table public.puntuaciones enable row level security;
alter table public.administradores enable row level security;

create policy "lectura publica cursos" on public.cursos for select using (true);
create policy "lectura publica juegos" on public.juegos for select using (true);
create policy "lectura publica puntuaciones" on public.puntuaciones for select using (true);
create policy "admin cursos" on public.cursos for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin juegos" on public.juegos for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin puntuaciones" on public.puntuaciones for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin se ve a si mismo" on public.administradores for select to authenticated using (user_id = auth.uid());
-- Sin políticas de escritura en administradores: se agrega solo desde el SQL Editor.

revoke insert, update, delete on public.cursos, public.juegos, public.puntuaciones from anon;
revoke insert, delete on public.cursos from authenticated;
revoke all on public.administradores from anon;

insert into public.cursos (nombre, orden) values
 ('1.º Año',1),('2.º Año',2),('3.º Año',3),('4.º Año',4),('5.º Año',5),('6.º Año',6)
 on conflict (nombre) do nothing;
insert into public.juegos (nombre, descripcion, orden) values
 ('Quemado', 'Competencia de quemado entre cursos', 1),
 ('Juego 2', null, 2), ('Juego 3', null, 3), ('Juego 4', null, 4);

alter publication supabase_realtime add table public.puntuaciones, public.juegos, public.cursos;
