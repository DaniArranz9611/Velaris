-- =========================================================
-- FASE 1: Datos core + permisos granulares
-- Club de Lectura Velaris
-- Pegar y ejecutar completo en Supabase → SQL Editor → New query
-- Este script se puede correr varias veces sin error (limpia lo anterior primero).
-- =========================================================

-- ---------- LIMPIEZA (por si se corrió antes a medias) ----------
drop trigger if exists on_auth_user_created on auth.users;

drop table if exists evento_asistencia cascade;
drop table if exists eventos cascade;
drop table if exists votos_libro cascade;
drop table if exists candidatos_libro cascade;
drop table if exists votaciones cascade;
drop table if exists frases_favoritas cascade;
drop table if exists resena_comentarios cascade;
drop table if exists resenas cascade;
drop table if exists libros cascade;
drop table if exists permisos_modulo cascade;
drop table if exists perfiles cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.es_admin_global(uuid) cascade;
drop function if exists public.nivel_en_modulo(uuid, modulo_tipo) cascade;

drop type if exists estado_libro;
drop type if exists nivel_permiso;
drop type if exists modulo_tipo;

-- ---------- TIPOS ----------
create type modulo_tipo as enum ('contabilidad', 'lecturas', 'eventos', 'notificaciones');
create type nivel_permiso as enum ('ver', 'editar', 'administrar');
create type estado_libro as enum ('por_leer', 'leyendo', 'leido');

-- ---------- PERFILES ----------
create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null default 'Sin nombre',
  apodo text,
  avatar_url text,
  es_admin_global boolean not null default false,
  created_at timestamptz not null default now()
);

-- Crea el perfil automáticamente cuando alguien se registra con magic link
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(split_part(new.email, '@', 1), 'Sin nombre'));

  insert into public.permisos_modulo (integrante_id, modulo, nivel)
  values
    (new.id, 'contabilidad', 'ver'),
    (new.id, 'lecturas', 'ver'),
    (new.id, 'eventos', 'ver'),
    (new.id, 'notificaciones', 'ver');

  return new;
end;
$$;

-- ---------- PERMISOS POR MÓDULO ----------
create table permisos_modulo (
  id uuid primary key default gen_random_uuid(),
  integrante_id uuid not null references perfiles(id) on delete cascade,
  modulo modulo_tipo not null,
  nivel nivel_permiso not null default 'ver',
  unique (integrante_id, modulo)
);

-- (el trigger de arriba usa esta tabla, por eso se crea después, ahora sí se puede enganchar)
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- FUNCIONES HELPER (para RLS) ----------
create or replace function public.es_admin_global(uid uuid)
returns boolean
language sql stable security definer
as $$
  select coalesce((select p.es_admin_global from perfiles p where p.id = uid), false);
$$;

create or replace function public.nivel_en_modulo(uid uuid, m modulo_tipo)
returns nivel_permiso
language sql stable security definer
as $$
  select nivel from permisos_modulo where integrante_id = uid and modulo = m;
$$;

-- ---------- LIBROS ----------
create table libros (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  autor text,
  portada_url text,
  sinopsis text,
  tags text[] default '{}',
  google_books_id text,
  estado estado_libro not null default 'por_leer',
  mes_asignado date,
  creado_por uuid references perfiles(id),
  created_at timestamptz not null default now()
);

-- ---------- RESEÑAS ----------
create table resenas (
  id uuid primary key default gen_random_uuid(),
  libro_id uuid not null references libros(id) on delete cascade,
  integrante_id uuid not null references perfiles(id) on delete cascade,
  calificacion int not null check (calificacion between 1 and 5),
  comentario text,
  created_at timestamptz not null default now(),
  unique (libro_id, integrante_id)
);

-- ---------- COMENTARIOS EN RESEÑAS (mini-foro) ----------
create table resena_comentarios (
  id uuid primary key default gen_random_uuid(),
  resena_id uuid not null references resenas(id) on delete cascade,
  integrante_id uuid not null references perfiles(id) on delete cascade,
  comentario text not null,
  created_at timestamptz not null default now()
);

