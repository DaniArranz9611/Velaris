-- =========================================================
-- FASE 12: Lista de deseados (wishlist) por integrante
-- - Cada persona arma su propia lista de libros deseados con portada
-- - Todas las integrantes pueden ver la lista de cualquier persona
-- - Solo la dueña puede editar/eliminar sus propios deseados
-- Este script NO borra tablas existentes, solo agrega cosas nuevas.
-- Pegar y ejecutar completo en Supabase → SQL Editor → New query
-- =========================================================

create table if not exists libros_deseados (
  id uuid primary key default gen_random_uuid(),
  integrante_id uuid not null references perfiles(id) on delete cascade,
  titulo text not null,
  autor text,
  nota text,
  portada_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_libros_deseados_integrante on libros_deseados(integrante_id);

alter table libros_deseados enable row level security;

drop policy if exists libros_deseados_select on libros_deseados;
create policy libros_deseados_select on libros_deseados for select using (auth.uid() is not null);

drop policy if exists libros_deseados_insert on libros_deseados;
create policy libros_deseados_insert on libros_deseados for insert with check (integrante_id = auth.uid());

drop policy if exists libros_deseados_update on libros_deseados;
create policy libros_deseados_update on libros_deseados for update
  using (integrante_id = auth.uid() or es_admin_global(auth.uid()));

drop policy if exists libros_deseados_delete on libros_deseados;
create policy libros_deseados_delete on libros_deseados for delete
  using (integrante_id = auth.uid() or es_admin_global(auth.uid()));

-- ---------- Bucket de Storage para portadas ----------
insert into storage.buckets (id, name, public)
values ('deseados', 'deseados', true)
on conflict (id) do nothing;

drop policy if exists "deseados_select" on storage.objects;
create policy "deseados_select" on storage.objects for select using (bucket_id = 'deseados');

drop policy if exists "deseados_insert" on storage.objects;
create policy "deseados_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'deseados');

drop policy if exists "deseados_delete" on storage.objects;
create policy "deseados_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'deseados' and owner = auth.uid());

-- Realtime para que se vea al instante entre dispositivos
alter publication supabase_realtime add table libros_deseados;

-- =========================================================
-- FIN FASE 12
-- =========================================================
