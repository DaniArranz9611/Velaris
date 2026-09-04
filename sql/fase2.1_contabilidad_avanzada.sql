-- =========================================================
-- FASE 2.1: Contabilidad avanzada
-- - Movimientos vinculados a un evento (para saber qué se gastó en cada juntada)
-- - Foto de ticket/recibo por movimiento
-- - Listas de compras con items e importe estimado/real
-- Este script NO borra tablas existentes, solo agrega cosas nuevas.
-- Pegar y ejecutar completo en Supabase → SQL Editor → New query
-- =========================================================

-- ---------- Vincular movimientos a un evento + foto de ticket ----------
alter table movimientos
  add column if not exists evento_id uuid references eventos(id) on delete set null,
  add column if not exists ticket_url text;

-- ---------- LISTAS DE COMPRAS ----------
create table if not exists listas_compras (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  evento_id uuid references eventos(id) on delete set null,
  cerrada boolean not null default false,
  creado_por uuid references perfiles(id),
  created_at timestamptz not null default now()
);

create table if not exists items_lista_compra (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references listas_compras(id) on delete cascade,
  descripcion text not null,
  monto_estimado numeric(10, 2),
  monto_real numeric(10, 2),
  comprado boolean not null default false,
  comprado_por uuid references perfiles(id),
  created_at timestamptz not null default now()
);

alter table listas_compras enable row level security;
alter table items_lista_compra enable row level security;

drop policy if exists listas_select on listas_compras;
create policy listas_select on listas_compras for select using (auth.uid() is not null);

drop policy if exists listas_insert on listas_compras;
create policy listas_insert on listas_compras for insert
  with check (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'contabilidad') in ('editar', 'administrar'));

drop policy if exists listas_update on listas_compras;
create policy listas_update on listas_compras for update
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'contabilidad') in ('editar', 'administrar'));

drop policy if exists listas_delete on listas_compras;
create policy listas_delete on listas_compras for delete
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'contabilidad') = 'administrar');

drop policy if exists items_select on items_lista_compra;
create policy items_select on items_lista_compra for select using (auth.uid() is not null);

drop policy if exists items_insert on items_lista_compra;
create policy items_insert on items_lista_compra for insert
  with check (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'contabilidad') in ('editar', 'administrar'));

drop policy if exists items_update on items_lista_compra;
create policy items_update on items_lista_compra for update
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'contabilidad') in ('editar', 'administrar'));

drop policy if exists items_delete on items_lista_compra;
create policy items_delete on items_lista_compra for delete
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'contabilidad') = 'administrar');

-- ---------- Bucket de Storage para fotos de tickets ----------
insert into storage.buckets (id, name, public)
values ('tickets', 'tickets', true)
on conflict (id) do nothing;

drop policy if exists "tickets_select" on storage.objects;
create policy "tickets_select" on storage.objects for select using (bucket_id = 'tickets');

drop policy if exists "tickets_insert" on storage.objects;
create policy "tickets_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'tickets');

drop policy if exists "tickets_delete" on storage.objects;
create policy "tickets_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'tickets' and owner = auth.uid());

-- =========================================================
-- FIN FASE 2.1
-- =========================================================
