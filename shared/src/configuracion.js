// Revisión de la configuración al arrancar (Entrega 7, checklist de seguridad).
// - Si falta una variable obligatoria, el proceso no arranca y dice cuál falta.
// - En producción (NODE_ENV=production) no se aceptan los valores de ejemplo de .env.example.
const VALORES_DE_EJEMPLO = ["cambiar_este_secreto", "cambiar_esta_clave", "cambiar_esta_contrasena"];

function verificarConfiguracion(nombreServicio, obligatorias) {
  const faltan = obligatorias.filter((v) => !process.env[v]);
  if (faltan.length) {
    console.error(`[${nombreServicio}] Faltan variables de entorno: ${faltan.join(", ")}. Ejecuta npm run setup:env y revisa el archivo .env.`);
    process.exit(1);
  }
  const deEjemplo = obligatorias.filter((v) => VALORES_DE_EJEMPLO.includes(process.env[v]));
  if (deEjemplo.length && process.env.NODE_ENV === "production") {
    console.error(`[${nombreServicio}] En producción no se permiten los valores de ejemplo en: ${deEjemplo.join(", ")}.`);
    process.exit(1);
  }
  if (deEjemplo.length) {
    console.warn(`[${nombreServicio}] Aviso: ${deEjemplo.join(", ")} tienen el valor de ejemplo; cámbialos antes de desplegar.`);
  }
  if (process.env.JWT_SECRET && process.env.NODE_ENV === "production" && process.env.JWT_SECRET.length < 32) {
    console.error(`[${nombreServicio}] JWT_SECRET debe tener al menos 32 caracteres en producción.`);
    process.exit(1);
  }
}

module.exports = { verificarConfiguracion };
