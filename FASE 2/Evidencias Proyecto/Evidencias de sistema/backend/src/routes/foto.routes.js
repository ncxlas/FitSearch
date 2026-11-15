const { Router } = require('express');
const prisma = require('../models/prisma');
const { claveDe, LARGO_CLAVE } = require('../utils/fotos');

// Foto de perfil de una cuenta (15-11-2026): GET /api/fotos/:usuarioId/:clave. No pide sesión, porque la etiqueta
// <img> no envía el token; solo responde si la clave coincide con la foto vigente, y esa dirección solo la entregan
// las respuestas de la API a quien puede ver a esa persona (utils/fotos.js). Como la dirección cambia con la foto, el
// navegador la guarda en caché por un año.
const router = Router();
const CLAVE = new RegExp(`^[0-9a-f]{${LARGO_CLAVE}}$`);
const IMAGEN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

router.get('/:usuarioId/:clave', async (req, res) => {
  const usuarioId = Number(req.params.usuarioId);
  if (!Number.isInteger(usuarioId) || usuarioId < 1 || !CLAVE.test(req.params.clave)) return res.status(404).end();
  const foto = (await prisma.datosCuenta.findUnique({ where: { usuarioId }, select: { foto: true } }))?.foto;
  const partes = foto && claveDe(foto) === req.params.clave ? IMAGEN.exec(foto) : null;
  if (!partes) return res.status(404).end();
  res.set('Cache-Control', 'private, max-age=31536000, immutable');
  return res.type(partes[1]).send(Buffer.from(partes[2], 'base64'));
});

module.exports = router;
