-- =========================================================
-- FASE 1.1: FIX del bug de admin global + Invitaciones por email
-- Pegar y ejecutar completo en Supabase → SQL Editor → New query
-- =========================================================

-- ---------- FIX: el trigger bloqueaba incluso al superusuario del SQL Editor ----------
create or replace function public.proteger_admin_global()
returns trigger
language plpgsql security definer
as $$
begin
  -- Si quien edita tiene sesión (auth.uid() no es null) y NO es admin global,
  -- se ignora cualquier intento de cambiar es_admin_global.
  -- Si no hay sesión (ej: lo corrés vos directo en el SQL Editor), se permite.
  if auth.uid() is not null and not public.es_admin_global(auth.uid()) then
    new.es_admin_global := old.es_admin_global;
  end if;
  return new;
end;
$$;

-- ---------- INVITACIONES: asignar rol a un email antes de que se registre ----------
create table if not exists invitaciones (
  email text primary key,
  es_admin_global boolean not null default false,
  nivel_contabilidad nivel_permiso not null default 'ver',
  nivel_lecturas nivel_permiso not null default 'ver',
  nivel_eventos nivel_permiso not null default 'ver',
  nivel_notificaciones nivel_permiso not null default 'ver',
  invitado_por uuid references perfiles(id),
  created_at timestamptz not null default now()
);

alter table invitaciones enable row level security;

drop policy if exists invitaciones_select on invitaciones;
create policy invitaciones_select on invitaciones for select
  using (es_admin_global(auth.uid()));

drop policy if exists invitaciones_insert on invitaciones;
create policy invitaciones_insert on invitaciones for insert
  with check (es_admin_global(auth.uid()));

drop policy if exists invitaciones_update on invitaciones;
create policy invitaciones_update on invitaciones for update
  using (es_admin_global(auth.uid()));

drop policy if exists invitaciones_delete on invitaciones;
create policy invitaciones_delete on invitaciones for delete
  using (es_admin_global(auth.uid()));

-- ---------- Actualizar el trigger de alta de usuario para usar la invitación si existe ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inv invitaciones%rowtype;
begin
  select * into inv from invitaciones where email = new.email;

  insert into public.perfiles (id, nombre, es_admin_global)
  values (
    new.id,
    coalesce(split_part(new.email, '@', 1), 'Sin nombre'),
    coalesce(inv.es_admin_global, false)
  );

  insert into public.permisos_modulo (integrante_id, modulo, nivel)
  values
    (new.id, 'contabilidad', coalesce(inv.nivel_contabilidad, 'ver')),
    (new.id, 'lecturas', coalesce(inv.nivel_lecturas, 'ver')),
    (new.id, 'eventos', coalesce(inv.nivel_eventos, 'ver')),
    (new.id, 'notificaciones', coalesce(inv.nivel_notificaciones, 'ver'));

  delete from invitaciones where email = new.email;

  return new;
end;
$$;

-- =========================================================
-- Después de correr esto, ejecutá (reemplazando tu email) para
-- volverte admin global (ahora SÍ va a funcionar):
--
-- update perfiles set es_admin_global = true
-- where id = (select id from auth.users where email = 'tu@email.com');
-- =========================================================
