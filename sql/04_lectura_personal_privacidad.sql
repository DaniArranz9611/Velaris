-- =========================================================
-- FASE 4: Lectura personal (varios libros a la vez) + privacidad + miembros
-- Seguro de re-ejecutar. No borra nada.
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
