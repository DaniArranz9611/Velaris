-- =========================================================
-- FASE 2: Contabilidad
-- Pegar y ejecutar completo en Supabase → SQL Editor → New query
-- =========================================================

drop table if exists movimientos cascade;
drop table if exists cuotas_mensuales cascade;
drop type if exists tipo_movimiento;

create type tipo_movimiento as enum ('ingreso', 'egreso');

-- ---------- CUOTAS MENSUALES ----------
create table cuotas_mensuales (
  id uuid primary key default gen_random_uuid(),
  mes date not null, -- se guarda siempre como el día 1 del mes, ej 2026-09-01
  integrante_id uuid not null references perfiles(id) on delete cascade,
  monto_esperado numeric(10, 2) not null default 0,
  pago boolean not null default false,
  fecha_pago date,
  created_at timestamptz not null default now(),
  unique (mes, integrante_id)
);

-- ---------- MOVIMIENTOS (ingresos y egresos) ----------
create table movimientos (
  id uuid primary key default gen_random_uuid(),
  tipo tipo_movimiento not null,
  descripcion text not null,
  categoria text,
  monto numeric(10, 2) not null check (monto > 0),
  fecha date not null default current_date,
  creado_por uuid references perfiles(id),
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------
alter table cuotas_mensuales enable row level security;
alter table movimientos enable row level security;

-- Todas pueden VER (transparencia del club), solo quien tenga
-- nivel editar/administrar en 'contabilidad' puede cargar/editar.
create policy cuotas_select on cuotas_mensuales for select using (auth.uid() is not null);

create policy cuotas_insert on cuotas_mensuales for insert
  with check (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'contabilidad') in ('editar', 'administrar'));

create policy cuotas_update on cuotas_mensuales for update
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'contabilidad') in ('editar', 'administrar'));

create policy cuotas_delete on cuotas_mensuales for delete
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'contabilidad') = 'administrar');

create policy movimientos_select on movimientos for select using (auth.uid() is not null);

create policy movimientos_insert on movimientos for insert
  with check (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'contabilidad') in ('editar', 'administrar'));

create policy movimientos_update on movimientos for update
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'contabilidad') in ('editar', 'administrar'));

create policy movimientos_delete on movimientos for delete
  using (es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'contabilidad') = 'administrar');

-- =========================================================
-- FIN FASE 2
-- El saldo NO se guarda en ninguna tabla: siempre se calcula
-- en la app como suma de ingresos menos egresos de "movimientos".
-- =========================================================