-- ---------- FRASES FAVORITAS ----------
create table frases_favoritas (
  id uuid primary key default gen_random_uuid(),
  libro_id uuid not null references libros(id) on delete cascade,
  integrante_id uuid not null references perfiles(id) on delete cascade,
  texto text not null,
  pagina int,
  created_at timestamptz not null default now()
);

-- ---------- VOTACIÓN DEL PRÓXIMO LIBRO ----------
create table votaciones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  cerrada boolean not null default false,
  creado_por uuid references perfiles(id),
  created_at timestamptz not null default now()
);

create table candidatos_libro (
  id uuid primary key default gen_random_uuid(),
  votacion_id uuid not null references votaciones(id) on delete cascade,
  libro_titulo text not null,
  libro_autor text,
  google_books_id text,
  propuesto_por uuid references perfiles(id),
  created_at timestamptz not null default now()
);

create table votos_libro (
  id uuid primary key default gen_random_uuid(),
  candidato_id uuid not null references candidatos_libro(id) on delete cascade,
  votacion_id uuid not null references votaciones(id) on delete cascade,
  integrante_id uuid not null references perfiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (votacion_id, integrante_id)
);

-- ---------- EVENTOS ----------
create table eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  fecha timestamptz not null,
  lugar text,
  libro_id uuid references libros(id),
  creado_por uuid references perfiles(id),
  created_at timestamptz not null default now()
);

-- ---------- RSVP A EVENTOS ----------
create table evento_asistencia (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  integrante_id uuid not null references perfiles(id) on delete cascade,
  asistira boolean,
  created_at timestamptz not null default now(),
  unique (evento_id, integrante_id)
);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table perfiles enable row level security;
alter table permisos_modulo enable row level security;
alter table libros enable row level security;
alter table resenas enable row level security;
alter table resena_comentarios enable row level security;
alter table frases_favoritas enable row level security;
alter table votaciones enable row level security;
alter table candidatos_libro enable row level security;
alter table votos_libro enable row level security;
alter table eventos enable row level security;
alter table evento_asistencia enable row level security;

-- ---------- PERFILES ----------
create policy perfiles_select on perfiles for select
  using (auth.uid() is not null);

create policy perfiles_update on perfiles for update
  using (id = auth.uid() or es_admin_global(auth.uid()));

-- Evita que alguien se auto-asigne admin global editando su propio perfil:
-- si quien edita no es admin global, se ignora cualquier cambio a esa columna.
create or replace function public.proteger_admin_global()
returns trigger
language plpgsql security definer
as $$
begin
  if not public.es_admin_global(auth.uid()) then
    new.es_admin_global := old.es_admin_global;
  end if;
  return new;
end;
$$;

drop trigger if exists before_update_perfiles on perfiles;
create trigger before_update_perfiles
  before update on perfiles
  for each row execute function public.proteger_admin_global();

-- ---------- PERMISOS_MODULO ----------
create policy permisos_select on permisos_modulo for select
  using (
    integrante_id = auth.uid()
    or es_admin_global(auth.uid())
    or nivel_en_modulo(auth.uid(), modulo) = 'administrar'
  );

create policy permisos_insert on permisos_modulo for insert
  with check (
    es_admin_global(auth.uid())
    or (nivel_en_modulo(auth.uid(), modulo) = 'administrar' and nivel <> 'administrar')
  );

create policy permisos_update on permisos_modulo for update
  using (
    es_admin_global(auth.uid())
    or nivel_en_modulo(auth.uid(), modulo) = 'administrar'
  )
  with check (
    es_admin_global(auth.uid())
    or (nivel_en_modulo(auth.uid(), modulo) = 'administrar' and nivel <> 'administrar')
  );

create policy permisos_delete on permisos_modulo for delete
  using (
    es_admin_global(auth.uid())
    or nivel_en_modulo(auth.uid(), modulo) = 'administrar'
  );

-- ---------- LIBROS (módulo lecturas) ----------
create policy libros_select on libros for select using (auth.uid() is not null);

