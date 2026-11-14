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

Al abrir la página aparece el inicio de sesión. Dentro hay cinco vistas:

| Vista | Qué permite hacer |
|---|---|
| **Dashboard** | Cómo va la asistencia de hoy, cuántos estudiantes activos hay y cómo están los pagos |
| **Estudiantes** | Crear, editar y desactivar. Buscar por nombre y filtrar por disciplina. El acudiente es obligatorio para menores de 18 |
| **Asistencia** | Elegir la fecha, marcar quién vino y guardar. Si ya había registro ese día, se actualiza en vez de duplicarse |
| **Disciplinas** | Las actividades de la academia (fútbol, guitarra, danza…). Cada estudiante pertenece a una |
| **Asistente** | Señala quién podría estar retirándose y a quién hay que cobrarle, y responde preguntas sobre tus datos |

Los estudiantes no se borran: se **desactivan**, para no perder su historial de asistencia.

## 2. Arquitectura

```
 ┌────────────────────────────────────────────┐
 │  NAVEGADOR                                 │
 │  index.html + app.js                       │
 │  + asistencia-react.js (vista Asistencia)  │
 │  + asistente-ia.js     (análisis y chat)   │
 └──────────────────┬─────────────────────────┘
                    │  sesión iniciada (rol authenticated)
                    ▼
 ┌────────────────────────────────────────────────────────────┐
 │  SUPABASE (PostgreSQL)                                     │
 │   · Auth: correo y contraseña, o Google                    │
 │   · RLS: solo quien esté en "administradores"  ← portero   │
 │   · CHECK / UNIQUE / claves foráneas           ← inspector │
 │   · Edge Function "asistente": guarda la clave de la IA    │
 └────────────────────────────────────────────────────────────┘
```

Lo importante: **el navegador no decide la seguridad**. Aunque alguien abra el código o escriba sus propias peticiones, la base de datos vuelve a revisar quién pregunta y qué pide.

## 3. Tecnologías y archivos

| Tecnología | Para qué | Cómo se carga |
|---|---|---|
| HTML5 | La página y sus cinco vistas | `index.html` |
| Tailwind CSS 3.4.17 | Estilos y diseño responsive | Compilado en `estilos.css` |
| JavaScript (vainilla) | Casi toda la lógica | `app.js` |
| React 18.3.1 + htm 3.1.1 | La vista de Asistencia | CDN (jsDelivr), sin compilador |
| Supabase | Base de datos, inicio de sesión y reglas de acceso | SDK `@supabase/supabase-js` 2.117.2 por CDN |
| Deno (Edge Function) | Guardar la clave de la IA en el servidor | `supabase/functions/asistente/` |
| Vercel | Publica la página | Automático en cada push |

```
app-local/
├── index.html              La página: login, «sin permiso» y las 5 vistas
├── app.js                  Lógica: sesión, estudiantes, asistencia, disciplinas, dashboard
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
    ├── schema.sql                     Las 4 tablas, sus reglas y la seguridad
    ├── seed.sql                       Datos de prueba: 3 disciplinas y 10 estudiantes
    ├── administrador.sql              Da acceso al panel a una persona
    └── functions/asistente/index.ts   Edge Function que habla con el modelo de lenguaje
```

## 4. Ponerlo a funcionar

### Paso 1. Preparar la base de datos

En Supabase → **SQL Editor** → New query, ejecuta en este orden (pega el archivo completo y pulsa Run):

1. `supabase/schema.sql` — crea las tablas y deja la base cerrada.
2. `supabase/seed.sql` — datos de prueba (opcional).

Los dos se pueden ejecutar varias veces sin borrar nada.

### Paso 2. Crear tu usuario y autorizarlo

Son dos cosas distintas: **entrar** y **tener permiso**.

1. **Authentication → Users → Add user → Create new user.** Escribe un correo y una contraseña, y marca **Auto Confirm User**.
2. Abre `supabase/administrador.sql`, cambia `CAMBIA-ESTO@correo.com` por ese correo y ejecútalo.

Sin el paso 2 puedes iniciar sesión, pero la aplicación te dirá que esa cuenta no tiene acceso.

### Paso 3. Abrir la página

Abre la carpeta en VS Code, instala la extensión **Live Server** y haz clic derecho sobre `index.html` → **Open with Live Server**.

No hay que crear ningún archivo de configuración: `conexion.js` ya viene en el repositorio.

### Paso 4 (opcional). Entrar con Google

El botón ya está programado. Para activarlo:

