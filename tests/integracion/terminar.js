// Después de las pruebas de integración: detiene los procesos que levantó preparar.js (si levantó alguno).
module.exports = async function terminar() {
  for (const p of globalThis.__procesosCaseta || []) p.kill();
};
