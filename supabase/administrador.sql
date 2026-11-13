-- =====================================================================
-- administrador.sql · Dar acceso al panel a una persona
-- =====================================================================
-- Sin esto nadie puede entrar al panel, ni siquiera iniciando sesión:
-- el correo y la contraseña solo identifican; esta tabla da el permiso.
--
-- PASOS:
--   1. Supabase → Authentication → Users → Add user → Create new user.
--      Escribe un correo y una contraseña y marca "Auto Confirm User".
--   2. Cambia el correo de abajo por ese mismo y ejecuta este archivo
--      en SQL Editor.
--
-- Para quitarle el acceso a alguien, borra su fila (última consulta).
-- =====================================================================

insert into public.administradores (usuario_id, nombre)
select id, 'Administrador de la academia'
from auth.users
where email = 'CAMBIA-ESTO@correo.com'
on conflict (usuario_id) do nothing;


-- ¿Quién tiene acceso hoy?
--   select u.email, a.nombre, a.creado_en
--   from public.administradores a
--   join auth.users u on u.id = a.usuario_id
--   order by a.creado_en;

-- Quitar el acceso (los datos de la academia no se tocan):
--   delete from public.administradores
--   where usuario_id = (select id from auth.users where email = 'CAMBIA-ESTO@correo.com');
