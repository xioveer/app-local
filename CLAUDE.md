# Contexto para Claude (traspaso de sesión)

Este archivo resume el proyecto hasta el 2026-11-14 para que otro Claude pueda
seguir trabajando sin redescubrirlo. Léelo junto con `README.md`, que es la
documentación completa para personas.

## Qué es el proyecto

**Gestor de Academia**: proyecto escolar (universitario). Es una **herramienta
interna para un profesor** de una academia formativa (deportes, música, danza):
lleva sus estudiantes, el estado de sus pagos y la asistencia diaria.

**No es una página para ofrecer servicios ni captar clientes.** Hubo una versión
con sitio público (portada, catálogo de tarifas y formulario de contacto) y se
eliminó a petición de la autora: el objetivo es que los profesores lleven las
cuentas de sus estudiantes, no vender. No vuelvas a añadir esa parte.

Una sola página (`index.html`) con login y cinco vistas: **Dashboard**,
**Estudiantes**, **Asistencia**, **Disciplinas** y **Asistente**.

Todo en español: código, comentarios, commits y textos.

- Repositorio: `xioveer/app-local` en GitHub.
- **Dos ramas con el mismo contenido:** `main` (la de trabajo) y
  `claude/epic-planck-7swzxk` (la que publica Vercel). **Sube a las dos**, o la
  página publicada se queda atrás.
- Base de datos: Supabase, proyecto **GESTOR-ACADEMIA** (`vvnvljhldxrcwaoadenm`).
  Es exclusivo de esta aplicación.

### Historia de la base de datos (importante)

Antes se usaba el proyecto `pjmuykxnliqdnyrfcfzd` (ACADEMY-PROYECT), pero ahí
vive también **EduInclusiva**, otra aplicación de la autora (tablas `profiles`,
`jobs`, `accessibility_preferences`, `adaptation_history`, `auth_otp_codes`).
La configuración de Auth es **una sola por proyecto**, así que al entrar con
Google el Site URL de EduInclusiva se llevaba al usuario a la otra aplicación.
Por eso se creó un proyecto aparte. **No vuelvas a juntarlas.**
El proyecto viejo conserva sus tablas de la academia; no las toques.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `index.html` | Pantallas de login, «sin permiso» y aplicación, con las 5 vistas y el `<template>` de filas. |
| `app.js` | Lógica en JavaScript vainilla, por secciones: configuración, utilidades, disciplinas, estudiantes, asistencia (puente con React), dashboard, navegación, inicio, autenticación. |
| `asistencia-react.js` | Vista Asistencia en **React 18.3.1 + htm 3.1.1 por CDN** (sin JSX; React 19 ya no tiene build para `<script>`). |
| `asistente-ia.js` | Asistente: análisis local por reglas + preguntas a la Edge Function con respaldo local. |
| `conexion.js` | URL y clave **anon (pública)** de Supabase. Va en el repo a propósito. |
| `estilos.css` | Tailwind 3.4.17 **compilado**. Fuente: `estilos.entrada.css` + `tailwind.config.js`. |
| `supabase/schema.sql` | Las 4 tablas, restricciones, índices, `es_administrador()` y RLS. Deja la base **cerrada**. |
| `supabase/seed.sql` | Datos de prueba: 3 disciplinas, 10 estudiantes. |
| `supabase/administrador.sql` | Autoriza una cuenta para entrar. |
| `supabase/functions/asistente/index.ts` | Edge Function (Deno) que habla con la API de Anthropic. |
| `docs/analisis-tecnico-y-auditoria.md` | Auditoría de una versión anterior; está desactualizada. |

Versiones de CDN fijadas (supabase-js 2.117.2, React 18.3.1, htm 3.1.1). No
subirlas sin motivo.

## Base de datos

Tablas: `disciplinas`, `estudiantes`, `asistencias`, `administradores`.

| Rol | Puede |
| --- | --- |
| `anon` | **Nada.** No hay ninguna política para él y se le revocó el acceso. |
| `authenticated` sin autorizar | **Nada.** Las políticas exigen `es_administrador()`. |
| En `administradores` | Todo. |

- `es_administrador()` es `security definer` y mira si `auth.uid()` está en
  `administradores`. La app la llama con `clienteSupabase.rpc("es_administrador")`.
