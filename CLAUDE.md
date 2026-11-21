# Contexto para Claude (traspaso de sesión)

Este archivo resume el proyecto hasta el 2026-11-21 para que otro Claude pueda
seguir trabajando sin redescubrirlo. Léelo junto con `README.md`, que es la
documentación completa para personas.

## Qué es el proyecto

**Gestor de Academia**: proyecto escolar (universitario). Es una **herramienta
interna para profesores** de una academia formativa (deportes, música, danza):
cada profesor lleva sus estudiantes, el estado de sus pagos y la asistencia diaria.

**No es una página para ofrecer servicios ni captar clientes.** Hubo una versión
con sitio público (portada, catálogo de tarifas y formulario de contacto) y se
eliminó a petición de la autora. No vuelvas a añadir esa parte.

Una sola página (`index.html`) con login y seis vistas: **Dashboard**,
**Estudiantes**, **Asistencia**, **Historial**, **Disciplinas** y **Asistente**.

Todo en español: código, commits y textos. **El código no lleva comentarios**
(lo pidió la autora): se explica con buenos nombres y con el README.

- Repositorio: `xioveer/app-local` en GitHub.
- **Dos ramas con el mismo contenido:** `main` (la de trabajo) y
  `claude/epic-planck-7swzxk` (la que publica Vercel). **Sube a las dos**, o la
  página publicada se queda atrás.
- Base de datos: Supabase, proyecto **GESTOR-ACADEMIA** (`vvnvljhldxrcwaoadenm`).
  Es exclusivo de esta aplicación.

### Historia de la base de datos (importante)

Antes se usaba el proyecto `pjmuykxnliqdnyrfcfzd` (ACADEMY-PROYECT), pero ahí
vive también **EduInclusiva**, otra aplicación de la autora. La configuración de
Auth es **una sola por proyecto**, así que al entrar con Google se iba a la otra
aplicación. Por eso se creó un proyecto aparte. **No vuelvas a juntarlas.**
El proyecto viejo conserva sus tablas de la academia; no las toques.

## Archivos

