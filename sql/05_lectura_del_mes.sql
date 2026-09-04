-- =========================================================
-- FASE 5: Eliminar libros + Lectura oficial del club (para el Dashboard)
-- Seguro de re-ejecutar. No borra nada existente.
-- =========================================================

alter table if exists libros
  add column if not exists es_lectura_del_mes boolean not null default false;

-- Antes exigía nivel "administrar" para borrar un libro; ahora alcanza con "editar",
-- igual que para crear o modificar uno (más consistente y es lo que esperaba el admin).
drop policy if exists libros_delete on libros;
create policy libros_delete on libros for delete
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'lecturas') in ('editar', 'administrar'));
