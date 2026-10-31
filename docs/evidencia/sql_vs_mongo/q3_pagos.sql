-- Estudiantes activos por estado de pago
select estado_pago, count(*) as estudiantes
from estudiantes
where activo
group by estado_pago
order by estado_pago;
