// =====================================================================
// conexion.js · Datos para conectarse a Supabase
// =====================================================================
// Estos dos datos son PÚBLICOS: viajan al navegador de cualquiera que
// abra la página, por eso pueden estar en GitHub y en Vercel.
// Lo que protege la información NO es esconder esta clave, sino las
// reglas de la base de datos (RLS, en la carpeta supabase/): sin iniciar
// sesión y sin estar en la tabla administradores, esta clave no sirve
// para leer ni escribir nada.
//
// La clave que NUNCA se escribe aquí es la "service_role" (o "secret"):
// esa se salta las reglas y no debe salir de Supabase.
//
// Proyecto: GESTOR-ACADEMIA (solo esta aplicación).
// Para usar otro: Project Settings → API, y copia aquí su "Project URL"
// y su clave "anon" / "public".
// =====================================================================

const SUPABASE_URL = "https://vvnvljhldxrcwaoadenm.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2bnZsamhsZHhyY3dhb2FkZW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2MTIwMzksImV4cCI6MjExMDE4ODAzOX0._d4jFykPEg1F6_Irxa8QSrIVTklTqrNbItDaP7QsmtM";