- `administradores` **no tiene políticas**: solo se edita desde el SQL Editor.
- **Autenticar ≠ autorizar.** Es la idea central de la seguridad aquí.

## El asistente

Dos niveles, y conviene no confundirlos al explicarlo:

1. **Análisis local** (siempre funciona): reglas y estadística en el navegador.
   Puntaje de riesgo = faltas seguidas + asistencia baja + estado de pago. Cada
   conclusión guarda la regla que la produjo. **No es un modelo entrenado.**
2. **Modelo de lenguaje** (opcional): la Edge Function `asistente` llama a la API
   de Anthropic (`claude-haiku-5-5`) con la clave `ANTHROPIC_API_KEY` guardada
   como secreto en Supabase. Si no hay clave, devuelve `disponible: false` y la
   app responde con el análisis local sin que se note.

Al modelo solo se le envían **cifras agrupadas**, nunca nombres ni teléfonos.
Mantén esa regla si tocas `resumenParaElModelo()`.

**No hay precios ni importes en la aplicación.** El estado de pago es solo
`al_dia`, `pendiente` o `vencido`. No añadas tarifas sin que lo pidan.

## Historial

1. Fases 1–5: esquema, layout, estudiantes (CRUD), asistencia con upsert, dashboard.
2. Vista Asistencia reescrita en React (CDN) para comparar con vainilla.
3. Documento de análisis técnico y auditoría.
4. Se quitó el login, y después se arregló la app publicada (`config.js` estaba
   ignorado y no llegaba a Vercel) con un rediseño completo de la interfaz.
5. Limpieza para producción: Prettier, Tailwind compilado, markdownlint.
6. Arquitectura con sitio público, login y asistente.
7. **Vuelta al objetivo real** (este cambio): se eliminó todo lo público (portada,
   servicios con tarifas, contacto y mensajes), se creó un proyecto de Supabase
   propio para separarla de EduInclusiva, y el asistente dejó de hablar de dinero.

## Seguridad (antes de tocar nada)

- La clave de `conexion.js` es la **anon/publishable**: pública por diseño. Lo que
  protege los datos es RLS.
- **Nunca** pongas `service_role`/`secret` en el código ni en GitHub.
- **Nunca** pongas una clave de API de un modelo en el navegador: va en el secreto
  de la Edge Function.
- No uses `innerHTML` ni `dangerouslySetInnerHTML`: el proyecto usa `textContent`,
  `<template>` y el escape de React a propósito.
- La base valida por su cuenta: edad 3–99, estado de pago válido, acudiente para
  menores de 18, una asistencia por estudiante y día.

## Cómo probar

- Local: `python -m http.server 5500` en la raíz, o Live Server de VS Code.
- Hace falta una cuenta autorizada (`administrador.sql`) para ver algo.
- Lista de comprobación manual: secciones 4 y 7 del README.
- «No se pudo conectar con Supabase»: el proyecto gratuito se pausa; restaurarlo
  en el panel de Supabase.
- No hay pruebas automáticas en el repo (se usaron Playwright y una base simulada
  durante el desarrollo, fuera del repositorio).

## Pendientes

- Rol de profesor frente a director (hoy quien entra puede hacer todo).
- Registro de pagos con importes y fechas, si lo piden.
- `integrity` (SRI) en los `<script>` de CDN.
- Paginación (Supabase devuelve máx. 1000 filas por consulta).
- La auditoría de `docs/` quedó desactualizada.

## Convenciones al trabajar aquí

- Escribe en **español** (código, comentarios, commits, documentación), con
  lenguaje sencillo: es un proyecto escolar y la autora lo tiene que poder explicar.
- Mantén el estilo: JavaScript vainilla salvo la vista Asistencia; sin frameworks
  ni pasos de compilación nuevos sin pedirlo.
- Tras cambiar clases de Tailwind, recompila `estilos.css` (`npm run css`) y súbelo.
- Formatea con Prettier, pero **no** le pases `package-lock.json` ni los `.json` de
  configuración: solo les cambia los finales de línea y ensucia el historial.
- Mensajes de commit descriptivos en español, como los del historial.
- Si cambias comportamiento o seguridad, actualiza también `README.md`.
