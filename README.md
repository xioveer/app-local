# Academia GA · Gestor de Academia

Aplicación web completa para una **academia formativa** (deportes, música, danza). Tiene dos caras:

- **Un sitio público** donde cualquiera ve los servicios con sus tarifas y escribe para pedir un cupo.
- **Un panel privado**, con inicio de sesión, donde la academia lleva sus estudiantes, los pagos, la asistencia, los mensajes recibidos y un asistente que analiza los datos.

Es un proyecto escolar hecho con herramientas simples: **HTML, Tailwind CSS y JavaScript** en el navegador, y **Supabase** (PostgreSQL) como base de datos. Casi todo está en JavaScript "vainilla"; la excepción es la **vista de Asistencia, hecha con React**, para comparar los dos estilos en el mismo proyecto.

> Los estudiantes, los precios y la academia son **ficticios**: sirven para demostrar la aplicación.

## Contenido

1. [Qué hace](#1-qué-hace)
2. [Arquitectura](#2-arquitectura)
3. [Tecnologías](#3-tecnologías)
4. [Estructura de archivos](#4-estructura-de-archivos)
5. [Ponerlo a funcionar](#5-ponerlo-a-funcionar)
6. [Seguridad: quién puede ver qué](#6-seguridad-quién-puede-ver-qué)
7. [El asistente: qué es IA y qué no](#7-el-asistente-qué-es-ia-y-qué-no)
8. [Solución de problemas](#8-solución-de-problemas)
9. [Publicar en Internet](#9-publicar-en-internet)
10. [Cómo explicar el proyecto](#10-cómo-explicar-el-proyecto)
11. [Límites conocidos](#11-límites-conocidos)

**Documento aparte:** [Análisis técnico y auditoría](docs/analisis-tecnico-y-auditoria.md), escrito sobre una versión anterior del proyecto.

---

## 1. Qué hace

### El sitio público (`index.html`)

| Sección | Qué tiene |
|---|---|
| **Portada** | La marca, qué hace la academia y las disciplinas, leídas de la base de datos |
| **Servicios y tarifas** | Los planes con su precio mensual. El botón «Me interesa» deja ese servicio ya elegido en el formulario |
| **Contacto** | Formulario que guarda el mensaje en la base de datos. Pide nombre, mensaje y al menos un teléfono o un correo |

### El panel (`admin.html`)

Hay que iniciar sesión, y además la cuenta debe estar autorizada.

| Vista | Qué permite hacer |
|---|---|
| **Dashboard** | Asistencia de hoy, estudiantes activos y estado de los pagos |
| **Estudiantes** | Crear, editar y desactivar. Buscar por nombre y filtrar por disciplina. El acudiente es obligatorio para menores de 18 |
| **Asistencia** | Elegir la fecha, marcar quién vino y guardar. Si ya había registro ese día, se actualiza |
| **Disciplinas** | Las actividades de la academia |
| **Servicios** | Crear y editar los planes con su tarifa, y decidir cuáles se ven en la página pública |
| **Mensajes** | Lo que llega del formulario, con un globo que avisa cuántos están sin leer |
| **Asistente** | Señala quién podría retirarse, cuánto hay por cobrar y responde preguntas sobre los datos |

## 2. Arquitectura

```
 ┌─────────────────────────┐        ┌─────────────────────────┐
 │  index.html + sitio.js  │        │  admin.html + app.js    │
 │  SITIO PÚBLICO          │        │  PANEL PRIVADO          │
 │  Sin iniciar sesión     │        │  + asistencia-react.js  │
 │                         │        │  + asistente-ia.js      │
 └───────────┬─────────────┘        └───────────┬─────────────┘
             │  rol anon                        │  rol authenticated
             │  (leer catálogo,                 │  (todo, si la cuenta está
             │   escribir un mensaje)           │   en administradores)
             ▼                                  ▼
 ┌───────────────────────────────────────────────────────────────┐
 │  SUPABASE (PostgreSQL)                                        │
 │   · RLS: qué puede hacer cada rol          ← el "portero"     │
 │   · CHECK / UNIQUE / claves foráneas       ← el "inspector"   │
 │   · Auth: correo y contraseña, o Google                       │
 │   · Edge Function "asistente": guarda la clave de la IA       │
 └───────────────────────────────────────────────────────────────┘
```

Lo importante: **el navegador no decide la seguridad**. Aunque alguien abra el código o escriba sus propias peticiones, la base de datos vuelve a revisar quién pregunta y qué pide.

## 3. Tecnologías

| Tecnología | Para qué | Cómo se carga |
|---|---|---|
| HTML5 | Las dos páginas | `index.html`, `admin.html` |
| Tailwind CSS 3.4.17 | Estilos y diseño responsive | Compilado en `estilos.css` |
| JavaScript (vainilla) | Casi toda la lógica | `sitio.js`, `app.js` |
| React 18.3.1 + htm 3.1.1 | La vista de Asistencia | CDN (jsDelivr), sin compilador |
| Supabase | Base de datos, inicio de sesión y reglas de acceso | SDK `@supabase/supabase-js` 2.117.2 por CDN |
| Deno (Edge Function) | Guardar la clave de la IA en el servidor | `supabase/functions/asistente/` |
| Vercel | Publica el sitio | Automático en cada push |

## 4. Estructura de archivos

```
app-local/
├── index.html              Sitio público: portada, servicios y contacto
├── sitio.js                Su lógica: catálogo y formulario de contacto
├── admin.html              Panel: login y las 7 vistas
├── app.js                  Su lógica: sesión, estudiantes, servicios, mensajes
├── asistencia-react.js     La vista de Asistencia, hecha con React
├── asistente-ia.js         El asistente: análisis local y preguntas
├── conexion.js             Dirección y clave PÚBLICA de Supabase
├── estilos.css             Tailwind compilado (no se edita a mano)
├── estilos.entrada.css     Las clases propias: boton, campo, tarjeta...
├── tailwind.config.js      Colores (tinta, sol, papel) y letras
├── README.md               Este archivo
├── CLAUDE.md               Resumen para un asistente de IA que continúe
├── docs/                   Auditoría técnica y su evidencia
└── supabase/
    ├── schema.sql                     Tablas, reglas y seguridad. Deja la base SEGURA
    ├── seed.sql                       Datos de prueba: disciplinas, estudiantes y servicios
    ├── administrador.sql              Da acceso al panel a una persona
    └── functions/asistente/index.ts   Edge Function que habla con el modelo de lenguaje
```

## 5. Ponerlo a funcionar

### Paso 1. Preparar la base de datos

En Supabase → **SQL Editor** → New query, ejecuta en este orden (pega el archivo completo y pulsa Run):

1. `supabase/schema.sql` — crea las tablas y deja la base segura.
2. `supabase/seed.sql` — datos de prueba (opcional).

Los dos se pueden ejecutar varias veces sin borrar nada.

### Paso 2. Crear tu usuario y autorizarlo

Son dos cosas distintas: **entrar** y **tener permiso**.

1. **Authentication → Users → Add user → Create new user.** Escribe un correo y una contraseña, y marca **Auto Confirm User**.
2. Abre `supabase/administrador.sql`, cambia `CAMBIA-ESTO@correo.com` por ese correo y ejecútalo.

Sin el paso 2 puedes iniciar sesión, pero el panel te dirá que esa cuenta no tiene acceso. Está hecho a propósito: este proyecto de Supabase puede tener usuarios de otras aplicaciones.

### Paso 3. Abrir las páginas

Abre la carpeta en VS Code, instala la extensión **Live Server**, y haz clic derecho sobre `index.html` → **Open with Live Server**. El panel está en `admin.html` (botón «Panel» arriba a la derecha).

No hay que crear ningún archivo de configuración: `conexion.js` ya viene en el repositorio.

### Paso 4 (opcional). Entrar con Google

El botón «Entrar con Google» ya está programado. Para activarlo:

1. En **Google Cloud Console**, crea un proyecto, configura la pantalla de consentimiento y crea credenciales de tipo **ID de cliente de OAuth** para aplicación web. Como URI de redirección autorizado usa el que te muestra Supabase en el paso siguiente.
2. En Supabase → **Authentication → Sign In / Providers → Google**, activa el proveedor y pega el *Client ID* y el *Client Secret*.
3. En **Authentication → URL Configuration**, pon tu dirección publicada en **Site URL** y agrega en **Redirect URLs** tanto esa dirección como `http://127.0.0.1:5500/admin.html`.

Mientras no lo actives, el botón explica que falta configurarlo y el inicio de sesión con correo sigue funcionando.

### Paso 5 (opcional). Activar el modelo de lenguaje

El asistente funciona sin esto, con su análisis local. Para que además responda un modelo:

1. Consigue una clave en [console.anthropic.com](https://console.anthropic.com) (es un servicio de pago, aparte del plan de Claude).
2. En Supabase → **Edge Functions → Secrets**, añade `ANTHROPIC_API_KEY` con esa clave.

La Edge Function `asistente` ya está desplegada. La clave vive solo en el servidor: **nunca viaja al navegador**.

## 6. Seguridad: quién puede ver qué

**La clave `anon` de `conexion.js` es pública a propósito.** Viaja al navegador de cualquiera que abra la página, y por eso puede estar en GitHub. Lo que protege los datos no es esconderla, sino las reglas de la base de datos (RLS).

| Quién | Catálogo (disciplinas y servicios) | Enviar un mensaje | Leer mensajes | Estudiantes y asistencia |
|---|---|---|---|---|
| Visitante (`anon`) | Leer | Sí | **No** | **No** |
| Con sesión, sin autorizar | Leer | Sí | **No** | **No** |
| Administrador | Todo | Sí | Todo | Todo |

Cómo está hecho:

- **RLS activado** en las seis tablas. Las políticas de los datos de la academia exigen `es_administrador()`, una función que mira si tu usuario está en la tabla `administradores`.
- **GRANT y REVOKE** como segundo candado: al rol `anon` se le quita el acceso a las tablas y solo se le devuelve `select` sobre disciplinas y servicios, e `insert` sobre mensajes.
- La tabla `administradores` **no tiene ninguna política**: no se lee ni se escribe desde la aplicación, solo desde el SQL Editor.
- El formulario de contacto guarda sin leer de vuelta, así que un visitante puede escribir pero nunca ver los mensajes de los demás.

Se puede comprobar en el SQL Editor:

```sql
begin;
set local role anon;
select count(*) from public.servicios;    -- funciona: es el catálogo
select count(*) from public.estudiantes;  -- permission denied
rollback;
```

**Otras medidas:** los textos de los usuarios se escriben con `textContent` y React los escapa, así que un nombre como `<img src=x onerror=...>` se ve como texto y no se ejecuta. El código no usa `innerHTML`. Las consultas van por el SDK con los valores separados del texto de la consulta, así que no hay inyección de SQL. **La clave `service_role` nunca se usa en el navegador.**

## 7. El asistente: qué es IA y qué no

Esta distinción es importante para explicar el proyecto con honestidad.

| | Análisis local | Modelo de lenguaje |
|---|---|---|
| Qué es | Reglas y estadística sobre tus datos | Claude, a través de la Edge Function |
| Dónde corre | En el navegador | En el servidor de Supabase y luego en la API |
| Necesita clave | No | Sí (`ANTHROPIC_API_KEY`) |
| Qué produce | Los hallazgos, el resumen y las respuestas de respaldo | Las respuestas escritas a tus preguntas |

**El análisis local** calcula un puntaje de riesgo de que un estudiante se retire, sumando reglas explícitas: faltar a clases seguidas, asistir a menos del 60 % de las últimas clases y tener el pago pendiente o vencido. Cada conclusión muestra la regla que la produjo («faltó a las últimas 3 clases seguidas»). No es un modelo entrenado, y por eso se puede explicar entera.

**Al modelo** solo se le envían **cifras agrupadas**: cuántos estudiantes activos hay, cuánto se espera facturar, el porcentaje de asistencia. Nunca nombres, teléfonos ni datos de los acudientes. Si no hay clave configurada, la función responde que no está disponible y el panel contesta con el análisis local, sin que la persona note una caída.

## 8. Solución de problemas

| Qué ves | Causa probable | Qué hacer |
|---|---|---|
| «La aplicación no pudo empezar» | Falta `conexion.js` o no cargó la librería de Supabase | Revisa que el archivo esté junto al HTML y que haya Internet |
| «Esta cuenta no tiene acceso» | Iniciaste sesión, pero el correo no está en `administradores` | Ejecuta `supabase/administrador.sql` con ese correo |
| «Correo o contraseña incorrectos» | Datos mal escritos o el usuario no existe | Revisa **Authentication → Users** |
| «El inicio de sesión con Google no está activado» | Falta configurar el proveedor | Paso 4, o entra con correo y contraseña |
| «Tu cuenta no tiene permiso para ver estos datos» | Te quitaron de `administradores`, o no se ejecutó `schema.sql` | Vuelve a ejecutar los dos SQL |
| «No se pudo conectar con Supabase» | Sin Internet, o el proyecto está **pausado** | Entra a supabase.com y pulsa **Restore project** |
| La página se ve sin colores | Falta `estilos.css` | Regenéralo con `npm install` y `npm run css` |
| Una clase de Tailwind nueva no hace nada | `estilos.css` se compiló antes | Ejecuta `npm run css` |
| El sitio público no muestra tarifas | No se ejecutó `seed.sql`, o los servicios están ocultos | Créalos en el panel, en la vista Servicios |
| El asistente dice «análisis local» | No hay clave configurada | Es normal. Paso 5 si quieres el modelo |
| Tras entrar con Google vuelve al login | Falta la dirección en **Redirect URLs** | Paso 4, punto 3 |

## 9. Publicar en Internet

El proyecto es HTML, CSS y JavaScript, así que se publica en cualquier hosting estático.

**Vercel** (el que usa este proyecto): entra con tu cuenta de GitHub, **Add New → Project**, elige el repositorio y pulsa **Deploy**. No hay que configurar nada: no tiene paso de compilación. Desde ahí, cada push publica solo.

Después de publicar, agrega la dirección en Supabase → **Authentication → URL Configuration** (Site URL y Redirect URLs) para que el inicio de sesión con Google funcione.

## 10. Cómo explicar el proyecto

### La idea en una frase

> «Es una aplicación completa para una academia: una página pública donde la gente ve las tarifas y escribe, y un panel privado donde la academia administra sus estudiantes, con una base de datos que decide quién puede ver cada cosa.»

### Lo que vale la pena señalar

1. **Dos caras, una base de datos.** El mismo Supabase atiende al visitante y al administrador, pero les da permisos distintos. Eso es RLS.
2. **Entrar no es tener permiso.** Cualquiera puede iniciar sesión con su Gmail; solo entra al panel quien esté en la tabla `administradores`. Es la diferencia entre *autenticación* (quién eres) y *autorización* (qué puedes hacer).
3. **La clave de la IA no está en el navegador.** Vive en una Edge Function. Si estuviera en el código, cualquiera podría copiarla y gastarla.
4. **Validación en dos capas.** El formulario avisa rápido y en español; la base de datos vuelve a revisar con `CHECK` y no se puede saltar.
5. **React solo donde ayuda.** En Asistencia, mover un interruptor cambia el texto, el color, el resumen y el aviso de cambios sin guardar; React los mantiene de acuerdo solo. En el resto, JavaScript vainilla es más simple.

### Preguntas que pueden hacer

**¿La clave de Supabase no es peligrosa estando en el código?**
No, porque es la clave pública, hecha para ir en el navegador. Lo que decide qué se puede hacer son las reglas de la base. La clave `service_role`, que sí se salta esas reglas, nunca está en el código.

**¿Qué pasa si alguien entra con un Gmail cualquiera?**
Inicia sesión, pero el panel le dice que su cuenta no está autorizada y no ve ningún dato. El permiso lo da la tabla `administradores`, que solo se edita desde Supabase.

**¿El asistente es inteligencia artificial de verdad?**
Tiene dos partes. Los hallazgos y el resumen son reglas y estadística sobre los propios datos, y por eso cada conclusión se puede explicar. Las respuestas escritas sí las da un modelo de lenguaje, a través de una función en el servidor que guarda la clave; si no hay clave, responde el análisis local.

**¿Por qué un formulario de contacto necesita una tabla?**
Porque así el mensaje queda guardado y la academia lo ve en su panel, con quién escribió y qué servicio le interesa. Un formulario que solo manda un correo se pierde.

**¿Por qué SQL y no MongoDB?**
Porque los datos están relacionados: cada estudiante pertenece a una disciplina, cada asistencia a un estudiante y cada mensaje puede apuntar a un servicio. SQL lo resuelve con claves foráneas, y además valida los datos dentro de la base.

## 11. Límites conocidos

- **Un solo tipo de administrador.** Quien está en `administradores` puede hacer todo. Faltaría un rol de profesor que solo tome asistencia.
- **El formulario de contacto no tiene límite de envíos.** Alguien podría enviar muchos mensajes seguidos. Las reglas de longitud limitan el daño, pero faltaría un control por dirección IP.
- **No se envían correos.** Los mensajes se ven en el panel; no llega un aviso.
- **Tailwind compilado a mano.** Si se agregan clases nuevas hay que ejecutar `npm run css`.
- **El proyecto gratuito de Supabase se pausa** tras unos días sin uso.
- **No hay pruebas automáticas en el repositorio.** Durante el desarrollo se usaron pruebas de navegador con una base simulada, pero necesitan Node y Playwright.
- **La auditoría de `docs/` describe una versión anterior**, de cuando el proyecto era solo el panel.
