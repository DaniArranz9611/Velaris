-- =========================================================
-- FASE 4a: Agregar los valores nuevos a los enum (ejecutar PRIMERO, solo)
-- Postgres exige que esto se confirme antes de poder usarse en otras consultas.
-- =========================================================

alter type modulo_tipo add value if not exists 'encuestas';
alter type nivel_permiso add value if not exists 'ninguno';
