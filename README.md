# Gestor de Academia

Aplicación web para administrar una **academia formativa** de cualquier tipo: deportes, música, danza, artes, etc. Permite llevar el registro de estudiantes, el estado de sus pagos y la asistencia diaria, con un panel de resumen.

Es un proyecto escolar hecho con herramientas simples: **HTML, Tailwind CSS y JavaScript** en el navegador, y **Supabase** como base de datos. Casi todo está escrito en JavaScript "vainilla" (sin frameworks). La excepción es la **vista de Asistencia, hecha con React**, para ver en la práctica dónde ayuda un framework y dónde no hace falta (ver [sección 9.4](#94-dónde-usamos-react-y-qué-mejora)). Todo se carga por CDN: no usa npm ni compiladores, y se abre con un servidor estático.

## Contenido

1. [Qué hace](#1-qué-hace)
2. [Tecnologías](#2-tecnologías)
3. [Estructura de archivos](#3-estructura-de-archivos)
4. [Instalación paso a paso](#4-instalación-paso-a-paso)
5. [Prueba rápida: ¿todo funciona?](#5-prueba-rápida-todo-funciona)
6. [Seguridad: por qué la anon key puede estar en el frontend](#6-seguridad-por-qué-la-anon-key-puede-estar-en-el-frontend)
7. [Solución de problemas](#7-solución-de-problemas)
8. [Publicar gratis en GitHub Pages o Netlify](#8-publicar-gratis-en-github-pages-o-netlify)
9. [Cómo explicar el proyecto](#9-cómo-explicar-el-proyecto)
10. [Límites conocidos y mejoras posibles](#10-límites-conocidos-y-mejoras-posibles)

---

## 1. Qué hace

Después de iniciar sesión con correo y contraseña, la aplicación tiene cuatro secciones:

| Sección | Qué permite hacer |
|---|---|
| **Dashboard** | Ver cuántos estudiantes activos hay, cuántos están al día, pendientes o vencidos en pagos, y cómo va la asistencia de hoy (presentes, ausentes, porcentaje y cuántos faltan por registrar). Se actualiza cada vez que entras y tiene un botón **Actualizar**. |
| **Estudiantes** | Crear, editar y desactivar estudiantes. Buscar por nombre y filtrar por disciplina (se pueden combinar). Marcar **Mostrar inactivos** para ver a los desactivados y **reactivarlos**. Si el estudiante es menor de 18 años, el nombre y el teléfono del acudiente son obligatorios. |
| **Asistencia** | Elegir una fecha (hoy por defecto), marcar con un interruptor quién está presente o ausente y guardar. Se puede filtrar por disciplina; se guarda lo que se ve en la lista. Si ya había asistencia guardada ese día, se actualiza (no se duplica). |
| **Disciplinas** | Agregar disciplinas nuevas (fútbol, guitarra, danza, natación…). Cada estudiante pertenece a una. |

Otras características:

- **Seguridad:** sin sesión iniciada no se ve nada más que el login. La base de datos también rechaza a quien no haya iniciado sesión (ver [sección 6](#6-seguridad-por-qué-la-anon-key-puede-estar-en-el-frontend)).
- **Modo sin inicio de sesión (opcional y temporal):** un interruptor en `config.js` permite entrar directo, sin login, para ensayar en tu computador. **Abre la base de datos a cualquiera**, así que no es para publicar ni para datos reales (ver el [Paso 8](#paso-8-opcional-y-temporal-entrar-sin-iniciar-sesión)).
- **Cuidado con los datos:** los estudiantes no se borran (se desactivan), los formularios se validan antes de enviar, y la base de datos vuelve a validar los datos importantes.
- **Avisos claros:** los errores y confirmaciones aparecen como mensajes en pantalla (en español), nunca solo en la consola.
- **Diseño responsive:** funciona en computador y en celular.

## 2. Tecnologías

| Tecnología | Para qué se usa | Cómo se carga |
|---|---|---|
| HTML5 | Estructura de la página (una sola página con varias "vistas") | `index.html` |
| Tailwind CSS 3 | Estilos y diseño responsive | CDN: `https://cdn.tailwindcss.com` |
| JavaScript (vainilla) | Casi toda la lógica: DOM, `async/await`, validaciones | `app.js` |
| React 18.3.1 + ReactDOM | La vista de **Asistencia** (componentes y estado) | CDN (jsDelivr): `react@18.3.1` y `react-dom@18.3.1`, versión para `<script>` (sin compilar) |
| htm 3.1.1 | Permite escribir HTML dentro de JavaScript (parecido a JSX) sin compilador | CDN (jsDelivr): `htm@3.1.1` |
| Supabase (PostgreSQL + Auth) | Base de datos, inicio de sesión y reglas de seguridad (RLS) | SDK `@supabase/supabase-js` **2.117.2** por CDN (jsDelivr) |
| Live Server (VS Code) | Servidor estático para abrir el proyecto en tu computador | Extensión de VS Code |

Se usa **React 18** porque React 19 ya no ofrece una versión para cargar con una etiqueta `<script>` (necesitaría npm y un compilador).

Requisito: un navegador actual (Chrome, Edge, Firefox o Safari recientes) y conexión a Internet, porque las librerías y la base de datos están en Internet.

## 3. Estructura de archivos

```
app-local/
├── index.html            Estructura de la página: login, menú, las 4 vistas, el diálogo de
│                         confirmación y las plantillas de filas. Aquí van los estilos Tailwind.
│                         La vista Asistencia es solo un "punto de montaje" para React.
├── app.js                La lógica de toda la aplicación, dividida en secciones comentadas:
│                         configuración, utilidades, autenticación, disciplinas, estudiantes,
│                         asistencia (consultar/guardar y puente con React), dashboard,
│                         navegación e inicio.
├── asistencia-react.js   La vista de Asistencia hecha con React: sus componentes y su estado.
├── config.example.js     Plantilla con SUPABASE_URL, SUPABASE_ANON_KEY y REQUIERE_INICIO_DE_SESION.
├── config.js             TU configuración real (la creas tú; NO se sube a GitHub).
├── .gitignore            Le dice a git que ignore config.js.
├── README.md             Este archivo.
└── supabase/
    ├── schema.sql        Crea las tablas, restricciones, índices y políticas de seguridad (RLS).
    │                     Siempre deja la base en el estado SEGURO.
    ├── seed.sql          Datos de prueba: 3 disciplinas y 10 estudiantes ficticios.
    ├── modo_sin_login.sql  (opcional, temporal) ABRE la base al rol anónimo para usar la app sin login.
    └── modo_con_login.sql  Vuelve a CERRAR la base: solo entra quien inicia sesión.
```

## 4. Instalación paso a paso

Necesitas: una cuenta gratuita en [supabase.com](https://supabase.com), [Visual Studio Code](https://code.visualstudio.com/) con la extensión **Live Server** y este proyecto descargado en tu computador.

### Paso 1. Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com), crea una cuenta (puedes usar tu correo o GitHub) y pulsa **New project**.
2. Escribe un nombre (por ejemplo `gestor-academia`), elige una **contraseña para la base de datos** (guárdala, aunque esta aplicación no la usa) y una región cercana.
3. Pulsa **Create new project** y espera uno o dos minutos a que termine de prepararse.

### Paso 2. Desactivar los registros públicos (importante)

Las políticas de seguridad de este proyecto dejan entrar a **cualquier usuario autenticado**. Si cualquiera pudiera crearse una cuenta, podría leer y modificar todos los datos. Por eso:

1. En Supabase ve a **Authentication → Sign In / Providers**.
2. Desactiva la opción **Allow new users to sign up**.
3. Guarda los cambios.

### Paso 3. Crear el usuario administrador

Como nadie puede registrarse solo, el administrador se crea a mano:

1. Ve a **Authentication → Users → Add user → Create new user**.
2. Escribe un correo y una contraseña.
3. Marca **Auto Confirm User** (así no hace falta confirmar el correo).
4. Pulsa **Create user**.

Con ese correo y esa contraseña vas a iniciar sesión en la aplicación.

### Paso 4. Crear las tablas (`schema.sql`)

1. Ve a **SQL Editor → New query**.
2. Abre el archivo `supabase/schema.sql`, copia **todo** su contenido y pégalo en el editor.
3. Pulsa **Run**. Debe aparecer *Success. No rows returned*.
   - Puede salir un aviso por los `DROP POLICY` / `DROP TRIGGER`. Es seguro: solo vuelven a crear las políticas y el trigger. Confirma con **Run this query**.

El script se puede ejecutar varias veces sin borrar tus datos. Si algo falla, Supabase deshace todo el script y no queda nada a medias.

### Paso 5. Cargar los datos de prueba (`seed.sql`, opcional)

Repite lo mismo con `supabase/seed.sql`. Crea 3 disciplinas (Fútbol, Guitarra, Danza folclórica) y 10 estudiantes ficticios (9 activos y 1 inactivo). Si quieres empezar con la academia vacía, sáltate este paso.

Para comprobar que todo quedó bien, abre **Table Editor**: deben aparecer las tablas `disciplinas`, `estudiantes` y `asistencias`, cada una con la etiqueta **RLS enabled**.

### Paso 6. Crear `config.js`

1. En Supabase abre **Project Settings → API** (en algunos paneles se llama **API Keys**) y copia:
   - **Project URL**.
   - La clave **anon / public** (si tu panel solo muestra el nombre *publishable key*, esa es la que sirve).
2. En la carpeta del proyecto, copia `config.example.js` y llama a la copia `config.js`.
3. Pega tus datos:

```js
const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
const SUPABASE_ANON_KEY = "TU_CLAVE_ANON";
const REQUIERE_INICIO_DE_SESION = true;
```

La tercera línea la deja `config.example.js` en `true` (lo normal y lo seguro: la aplicación pide iniciar sesión). Solo se cambia en el [Paso 8](#paso-8-opcional-y-temporal-entrar-sin-iniciar-sesión), que es opcional.

> **Nunca uses la clave `service_role` ni la `secret`.** Esas saltan todas las reglas de seguridad y jamás deben estar en el navegador.

`config.js` está en `.gitignore`, así que no se sube a GitHub. (Si vas a publicar la aplicación, mira la [sección 8](#8-publicar-gratis-en-github-pages-o-netlify).)

### Paso 7. Abrir con Live Server

1. Abre la carpeta del proyecto en VS Code.
2. Haz clic derecho sobre `index.html` y elige **Open with Live Server**.
3. Se abre el navegador (normalmente en `http://127.0.0.1:5500`). Inicia sesión con el correo y la contraseña del Paso 3.

Si no usas VS Code, también sirve cualquier servidor estático. Por ejemplo, con Python instalado, desde la carpeta del proyecto: `python -m http.server 5500` y abre `http://localhost:5500`.

### Paso 8 (opcional y temporal). Entrar sin iniciar sesión

> ⚠️ **Lee esto antes de activarlo.** Una aplicación de Supabase sin login solo funciona si la base de datos acepta peticiones **anónimas**, y la *anon key* es **pública**. Mientras este modo esté activo, **cualquier persona que conozca la dirección de tu proyecto de Supabase puede ver, cambiar y borrar todos los datos**, incluidos los nombres, las edades y los teléfonos de los acudientes. Úsalo **solo temporalmente, en tu computador y con datos de prueba**. **No publiques** la aplicación con este modo activo.

Para **activarlo**:

1. En el **SQL Editor** de Supabase, ejecuta `supabase/modo_sin_login.sql` (abre la base al rol anónimo).
2. En tu `config.js` cambia la tercera línea a `const REQUIERE_INICIO_DE_SESION = false;` (exactamente `false`, sin comillas).
3. Recarga la aplicación: entra directo al Dashboard, sin pedir correo ni contraseña.

Mientras está activo, la aplicación te lo recuerda: muestra una franja amarilla permanente («Modo sin inicio de sesión…»), el encabezado dice *Sin inicio de sesión* y no hay botón de cerrar sesión.

Para **volver a lo seguro**:

1. En el SQL Editor ejecuta `supabase/modo_con_login.sql` (vuelve a cerrar la base).
2. En `config.js` pon `const REQUIERE_INICIO_DE_SESION = true;`.

Ambos scripts se pueden ejecutar varias veces y **no borran datos**. Volver a ejecutar `schema.sql` completo también deja la base cerrada. Si olvidas ejecutar el SQL, la aplicación te lo dice con un mensaje claro en vez de fallar. Y si falta la línea `REQUIERE_INICIO_DE_SESION` (por ejemplo, en un `config.js` antiguo), o tiene cualquier valor que no sea `false`, **la aplicación sigue pidiendo iniciar sesión**.

## 5. Prueba rápida: ¿todo funciona?

Con los datos de `seed.sql` puedes recorrer esta lista. Cada paso dice qué debería pasar.

1. **Sin sesión** (modo normal, con login): abre la aplicación en una ventana de incógnito. Solo debe verse el login.
2. **Login:** prueba una contraseña incorrecta (debe salir un aviso rojo) y luego la correcta (entras al Dashboard).
3. **Dashboard:** debe mostrar **9 estudiantes activos · 5 al día · 2 pendientes · 2 vencidos**. Como todavía no hay asistencia de hoy, dice *Aún no se ha tomado asistencia hoy* y *Sin registrar: 9*.
4. **Estudiantes:**
   - Escribe `sofia` en el buscador: debe aparecer *Sofía Martínez León* (no importan las tildes ni las mayúsculas).
   - Filtra por *Fútbol*: aparecen 4. Combina con el texto `sa`: aparecen Samuel y Santiago.
   - Marca **Mostrar inactivos**: aparece *Andrés Fuentes Mejía* en gris, con el botón **Reactivar**.
   - Crea un estudiante de 10 años sin acudiente: el formulario debe marcar el error. Con 18 años o más, el acudiente es opcional.
5. **Desactivar:** pulsa **Desactivar** en un estudiante. Pide confirmación y, al aceptar, desaparece de la lista (con *Mostrar inactivos* sigue ahí).
6. **Disciplinas:** agrega *Natación*. Intenta agregar *futbol*: debe rechazarlo por duplicada.
7. **Asistencia (por disciplina):** sigue estos pasos en orden y mira el Dashboard después de cada uno. Todos parten de "ninguna asistencia guardada hoy" (si ya probaste antes, mira la nota que sigue):

   | Paso | Qué haces en **Asistencia** | Qué debe decir el **Dashboard** |
   |---|---|---|
   | a | Elige *Fútbol* (4 estudiantes), marca a **Samuel** como ausente y pulsa **Guardar asistencia** | Presentes 3 · Ausentes 1 · **75 %** · Sin registrar **5** |
   | b | Elige *Guitarra* (3 estudiantes), déjalos a todos presentes y guarda | Presentes 6 · Ausentes 1 · **85,7 %** · Sin registrar **2** |
   | c | Elige *Danza folclórica* (2 estudiantes), marca a **Laura** como ausente y guarda | Presentes 7 · Ausentes 2 · **77,8 %** · Sin registrar **0** |

   Fíjate en que "Sin registrar" **baja** a medida que guardas más disciplinas (9 → 5 → 2 → 0), porque cada una va quedando registrada. El porcentaje siempre se calcula sobre los registrados.

   > **Si ya tomaste asistencia hoy en pruebas anteriores**, los números serán distintos (por ejemplo, si ya guardaste a los 9, "Sin registrar" ya está en 0 y no puede subir). Para empezar de cero, borra los registros de hoy en **SQL Editor** (cambia la fecha por la de hoy, en formato `AAAA-MM-DD`):
   >
   > ```sql
   > delete from public.asistencias where fecha = '2026-10-12';
   > ```
   >
   > Escribe la fecha a mano; no uses `current_date`, porque Supabase usa la hora UTC y de noche ya puede ser "mañana". También puedes hacer la prueba en otra fecha: el Dashboard solo cuenta *hoy*, pero la vista Asistencia permite elegir días anteriores.
8. **Guardar dos veces el mismo día:** cambia un interruptor y vuelve a guardar. En el **Table Editor** de Supabase, la tabla `asistencias` no debe duplicar filas (hay un solo registro por estudiante y día).
9. **Cambios sin guardar:** mueve un interruptor sin guardar y pulsa otro botón del menú. Debe preguntar *¿Descartar cambios?*.
10. **Cerrar sesión:** pulsa **Cerrar sesión** y comprueba que vuelves al login y que ya no queda ningún dato en pantalla. Al recargar la página sigues en el login.
11. **Solo si activaste el modo sin inicio de sesión ([Paso 8](#paso-8-opcional-y-temporal-entrar-sin-iniciar-sesión)):** la aplicación debe abrir directo en el Dashboard, con la franja amarilla y sin botón de cerrar sesión. Si en cambio sale el mensaje *«La base de datos no permite el acceso sin iniciar sesión…»*, falta ejecutar `modo_sin_login.sql`.

Para **volver a dejar los datos de prueba como al inicio** (borra todo, incluida la asistencia, y los vuelve a crear), ejecuta esto en el SQL Editor y después `seed.sql` otra vez:

```sql
truncate public.asistencias, public.estudiantes, public.disciplinas restart identity cascade;
```

## 6. Seguridad: por qué la anon key puede estar en el frontend

**La idea clave:** la *anon key* no es una contraseña secreta. Es una clave **pública**, hecha para ir dentro del navegador, y cualquiera que abra el código fuente de la página la puede ver. Lo que protege los datos **no es esconder la clave: es RLS** (*Row Level Security*, seguridad a nivel de fila), que son reglas dentro de la base de datos.

**Cómo funciona aquí:**

1. La *anon key* solo dice a Supabase "esta petición viene de la aplicación de este proyecto". Por sí sola, tiene el rol `anon` (anónimo).
2. En `schema.sql` activamos **RLS en las tres tablas** y creamos una única política: *solo el rol `authenticated` (con sesión iniciada) puede leer y escribir*. Además se le quitan al rol `anon` todos los permisos sobre las tablas, como un segundo candado.
3. Resultado: con la *anon key* y **sin iniciar sesión**, la base de datos responde `permission denied`. Se puede comprobar en el SQL Editor:

   ```sql
   set role anon;
   select * from estudiantes;   -- debe dar: permission denied for table estudiantes
   reset role;
   ```

**Por eso son necesarias dos cosas más:**

- **Desactivar los registros públicos** (Paso 2). Como la política deja entrar a *cualquier* usuario con sesión, si cualquiera pudiera crearse una cuenta, entraría a todo. Con los registros desactivados, solo existe el administrador que creaste a mano.
- **Nunca poner la `service_role`** (o `secret`) en el navegador ni en GitHub. Esa clave **se salta RLS** y da acceso total.

**Resumen de claves:**

| Clave | ¿Puede estar en el navegador? | Qué puede hacer |
|---|---|---|
| `anon` / `publishable` | **Sí** (es pública) | Solo lo que permitan las políticas RLS. Aquí, sin sesión, nada. |
| `service_role` / `secret` | **Jamás** | Todo: ignora RLS. |
| Contraseña del administrador | Solo la sabe la persona | Con ella se inicia sesión y se obtiene acceso a los datos. |

### Qué cambia con el modo sin inicio de sesión

El [Paso 8](#paso-8-opcional-y-temporal-entrar-sin-iniciar-sesión) permite entrar sin login. No es un detalle de la pantalla: **cambia quién puede tocar los datos**.

| | **Modo normal** (con login) | **Modo sin inicio de sesión** |
|---|---|---|
| ¿Quién puede ver y cambiar los datos? | Solo quien inicia sesión (el administrador) | **Cualquier persona** con la dirección de tu proyecto y la *anon key* (que es pública) |
| Rol que usa la base de datos | `authenticated` | `anon` (anónimo) |
| Políticas RLS | Solo para `authenticated` | Para `authenticated` **y** `anon` (las agrega `modo_sin_login.sql`) |
| ¿Importa desactivar los registros públicos? | **Sí, es clave** | No (no hace falta cuenta para entrar) |
| ¿Se puede publicar la página? | Sí | **No** |
| ¿Se pueden usar datos reales? | Sí | **No** (solo datos de prueba) |
| Para cambiar de modo | — | `modo_con_login.sql` + `REQUIERE_INICIO_DE_SESION = true` |

El proyecto trae varias protecciones contra un descuido: lo seguro es el valor por defecto (solo el valor exacto `false` quita el login), la franja amarilla recuerda el riesgo en todo momento, `schema.sql` siempre deja la base cerrada, y el modo no se activa solo: hacen falta **dos** acciones explícitas (el SQL y el cambio en `config.js`). Lo que ninguna protección puede evitar es que publiques tu `config.js` con `false` y la base abierta: por eso el [apartado de publicación](#8-publicar-gratis-en-github-pages-o-netlify) lo advierte.

**Otras medidas del proyecto:**

- Los textos de los usuarios (nombres, categorías…) nunca se interpretan como HTML: en JavaScript vainilla se ponen con `textContent` y plantillas `<template>`, y React escapa por defecto todo lo que se escribe entre llaves (`${nombre}`). El código **no usa `innerHTML` ni `dangerouslySetInnerHTML`**, así que un nombre como `<img src=x onerror=...>` se ve como texto y no se ejecuta.
- Al cerrar sesión se borra la sesión del navegador **siempre**, incluso sin Internet, y se vacían los datos de la pantalla, también los de la vista hecha con React (pensado para computadores compartidos).
- `config.js` no se sube al repositorio y no hay claves escritas en el código.

## 7. Solución de problemas

| Qué ves | Causa probable | Qué hacer |
|---|---|---|
| Aviso amarillo *«Falta configurar Supabase…»* y el botón de entrar bloqueado | No existe `config.js`, está en otra carpeta, tiene otro nombre o los valores están vacíos | Crea `config.js` junto a `index.html` a partir de `config.example.js` y escribe la URL y la clave (Paso 6). |
| Aviso amarillo *«No se pudo cargar la librería de Supabase…»* | Sin Internet, o la red (por ejemplo la del colegio) o un bloqueador de anuncios bloquea `cdn.jsdelivr.net` | Revisa la conexión, desactiva el bloqueador o prueba con otra red. |
| La página se ve sin colores ni diseño | Se bloqueó `cdn.tailwindcss.com` | Igual que arriba: revisa Internet o el bloqueador. |
| *«Correo o contraseña incorrectos»* | Datos mal escritos, o el usuario no existe en ese proyecto | Revisa **Authentication → Users**. Si hace falta, crea el usuario otra vez (Paso 3). |
| *«Este usuario aún no tiene el correo confirmado…»* | El usuario se creó sin **Auto Confirm User** | Bórralo y créalo de nuevo marcando esa casilla. |
| *«No se pudo conectar con Supabase…»* | Sin Internet, URL mal copiada en `config.js`, o el proyecto está **pausado** (los proyectos gratuitos pueden pausarse tras una semana sin uso) | Revisa la conexión y la URL. Entra a supabase.com y, si dice *Paused*, restaura el proyecto. |
| *«No tienes permiso para hacer esto»* o las listas salen vacías aunque hay datos | No se ejecutó `schema.sql`, la sesión caducó o hay un problema con las políticas | Cierra sesión y entra de nuevo. Vuelve a ejecutar `schema.sql` completo. |
| *«Tu sesión expiró»* | Pasó mucho tiempo con la página abierta | Cierra sesión y vuelve a entrar. |
| Al ejecutar `schema.sql`: `check constraint "estudiantes_acudiente_menores" … is violated by some row` | Ya hay menores guardados sin nombre o teléfono de acudiente | Encuéntralos con la consulta de abajo, corrígelos y ejecuta de nuevo. |
| *«La base de datos no permite el acceso sin iniciar sesión…»* | Pusiste `REQUIERE_INICIO_DE_SESION = false` pero no ejecutaste `modo_sin_login.sql` | Ejecútalo (con las advertencias del [Paso 8](#paso-8-opcional-y-temporal-entrar-sin-iniciar-sesión)) o vuelve a poner `true`. |
| Puse `REQUIERE_INICIO_DE_SESION = false` y la aplicación sigue pidiendo login | El valor debe ser exactamente `false` (sin comillas) y estar en `config.js` (no en el ejemplo); si no, se pide login a propósito | Revisa la línea y recarga sin caché (`Ctrl + F5`). |
| Franja amarilla *«Modo sin inicio de sesión (temporal)…»* | Es normal: es el aviso de ese modo | Para quitarla, vuelve al modo normal (`modo_con_login.sql` y `true`). |
| Al abrir **Asistencia** sale *«No se pudo cargar React…»* | Sin Internet o la red bloquea `cdn.jsdelivr.net` (de ahí vienen React y `htm`) | Revisa la conexión o el bloqueador y recarga. El resto de la aplicación sigue funcionando. |
| *«Todavía no hay estudiantes»* | No se ejecutó `seed.sql` (o la lista está realmente vacía) | Ejecuta `seed.sql` o crea estudiantes desde la aplicación. |
| Un estudiante no aparece en **Asistencia** | Está inactivo, o hay un filtro de disciplina puesto | Revisa **Estudiantes → Mostrar inactivos** y el filtro. |
| El Dashboard dice *«Aún no se ha tomado asistencia hoy»* aunque guardaste | Guardaste otra fecha, o no pulsaste **Guardar asistencia** | En **Asistencia** comprueba la fecha: el Dashboard solo cuenta *hoy*. |
| La fecha de «hoy» no es la correcta | La aplicación usa el reloj y la zona horaria de **tu computador** | Revisa la fecha y la zona horaria del sistema. |
| *«La sesión se cerró en este navegador, pero no se pudo avisar a Supabase»* | Cerraste sesión sin Internet | No es un problema: la sesión ya se borró de este navegador. |
| En la consola del navegador aparece *«cdn.tailwindcss.com should not be used in production»* | Es un aviso normal del CDN de Tailwind | Se puede ignorar en un proyecto escolar (ver [sección 10](#10-límites-conocidos-y-mejoras-posibles)). |
| Cambié `config.js` y no se nota | El navegador guardó la versión anterior | Recarga sin caché (`Ctrl + F5`). |

Consulta para encontrar a los menores sin acudiente (se ejecuta en el SQL Editor):

```sql
select id, nombre_completo, edad from public.estudiantes
where edad < 18
  and (nullif(trim(acudiente_nombre), '') is null
       or nullif(trim(acudiente_telefono), '') is null);
```

## 8. Publicar gratis en GitHub Pages o Netlify

Como la aplicación es solo HTML, CSS y JavaScript, se puede publicar en cualquier hosting de archivos estáticos, sin servidor propio.

### Antes de publicar: qué pasa con `config.js`

- `config.js` está en `.gitignore`, así que **no está en GitHub**. Si publicas el repositorio tal cual, la página mostrará el aviso *«Falta configurar Supabase»*, porque ese archivo no llegó al hosting.
- El sitio publicado **necesita** ese archivo, y la gente podrá verlo (es JavaScript que se descarga en el navegador). **Eso no es un problema para la URL y la *anon key***, porque son públicas por diseño: lo que protege los datos es RLS (ver [sección 6](#6-seguridad-por-qué-la-anon-key-puede-estar-en-el-frontend)). Pero **solo si**:
  - hiciste el Paso 2 (registros públicos desactivados) y ejecutaste `schema.sql` (RLS activado), y
  - en `config.js` **solo** están la URL y la *anon key*. **Jamás la `service_role`.**
- Revisa que no haya nada más en `config.js` antes de publicarlo.
- ⚠️ **Antes de publicar, comprueba que `REQUIERE_INICIO_DE_SESION` sea `true`** en el `config.js` que vas a publicar y ejecuta `supabase/modo_con_login.sql`. **Nunca publiques con el modo sin inicio de sesión activo:** cualquiera podría leer y borrar todos los datos (ver [sección 6](#qué-cambia-con-el-modo-sin-inicio-de-sesión)).

### Opción A: GitHub Pages

1. Sube el proyecto a un repositorio de GitHub. En las cuentas gratuitas, GitHub Pages suele requerir que el repositorio sea **público**.
2. Incluye `config.js` en el repositorio. Como `.gitignore` lo ignora, hay que forzarlo:

   ```bash
   git add -f config.js
   git commit -m "Agregar config.js para publicar (solo URL y anon key)"
   git push
   ```

3. En GitHub ve a **Settings → Pages**. En **Build and deployment** elige **Deploy from a branch**, selecciona la rama principal (`main`) y la carpeta **/ (root)**, y pulsa **Save**.
4. Espera uno o dos minutos. La dirección será `https://TU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/`.
5. Abre la dirección e inicia sesión. Si ves el aviso amarillo, `config.js` no llegó: revisa el paso 2.

### Opción B: Netlify

**B1. Arrastrar la carpeta (la más simple, sin Git):**

1. Entra a [app.netlify.com/drop](https://app.netlify.com/drop) (hace falta una cuenta gratuita).
2. Arrastra **la carpeta del proyecto** completa, con tu `config.js` dentro. Como ese archivo existe en tu disco, se sube aunque `.gitignore` lo ignore.
3. Netlify te da una dirección pública. Ábrela e inicia sesión.

**B2. Conectado a GitHub (para que se actualice solo):** como `config.js` no está en el repositorio, hay que generarlo en cada publicación. En *Add new site → Import an existing project* elige el repositorio y configura:

- **Build command:**

  ```
  echo "const SUPABASE_URL = \"$SUPABASE_URL\"; const SUPABASE_ANON_KEY = \"$SUPABASE_ANON_KEY\";" > config.js
  ```

- **Publish directory:** `.`
- En las variables de entorno del sitio crea `SUPABASE_URL` y `SUPABASE_ANON_KEY` con tus valores.

El `config.js` que genera ese comando no incluye `REQUIERE_INICIO_DE_SESION`, así que el sitio publicado **pide iniciar sesión** (lo seguro).

> Nota: la opción B2 no se probó al preparar este proyecto; si falla, usa la B1 o la opción A.

### Después de publicar: la URL en Supabase

Para iniciar sesión con correo y contraseña **normalmente no hace falta hacer nada en Supabase**: la API acepta peticiones desde cualquier dirección y la seguridad la dan el inicio de sesión y RLS.

Solo si más adelante agregas funciones que envían correos con enlaces (confirmar correo, recuperar contraseña, enlace mágico), ve a **Authentication → URL Configuration** y:

- escribe tu dirección publicada en **Site URL**, y
- agrégala también en **Redirect URLs**.

## 9. Cómo explicar el proyecto

Esta sección está pensada para la exposición en el colegio.

### 9.1 La idea en una frase

> «Es una aplicación web para que una academia lleve a sus estudiantes, sus pagos y su asistencia, con una base de datos en Internet protegida para que solo entre la persona autorizada.»

### 9.2 Arquitectura: ¿quién habla con quién?

Hay tres piezas:

```
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
 │     arma la petición,         │   Nos evita escribir a mano las peticiones
 │     adjunta la sesión         │   a Internet.
 └───────────────┬───────────────┘
                 │  petición segura (HTTPS) con la anon key
                 │  y el "pase" de la persona que inició sesión
                 ▼
 ┌───────────────────────────────┐
 │  3. SUPABASE (en Internet)    │
 │     · Auth: ¿quién eres?      │
 │     · Base de datos PostgreSQL│
 │       con RLS: ¿puedes hacer  │   ← el "portero"
 │       esto?                   │
 │       CHECK / UNIQUE / FK:    │   ← el "inspector de datos"
 │       ¿los datos son válidos? │
 └───────────────────────────────┘
```

En palabras sencillas:

- **El navegador** es la cara de la aplicación: dibuja las pantallas y reacciona a lo que hace la persona. No guarda nada importante. Casi todo lo dibuja JavaScript vainilla; la vista de Asistencia la dibuja **React**.
- **El SDK** es el "mensajero": lleva y trae mensajes entre el navegador y Supabase.
- **Supabase** es el "archivo con guardia": guarda los datos y decide quién puede verlos o cambiarlos. Aunque alguien se saltara nuestra página, la base de datos se sigue defendiendo sola.

**Ejemplo del flujo de datos: guardar la asistencia**

1. La persona mueve los interruptores. El componente de React anota las marcas en su **estado** (`anotarMarca`) y vuelve a dibujar el resumen y las etiquetas; todavía no se envía nada.
2. Pulsa **Guardar asistencia**. La función `guardar` del componente arma una lista de registros: `{ estudiante_id, fecha, asistio }`, uno por estudiante de la lista.
3. `guardarRegistrosDeAsistencia` (en `app.js`) hace `clienteSupabase.from("asistencias").upsert(...)`: entrega la lista al SDK, que la envía por Internet junto con la sesión de la persona.
4. Supabase revisa: *¿hay sesión? ¿RLS lo permite?* Después, por cada registro, mira la regla `UNIQUE (estudiante_id, fecha)`: si ese estudiante ya tenía registro ese día, lo **actualiza**; si no, lo **crea**.
5. Si todo sale bien, la aplicación muestra un aviso verde y vuelve a leer lo guardado (`cargarFecha`, que usa `consultarAsistenciaDeUnaFecha`). Si algo falla, `describirError` lo traduce a español y se muestra un aviso rojo.

**Dónde está cada cosa en `app.js` y `asistencia-react.js`**

| Sección | Qué contiene | Funciones de ejemplo |
|---|---|---|
| 1. Configuración | El cliente de Supabase, la memoria de la app (`estado`) y las referencias a elementos del HTML | `crearClienteSupabase`, `guardarReferenciasDelDOM` |
| 2. Utilidades | Avisos, indicador de "cargando", traducción de errores, diálogo de confirmación | `mostrarAviso`, `describirError`, `pedirConfirmacion` |
| 3. Autenticación | Iniciar y cerrar sesión, revisar si ya hay sesión | `iniciarSesion`, `cerrarSesion`, `revisarSesion` |
| 4. Disciplinas | Listar y agregar disciplinas | `cargarDisciplinas`, `agregarDisciplina` |
| 5. Estudiantes | Tabla, buscador, filtros, formulario con validación, desactivar y reactivar | `cargarEstudiantes`, `validarEstudiante`, `guardarEstudiante` |
| 6. Asistencia | Consultar y guardar (upsert) la asistencia, y el «puente» con la vista hecha en React | `consultarAsistenciaDeUnaFecha`, `guardarRegistrosDeAsistencia`, `abrirVistaAsistencia` |
| 7. Dashboard | Cálculo y dibujo de las métricas | `calcularMetricasDelDashboard`, `cargarDashboard` |
| 8. Navegación | Mostrar una vista y ocultar las demás | `mostrarVista`, `navegarAVista` |
| 9. Inicio | Conectar eventos y arrancar (con o sin inicio de sesión) | `conectarEventos`, `iniciarAplicacion` |
| `asistencia-react.js` | La pantalla de Asistencia: componentes de React y su estado | `FilaDeAsistencia`, `VistaDeAsistencia`, `window.VistaAsistencia` |

### 9.3 Glosario corto

| Término | Qué significa | Dónde se ve en el proyecto |
|---|---|---|
| **SPA** (*Single Page Application*) | Una aplicación de **una sola página**: no se recarga al cambiar de sección. JavaScript muestra unas secciones y oculta otras. | `index.html` tiene las 4 vistas; `mostrarVista` las muestra u oculta |
| **DOM** | La versión de la página HTML como un "árbol de objetos" que JavaScript puede leer y cambiar. | `document.getElementById(...)`, `textContent`, `classList` |
| **async / await** | Forma de **esperar** algo lento (como una respuesta de Internet) sin congelar la página. `await` pausa solo esa función hasta que llega la respuesta. | Casi todas las funciones que hablan con Supabase: `async function cargarEstudiantes()` |
| **CRUD** | Las cuatro operaciones básicas con datos: **C**rear, **L**eer (*Read*), **A**ctualizar (*Update*) y **B**orrar (*Delete*). | Estudiantes: `insert`, `select`, `update`, y desactivar en lugar de borrar |
| **Upsert** | *Update + insert*: «si ya existe, actualiza; si no existe, crea». | Guardar asistencia: `.upsert(registros, { onConflict: "estudiante_id,fecha" })` |
| **RLS** (*Row Level Security*) | Reglas **dentro de la base de datos** que dicen quién puede ver o cambiar cada fila. Si está activada y no hay regla para alguien, no puede nada. Es el "portero". | `schema.sql`: `enable row level security` y las políticas |
| **Borrado lógico** | En vez de borrar una fila, se la **marca** como inactiva (`activo = false`). Es como mandar algo a la papelera: se conserva el historial y se puede recuperar. | **Desactivar** y **Reactivar** estudiantes |
| **CHECK** | Una regla de PostgreSQL que **rechaza** filas que no la cumplan. | `edad between 3 and 99`; los menores de 18 deben tener acudiente |
| **Validación en dos capas** | Revisar los datos **dos veces**: primero en el formulario (rápido, con mensajes amables) y otra vez en la base de datos (la última palabra, que nadie puede saltarse). | `validarEstudiante` en `app.js` + `CHECK` en `schema.sql` |
| **SDK** | Una librería con funciones ya hechas para usar un servicio. | `supabase-js`, que cargamos por CDN |
| **CDN** | Un servidor en Internet que entrega librerías por una URL. | Tailwind, `supabase-js`, React y `htm` en `index.html` |
| **React** | Una librería para construir pantallas. En vez de decir *cómo cambiar* la pantalla paso a paso, se describe *cómo se ve* para unos datos, y React la actualiza sola. | La vista de Asistencia (`asistencia-react.js`) |
| **Componente** | Una función de React que devuelve un trozo de pantalla. Se pueden reutilizar y combinar, como piezas de Lego. | `FilaDeAsistencia` (una fila) dentro de `VistaDeAsistencia` (toda la vista) |
| **Estado** (*state*) | Los datos que, cuando cambian, hacen que React vuelva a dibujar el componente. | `const [marcas, setMarcas] = useState({})` |
| **Hook** | Una función de React (su nombre empieza con `use`) que da poderes a un componente: `useState` le da memoria y `useEffect` le permite hacer algo cuando aparece o desaparece. | `useState`, `useEffect` en `asistencia-react.js` |
| **Rol anónimo** (`anon`) | El "usuario" con el que la base de datos trata a quien no ha iniciado sesión. Con RLS bien configurado no puede hacer nada. | `modo_sin_login.sql` le da permisos; `modo_con_login.sql` se los quita |

### 9.4 Dónde usamos React y qué mejora

**Dónde:** solo en la vista **Asistencia** (archivo `asistencia-react.js`). El resto de la aplicación sigue en JavaScript vainilla, a propósito: así se pueden comparar los dos estilos en el mismo proyecto.

**Por qué justo ahí:** Asistencia es la parte donde más cosas cambian a la vez. Al mover un solo interruptor hay que actualizar la marca en memoria, el texto «Presente/Ausente» (y su color), el resumen «Presentes · Ausentes · Total» y el aviso «Cambios sin guardar»; y si se cambia de fecha o de disciplina, toda la lista. Ese es justo el tipo de problema para el que se creó React.

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
const resumen = "Presentes: " + presentes + " · Ausentes: " + (visibles.length - presentes) + " · Total: " + visibles.length;
// y dentro de cada fila:  ${presente ? "Presente" : "Ausente"}
```

**Cómo está armado:**

- **2 componentes:** `FilaDeAsistencia` (una fila: nombre e interruptor) y `VistaDeAsistencia` (fecha, filtro, lista, resumen y botón).
- **9 variables de estado** (`useState`): la fecha cargada, lo escrito en el campo de fecha, las disciplinas, el filtro, los estudiantes, la asistencia ya guardada, las marcas, si ya cargó y si hay cambios sin guardar.
- **2 efectos** (`useEffect`): uno carga los datos cuando la vista aparece y otro le avisa al resto de la aplicación si hay cambios sin guardar.
- Las consultas a Supabase **no** están en el componente: se quedaron en `app.js` (`consultarAsistenciaDeUnaFecha` y `guardarRegistrosDeAsistencia`). React solo se ocupa de la pantalla.

**Qué mejoró (con cifras reales de este proyecto):**

| | Antes (vainilla) | Después (React) |
|---|---|---|
| Funciones cuyo único trabajo era mantener la pantalla igual a los datos | 5 (`pintarEstadoDelInterruptor`, `crearFilaDeAsistencia`, `actualizarResumenDeAsistencia`, `dibujarListaDeAsistencia`, `limpiarAsistenciaEnPantalla`) | 0: lo hace React |
| Cambios hechos a mano sobre la pantalla dentro de la vista (`textContent =`, `className =`, `checked =`, `value =`, `classList`) | 16 | 0 |
| Datos de la asistencia en la variable compartida `estado` (cualquier parte del programa podía cambiarlos) | 40 usos | 0: viven dentro del componente |
| Referencias a la asistencia repartidas por `app.js`, fuera de su sección (elementos del HTML, limpiar, confirmar…) | 22 | 3 (el «puente») |
| Al cancelar un cambio de disciplina | Había que devolver el selector a su valor con una línea de código | El selector se queda solo en su valor: el estado no cambió |

**Lo que NO mejoró (y lo que costó):**

- **No es menos código.** Antes: 216 líneas de JavaScript y 68 de HTML. Ahora: 67 de `app.js`, 271 del componente y 9 de HTML. (Una parte del aumento es que el HTML de la vista ahora vive dentro del componente.)
- **Pesa más al cargar.** React, ReactDOM y `htm` suman unos 47 KB comprimidos (el SDK de Supabase pesa unos 54 KB).
- **Hay dos estilos en el mismo proyecto,** y las dos partes se hablan por un «puente» de 3 funciones. Además hubo que usar `flushSync` para que la lista ya esté dibujada cuando desaparece el indicador de «cargando» (que no es de React).
- **Más cosas que aprender** (componente, estado, efecto) y **una dependencia más que puede fallar:** si el CDN de React no carga, la vista Asistencia no funciona (la aplicación lo avisa y el resto sigue).
- **Sin compilador no hay JSX.** Se usa `htm`, que es lo más parecido.

**¿Valió la pena?** Para esta vista, sí: es donde el estado cambia en muchos sitios a la vez. Para el resto (el login, la tabla de estudiantes, el Dashboard) el JavaScript vainilla alcanza y es más simple: usar React en todo sería agregar peso y complejidad sin una mejora clara. Si el proyecto creciera, los candidatos serían el formulario de estudiantes (muchas validaciones que dependen unas de otras) y la tabla con sus filtros.

**Cómo se conectan las dos partes:** `app.js` abre la vista con `abrirVistaAsistencia()`, que llama a `window.VistaAsistencia.abrir()`. A su vez, el componente usa funciones de `app.js` (consultar, guardar, avisos, confirmación). Al cerrar sesión, `app.js` llama a `cerrar()` y React desmonta la vista, con todos sus datos.

**Cómo se comprobó que se comporta igual que antes:** durante el desarrollo se usaron pruebas automáticas en el navegador (166 para esta vista) que dieron el mismo resultado con la versión de vainilla y con la de React, tanto con el React de desarrollo (que avisa de malas prácticas y no emitió ninguna advertencia) como con el minificado. Esas pruebas no forman parte del repositorio (ver [sección 10](#10-límites-conocidos-y-mejoras-posibles)).

### 9.5 Guion de demostración (unos 5 minutos)

**Antes de empezar (preparación):** para la exposición usa el **modo normal, con login** (el modo sin inicio de sesión es solo para ensayar); ejecuta `seed.sql` con datos limpios y borra la asistencia de hoy (ver [sección 5](#5-prueba-rápida-todo-funciona)); abre la aplicación **cerrada** (con el login a la vista); ten abierto el **Table Editor** de Supabase en otra pestaña; sube el zoom del navegador (125 %) para que se lea desde atrás. Si no hay Internet, ten capturas de pantalla de respaldo.

| Tiempo | Vista | Qué mostrar | Qué decir |
|---|---|---|---|
| 0:00 – 0:30 | — | Presenta el proyecto. | «Es una aplicación para administrar academias: estudiantes, pagos y asistencia. Usa HTML, Tailwind, JavaScript y Supabase, y la vista de asistencia está hecha con React.» |
| 0:30 – 1:15 | **Login** | Muestra que solo se ve el login. Escribe una contraseña mala (aviso rojo). Entra con la correcta. | «Sin sesión no se ve nada. Además, la base de datos también rechaza a quien no inició sesión: esa protección se llama RLS.» |
| 1:15 – 2:00 | **Dashboard** | Señala las tarjetas (9 activos, pagos al día / pendientes / vencidos) y el mensaje *Aún no se ha tomado asistencia hoy*. | «Estas cifras se calculan con datos reales de la base y se actualizan cada vez que entro. Todavía no hay asistencia hoy, por eso no hay porcentaje.» |
| 2:00 – 3:00 | **Estudiantes** | Busca `sofia`. Filtra por Fútbol. Crea un estudiante de 10 años sin acudiente (sale el error) y luego con acudiente. Desactiva uno, marca **Mostrar inactivos** y reactívalo. | «El buscador no distingue tildes. El acudiente es obligatorio solo para menores de 18. No borramos estudiantes: los desactivamos, para no perder su historial.» |
| 3:00 – 3:20 | **Disciplinas** | Agrega *Natación*. Intenta *futbol* (la rechaza). | «Cada estudiante pertenece a una disciplina. No permite repetidas aunque cambien las tildes o las mayúsculas.» |
| 3:20 – 4:30 | **Asistencia** | Filtra por Fútbol, marca un ausente y guarda. Mueve otro interruptor y cambia la fecha (sale *¿Descartar cambios?*); cancela. Guarda de nuevo y muestra en Supabase que no se duplican filas. | «Esta vista está hecha con React (ver 9.4): el resumen y las etiquetas se calculan solos a partir de las marcas. Guardar usa *upsert*: si ya existe el registro de ese estudiante ese día, lo actualiza; si no, lo crea. La base impide duplicados con una regla UNIQUE.» |
| 4:30 – 5:00 | **Dashboard** → cerrar sesión | Vuelve al Dashboard: aparece el porcentaje y "Sin registrar". Cierra sesión. | «El porcentaje es de presentes sobre los registrados; "Sin registrar" son los que aún faltan. Al cerrar sesión se borra todo de la pantalla.» |

**Si te sobra tiempo:** en una ventana de incógnito muestra que sin sesión solo ves el login, y ejecuta en el SQL Editor `set role anon; select * from estudiantes;` para enseñar el *permission denied*.

### 9.6 Preguntas que podría hacer un profesor

**1. La *anon key* está en el código y cualquiera puede verla. ¿No es peligroso?**
No, porque no es una clave secreta: está pensada para ir en el navegador. Lo que protege los datos es RLS, las reglas de la base de datos. Con la *anon key* y sin iniciar sesión, la base responde *permission denied*. Lo peligroso sería poner la clave `service_role`, que se salta RLS, y eso nunca lo hacemos.

**2. ¿Qué impide que cualquier persona se cree una cuenta y entre?**
Desactivamos los registros públicos en Supabase («Allow new users to sign up»). Las políticas dejan entrar a *cualquier usuario con sesión*, así que lo importante es que solo exista el administrador, creado a mano.

**3. ¿Por qué «desactivan» a los estudiantes en vez de borrarlos?**
Por el **borrado lógico**: si borráramos la fila, también se borraría su historial de asistencia (la tabla de asistencias está ligada con `ON DELETE CASCADE`). Con `activo = false` el estudiante deja de aparecer, pero se conserva todo y se puede reactivar.

**4. ¿Qué es un upsert y por qué lo usaron en la asistencia?**
Es «actualizar si existe, crear si no». La asistencia tiene una regla `UNIQUE (estudiante_id, fecha)`: solo puede haber un registro por estudiante y día. Gracias al upsert, el docente puede guardar varias veces el mismo día sin que aparezcan filas repetidas ni errores.

**5. ¿Por qué validan en el formulario y también en la base de datos?**
Son dos capas con trabajos distintos. El formulario es rápido y da mensajes claros, pero se puede saltar (por ejemplo, con las herramientas del navegador). La base de datos, con `CHECK`, `UNIQUE` y claves foráneas, tiene la última palabra y no se puede saltar. Así los datos importantes, como «los menores necesitan acudiente», están protegidos siempre.

**6. ¿Para qué sirven `async` y `await`? ¿Qué pasaría sin ellos?**
Pedir datos a Internet tarda. Con `await`, la función espera la respuesta sin congelar la página (se ve el indicador de «cargando»). Sin ellos, el código seguiría de largo antes de tener los datos y mostraría la pantalla vacía o con errores.

**7. ¿Cómo evitan que alguien escriba código malicioso en un nombre (XSS)?**
Todo texto que viene de los usuarios se pone con `textContent`, que nunca interpreta HTML; las filas de estudiantes y de asistencia se crean a partir de plantillas `<template>`. El código no usa `innerHTML`. Si alguien escribe `<img src=x onerror=...>` como nombre, se ve literalmente como texto.

**8. ¿Cómo se calcula el porcentaje del Dashboard y por qué «sobre los registrados»?**
Es `presentes ÷ (presentes + ausentes)`, contando solo lo guardado hoy para estudiantes activos. Se calcula sobre los registrados para no castigar a quien aún no tomó la asistencia; aparte se muestra cuántos están «Sin registrar». Si nadie tiene registro, no hay porcentaje: el Dashboard dice *Aún no se ha tomado asistencia hoy*.

**9. ¿Qué pasa si se cae Internet mientras guardan?**
Todas las operaciones usan `try/catch`: si falla, aparece un aviso rojo en español y no se pierde lo escrito (el formulario y los interruptores se quedan como están, para reintentar). Y si falla al cerrar sesión, la sesión se borra del navegador de todas formas y se avisa.

**10. ¿Cómo saben cuál es la fecha de «hoy»? ¿Y si es de noche?**
Usamos la fecha y la zona horaria del navegador (`new Date()`), no la de UTC. Si usáramos UTC, en Colombia a partir de las 7:00 p. m. ya sería «mañana» y la asistencia se guardaría en el día equivocado. Además, no se permite guardar asistencia de fechas futuras.

**11. ¿Por qué usaron React solo en una vista y no en todo el proyecto?**
Porque ahí es donde más ayuda: en Asistencia cambian muchas cosas a la vez al mover un interruptor (la marca, el texto, el color, el resumen, el aviso de «sin guardar»), y React las mantiene sincronizadas solo. En el login, la tabla o el Dashboard el JavaScript vainilla alcanza y es más simple; usar React en todo habría agregado peso (unos 47 KB) y conceptos nuevos sin una mejora clara. Además, React puede encargarse de un solo rincón de la página (un `<div id="raiz-asistencia">`), así que se puede mezclar con el resto.

**12. ¿Qué mejoró con React y qué costó?**
Mejoró que los datos y la pantalla ya no se desincronizan: pasamos de 5 funciones que actualizaban la pantalla a mano y 40 usos de variables compartidas a cero. Costó: no hay menos código (hay más líneas), la página pesa unos 47 KB más, hay dos estilos de programar en el mismo proyecto y una dependencia más que puede fallar (si el CDN de React no carga, la vista Asistencia no funciona, aunque el resto sí y la aplicación lo avisa).

**13. ¿Qué pasa si quitan el inicio de sesión? ¿Sigue siendo seguro?**
No. Sin login, la base de datos tiene que aceptar al rol anónimo, y como la *anon key* es pública, cualquiera con la dirección del proyecto podría ver y cambiar todo. Por eso el modo sin inicio de sesión es opcional y temporal: hay que ejecutar un SQL aparte y cambiar `config.js`, la aplicación muestra una franja de advertencia, no debe usarse con datos reales y hay que volver al modo normal antes de publicar.

## 10. Límites conocidos y mejoras posibles

Para ser honestos sobre lo que el proyecto **no** hace (sirve como lista de mejoras):

- **Un solo tipo de usuario.** Todos los usuarios con sesión pueden hacer todo. Si hiciera falta tener, por ejemplo, profesores que solo toman asistencia, habría que agregar roles y políticas RLS más estrictas.
- **Máximo 1000 filas por consulta.** Supabase limita lo que devuelve cada consulta. Para una academia es suficiente; para más habría que paginar.
- **Tailwind por CDN.** Es cómodo para aprender y para un proyecto escolar, pero el propio Tailwind recomienda compilarlo para producción (la consola muestra un aviso). El CDN de Tailwind tampoco tiene versión fija.
- **Los scripts de CDN no usan *Subresource Integrity*.** Las versiones de Supabase (2.117.2), React (18.3.1) y `htm` (3.1.1) están fijas, pero no se comprueba un *hash* de cada archivo. Una mejora de seguridad sería agregar el atributo `integrity` en cada etiqueta `<script>`.
- **Dos estilos de código.** La vista de Asistencia usa React y el resto JavaScript vainilla, conectados por un pequeño «puente». Es útil para aprender y comparar, pero en un proyecto real se suele elegir uno solo (o pasar todo a React con un compilador).
- **React 18 por CDN y sin JSX.** React 19 ya no se ofrece para cargar con `<script>`, y sin compilador se usa `htm` en vez de JSX. Con npm y un compilador (por ejemplo Vite) se tendría JSX y React 19, a cambio de salir de la regla «sin npm».
- **El modo sin inicio de sesión no es para producción.** Deja la base abierta al rol anónimo (ver [sección 6](#qué-cambia-con-el-modo-sin-inicio-de-sesión)).
- **No hay pruebas automáticas en el repositorio.** Durante el desarrollo se usaron pruebas automáticas en el navegador, pero necesitan herramientas (Node y Playwright) que no forman parte del proyecto. Quien clone el repositorio verifica con la lista de la [sección 5](#5-prueba-rápida-todo-funciona).
- **No hay registro de quién cambió qué**, ni recuperación de contraseña, ni exportación de datos.
