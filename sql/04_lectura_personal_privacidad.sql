-- =========================================================
-- FASE 4b: Lectura personal (varios libros a la vez) + privacidad + miembros
-- IMPORTANTE: ejecutá primero sql/04a_enum_values.sql (una sola vez, solo eso),
-- después ejecutá este archivo completo. Seguro de re-ejecutar. No borra nada.
-- =========================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_lectura_personal') then
    create type estado_lectura_personal as enum ('por_leer', 'leyendo', 'leido');
  end if;
end $$;

alter table if exists avance_lectura
  add column if not exists estado_personal estado_lectura_personal not null default 'leyendo',
  add column if not exists es_publico boolean not null default true;

-- ---------- Privacidad real: solo el dueño, o quien lo hizo público, o un admin, puede verlo ----------
drop policy if exists avance_select on avance_lectura;
create policy avance_select on avance_lectura for select
  using (
    integrante_id = auth.uid()
    or es_publico = true
    or es_admin_global(auth.uid())
  );

-- ---------- Perfiles: todos pueden ver el nombre de todos (para la lista de miembros) ----------
-- (ya existe perfiles_select con auth.uid() is not null, no hace falta tocarlo)

-- ---------- Permiso propio para Encuestas (antes usaba "lecturas", ahora es explícito) ----------
insert into permisos_modulo (integrante_id, modulo, nivel)
select id, 'encuestas', 'ver' from perfiles
on conflict (integrante_id, modulo) do nothing;

drop policy if exists encuestas_insert on encuestas;
create policy encuestas_insert on encuestas for insert
  with check (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'encuestas') in ('editar', 'administrar'));

drop policy if exists opciones_insert on opciones_encuesta;
create policy opciones_insert on opciones_encuesta for insert
  with check (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'encuestas') in ('editar', 'administrar'));

drop policy if exists opciones_delete on opciones_encuesta;
create policy opciones_delete on opciones_encuesta for delete
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'encuestas') in ('editar', 'administrar'));

-- ---------- Que las invitaciones nuevas también incluyan el permiso de Encuestas ----------
alter table if exists invitaciones
  add column if not exists nivel_encuestas nivel_permiso not null default 'ver';

-- ---------- Que "ninguno" bloquee de verdad el acceso a los datos (no solo el menú) ----------
drop policy if exists libros_select on libros;
create policy libros_select on libros for select
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'lecturas') <> 'ninguno');

drop policy if exists resenas_select on resenas;
create policy resenas_select on resenas for select
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'lecturas') <> 'ninguno');

drop policy if exists teorias_select on teorias;
create policy teorias_select on teorias for select
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'lecturas') <> 'ninguno');

drop policy if exists eventos_select on eventos;
create policy eventos_select on eventos for select
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'eventos') <> 'ninguno');

drop policy if exists asistencia_select on evento_asistencia;
create policy asistencia_select on evento_asistencia for select
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'eventos') <> 'ninguno');

drop policy if exists movimientos_select on movimientos;
create policy movimientos_select on movimientos for select
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'contabilidad') <> 'ninguno');

drop policy if exists cuotas_select on cuotas_mensuales;
create policy cuotas_select on cuotas_mensuales for select
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'contabilidad') <> 'ninguno');

drop policy if exists listas_select on listas_compras;
create policy listas_select on listas_compras for select
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'contabilidad') <> 'ninguno');

drop policy if exists items_select on items_lista_compra;
create policy items_select on items_lista_compra for select
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'contabilidad') <> 'ninguno');

drop policy if exists encuestas_select on encuestas;
create policy encuestas_select on encuestas for select
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'encuestas') <> 'ninguno');

drop policy if exists opciones_select on opciones_encuesta;
create policy opciones_select on opciones_encuesta for select
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'encuestas') <> 'ninguno');

drop policy if exists votos_select on votos_encuesta;
create policy votos_select on votos_encuesta for select
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'encuestas') <> 'ninguno');

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
  )
  on conflict (id) do nothing;

  insert into public.permisos_modulo (integrante_id, modulo, nivel)
  values
    (new.id, 'contabilidad', coalesce(inv.nivel_contabilidad, 'ver')),
    (new.id, 'lecturas', coalesce(inv.nivel_lecturas, 'ver')),
    (new.id, 'eventos', coalesce(inv.nivel_eventos, 'ver')),
    (new.id, 'notificaciones', coalesce(inv.nivel_notificaciones, 'ver')),
    (new.id, 'encuestas', coalesce(inv.nivel_encuestas, 'ver'))
  on conflict (integrante_id, modulo) do nothing;

  delete from invitaciones where email = new.email;

  return new;
end;
$$;
