// Fotos de perfil (revisión del PR 62, 16-11-2026): las claves de las fotos de varias cuentas se calculan en MySQL, así
// las listas (clientes del profesional, panel del administrador) no traen las imágenes, que pesan hasta 65 KB cada una.
const { Prisma } = require('@prisma/client');
const prisma = require('./prisma');
const { LARGO_CLAVE } = require('../utils/fotos');

// Map de id de cuenta → clave de su foto (solo las cuentas que tienen foto).
async function clavesDe(usuarioIds) {
  const ids = [...new Set(usuarioIds.filter((id) => Number.isInteger(id) && id > 0))];
  if (!ids.length) return new Map();
  const filas = await prisma.$queryRaw`
    SELECT usuario_id AS usuarioId, LEFT(SHA2(foto, 256), ${LARGO_CLAVE}) AS clave
    FROM datos_cuenta WHERE foto IS NOT NULL AND usuario_id IN (${Prisma.join(ids)})`;
  return new Map(filas.map((fila) => [Number(fila.usuarioId), fila.clave]));
}

// La foto de una cuenta y si la cuenta sigue activa (la ruta de fotos no muestra la de una cuenta desactivada).
const fotoDeCuenta = (usuarioId) => prisma.datosCuenta.findUnique({
  where: { usuarioId }, select: { foto: true, usuario: { select: { activo: true } } },
});

module.exports = { clavesDe, fotoDeCuenta };
