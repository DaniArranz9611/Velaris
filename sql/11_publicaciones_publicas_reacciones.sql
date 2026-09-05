-- =========================================================
-- FASE 11: Fecha editable, público/privado, fotos, reacciones y
-- comentarios en reseñas y teorías (y fecha/foto/privacidad en el
-- journal personal).
-- Este script NO borra tablas existentes, solo agrega cosas nuevas.
-- Pegar y ejecutar completo en Supabase → SQL Editor → New query
-- =========================================================

-- ---------- Columnas nuevas ----------
alter table resenas
  add column if not exists fecha_publicacion date not null default current_date,
  add column if not exists es_publico boolean not null default true;

alter table teorias
  add column if not exists fecha_publicacion date not null default current_date,
  add column if not exists es_publico boolean not null default true,
  add column if not exists foto_url text;

alter table libro_journal_personal
  add column if not exists fecha_publicacion date not null default current_date,
  add column if not exists es_publico boolean not null default false,
  add column if not exists foto_url text;

-- ---------- Comentarios en teorías (mismo patrón que resena_comentarios) ----------
create table if not exists teoria_comentarios (
  id uuid primary key default gen_random_uuid(),
  teoria_id uuid not null references teorias(id) on delete cascade,
  integrante_id uuid not null references perfiles(id) on delete cascade,
  comentario text not null,
  created_at timestamptz not null default now()
);

alter table teoria_comentarios enable row level security;

drop policy if exists teoria_comentarios_select on teoria_comentarios;
create policy teoria_comentarios_select on teoria_comentarios for select
  using (
    exists (
      select 1 from teorias t
      where t.id = teoria_comentarios.teoria_id
        and (t.es_publico = true or t.integrante_id = auth.uid() or es_admin_global(auth.uid()))
    )
  );

drop policy if exists teoria_comentarios_insert on teoria_comentarios;
create policy teoria_comentarios_insert on teoria_comentarios for insert
  with check (
    integrante_id = auth.uid()
    and exists (select 1 from teorias t where t.id = teoria_id and t.es_publico = true)
  );

drop policy if exists teoria_comentarios_delete on teoria_comentarios;
create policy teoria_comentarios_delete on teoria_comentarios for delete
  using (integrante_id = auth.uid() or es_admin_global(auth.uid()) or nivel_en_modulo(auth.uid(), 'lecturas') = 'administrar');

-- ---------- Reacciones (likes) ----------
create table if not exists resena_reacciones (
  id uuid primary key default gen_random_uuid(),
  resena_id uuid not null references resenas(id) on delete cascade,
  integrante_id uuid not null references perfiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (resena_id, integrante_id)
);

create table if not exists teoria_reacciones (
  id uuid primary key default gen_random_uuid(),
  teoria_id uuid not null references teorias(id) on delete cascade,
  integrante_id uuid not null references perfiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (teoria_id, integrante_id)
);

alter table resena_reacciones enable row level security;
alter table teoria_reacciones enable row level security;

drop policy if exists resena_reacciones_select on resena_reacciones;
create policy resena_reacciones_select on resena_reacciones for select using (auth.uid() is not null);

drop policy if exists resena_reacciones_insert on resena_reacciones;
create policy resena_reacciones_insert on resena_reacciones for insert
  with check (
    integrante_id = auth.uid()
    and exists (select 1 from resenas r where r.id = resena_id and (r.es_publico = true or r.integrante_id = auth.uid()))
  );

drop policy if exists resena_reacciones_delete on resena_reacciones;
create policy resena_reacciones_delete on resena_reacciones for delete using (integrante_id = auth.uid());

drop policy if exists teoria_reacciones_select on teoria_reacciones;
create policy teoria_reacciones_select on teoria_reacciones for select using (auth.uid() is not null);

drop policy if exists teoria_reacciones_insert on teoria_reacciones;
create policy teoria_reacciones_insert on teoria_reacciones for insert
  with check (
    integrante_id = auth.uid()
    and exists (select 1 from teorias t where t.id = teoria_id and (t.es_publico = true or t.integrante_id = auth.uid()))
  );

drop policy if exists teoria_reacciones_delete on teoria_reacciones;
create policy teoria_reacciones_delete on teoria_reacciones for delete using (integrante_id = auth.uid());

-- ---------- Ajustar SELECT de teorías y journal para respetar es_publico ----------
drop policy if exists teorias_select on teorias;
create policy teorias_select on teorias for select
  using (
    integrante_id = auth.uid()
    or es_publico = true
    or es_admin_global(auth.uid())
  );

drop policy if exists journal_select on libro_journal_personal;
create policy journal_select on libro_journal_personal for select
  using (
    integrante_id = auth.uid()
    or es_publico = true
    or es_admin_global(auth.uid())
  );

-- =========================================================
-- FIN FASE 11
-- =========================================================
