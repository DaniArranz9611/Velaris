-- =========================================================
-- FASE 3: Perfiles a prueba de fallos + Tiempo real + Encuestas
-- Seguro de re-ejecutar. No borra nada.
-- =========================================================

-- ---------- 1. Permitir que cada usuario cree/actualice SU PROPIO perfil ----------
-- Esto es lo que faltaba: sin esto, si alguien vuelve a entrar después de haber sido
-- eliminado, la app no podía crearle el perfil de nuevo (el trigger solo corre una vez,
-- al primer registro en auth.users, no cada vez que alguien inicia sesión).
drop policy if exists perfiles_insert_propio on perfiles;
create policy perfiles_insert_propio on perfiles for insert
  with check (id = auth.uid());

drop policy if exists permisos_insert_propio on permisos_modulo;
create policy permisos_insert_propio on permisos_modulo for insert
  with check (integrante_id = auth.uid() and nivel = 'ver');

-- ---------- 2. Tiempo real: avisar a todos los dispositivos cuando algo cambia ----------
do $$
declare
  t text;
begin
  foreach t in array array[
    'perfiles', 'permisos_modulo', 'invitaciones',
    'libros', 'eventos', 'movimientos', 'listas_compras', 'items_lista_compra',
    'avance_lectura', 'teorias', 'resenas', 'evento_asistencia'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then
      null; -- ya estaba agregada, seguimos
    end;
  end loop;
end $$;

-- ---------- 3. Encuestas personalizadas (próximo libro, o lo que sea) ----------
create table if not exists encuestas (
  id uuid primary key default gen_random_uuid(),
  pregunta text not null,
  cerrada boolean not null default false,
  creado_por uuid references perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists opciones_encuesta (
  id uuid primary key default gen_random_uuid(),
  encuesta_id uuid not null references encuestas(id) on delete cascade,
  texto text not null,
  created_at timestamptz not null default now()
);

create table if not exists votos_encuesta (
  id uuid primary key default gen_random_uuid(),
  encuesta_id uuid not null references encuestas(id) on delete cascade,
  opcion_id uuid not null references opciones_encuesta(id) on delete cascade,
  integrante_id uuid not null references perfiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (encuesta_id, integrante_id)
);

alter table if exists encuestas enable row level security;
alter table if exists opciones_encuesta enable row level security;
alter table if exists votos_encuesta enable row level security;

drop policy if exists encuestas_select on encuestas;
create policy encuestas_select on encuestas for select using (auth.uid() is not null);

drop policy if exists encuestas_insert on encuestas;
create policy encuestas_insert on encuestas for insert
  with check (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'lecturas') in ('editar', 'administrar'));

drop policy if exists encuestas_update on encuestas;
create policy encuestas_update on encuestas for update
  using (creado_por = auth.uid() or es_admin_global(auth.uid()));

drop policy if exists encuestas_delete on encuestas;
create policy encuestas_delete on encuestas for delete
  using (creado_por = auth.uid() or es_admin_global(auth.uid()));

drop policy if exists opciones_select on opciones_encuesta;
create policy opciones_select on opciones_encuesta for select using (auth.uid() is not null);

drop policy if exists opciones_insert on opciones_encuesta;
create policy opciones_insert on opciones_encuesta for insert
  with check (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'lecturas') in ('editar', 'administrar'));

drop policy if exists opciones_delete on opciones_encuesta;
create policy opciones_delete on opciones_encuesta for delete
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'lecturas') in ('editar', 'administrar'));

drop policy if exists votos_select on votos_encuesta;
create policy votos_select on votos_encuesta for select using (auth.uid() is not null);

drop policy if exists votos_insert on votos_encuesta;
create policy votos_insert on votos_encuesta for insert with check (integrante_id = auth.uid());

drop policy if exists votos_update on votos_encuesta;
create policy votos_update on votos_encuesta for update using (integrante_id = auth.uid());

drop policy if exists votos_delete on votos_encuesta;
create policy votos_delete on votos_encuesta for delete using (integrante_id = auth.uid());