1. En **Google Cloud Console**, crea un proyecto, configura la pantalla de consentimiento y crea credenciales de tipo **ID de cliente de OAuth** para aplicación web. Como URI de redirección usa el que te muestra Supabase en el paso siguiente.
2. En Supabase → **Authentication → Sign In / Providers → Google**, activa el proveedor y pega el *Client ID* y el *Client Secret*.
3. En **Authentication → URL Configuration**, pon tu dirección publicada en **Site URL** y agrega en **Redirect URLs** esa dirección y `http://127.0.0.1:5500`.

Mientras no lo actives, el botón explica que falta configurarlo y el inicio de sesión con correo sigue funcionando.

> **Importante:** no compartas este proyecto de Supabase con otra aplicación tuya. La configuración de inicio de sesión (Site URL, Redirect URLs) es **una sola por proyecto**, así que dos aplicaciones en el mismo proyecto se cruzan: al entrar en una, Supabase puede devolverte a la otra.

### Paso 5 (opcional). Activar el modelo de lenguaje

El asistente funciona sin esto, con su análisis local. Para que además responda un modelo:

1. Consigue una clave en [console.anthropic.com](https://console.anthropic.com) (es un servicio de pago, aparte del plan de Claude).
2. En Supabase → **Edge Functions → Secrets**, añade `ANTHROPIC_API_KEY` con esa clave.

La clave vive solo en el servidor: **nunca viaja al navegador**.

## 5. Seguridad

**La clave `anon` de `conexion.js` es pública a propósito.** Viaja al navegador de cualquiera que abra la página, y por eso puede estar en GitHub. Lo que protege los datos no es esconderla, sino las reglas de la base (RLS).

| Quién | Qué puede hacer |
|---|---|
| Alguien sin sesión | **Nada.** Ni siquiera ver la lista de disciplinas |
| Con sesión, sin autorizar | **Nada.** Ve un mensaje de que su cuenta no tiene acceso |
| En la tabla `administradores` | Todo |

Cómo está hecho:

- **RLS activado** en las cuatro tablas. Las políticas exigen `es_administrador()`, una función que mira si tu usuario está en la tabla `administradores`.
- **GRANT y REVOKE** como segundo candado: al rol `anon` se le quita todo acceso a las tablas.
- La tabla `administradores` **no tiene ninguna política**: no se lee ni se escribe desde la aplicación, solo desde el SQL Editor.

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

| | Análisis local | Modelo de lenguaje |
|---|---|---|
| Qué es | Reglas y estadística sobre tus datos | Claude, a través de la Edge Function |
| Dónde corre | En el navegador | En el servidor de Supabase y luego en la API |
| Necesita clave | No | Sí (`ANTHROPIC_API_KEY`) |
| Qué produce | Los hallazgos, el resumen y las respuestas de respaldo | Las respuestas escritas a tus preguntas |

**El análisis local** calcula un puntaje de riesgo de que un estudiante se retire, sumando reglas explícitas: faltar a clases seguidas, asistir a menos del 60 % de las últimas clases y tener el pago pendiente o vencido. Cada conclusión muestra la regla que la produjo («faltó a las últimas 3 clases seguidas»). No es un modelo entrenado, y por eso se puede explicar entera.

**Al modelo** solo se le envían **cifras agrupadas**: cuántos estudiantes activos hay, cuántos están al día, el porcentaje de asistencia. Nunca nombres, teléfonos ni datos de los acudientes. Si no hay clave configurada, la función responde que no está disponible y la aplicación contesta con el análisis local, sin que la persona note una caída.

## 7. Solución de problemas

| Qué ves | Causa probable | Qué hacer |
|---|---|---|
| «La aplicación no pudo empezar» | Falta `conexion.js` o no cargó la librería de Supabase | Revisa que el archivo esté junto a `index.html` y que haya Internet |
| «Esta cuenta no tiene acceso» | Iniciaste sesión, pero el correo no está en `administradores` | Ejecuta `supabase/administrador.sql` con ese correo |
| «Correo o contraseña incorrectos» | Datos mal escritos o el usuario no existe | Revisa **Authentication → Users** |
| «El inicio de sesión con Google no está activado» | Falta configurar el proveedor | Paso 4, o entra con correo y contraseña |
| Al entrar con Google me manda a otra aplicación | Ese proyecto de Supabase lo comparten dos aplicaciones | Usa un proyecto de Supabase propio (ver el aviso del paso 4) |
| «Tu cuenta no tiene permiso para ver estos datos» | Te quitaron de `administradores`, o no se ejecutó `schema.sql` | Vuelve a ejecutar los dos SQL |
| «No se pudo conectar con Supabase» | Sin Internet, o el proyecto está **pausado** | Entra a supabase.com y pulsa **Restore project** |
| La página se ve sin colores | Falta `estilos.css` | Regenéralo con `npm install` y `npm run css` |
| Una clase de Tailwind nueva no hace nada | `estilos.css` se compiló antes | Ejecuta `npm run css` |
| El asistente dice «análisis local» | No hay clave configurada | Es normal. Paso 5 si quieres el modelo |

## 8. Publicar en Internet

El proyecto es HTML, CSS y JavaScript, así que se publica en cualquier hosting estático.

**Vercel:** entra con tu cuenta de GitHub, **Add New → Project**, elige el repositorio y pulsa **Deploy**. No hay paso de compilación. Desde ahí, cada push publica solo.

Si ya tienes el proyecto creado, revisa en **Settings → Environments → Production** que la **Production Branch** sea la rama donde subes los cambios. Y si tienes varios proyectos en Vercel, comprueba que estás mirando el que corresponde a esta aplicación: cada uno tiene su propia dirección.

Después de publicar, agrega la dirección en Supabase → **Authentication → URL Configuration** para que el inicio de sesión con Google funcione.

## 9. Cómo explicar el proyecto

### La idea en una frase

> «Es una herramienta para que un profesor lleve al día a sus estudiantes: quién está matriculado, quién debe la mensualidad y quién asistió cada clase, con una base de datos que no le entrega información a nadie que no esté autorizado.»

### Lo que vale la pena señalar

1. **Entrar no es tener permiso.** Cualquiera puede iniciar sesión; solo ve los datos quien esté en la tabla `administradores`. Es la diferencia entre *autenticación* (quién eres) y *autorización* (qué puedes hacer).
2. **La seguridad está en la base, no en la pantalla.** Esconder un botón no protege nada: quien escriba la petición a mano se lo salta. Las reglas RLS no.
3. **Validación en dos capas.** El formulario avisa rápido y en español; la base vuelve a revisar con `CHECK` y no se puede saltar.
4. **Borrado lógico.** Un estudiante que se retira se desactiva, no se borra, para conservar su historial de asistencia.
5. **La clave de la IA no está en el navegador.** Vive en una Edge Function. Si estuviera en el código, cualquiera podría copiarla y gastarla.
6. **React solo donde ayuda.** En Asistencia, mover un interruptor cambia el texto, el color, el resumen y el aviso de cambios sin guardar; React los mantiene de acuerdo solo. En el resto, JavaScript vainilla es más simple.

### Preguntas que pueden hacer

**¿La clave de Supabase no es peligrosa estando en el código?**
No, porque es la clave pública, hecha para ir en el navegador. Con ella sola no se puede leer nada: las reglas de la base exigen sesión y autorización. La clave `service_role`, que sí se salta esas reglas, nunca está en el código.

**¿Qué pasa si alguien entra con un Gmail cualquiera?**
Inicia sesión, pero la aplicación le dice que su cuenta no está autorizada y no ve ningún dato.

**¿El asistente es inteligencia artificial de verdad?**
Tiene dos partes. Los hallazgos y el resumen son reglas y estadística sobre los propios datos, y por eso cada conclusión se puede explicar. Las respuestas escritas sí las da un modelo de lenguaje, a través de una función en el servidor que guarda la clave; si no hay clave, responde el análisis local.

**¿Por qué SQL y no MongoDB?**
Porque los datos están relacionados: cada estudiante pertenece a una disciplina y cada asistencia a un estudiante y una fecha. SQL lo resuelve con claves foráneas, y además valida los datos dentro de la base.

**¿Por qué no se borran los estudiantes?**
Porque la asistencia está ligada a ellos con `ON DELETE CASCADE`: borrar al estudiante borraría su historial. Desactivarlo lo saca de las listas pero conserva todo.

## 10. Límites conocidos

- **Un solo tipo de usuario.** Quien está en `administradores` puede hacer todo. Faltaría separar al director del profesor que solo toma asistencia.
- **No hay registro de pagos con importes ni fechas.** Solo el estado: al día, pendiente o vencido.
- **No se envían correos ni recordatorios.** El asistente redacta el mensaje, pero hay que copiarlo y enviarlo a mano.
- **Tailwind compilado a mano.** Si se agregan clases nuevas hay que ejecutar `npm run css`.
- **El proyecto gratuito de Supabase se pausa** tras unos días sin uso.
- **No hay pruebas automáticas en el repositorio.** Durante el desarrollo se usaron pruebas de navegador con una base simulada, pero necesitan Node y Playwright.
- **La auditoría de `docs/` describe una versión anterior.**
