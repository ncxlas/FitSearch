const crypto = require('crypto');
const { Prisma } = require('@prisma/client');

// Fotos de perfil en todos los lugares donde aparece la persona (15-11-2026). La foto de cada cuenta
// (datos_cuenta.foto, una imagen en data URL de hasta 65 KB) no viaja dentro de las listas: estas entregan una dirección
// corta, /api/fotos/<usuario>/<clave>, que el navegador guarda en caché. La clave son los primeros 16 caracteres del
// SHA-256 de la foto: no se puede adivinar sin haber recibido la dirección y cambia cuando cambia la foto.
const LARGO_CLAVE = 16;
const claveDe = (foto) => crypto.createHash('sha256').update(foto).digest('hex').slice(0, LARGO_CLAVE);

// Dirección de la foto, o null si la cuenta no tiene foto.
const fotoUrl = (usuarioId, foto) => (usuarioId && foto ? `/api/fotos/${Number(usuarioId)}/${claveDe(foto)}` : null);

// Lo mismo cuando MySQL ya calculó la clave en la consulta (CLAVE_FOTO), sin traer la foto completa.
const fotoUrlConClave = (usuarioId, clave) => (usuarioId && clave ? `/api/fotos/${Number(usuarioId)}/${clave}` : null);

// Subconsulta SQL con la clave de la foto de la cuenta de la columna indicada (p. ej. Prisma.raw('p.usuario_id')).
const claveFotoSql = (columnaUsuario) => Prisma.sql`(SELECT LEFT(SHA2(dc.foto, 256), ${LARGO_CLAVE}) FROM datos_cuenta dc
  WHERE dc.usuario_id = ${columnaUsuario} AND dc.foto IS NOT NULL)`;

// Para incluir en un select de Prisma la foto de una cuenta relacionada: usuario: { select: { ..., ...CON_FOTO } }.
const CON_FOTO = { datosCuenta: { select: { foto: true } } };
const fotoUrlDe = (usuario) => fotoUrl(usuario?.id, usuario?.datosCuenta?.foto);

module.exports = { LARGO_CLAVE, claveDe, fotoUrl, fotoUrlConClave, claveFotoSql, CON_FOTO, fotoUrlDe };
