-- =========================================================
-- FASE 10: Sistema de pagos acumulativos por integrante
-- - Una persona puede hacer varios pagos parciales en el mismo mes
-- - Se reemplaza el booleano "pago sí/no" por una suma acumulada
-- - Cada pago queda registrado (fecha, monto, nota) y se puede
--   editar o eliminar
-- Este script NO borra tablas existentes, solo agrega cosas nuevas.
-- Pegar y ejecutar completo en Supabase → SQL Editor → New query
-- =========================================================

create table if not exists pagos_integrante (
  id uuid primary key default gen_random_uuid(),
  mes date not null, -- día 1 del mes, ej 2026-09-01
  integrante_id uuid not null references perfiles(id) on delete cascade,
  monto numeric(10, 2) not null check (monto > 0),
  fecha date not null default current_date,
  nota text,
  creado_por uuid references perfiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_pagos_integrante_mes on pagos_integrante(mes);
create index if not exists idx_pagos_integrante_integrante on pagos_integrante(integrante_id);

alter table pagos_integrante enable row level security;

-- Todas pueden ver (transparencia del club), solo quien tenga
-- nivel editar/administrar en 'contabilidad' puede cargar/editar/borrar.
drop policy if exists pagos_integrante_select on pagos_integrante;
create policy pagos_integrante_select on pagos_integrante for select using (auth.uid() is not null);

drop policy if exists pagos_integrante_insert on pagos_integrante;
create policy pagos_integrante_insert on pagos_integrante for insert
  with check (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'contabilidad') in ('editar', 'administrar'));

drop policy if exists pagos_integrante_update on pagos_integrante;
create policy pagos_integrante_update on pagos_integrante for update
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'contabilidad') in ('editar', 'administrar'));

drop policy if exists pagos_integrante_delete on pagos_integrante;
create policy pagos_integrante_delete on pagos_integrante for delete
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'contabilidad') in ('editar', 'administrar'));

-- Habilitar realtime para esta tabla (sincroniza entre dispositivos al instante)
alter publication supabase_realtime add table pagos_integrante;

-- =========================================================
-- FIN FASE 10
-- La cuota mensual de cada persona ahora es "monto_esperado" (editable,
-- en cuotas_mensuales) comparado contra la SUMA de sus pagos_integrante
-- del mes. cuotas_mensuales.pago / fecha_pago quedan sin uso (se pueden
-- ignorar, no se borran para no romper datos históricos).
-- =========================================================
