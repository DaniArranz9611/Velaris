-- =========================================================
-- FIX: recrear perfiles para cuentas que ya existían en auth.users
-- (el trigger solo crea perfil para gente NUEVA, no para las que
-- ya se habían registrado antes de correr el reset completo)
-- Este script NO borra nada, es seguro correrlo las veces que haga falta.
-- =========================================================

insert into perfiles (id, nombre)
select u.id, coalesce(split_part(u.email, '@', 1), 'Sin nombre')
from auth.users u
where u.id not in (select id from perfiles);

insert into permisos_modulo (integrante_id, modulo, nivel)
select u.id, m.modulo, 'ver'
from auth.users u
cross join (select unnest(enum_range(null::modulo_tipo)) as modulo) m
on conflict (integrante_id, modulo) do nothing;

-- Ahora sí, volvete admin global (reemplazá el email):
update perfiles set es_admin_global = true
where id = (select id from auth.users where email = 'TU_EMAIL_REAL@ejemplo.com');