create policy libros_insert on libros for insert
  with check (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'lecturas') in ('editar', 'administrar'));

create policy libros_update on libros for update
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'lecturas') in ('editar', 'administrar'))
  with check (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'lecturas') in ('editar', 'administrar'));

create policy libros_delete on libros for delete
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'lecturas') = 'administrar');

-- ---------- RESEÑAS ----------
create policy resenas_select on resenas for select using (auth.uid() is not null);

create policy resenas_insert on resenas for insert
  with check (
    integrante_id = auth.uid()
    and (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'lecturas') in ('editar', 'administrar'))
  );

create policy resenas_update on resenas for update
  using (
    es_admin_global(auth.uid())
    or nivel_en_modulo(auth.uid(), 'lecturas') = 'administrar'
    or (integrante_id = auth.uid() and nivel_en_modulo(auth.uid(), 'lecturas') in ('editar', 'administrar'))
  );

create policy resenas_delete on resenas for delete
  using (
    es_admin_global(auth.uid())
    or nivel_en_modulo(auth.uid(), 'lecturas') = 'administrar'
    or (integrante_id = auth.uid() and nivel_en_modulo(auth.uid(), 'lecturas') in ('editar', 'administrar'))
  );

-- ---------- COMENTARIOS EN RESEÑAS ----------
create policy resena_comentarios_select on resena_comentarios for select using (auth.uid() is not null);

create policy resena_comentarios_insert on resena_comentarios for insert
  with check (integrante_id = auth.uid());

create policy resena_comentarios_delete on resena_comentarios for delete
  using (
    integrante_id = auth.uid()
    or es_admin_global(auth.uid())
    or nivel_en_modulo(auth.uid(), 'lecturas') = 'administrar'
  );

-- ---------- FRASES FAVORITAS ----------
create policy frases_select on frases_favoritas for select using (auth.uid() is not null);

create policy frases_insert on frases_favoritas for insert
  with check (integrante_id = auth.uid());

create policy frases_delete on frases_favoritas for delete
  using (
    integrante_id = auth.uid()
    or es_admin_global(auth.uid())
    or nivel_en_modulo(auth.uid(), 'lecturas') = 'administrar'
  );

-- ---------- VOTACIONES / CANDIDATOS / VOTOS ----------
create policy votaciones_select on votaciones for select using (auth.uid() is not null);

create policy votaciones_insert on votaciones for insert
  with check (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'lecturas') in ('editar', 'administrar'));

create policy votaciones_update on votaciones for update
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'lecturas') in ('editar', 'administrar'));

create policy candidatos_select on candidatos_libro for select using (auth.uid() is not null);

create policy candidatos_insert on candidatos_libro for insert
  with check (propuesto_por = auth.uid());

create policy votos_select on votos_libro for select using (auth.uid() is not null);

create policy votos_insert on votos_libro for insert
  with check (integrante_id = auth.uid());

create policy votos_delete on votos_libro for delete
  using (integrante_id = auth.uid());

-- ---------- EVENTOS (módulo eventos) ----------
create policy eventos_select on eventos for select using (auth.uid() is not null);

create policy eventos_insert on eventos for insert
  with check (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'eventos') in ('editar', 'administrar'));

create policy eventos_update on eventos for update
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'eventos') in ('editar', 'administrar'));

create policy eventos_delete on eventos for delete
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'eventos') = 'administrar');

-- ---------- RSVP A EVENTOS ----------
create policy asistencia_select on evento_asistencia for select using (auth.uid() is not null);

create policy asistencia_insert on evento_asistencia for insert
  with check (integrante_id = auth.uid());

create policy asistencia_update on evento_asistencia for update
  using (integrante_id = auth.uid());

-- =========================================================
-- FIN FASE 1
-- Después de correr esto, ejecutá (reemplazando tu email) para
-- volverte admin global vos misma/o:
--
-- update perfiles set es_admin_global = true
-- where id = (select id from auth.users where email = 'tu@email.com');
-- =========================================================