| Ruta                                                                                     | Qué hace                                                                                                                         |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`                                                                             | Pantalla de login y aplicación con las 6 vistas y los `<template>` de filas y días. Carga `js/main.js` como módulo.              |
| `js/main.js`                                                                             | Arranque: crea el cliente, conecta eventos y vistas, revisa la sesión.                                                           |
| `js/config/`                                                                             | `conexion.js` (URL y clave **anon pública**, va en el repo a propósito) y `reglas.js` (constantes).                              |
| `js/auth/`                                                                               | `sesion.js` (getSession, onAuthStateChange), `login.js` (correo), `google.js` (OAuth con chequeo previo de `/auth/v1/settings`). |
| `js/datos/`                                                                              | Solo consultas a Supabase por tabla. Sin DOM.                                                                                    |
| `js/vistas/`                                                                             | Dibujan cada vista. `asistencia.js` es **React 18.3.1 + htm 3.1.1 por CDN** (sin JSX).                                           |
| `js/asistente/`                                                                          | `analisis.js` (cálculo puro), `hallazgos.js`, `respuestas.js` (preguntas y Edge Function), `vista.js`.                           |
| `js/historial/`                                                                          | `dias.js` (agrupa por día, valida el rango; puro), `hojas.js` (filas de Excel; puro), `vista.js`. Lee con paginación de 1000.    |
| `js/servicios/excel.js`                                                                  | Carga SheetJS 0.18.5 por CDN **solo al descargar**, con `integrity` (sha384), y escribe el `.xlsx`.                              |
| `js/ui/`, `js/utilidades/`                                                               | Avisos, cargando, confirmación, selects; fechas, formato, texto, errores.                                                        |
| `js/estado.js`, `js/dom.js`, `js/navegacion.js`, `js/pantallas.js`, `js/validaciones.js` | Estado compartido, referencias al DOM, cambio de vista, login/app y limpieza, validaciones.                                      |
| `estilos.css`                                                                            | Tailwind 3.4.17 **compilado**. Fuente: `estilos.entrada.css` + `tailwind.config.js`.                                             |
| `supabase/schema.sql`                                                                    | 3 tablas con `profesor_id`, restricciones, índices y RLS por dueño.                                                              |
| `supabase/seed.sql`                                                                      | Datos de prueba para una cuenta (cambiar el correo).                                                                             |
| `supabase/functions/asistente/index.ts`                                                  | Edge Function (Deno) que habla con la API de Anthropic.                                                                          |
| `docs/analisis-tecnico-y-auditoria.md`                                                   | Auditoría de una versión anterior; está desactualizada.                                                                          |

Módulos ES nativos, sin compilador: hace falta servir la carpeta (Live Server,
`python -m http.server`), no abrir el archivo con doble clic.

Versiones de CDN fijadas (supabase-js 2.117.2, React 18.3.1, htm 3.1.1,
SheetJS/xlsx 0.18.5). No subirlas sin motivo; si cambias SheetJS, recalcula su
`integrity`. Esa versión tiene fallos conocidos al **leer** archivos; aquí solo
se escriben, así que no aplican. El Excel no lleva teléfonos de acudientes.

## Base de datos y seguridad

Tablas: `disciplinas`, `estudiantes`, `asistencias`. Cada una tiene
`profesor_id uuid not null default auth.uid()`.

| Rol             | Puede                                                     |
| --------------- | --------------------------------------------------------- |
| `anon`          | **Nada.** Sin políticas y con acceso revocado.            |
| `authenticated` | Todo, pero **solo filas con `profesor_id = auth.uid()`**. |

- Cualquiera con Google puede registrarse: por eso los datos se separan por dueño.
- El frontend **nunca envía `profesor_id`**; lo pone la base.
- Las políticas `with check` impiden usar la disciplina o el estudiante de otro profesor.
- `disciplinas` es única por `(profesor_id, nombre)`.
- Ya **no existen** `administradores` ni `es_administrador()` (se quitaron en la
  migración `datos_por_profesor`, 2026-11-21; los datos previos quedaron a nombre
  de la primera cuenta).
- Google como proveedor se activa **a mano** en el panel de Supabase y en Google
  Cloud (ver README, paso 2). Ninguna herramienta de esta sesión podía hacerlo.

## El asistente

Dos niveles, y conviene no confundirlos al explicarlo:

1. **Análisis local** (siempre funciona): reglas y estadística en el navegador.
   Puntaje de riesgo = faltas seguidas + asistencia baja + estado de pago. Cada
   conclusión guarda la regla que la produjo. **No es un modelo entrenado.**
2. **Modelo de lenguaje** (opcional): la Edge Function `asistente` comprueba la
   sesión con `auth.getUser()` y llama a la API de Anthropic (`claude-haiku-5-5`)
   con la clave `ANTHROPIC_API_KEY` guardada como secreto en Supabase. Si no hay
   clave, devuelve `disponible: false` y la app responde con el análisis local.

Al modelo solo se le envían **cifras agrupadas**, nunca nombres ni teléfonos.
Mantén esa regla si tocas el resumen que se le envía.

**No hay precios ni importes en la aplicación.** El estado de pago es solo
`al_dia`, `pendiente` o `vencido`. No añadas tarifas sin que lo pidan.

## Historial

1. Fases 1–5: esquema, layout, estudiantes (CRUD), asistencia con upsert, dashboard.
2. Vista Asistencia reescrita en React (CDN) para comparar con vainilla.
3. Documento de análisis técnico y auditoría.
4. Se quitó el login y después se arregló la app publicada, con rediseño.
5. Limpieza para producción: Prettier, Tailwind compilado, markdownlint.
6. Arquitectura con sitio público, login y asistente.
7. Vuelta al objetivo real: sin parte pública, proyecto de Supabase propio,
   asistente sin dinero.
8. **Reorganización** (2026-11-21): `app.js` se dividió en módulos dentro de `js/`,
   sin comentarios; registro abierto con Google y datos separados por profesor;
   rediseño profesional de la interfaz y asistente más completo.
9. **Historial** (2026-11-21): vista con un apartado por día (vinieron / faltaron),
   filtros por fechas y disciplina, y descarga en Excel de un día o del rango.

## Seguridad (antes de tocar nada)

- La clave de `js/config/conexion.js` es la **anon/publishable**: pública por diseño.
- **Nunca** pongas `service_role`/`secret` en el código ni en GitHub.
- **Nunca** pongas una clave de API de un modelo en el navegador: va en el secreto
  de la Edge Function.
- No uses `innerHTML` ni `dangerouslySetInnerHTML`: el proyecto usa `textContent`,
  `<template>` y el escape de React a propósito.
- La base valida por su cuenta: edad 3–99, estado de pago válido, acudiente para
  menores de 18, una asistencia por estudiante y día.

## Cómo probar

- Local: `python -m http.server 5500` en la raíz, o Live Server de VS Code.
- Una cuenta nueva empieza vacía; para datos de prueba usa `seed.sql` con su correo.
- «No se pudo conectar con Supabase»: el proyecto gratuito se pausa; restaurarlo
  en el panel de Supabase.
- No hay pruebas automáticas en el repo (se usan Playwright y una base simulada
  fuera del repositorio).

## Pendientes

- Rol de director que vea a varios profesores.
- Límite de uso del asistente con modelo por cuenta (hoy solo limita el tamaño).
- Registro de pagos con importes y fechas, si lo piden.
- `integrity` (SRI) en los `<script>` fijos de CDN (SheetJS ya lo tiene).
- Paginación (Supabase devuelve máx. 1000 filas por consulta).
- La auditoría de `docs/` quedó desactualizada.

## Convenciones al trabajar aquí

- Escribe en **español**, con lenguaje sencillo: la autora lo tiene que poder explicar.
- **Sin comentarios en el código.** Lo que haga falta explicar va en el README.
- Una responsabilidad por archivo: `datos/` sin DOM, `vistas/` sin consultas directas.
- JavaScript vainilla salvo la vista Asistencia; sin frameworks ni pasos de
  compilación nuevos sin pedirlo.
- Tras cambiar clases de Tailwind, recompila `estilos.css` (`npm run css`) y súbelo.
- Formatea con Prettier, pero **no** le pases `package-lock.json` ni los `.json` de
  configuración.
- Mensajes de commit descriptivos en español, como los del historial.
- Si cambias comportamiento o seguridad, actualiza también `README.md`.
