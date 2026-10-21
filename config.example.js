// =====================================================================
// config.example.js  ·  Plantilla de configuración
// =====================================================================
// PASOS:
//   1. Copia este archivo y llama a la copia  config.js
//      (en la misma carpeta que index.html).
//   2. Abre tu proyecto en Supabase → Project Settings → API
//      y copia estos dos valores en config.js:
//        - Project URL
//        - La clave "anon" / "public" (o "publishable" si tu panel solo
//          muestra ese nombre).
//   3. NUNCA uses la clave "service_role" ni la "secret": esas dan acceso
//      total a la base de datos y jamás deben ir en el navegador.
//
// config.js está en .gitignore, así que no se sube a GitHub.
// =====================================================================

// Dirección de tu proyecto. Ejemplo: "https://abcdefghijklmnop.supabase.co"
const SUPABASE_URL = "";

// Clave pública (anon). Es segura en el frontend SOLO si RLS está activado.
const SUPABASE_ANON_KEY = "";

// ¿La aplicación pide iniciar sesión?   true = sí (lo normal y lo seguro)
//
// MODO SIN INICIO DE SESIÓN (temporal): pon  false  para entrar directo, sin login.
// OJO: sin login la base de datos tiene que estar ABIERTA para el rol anónimo, y la
// anon key es pública. Eso significa que CUALQUIER persona con la dirección de la
// página puede ver, cambiar y borrar los datos (incluidos teléfonos de acudientes).
// Úsalo solo en tu computador y con datos de prueba, y NO publiques la página así.
//   Para activarlo:    pon false aquí + ejecuta supabase/modo_sin_login.sql
//   Para desactivarlo: pon true aquí  + ejecuta supabase/modo_con_login.sql
// Si esta línea no existe, la aplicación pide iniciar sesión (lo seguro).
const REQUIERE_INICIO_DE_SESION = true;
