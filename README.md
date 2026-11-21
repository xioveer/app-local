# Gestor de Academia

Aplicación web para que un **profesor** lleve el control de sus estudiantes: quién está matriculado, quién está al día con la mensualidad y quién asistió cada día.

No es una página para ofrecer servicios ni captar clientes: es una **herramienta de trabajo interna**. Para entrar hay que iniciar sesión, y la base de datos no entrega ningún dato a quien no esté autorizado.

Es un proyecto escolar hecho con herramientas simples: **HTML, Tailwind CSS y JavaScript** en el navegador, y **Supabase** (PostgreSQL) como base de datos. Casi todo está en JavaScript "vainilla"; la excepción es la **vista de Asistencia, hecha con React**, para comparar los dos estilos en el mismo proyecto.

> Los estudiantes son **ficticios**: sirven para demostrar la aplicación.

## Contenido

1. [Qué hace](#1-qué-hace)
2. [Arquitectura](#2-arquitectura)
3. [Tecnologías y archivos](#3-tecnologías-y-archivos)
4. [Ponerlo a funcionar](#4-ponerlo-a-funcionar)
5. [Seguridad](#5-seguridad)
6. [El asistente: qué es IA y qué no](#6-el-asistente-qué-es-ia-y-qué-no)
7. [Solución de problemas](#7-solución-de-problemas)
8. [Publicar en Internet](#8-publicar-en-internet)
9. [Cómo explicar el proyecto](#9-cómo-explicar-el-proyecto)
10. [Límites conocidos](#10-límites-conocidos)

**Documento aparte:** [Análisis técnico y auditoría](docs/analisis-tecnico-y-auditoria.md), escrito sobre una versión anterior del proyecto.

---

## 1. Qué hace

Al abrir la página aparece el inicio de sesión. Cualquier profesor puede **registrarse y entrar con su cuenta de Google** (o con correo y contraseña), y cada uno ve **solo sus propios** estudiantes, disciplinas y asistencias. Dentro hay cinco vistas:

| Vista           | Qué permite hacer                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Dashboard**   | Cómo va la asistencia de hoy, cuántos estudiantes activos hay y cómo están los pagos                                   |
| **Estudiantes** | Crear, editar y desactivar. Buscar por nombre y filtrar por disciplina. El acudiente es obligatorio para menores de 18 |
| **Asistencia**  | Elegir la fecha, marcar quién vino y guardar. Si ya había registro ese día, se actualiza en vez de duplicarse          |
| **Disciplinas** | Las actividades de la academia (fútbol, guitarra, danza…). Cada estudiante pertenece a una                             |
| **Asistente**   | Señala quién podría estar retirándose y a quién hay que cobrarle, y responde preguntas sobre tus datos                 |

Los estudiantes no se borran: se **desactivan**, para no perder su historial de asistencia.

## 2. Arquitectura

```
 ┌────────────────────────────────────────────┐
 │  NAVEGADOR                                 │
 │  index.html + js/main.js (módulos)         │
 │   datos/   → hablan con Supabase           │
 │   vistas/  → dibujan cada pantalla         │
 │   asistente/ → análisis y preguntas        │
 └──────────────────┬─────────────────────────┘
                    │  sesión iniciada (rol authenticated)
                    ▼
 ┌────────────────────────────────────────────────────────────┐
 │  SUPABASE (PostgreSQL)                                     │
 │   · Auth: Google, o correo y contraseña                    │
 │   · RLS: cada fila es de un profesor (profesor_id) ← portero│
 │   · CHECK / UNIQUE / claves foráneas           ← inspector │
 │   · Edge Function "asistente": guarda la clave de la IA    │
 └────────────────────────────────────────────────────────────┘
```

Lo importante: **el navegador no decide la seguridad**. Aunque alguien abra el código o escriba sus propias peticiones, la base de datos vuelve a revisar quién pregunta y qué pide.

## 3. Tecnologías y archivos

| Tecnología                        | Para qué                                           | Cómo se carga                               |
| --------------------------------- | -------------------------------------------------- | ------------------------------------------- |
| HTML5                             | La página y sus cinco vistas                       | `index.html`                                |
| Tailwind CSS 3.4.17               | Estilos y diseño responsive                        | Compilado en `estilos.css`                  |
| JavaScript (vainilla, módulos ES) | Casi toda la lógica, separada por responsabilidad  | Carpeta `js/`, sin compilador               |
| React 18.3.1 + htm 3.1.1          | La vista de Asistencia                             | CDN (jsDelivr), sin compilador              |
| Supabase                          | Base de datos, inicio de sesión y reglas de acceso | SDK `@supabase/supabase-js` 2.117.2 por CDN |
| Deno (Edge Function)              | Guardar la clave de la IA en el servidor           | `supabase/functions/asistente/`             |
| Vercel                            | Publica la página                                  | Automático en cada push                     |

```
app-local/
├── index.html              La página: login y las 5 vistas
├── js/
│   ├── main.js             Arranque: conecta todo al cargar la página
│   ├── estado.js, dom.js   Datos en memoria y referencias a la página
│   ├── navegacion.js       Cambiar de vista
│   ├── pantallas.js        Mostrar login o aplicación y limpiar al salir
│   ├── validaciones.js     Reglas de los formularios
│   ├── config/             conexion.js (dirección y clave PÚBLICA de Supabase), reglas.js
│   ├── servicios/          supabase.js: crea el cliente
│   ├── auth/               sesion.js, login.js (correo), google.js
│   ├── datos/              Consultas por tabla: disciplinas, estudiantes, asistencias
│   ├── vistas/             dashboard, estudiantes/, asistencia (React), disciplinas
│   ├── asistente/          analisis.js, hallazgos.js, respuestas.js, vista.js
│   ├── ui/                 avisos, cargando, confirmación, selects
│   └── utilidades/         fechas, formato, texto, errores
├── estilos.css             Tailwind compilado (no se edita a mano)
├── estilos.entrada.css     Las clases propias: boton, campo, tarjeta...
├── tailwind.config.js      Colores y letras
├── README.md               Este archivo
├── CLAUDE.md               Resumen para un asistente de IA que continúe
├── docs/                   Auditoría técnica y su evidencia
└── supabase/
    ├── schema.sql                     Las 3 tablas, sus reglas y la seguridad por profesor
    ├── seed.sql                       Datos de prueba para una cuenta: 3 disciplinas y 10 estudiantes
    └── functions/asistente/index.ts   Edge Function que habla con el modelo de lenguaje
```

## 4. Ponerlo a funcionar

### Paso 1. Preparar la base de datos

En Supabase → **SQL Editor** → New query, pega `supabase/schema.sql` completo y pulsa **Run**. Crea las tablas y deja la base cerrada. Se puede ejecutar varias veces sin borrar nada.

### Paso 2. Activar el inicio con Google

Así cualquier profesor con una cuenta de Google (Gmail o institucional) se registra y entra con un clic.

1. En **Google Cloud Console** (console.cloud.google.com), crea un proyecto.
2. **APIs y servicios → Pantalla de consentimiento de OAuth**: tipo **Externo**, nombre de la app y tu correo. Al terminar pulsa **Publicar app**; mientras esté en "Prueba", solo entran los correos que agregues como usuarios de prueba.
3. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**, tipo **Aplicación web**. En **URI de redireccionamiento autorizados** pega `https://<tu-proyecto>.supabase.co/auth/v1/callback`. Copia el _ID de cliente_ y el _Secreto_.
4. En Supabase → **Authentication → Sign In / Providers → Google**, actívalo y pega los dos datos.
5. En **Authentication → URL Configuration**, pon tu dirección publicada en **Site URL** y agrega en **Redirect URLs** esa dirección y `http://127.0.0.1:5500`.

Mientras no lo actives, el botón avisa que falta configurarlo (sin llevarte a una página de error) y el inicio con correo sigue funcionando. Para crear una cuenta con correo: **Authentication → Users → Add user**, marcando **Auto Confirm User**.

### Paso 3. Datos de prueba (opcional)

Abre `supabase/seed.sql`, cambia `CAMBIA-ESTO@correo.com` por el correo de una cuenta que ya haya entrado una vez, y ejecútalo. Esos datos serán solo de esa cuenta.

### Paso 4. Abrir la página

Abre la carpeta en VS Code, instala la extensión **Live Server** y haz clic derecho sobre `index.html` → **Open with Live Server**. Los módulos de `js/` necesitan un servidor: abrir el archivo con doble clic no funciona.

No hay que crear ningún archivo de configuración: `js/config/conexion.js` ya viene en el repositorio.

> **Importante:** no compartas este proyecto de Supabase con otra aplicación tuya. La configuración de inicio de sesión (Site URL, Redirect URLs) es **una sola por proyecto**, así que dos aplicaciones en el mismo proyecto se cruzan: al entrar en una, Supabase puede devolverte a la otra.

### Paso 5 (opcional). Activar el modelo de lenguaje

El asistente funciona sin esto, con su análisis local. Para que además responda un modelo:

1. Consigue una clave en [console.anthropic.com](https://console.anthropic.com) (es un servicio de pago, aparte del plan de Claude).
2. En Supabase → **Edge Functions → Secrets**, añade `ANTHROPIC_API_KEY` con esa clave.

La clave vive solo en el servidor: **nunca viaja al navegador**.

## 5. Seguridad

**La clave `anon` de `js/config/conexion.js` es pública a propósito.** Viaja al navegador de cualquiera que abra la página, y por eso puede estar en GitHub. Lo que protege los datos no es esconderla, sino las reglas de la base (RLS).

| Quién                  | Qué puede hacer                                   |
| ---------------------- | ------------------------------------------------- |
| Alguien sin sesión     | **Nada.** Ni siquiera ver la lista de disciplinas |
| Un profesor con sesión | Todo, pero **solo con sus propias filas**         |
| Otro profesor          | No ve ni puede tocar los datos del primero        |

Cómo está hecho:

- Cada tabla tiene la columna **`profesor_id`**, que la base llena sola con `auth.uid()` (el usuario que hace la petición). La aplicación nunca la envía, así que no se puede falsificar.
- **RLS activado** en las tres tablas. Las políticas solo dejan leer, crear, editar o borrar filas donde `profesor_id = auth.uid()`. Además, no se puede inscribir un estudiante en la disciplina de otro profesor ni tomar asistencia a un estudiante ajeno.
- **GRANT y REVOKE** como segundo candado: al rol `anon` se le quita todo acceso a las tablas.

Se puede comprobar en el SQL Editor:

```sql
begin;
set local role anon;
select count(*) from public.estudiantes;  -- permission denied
rollback;
```

**Otras medidas:** los textos de los usuarios se escriben con `textContent` y React los escapa, así que un nombre como `<img src=x onerror=...>` se ve como texto y no se ejecuta. El código no usa `innerHTML`. Las consultas van por el SDK con los valores separados del texto de la consulta, así que no hay inyección de SQL. **La clave `service_role` nunca se usa en el navegador.**

## 6. El asistente: qué es IA y qué no

Esta distinción es importante para explicar el proyecto con honestidad.

|                | Análisis local                                         | Modelo de lenguaje                           |
| -------------- | ------------------------------------------------------ | -------------------------------------------- |
| Qué es         | Reglas y estadística sobre tus datos                   | Claude, a través de la Edge Function         |
| Dónde corre    | En el navegador                                        | En el servidor de Supabase y luego en la API |
| Necesita clave | No                                                     | Sí (`ANTHROPIC_API_KEY`)                     |
| Qué produce    | Los hallazgos, el resumen y las respuestas de respaldo | Las respuestas escritas a tus preguntas      |

**El análisis local** calcula un puntaje de riesgo de que un estudiante se retire, sumando reglas explícitas: faltar a clases seguidas, asistir a menos del 60 % de las últimas clases y tener el pago pendiente o vencido. Cada conclusión muestra la regla que la produjo («faltó a las últimas 3 clases seguidas»). No es un modelo entrenado, y por eso se puede explicar entera.

Además muestra cifras por disciplina, la tendencia de la asistencia (últimos 7 días frente a los 7 anteriores), quién no tiene asistencia registrada y una lista de cobro ordenada por urgencia. Cada hallazgo termina con un «Qué hacer». Entiende preguntas escritas de muchas formas: sin importar tildes ni mayúsculas, con sinónimos («morosos», «deben», «sin pagar»; «no vienen», «faltas») y nombrando una disciplina («¿cómo va guitarra?») o un estudiante («¿cómo va Samuel?»). Hay botones con preguntas sugeridas.

**Al modelo** solo se le envían **cifras agrupadas**: totales de estudiantes activos, al día, pendientes, vencidos, en riesgo, con faltas seguidas, asistencia promedio, la tendencia semanal y esas mismas cifras por disciplina. Nunca nombres, teléfonos ni datos de los acudientes, y si la pregunta nombra a un estudiante responde solo el análisis local. La función exige sesión iniciada y rechaza peticiones demasiado grandes. Si no hay clave configurada, la función responde que no está disponible y la aplicación contesta con el análisis local, sin que la persona note una caída.

## 7. Solución de problemas

| Qué ves                                                                   | Causa probable                                                     | Qué hacer                                                    |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| «La aplicación no pudo empezar»                                           | No cargó la librería de Supabase o la página se abrió sin servidor | Usa Live Server y revisa que haya Internet                   |
| «Correo o contraseña incorrectos»                                         | Datos mal escritos o el usuario no existe                          | Revisa **Authentication → Users**                            |
| «El inicio con Google todavía no está activado»                           | Falta configurar el proveedor                                      | Paso 2, o entra con correo y contraseña                      |
| Google dice que la app no está verificada o no deja entrar a otra persona | La pantalla de consentimiento sigue en modo "Prueba"               | Google Cloud → Pantalla de consentimiento → **Publicar app** |
| Al entrar con Google me manda a otra aplicación                           | Ese proyecto de Supabase lo comparten dos aplicaciones             | Usa un proyecto de Supabase propio                           |
| Entré y no veo ningún estudiante                                          | Es una cuenta nueva: cada profesor empieza vacío                   | Crea una disciplina y luego tus estudiantes                  |
| «No se pudo conectar con Supabase»                                        | Sin Internet, o el proyecto está **pausado**                       | Entra a supabase.com y pulsa **Restore project**             |
| La página se ve sin colores                                               | Falta `estilos.css`                                                | Regenéralo con `npm install` y `npm run css`                 |
| Una clase de Tailwind nueva no hace nada                                  | `estilos.css` se compiló antes                                     | Ejecuta `npm run css`                                        |
| El asistente dice «análisis local»                                        | No hay clave configurada                                           | Es normal. Paso 5 si quieres el modelo                       |

## 8. Publicar en Internet

El proyecto es HTML, CSS y JavaScript, así que se publica en cualquier hosting estático.

**Vercel:** entra con tu cuenta de GitHub, **Add New → Project**, elige el repositorio y pulsa **Deploy**. No hay paso de compilación. Desde ahí, cada push publica solo.

Si ya tienes el proyecto creado, revisa en **Settings → Environments → Production** que la **Production Branch** sea la rama donde subes los cambios. Y si tienes varios proyectos en Vercel, comprueba que estás mirando el que corresponde a esta aplicación: cada uno tiene su propia dirección.

Después de publicar, agrega la dirección en Supabase → **Authentication → URL Configuration** para que el inicio de sesión con Google funcione.

## 9. Cómo explicar el proyecto

### La idea en una frase

> «Es una herramienta para que un profesor lleve al día a sus estudiantes: quién está matriculado, quién debe la mensualidad y quién asistió cada clase, con una base de datos que solo le entrega a cada profesor sus propios datos.»

### Lo que vale la pena señalar

1. **Entrar no es ver todo.** Cualquiera puede registrarse con Google, pero cada profesor solo ve sus filas. Es la diferencia entre _autenticación_ (quién eres) y _autorización_ (qué puedes hacer), resuelta con `profesor_id` y RLS.
2. **La seguridad está en la base, no en la pantalla.** Esconder un botón no protege nada: quien escriba la petición a mano se lo salta. Las reglas RLS no.
3. **Validación en dos capas.** El formulario avisa rápido y en español; la base vuelve a revisar con `CHECK` y no se puede saltar.
4. **Borrado lógico.** Un estudiante que se retira se desactiva, no se borra, para conservar su historial de asistencia.
5. **La clave de la IA no está en el navegador.** Vive en una Edge Function. Si estuviera en el código, cualquiera podría copiarla y gastarla.
6. **React solo donde ayuda.** En Asistencia, mover un interruptor cambia el texto, el color, el resumen y el aviso de cambios sin guardar; React los mantiene de acuerdo solo. En el resto, JavaScript vainilla es más simple.

### Preguntas que pueden hacer

**¿La clave de Supabase no es peligrosa estando en el código?**
No, porque es la clave pública, hecha para ir en el navegador. Con ella sola no se puede leer nada: las reglas de la base exigen sesión y autorización. La clave `service_role`, que sí se salta esas reglas, nunca está en el código.

**¿Qué pasa si alguien entra con un Gmail cualquiera?**
Se registra y entra a una cuenta vacía: puede crear sus propias disciplinas y estudiantes, pero nunca ve los de otro profesor. Eso lo garantiza la base de datos, no la pantalla.

**¿Por qué el código está en tantos archivos?**
Cada carpeta de `js/` tiene una sola responsabilidad: `datos/` solo habla con Supabase, `vistas/` solo dibuja, `asistente/analisis.js` solo calcula. Así un cambio en la base no obliga a tocar la pantalla, y cada archivo se entiende por separado. Se usan módulos ES nativos del navegador (`import`/`export`), sin compilador.

**¿El asistente es inteligencia artificial de verdad?**
Tiene dos partes. Los hallazgos y el resumen son reglas y estadística sobre los propios datos, y por eso cada conclusión se puede explicar. Las respuestas escritas sí las da un modelo de lenguaje, a través de una función en el servidor que guarda la clave; si no hay clave, responde el análisis local.

**¿Por qué SQL y no MongoDB?**
Porque los datos están relacionados: cada estudiante pertenece a una disciplina y cada asistencia a un estudiante y una fecha. SQL lo resuelve con claves foráneas, y además valida los datos dentro de la base.

**¿Por qué no se borran los estudiantes?**
Porque la asistencia está ligada a ellos con `ON DELETE CASCADE`: borrar al estudiante borraría su historial. Desactivarlo lo saca de las listas pero conserva todo.

## 10. Límites conocidos

- **Un solo tipo de usuario.** Cada profesor administra lo suyo. No hay un rol de director que vea a todos los profesores.
- **Cualquier cuenta de Google puede usar el asistente con modelo** si se configura la clave: conviene vigilar el consumo en console.anthropic.com.
- **No hay registro de pagos con importes ni fechas.** Solo el estado: al día, pendiente o vencido.
- **No se envían correos ni recordatorios.** El asistente redacta el mensaje, pero hay que copiarlo y enviarlo a mano.
- **Tailwind compilado a mano.** Si se agregan clases nuevas hay que ejecutar `npm run css`.
- **El proyecto gratuito de Supabase se pausa** tras unos días sin uso.
- **No hay pruebas automáticas en el repositorio.** Durante el desarrollo se usaron pruebas de navegador con una base simulada, pero necesitan Node y Playwright.
- **La auditoría de `docs/` describe una versión anterior.**
