# Contexto para Claude (traspaso de sesión)

Este archivo resume el proyecto hasta el 2026-11-13 para que otro Claude pueda
seguir trabajando sin redescubrirlo. Léelo junto con `README.md`, que es la
documentación completa para personas.

## Qué es el proyecto

**Academia GA · Gestor de Academia**: proyecto escolar (universitario) para una
academia formativa (deportes, música, danza). Tiene **dos páginas**:

- **Sitio público** (`index.html`): portada con la marca, catálogo de servicios
  con tarifas y formulario de contacto. Sin iniciar sesión.
- **Panel privado** (`admin.html`): login y 7 vistas (Dashboard, Estudiantes,
  Asistencia, Disciplinas, Servicios, Mensajes, Asistente).

Todo en español: código, comentarios, commits y textos.

- Repositorio: `xioveer/app-local` en GitHub. **Rama de trabajo: `main`.**
  (Existe `claude/epic-planck-7swzxk`, una rama antigua; no la uses.)
- Publicación: Vercel despliega solo en cada push a `main` (estático, sin build).
- Base de datos: Supabase (PostgreSQL), proyecto `pjmuykxnliqdnyrfcfzd`.
  **Ojo:** ese proyecto comparte espacio con otra aplicación de la misma persona
  (tablas `profiles`, `jobs`, `auth_otp_codes`, etc.). No las toques.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `index.html` + `sitio.js` | Sitio público. Lee disciplinas y servicios; inserta en `mensajes` **sin `.select()`** (el rol `anon` puede escribir pero no leer). |
| `admin.html` + `app.js` | Panel. Pantallas: login, «sin permiso» y aplicación. Secciones de `app.js`: configuración, utilidades, disciplinas, estudiantes, asistencia (puente con React), dashboard, navegación, inicio, autenticación, servicios, mensajes. |
| `asistencia-react.js` | Vista Asistencia en **React 18.3.1 + htm 3.1.1 por CDN** (sin JSX; React 19 ya no tiene build para `<script>`). |
| `asistente-ia.js` | Asistente: análisis local por reglas + preguntas a la Edge Function con respaldo local. |
| `conexion.js` | URL y clave **anon (pública)** de Supabase. Va en el repo a propósito. |
| `estilos.css` | Tailwind 3.4.17 **compilado**. Fuente: `estilos.entrada.css` + `tailwind.config.js`. |
| `supabase/schema.sql` | Las 6 tablas, restricciones, índices, `es_administrador()` y RLS. Deja la base **segura**. |
| `supabase/seed.sql` | Datos de prueba: 3 disciplinas, 10 estudiantes, 5 servicios. |
| `supabase/administrador.sql` | Autoriza una cuenta para entrar al panel. |
| `supabase/functions/asistente/index.ts` | Edge Function desplegada (Deno) que habla con la API de Anthropic. |
| `docs/analisis-tecnico-y-auditoria.md` | Auditoría de una versión anterior (cuando era solo el panel). |

Versiones de CDN fijadas (supabase-js 2.117.2, React 18.3.1, htm 3.1.1). No
subirlas sin motivo.

## Base de datos

Tablas: `disciplinas`, `estudiantes`, `asistencias`, `servicios`, `mensajes`,
`administradores`.

Permisos (ver `schema.sql`):

| Rol | Puede |
| --- | --- |
| `anon` | `select` en `disciplinas` y `servicios`; `insert` en `mensajes`. Nada más. |
| `authenticated` sin autorizar | Lo mismo que `anon`: las políticas exigen `es_administrador()`. |
| En `administradores` | Todo. |

- `es_administrador()` es `security definer` y mira si `auth.uid()` está en
  `administradores`. El panel la llama con `clienteSupabase.rpc("es_administrador")`.
- `administradores` **no tiene políticas**: solo se edita desde el SQL Editor.
- **Autenticar ≠ autorizar.** Es la idea central de la seguridad aquí, y existe
  porque el proyecto de Supabase tiene usuarios de otra aplicación.

## El asistente

Dos niveles, y conviene no confundirlos al explicarlo:

