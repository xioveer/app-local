# AcademiaHub · Documento de Análisis Técnico y Auditoría

> **Auditoría de seguridad · React frente a JavaScript puro · PostgreSQL frente a MongoDB**
>
> Código analizado: rama `claude/epic-planck-7swzxk`, commit `050ae03` · Fecha: 31 de octubre de 2026
> Preparado por Claude (asistente de IA) a petición del equipo, como **material de estudio y apoyo teórico para la exposición**.
> No es una certificación de seguridad ni asesoría legal.

---

## Cómo leer este documento

Un documento de auditoría solo sirve si deja claro **qué se comprobó y qué se supone**. Cada afirmación importante lleva una etiqueta:

| Etiqueta | Significa | ¿Puedo decirlo en la exposición como un hecho? |
|---|---|---|
| ✅ **Verificado** | Lo ejecuté y el resultado está guardado en [`docs/evidencia/`](evidencia/) | Sí, y puedes enseñar el archivo |
| 🔎 **Análisis** | Sale de leer el código o el diseño; está razonado, pero no lo ejecuté | Sí, explicando que es un análisis |
| 📚 **Conocimiento general** | Práctica habitual de la industria; **no la probé aquí** | Solo tras confirmarla en la documentación oficial |

> **Regla de oro para exponer:** si el profesor pregunta «¿eso lo probaron?», la etiqueta te dice la respuesta honesta.

**Contenido**

