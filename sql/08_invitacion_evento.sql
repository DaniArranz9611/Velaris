-- =========================================================
-- FASE 8: Imagen de invitación por evento (subida y descargable para todas)
-- Seguro de re-ejecutar. No borra nada.
-- =========================================================

alter table if exists eventos
  add column if not exists invitacion_url text;

insert into storage.buckets (id, name, public)
values ('invitaciones', 'invitaciones', true)
on conflict (id) do nothing;

drop policy if exists "invitaciones_select" on storage.objects;
create policy "invitaciones_select" on storage.objects for select using (bucket_id = 'invitaciones');

drop policy if exists "invitaciones_insert" on storage.objects;
create policy "invitaciones_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'invitaciones');

drop policy if exists "invitaciones_delete" on storage.objects;
create policy "invitaciones_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'invitaciones');
