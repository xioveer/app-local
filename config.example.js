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
