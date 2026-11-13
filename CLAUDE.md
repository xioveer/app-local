# Contexto para Claude (traspaso de sesión)

Este archivo resume todo lo hecho hasta el 2026-11-13 para que otro Claude
(por ejemplo Claude Code en el navegador, claude.ai/code) pueda seguir trabajando
sin tener que redescubrirlo. Léelo junto con `README.md`, que es la documentación
completa para personas.

## Qué es el proyecto

**Gestor de Academia**: proyecto escolar (universitario) para administrar una academia
formativa (deportes, música, danza…). Cuatro vistas: **Dashboard**, **Estudiantes**,
**Asistencia** y **Disciplinas**. Todo en español: código, comentarios, commits y textos.

- Repositorio: `xioveer/app-local` en GitHub. **Rama de trabajo: `main`.**
  (Existe también `claude/epic-planck-7swzxk`, una rama antigua; no la uses.)
- Publicación: Vercel despliega solo cada push a `main` (sitio estático, sin build).
- Base de datos: Supabase (PostgreSQL), proyecto `pjmuykxnliqdnyrfcfzd`.

## Stack y archivos

| Archivo | Qué hace |
| --- | --- |
| `index.html` | Página única con las 4 vistas, diálogo de confirmación y `<template>` de filas. |
| `app.js` | Lógica en JavaScript vainilla, por secciones: configuración, utilidades, disciplinas, estudiantes (CRUD, buscador, filtros, inactivos), asistencia (consulta/guardado con upsert + puente con React), dashboard, navegación, inicio. |
| `asistencia-react.js` | Vista Asistencia en **React 18.3.1 + htm 3.1.1 por CDN** (sin JSX ni compilador; React 19 ya no tiene build para `<script>`). |
| `conexion.js` | URL y clave **anon (pública)** de Supabase. Está en el repo a propósito (ver Seguridad). |
| `estilos.css` | Tailwind 3.4.17 **compilado**. Fuente: `estilos.entrada.css` + `tailwind.config.js`. Si añades clases: `npm install` y `npm run css`. |
| `supabase/schema.sql` | Tablas, restricciones, índices y RLS. Deja la base **cerrada**. |
| `supabase/seed.sql` | Datos de prueba: 3 disciplinas, 10 estudiantes ficticios. |
| `supabase/modo_sin_login.sql` | Abre la base al rol `anon` (la app lo necesita hoy). |
| `supabase/modo_con_login.sql` | Cierra la base de nuevo. |
| `docs/analisis-tecnico-y-auditoria.md` | Auditoría: seguridad, React vs vainilla, SQL vs MongoDB, con evidencia en `docs/evidencia/`. |
| `jsconfig.json`, `globales.d.ts`, `.prettierrc.json`, `.markdownlint.json`, `.vscode/` | Ajustes de editor y formato (Prettier, markdownlint). |

Supabase JS SDK **2.117.2** por CDN (jsDelivr). Versiones de CDN fijadas; no subirlas sin motivo.

## Historial (lo que se ha hecho, en orden)

1. **Fase 1** – esquema de base de datos y datos de prueba.
2. **Fase 2** – layout, navegación entre vistas y login con Supabase Auth.
3. **Fase 3** – estudiantes (CRUD), buscador, filtros, inactivos y disciplinas; la base exige acudiente (nombre y teléfono) a menores de 18.
4. **Fase 4** – asistencia rápida con fecha, interruptores y upsert; confirma antes de salir con cambios sin guardar.
5. **Fase 5** – dashboard: estudiantes, pagos y asistencia de hoy.
6. README completo y revisión de legibilidad.
7. **Modo sin inicio de sesión** como interruptor reversible (scripts SQL).
8. **Vista Asistencia reescrita en React** (CDN) para comparar con vainilla.
9. Corrección del doble envío con Enter en formularios.
10. **Documento de análisis técnico y auditoría** (seguridad y robustez, React vs vainilla con benchmarks, SQL vs MongoDB).
11. **Se eliminó el login**: la app abre directo en el Dashboard. El código con login sigue en el historial (commit `7faa2ad` en esta rama; en el README aparece como `4e7864b`, que es el mismo cambio en la rama antigua).
12. **Arreglo de la app publicada**: `config.js` estaba en `.gitignore` y no llegaba a Vercel (error `Cannot read properties of null (reading 'from')`). Se sustituyó por `conexion.js` versionado, pantalla de error si falta la conexión y **rediseño completo de la interfaz** (pestañas, marcador de asistencia, barra de pagos, iniciales, clases propias con `@apply`).
13. **Limpieza para producción** (commit `5304ce2`): Prettier, vista React ordenada, Tailwind CDN → `estilos.css` compilado, README y auditoría sin avisos de markdownlint, ajustes de editor.

## Seguridad (importante antes de tocar nada)

- La clave en `conexion.js` es la **anon/publishable**: es pública por diseño. Lo que protege los datos es RLS.
- Hoy `modo_sin_login.sql` deja leer/escribir las tres tablas al rol `anon` → **cualquiera con la URL puede cambiar los datos**. Es aceptable solo con los datos ficticios de `seed.sql`.
- **Nunca** pongas la clave `service_role`/`secret` en el código ni en GitHub.
- No uses `innerHTML` ni `dangerouslySetInnerHTML`: el proyecto usa `textContent`, `<template>` y el escape de React a propósito.
- La base valida por su cuenta: edad 3–99, estado de pago válido, acudiente para menores, una asistencia por estudiante y día.
- `docs/evidencia/seguridad/endurecimiento.sql` y `rls_por_rol.sql` son propuestas probadas **sin aplicar**.

## Cómo probar

- Local: `python -m http.server 5500` en la raíz y abrir `http://localhost:5500` (o Live Server de VS Code).
- Lista de comprobación manual: sección 5 del README.
- Si sale «No se pudo conectar con Supabase»: el proyecto gratuito se pausa; hay que restaurarlo en el panel de Supabase.
- No hay pruebas automáticas en el repo.

## Pendientes / mejoras posibles (README sección 10)

- Recuperar el inicio de sesión y luego roles (p. ej. profesores que solo toman asistencia).
- Añadir `integrity` (SRI) a los `<script>` de CDN.
- Paginación (Supabase devuelve máx. 1000 filas por consulta).
- Registro de cambios (quién cambió qué) y exportación de datos.
- Aplicar las propuestas de `docs/evidencia/seguridad/` si se cierra la base.

## Convenciones al trabajar aquí

- Escribe en **español** (código, comentarios, commits, documentación), con lenguaje sencillo: es un proyecto escolar y la autora lo tiene que poder explicar.
- Mantén el estilo: JavaScript vainilla salvo la vista Asistencia; sin frameworks ni build nuevos sin pedirlo.
- Tras cambiar clases de Tailwind, recompila `estilos.css` y súbelo.
- Formatea con Prettier (`.prettierrc.json`) y deja el Markdown sin avisos de markdownlint.
- Mensajes de commit descriptivos en español, como los del historial.
- Si cambias algo de comportamiento o seguridad, actualiza también `README.md`.
