const crypto = require('crypto');
const { Prisma } = require('@prisma/client');
const { jwtSecreto } = require('../config/env');

// Fotos de perfil en todos los lugares donde aparece la persona (15-11-2026). La foto de cada cuenta
// (datos_cuenta.foto, una imagen en data URL de hasta 65 KB) no viaja dentro de las listas: estas entregan una dirección
// corta, /api/fotos/<cuenta>/<clave>, que el navegador guarda en caché. La clave son los primeros 16 caracteres del
// SHA-256 de la foto: no se puede adivinar sin haber recibido la dirección y cambia cuando cambia la foto.
const LARGO_CLAVE = 16;
const claveDe = (foto) => crypto.createHash('sha256').update(foto).digest('hex').slice(0, LARGO_CLAVE);

// Revisión del PR 62 (16-11-2026): la dirección ya no lleva el id interno de la cuenta. <cuenta> es un bloque de 16
// bytes (una marca y el id) cifrado con AES-256 y una clave derivada del secreto del servidor: siempre es el mismo para
// la misma cuenta (la caché del navegador sigue sirviendo), pero sin el secreto no se puede saber el id ni fabricar uno
// válido. Un solo bloque y sin vector de inicio es justamente lo que lo hace estable; no se cifra nada más con él.
const CLAVE_CIFRADO = crypto.createHash('sha256').update(`fitsearch:fotos:${jwtSecreto}`).digest();
const MARCA = Buffer.from('FSFT');
const LARGO_CUENTA = 32;

function cifrarCuenta(usuarioId) {
  const bloque = Buffer.alloc(16);
  MARCA.copy(bloque, 0);
  bloque.writeUInt32BE(Number(usuarioId), 4);
  const cifrador = crypto.createCipheriv('aes-256-ecb', CLAVE_CIFRADO, null).setAutoPadding(false);
  return Buffer.concat([cifrador.update(bloque), cifrador.final()]).toString('hex');
}

// El id de la cuenta de una dirección, o null si no la generó este servidor.
function descifrarCuenta(texto) {
  if (typeof texto !== 'string' || !new RegExp(`^[0-9a-f]{${LARGO_CUENTA}}$`).test(texto)) return null;
  const descifrador = crypto.createDecipheriv('aes-256-ecb', CLAVE_CIFRADO, null).setAutoPadding(false);
  const bloque = Buffer.concat([descifrador.update(Buffer.from(texto, 'hex')), descifrador.final()]);
  if (!bloque.subarray(0, 4).equals(MARCA) || !bloque.subarray(8).equals(Buffer.alloc(8))) return null;
  const usuarioId = bloque.readUInt32BE(4);
  return usuarioId > 0 ? usuarioId : null;
}

// Dirección de la foto, o null si la cuenta no tiene foto.
const fotoUrlConClave = (usuarioId, clave) => (usuarioId && clave ? `/api/fotos/${cifrarCuenta(usuarioId)}/${clave}` : null);
const fotoUrl = (usuarioId, foto) => (usuarioId && foto ? fotoUrlConClave(usuarioId, claveDe(foto)) : null);

// Subconsulta SQL con la clave de la foto de la cuenta de la columna indicada (p. ej. Prisma.raw('p.usuario_id')).
const claveFotoSql = (columnaUsuario) => Prisma.sql`(SELECT LEFT(SHA2(dc.foto, 256), ${LARGO_CLAVE}) FROM datos_cuenta dc
  WHERE dc.usuario_id = ${columnaUsuario} AND dc.foto IS NOT NULL)`;

// Para incluir en un select de Prisma la foto de una cuenta relacionada: usuario: { select: { ..., ...CON_FOTO } }.
// En listas largas conviene más pedir solo las claves (models/foto.model.js), sin traer las imágenes.
const CON_FOTO = { datosCuenta: { select: { foto: true } } };
const fotoUrlDe = (usuario) => fotoUrl(usuario?.id, usuario?.datosCuenta?.foto);

module.exports = { LARGO_CLAVE, LARGO_CUENTA, claveDe, cifrarCuenta, descifrarCuenta, fotoUrl, fotoUrlConClave, claveFotoSql, CON_FOTO, fotoUrlDe };