1. **Análisis local** (siempre funciona): reglas y estadística en el navegador.
   Puntaje de riesgo = faltas seguidas + asistencia baja + estado de pago. Cada
   conclusión guarda la regla que la produjo. **No es un modelo entrenado.**
2. **Modelo de lenguaje** (opcional): la Edge Function `asistente` llama a la API
   de Anthropic (`claude-haiku-5-5`) con la clave `ANTHROPIC_API_KEY` guardada
   como secreto en Supabase. Si no hay clave, devuelve `disponible: false` y el
   panel responde con el análisis local sin que se note.

Al modelo solo se le envían **cifras agrupadas**, nunca nombres ni teléfonos.
Mantén esa regla si tocas `resumenParaElModelo()`.

## Historial

1. Fases 1–5: esquema, layout, estudiantes (CRUD), asistencia con upsert, dashboard.
2. Login con Supabase Auth → luego se eliminó → **ahora está de vuelta**, con
   autorización por tabla y opción de Google.
3. Vista Asistencia reescrita en React (CDN) para comparar con vainilla.
4. Documento de análisis técnico y auditoría.
5. Arreglo de la app publicada (`config.js` ignorado no llegaba a Vercel) y
   rediseño completo de la interfaz.
6. Limpieza para producción: Prettier, Tailwind compilado, markdownlint.
7. **Arquitectura full-stack** (este cambio): sitio público con marca, catálogo y
   contacto; panel con login y autorización; vistas Servicios y Mensajes;
   asistente; base cerrada de verdad. Se eliminaron `modo_sin_login.sql` y
   `modo_con_login.sql`, que abrían la base a cualquiera.

## Seguridad (antes de tocar nada)

- La clave de `conexion.js` es la **anon/publishable**: pública por diseño. Lo que
  protege los datos es RLS.
- **Nunca** pongas `service_role`/`secret` en el código ni en GitHub.
- **Nunca** pongas una clave de API de un modelo en el navegador: va en el secreto
  de la Edge Function.
- No uses `innerHTML` ni `dangerouslySetInnerHTML`: el proyecto usa `textContent`,
  `<template>` y el escape de React a propósito.
- La base valida por su cuenta: edad 3–99, estado de pago válido, acudiente para
  menores, una asistencia por estudiante y día, longitudes en mensajes y servicios.
- Al insertar desde el sitio público no encadenes `.select()`: el rol `anon` no
  tiene permiso de lectura sobre `mensajes` y la petición fallaría.

## Cómo probar

- Local: `python -m http.server 5500` en la raíz, o Live Server de VS Code.
- Hay que tener una cuenta autorizada (`administrador.sql`) para ver el panel.
- Lista de comprobación manual: sección 5 y 8 del README.
- «No se pudo conectar con Supabase»: el proyecto gratuito se pausa; restaurarlo
  en el panel de Supabase.
- No hay pruebas automáticas en el repo (se usaron Playwright y una base simulada
  durante el desarrollo, fuera del repositorio).

## Pendientes

- Rol de profesor (solo asistencia), además del administrador único.
- Límite de envíos en el formulario de contacto (hoy solo limita la longitud).
- Aviso por correo cuando llega un mensaje.
- `integrity` (SRI) en los `<script>` de CDN.
- Paginación (Supabase devuelve máx. 1000 filas por consulta).
- La auditoría de `docs/` quedó desactualizada: describe la versión sin sitio público.

## Convenciones al trabajar aquí

- Escribe en **español** (código, comentarios, commits, documentación), con
  lenguaje sencillo: es un proyecto escolar y la autora lo tiene que poder explicar.
- Mantén el estilo: JavaScript vainilla salvo la vista Asistencia; sin frameworks
  ni pasos de compilación nuevos sin pedirlo.
- Tras cambiar clases de Tailwind, recompila `estilos.css` (`npm run css`) y súbelo.
  Revisa que `tailwind.config.js` incluya todos los archivos nuevos en `content`.
- Formatea con Prettier y deja el Markdown sin avisos de markdownlint.
- Mensajes de commit descriptivos en español, como los del historial.
- Si cambias comportamiento o seguridad, actualiza también `README.md`.
