-- =========================================================
-- FASE 7: Calificaciones con un decimal (4.1, 4.5, etc) en vez de solo enteras
-- Seguro de re-ejecutar. No borra nada.
-- =========================================================

alter table if exists resenas drop constraint if exists resenas_calificacion_check;
alter table if exists resenas alter column calificacion type numeric(2, 1);
alter table if exists resenas add constraint resenas_calificacion_check
  check (calificacion between 0.5 and 5);

alter table if exists libro_journal_personal drop constraint if exists libro_journal_personal_calificacion_check;
alter table if exists libro_journal_personal alter column calificacion type numeric(2, 1);
alter table if exists libro_journal_personal add constraint libro_journal_personal_calificacion_check
  check (calificacion between 0.5 and 5);

-- ---------- Índices para que las consultas más usadas sean más rápidas ----------
create index if not exists idx_avance_libro on avance_lectura (libro_id);
create index if not exists idx_avance_integrante on avance_lectura (integrante_id);
create index if not exists idx_resenas_libro on resenas (libro_id);
create index if not exists idx_teorias_libro on teorias (libro_id);
create index if not exists idx_movimientos_fecha on movimientos (fecha desc);
create index if not exists idx_eventos_fecha on eventos (fecha);
create index if not exists idx_permisos_integrante on permisos_modulo (integrante_id);
create index if not exists idx_journal_integrante on libro_journal_personal (integrante_id);
