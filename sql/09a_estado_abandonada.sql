-- =========================================================
-- FASE 9: Opción "Lectura abandonada" para el libro del mes
-- Ejecutar solo, antes que cualquier otro cambio que use este valor.
-- =========================================================

alter type estado_lectura_personal add value if not exists 'abandonada';
