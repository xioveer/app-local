// =====================================================================
// conexion.js  ·  Datos para conectarse a Supabase
// =====================================================================
// Estos dos datos son PÚBLICOS: viajan al navegador de cualquier persona
// que abra la página, por eso pueden estar en GitHub y en Vercel.
// Lo que protege la información NO es esconder esta clave, sino las reglas
// de la base de datos (RLS, en la carpeta supabase/).
//
// La clave que NUNCA se escribe aquí es la "service_role" (o "secret"):
// esa da acceso total a la base de datos y no debe salir de Supabase.
//
// Para usar otro proyecto de Supabase: Project Settings → API, y copia
// aquí su "Project URL" y su clave "anon" / "public".
// =====================================================================

// Dirección del proyecto en Supabase.
const SUPABASE_URL = "https://pjmuykxnliqdnyrfcfzd.supabase.co";

// Clave pública (anon).
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbXV5a3hubGlxZG55cmZjZnpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNDA3MjgsImV4cCI6MjEwMjkxNjcyOH0.RcWraEm-qrHppBJ76JhkSsgZpIdIu51ZDOUijh9OHE0";
