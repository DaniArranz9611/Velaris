-- =========================================================
-- FASE 6: Restaurar admin + fix 404 (Vercel/SPA) + book journal 100% personal
-- Seguro de re-ejecutar. No borra nada.
-- =========================================================

-- ---------- 1. Restaurar admin global (nadie quedó de admin) ----------
update perfiles set es_admin_global = true
where id = (select id from auth.users where email = 'dayimac9708@gmail.com');

insert into permisos_modulo (integrante_id, modulo, nivel)
select id, m.modulo, 'administrar'
from auth.users, (select unnest(enum_range(null::modulo_tipo)) as modulo) m
where email = 'dayimac9708@gmail.com'
on conflict (integrante_id, modulo) do update set nivel = 'administrar';

-- Por las dudas, restauramos también al dueño original.
update perfiles set es_admin_global = true
where id = (select id from auth.users where email = 'arranzramirez@gmail.com');

-- ---------- 2. Book journal 100% personal (no pertenece al club, cada una ve solo el suyo) ----------
create table if not exists libro_journal_personal (
  id uuid primary key default gen_random_uuid(),
  integrante_id uuid not null references perfiles(id) on delete cascade,
  titulo text not null,
  autor text,
  calificacion int check (calificacion between 1 and 5),
  comentario text,
  created_at timestamptz not null default now()
);

alter table if exists libro_journal_personal enable row level security;

drop policy if exists journal_select on libro_journal_personal;
create policy journal_select on libro_journal_personal for select
  using (integrante_id = auth.uid() or es_admin_global(auth.uid()));

drop policy if exists journal_insert on libro_journal_personal;
create policy journal_insert on libro_journal_personal for insert
  with check (integrante_id = auth.uid());

drop policy if exists journal_update on libro_journal_personal;
create policy journal_update on libro_journal_personal for update
  using (integrante_id = auth.uid());

drop policy if exists journal_delete on libro_journal_personal;
create policy journal_delete on libro_journal_personal for delete
  using (integrante_id = auth.uid() or es_admin_global(auth.uid()));
