-- =========================================================
-- MIGRACIÓN MÍNIMA: reparar acceso del usuario y agregar tablas faltantes
-- Este script NO borra ninguna tabla. Solo arregla/crea lo que falta.
-- =========================================================

-- ---------- 1. Asegurar que el usuario tenga perfil y permisos ----------
insert into perfiles (id, nombre, es_admin_global)
select u.id, coalesce(split_part(u.email, '@', 1), 'Sin nombre'), false
from auth.users u
where u.id not in (select id from perfiles);

insert into permisos_modulo (integrante_id, modulo, nivel)
select u.id, m.modulo, 'ver'
from auth.users u
cross join (select unnest(enum_range(null::modulo_tipo)) as modulo) m
on conflict (integrante_id, modulo) do nothing;

-- ---------- 2. Volver admin global al dueño del proyecto ----------
update perfiles set es_admin_global = true
where id = (select id from auth.users where email = 'arranzramirez@gmail.com');

insert into permisos_modulo (integrante_id, modulo, nivel)
select id, m.modulo, 'administrar'
from auth.users, (select unnest(enum_range(null::modulo_tipo)) as modulo) m
where email = 'arranzramirez@gmail.com'
on conflict (integrante_id, modulo) do update set nivel = 'administrar';

-- ---------- 3. Tablas de contabilidad avanzada ----------
alter table if exists movimientos
  add column if not exists evento_id uuid references eventos(id) on delete set null,
  add column if not exists ticket_url text;

-- ---------- 3b. Permitir eliminar integrantes sin romper registros históricos ----------
alter table if exists libros drop constraint if exists libros_creado_por_fkey;
alter table if exists libros add constraint libros_creado_por_fkey
  foreign key (creado_por) references perfiles(id) on delete set null;

alter table if exists eventos drop constraint if exists eventos_creado_por_fkey;
alter table if exists eventos add constraint eventos_creado_por_fkey
  foreign key (creado_por) references perfiles(id) on delete set null;

alter table if exists movimientos drop constraint if exists movimientos_creado_por_fkey;
alter table if exists movimientos add constraint movimientos_creado_por_fkey
  foreign key (creado_por) references perfiles(id) on delete set null;

alter table if exists invitaciones drop constraint if exists invitaciones_invitado_por_fkey;
alter table if exists invitaciones add constraint invitaciones_invitado_por_fkey
  foreign key (invitado_por) references perfiles(id) on delete set null;

alter table if exists votaciones drop constraint if exists votaciones_creado_por_fkey;
alter table if exists votaciones add constraint votaciones_creado_por_fkey
  foreign key (creado_por) references perfiles(id) on delete set null;

alter table if exists candidatos_libro drop constraint if exists candidatos_libro_propuesto_por_fkey;
alter table if exists candidatos_libro add constraint candidatos_libro_propuesto_por_fkey
  foreign key (propuesto_por) references perfiles(id) on delete set null;

-- ---------- 3c. Política que faltaba: SIN ESTO, "eliminar integrante" no borraba nada ----------
drop policy if exists perfiles_delete on perfiles;
create policy perfiles_delete on perfiles for delete
  using (es_admin_global(auth.uid()));

create table if not exists listas_compras (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  evento_id uuid references eventos(id) on delete set null,
  cerrada boolean not null default false,
  creado_por uuid references perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists items_lista_compra (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references listas_compras(id) on delete cascade,
  descripcion text not null,
  monto_estimado numeric(10, 2),
  monto_real numeric(10, 2),
  comprado boolean not null default false,
  comprado_por uuid references perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table if exists listas_compras enable row level security;
alter table if exists items_lista_compra enable row level security;

alter table if exists items_lista_compra drop constraint if exists items_lista_compra_comprado_por_fkey;
alter table if exists items_lista_compra add constraint items_lista_compra_comprado_por_fkey
  foreign key (comprado_por) references perfiles(id) on delete set null;

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

-- ---------- 4. Bucket de Storage para tickets ----------
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

-- ---------- 5. Tablas para avance de lectura y teorías ----------
create table if not exists avance_lectura (
  id uuid primary key default gen_random_uuid(),
  libro_id uuid not null references libros(id) on delete cascade,
  integrante_id uuid not null references perfiles(id) on delete cascade,
  porcentaje int not null check (porcentaje between 0 and 100),
  created_at timestamptz not null default now(),
  unique (libro_id, integrante_id)
);

create table if not exists teorias (
  id uuid primary key default gen_random_uuid(),
  libro_id uuid not null references libros(id) on delete cascade,
  integrante_id uuid not null references perfiles(id) on delete cascade,
  titulo text not null,
  contenido text not null,
  spoiler boolean not null default true,
  created_at timestamptz not null default now()
);

alter table if exists avance_lectura enable row level security;
alter table if exists teorias enable row level security;

drop policy if exists avance_select on avance_lectura;
create policy avance_select on avance_lectura for select using (auth.uid() is not null);

drop policy if exists avance_insert on avance_lectura;
create policy avance_insert on avance_lectura for insert with check (integrante_id = auth.uid());

drop policy if exists avance_update on avance_lectura;
create policy avance_update on avance_lectura for update using (integrante_id = auth.uid());

drop policy if exists teorias_select on teorias;
create policy teorias_select on teorias for select using (auth.uid() is not null);

drop policy if exists teorias_insert on teorias;
create policy teorias_insert on teorias for insert with check (integrante_id = auth.uid());

drop policy if exists teorias_update on teorias;
create policy teorias_update on teorias for update using (integrante_id = auth.uid());

drop policy if exists teorias_delete on teorias;
create policy teorias_delete on teorias for delete
  using (integrante_id = auth.uid() or es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'lecturas') = 'administrar');
