# Gestor de Academia

Aplicación web para administrar una **academia formativa** de cualquier tipo: deportes, música, danza, artes, etc. Permite llevar el registro de estudiantes, el estado de sus pagos y la asistencia diaria, con un panel de resumen.

Es un proyecto escolar hecho con herramientas simples: **HTML, Tailwind CSS y JavaScript** en el navegador, y **Supabase** como base de datos. Casi todo está escrito en JavaScript "vainilla" (sin frameworks). La excepción es la **vista de Asistencia, hecha con React**, para ver en la práctica dónde ayuda un framework y dónde no hace falta (ver [sección 9.4](#94-dónde-usamos-react-y-qué-mejora)). Las librerías se cargan por CDN y los estilos de Tailwind ya vienen compilados en `estilos.css`, así que para **usar** la app no hace falta npm. Solo si cambias clases de Tailwind hay que regenerar `estilos.css` con `npm run css` (ver [sección 9.3](#93-cómo-está-hecho-el-diseño)).

> **Versión de demostración: no tiene inicio de sesión.** La aplicación abre directo y la base de datos acepta a cualquiera que tenga la dirección de la página. Sirve para mostrar el proyecto con **datos de prueba**; no es para guardar datos reales de personas. La [sección 6](#6-seguridad-qué-significa-no-tener-inicio-de-sesión) explica por qué y cómo cerrarla.

## Contenido

1. [Qué hace](#1-qué-hace)
2. [Tecnologías](#2-tecnologías)
3. [Estructura de archivos](#3-estructura-de-archivos)
4. [Cómo abrirla](#4-cómo-abrirla)
5. [Prueba rápida: ¿todo funciona?](#5-prueba-rápida-todo-funciona)
6. [Seguridad: qué significa no tener inicio de sesión](#6-seguridad-qué-significa-no-tener-inicio-de-sesión)
7. [Solución de problemas](#7-solución-de-problemas)
8. [Publicar en Internet](#8-publicar-en-internet)
9. [Cómo explicar el proyecto](#9-cómo-explicar-el-proyecto)
10. [Límites conocidos y mejoras posibles](#10-límites-conocidos-y-mejoras-posibles)

**Documento aparte:** [Análisis técnico y auditoría](docs/analisis-tecnico-y-auditoria.md) (seguridad y pruebas de robustez, React frente a JavaScript puro, SQL frente a MongoDB), con su evidencia en [`docs/evidencia/`](docs/evidencia/). Ese análisis se hizo cuando la aplicación todavía tenía inicio de sesión.

---

## 1. Qué hace

La aplicación tiene cuatro secciones, a las que se entra por las pestañas del encabezado:

| Sección | Qué permite hacer |
| --- | --- |
| **Dashboard** | Ver cómo va la asistencia de hoy (porcentaje, presentes, ausentes y cuántos faltan por registrar), cuántos estudiantes activos hay y cuántos están al día, pendientes o vencidos en pagos. Se actualiza cada vez que entras y tiene un botón **Actualizar**. |
| **Estudiantes** | Crear, editar y desactivar estudiantes. Buscar por nombre y filtrar por disciplina (se pueden combinar). Marcar **Mostrar inactivos** para ver a los desactivados y **reactivarlos**. Si el estudiante es menor de 18 años, el nombre y el teléfono del acudiente son obligatorios. |
| **Asistencia** | Elegir una fecha (hoy por defecto), marcar con un interruptor quién está presente o ausente y guardar. Se puede filtrar por disciplina; se guarda lo que se ve en la lista. Si ya había asistencia guardada ese día, se actualiza (no se duplica). |
| **Disciplinas** | Agregar disciplinas nuevas (fútbol, guitarra, danza, natación…). Cada estudiante pertenece a una. |

Otras características:

- **Cuidado con los datos:** los estudiantes no se borran (se desactivan), los formularios se validan antes de enviar, y la base de datos vuelve a validar los datos importantes.
- **Avisos claros:** los errores y confirmaciones aparecen como mensajes en pantalla (en español), nunca solo en la consola.
- **Si algo impide empezar** (no cargó la librería o faltan los datos de conexión), la aplicación muestra una pantalla que explica el problema en vez de quedarse en blanco.
- **Diseño responsive:** funciona en computador y en celular.

## 2. Tecnologías

| Tecnología | Para qué se usa | Cómo se carga |
| --- | --- | --- |
| HTML5 | Estructura de la página (una sola página con varias "vistas") | `index.html` |
| Tailwind CSS 3.4.17 | Estilos y diseño responsive | Compilado en `estilos.css` (fuente: `estilos.entrada.css` + `tailwind.config.js`) |
| Barlow y Barlow Condensed | Las letras de la aplicación | Google Fonts |
| JavaScript (vainilla) | Casi toda la lógica: DOM, `async/await`, validaciones | `app.js` |
| React 18.3.1 + ReactDOM | La vista de **Asistencia** (componentes y estado) | CDN (jsDelivr): `react@18.3.1` y `react-dom@18.3.1`, versión para `<script>` (sin compilar) |
| htm 3.1.1 | Permite escribir HTML dentro de JavaScript (parecido a JSX) sin compilador | CDN (jsDelivr): `htm@3.1.1` |
| Supabase (PostgreSQL) | Base de datos y reglas de acceso (RLS) | SDK `@supabase/supabase-js` **2.117.2** por CDN (jsDelivr) |
| Vercel | Publica la página en Internet a partir del repositorio de GitHub | — |
| Live Server (VS Code) | Servidor estático para abrir el proyecto en tu computador | Extensión de VS Code |

Se usa **React 18** porque React 19 ya no ofrece una versión para cargar con una etiqueta `<script>` (necesitaría npm y un compilador).

Requisito: un navegador actual (Chrome, Edge, Firefox, Brave o Safari recientes) y conexión a Internet, porque las librerías y la base de datos están en Internet.

## 3. Estructura de archivos

```text
app-local/
├── index.html            Estructura de la página: encabezado con pestañas, las 4 vistas, el diálogo
│                         de confirmación y la plantilla de filas. Arriba están los colores, las
│                         letras y las "clases propias" del diseño.
│                         La vista Asistencia es solo un "punto de montaje" para React.
├── app.js                La lógica de toda la aplicación, dividida en secciones comentadas:
│                         configuración, utilidades, disciplinas, estudiantes, asistencia
│                         (consultar/guardar y puente con React), dashboard, navegación e inicio.
├── asistencia-react.js   La vista de Asistencia hecha con React: sus componentes y su estado.
├── conexion.js           Dirección y clave PÚBLICA del proyecto de Supabase.
├── .gitignore            Archivos que git no sube.
├── README.md             Este archivo.
├── docs/
│   ├── analisis-tecnico-y-auditoria.md   Auditoría de seguridad, React frente a vainilla y SQL frente a MongoDB.
│   └── evidencia/        Resultados de las pruebas que respaldan el documento (más dos SQL propuestos).
└── supabase/
    ├── schema.sql          Crea las tablas, restricciones, índices y políticas de seguridad (RLS).
    │                       OJO: deja la base CERRADA (después hay que ejecutar modo_sin_login.sql).
    ├── seed.sql            Datos de prueba: 3 disciplinas y 10 estudiantes ficticios.
    ├── modo_sin_login.sql  ABRE la base al rol anónimo. La aplicación lo necesita para funcionar.
    └── modo_con_login.sql  CIERRA la base. Úsalo cuando termines la demostración.
```

## 4. Cómo abrirla

### Opción A. En Internet (ya publicada)

La rama del repositorio se publica sola en Vercel cada vez que se suben cambios a GitHub. Solo hay que abrir la dirección del proyecto en Vercel.

### Opción B. En tu computador

1. Descarga o clona el repositorio y abre la carpeta en **Visual Studio Code**.
2. Instala la extensión **Live Server**.
3. Clic derecho sobre `index.html` → **Open with Live Server**. Se abre el navegador (normalmente en `http://127.0.0.1:5500`) directo en el Dashboard.

No hay que crear ningún archivo: `conexion.js` ya viene en el repositorio con los datos del proyecto de Supabase.

Si no usas VS Code, también sirve cualquier servidor estático. Por ejemplo, con Python instalado, desde la carpeta del proyecto: `python -m http.server 5500` y abre `http://localhost:5500`.

> **Si la aplicación dice «No se pudo conectar con Supabase»:** los proyectos gratuitos de Supabase se **pausan** tras unos días sin uso. Entra a [supabase.com/dashboard](https://supabase.com/dashboard), abre el proyecto y pulsa **Restore project**. Conviene hacerlo uno o dos días antes de una exposición.

### Opción C. Usar tu propio proyecto de Supabase

Si quieres una base de datos tuya (por ejemplo, para que cada integrante practique sin pisar los datos de los demás):

1. Crea una cuenta gratuita en [supabase.com](https://supabase.com) y un proyecto nuevo (**New project**).
2. Ve a **SQL Editor → New query** y ejecuta, en este orden, pegando el contenido completo de cada archivo y pulsando **Run**:
   1. `supabase/schema.sql` (crea las tablas y las reglas; puede pedir confirmación por los `DROP`, es seguro),
   2. `supabase/seed.sql` (opcional: datos de prueba),
   3. `supabase/modo_sin_login.sql` (abre la base al rol anónimo; sin este paso la aplicación muestra *«La base de datos no permite el acceso»*).
3. En **Project Settings → API** copia la **Project URL** y la clave **anon / public**, y pégalas en `conexion.js`.

> **Nunca uses la clave `service_role` ni la `secret`.** Esas saltan todas las reglas de seguridad y jamás deben estar en el navegador ni en GitHub.

Los tres scripts se pueden ejecutar varias veces sin borrar datos. Recuerda que volver a ejecutar `schema.sql` deja la base cerrada: después hay que ejecutar otra vez `modo_sin_login.sql`.

## 5. Prueba rápida: ¿todo funciona?

Con los datos de `seed.sql` puedes recorrer esta lista. Cada paso dice qué debería pasar.

1. **Al abrir:** aparece directo el **Dashboard**, con el encabezado azul, la fecha de hoy y cuatro pestañas.
2. **Dashboard:** debe mostrar **9 estudiantes activos · 5 al día · 2 pendientes · 2 vencidos**. Como todavía no hay asistencia de hoy, el marcador dice *Aún no se ha tomado asistencia hoy*, *Sin registrar: 9* y ofrece el botón **Tomar asistencia**.
3. **Estudiantes:**
   - Escribe `sofia` en el buscador: debe aparecer *Sofía Martínez León* (no importan las tildes ni las mayúsculas).
   - Filtra por *Fútbol*: aparecen 4. Combina con el texto `sa`: aparecen Samuel y Santiago.
   - Marca **Mostrar inactivos**: aparece *Andrés Fuentes Mejía* en gris, con el botón **Reactivar**.
   - Crea un estudiante de 10 años sin acudiente: el formulario debe marcar el error. Con 18 años o más, el acudiente es opcional.
4. **Desactivar:** pulsa **Desactivar** en un estudiante. Pide confirmación y, al aceptar, desaparece de la lista (con *Mostrar inactivos* sigue ahí).
5. **Disciplinas:** agrega *Natación*. Intenta agregar *futbol*: debe rechazarlo por duplicada.
6. **Asistencia (por disciplina):** sigue estos pasos en orden y mira el Dashboard después de cada uno. Todos parten de "ninguna asistencia guardada hoy" (si ya probaste antes, mira la nota que sigue):

   | Paso | Qué haces en **Asistencia** | Qué debe decir el **Dashboard** |
   | --- | --- | --- |
   | a | Elige *Fútbol* (4 estudiantes), marca a **Samuel** como ausente y pulsa **Guardar asistencia** | Presentes 3 · Ausentes 1 · **75 %** · Sin registrar **5** |
   | b | Elige *Guitarra* (3 estudiantes), déjalos a todos presentes y guarda | Presentes 6 · Ausentes 1 · **85,7 %** · Sin registrar **2** |
   | c | Elige *Danza folclórica* (2 estudiantes), marca a **Laura** como ausente y guarda | Presentes 7 · Ausentes 2 · **77,8 %** · Sin registrar **0** |

   Fíjate en que "Sin registrar" **baja** a medida que guardas más disciplinas (9 → 5 → 2 → 0), porque cada una va quedando registrada. El porcentaje siempre se calcula sobre los registrados.

   > **Si ya tomaste asistencia hoy en pruebas anteriores**, los números serán distintos. Para empezar de cero, borra los registros de hoy en **SQL Editor** (cambia la fecha por la de hoy, en formato `AAAA-MM-DD`):
   >
   > ```sql
   > delete from public.asistencias where fecha = '2026-11-10';
   > ```
   >
   > Escribe la fecha a mano; no uses `current_date`, porque Supabase usa la hora UTC y de noche ya puede ser "mañana". También puedes hacer la prueba en otra fecha: el Dashboard solo cuenta *hoy*, pero la vista Asistencia permite elegir días anteriores.
7. **Guardar dos veces el mismo día:** cambia un interruptor y vuelve a guardar. En el **Table Editor** de Supabase, la tabla `asistencias` no debe duplicar filas (hay un solo registro por estudiante y día).
8. **Cambios sin guardar:** mueve un interruptor sin guardar y pulsa otra pestaña. Debe preguntar *¿Descartar cambios?*.

Para **volver a dejar los datos de prueba como al inicio** (borra todo, incluida la asistencia, y los vuelve a crear), ejecuta esto en el SQL Editor y después `seed.sql` otra vez:

```sql
truncate public.asistencias, public.estudiantes, public.disciplinas restart identity cascade;
```

## 6. Seguridad: qué significa no tener inicio de sesión

**La idea clave:** la *anon key* de `conexion.js` no es una contraseña secreta. Es una clave **pública**, hecha para ir dentro del navegador, y cualquiera que abra el código fuente de la página la puede ver. Por eso puede estar en GitHub y en Vercel. Lo que protege los datos **no es esconder la clave: es RLS** (*Row Level Security*), las reglas que viven dentro de la base de datos y que deciden qué puede hacer cada rol.

**Cómo está esta versión:**

- La aplicación no pide correo ni contraseña, así que todas sus peticiones llegan a Supabase con el rol `anon` (anónimo).
- Para que funcione, `modo_sin_login.sql` le da a ese rol permiso de leer y escribir en las tres tablas.
- Consecuencia: **cualquier persona que tenga la dirección de la página puede ver, cambiar y borrar los datos**, incluidos nombres, edades y teléfonos de acudientes.

Eso es aceptable para una demostración con los estudiantes ficticios de `seed.sql`. **No es aceptable para datos reales.**

| Clave | ¿Puede estar en el navegador? | Qué puede hacer |
| --- | --- | --- |
| `anon` / `publishable` | **Sí** (es pública) | Solo lo que permitan las políticas RLS. En esta versión, leer y escribir las tres tablas. |
| `service_role` / `secret` | **Jamás** | Todo: ignora RLS. |

**Cuando termines la demostración, cierra la base:** en el SQL Editor de Supabase ejecuta `supabase/modo_con_login.sql`. Los datos quedan guardados y protegidos; la aplicación dejará de mostrarlos y avisará *«La base de datos no permite el acceso»*. Para volver a abrirla, ejecuta `modo_sin_login.sql`.

**Para usarla con datos reales hace falta volver a poner el inicio de sesión.** La aplicación lo tuvo (con Supabase Auth: correo y contraseña, y la base cerrada para quien no entrara) y ese código sigue en el historial de git, en el commit `4e7864b`. La [auditoría](docs/analisis-tecnico-y-auditoria.md) describe ese diseño y qué más habría que reforzar.

**Lo que sí protege esta versión:**

- Los textos de los usuarios (nombres, categorías…) nunca se interpretan como HTML: en JavaScript vainilla se ponen con `textContent` y plantillas `<template>`, y React escapa por defecto todo lo que se escribe entre llaves (`${nombre}`). El código **no usa `innerHTML` ni `dangerouslySetInnerHTML`**, así que un nombre como `<img src=x onerror=...>` se ve como texto y no se ejecuta.
- La base de datos valida por su cuenta lo importante (edad entre 3 y 99, estado de pago válido, acudiente obligatorio para menores, una sola asistencia por estudiante y día), aunque alguien se salte el formulario.
- Las consultas van por el SDK de Supabase con valores separados del texto de la consulta, así que no hay inyección de SQL desde los formularios.

## 7. Solución de problemas

| Qué ves | Causa probable | Qué hacer |
| --- | --- | --- |
| Pantalla *«La aplicación no pudo empezar»* con *«Faltan los datos de conexión…»* | `conexion.js` no está junto a `index.html`, tiene otro nombre o los valores están vacíos | Revisa que el archivo exista y tenga `SUPABASE_URL` y `SUPABASE_ANON_KEY`. Si publicaste en Vercel, comprueba que esté subido a GitHub. |
| Pantalla *«La aplicación no pudo empezar»* con *«No se pudo cargar la librería de Supabase»* | Sin Internet, o la red (por ejemplo la del colegio) o un bloqueador bloquea `cdn.jsdelivr.net` | Revisa la conexión, desactiva el bloqueador o prueba con otra red. |
| La página se ve sin colores ni diseño | Falta `estilos.css` junto a `index.html` | Copia `estilos.css` al mismo sitio, o regenéralo con `npm install` y `npm run css`. |
| Las letras se ven distintas (más anchas) | No cargó Google Fonts | La aplicación funciona igual con la letra del sistema. |
| *«No se pudo conectar con Supabase…»* | Sin Internet, o el proyecto está **pausado** (los proyectos gratuitos se pausan tras unos días sin uso) | Entra a supabase.com y, si dice *Paused*, pulsa **Restore project**. Tarda uno o dos minutos. |
| *«La base de datos no permite el acceso…»* | La base está cerrada: no se ejecutó `modo_sin_login.sql`, o se volvió a ejecutar `schema.sql` o `modo_con_login.sql` | Ejecuta `supabase/modo_sin_login.sql` en el SQL Editor. |
| Al ejecutar `schema.sql`: `check constraint "estudiantes_acudiente_menores" … is violated by some row` | Ya hay menores guardados sin nombre o teléfono de acudiente | Encuéntralos con la consulta de abajo, corrígelos y ejecuta de nuevo. |
| Al abrir **Asistencia** sale *«No se pudo cargar React…»* | Sin Internet o la red bloquea `cdn.jsdelivr.net` (de ahí vienen React y `htm`) | Revisa la conexión o el bloqueador y recarga. El resto de la aplicación sigue funcionando. |
| *«Todavía no hay estudiantes»* | No se ejecutó `seed.sql` (o la lista está realmente vacía) | Ejecuta `seed.sql` o crea estudiantes desde la aplicación. |
| Un estudiante no aparece en **Asistencia** | Está inactivo, o hay un filtro de disciplina puesto | Revisa **Estudiantes → Mostrar inactivos** y el filtro. |
| El Dashboard dice *«Aún no se ha tomado asistencia hoy»* aunque guardaste | Guardaste otra fecha, o no pulsaste **Guardar asistencia** | En **Asistencia** comprueba la fecha: el Dashboard solo cuenta *hoy*. |
| La fecha de «hoy» no es la correcta | La aplicación usa el reloj y la zona horaria de **tu computador** | Revisa la fecha y la zona horaria del sistema. |
| Subí cambios a GitHub y la página publicada sigue igual | Vercel tarda cerca de un minuto en publicar, o el navegador guardó la versión anterior | Espera un momento y recarga sin caché (`Ctrl + F5`). |
| Una clase de Tailwind nueva no tiene efecto | `estilos.css` solo incluye las clases que ya se usaban al compilarlo | Ejecuta `npm run css` (o `npm run css:vigilar` mientras editas). |
| Al hacer `git pull` aparece un `config.js` viejo en tu carpeta | Era el archivo de conexión anterior; ya no se usa | Puedes borrarlo. La aplicación ahora lee `conexion.js`. |

Consulta para encontrar a los menores sin acudiente (se ejecuta en el SQL Editor):

```sql
select id, nombre_completo, edad from public.estudiantes
where edad < 18
  and (nullif(trim(acudiente_nombre), '') is null
       or nullif(trim(acudiente_telefono), '') is null);
```

## 8. Publicar en Internet

Como la aplicación es solo HTML, CSS y JavaScript, se puede publicar en cualquier hosting de archivos estáticos, sin servidor propio.

**Antes de publicar, recuerda la [sección 6](#6-seguridad-qué-significa-no-tener-inicio-de-sesión):** al no haber inicio de sesión, quien tenga la dirección puede cambiar los datos. Publica solo con datos de prueba.

### Vercel (la opción que usa este proyecto)

1. Entra a [vercel.com](https://vercel.com) con tu cuenta de GitHub y pulsa **Add New → Project**.
2. Elige el repositorio. No hay que configurar nada: no hay *build command* ni carpeta de salida (es un sitio estático con `index.html` en la raíz).
3. Pulsa **Deploy**. Vercel te da una dirección pública.

Desde ese momento, cada vez que se suben cambios a GitHub, Vercel vuelve a publicar solo. Como `conexion.js` está en el repositorio, llega también a Vercel (antes la página fallaba justo por eso: el archivo de conexión no se subía).

### GitHub Pages

1. En GitHub ve a **Settings → Pages**. En **Build and deployment** elige **Deploy from a branch**, selecciona la rama y la carpeta **/ (root)**, y pulsa **Save**. En las cuentas gratuitas el repositorio suele tener que ser **público**.
2. Espera uno o dos minutos. La dirección será `https://TU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/`.

## 9. Cómo explicar el proyecto

Esta sección está pensada para la exposición en el colegio.

### 9.1 La idea en una frase

> «Es una aplicación web para que una academia lleve a sus estudiantes, sus pagos y su asistencia, con una base de datos en Internet que valida los datos por su cuenta.»

### 9.2 Arquitectura: ¿quién habla con quién?

Hay tres piezas:

```text
 ┌───────────────────────────────┐
 │  1. NAVEGADOR (la persona)    │   index.html + app.js (+ Tailwind y React)
 │     ve pantallas, hace clic,  │   Aquí vive TODO el código que escribimos.
 │     escribe en formularios    │
 └───────────────┬───────────────┘
                 │  app.js llama funciones, por ejemplo:
                 │  clienteSupabase.from("estudiantes").select(...)
                 ▼
 ┌───────────────────────────────┐
 │  2. SDK DE SUPABASE           │   supabase-js: una librería ya hecha.
 │     arma la petición          │   Nos evita escribir a mano las peticiones
 │                               │   a Internet.
 └───────────────┬───────────────┘
                 │  petición segura (HTTPS) con la anon key
                 ▼
 ┌───────────────────────────────┐
 │  3. SUPABASE (en Internet)    │
 │     Base de datos PostgreSQL  │
 │     · RLS: ¿este rol puede    │   ← el "portero"
 │       hacer esto?             │
 │     · CHECK / UNIQUE / FK:    │   ← el "inspector de datos"
 │       ¿los datos son válidos? │
 └───────────────────────────────┘
```

En palabras sencillas:

- **El navegador** es la cara de la aplicación: dibuja las pantallas y reacciona a lo que hace la persona. No guarda nada importante. Casi todo lo dibuja JavaScript vainilla; la vista de Asistencia la dibuja **React**.
- **El SDK** es el "mensajero": lleva y trae mensajes entre el navegador y Supabase.
- **Supabase** es el "archivo con guardia": guarda los datos, decide qué puede hacer cada rol y rechaza los datos que no cumplen las reglas, aunque alguien se salte nuestra página.

#### Ejemplo del flujo de datos: guardar la asistencia

1. La persona mueve los interruptores. El componente de React anota las marcas en su **estado** (`anotarMarca`) y vuelve a dibujar el resumen y las etiquetas; todavía no se envía nada.
2. Pulsa **Guardar asistencia**. La función `guardar` del componente arma una lista de registros: `{ estudiante_id, fecha, asistio }`, uno por estudiante de la lista.
3. `guardarRegistrosDeAsistencia` (en `app.js`) hace `clienteSupabase.from("asistencias").upsert(...)`: entrega la lista al SDK, que la envía por Internet.
4. Supabase revisa: *¿RLS lo permite?* Después, por cada registro, mira la regla `UNIQUE (estudiante_id, fecha)`: si ese estudiante ya tenía registro ese día, lo **actualiza**; si no, lo **crea**.
5. Si todo sale bien, la aplicación muestra un aviso verde y vuelve a leer lo guardado (`cargarFecha`, que usa `consultarAsistenciaDeUnaFecha`). Si algo falla, `describirError` lo traduce a español y se muestra un aviso rojo.

#### Dónde está cada cosa en `app.js` y `asistencia-react.js`

| Sección | Qué contiene | Funciones de ejemplo |
| --- | --- | --- |
| 1. Configuración | El cliente de Supabase, la memoria de la app (`estado`) y las referencias a elementos del HTML | `crearClienteSupabase`, `guardarReferenciasDelDOM` |
| 2. Utilidades | Avisos, indicador de "cargando", traducción de errores, diálogo de confirmación, iniciales | `mostrarAviso`, `describirError`, `pedirConfirmacion`, `obtenerIniciales` |
| 3. Disciplinas | Listar y agregar disciplinas | `cargarDisciplinas`, `agregarDisciplina` |
| 4. Estudiantes | Tabla, buscador, filtros, formulario con validación, desactivar y reactivar | `cargarEstudiantes`, `validarEstudiante`, `guardarEstudiante` |
| 5. Asistencia | Consultar y guardar (upsert) la asistencia, y el «puente» con la vista hecha en React | `consultarAsistenciaDeUnaFecha`, `guardarRegistrosDeAsistencia`, `abrirVistaAsistencia` |
| 6. Dashboard | Cálculo y dibujo de las métricas | `calcularMetricasDelDashboard`, `dibujarBarraDePagos`, `cargarDashboard` |
| 7. Navegación | Mostrar una vista y ocultar las demás | `mostrarVista`, `navegarAVista` |
| 8. Inicio | Revisar que todo esté listo, conectar eventos y arrancar | `iniciarAplicacion`, `mostrarProblemaDeInicio`, `conectarEventos` |
| `asistencia-react.js` | La pantalla de Asistencia: componentes de React y su estado | `FilaDeAsistencia`, `VistaDeAsistencia`, `window.VistaAsistencia` |

### 9.3 Cómo está hecho el diseño

Todo el diseño está en la parte de arriba de `index.html`, en tres bloques cortos:

1. **Las letras.** Dos familias de Google Fonts: *Barlow* para los textos y *Barlow Condensed* (más angosta, como los números de una camiseta o de un marcador) para títulos y cifras.
2. **Los colores y las letras como clases de Tailwind.** El archivo `tailwind.config.js` les pone nombre, y a partir de ahí existen clases como `bg-tinta`, `text-sol` o `font-titulo`:

   | Nombre | Color | Dónde se usa |
   | --- | --- | --- |
   | `tinta` | Azul oscuro `#0C1F4A` | Encabezado, títulos, botones principales y el marcador de asistencia |
   | `sol` | Amarillo `#FFC629` | El color que resalta: el escudo, el porcentaje del marcador y los botones sobre fondo azul |
   | `papel` | Gris muy claro `#F1F4F9` | El fondo de la página |

   Los estados usan los colores de Tailwind: verde (al día, presente), naranja (pendiente, sin registrar) y rojo (vencido, ausente, errores). Cada estado lleva siempre su texto, no depende solo del color.
3. **Las clases propias.** En `estilos.entrada.css` se definen nombres cortos que juntan varias clases de Tailwind con `@apply`: `tarjeta`, `boton` (+ `boton-principal`, `boton-secundario`, `boton-sol`, `boton-peligro`, `boton-chico`), `campo`, `etiqueta`, `chip`, `iniciales`, `pestana`, `celda`, `vacio`. Así un botón se escribe `class="boton boton-principal"` en vez de repetir quince clases cada vez, y si se cambia el estilo en un sitio cambia en toda la aplicación.

Ideas del diseño que se pueden contar en la exposición:

- **Pestañas de carpeta:** la pestaña de la vista actual tiene el mismo color que la página, como el separador de una carpeta.
- **Marcador de asistencia:** la asistencia de hoy es lo primero que se ve, en un panel azul con el porcentaje grande en amarillo, como el marcador de un partido.
- **Iniciales:** cada estudiante lleva un círculo con sus iniciales, como el número de una camiseta.
- **Barra de pagos:** una sola barra repartida en tres tramos muestra de un vistazo cuántos están al día, pendientes y vencidos.

### 9.4 Dónde usamos React y qué mejora

**Dónde:** solo en la vista **Asistencia** (archivo `asistencia-react.js`). El resto de la aplicación sigue en JavaScript vainilla, a propósito: así se pueden comparar los dos estilos en el mismo proyecto.

**Por qué justo ahí:** Asistencia es la parte donde más cosas cambian a la vez. Al mover un solo interruptor hay que actualizar la marca en memoria, el texto «Presente/Ausente» (y su color), el resumen de presentes y ausentes y el aviso «Cambios sin guardar»; y si se cambia de fecha o de disciplina, toda la lista. Ese es justo el tipo de problema para el que se creó React.

**El problema de antes (vainilla):** cada evento tenía que acordarse de actualizar a mano todas esas cosas. Al mover un interruptor, por ejemplo (código simplificado):

```js
estado.marcasDeAsistencia[id] = interruptor.checked;      // 1. anotar el dato
estado.asistenciaModificada = true;                       // 2. anotar que hay cambios
pintarEstadoDelInterruptor(fila, interruptor.checked);    // 3. cambiar el texto y el color de ESA fila
actualizarResumenDeAsistencia();                          // 4. recalcular el resumen y el aviso
```

Si se olvidaba uno de los pasos, la pantalla quedaba contradiciendo a los datos: errores fáciles de cometer y difíciles de ver.

**La idea de React:** en lugar de decir *cómo cambiar* la pantalla, se describe *cómo se ve* para unos datos y React se ocupa de actualizarla. Ahora, al mover el interruptor solo se anota el dato:

```js
setMarcas((marcasActuales) => ({ ...marcasActuales, [idEstudiante]: presente }));
setModificada(true);
```

y el texto, el color, el resumen y el aviso se **calculan** en cada dibujo a partir del estado:

```js
const presentes = visibles.filter((estudiante) => marcas[estudiante.id]).length;
const ausentes = visibles.length - presentes;
// y dentro de cada fila:  ${presente ? "Presente" : "Ausente"}
```

**Cómo está armado:**

- **2 componentes:** `FilaDeAsistencia` (una fila: nombre e interruptor) y `VistaDeAsistencia` (fecha, filtro, lista, resumen y botón).
- **9 variables de estado** (`useState`): la fecha cargada, lo escrito en el campo de fecha, las disciplinas, el filtro, los estudiantes, la asistencia ya guardada, las marcas, si ya cargó y si hay cambios sin guardar.
- **2 efectos** (`useEffect`): uno carga los datos cuando la vista aparece y otro le avisa al resto de la aplicación si hay cambios sin guardar.
- Las consultas a Supabase **no** están en el componente: se quedaron en `app.js` (`consultarAsistenciaDeUnaFecha` y `guardarRegistrosDeAsistencia`). React solo se ocupa de la pantalla.

**Qué mejoró (cifras medidas cuando se pasó esta vista a React):**

| | Antes (vainilla) | Después (React) |
| --- | --- | --- |
| Funciones cuyo único trabajo era mantener la pantalla igual a los datos | 5 (`pintarEstadoDelInterruptor`, `crearFilaDeAsistencia`, `actualizarResumenDeAsistencia`, `dibujarListaDeAsistencia`, `limpiarAsistenciaEnPantalla`) | 0: lo hace React |
| Cambios hechos a mano sobre la pantalla dentro de la vista (`textContent =`, `className =`, `checked =`, `value =`, `classList`) | 16 | 0 |
| Datos de la asistencia en la variable compartida `estado` (cualquier parte del programa podía cambiarlos) | 40 usos | 0: viven dentro del componente |
| Al cancelar un cambio de disciplina | Había que devolver el selector a su valor con una línea de código | El selector se queda solo en su valor: el estado no cambió |

**Lo que NO mejoró (y lo que costó):**

- **No es menos código.** El componente ocupa más líneas que las funciones que reemplazó (una parte es que el HTML de la vista ahora vive dentro del componente).
- **Pesa más al cargar.** React, ReactDOM y `htm` suman unos 47 KB comprimidos (el SDK de Supabase pesa unos 54 KB).
- **Hay dos estilos en el mismo proyecto,** y las dos partes se hablan por un «puente» de 2 funciones. Además hubo que usar `flushSync` para que la lista ya esté dibujada cuando desaparece el indicador de «cargando» (que no es de React).
- **Más cosas que aprender** (componente, estado, efecto) y **una dependencia más que puede fallar:** si el CDN de React no carga, la vista Asistencia no funciona (la aplicación lo avisa y el resto sigue).
- **Sin compilador no hay JSX.** Se usa `htm`, que es lo más parecido.

**¿Valió la pena?** Para esta vista, sí: es donde el estado cambia en muchos sitios a la vez. Para el resto (la tabla de estudiantes, el Dashboard, las disciplinas) el JavaScript vainilla alcanza y es más simple: usar React en todo sería agregar peso y complejidad sin una mejora clara. Si el proyecto creciera, los candidatos serían el formulario de estudiantes (muchas validaciones que dependen unas de otras) y la tabla con sus filtros.

**Cómo se conectan las dos partes:** `app.js` abre la vista con `abrirVistaAsistencia()`, que llama a `window.VistaAsistencia.abrir()`, y pregunta con `tieneCambiosSinGuardar()` antes de cambiar de pestaña. A su vez, el componente usa funciones de `app.js` (consultar, guardar, avisos, confirmación, iniciales).

### 9.5 Glosario corto

| Término | Qué significa | Dónde se ve en el proyecto |
| --- | --- | --- |
| **SPA** (*Single Page Application*) | Una aplicación de **una sola página**: no se recarga al cambiar de sección. JavaScript muestra unas secciones y oculta otras. | `index.html` tiene las 4 vistas; `mostrarVista` las muestra u oculta |
| **DOM** | La versión de la página HTML como un "árbol de objetos" que JavaScript puede leer y cambiar. | `document.getElementById(...)`, `textContent`, `classList` |
| **async / await** | Forma de **esperar** algo lento (como una respuesta de Internet) sin congelar la página. `await` pausa solo esa función hasta que llega la respuesta. | Casi todas las funciones que hablan con Supabase: `async function cargarEstudiantes()` |
| **CRUD** | Las cuatro operaciones básicas con datos: **C**rear, **L**eer (*Read*), **A**ctualizar (*Update*) y **B**orrar (*Delete*). | Estudiantes: `insert`, `select`, `update`, y desactivar en lugar de borrar |
| **Upsert** | *Update + insert*: «si ya existe, actualiza; si no existe, crea». | Guardar asistencia: `.upsert(registros, { onConflict: "estudiante_id,fecha" })` |
| **RLS** (*Row Level Security*) | Reglas **dentro de la base de datos** que dicen qué puede ver o cambiar cada rol. Si está activada y no hay regla para un rol, ese rol no puede nada. Es el "portero". | `schema.sql`: `enable row level security` y las políticas |
| **Rol anónimo** (`anon`) | El "usuario" con el que la base de datos trata a quien no ha iniciado sesión. En esta versión es el único rol que usa la aplicación. | `modo_sin_login.sql` le da permisos; `modo_con_login.sql` se los quita |
| **Borrado lógico** | En vez de borrar una fila, se la **marca** como inactiva (`activo = false`). Es como mandar algo a la papelera: se conserva el historial y se puede recuperar. | **Desactivar** y **Reactivar** estudiantes |
| **CHECK** | Una regla de PostgreSQL que **rechaza** filas que no la cumplan. | `edad between 3 and 99`; los menores de 18 deben tener acudiente |
| **Validación en dos capas** | Revisar los datos **dos veces**: primero en el formulario (rápido, con mensajes amables) y otra vez en la base de datos (la última palabra, que nadie puede saltarse). | `validarEstudiante` en `app.js` + `CHECK` en `schema.sql` |
| **SDK** | Una librería con funciones ya hechas para usar un servicio. | `supabase-js`, que cargamos por CDN |
| **CDN** | Un servidor en Internet que entrega librerías por una URL. | `supabase-js`, React y `htm` en `index.html` |
| **`@apply`** | Instrucción de Tailwind para crear una clase propia que junta varias clases suyas. | Las clases `boton`, `campo`, `tarjeta`… en `estilos.entrada.css` |
| **React** | Una librería para construir pantallas. En vez de decir *cómo cambiar* la pantalla paso a paso, se describe *cómo se ve* para unos datos, y React la actualiza sola. | La vista de Asistencia (`asistencia-react.js`) |
| **Componente** | Una función de React que devuelve un trozo de pantalla. Se pueden reutilizar y combinar, como piezas de Lego. | `FilaDeAsistencia` (una fila) dentro de `VistaDeAsistencia` (toda la vista) |
| **Estado** (*state*) | Los datos que, cuando cambian, hacen que React vuelva a dibujar el componente. | `const [marcas, setMarcas] = useState({})` |
| **Hook** | Una función de React (su nombre empieza con `use`) que da poderes a un componente: `useState` le da memoria y `useEffect` le permite hacer algo cuando aparece o desaparece. | `useState`, `useEffect` en `asistencia-react.js` |

### 9.6 Guion de demostración (unos 5 minutos)

**Antes de empezar (preparación):** uno o dos días antes, abre la aplicación para comprobar que el proyecto de Supabase no esté pausado; ejecuta `seed.sql` con datos limpios y borra la asistencia de hoy (ver [sección 5](#5-prueba-rápida-todo-funciona)); ten abierto el **Table Editor** de Supabase en otra pestaña; sube el zoom del navegador (125 %) para que se lea desde atrás. Si no hay Internet, ten capturas de pantalla de respaldo.

| Tiempo | Vista | Qué mostrar | Qué decir |
| --- | --- | --- | --- |
| 0:00 – 0:30 | — | Presenta el proyecto. | «Es una aplicación para administrar academias: estudiantes, pagos y asistencia. Usa HTML, Tailwind, JavaScript y Supabase, y la vista de asistencia está hecha con React.» |
| 0:30 – 1:15 | **Dashboard** | Señala el marcador (*Aún no se ha tomado asistencia hoy*), los 9 activos y la barra de pagos. | «Estas cifras se calculan con datos reales de la base y se actualizan cada vez que entro. Todavía no hay asistencia hoy, por eso no hay porcentaje.» |
| 1:15 – 2:30 | **Estudiantes** | Busca `sofia`. Filtra por Fútbol. Crea un estudiante de 10 años sin acudiente (sale el error) y luego con acudiente. Desactiva uno, marca **Mostrar inactivos** y reactívalo. | «El buscador no distingue tildes. El acudiente es obligatorio solo para menores de 18, y esa regla también está en la base de datos. No borramos estudiantes: los desactivamos, para no perder su historial.» |
| 2:30 – 2:50 | **Disciplinas** | Agrega *Natación*. Intenta *futbol* (la rechaza). | «Cada estudiante pertenece a una disciplina. No permite repetidas aunque cambien las tildes o las mayúsculas.» |
| 2:50 – 4:10 | **Asistencia** | Filtra por Fútbol, marca un ausente y guarda. Mueve otro interruptor y cambia la fecha (sale *¿Descartar cambios?*); cancela. Guarda de nuevo y muestra en Supabase que no se duplican filas. | «Esta vista está hecha con React: el resumen y las etiquetas se calculan solos a partir de las marcas. Guardar usa *upsert*: si ya existe el registro de ese estudiante ese día, lo actualiza; si no, lo crea. La base impide duplicados con una regla UNIQUE.» |
| 4:10 – 5:00 | **Dashboard** | Vuelve al Dashboard: aparece el porcentaje y "Sin registrar". Cierra hablando de seguridad. | «El porcentaje es de presentes sobre los registrados. Esta versión no tiene inicio de sesión porque es una demostración con datos de prueba; para usarla de verdad habría que volver a ponerlo.» |

### 9.7 Preguntas que podría hacer un profesor

**1. La *anon key* está en el código y cualquiera puede verla. ¿No es peligroso?**
No es una clave secreta: está pensada para ir en el navegador. Lo que decide qué se puede hacer con ella son las reglas de la base de datos (RLS). Lo peligroso sería poner la clave `service_role`, que se salta RLS, y eso nunca lo hacemos.

**2. ¿Por qué no tiene inicio de sesión? ¿Es seguro así?**
Es una versión de demostración. Sin inicio de sesión, la base de datos tiene que aceptar al rol anónimo, así que cualquiera con la dirección puede ver y cambiar los datos: por eso solo usamos estudiantes ficticios. La aplicación tuvo inicio de sesión con Supabase Auth y la base cerrada; para usarla con datos reales habría que volver a esa versión y cerrar la base con `modo_con_login.sql`.

**3. ¿Por qué «desactivan» a los estudiantes en vez de borrarlos?**
Por el **borrado lógico**: si borráramos la fila, también se borraría su historial de asistencia (la tabla de asistencias está ligada con `ON DELETE CASCADE`). Con `activo = false` el estudiante deja de aparecer, pero se conserva todo y se puede reactivar.

**4. ¿Qué es un upsert y por qué lo usaron en la asistencia?**
Es «actualizar si existe, crear si no». La asistencia tiene una regla `UNIQUE (estudiante_id, fecha)`: solo puede haber un registro por estudiante y día. Gracias al upsert, el docente puede guardar varias veces el mismo día sin que aparezcan filas repetidas ni errores.

**5. ¿Por qué validan en el formulario y también en la base de datos?**
Son dos capas con trabajos distintos. El formulario es rápido y da mensajes claros, pero se puede saltar (por ejemplo, con las herramientas del navegador). La base de datos, con `CHECK`, `UNIQUE` y claves foráneas, tiene la última palabra y no se puede saltar. Así los datos importantes, como «los menores necesitan acudiente», están protegidos siempre.

**6. ¿Para qué sirven `async` y `await`? ¿Qué pasaría sin ellos?**
Pedir datos a Internet tarda. Con `await`, la función espera la respuesta sin congelar la página (se ve el indicador de «cargando»). Sin ellos, el código seguiría de largo antes de tener los datos y mostraría la pantalla vacía o con errores.

**7. ¿Cómo evitan que alguien escriba código malicioso en un nombre (XSS)?**
Todo texto que viene de los usuarios se pone con `textContent`, que nunca interpreta HTML; las filas de estudiantes se crean a partir de una plantilla `<template>` y React escapa lo que dibuja. El código no usa `innerHTML`. Si alguien escribe `<img src=x onerror=...>` como nombre, se ve literalmente como texto.

**8. ¿Cómo se calcula el porcentaje del Dashboard y por qué «sobre los registrados»?**
Es `presentes ÷ (presentes + ausentes)`, contando solo lo guardado hoy para estudiantes activos. Se calcula sobre los registrados para no castigar a quien aún no tomó la asistencia; aparte se muestra cuántos están «Sin registrar». Si nadie tiene registro, no hay porcentaje: el Dashboard dice *Aún no se ha tomado asistencia hoy*.

**9. ¿Qué pasa si se cae Internet mientras guardan?**
Todas las operaciones usan `try/catch`: si falla, aparece un aviso rojo en español y no se pierde lo escrito (el formulario y los interruptores se quedan como están, para reintentar).

**10. ¿Cómo saben cuál es la fecha de «hoy»? ¿Y si es de noche?**
Usamos la fecha y la zona horaria del navegador (`new Date()`), no la de UTC. Si usáramos UTC, en Colombia a partir de las 7:00 p. m. ya sería «mañana» y la asistencia se guardaría en el día equivocado. Además, no se permite guardar asistencia de fechas futuras.

**11. ¿Por qué usaron React solo en una vista y no en todo el proyecto?**
Porque ahí es donde más ayuda: en Asistencia cambian muchas cosas a la vez al mover un interruptor (la marca, el texto, el color, el resumen, el aviso de «sin guardar»), y React las mantiene sincronizadas solo. En la tabla o el Dashboard el JavaScript vainilla alcanza y es más simple; usar React en todo habría agregado peso (unos 47 KB) y conceptos nuevos sin una mejora clara. Además, React puede encargarse de un solo rincón de la página (un `<div id="raiz-asistencia">`), así que se puede mezclar con el resto.

**12. ¿Cómo hicieron el diseño sin escribir un archivo CSS?**
Con Tailwind: los estilos se escriben como clases en el HTML. Para no repetir listas largas, definimos unas pocas clases propias con `@apply` (`boton`, `campo`, `tarjeta`…) y tres colores con nombre (`tinta`, `sol`, `papel`). Está explicado en la [sección 9.3](#93-cómo-está-hecho-el-diseño).

## 10. Límites conocidos y mejoras posibles

Para ser honestos sobre lo que el proyecto **no** hace (sirve como lista de mejoras):

- **No tiene inicio de sesión.** La base queda abierta al rol anónimo: es una demostración, no una versión para datos reales (ver [sección 6](#6-seguridad-qué-significa-no-tener-inicio-de-sesión)). La primera mejora sería recuperar el inicio de sesión y, después, tener roles (por ejemplo, profesores que solo toman asistencia).
- **Máximo 1000 filas por consulta.** Supabase limita lo que devuelve cada consulta. Para una academia es suficiente; para más habría que paginar.
- **Tailwind compilado.** `estilos.css` se genera con `npm run css` a partir de `estilos.entrada.css` y `tailwind.config.js`, con la versión fija 3.4.17. Si se añaden clases nuevas en `index.html` o en los `.js`, hay que volver a compilarlo.
- **Los scripts de CDN no usan *Subresource Integrity*.** Las versiones de Supabase (2.117.2), React (18.3.1) y `htm` (3.1.1) están fijas, pero no se comprueba un *hash* de cada archivo. Una mejora de seguridad sería agregar el atributo `integrity` en cada etiqueta `<script>`.
- **Dos estilos de código.** La vista de Asistencia usa React y el resto JavaScript vainilla, conectados por un pequeño «puente». Es útil para aprender y comparar, pero en un proyecto real se suele elegir uno solo (o pasar todo a React con un compilador).
- **React 18 por CDN y sin JSX.** React 19 ya no se ofrece para cargar con `<script>`, y sin compilador se usa `htm` en vez de JSX.
- **El proyecto gratuito de Supabase se pausa** tras unos días sin uso y hay que reactivarlo a mano.
- **No hay pruebas automáticas en el repositorio.** Durante el desarrollo se usaron pruebas automáticas en el navegador (con una base de datos simulada), pero necesitan herramientas (Node y Playwright) que no forman parte del proyecto. Quien clone el repositorio verifica con la lista de la [sección 5](#5-prueba-rápida-todo-funciona).
- **No hay registro de quién cambió qué**, ni exportación de datos.

La [auditoría](docs/analisis-tecnico-y-auditoria.md) amplía esta lista con la evidencia de cada punto y un plan de acción priorizado; dos de sus propuestas (límites de longitud y fechas en la base, y políticas por rol) vienen como SQL probado, **sin aplicar**, en `docs/evidencia/seguridad/`.