0. [Resumen ejecutivo](#0-resumen-ejecutivo)
1. [Alcance, método y límites](#1-alcance-método-y-límites)
2. [Parte 1 · Auditoría de seguridad y pruebas de robustez](#2-parte-1--auditoría-de-seguridad-y-pruebas-de-robustez)
3. [Parte 2 · React frente a JavaScript puro](#3-parte-2--react-frente-a-javascript-puro)
4. [Parte 3 · SQL (PostgreSQL/Supabase) frente a NoSQL (MongoDB)](#4-parte-3--sql-postgresqlsupabase-frente-a-nosql-mongodb)
5. [Plan de acción priorizado](#5-plan-de-acción-priorizado)
6. [Anexos](#6-anexos)

---

## 0. Resumen ejecutivo

### 0.1 Las seis conclusiones

1. **La cerradura está en la base de datos, no en la pantalla de login.** Con `schema.sql`, el rol anónimo (el de la *anon key*) ni siquiera puede leer: `permission denied` (✅ E1-A). Por eso saltarse el login desde las herramientas del navegador no da acceso a ningún dato (✅ AT-01). Pero también es cierto lo contrario: si se ejecuta `modo_sin_login.sql`, **cualquiera** que conozca la dirección del proyecto puede leer, cambiar y borrar todo. En la prueba, un rol anónimo borró los 10 estudiantes y el borrado en cascada se llevó también la asistencia (✅ E1-E).

2. **No se pudo hacer XSS.** Se guardaron 14 cargas maliciosas (`<img onerror>`, `<svg onload>`, `<script>`, `<iframe srcdoc>`, `javascript:`, plantillas, `<style>`…) usando los formularios reales: **0 se ejecutaron** y no se creó ningún elemento peligroso (✅ AT-04). La causa es de diseño: el código no usa `innerHTML` (✅ búsqueda en el código) y siempre pone los textos con `textContent` o con React, que escapa por defecto.

3. **Lo que sí encontró la auditoría:**
   - **Un error real**, ya corregido: pulsar Enter dos veces seguidas creaba **dos** estudiantes (✅ AT-05, arreglado en `050ae03`).
   - **Tres huecos de validación** que existen solo en el navegador: la base acepta nombres de 5 MB, asistencias de fechas futuras y disciplinas que solo cambian en mayúsculas (✅ E1-G). Hay SQL de endurecimiento probado, **no aplicado a la base real**.
   - **Un único rol.** Todo usuario con sesión puede hacer todo (✅ E1-F); por eso los registros públicos de Supabase deben estar desactivados. Hay una política por rol probada (✅ E1-N).
   - Scripts de CDN **sin *Subresource Integrity*** (🔎).

4. **React frente a vainilla: la velocidad no es el argumento.** Con 100 estudiantes ambos dibujan la tabla en ≈ 14 ms (✅). React gana claramente al escribir en el buscador con muchas filas (con 1.000 filas, ≈ 164 ms por tecla redibujando todo «a la vainilla» frente a ≈ 13 ms con React), pero un vainilla optimizado a mano le gana a React al cambiar una sola fila (12 ms frente a 116 ms con 1.000 filas) (✅). React cuesta ≈ 47 KB más de JavaScript comprimido y conceptos nuevos. **Recomendación:** quedarse con vainilla y la «isla» de React que ya existe.

5. **Relacional (PostgreSQL), sin dudas.** Las tres consultas del dashboard dan **exactamente el mismo resultado** en SQL y en MongoDB (✅ verificado con *mingo*, ver límites), pero SQL las expresa con un `JOIN` y deja que la **base garantice** las reglas (clave foránea, `UNIQUE`, `CHECK`, cascada), mientras que en MongoDB esas garantías hay que construirlas en la aplicación. Además, Supabase (Auth, RLS, API automática) está construido sobre PostgreSQL.

6. **Límites importantes:** no se tocó el proyecto Supabase real del equipo; las pruebas del navegador usaron un Supabase *simulado*; MongoDB se comprobó con un motor compatible, no con un servidor real. Los detalles están en la [sección 1](#1-alcance-método-y-límites).

### 0.2 Hallazgos de un vistazo

*Severidad medida en el contexto de este proyecto: datos de menores de edad, hoy solo datos de prueba.*

| ID | Hallazgo | Severidad | Evidencia | Estado |
|---|---|---|---|---|
| S-01 | El modo sin login deja la base abierta a cualquiera que tenga la *anon key* | **Crítica** si hay datos reales o se publica · Baja si es local y con datos de prueba | ✅ E1-E | Mitigado por diseño (doble interruptor, franja de aviso, `schema.sql` vuelve a cerrar). Queda el riesgo humano |
| S-02 | Un solo rol: cualquier usuario con sesión puede todo; sin separación entre academias | **Alta** si los registros públicos están abiertos · Media si no | ✅ E1-F, E1-N | Abierto · propuesta probada: `rls_por_rol.sql` |
| S-03 | Validaciones solo en el navegador: longitud, fecha futura, duplicados por mayúsculas | Media | ✅ E1-G, E1-H | Abierto · propuesta probada: `endurecimiento.sql` |
| S-04 | Scripts de CDN sin *Subresource Integrity* y Tailwind sin versión fija | Media | 🔎 | Abierto (el README §10 ya lo reconoce) |
| S-05 | La sesión (JWT) vive en `localStorage`: un XSS futuro la robaría | Media (depende de que aparezca un XSS) | 🔎 + ✅ AT-04 | Aceptado · CSP propuesta y probada, **no desplegada** |
| S-06 | Doble envío con Enter duplicaba estudiantes | Media | ✅ AT-05 | **Corregido** en `050ae03` |
| S-07 | No hay bitácora de *quién* cambió *qué* (repudio) | Baja–Media | 🔎 | Abierto (README §10) |
| S-08 | `ESTILOS_DE_PAGO["constructor"]` pasa la validación del cliente | Baja | ✅ AT-03, E1-M | Abierto · la base lo rechaza con `CHECK` |
| S-09 | Registros públicos de Supabase: **no se puede verificar desde el repositorio** | **Alta** si siguen activos | 🔎 | Revisar a mano en el panel (README, paso 2) |
| S-10 | Datos personales de menores sin aviso de privacidad ni minimización | Informativa (legal) | 📚 | Abierto |

### 0.3 Sobre «quitar el inicio de sesión»

El login se quitó **como un interruptor reversible**, no borrando código: en `config.js` se escribe `const REQUIERE_INICIO_DE_SESION = false;` y se ejecuta `supabase/modo_sin_login.sql`. Si la línea no existe o tiene cualquier otro valor, **la app pide login** (el valor por defecto es el seguro). Este documento explica por qué esos *dos* pasos son necesarios y qué riesgo se asume al darlos ([sección 2.5](#25-rls-y-la-anon-key-qué-pasa-si-se-quita-el-login)).

Probar sin login, en resumen: crear `config.js` desde `config.example.js` con la URL y la *anon key* de **un proyecto de pruebas**, poner el interruptor en `false`, ejecutar `modo_sin_login.sql` y abrir con un servidor estático. Pasos completos: [README, paso 8](../README.md#paso-8-opcional-y-temporal-entrar-sin-iniciar-sesión).

---

## 1. Alcance, método y límites

**Qué se auditó** (commit `050ae03`): `index.html`, `app.js` (1.425 líneas), `asistencia-react.js` (374), `config.example.js` y `supabase/*.sql` (`schema`, `seed`, `modo_sin_login`, `modo_con_login`).

**Cómo se hizo**

| # | Método | Para qué sirvió |
|---|---|---|
| 1 | Lectura del código y búsqueda de patrones peligrosos (`innerHTML`, `eval`, `document.write`…) | Hallazgos de código (🔎) |
| 2 | **PostgreSQL 16 real, local**, con los roles `anon`, `authenticated` y `service_role` creados como en Supabase; se cargaron el `schema.sql` y el `seed.sql` **tal cual están en el repositorio** y se probó cada afirmación con `set role …` | Todo lo que dice *«la base responde…»* (pruebas **E1-\***) |
| 3 | La aplicación real en Chromium automatizado (Playwright) contra un **Supabase simulado** (*mock*) que imita respuestas y errores | Comportamiento de la **aplicación** (pruebas **AT-\*** y benchmark) |
| 4 | PostgreSQL local y *mingo* (motor de agregación de MongoDB escrito en JavaScript) | Parte 3 |

**Límites (léelos antes de citar cifras)**

- **No se ejecutó nada en el proyecto Supabase real del equipo.** Lo que se afirma sobre «cómo responde la base» viene de PostgreSQL local, no del servicio de Supabase.
- **El Supabase simulado no es Supabase.** Las pruebas AT-\* sirven para el comportamiento de *nuestra aplicación*; lo que prueba que la base rechaza algo es la prueba E1-\* equivalente en PostgreSQL real.
- **PostgreSQL local no es Supabase:** los roles y el esquema `extensions`/`auth.jwt()` se imitaron. PostgREST y GoTrue (Auth) reales no se ejercitaron.
- **Tailwind real por CDN no se probó.** En las pruebas de navegador se usó CSS compilado, así que la política CSP propuesta **no está verificada** con el CDN de Tailwind.
- **MongoDB:** se usó *mingo*, no un servidor MongoDB. Los resultados coinciden con SQL, pero un servidor real podría diferir en detalles.
- **Tiempos (benchmark):** Chromium sin interfaz dentro de un contenedor. Sirven las **proporciones**, no los milisegundos absolutos de tu computador o de un celular.
- **Los scripts de prueba no están en el repositorio** (necesitan Node y Playwright, y el proyecto no usa npm). Sí están los **resultados** y todas las consultas SQL/MongoDB en [`docs/evidencia/`](evidencia/).
- **No es un pentest de infraestructura:** no se atacó la red, GitHub Pages ni los servidores de Supabase, ni se hizo fuerza bruta contra Auth.
- **Lo legal es orientación**, no asesoría.

**Regresión final:** 7 suites de prueba automática (fases 2 a 5, modo sin login, auditoría y ejemplos de React): **627 comprobaciones, 0 fallidas** tras el último cambio de código.

---

## 2. Parte 1 · Auditoría de seguridad y pruebas de robustez

### 2.1 El principio que ordena todo: el navegador es territorio del atacante

Todo lo que llega al navegador (HTML, CSS, JavaScript, `config.js`) puede ser leído **y modificado** por quien esté sentado delante, con las herramientas de desarrollo (F12). Por eso se distinguen dos zonas:

```
   NAVEGADOR  (no confiable)                              SUPABASE  (confiable)
┌─────────────────────────────┐   HTTPS + anon key     ┌───────────────────────────────────┐
│ index.html · app.js         │   (+ JWT si hay sesión)│  PostgREST ──► PostgreSQL          │
│  · formularios, validación  │ ─────────────────────► │    · GRANT/REVOKE (¿puede tocar?)  │
│  · pantalla de login        │                        │    · RLS (¿qué filas puede ver?)   │
│  · localStorage (sesión)    │ ◄───────────────────── │    · CHECK / UNIQUE / FK / trigger │
└─────────────────────────────┘                        │  Auth (GoTrue): contraseñas con    │
  El usuario puede cambiarlo todo                      │  hash bcrypt, emite el JWT         │
                                                       └───────────────────────────────────┘
                                                         El visitante NO puede cambiar esto
```

| Capa | Para qué sirve | ¿Puede un atacante saltársela? |
|---|---|---|
| Pantalla de login (cliente) | Comodidad: mostrar la interfaz correcta | **Sí**, es solo HTML/JS |
| Validación del formulario (cliente) | Experiencia de usuario: avisar rápido | **Sí**, se reemplaza desde la consola (✅ AT-02) |
| Supabase Auth | Comprobar identidad y emitir el JWT | No, corre en el servidor |
| `GRANT/REVOKE` + RLS | Decidir quién toca qué tabla y qué filas | No, corre en la base |
| `CHECK`, `UNIQUE`, `FK`, triggers | Garantizar que los datos tengan sentido | No, corre en la base |

**Frase para la exposición:** *«El cliente es un guion de teatro: el actor puede improvisar. La seguridad real está en la base de datos, que no hace caso a la improvisación.»*

### 2.2 Modelo de amenazas

**Qué protegemos (activos)**

| Activo | Por qué importa |
|---|---|
| Nombre, edad, acudiente y teléfono de **menores de edad** | Datos personales sensibles por definición |
| Integridad de asistencia y pagos | Decisiones y cobros dependen de ellos |
| Credencial del administrador | Da acceso a todo |
| *anon key* | **Pública por diseño**; no es un activo secreto |
| `service_role` / clave *secret* | **Secreta**: se salta RLS. No debe estar nunca en el navegador ni en GitHub (✅ revisado: no hay claves en el árbol del repositorio ni en su historial) |

**Quién podría atacar (actores)**

1. Visitante anónimo que conoce la URL (o la encuentra en GitHub Pages).
2. Usuario con sesión curioso o malicioso (otro profesor).
3. Atacante que logra inyectar un script (XSS).
4. Atacante de la cadena de suministro (un CDN comprometido).
5. Quien reciba el repositorio o una copia de `config.js`.

**Análisis STRIDE** (una categoría de amenaza por fila):

| Amenaza | En AcademiaHub | Protección actual | Brecha |
|---|---|---|---|
| **S**poofing (suplantar) | Hacerse pasar por el administrador | Auth con contraseña (hash bcrypt en Supabase); registros públicos desactivados *(a verificar en el panel)* | Sin MFA (📚 Supabase lo ofrece) |
| **T**ampering (alterar) | Cambiar datos por la consola o la API | RLS + `GRANT` + `CHECK`/`UNIQUE`/`FK` | S-03: reglas que solo están en el cliente |
| **R**epudiation (negar) | «Yo no borré ese estudiante» | `actualizado_en` guarda *cuándo*, no *quién* | S-07: sin bitácora |
| **I**nformation disclosure (filtrar) | Leer datos de menores | RLS cierra `anon`; sin `innerHTML`; CSP propuesta | S-01 (modo sin login), S-05 (token en `localStorage`) |
| **D**enial of service (saturar) | Llenar la base de basura | Límites del plan de Supabase 📚 | S-03: sin límite de longitud en la base |
| **E**levation of privilege (escalar) | Un usuario normal actúa como admin | Hoy no hay roles: todos son iguales | S-02: solo existe `authenticated` |

### 2.3 Pruebas de robustez (pentesting conceptual)

Seis ataques que un estudiante curioso, o alguien peor, podría intentar **desde el navegador**. Cada uno se automatizó contra la aplicación real.

| ID | Ataque | Técnica | Resultado | Lección |
|---|---|---|---|---|
| **AT-01** | Saltarse el login «a la fuerza» | Mostrar la interfaz desde F12 y llamar `clienteSupabase.from("estudiantes").select()` desde la consola | La interfaz se puede mostrar, pero la base responde **42501 (sin permiso)**: ningún dato de estudiantes aparece en la página | Ocultar una pantalla no protege nada |
| **AT-02** | Cambiar las reglas del cliente | Reemplazar funciones de `app.js` para quitar toda la validación, y enviar un menor sin acudiente | Una `const` de `config.js` no se puede reasignar (`TypeError`), **pero las funciones sí se pueden reemplazar**. Aun así la base rechazó al menor (`CHECK`, código 23514) y no se creó nada | La validación del cliente es experiencia de usuario, no seguridad |
| **AT-03** | Valor manipulado en un `<select>` | Enviar `estado_pago = "constructor"` en vez de `al_dia / pendiente / vencido` | El cliente lo dejó pasar (porque `ESTILOS_DE_PAGO["constructor"]` existe en todo objeto de JavaScript); **la base lo rechazó con `CHECK`** y la app mostró un mensaje claro | Hueco menor en el cliente (S-08); la segunda capa lo cubrió |
| **AT-04** | XSS almacenado | 14 cargas maliciosas en nombre, categoría, acudiente y disciplina, enviadas por los formularios reales | Se guardaron como texto; `window.__xss` nunca se definió; no se creó ningún `img/svg/script/iframe/a/style`; el `<style>` inyectado no se aplicó | Guardar tal cual **y escapar al mostrar** funciona |
| **AT-05** | Doble envío por teclado | Pulsar Enter dos veces con 300 ms de latencia de red | **Error real:** 2 inserciones y **2 copias** del estudiante (el indicador de «cargando» tapa el mouse, no el teclado) | Corregido con un candado (`050ae03`): 1 inserción, 1 copia |
| **AT-06** | Política CSP propuesta | Inyectar una CSP en el `<head>` y recorrer login, crear, asistencia y dashboard | Sin violaciones, y un `<script>` inline inyectado queda **bloqueado** | Funciona con la app actual (no verificado con el CDN real de Tailwind) |

Las 14 cargas del AT-04 incluyen: `<img src=x onerror=…>`, `<svg onload=…>`, `<script>…`, `"><script>…`, `' onmouseover='…`, `javascript:…`, `<iframe srcdoc=…>`, `${…}`, `{{constructor.constructor(…)()}}`, `</template><img …>`, `<a href="javascript:…">`, entidades HTML (`&lt;b&gt;`), `<style>*{display:none}</style>` y un texto con el carácter Unicode de inversión de dirección.

<details>
<summary>Ver el resultado completo: antes y después del arreglo (AT-01 a AT-06)</summary>

**Después** (código actual, 22 correctas, 0 fallidas):

```text

AT-01. Saltarse el login "a la fuerza" desde las herramientas del navegador (la base está cerrada al rol anónimo)
  ✔ la interfaz se puede mostrar, pero el servidor responde "sin permiso"
  ✔ NO aparece ningún dato de estudiantes en la página
  ✔ consultar directo con clienteSupabase tampoco devuelve datos (error 42501)

AT-02. Cambiar las reglas del cliente desde la consola (el navegador es del atacante)
  ✔ una constante de config.js no se puede reasignar (TypeError)
  ✔ pero las FUNCIONES de app.js sí se pueden reemplazar (es el navegador del atacante)
  ✔ aun sin validación del cliente, la BASE rechaza al menor sin acudiente (CHECK, error 23514)
  ✔ no se creó ningún estudiante

AT-03. Valor manipulado en un <select> ("constructor" en vez de al_dia / pendiente / vencido)
    · la validación del cliente dejó pasar el valor "constructor" (hueco menor: ESTILOS_DE_PAGO["constructor"] existe): true
  ✔ la base de datos lo rechazó con CHECK (23514) y la app mostró un mensaje claro
  ✔ no se guardó nada

AT-04. XSS almacenado: batería de cargas maliciosas en nombre, categoría, acudiente y disciplina
  ✔ se guardaron las 14 cargas como estudiantes (los formularios no las rechazan)
  ✔ el diálogo muestra el nombre como TEXTO
  ✔ el formulario de edición conserva el texto tal cual en el campo
  ✔ NINGUNA carga se ejecutó (window.__xss sigue sin definir)
  ✔ no se creó ningún elemento peligroso (img, svg, script, iframe, a, style...) en las listas, avisos ni el diálogo
  ✔ el <style> inyectado no se aplicó
  ✔ las 14 cargas aparecen en la tabla como texto literal (incluidas las entidades &lt; sin decodificar)

AT-05. Doble envío con el teclado (Enter dos veces seguidas) con latencia de red realista (300 ms)
    · resultado: 1 inserciones enviadas, 1 copia(s) guardada(s) del estudiante
  ✔ Enter dos veces crea UNA sola copia del estudiante

AT-05b. Doble envío del formulario de disciplinas (Enter dos veces)
    · resultado: 1 solicitud(es) de inserción enviadas, 1 copia(s) guardada(s)
  ✔ Enter dos veces envía UNA sola solicitud de inserción
  ✔ y no aparece un aviso de error por «duplicada»

AT-06. Política de seguridad de contenido (CSP) propuesta: ¿la app funciona sin violaciones?
  ✔ con la CSP activa, el flujo completo (login, crear, asistencia, dashboard) funciona
  ✔ y no hay ninguna violación de CSP en la consola
  ✔ contraprueba: un <script> inline inyectado queda BLOQUEADO por la CSP

Errores de JavaScript sin capturar: 0

RESULTADO: 22 correctas, 0 fallidas
```

**Antes** (código anterior al arreglo; la nota inicial explica por qué hay dos fallos de tipo distinto):

```text
NOTA SOBRE ESTE ARCHIVO
  Es la PRIMERA corrida de las pruebas en navegador, hecha con el app.js ANTERIOR al arreglo
  (commit 914f412). Muestra 2 fallos y NO son del mismo tipo:
    · AT-04 «el diálogo muestra el nombre como TEXTO»  → fue un error de MI PRUEBA (elegía la fila por
      posición y no por nombre exacto). Se corrigió la prueba y el fallo desapareció SIN tocar la app.
    · AT-05 «Enter dos veces crea UNA sola copia»      → fue un error REAL de la aplicación. Se arregló
      en el commit 050ae03 (candado guardandoEstudiante / guardandoDisciplina).
  Al final se añade la medición del formulario de disciplinas sobre el app.js sin el arreglo.
=====================================================================================================

AT-01. Saltarse el login "a la fuerza" desde las herramientas del navegador (la base está cerrada al rol anónimo)
  ✔ la interfaz se puede mostrar, pero el servidor responde "sin permiso"
  ✔ NO aparece ningún dato de estudiantes en la página
  ✔ consultar directo con clienteSupabase tampoco devuelve datos (error 42501)

AT-02. Cambiar las reglas del cliente desde la consola (el navegador es del atacante)
  ✔ una constante de config.js no se puede reasignar (TypeError)
  ✔ pero las FUNCIONES de app.js sí se pueden reemplazar (es el navegador del atacante)
  ✔ aun sin validación del cliente, la BASE rechaza al menor sin acudiente (CHECK, error 23514)
  ✔ no se creó ningún estudiante

AT-03. Valor manipulado en un <select> ("constructor" en vez de al_dia / pendiente / vencido)
    · la validación del cliente dejó pasar el valor "constructor" (hueco menor: ESTILOS_DE_PAGO["constructor"] existe): true
  ✔ la base de datos lo rechazó con CHECK (23514) y la app mostró un mensaje claro
  ✔ no se guardó nada

AT-04. XSS almacenado: batería de cargas maliciosas en nombre, categoría, acudiente y disciplina
  ✔ se guardaron las 14 cargas como estudiantes (los formularios no las rechazan)
  ✘ FALLA: el diálogo muestra el nombre como TEXTO 
  ✔ el formulario de edición conserva el texto tal cual en el campo
  ✔ NINGUNA carga se ejecutó (window.__xss sigue sin definir)
  ✔ no se creó ningún elemento peligroso (img, svg, script, iframe, a, style...) en las listas, avisos ni el diálogo
  ✔ el <style> inyectado no se aplicó
  ✔ las 14 cargas aparecen en la tabla como texto literal (incluidas las entidades &lt; sin decodificar)

AT-05. Doble envío con el teclado (Enter dos veces seguidas) con latencia de red realista (300 ms)
    · resultado: 2 inserciones enviadas, 2 copia(s) guardada(s) del estudiante
  ✘ FALLA: Enter dos veces crea UNA sola copia del estudiante copias=2

AT-06. Política de seguridad de contenido (CSP) propuesta: ¿la app funciona sin violaciones?
  ✔ con la CSP activa, el flujo completo (login, crear, asistencia, dashboard) funciona
  ✔ y no hay ninguna violación de CSP en la consola
  ✔ contraprueba: un <script> inline inyectado queda BLOQUEADO por la CSP

Errores de JavaScript sin capturar: 0

RESULTADO: 18 correctas, 2 fallidas

----- Medición adicional (app.js sin el arreglo, con la prueba ya corregida): formulario de disciplinas -----
    · resultado: 2 inserciones enviadas, 2 copia(s) guardada(s) del estudiante
  ✘ FALLA: Enter dos veces crea UNA sola copia del estudiante copias=2
AT-05b. Doble envío del formulario de disciplinas (Enter dos veces)
    · resultado: 2 solicitud(es) de inserción enviadas, 1 copia(s) guardada(s)
  ✘ FALLA: Enter dos veces envía UNA sola solicitud de inserción envios=2
  ✘ FALLA: y no aparece un aviso de error por «duplicada» 
```

</details>

> **Un fallo que fue mío, no de la aplicación.** En la primera corrida (antes del arreglo) también falló «el diálogo muestra el nombre como TEXTO». Era un error de **mi prueba** (elegía la fila por posición en lugar de por nombre exacto). Al corregir la prueba, desapareció sin tocar la aplicación. Se deja anotado porque en una auditoría hay que separar «el programa falló» de «mi herramienta falló».

**Manipulaciones del DOM que se analizaron pero no se automatizaron (🔎)**

- *Quitar la clase `hidden` de un botón o reactivar uno deshabilitado:* cambia solo lo que se ve; la petición sigue pasando por RLS.
- *Editar el atributo `data-id` de un botón de la tabla* para que «Desactivar» apunte a otro estudiante: es un ataque tipo **IDOR** (referencia directa a objeto). Hoy no es una brecha, porque todo usuario con sesión ya puede tocar a todos los estudiantes. **Dejaría de ser inocuo** en cuanto existan roles o varias academias: la defensa entonces es la política RLS, no esconder los números.
- *Modificar `config.js` en el navegador:* afecta solo a esa pestaña. No cambia la base.

**Lo que no se hizo (un pentest real lo haría):** fuzzing contra la API REST, fuerza bruta o enumeración de usuarios contra Auth, pruebas de carga y revisión de la configuración real del proyecto Supabase.

### 2.4 Validación del lado del servidor: la base de datos *es* el servidor

En Supabase no hay un «backend nuestro» entre el navegador y la base: el navegador habla con **PostgREST**, que convierte cada petición en una consulta SQL. Entonces **las restricciones de las tablas son la validación del servidor**. Si una regla no está en la base, no está en ninguna parte que el atacante no pueda saltarse.

**Lo que la base ya garantiza** (✅ E1-M, ejecutado sobre el `schema.sql` del repositorio):

| Regla | Mecanismo | Prueba |
|---|---|---|
| Menor de 18 sin acudiente (nombre y teléfono) | `CHECK estudiantes_acudiente_menores` | M1 rechazado · M2 (acudiente de solo espacios) rechazado |
| `estado_pago` solo `al_dia/pendiente/vencido` | `CHECK` | M3 rechaza `"constructor"` |
| Edad entre 3 y 99 | `CHECK estudiantes_edad_valida` | M4 rechazado |
| La disciplina debe existir | `FOREIGN KEY` | M5 rechazado |
| Un registro de asistencia por estudiante y día | `UNIQUE (estudiante_id, fecha)` | M6 rechazado |
| Si se borra un estudiante, se borra su asistencia | `ON DELETE CASCADE` | M7: 1 → 0, sin huérfanas |

<details>
<summary>Ver la salida completa de E1-M (reglas) y E1-N (políticas por rol)</summary>

```text
=== E1-M. REGLAS CHECK/UNIQUE/FK en PostgreSQL real (las del schema.sql, sin endurecimiento extra)
M1) menor de edad (12) SIN acudiente:
ERROR:  new row for relation "estudiantes" violates check constraint "estudiantes_acudiente_menores"
DETAIL:  Failing row contains (11, Menor Sin Acudiente, 12, 1, null, null, null, al_dia, t, 2026-10-31 15:45:35.11516+00, 2026-10-31 15:45:35.11516+00).
M2) menor de edad con acudiente de solo espacios:
ERROR:  new row for relation "estudiantes" violates check constraint "estudiantes_acudiente_menores"
DETAIL:  Failing row contains (12, Menor Espacios, 12, 1, null,    ,    , al_dia, t, 2026-10-31 15:45:35.116271+00, 2026-10-31 15:45:35.116271+00).
M3) estado_pago = constructor (el valor que el navegador deja pasar):
ERROR:  new row for relation "estudiantes" violates check constraint "estudiantes_estado_pago_valido"
DETAIL:  Failing row contains (13, Pago Raro, 30, 1, null, null, null, constructor, t, 2026-10-31 15:45:35.116525+00, 2026-10-31 15:45:35.116525+00).
M4) edad 2 (fuera de 3..99; con acudiente, para que sea LA EDAD lo que falle):
ERROR:  new row for relation "estudiantes" violates check constraint "estudiantes_edad_valida"
DETAIL:  Failing row contains (14, Edad Rara, 2, 1, null, Acudiente, 300 000 0000, al_dia, t, 2026-10-31 15:45:35.116691+00, 2026-10-31 15:45:35.116691+00).
M5) disciplina que no existe (FK):
ERROR:  insert or update on table "estudiantes" violates foreign key constraint "estudiantes_disciplina_id_fkey"
DETAIL:  Key (disciplina_id)=(9999) is not present in table "disciplinas".
M6) dos asistencias del mismo estudiante el mismo día (UNIQUE):
ERROR:  duplicate key value violates unique constraint "asistencias_un_registro_por_dia"
DETAIL:  Key (estudiante_id, fecha)=(1, 2026-01-05) already exists.
M7) borrar un estudiante: ¿qué pasa con su asistencia? (ON DELETE CASCADE)
asistencias de ese estudiante antes: 1
asistencias de ese estudiante después: 0
asistencias que quedan en total (sin huérfanas): 0

=== E1-N. POLÍTICAS POR ROL (rls_por_rol.sql) con un auth.jwt() imitando el de Supabase
N0) ANTES de aplicar rls_por_rol.sql (política "todo autenticado" vigente): un usuario SIN rol...
     ve 10 estudiantes
N1) política vieja SIN borrar, para mostrar la trampa (se vuelve a crear a propósito):
     usuario SIN rol, con la política vieja todavía creada: ve 10 estudiantes (¡se suman con OR!)
N2) ADMIN (app_metadata.rol = admin):
     ve 10 estudiantes
     edita: 1 fila(s)
     borra asistencias: 1 fila(s)
N3) PROFESOR (app_metadata.rol = profesor):
     ve 10 estudiantes y 1 asistencias
     intenta editar estudiantes: 0 fila(s) cambiadas (bloqueado)
     intenta borrar asistencias: 0 fila(s) borradas (bloqueado)
     corrige una asistencia: 1 fila(s)
intenta CREAR un estudiante:
ERROR:  new row violates row-level security policy for table "estudiantes"
N4) usuario con sesión pero SIN rol:
     ve 0 estudiantes
N5) TRAMPA: el usuario se pone rol=admin en SU user_metadata (que sí puede editar):
     ve 0 estudiantes (la política solo mira app_metadata)
N6) anónimo (anon key, sin sesión):
ERROR:  permission denied for table estudiantes
```

</details>

**Lo que la base NO validaba** (✅ E1-G, antes de endurecer)

| ID | Hueco | Qué pasó |
|---|---|---|
| G1 | Longitud | La base **aceptó un nombre de 5 MB** (5.120 kB). El límite de longitud solo está en el formulario |
| G2 | Fecha de asistencia | La base aceptó una asistencia del **2099-01-01**. La regla «no hay asistencia futura» solo está en el navegador |
| G3 | Disciplinas duplicadas | La base aceptó `FÚTBOL` aunque ya existía `Fútbol` (el `UNIQUE` distingue mayúsculas) |

**Medidas de endurecimiento** (✅ probadas sobre el esquema del repositorio, se pueden ejecutar varias veces; **no se aplicaron a ninguna base real**):

```sql
-- =====================================================================
-- endurecimiento.sql · MEJORAS OPCIONALES (propuestas en la auditoría)
-- Se pueden ejecutar varias veces. Probado en PostgreSQL 16 (con un esquema
-- "extensions" imitando el de Supabase).
-- =====================================================================

-- H1. Límites de longitud: la base ya no acepta un "nombre" de 5 MB.
alter table public.estudiantes drop constraint if exists estudiantes_longitudes;
alter table public.estudiantes add constraint estudiantes_longitudes check (
      char_length(nombre_completo)                 <= 100
  and char_length(coalesce(categoria, ''))          <= 50
  and char_length(coalesce(acudiente_nombre, ''))   <= 100
  and char_length(coalesce(acudiente_telefono, '')) <= 25
);

-- H2. Nada de asistencias del futuro (la regla ya existía, pero solo en el navegador).
--     "+ 1 día" de margen: un navegador en un huso horario adelantado ya está en "mañana".
create or replace function public.rechazar_asistencia_futura()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.fecha > current_date + 1 then
    raise exception 'No se puede registrar asistencia de una fecha futura (%).', new.fecha
      using errcode = '23514';   -- el mismo código que un CHECK: la app ya lo traduce
  end if;
  return new;
end $$;

drop trigger if exists trg_asistencias_no_futuras on public.asistencias;
create trigger trg_asistencias_no_futuras
  before insert or update on public.asistencias
  for each row execute function public.rechazar_asistencia_futura();

-- H3. "Fútbol", "FÚTBOL" y "futbol" son la MISMA disciplina.
create extension if not exists unaccent with schema extensions;

create or replace function public.sin_tildes(texto text)
returns text language sql immutable parallel safe set search_path = '' as
$$ select extensions.unaccent('extensions.unaccent'::regdictionary, texto) $$;

create unique index if not exists disciplinas_nombre_unico_normalizado
  on public.disciplinas (lower(public.sin_tildes(nombre)));
```

| Prueba | Resultado |
|---|---|
| H1 · nombre de 101 letras / de 100 letras | rechazado / aceptado |
| H2 · asistencia del 2099 / de hoy / de «mañana» / de pasado mañana | rechazada / aceptada / aceptada (margen por husos horarios) / rechazada |
| H3 · `FÚTBOL` y `futbol` (sin tilde) frente a `Fútbol` | ambas rechazadas por el índice único normalizado · `Natación` aceptada |

Notas de diseño (🔎):

- El trigger lanza el código **23514** (el mismo que un `CHECK`) para que la app, que ya traduce ese código a un mensaje claro, no necesite cambios.
- El margen de `+ 1 día` existe porque la fecha la calcula el navegador y un computador en un huso horario adelantado ya está en «mañana».
- Si la tabla ya tiene filas que violan una regla (por ejemplo un nombre de más de 100 letras), el `ALTER TABLE` falla; el SQL Editor de Supabase deshace todo el script, así que no queda a medias.
- En Supabase la extensión `unaccent` se instala en el esquema `extensions` (📚 práctica habitual de Supabase; por eso el script la crea ahí).
- Para reglas más complejas que un `CHECK` (que dependan de otras tablas, por ejemplo) existen las funciones de base de datos llamadas con `rpc()` y las *Edge Functions* de Supabase (📚).

<details>
<summary>Ver la salida completa de E1-G / E1-H / E1-I / E1-J (huecos, endurecimiento, unaccent y bcrypt)</summary>

```text
=== E1-G. HALLAZGOS EN LA BASE DE DATOS (antes de endurecer)
  G1) ¿La base acepta un nombre de 5 MB? (sin límite de longitud)
aceptado: 5120 kB
  G2) ¿Acepta asistencia de una fecha futura (2099-01-01)? (la regla solo está en el navegador)
ERROR:  insert or update on table "asistencias" violates foreign key constraint "asistencias_estudiante_id_fkey"
DETAIL:  Key (estudiante_id)=(1) is not present in table "estudiantes".
  G3) ¿Acepta dos disciplinas que solo cambian en mayúsculas ('Fútbol' / 'FÚTBOL')?
aceptada: FÚTBOL

=== E1-H. MEDIDAS DE ENDURECIMIENTO (SQL propuesto, probado)
NOTICE:  constraint "estudiantes_longitudes" of relation "estudiantes" does not exist, skipping
NOTICE:  trigger "trg_asistencias_no_futuras" for relation "public.asistencias" does not exist, skipping
  H1) nombre de 101 letras:
ERROR:  new row for relation "estudiantes" violates check constraint "estudiantes_longitudes"
  H1) nombre de 100 letras:
aceptado
  H2) asistencia 2099-01-01:
ERROR:  No se puede registrar asistencia de una fecha futura (2099-01-01).
  H2) asistencia de hoy:
ERROR:  insert or update on table "asistencias" violates foreign key constraint "asistencias_estudiante_id_fkey"
DETAIL:  Key (estudiante_id)=(1) is not present in table "estudiantes".
  H2) asistencia de mañana (huso horario adelantado):
ERROR:  insert or update on table "asistencias" violates foreign key constraint "asistencias_estudiante_id_fkey"
DETAIL:  Key (estudiante_id)=(2) is not present in table "estudiantes".
  H3) 'FÚTBOL' (mismo nombre que 'Fútbol'):
ERROR:  duplicate key value violates unique constraint "disciplinas_nombre_sin_mayusculas"
  H3) 'futbol' sin tilde (límite: lower() no quita tildes):
ACEPTADA (queda el límite)
  H3b) ¿está disponible la extensión unaccent? (para cerrar ese límite)
2
=== E1-G2/H2 (repetidas con ids válidos)
  (estudiantes con ids 11…20)
  ANTES del trigger — asistencia del 2099-01-01:
  aceptada por la base: 2099-01-01
  DESPUÉS del trigger:
   2099-01-01 → ERROR:  No se puede registrar asistencia de una fecha futura (2099-01-01).
   hoy        → aceptada
   mañana (zona adelantada) → aceptada
   pasado mañana → ERROR:  No se puede registrar asistencia de una fecha futura (2026-11-02).
   UPDATE a fecha futura → ERROR:  No se puede registrar asistencia de una fecha futura (2099-01-01).

=== E1-I. unaccent y pgcrypto
  'futbol' (sin tilde, minúsculas) → ERROR:  duplicate key value violates unique constraint "disciplinas_nombre_unico_normalizado"
  'FÚTBOL' → ERROR:  duplicate key value violates unique constraint "disciplinas_nombre_unico_normalizado"
  'Natación' (distinta) → aceptada

=== E1-J. Hash de contraseñas con bcrypt (pgcrypto): lo que hace Supabase Auth por dentro
hash 1 de "mi_clave_segura": $2a$08$94Og8uA/CEhoPrXGTXp4petKfgP565LsxtVml0HGOoycunS8ss9fS
hash 2 de la MISMA clave:    $2a$08$9SUUi0K1.2hbkb0iUtyTOea3EuYF174l/9ND8ZN/vqvWj3QFS2ZzG
clave correcta → true | clave incorrecta → false
MD5 de "mi_clave_segura" (NO usar para contraseñas): 5cab168f8e24891f300bb1f1f6450e33 → siempre el mismo
  (la parte '$2a$08$' indica el algoritmo bcrypt y su costo; el resto del bloque inicial son 22 caracteres de 'sal' aleatoria)
```

</details>

### 2.5 RLS y la *anon key*: qué pasa si se quita el login

#### 2.5.1 Qué es la *anon key* y por qué puede ser pública

La *anon key* (en paneles nuevos de Supabase se llama *publishable key*) identifica **el proyecto** y hace que la petición se ejecute con el rol `anon`. No es una contraseña. Cualquiera que abra la pestaña *Network* de su navegador la ve, y **no se puede ocultar** en una aplicación que corre en el navegador. (📚 La clave `anon` clásica es un JWT: está *firmado*, no cifrado, así que su contenido se puede leer; las claves *publishable* nuevas tienen otro formato pero cumplen el mismo papel.)

Lo que la hace segura es lo que la base permite hacer **al rol `anon`**. Con `schema.sql` eso es: nada.

| Clave | ¿Puede ir en el navegador? | Qué puede hacer |
|---|---|---|
| `anon` / *publishable* | **Sí** (es pública) | Solo lo que las políticas permitan al rol `anon`. Hoy, nada |
| `service_role` / *secret* | **Jamás** | **Todo**: ignora RLS (✅ E1-D: lee las 10 filas sin tener política) |

#### 2.5.2 Cómo funcionan RLS y `GRANT`

Dos candados independientes que `schema.sql` activa a la vez:

```sql
-- Candado 1: RLS. Con RLS activado y SIN política para un rol, ese rol no ve ni toca ninguna fila.
alter table public.estudiantes enable row level security;
create policy "Autenticados gestionan estudiantes" on public.estudiantes
  for all to authenticated using (true) with check (true);

-- Candado 2: GRANT/REVOKE. Al rol anónimo ni siquiera se le permite tocar la tabla.
revoke all on public.estudiantes from anon;
grant select, insert, update, delete on public.estudiantes to authenticated;
```

- `using (...)` decide **qué filas** se pueden leer, modificar o borrar. `with check (...)` decide qué filas se pueden insertar o dejar tras un `UPDATE`.
- Las políticas permisivas (las normales) **se combinan con OR**: si dos políticas aplican, basta con que una deje pasar. Esto importa mucho en la [sección 2.5.5](#255-un-solo-rol-y-la-trampa-del-or).

Dos candados significan que, si alguien por error apaga uno, el otro sigue en pie. La prueba **E1-C** lo demuestra: con RLS apagado en `estudiantes`, el rol `anon` seguía recibiendo `permission denied` gracias al `REVOKE`; solo cuando además se le devolvió el permiso (como hace Supabase por defecto en tablas nuevas, 📚) vio las 10 filas.

#### 2.5.3 Escenarios: ¿qué pasa en cada caso?

| # | Escenario | El navegador… | La base responde… | Resultado |
|---|---|---|---|---|
| 1 | **Normal** (login activo, `schema.sql`) | Pide login | `anon`: *permission denied* · `authenticated`: ve las 10 filas | ✅ Seguro (E1-A) |
| 2 | **Login quitado solo en el cliente** (`REQUIERE_INICIO_DE_SESION = false`) pero la base **sigue cerrada** | Muestra la app y la franja de aviso | `anon`: *permission denied* | ✅ La app no filtra nada; muestra un mensaje que explica la solución (50 pruebas del modo sin login) |
| 3 | **Login quitado + `modo_sin_login.sql`** | Entra directo | `anon` puede leer, crear, modificar y **borrar** todo | ⚠️ Cualquiera con la URL del proyecto y la *anon key* tiene control total (E1-E) |
| 4 | Alguien **apaga RLS** en una tabla | — | Con el `REVOKE` vigente, `anon` sigue bloqueado; si además se devuelve el permiso, lee todo | ✅ El segundo candado funciona (E1-C) |
| 5 | **Tabla nueva sin RLS** en `public` | — | En proyectos que conservan los permisos por defecto de Supabase, `anon` la ve entera | ⚠️ Error clásico (E1-B); verifica los permisos por defecto de tu proyecto |
| 6 | Se filtra la clave `service_role` | — | Se salta RLS | ❌ Compromiso total (E1-D) |
| 7 | **Registros públicos abiertos** | Cualquiera se crea una cuenta | Todo nuevo usuario es `authenticated` → la política `using (true)` lo deja pasar | ❌ Equivale al escenario 3 con un paso más (E1-F + 📚 comportamiento de Supabase Auth) |
| 8 | **Política por rol** (propuesta) | — | Solo los roles autorizados, y solo lo que cada uno puede | ✅ Probado (E1-N) |

<details>
<summary>Ver la salida completa de E1-A … E1-F (RLS, permisos y escenarios)</summary>

```text
=== E1-A. ESTADO SEGURO (schema.sql tal cual): rol anónimo con la anon key, sin sesión
     [anon] ERROR:  permission denied for table estudiantes 
     [anon] ERROR:  permission denied for table disciplinas 
     [anon] ERROR:  permission denied for table estudiantes 
     (authenticated, con sesión)
     [authenticated] 10 

=== E1-B. EL ERROR CLÁSICO: tabla nueva en 'public' SIN RLS (los permisos por defecto de Supabase la dejan abierta)
     RLS activo en prueba_sin_rls: f
     [anon] secreto 1 secreto 2 
   → se activa RLS pero SIN políticas:
     [anon] 0 
     [anon] ERROR:  permission denied for sequence prueba_sin_rls_id_seq 

=== E1-C. SEGUNDO CANDADO (los GRANT/REVOKE de schema.sql): ¿qué pasa si alguien APAGA RLS en 'estudiantes'?
     RLS apagado en estudiantes; anon sigue sin permisos de tabla (revoke):
     [anon] ERROR:  permission denied for table estudiantes 
   → peor caso: además le devuelven el permiso a anon (como hace Supabase por defecto en tablas nuevas):
     [anon] 10 
   → se vuelve a activar RLS (sin política para anon) y se quita el permiso:
     [anon] ERROR:  permission denied for table estudiantes 

=== E1-D. service_role (clave 'secret'): se salta RLS aunque no tenga política
     [service_role] 10 
     [service_role] Isabella Rojas Peña|300 000 0005 Sofía Martínez León|300 000 0008 

=== E1-E. MODO SIN LOGIN (modo_sin_login.sql): el rol anónimo puede TODO
psql:supabase/modo_sin_login.sql:42: NOTICE:  policy "Anónimos gestionan disciplinas" for relation "public.disciplinas" does not exist, skipping
psql:supabase/modo_sin_login.sql:43: NOTICE:  policy "Anónimos gestionan estudiantes" for relation "public.estudiantes" does not exist, skipping
psql:supabase/modo_sin_login.sql:44: NOTICE:  policy "Anónimos gestionan asistencias" for relation "public.asistencias" does not exist, skipping
     [anon] 10 
     [anon] Isabella Rojas Peña|300 000 0005 Sofía Martínez León|300 000 0008 
     [anon] vencido 
     [anon] 
     [anon] ERROR:  aggregate functions are not allowed in RETURNING LINE 1: delete from estudiantes returning count(*) 
   → cerrado de nuevo (modo_con_login.sql) y datos recargados:
     [anon] ERROR:  permission denied for table estudiantes 

=== E1-F. 'authenticated' es UN SOLO ROL para todos los usuarios con sesión (política using(true))
     Dos usuarios distintos (A y B) usan el mismo rol → ven y cambian lo mismo.
     [authenticated] 10 
=== E1-B (repetida). RLS activado, SIN políticas: el INSERT de anon ahora falla por RLS (tabla sin secuencias)
     [anon] 0 
     [anon] ERROR:  new row violates row-level security policy for table "prueba2" 

=== E1-E (repetida). MODO SIN LOGIN: el rol anónimo puede incluso BORRAR TODO (sin WHERE)
     antes: 10 estudiantes
     [anon] anon borró 10 estudiantes 
     después: 0 estudiantes, 0 asistencias (el CASCADE también se llevó la asistencia)
     (restaurado: cerrado de nuevo y seed recargado → 10 estudiantes)
```

</details>

#### 2.5.4 Qué ocurre exactamente al quitar el login en el frontend

Hay **dos candados distintos** y se pueden mover por separado:

1. **El interruptor del cliente** (`REQUIERE_INICIO_DE_SESION` en `config.js`). Con `false`, la app no pide credenciales, crea el cliente de Supabase **sin guardar sesión** (`persistSession: false`) y entra directo. No hay token en `localStorage` (✅ comprobado: `academia-sesion` queda en `null`).
2. **El candado de la base** (las políticas y los permisos del rol `anon`). Es el único que protege los datos.

Quitar **solo el 1** no abre nada: la app abre, pero cada consulta recibe `42501`. En ese caso la aplicación muestra, en lugar de fallar en silencio, este mensaje (✅ comprobado): *«La base de datos no permite el acceso sin iniciar sesión. Ejecuta supabase/modo_sin_login.sql en Supabase (o pon REQUIERE_INICIO_DE_SESION = true en config.js).»*

Quitar **el 1 y el 2** (`modo_sin_login.sql`) es lo que realmente expone los datos. La prueba **E1-E** lo mostró sin adornos:

```text
antes: 10 estudiantes
[anon] anon borró 10 estudiantes
después: 0 estudiantes, 0 asistencias (el CASCADE también se llevó la asistencia)
```

**¿Y mantener la *anon key* expuesta?** Es lo normal y no es el problema. El problema es lo que el rol `anon` tiene permitido. Con `schema.sql`, la clave expuesta no abre nada; con `modo_sin_login.sql`, esa misma clave expuesta abre todo. **La clave no cambió: cambiaron los permisos.**

Por eso el proyecto tiene estas protecciones contra el descuido (🔎 + ✅ pruebas del modo sin login):

- Solo el valor **exacto** `false` quita el login; ausente o cualquier otro valor lo mantiene.
- Hacen falta **dos acciones explícitas** (el SQL y el cambio de `config.js`).
- Una **franja de aviso permanente** recuerda el riesgo mientras el modo está activo, y no hay botón de «cerrar sesión» que sugiera una sesión inexistente.
- `schema.sql` **siempre vuelve a cerrar** la base (elimina las políticas anónimas).
- `config.js` está en `.gitignore`.

Lo que ninguna protección evita: publicar el `config.js` con `false` y la base abierta. Regla para el equipo: **el modo sin login se usa solo en local, con datos de prueba y en un proyecto de pruebas.**

#### 2.5.5 Un solo rol y la trampa del OR

Hoy `authenticated` es **un solo rol para todos los usuarios con sesión** (✅ E1-F: dos usuarios distintos ven y cambian exactamente lo mismo). Hay dos consecuencias:

1. **Depende de los registros públicos.** Si «Allow new users to sign up» está activado, cualquiera puede crearse una cuenta y entrar a todo (S-09, README paso 2). Esto **no se puede verificar desde el repositorio**: hay que mirar el panel.
2. **No sirve para varias academias en una misma base.** AcademiaHub es genérico, pero con `using (true)` una academia vería los datos de otra. Para eso haría falta una columna `academia_id` y políticas que comparen con la academia del usuario (🔎, no implementado).

**La trampa del OR (✅ E1-N1).** Al pasar a políticas por rol, hay que **eliminar** la política vieja `using (true)`. Si se deja, se suma con OR a las nuevas y el control por rol no sirve de nada: en la prueba, un usuario sin rol seguía viendo los 10 estudiantes.

#### 2.5.6 Política por rol (propuesta probada)

El rol se guarda en `app_metadata` del usuario (en el panel: *Authentication → Users → usuario → app_metadata*) y la política lo lee del JWT.

```sql
-- =====================================================================
-- rls_por_rol.sql · PROPUESTA (no aplicada a ninguna base real)
-- Reparte permisos según el rol guardado en app_metadata del usuario:
--   admin    → todo
--   profesor → ve todo, y solo registra/corrige asistencia (no borra, no edita estudiantes)
--   sin rol  → no ve nada (aunque tenga sesión)
-- El rol se asigna a mano en Supabase → Authentication → Users → (usuario) → "app_metadata"
--   ejemplo:  { "rol": "profesor" }
-- NUNCA uses user_metadata para esto: lo puede editar el propio usuario.
-- =====================================================================

-- 1) Quitar la política "todo autenticado". Si se deja, se SUMA a las nuevas
--    (las políticas permisivas se combinan con OR) y el control por rol no sirve de nada.
drop policy if exists "Autenticados gestionan disciplinas" on public.disciplinas;
drop policy if exists "Autenticados gestionan estudiantes" on public.estudiantes;
drop policy if exists "Autenticados gestionan asistencias" on public.asistencias;

drop policy if exists "Admin gestiona disciplinas"  on public.disciplinas;
drop policy if exists "Admin gestiona estudiantes"  on public.estudiantes;
drop policy if exists "Admin gestiona asistencias"  on public.asistencias;
drop policy if exists "Profesor ve disciplinas"     on public.disciplinas;
drop policy if exists "Profesor ve estudiantes"     on public.estudiantes;
drop policy if exists "Profesor ve asistencias"     on public.asistencias;
drop policy if exists "Profesor registra asistencias" on public.asistencias;
drop policy if exists "Profesor corrige asistencias"  on public.asistencias;

-- 2) El administrador puede todo.
--    "(select ...)" hace que Postgres evalúe el rol una vez por consulta y no por fila.
create policy "Admin gestiona disciplinas" on public.disciplinas for all to authenticated
  using      ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');
create policy "Admin gestiona estudiantes" on public.estudiantes for all to authenticated
  using      ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');
create policy "Admin gestiona asistencias" on public.asistencias for all to authenticated
  using      ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

-- 3) El profesor: lee todo; en asistencias además inserta y corrige (no borra).
create policy "Profesor ve disciplinas" on public.disciplinas for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'profesor');
create policy "Profesor ve estudiantes" on public.estudiantes for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'profesor');
create policy "Profesor ve asistencias" on public.asistencias for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'profesor');
create policy "Profesor registra asistencias" on public.asistencias for insert to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'profesor');
create policy "Profesor corrige asistencias" on public.asistencias for update to authenticated
  using      ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'profesor')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'profesor');
```

Resultados (✅ E1-N, con un `auth.jwt()` imitando el de Supabase):

| Quién | Qué pasó |
|---|---|
| Admin | ve 10 estudiantes · edita · borra |
| **Profesor** | ve 10 estudiantes y la asistencia · **no puede editar estudiantes (0 filas)** · **no puede borrar asistencias (0 filas)** · sí corrige una asistencia · **no puede crear un estudiante** (violación de RLS) |
| Con sesión pero **sin rol** | ve **0** estudiantes |
| Se pone `rol = admin` en **su propio `user_metadata`** | ve **0** (la política solo mira `app_metadata`) |
| Anónimo | `permission denied` |

**Por qué nunca `user_metadata`:** lo puede editar el propio usuario desde el cliente; `app_metadata` solo lo cambia el administrador del proyecto (📚 comportamiento documentado de Supabase; el efecto sobre la política se comprobó en N5).

> Si se aplican estas políticas, la aplicación tendría que adaptarse: un profesor vería botones («Editar», «Desactivar») que la base rechazaría. Hay que ocultarlos según el rol **por comodidad** (la seguridad ya la da la base).

### 2.6 Hashing, cifrado y codificación

Tres cosas distintas que se confunden mucho:

| | ¿Reversible? | ¿Para qué? | Ejemplo | ¿Sirve para contraseñas? |
|---|---|---|---|---|
| **Hash** | No (solo se puede *comparar*) | Guardar contraseñas, verificar integridad | bcrypt, Argon2, SHA-256 | **Sí**, pero solo con algoritmos *lentos y con sal*: bcrypt o Argon2 |
| **Cifrado** | Sí, con la clave | Guardar datos que luego hay que leer | AES, `pgp_sym_encrypt` | No (la contraseña no debe poder recuperarse) |
| **Codificación** | Sí, **sin clave** | Representar datos | Base64, URL-encoding, el cuerpo de un JWT | **Nunca**: no protege nada |

**Demostración con bcrypt** (✅ E1-J, extensión `pgcrypto`, lo que Supabase Auth hace por dentro):

```text
hash 1 de "mi_clave_segura": $2a$08$94Og8uA/CEhoPrXGTXp4petKfgP565LsxtVml0HGOoycunS8ss9fS
hash 2 de la MISMA clave:    $2a$08$9SUUi0K1.2hbkb0iUtyTOea3EuYF174l/9ND8ZN/vqvWj3QFS2ZzG
clave correcta → true | clave incorrecta → false
MD5 de "mi_clave_segura" (NO usar para contraseñas): 5cab168f8e24891f300bb1f1f6450e33 → siempre el mismo
```

Cómo leerlo:

- **Dos hashes distintos de la misma clave:** cada uno lleva una **sal** aleatoria (22 caracteres tras `$2a$08$`). Dos usuarios con la misma contraseña no tienen el mismo hash, y las «tablas arcoíris» (hashes precalculados) dejan de servir.
- **`$2a$08$`** indica el algoritmo (bcrypt) y su **costo**: lo hace deliberadamente lento para que probar millones de claves sea caro. (El `08` es el costo que usó esta demostración; no afirmo el que usa Supabase.)
- **MD5/SHA sin sal siempre da lo mismo** y es muy rápido: justo lo que quiere un atacante.

**¿Qué hace AcademiaHub con las contraseñas?** Nada: **no las toca**. Las recibe Supabase Auth, que guarda un hash (📚 bcrypt en `auth.users`). Es la mejor decisión de diseño del proyecto en este tema: **nunca escribas tu propio sistema de contraseñas** si puedes delegarlo.

**Recomendaciones para el colegio**

- Si algún día guardan contraseñas por su cuenta: bcrypt o Argon2, nunca MD5/SHA-1/SHA-256 sin más, ni cifrado reversible.
- **Datos en reposo:** el teléfono del acudiente es un dato personal. Cifrarlo columna a columna (`pgp_sym_encrypt`) es posible, pero obliga a guardar la clave en algún sitio y a descifrar para buscar; para este proyecto, lo razonable es el cifrado de disco del proveedor (📚) más RLS bien hecho.
- **Datos en tránsito:** HTTPS siempre. Supabase, GitHub Pages y Netlify lo dan (📚). La página nunca debe cargarse por `http://` en producción.
- Un JWT **no es secreto en su contenido** (base64); lo que lo protege es la **firma**. No pongas datos sensibles en `user_metadata`/`app_metadata`.

### 2.7 Sanitización, validación y escape

Tres verbos con tres trabajos distintos:

| Verbo | Pregunta que responde | Dónde ocurre | En AcademiaHub |
|---|---|---|---|
| **Validar** | ¿Tiene la forma que espero? | Al **recibir** (cliente = UX; base = seguridad) | `validarNombreDeDisciplina`, `CHECK`, `UNIQUE`… |
| **Sanitizar / normalizar** | ¿Puedo limpiarlo? | Al **recibir** | `trim()` y colapsar espacios repetidos |
| **Escapar / codificar la salida** | ¿Cómo evito que el navegador lo *ejecute*? | Al **mostrar** | `textContent`, plantillas, React |

**Idea central:** la defensa contra XSS **no** es borrar caracteres «peligrosos» al guardar (siempre se escapa algo, y un apellido como *O'Brien* o *D'Angelo* es legítimo); es **tratar siempre los datos como texto al mostrarlos** (📚 es la recomendación de OWASP). Es lo que hace el proyecto, y por eso las 14 cargas se guardaron tal cual y se vieron como texto plano (✅ AT-04).

```js
// ❌ MAL: el texto del usuario se interpreta como HTML
fila.innerHTML = "<td>" + estudiante.nombre_completo + "</td>";   // "<img onerror=…>" se EJECUTA

// ✅ BIEN (JavaScript puro): se asigna como TEXTO
fila.querySelector('[data-texto="nombre"]').textContent = estudiante.nombre_completo;   // se VE como texto

// ✅ BIEN (React): lo que va entre llaves se escapa solo
html`<td>${estudiante.nombre_completo}</td>`
```

**Lista de comprobación del código** (✅ búsqueda en `app.js`, `asistencia-react.js` e `index.html`): no aparece `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function` ni `dangerouslySetInnerHTML`.

**Inyección SQL** (✅ E1-L). La entrada `x' OR '1'='1` contra una consulta armada **concatenando texto** devolvió 2 filas (se saltó el filtro); contra la consulta **parametrizada** devolvió 0 (la trató como un nombre raro). El proyecto nunca concatena SQL: supabase-js envía los datos como JSON a PostgREST, que arma consultas parametrizadas.

<details>
<summary>Ver la salida completa de E1-K y E1-L (política por rol e inyección SQL)</summary>

```text
=== E1-K. POLÍTICA POR ROL: solo quien tenga rol 'admin' en app_metadata (no basta con tener sesión)
NOTICE:  policy "Solo admin gestiona estudiantes" for relation "public.estudiantes" does not exist, skipping
     [admin (app_metadata.rol = admin)] ve 10 estudiantes 
     [admin cambia un dato] actualizó 1 
     [usuario con sesión pero SIN rol] ve 0 estudiantes 
     [ese usuario intenta insertar] ERROR:  new row violates row-level security policy for table "estudiantes" 
     [profesor (app_metadata.rol = profesor)] ve 0 estudiantes 
   → TRAMPA: el usuario escribe 'admin' en SU PROPIO user_metadata (que sí puede editar):
     [user_metadata.rol = admin (falso)] ve 0 estudiantes 
     (la política solo mira app_metadata, que solo puede cambiar el administrador de Supabase: por eso user_metadata nunca se usa para permisos)

=== E1-L. INYECCIÓN SQL: consulta armada con texto vs. parametrizada (tabla desechable)
  Entrada maliciosa: x' OR '1'='1
NOTICE:  CONCATENADA  → devolvió 2 filas (¡se saltó el filtro!)
NOTICE:  PARAMETRIZADA → devolvió 0 filas (lo trató como un nombre de usuario raro)
  (La librería de Supabase envía los datos como JSON a PostgREST, que arma consultas parametrizadas: el proyecto nunca concatena SQL.)
```

</details>

**Política de seguridad de contenido (CSP) y *Subresource Integrity* (SRI)**

La CSP es una segunda red: aunque algún día se colara un XSS, el navegador se niega a ejecutar scripts que no vengan de sitios permitidos. Esta es la política que se probó (✅ AT-06):

```text
default-src 'none'; script-src 'self' https://cdn.jsdelivr.net https://cdn.tailwindcss.com;
style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src https://*.supabase.co;
base-uri 'none'; form-action 'self'; object-src 'none'
```

Se pone como `<meta http-equiv="Content-Security-Policy" content="…">` en el `<head>`, antes de cualquier script. Limitaciones que hay que decir con honestidad:

- **No está desplegada**, solo probada (con el Supabase simulado y CSS compilado; **no** con el CDN real de Tailwind).
- `'unsafe-inline'` en estilos debilita la protección; se necesita porque Tailwind por CDN inyecta estilos al vuelo (🔎). Compilar Tailwind permitiría quitarlo.
- Permitir `cdn.jsdelivr.net` como origen de scripts permite **cualquier paquete de npm** que se sirva desde ahí (📚). Por eso la CSP **no sustituye** a la SRI.
- Con `<meta>` no se pueden usar algunas directivas (como `frame-ancestors`); GitHub Pages no permite cabeceras HTTP propias (📚).

**SRI** protege contra un CDN comprometido o alterado: el navegador compara el *hash* del archivo con el que tú declaraste y, si no coincide, **no lo ejecuta**. En este momento ningún `<script>` lleva `integrity` (🔎 `index.html`, líneas 508 a 514). Para calcularlo:

```bash
curl -s https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js \
  | openssl dgst -sha384 -binary | openssl base64 -A
# → pega el resultado así:
# <script src="…react.production.min.js" integrity="sha384-RESULTADO" crossorigin="anonymous"></script>
```

*No incluyo los valores de los hash:* desde este entorno no pude descargar los archivos del CDN, así que no puedo garantizar que coincidan con lo que sirve jsDelivr. Calcúlalos tú y comprueba que la página sigue cargando. **Tailwind por CDN no puede llevar SRI** (no tiene versión fija); la solución es compilarlo o aceptar el riesgo de forma consciente.

### 2.8 Control de acceso: tres preguntas, tres capas

| Pregunta | Concepto | Cómo se responde hoy | Mejora |
|---|---|---|---|
| ¿**Quién** eres? | Autenticación | Supabase Auth con correo y contraseña | MFA 📚, política de contraseñas fuertes 📚, registros públicos desactivados |
| ¿**Qué** puedes hacer? | Autorización | RLS: «todo el que tenga sesión puede todo» | Roles (sección 2.5.6) |
| ¿Cuánto **necesitas**? | Mínimo privilegio | `anon` sin permisos; `authenticated` con permisos completos | Profesor solo con asistencia; nadie con `DELETE` salvo el admin |

Buenas prácticas en orden de prioridad:

1. Confirmar que **«Allow new users to sign up» está desactivado** (S-09).
2. Una persona = una cuenta; nadie comparte la contraseña del administrador.
3. Dar a cada usuario solo el rol que necesita.
4. Contraseñas largas; activar MFA si el plan de Supabase lo ofrece (📚 confirmarlo en el panel).
5. Revisar periódicamente *Authentication → Users*.
6. Mantener una bitácora si hay más de un usuario (S-07; no implementada).

### 2.9 Datos de menores: una nota de orientación

AcademiaHub guarda nombre, edad y teléfono de **niños y adolescentes**. En Colombia, la **Ley 1581 de 2012** (protección de datos personales) da una protección especial a los datos de niños, niñas y adolescentes, y exige, entre otras cosas, **autorización** del titular o de sus representantes y **finalidad clara** del tratamiento (📚). Esto es **orientación, no asesoría legal**: antes de usar datos reales, el colegio o la academia debe consultarlo con quien corresponda.

Buenas prácticas técnicas que ayudan en cualquier caso: pedir solo los datos necesarios (¿hace falta la edad exacta o basta «menor/mayor»?), no usar datos reales en demostraciones (usar `seed.sql`), no capturar pantallas con datos reales y definir quién puede ver y borrar.

### 2.10 Qué explicar en el colegio (Parte 1)

**Cuatro ideas que debes poder decir sin leer:**

1. *«La clave anon es pública a propósito. Lo que protege los datos son las reglas de la base (RLS), no esconder la clave.»*
2. *«El login es la puerta; RLS es la cerradura. Si quitas la puerta pero dejas la cerradura, nadie entra. Si quitas la cerradura, la puerta da igual.»*
3. *«Validamos en el navegador para que sea cómodo y en la base para que sea seguro: dos capas.»*
4. *«Los datos del usuario siempre se tratan como texto al mostrarlos, así que un `<script>` en un nombre solo se ve como texto.»*

**Preguntas que pueden hacer, y cómo responder**

| Pregunta | Respuesta corta y honesta |
|---|---|
| ¿Por qué se puede entrar sin login? | Es un modo de prueba, apagado por defecto, que necesita dos acciones explícitas y muestra una franja de aviso. Deja la base abierta, así que solo se usa en local y con datos de prueba |
| ¿No es peligroso mostrar la anon key? | No: es pública por diseño. Peligroso sería mostrar la `service_role`. Lo que cuenta es lo que el rol `anon` puede hacer: con nuestro `schema.sql`, nada |
| ¿Qué pasa si alguien edita el JavaScript con F12? | Solo afecta su pestaña. Las reglas importantes están en la base y la base no le hace caso (lo probamos reemplazando funciones: la base rechazó igual al menor sin acudiente) |
| ¿Cómo evitan el XSS? | No usamos `innerHTML`; ponemos todo con `textContent` o con React, que escapa por defecto. Probamos 14 cargas maliciosas y ninguna se ejecutó |
| ¿Cómo guardan las contraseñas? | No las guardamos nosotros: las maneja Supabase Auth con un hash bcrypt con sal. Nunca debe guardarse una contraseña en texto plano |
| ¿Qué es RLS? | Reglas dentro de la base que dicen qué filas puede ver o cambiar cada rol. Sin una regla que lo permita, el rol no ve nada |
| ¿Qué les falta? | Roles (hoy todos los usuarios con sesión pueden todo), límites de longitud y fecha en la base, SRI en los scripts, bitácora y revisar que los registros públicos estén desactivados |
| ¿Qué error real encontraron? | Pulsar Enter dos veces creaba dos estudiantes. Lo detectó la auditoría y se corrigió con un candado |

---

## 3. Parte 2 · React frente a JavaScript puro

### 3.1 Dos formas de pensar la misma pantalla

| | **JavaScript puro («vainilla»)** | **React** |
|---|---|---|
| Estilo | **Imperativo**: «haz esto, luego esto» | **Declarativo**: «así debe verse con estos datos» |
| Quién toca la pantalla | **Tú**: `textContent`, `replaceChildren()`, `classList.toggle()` | React: compara lo nuevo con lo anterior y cambia solo lo distinto |
| Dónde vive la verdad | Repartida: variables **y** el DOM | En el **estado**; la pantalla es una consecuencia |
| Riesgo típico | Olvidar un paso y que la pantalla muestre datos viejos | Entender cuándo y por qué se vuelve a dibujar |

```text
VAINILLA   evento ──► cambian los datos ──► TÚ actualizas cada pedazo de pantalla a mano
REACT      evento ──► setEstado(nuevo)  ──► React vuelve a ejecutar el componente,
                                            compara con lo anterior y toca SOLO lo distinto
```

### 3.2 Qué hicimos ya en AcademiaHub

- **Una «isla» de React**: la vista de **Asistencia** (`asistencia-react.js`, 374 líneas, con 9 `useState` y 2 `useEffect`). El resto de la aplicación (`app.js`, 1.425 líneas) es JavaScript puro.
- Se conectan con un pequeño **puente** (`window.VistaAsistencia` con `abrir`, `cerrar` y `tieneCambiosSinGuardar`) para que el menú, el cierre de sesión y el aviso «¿Descartar cambios?» funcionen igual en ambos mundos.
- Se carga **sin npm ni compilador**: tres `<script>` por CDN (React 18.3.1, ReactDOM 18.3.1 y `htm` 3.1.1). `htm` permite escribir marcado dentro de plantillas de texto, como un JSX que no necesita compilarse.
- Mover esa única vista a React tocó 3 archivos (+446 / −349 líneas): el tamaño del código casi no cambió; lo que cambió fue la forma de pensarlo.

### 3.3 El mismo componente, dos estilos

Los dos ejemplos de esta sección están **ejecutados contra la aplicación real**: producen el mismo texto que la versión de JavaScript puro con los mismos datos y los mismos filtros (✅ 15 comprobaciones, sin errores ni advertencias de React en la consola).

#### 3.3.1 `<TarjetaDashboard/>`

**Vainilla.** El HTML de la tarjeta está copiado **cuatro veces** en `index.html` (cambian el color, el título y el `id`) y `app.js` rellena cada una por separado:

```html
          <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex items-center gap-2 text-sm font-medium text-slate-500">
              <span class="h-2.5 w-2.5 rounded-full bg-indigo-500" aria-hidden="true"></span>
              Estudiantes activos
            </div>
            <p id="dash-activos" class="mt-2 text-3xl font-bold text-slate-900">—</p>
          </div>
```

```js
// app.js · dibujarDashboard()  (una línea por tarjeta)
elementos.dashActivos.textContent = metricas.activos;
elementos.dashAlDia.textContent = metricas.alDia;
elementos.dashPendientes.textContent = metricas.pendientes;
elementos.dashVencidos.textContent = metricas.vencidos;
```

**React.** **Una** definición, reutilizada cuatro veces:

```js
// EJEMPLO DIDÁCTICO (no se carga en la app). Necesita React y htm:  const html = htm.bind(React.createElement);
// <TarjetaDashboard/>: UNA definición que se reutiliza para las 4 tarjetas
function TarjetaDashboard({ titulo, valor, colorDelPunto }) {
  return html`
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <span className=${"h-2.5 w-2.5 rounded-full " + colorDelPunto} aria-hidden="true"></span>
        ${titulo}
      </div>
      <p className="mt-2 text-3xl font-bold text-slate-900">${valor}</p>
    </div>
  `;
}

// El panel recibe las métricas (o null mientras cargan) y dibuja las 4 tarjetas.
function PanelDeTarjetas({ metricas }) {
  const v = (campo) => (metricas ? metricas[campo] : "—");   // "—" mientras no hay datos
  return html`
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <${TarjetaDashboard} titulo="Estudiantes activos" valor=${v("activos")}    colorDelPunto="bg-indigo-500" />
      <${TarjetaDashboard} titulo="Pagos al día"        valor=${v("alDia")}      colorDelPunto="bg-emerald-500" />
      <${TarjetaDashboard} titulo="Pagos pendientes"    valor=${v("pendientes")} colorDelPunto="bg-amber-500" />
      <${TarjetaDashboard} titulo="Pagos vencidos"      valor=${v("vencidos")}   colorDelPunto="bg-rose-500" />
    </div>
  `;
}
```

Mientras las métricas cargan (`metricas = null`) muestra «—», igual que el Dashboard recién abierto (✅).

**Lectura honesta:** si mañana quieren cambiar el diseño de la tarjeta, en React se cambia en **un** sitio y en vainilla en **cuatro**. Pero para cuatro tarjetas con cuatro números, usar React es un cañón para matar una mosca.

#### 3.3.2 `<TablaEstudiantes/>`

**Vainilla (código real de `app.js`).** Una plantilla `<template>` en el HTML, una función que la rellena y otra que **vacía y vuelve a dibujar todas las filas** cada vez que cambia un filtro:

```js
// Crea la fila de la tabla para un estudiante, copiando la plantilla del HTML.
function crearFilaDeEstudiante(estudiante) {
  const fila = elementos.plantillaFilaEstudiante.content.firstElementChild.cloneNode(true);
  const estaInactivo = !estudiante.activo;

  ponerTextoEnFila(fila, "nombre", estudiante.nombre_completo);
  ponerTextoEnFila(fila, "edad", estudiante.edad + " años");
  ponerTextoEnFila(fila, "disciplina", estudiante.disciplinas ? estudiante.disciplinas.nombre : "—");
  ponerTextoEnFila(fila, "categoria", estudiante.categoria || "—");
  ponerTextoEnFila(fila, "acudiente", describirAcudiente(estudiante));

  // Etiqueta del estado de pago (gris si el estudiante está inactivo)
  const estiloDePago = ESTILOS_DE_PAGO[estudiante.estado_pago];
  const etiquetaDePago = fila.querySelector('[data-texto="estado-pago"]');
  etiquetaDePago.textContent = estiloDePago.texto;
  etiquetaDePago.className += " " + (estaInactivo ? CLASES_DE_PAGO_INACTIVO : estiloDePago.clases);

  // La fila se pinta de gris con data-inactivo (lo detectan las clases group-data-[...] del HTML)
  fila.dataset.inactivo = estaInactivo ? "true" : "false";
  fila.querySelector('[data-texto="etiqueta-inactivo"]').classList.toggle("hidden", !estaInactivo);

  // Cada botón guarda el id del estudiante; manejarClicEnTablaDeEstudiantes lo lee al hacer clic
  fila.querySelectorAll("button[data-accion]").forEach((boton) => {
    boton.dataset.id = estudiante.id;
  });
  fila.querySelector('[data-accion="desactivar"]').classList.toggle("hidden", estaInactivo);
  fila.querySelector('[data-accion="reactivar"]').classList.toggle("hidden", !estaInactivo);

  return fila;
}

// Vuelve a dibujar la tabla según los filtros actuales.
function dibujarTablaEstudiantes() {
  const lista = obtenerEstudiantesFiltrados();
  const mostrarInactivos = elementos.filtroInactivos.checked;
  const totalSinFiltrar = estado.estudiantes.filter((e) => mostrarInactivos || e.activo).length;

  elementos.cuerpoTablaEstudiantes.replaceChildren();
  lista.forEach((estudiante) => {
    elementos.cuerpoTablaEstudiantes.appendChild(crearFilaDeEstudiante(estudiante));
  });

  // Mensaje cuando no hay nada que mostrar (solo si la carga salió bien:
  // si falló, ya hay un aviso de error y no queremos decir que "no hay estudiantes").
  const hayFilas = lista.length > 0;
  const mostrarMensajeDeVacio = estado.estudiantesCargados && !hayFilas;
  elementos.contenedorTablaEstudiantes.classList.toggle("hidden", !hayFilas);
  elementos.mensajeSinEstudiantes.classList.toggle("hidden", !mostrarMensajeDeVacio);
  elementos.mensajeSinEstudiantes.textContent = totalSinFiltrar === 0
    ? "Todavía no hay estudiantes. Pulsa «+ Nuevo estudiante» para agregar el primero."
    : "Ningún estudiante coincide con la búsqueda o el filtro.";

  elementos.contadorEstudiantes.textContent = estado.estudiantesCargados
    ? "Mostrando " + lista.length + " de " + totalSinFiltrar + " estudiantes"
    : "";
}
```

**React.** El componente describe cómo se ve la tabla *para unos datos y unos filtros*; el único que guarda estado es el panel:

<details>
<summary>Ver el ejemplo completo en React (<code>TablaEstudiantes</code>, <code>FilaDeEstudiante</code> y <code>PanelDeEstudiantes</code>)</summary>

```js
// EJEMPLO DIDÁCTICO (no se carga en la app). Necesita React, htm y la función normalizarTexto() de app.js.
// const html = htm.bind(React.createElement);
const { useState } = React;

const ETIQUETAS_DE_PAGO = { al_dia: "Al día", pendiente: "Pendiente", vencido: "Vencido" };

// <FilaDeEstudiante/>: una fila. Recibe sus datos por "props" y avisa con funciones.
function FilaDeEstudiante({ estudiante, alEditar, alCambiarActivo }) {
  const acudiente = [estudiante.acudiente_nombre, estudiante.acudiente_telefono]
    .filter(Boolean).join(" · ") || "—";

  return html`
    <tr data-inactivo=${!estudiante.activo}>
      <td>
        ${estudiante.nombre_completo}${" "}
        ${!estudiante.activo && html`<span>Inactivo</span>`}
      </td>
      <td>${estudiante.edad} años</td>
      <td>${estudiante.disciplinas ? estudiante.disciplinas.nombre : "—"}</td>
      <td>${estudiante.categoria || "—"}</td>
      <td>${acudiente}</td>
      <td>${ETIQUETAS_DE_PAGO[estudiante.estado_pago]}</td>
      <td>
        <div className="flex gap-2">
          <button onClick=${() => alEditar(estudiante)}>Editar</button>
          <button onClick=${() => alCambiarActivo(estudiante)}>${estudiante.activo ? "Desactivar" : "Reactivar"}</button>
        </div>
      </td>
    </tr>
  `;
}

// <TablaEstudiantes/>: filtra y dibuja. NO guarda nada: todo sale de sus "props".
function TablaEstudiantes({ estudiantes, texto, idDisciplina, mostrarInactivos, alEditar, alCambiarActivo }) {
  const buscado = normalizarTexto(texto.trim());
  const base = estudiantes.filter((e) => mostrarInactivos || e.activo);
  const visibles = base.filter((e) =>
    (idDisciplina === "" || String(e.disciplina_id) === idDisciplina) &&
    normalizarTexto(e.nombre_completo).includes(buscado));

  if (visibles.length === 0) {
    return html`<p>Ningún estudiante coincide con la búsqueda o el filtro.</p>`;
  }

  return html`
    <div>
      <p>Mostrando ${visibles.length} de ${base.length} estudiantes</p>
      <table>
        <tbody>
          ${visibles.map((e) => html`<${FilaDeEstudiante} key=${e.id} estudiante=${e} alEditar=${alEditar} alCambiarActivo=${alCambiarActivo} />`)}
        </tbody>
      </table>
    </div>
  `;
}

// <PanelDeEstudiantes/>: el ÚNICO que tiene ESTADO (lo que se escribe y el checkbox).
function PanelDeEstudiantes({ estudiantes, alEditar, alCambiarActivo }) {
  const [texto, setTexto] = useState("");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  return html`
    <div>
      <input placeholder="Buscar por nombre..." value=${texto} onInput=${(evento) => setTexto(evento.target.value)} />
      <label>
        <input type="checkbox" checked=${mostrarInactivos} onChange=${(evento) => setMostrarInactivos(evento.target.checked)} />
        Mostrar inactivos
      </label>
      <${TablaEstudiantes} estudiantes=${estudiantes} texto=${texto} idDisciplina=""
                           mostrarInactivos=${mostrarInactivos} alEditar=${alEditar} alCambiarActivo=${alCambiarActivo} />
    </div>
  `;
}
```

</details>

| | Vainilla | React |
|---|---|---|
| Cómo se llena una fila | `querySelector` + `textContent` campo por campo | Se escribe el marcado con `${dato}` dentro |
| Cómo cambia la pantalla al filtrar | `replaceChildren()` y recrear **todas** las filas | Se calcula la lista visible y React aplica la diferencia |
| Dónde está el estado del buscador | En el DOM (`input.value`) y en variables sueltas | En un `useState` |
| Escape de HTML | Hay que acordarse de usar `textContent` | Automático |
| Botones de la fila | Delegación de eventos con `data-id` | Funciones pasadas como *props* (`alEditar`, `alCambiarActivo`) |

**Dos tropiezos reales al escribir estos ejemplos** (✅ los encontró la prueba; valen como ejemplo de la curva de aprendizaje):

1. Con `htm`, los espacios en blanco entre etiquetas se **colapsan**: el texto de un botón y su etiqueta quedaban pegados hasta que se añadió un espacio explícito (`${" "}`).
2. Una plantilla de `htm` con **varias raíces** devuelve una lista, y React exige un `key` en cada elemento: apareció la advertencia hasta envolver el contenido en un solo `<div>`.

### 3.4 Rendimiento: lo que midió el benchmark

**Qué se midió.** Se tomó el código **real** de `app.js` (`crearFilaDeEstudiante`, la plantilla del HTML) y se comparó con un componente de React que genera **el mismo DOM** (19 nodos por fila en los dos, ✅ comprobado). Cada medida es la **mediana** de 15 repeticiones (9 para 5.000 filas), tras 2 de calentamiento, e incluye el cálculo de *layout* del navegador.

| Escenario | Qué hace |
|---|---|
| **S1** | Dibujar la tabla completa por primera vez |
| **S2** | Escribir `estudiante 1` en el buscador, **tecla a tecla** (12 pulsaciones). La versión vainilla hace lo que hace nuestra app: vaciar y recrear las filas que coinciden |
| **S3** | Cambiar **un** estudiante (su estado de pago) |

Tiempos en **milisegundos** (menos es mejor). *Vainilla (1 fila)* es una variante optimizada a mano que reemplaza solo la fila cambiada (no es lo que hace hoy la app).

| Filas | **S1** vainilla | **S1** React | **S2** vainilla | **S2** React | **S3** vainilla (redibuja todo) | **S3** vainilla (1 fila) | **S3** React |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 100 | 13,4 | 15,2 | 175,6 | 14,0 | 13,5 | **0,8** | 13,2 |
| 300 ¹ | 41,0 | 43,8 | 619,7 | 38,0 | 41,9 | **1,9** | 24,8 |
| 1.000 | 209,9 | **165,5** | 1.967,9 | **160,1** | 195,1 | **12,3** | 116,3 |
| 5.000 | **794,0** | 1.039,9 | 10.878,8 | **1.450,4** | 822,2 | **41,5** | 577,0 |

¹ La fila de 300 viene de una segunda corrida independiente. En esa corrida, los valores de 100 y 1.000 filas coincidieron con la primera dentro de ≈ 5 % (por ejemplo, S2 con 1.000 filas: 2.070,6 frente a 1.967,9 en vainilla y 161,9 frente a 160,1 en React).

**Lo que dicen los números** (✅ medido; las lecturas son análisis):

1. **A nuestro tamaño no hay diferencia perceptible.** Con 100 filas, dibujar toda la tabla cuesta ≈ 13–15 ms en ambos (un cuadro de pantalla a 60 Hz dura ≈ 16,7 ms).
2. **Al escribir en el buscador, nuestra forma de redibujar todo se encarece rápido:** ≈ 15 ms por tecla con 100 filas, ≈ **164 ms** con 1.000 y ≈ 907 ms con 5.000. Como referencia general, por encima de ≈ 100 ms la gente nota el retraso (📚). React hace lo mismo con ≈ 1 ms, ≈ 13 ms y ≈ 121 ms por tecla: **no vuelve a escribir en el DOM lo que no cambió**.
3. **Dibujar por primera vez: empate técnico.** React es más lento con 100 y 5.000 filas y más rápido con 1.000; las diferencias son pequeñas y cambian de signo.
4. **Un vainilla optimizado a mano le gana a React al cambiar una fila:** 12,3 ms frente a 116,3 ms con 1.000 filas (≈ 9 veces), 41,5 frente a 577 ms con 5.000 (≈ 14 veces). Tiene sentido: con una sola fila cambiada, el vainilla toca una fila y React revisa las 1.000.
5. **Moraleja:** React **no es más rápido por ser React**. Es más rápido que el vainilla *ingenuo* («borro todo y dibujo todo») y más lento que el vainilla *optimizado a mano*. Lo que compra React es que **el camino fácil sea razonablemente eficiente** sin escribir esa optimización para cada caso.

**Advertencias (importantes para no exagerar en la exposición)**

- El «vainilla» de S2 es la versión **ingenua**. Una versión vainilla que solo oculte filas con la clase `hidden`, o que espere unos milisegundos antes de filtrar (*debounce*), **no se midió** y probablemente cerraría gran parte de la diferencia (🔎).
- Los componentes de React **no usan `React.memo`**; con él, S3 probablemente mejoraría (📚, no medido).
- Chromium sin interfaz en un contenedor: los valores absolutos serán **mayores en un celular de gama baja**; fíate de las proporciones.
- *¿Cuántos estudiantes tiene una academia?* Es una suposición: decenas a pocos cientos. En ese rango, el rendimiento **no es el factor que decide**.

### 3.5 Tiempos de carga y peso

| Librería | Tamaño | Comprimido (gzip) |
|---|---:|---:|
| `react` 18.3.1 | 10,5 KB | 4,2 KB |
| `react-dom` 18.3.1 | 128,7 KB | 41,8 KB |
| `htm` 3.1.1 | 1,3 KB | 0,7 KB |
| **React + ReactDOM + htm** | **140,6 KB** | **46,7 KB** |
| `supabase-js` 2.117.2 (lo que ya cargábamos) | 212,8 KB | 54,0 KB |

*(KB = 1.024 bytes; medidos sobre los archivos publicados en npm, que son los que sirve el CDN.)*

- Añadir React **casi duplica** el JavaScript que se descarga: de ≈ 54 KB a ≈ 101 KB comprimidos (🔎 suma de los valores de arriba).
- **Tiempo de ejecución** de los scripts al cargar la página (mediana de 9 cargas, sin contar la red): **11,6 ms** para React + ReactDOM + htm frente a **21,7 ms** para el SDK de Supabase (✅). Es decir, ejecutar React es barato; descargarlo es lo que pesa, sobre todo con mala conexión.
- **No se midió el CDN de Tailwind**, que probablemente sea la pieza más pesada de la página; no lo afirmo (📚).
- Los siete `<script>` de la aplicación están al final del `<body>`, de modo que el HTML ya se puede mostrar mientras cargan. El de Tailwind está en el `<head>` y sí retrasa el primer dibujo (🔎, no medido).

### 3.6 Complejidad de aprendizaje en primer año

React **no reemplaza** lo que ya saben, se **suma**: para entender un error de React hay que entender el DOM, los eventos y `async/await`.

| Concepto | Vainilla | React | ¿Es nuevo en React? |
|---|---|---|---|
| DOM, eventos, `fetch`/`async` | Imprescindible | Imprescindible | No |
| Componente (una función que devuelve marcado) | — | Imprescindible | **Sí** |
| *Props* (datos que entran) | — | Imprescindible | **Sí** |
| Estado y re-dibujado (`useState`) | — | Imprescindible | **Sí** (es el cambio mental más grande) |
| Efectos y dependencias (`useEffect`) | — | Imprescindible | **Sí**; la fuente de errores más frecuente |
| *Keys* en listas | — | Necesario | **Sí** |
| Datos inmutables (copiar en vez de modificar) | Opcional | Necesario | **Sí** |
| JSX / compilador | — | JSX necesita compilar; `htm` no | Herramientas nuevas |
| Reglas de los *hooks* | — | Imprescindible | **Sí** |

**Costos de integración que aparecieron en este proyecto** (✅ vividos, no teóricos) por **mezclar** los dos modelos:

- Se necesitó `ReactDOM.flushSync` para que un cambio de estado se reflejara en la pantalla *en el mismo instante* en que el código vainilla lo comprobaba.
- Al cerrar sesión o salir de la vista, hay que **vaciar el estado de React a mano** desde fuera (el puente), porque React no sabe que el mundo vainilla cambió.
- **React 19 ya no ofrece versión para `<script>`** (✅ comprobado: el paquete `react@19.3.1` no trae la carpeta `umd`). Sin compilador nos quedamos en React 18.3.1.

**Veredicto de aprendizaje:** para un grupo de primer año, React es alcanzable en una vista pequeña y con acompañamiento, pero **no** como base de todo el proyecto. El riesgo no es «no entender la sintaxis», sino no saber *por qué* se vuelve a dibujar algo.

### 3.7 Mantenimiento

| Criterio | Vainilla (como lo hicimos) | React |
|---|---|---|
| Reutilizar una pieza | Copiar HTML o escribir funciones que clonan plantillas | Componentes: una definición, muchos usos |
| Mantener datos y pantalla sincronizados | Disciplina del equipo (hay que acordarse de cada actualización) | Automático a partir del estado |
| Pruebas | Se prueba en el navegador completo (lo que hicimos) | Se pueden probar componentes aislados, pero necesita herramientas (📚) |
| Dependencias | Cuatro `<script>` con versión fija; sin `package.json` | Igual con CDN; con npm aparecen actualizaciones y vulnerabilidades de dependencias que vigilar (📚) |
| Actualizar versiones | Cambiar la URL | Pasar de React 18 a 19 **obliga a salir del CDN** (✅ sección 3.6) |
| Incorporar a alguien nuevo | Cualquiera que sepa JavaScript | Hay que saber también React |
| Deuda técnica actual | — | **Dos estilos de código** en un repositorio pequeño (README §10) |

### 3.8 Estrategias de migración

| | Opción | Ventajas | Inconvenientes |
|---|---|---|---|
| A | **Solo vainilla** (deshacer la isla) | Un solo modelo mental; sin librerías extra | Más repetición en vistas con mucho estado |
| **B** | **Islas** (lo actual): React solo donde hay mucho estado | Aprendizaje gradual; el resto no se toca | Dos modelos y un puente que mantener |
| C | Todo en React, por CDN + `htm` | Un solo modelo | Sin JSX; atascados en React 18; más peso inicial |
| D | **Vite + React** (npm, JSX, React 19) | Estándar de la industria; pruebas de componentes; Tailwind compilado | Sale de la regla «sin npm»; hace falta Node, un paso de *build* y publicar la carpeta `dist` |
| E | Alternativas ligeras (Preact, Alpine.js, Lit) | Menos peso o menos conceptos | **No las probé** (📚); otro conjunto de cosas por aprender |

**Cuándo pasar de B a D** (disparadores, 🔎): más de ≈ 500 filas visibles con búsqueda en vivo; tres o más vistas que comparten estado complejo; dos o más integrantes que ya dominen React; necesidad de pruebas unitarias de componentes o de una aplicación móvil.

**Cómo migrar sin romper nada** (el patrón que ya usamos):

1. Mantener las **funciones de datos** separadas de la pantalla (ya lo están: `consultarAsistenciaDeUnaFecha`, `guardarRegistrosDeAsistencia`). Esa separación vale la pena con o sin React.
2. Elegir **una** vista por vez, la que tenga más estado (la siguiente sería Estudiantes).
3. Reescribirla como componentes, conectarla con el puente y **borrar** su código vainilla.
4. Correr las pruebas de regresión después de cada vista.
5. Cuando haya al menos dos vistas en React, evaluar pasar a Vite.

### 3.9 Veredicto

| Criterio | Ganador | Por qué |
|---|---|---|
| Velocidad con nuestro volumen | **Empate** | ≈ 14 ms en ambos con 100 filas |
| Velocidad con miles de filas y búsqueda en vivo | **React** (frente al vainilla ingenuo) | 164 → 13 ms por tecla con 1.000 filas |
| Velocidad con vainilla optimizado a mano | **Vainilla** | 12 ms frente a 116 ms al cambiar una fila |
| Peso de descarga | **Vainilla** | React casi duplica el JavaScript |
| Curva de aprendizaje | **Vainilla** | React se suma a lo anterior |
| Reutilización y estado complejo | **React** | Componentes y estado |
| Sencillez de despliegue | **Vainilla** | Sin npm ni compilación |
| Futuro (React 19, JSX, pruebas) | **React con Vite** | Hay que salir del CDN |

**Recomendación:** **mantener vainilla + la isla de React actual.** El proyecto es pequeño, la velocidad no lo exige y el equipo está en primer año. Migrar el resto «porque sí» añadiría peso y complejidad sin beneficio medible. React se justifica cuando aparezcan los disparadores de la sección 3.8.

**Frase para la exposición:** *«Usamos React en una sola vista para comparar. Medimos: con 100 estudiantes no hay diferencia; con miles, React evita redibujar lo que no cambió. Pero no es mágico: un vainilla bien optimizado le gana en cambios pequeños, y React casi duplica lo que se descarga. Por eso lo usamos donde hay estado y no en todo.»*

---

## 4. Parte 3 · SQL (PostgreSQL/Supabase) frente a NoSQL (MongoDB)

### 4.1 El problema es relacional

AcademiaHub tiene tres entidades que se relacionan entre sí:

```text
 disciplinas 1 ────< estudiantes 1 ────< asistencias
 ┌─────────────┐     ┌────────────────────┐     ┌──────────────────────────┐
 │ id        PK│     │ id               PK│     │ id                     PK│
 │ nombre UNIQ │     │ disciplina_id    FK│     │ estudiante_id    FK ✂    │  ✂ = ON DELETE CASCADE
 └─────────────┘     │ nombre_completo    │     │ fecha                    │
                     │ edad, categoria    │     │ asistio                  │
                     │ acudiente_*        │     │ UNIQUE (estudiante_id,   │
                     │ estado_pago, activo│     │         fecha)           │
                     └────────────────────┘     └──────────────────────────┘
```

- Una disciplina tiene **muchos** estudiantes (1:N). Un estudiante tiene **muchas** asistencias, **una por día** (1:N con regla de unicidad).
- Las preguntas que la app responde **cruzan** esas entidades: «¿cuántos presentes hay hoy?» (estudiantes × asistencias), «¿cuántos por disciplina?» (las tres), «¿cuántos pagos vencidos?» (una sola). Cuando casi todas las preguntas importantes atraviesan varias entidades, el modelo relacional encaja de forma natural.

### 4.2 Cómo se modelaría en MongoDB

MongoDB guarda **documentos** (JSON/BSON) dentro de **colecciones**. Hay tres diseños razonables:

**Diseño A · Referencias** (tres colecciones, como las tablas):

```js
// disciplinas
{ _id: 2, nombre: "Guitarra" }
// estudiantes
{ _id: 1, nombre_completo: "Isabella Rojas Peña", edad: 11, disciplina_id: 2,
  categoria: "Principiante", acudiente_nombre: "Julián Rojas", acudiente_telefono: "300 000 0005",
  estado_pago: "al_dia", activo: true }
// asistencias  (una por estudiante y día)
{ estudiante_id: 1, fecha: "2026-10-12", asistio: true }
// db.asistencias.createIndex({ estudiante_id: 1, fecha: 1 }, { unique: true })
```

**Diseño B · Subdocumentos** (la asistencia y la disciplina dentro del estudiante):

```js
{ _id: 1, nombre_completo: "Isabella Rojas Peña", edad: 11,
  disciplina: { id: 2, nombre: "Guitarra" },                 // copia (desnormalizada)
  asistencias: [ { fecha: "2026-10-12", asistio: true },     // crece cada día de clase
                 { fecha: "2026-10-14", asistio: false } ] }
```

**Diseño C · Por «cubetas»** (un documento por estudiante y mes; 📚 patrón *bucket*): equilibra A y B, pero añade lógica de mantenimiento.

| Necesidad | A · Referencias | B · Subdocumentos |
|---|---|---|
| Ver la ficha completa de un estudiante con su asistencia | Dos consultas o un `$lookup` | **Una lectura** (su punto fuerte) |
| Dashboard del día (todos los estudiantes) | `$lookup` + `$filter` (✅ Q1) | Recorrer (`$unwind`) el arreglo de **todos** los estudiantes (🔎) |
| Renombrar una disciplina | Se cambia en **un** documento | Se actualizan **todos** los estudiantes que la copian (🔎) |
| Impedir dos asistencias el mismo día | Índice único compuesto | **No se puede garantizar con un índice dentro del mismo documento** (📚); lo debe cuidar la aplicación |
| Que `disciplina_id` apunte a algo que existe | **Nadie lo comprueba** (no hay claves foráneas) | Nadie lo comprueba (es una copia) |
| Borrar un estudiante y su asistencia | Dos borrados a mano | Un solo documento |

**El gran cambio:** en SQL la base **garantiza** las relaciones; en MongoDB la **aplicación** (o los validadores que ella configure) tiene que garantizarlas. Un `disciplina_id: 9999` que no existe es un error en PostgreSQL (✅ M5) y un dato válido en MongoDB.

### 4.3 Las mismas consultas, en los dos mundos

Se tomaron las 3 disciplinas y los 10 estudiantes de `seed.sql` (uno de ellos inactivo) y se les añadieron **11 registros de asistencia de prueba** (de los días 2026-10-11 y 2026-10-12; «hoy» es el 2026-10-12 en las consultas). Con esos datos se ejecutaron las consultas en **PostgreSQL**, se exportaron a **MongoDB** (Diseño A) y se corrieron las mismas tres preguntas del Dashboard.

**Q1 · Métricas de asistencia de hoy**

```sql
-- Métricas de asistencia de HOY (una sola consulta; LEFT JOIN conserva a quien no tiene registro)
select
  count(*) filter (where a.asistio)          as presentes,
  count(*) filter (where a.asistio is false) as ausentes,
  count(a.id)                                as registrados,
  count(*) filter (where a.id is null)       as sin_registrar,
  round(100.0 * count(*) filter (where a.asistio) / nullif(count(a.id), 0), 1) as porcentaje
from estudiantes e
left join asistencias a on a.estudiante_id = e.id and a.fecha = '2026-10-12'
where e.activo;
```

```js
// ---------- Q1: métricas de asistencia de hoy ----------
const q1 = [
  { $match: { activo: true } },
  { $lookup: { from: 'asistencias', localField: '_id', foreignField: 'estudiante_id', as: 'registros' } },
  { $addFields: { hoy: { $filter: { input: '$registros', as: 'r', cond: { $eq: ['$$r.fecha', HOY] } } } } },
  { $group: {
      _id: null,
      activos: { $sum: 1 },
      registrados: { $sum: { $size: '$hoy' } },
      presentes: { $sum: { $size: { $filter: { input: '$hoy', as: 'r', cond: '$$r.asistio' } } } },
  } },
  { $project: {
      _id: 0,
      presentes: 1,
      ausentes: { $subtract: ['$registrados', '$presentes'] },
      registrados: 1,
      sin_registrar: { $subtract: ['$activos', '$registrados'] },
      // OJO: $divide por cero da ERROR en MongoDB, por eso el $cond
      porcentaje: { $cond: [{ $gt: ['$registrados', 0] }, { $round: [{ $multiply: [100, { $divide: ['$presentes', '$registrados'] }] }, 1] }, null] },
  } },
];
```

**Q2 · Asistencia de hoy por disciplina** (tres tablas / dos `$lookup`)

```sql
-- Asistencia de hoy por disciplina (JOIN de tres tablas)
select d.nombre as disciplina,
       count(e.id)                               as estudiantes,
       count(*) filter (where a.asistio)         as presentes,
       count(*) filter (where a.id is null)      as sin_registrar
from disciplinas d
join estudiantes e        on e.disciplina_id = d.id and e.activo
left join asistencias a   on a.estudiante_id = e.id and a.fecha = '2026-10-12'
group by d.nombre
order by d.nombre;
```

```js
// ---------- Q2: por disciplina (dos $lookup: la "unión" hay que armarla a mano) ----------
const q2 = [
  { $match: { activo: true } },
  { $lookup: { from: 'disciplinas', localField: 'disciplina_id', foreignField: '_id', as: 'disciplina' } },
  { $unwind: '$disciplina' },
  { $lookup: { from: 'asistencias', localField: '_id', foreignField: 'estudiante_id', as: 'registros' } },
  { $addFields: { hoy: { $filter: { input: '$registros', as: 'r', cond: { $eq: ['$$r.fecha', HOY] } } } } },
  { $group: {
      _id: '$disciplina.nombre',
      estudiantes: { $sum: 1 },
      presentes: { $sum: { $size: { $filter: { input: '$hoy', as: 'r', cond: '$$r.asistio' } } } },
      sin_registrar: { $sum: { $cond: [{ $eq: [{ $size: '$hoy' }, 0] }, 1, 0] } },
  } },
  { $project: { _id: 0, disciplina: '$_id', estudiantes: 1, presentes: 1, sin_registrar: 1 } },
  { $sort: { disciplina: 1 } },
];
```

**Q3 · Estudiantes activos por estado de pago**

```sql
-- Estudiantes activos por estado de pago
select estado_pago, count(*) as estudiantes
from estudiantes
where activo
group by estado_pago
order by estado_pago;
```

```js
// ---------- Q3: pagos ----------
const q3 = [
  { $match: { activo: true } },
  { $group: { _id: '$estado_pago', estudiantes: { $sum: 1 } } },
  { $project: { _id: 0, estado_pago: '$_id', estudiantes: 1 } },
  { $sort: { estado_pago: 1 } },
];
```

**Resultado (✅ idénticos):**

| Consulta | PostgreSQL | MongoDB (*mingo*) | ¿Igual? |
|---|---|---|---|
| Q1 | 7 presentes · 2 ausentes · 9 registrados · 0 sin registrar · 77,8 % | 7 · 2 · 9 · 0 · 77,8 % | ✅ |
| Q2 | Danza folclórica 2/1/0 · Fútbol 4/3/0 · Guitarra 3/3/0 *(estudiantes/presentes/sin registrar)* | igual | ✅ |
| Q3 | al_dia 5 · pendiente 2 · vencido 2 | igual | ✅ |
| Caso borde (nadie registrado) | porcentaje `NULL` | porcentaje `null` | ✅ |

**Qué enseña la comparación**

- **Mismo resultado, distinto esfuerzo.** Q1 ocupa ≈ 9 líneas de SQL y ≈ 20 de *pipeline*; Q2, ≈ 9 frente a ≈ 15; Q3, 4 frente a 6. (Contar líneas es una medida tosca; lo que importa es que en SQL el cruce entre tablas es **una palabra** —`JOIN`— y en MongoDB hay que armarlo con `$lookup`, `$unwind` y `$filter`.)
- **La división por cero** hay que cuidarla en ambos: `nullif(…, 0)` en SQL y un `$cond` en el *pipeline* (📚 `$divide` entre cero da error en MongoDB; en la prueba solo se verificó que con la protección sale `null`).
- **Q3** (una sola colección) es casi igual de simple en los dos: MongoDB no es «peor», es menos cómodo cuando hay que **cruzar**.
- `count(*) filter (where …)` es sintaxis de PostgreSQL (📚 no existe igual en todos los motores SQL).
- Para el 100 % de honestidad: un lenguaje de *pipelines* es muy potente y legible para quien lo domina; que a nosotros nos parezca más largo también es una cuestión de estudio.

<details>
<summary>Ver la salida completa (SQL y MongoDB) y los tamaños de documento</summary>

```text
--- q1_dashboard
 presentes | ausentes | registrados | sin_registrar | porcentaje 
-----------+----------+-------------+---------------+------------
         7 |        2 |           9 |             0 |       77.8
(1 row)

--- q2_por_disciplina
    disciplina    | estudiantes | presentes | sin_registrar 
------------------+-------------+-----------+---------------
 Danza folclórica |           2 |         1 |             0
 Fútbol           |           4 |         3 |             0
 Guitarra         |           3 |         3 |             0
(3 rows)

--- q3_pagos
 estado_pago | estudiantes 
-------------+-------------
 al_dia      |           5
 pendiente   |           2
 vencido     |           2
(3 rows)
```

```text
Q1 MongoDB: {"ausentes":2,"porcentaje":77.8,"presentes":7,"registrados":9,"sin_registrar":0}
Q2 MongoDB: [{"disciplina":"Danza folclórica","estudiantes":2,"presentes":1,"sin_registrar":0},{"disciplina":"Fútbol","estudiantes":4,"presentes":3,"sin_registrar":0},{"disciplina":"Guitarra","estudiantes":3,"presentes":3,"sin_registrar":0}]
Q3 MongoDB: [{"estado_pago":"al_dia","estudiantes":5},{"estado_pago":"pendiente","estudiantes":2},{"estado_pago":"vencido","estudiantes":2}]

IDÉNTICO a SQL → Q1: true | Q2: true | Q3: true
Q1 sin registros (fecha sin datos): {"ausentes":0,"porcentaje":null,"presentes":0,"registrados":0,"sin_registrar":9} ← porcentaje null: se evitó la división por cero

Tamaños BSON: {"una_asistencia_bytes":37,"estudiante_sin_asistencias_bytes":238,"un_anio_156_clases_kb":6.5,"cinco_anios_780_clases_kb":32.1,"limite_mongodb_mb":16,"anios_para_llegar_al_limite_a_156_clases_por_anio":2907}
```

</details>

### 4.4 Integridad referencial y reglas de negocio

| Regla de AcademiaHub | PostgreSQL / Supabase | MongoDB (📚 práctica habitual; confirmar en la documentación) |
|---|---|---|
| La disciplina de un estudiante debe existir | `FOREIGN KEY` ✅ M5 | No hay claves foráneas: validar en la aplicación o copiar la disciplina dentro del estudiante |
| Un registro por estudiante y día | `UNIQUE (estudiante_id, fecha)` ✅ M6 | Índice único compuesto (Diseño A); con arreglo embebido, no basta con un índice |
| Valores permitidos (`estado_pago`, edad 3 a 99) | `CHECK` ✅ M3, M4 | Validador `$jsonSchema` en la colección |
| «Si es menor de 18, el acudiente es obligatorio» | `CHECK` con expresión ✅ M1, M2 | Regla condicional entre campos: posible con un validador por expresiones (`$expr`), o en la aplicación |
| Si se borra el estudiante, se borra su asistencia | `ON DELETE CASCADE` ✅ M7 | Borrado manual en varios pasos, idealmente en una transacción |
| Guardar cuándo se modificó | *Trigger* `actualizado_en` | En la aplicación o con *triggers* del servicio en la nube |
| Qué filas ve cada usuario | **RLS** ✅ E1 | Permisos por colección; por documento hay que programarlo en un servidor |
| El navegador habla directo con la base | PostgREST + RLS (lo que usamos) | **No es seguro** exponer MongoDB al navegador: haría falta un servidor intermedio (Node/Express u otro) |

- **Transacciones.** PostgreSQL es transaccional (ACID) en todo; en MongoDB las transacciones entre varios documentos existen pero con requisitos de despliegue (📚).
- **Costo de cambiar de base.** Pasar a MongoDB **no es cambiar de base de datos**: desaparecen Auth, RLS y la API automática, y habría que escribir, alojar y proteger un servidor propio. Es justo lo que nuestro diseño («sin servidor propio») evita.

### 4.5 Tamaño de los documentos (el mito de los 16 MB)

Un documento de MongoDB no puede pasar de **16 MB** (📚). Se calculó el tamaño real de los documentos BSON del Diseño B (✅ medido con la librería `bson`):

| Concepto | Tamaño |
|---|---:|
| Una entrada de asistencia `{ fecha, asistio }` | 37 bytes |
| Un estudiante sin asistencias | 238 bytes |
| Con **un año** de clases (156 sesiones) | 6,5 KB |
| Con **cinco años** (780 sesiones) | 32,1 KB |
| Años para llegar a 16 MB (156 clases por año) | ≈ 2.907 |

**Conclusión:** el límite de 16 MB **no es un problema práctico** aquí. Los problemas reales del Diseño B son otros: un arreglo que **crece sin parar**, la dificultad de garantizar «una por día», y tener que **actualizar muchos documentos** cuando cambia una copia.

### 4.6 Cuándo sí elegiríamos MongoDB

Con honestidad, hay casos donde MongoDB es mejor candidato (📚):

- **Datos de forma variable:** si cada academia necesitara campos totalmente distintos. (Aun así, PostgreSQL puede guardar campos libres en una columna `jsonb`.)
- **Documentos que siempre se leen y escriben enteros** (un perfil, un carrito de compras).
- **Muchísimas escrituras de eventos o registros** repartidas entre varios servidores.
- **Prototipos** cuyo modelo cambia todos los días.

Ninguno describe a AcademiaHub hoy.

### 4.7 Veredicto técnico

| Criterio | PostgreSQL / Supabase | MongoDB |
|---|---|---|
| Relaciones entre entidades (1:N) | **Natural** (claves foráneas, `JOIN`) | Se simula con referencias o copias |
| Integridad garantizada por la base | **Sí** (`FK`, `UNIQUE`, `CHECK`, cascada) ✅ | Parcial; gran parte recae en la aplicación |
| Consultas que cruzan tablas (dashboard) | **Más corto y claro** ✅ | Posible, más largo (`$lookup`) ✅ |
| Seguridad por fila sin servidor propio | **RLS + Auth integrados** ✅ | Requiere servidor intermedio |
| Flexibilidad de esquema | Menor (`jsonb` ayuda) | **Mayor** |
| Escala horizontal masiva | Posible con más trabajo | **Más directa** |
| Encaje con lo que ya construimos | **Total** | Habría que rehacer la capa de datos y seguridad |

> **Veredicto: PostgreSQL (Supabase).** Nuestros datos son relacionales, las reglas de negocio son restricciones que conviene que la base garantice, las consultas del Dashboard cruzan entidades y el modelo de seguridad (RLS) está construido sobre PostgreSQL. MongoDB no es «peor»: resuelve otros problemas que AcademiaHub no tiene.

**Frase para la exposición:** *«Elegimos una base relacional porque nuestros datos están conectados: una disciplina tiene estudiantes y un estudiante tiene asistencias. Con claves foráneas y restricciones, la base misma impide los datos absurdos. Comprobamos las mismas consultas del dashboard en MongoDB y dan el mismo resultado, pero en MongoDB esas garantías las tendríamos que programar nosotros.»*

---

## 5. Plan de acción priorizado

*Esfuerzos aproximados (estimación mía, no medida).*

| Prioridad | Acción | Esfuerzo | Hallazgo |
|---|---|---|---|
| **P0 · antes de usar datos reales o publicar** | Comprobar en el panel que **«Allow new users to sign up» está desactivado** | 5 min | S-09, S-02 |
| P0 | Tras probar sin login, ejecutar `modo_con_login.sql` y volver a `REQUIERE_INICIO_DE_SESION = true` | 5 min | S-01 |
| P0 | Usar el modo sin login **solo en local, con datos de prueba y en un proyecto de pruebas** | — | S-01 |
| **P1** | Probar `endurecimiento.sql` en un proyecto de pruebas y, si todo va bien, aplicarlo | 15 min | S-03 |
| P1 | Añadir `integrity` (SRI) a los scripts de supabase-js, React, ReactDOM y htm | 30 min | S-04 |
| P1 | Probar la CSP propuesta **con el Tailwind real** y, si funciona, ponerla en el `<head>` | 30 min | S-05 |
| **P2** | Si habrá más de un tipo de usuario: aplicar `rls_por_rol.sql` y ocultar en la interfaz lo que el rol no puede hacer | 2–3 h | S-02 |
| P2 | Bitácora de cambios (tabla + *trigger* con el usuario que actúa) | ≈ 2 h | S-07 |
| P2 | Cerrar el hueco de `"constructor"` en el cliente (comprobar con `Object.hasOwn`) | 10 min | S-08 |
| **P3** | Compilar Tailwind (para producción y para quitar `'unsafe-inline'` de la CSP) | 1–2 h | S-04, S-05 |
| P3 | Aviso de privacidad y autorización para el tratamiento de datos de menores; minimizar los datos | — | S-10 |
| P3 | Activar MFA para el administrador si el plan lo permite; exportar copias de los datos con regularidad | 30 min | — |
| P3 | Evaluar pasar a Vite + React solo si se cumplen los disparadores de la sección 3.8 | días | — |

---

## 6. Anexos

### Anexo A · Índice de la evidencia ([`docs/evidencia/`](evidencia/))

| Archivo | Qué demuestra | Cómo se obtuvo |
|---|---|---|
| `seguridad/01_rls_y_permisos.txt` | E1-A a E1-F: RLS, `GRANT`, `service_role`, modo sin login | PostgreSQL 16 local con los roles de Supabase y el `schema.sql` del repositorio |
| `seguridad/02_huecos_y_endurecimiento.txt` | E1-G a E1-J: huecos de validación, endurecimiento, `unaccent`, bcrypt | Ídem |
| `seguridad/03_roles_e_inyeccion_sql.txt` | E1-K y E1-L: política por rol (versión inicial) e inyección SQL | Ídem |
| `seguridad/04_reglas_check_y_politicas_por_rol.txt` | E1-M (restricciones) y E1-N (`rls_por_rol.sql`) | Ídem, con `auth.jwt()` imitado |
| `seguridad/05_…antes.txt` y `06_…despues.txt` | AT-01 a AT-06 antes y después del arreglo | Chromium (Playwright) + Supabase simulado |
| `seguridad/endurecimiento.sql`, `rls_por_rol.sql` | Los dos scripts propuestos (probados, **no aplicados**) | — |
| `react/ejemplos_equivalencia.txt` + `.js` | 15 comprobaciones de equivalencia de los ejemplos | Chromium contra la app real |
| `react/benchmark_corrida_1.json`, `_2.json`, `carga_de_librerias.json` | Tiempos de la sección 3.4 y 3.5 | Chromium sin interfaz en un contenedor |
| `sql_vs_mongo/*` | Consultas, datos, *pipelines* y resultados de la Parte 3 | PostgreSQL local y *mingo* 7.2.7 / `bson` 7.3.3 |

### Anexo B · Cómo repetir lo básico

- **Comprobar que el rol anónimo está bloqueado** (en el *SQL Editor* de Supabase, de un proyecto de pruebas):

  ```sql
  set role anon;
  select * from estudiantes;   -- debe dar: permission denied for table estudiantes
  reset role;
  ```

- **Buscar patrones peligrosos en el código** (desde la carpeta del proyecto):

  ```bash
  grep -nE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function|dangerouslySetInnerHTML" app.js asistencia-react.js index.html
  # sin resultados = ninguno de esos patrones
  ```

- **Repetir la comparación con MongoDB:** las instrucciones están al principio de `docs/evidencia/sql_vs_mongo/mongo_pipelines.js`.
- Las pruebas de navegador y el *benchmark* **no están** en el repositorio (necesitan Node y Playwright).

### Anexo C · Glosario

| Término | Significado |
|---|---|
| **RLS** (*Row Level Security*) | Reglas dentro de la base que dicen qué filas puede ver o cambiar cada rol |
| **Rol** (`anon`, `authenticated`, `service_role`) | «Quién eres» para la base de datos; define qué te dejan hacer |
| **JWT** | Ficha firmada que prueba quién eres; su contenido se puede leer, lo que no se puede es falsificarlo |
| **`anon key`** | Clave pública que identifica el proyecto; no es una contraseña |
| **`service_role`** | Clave de superusuario que ignora RLS; **nunca** en el navegador |
| **XSS** | Inyectar código en una página para que lo ejecute el navegador de otra persona |
| **IDOR** | Acceder a un dato cambiando su número de identificación en la petición |
| **CSP** | Cabecera/etiqueta que le dice al navegador de dónde puede ejecutar scripts |
| **SRI** | Hash que el navegador comprueba antes de ejecutar un script de un CDN |
| **Hash / sal / bcrypt** | Huella irreversible / dato aleatorio que se añade antes de hacerla / algoritmo lento hecho para contraseñas |
| **STRIDE** | Lista de seis tipos de amenaza para ordenar un análisis de riesgos |
| **Escapar** | Convertir caracteres especiales para que el navegador los muestre como texto |
| **DOM / virtual DOM** | Árbol de la página / copia en memoria que React compara para saber qué cambiar |
| **Componente, *prop*, estado** | Función que dibuja una pieza / dato que recibe de fuera / dato propio que, al cambiar, vuelve a dibujarla |
| **`htm`** | Librería que permite escribir marcado tipo JSX dentro de plantillas de texto sin compilador |
| **FK, `JOIN`, ACID** | Clave foránea / cruce de tablas / garantías de una transacción (todo o nada) |
| **BSON, *pipeline*, `$lookup`** | Formato binario de MongoDB / serie de pasos de una consulta / equivalente aproximado de un `JOIN` |

### Anexo D · Referencias para ampliar

*Enlaces generales; no los consulté durante la auditoría, así que confirma lo que cites.*

- OWASP Top 10 — <https://owasp.org/Top10/> · OWASP Cheat Sheet Series (XSS, almacenamiento de contraseñas) — <https://cheatsheetseries.owasp.org/>
- Supabase: *Row Level Security* — <https://supabase.com/docs/guides/database/postgres/row-level-security>
- MDN: *Content Security Policy* — <https://developer.mozilla.org/docs/Web/HTTP/CSP> · *Subresource Integrity* — <https://developer.mozilla.org/docs/Web/Security/Subresource_Integrity>
- React — <https://react.dev/> · MongoDB: modelado de datos — <https://www.mongodb.com/docs/manual/data-modeling/> · PostgreSQL — <https://www.postgresql.org/docs/>
