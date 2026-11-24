const { body } = require('express-validator');

function fotoValida(foto) {
  if (foto === null || foto === '') return true;
  if (typeof foto !== 'string' || foto.length > 66000) return false;
  const partes = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(foto);
  if (!partes) return false;
  const bytes = Buffer.from(partes[2], 'base64');
  if (!bytes.length || bytes.length > 48 * 1024 || bytes.toString('base64') !== partes[2]) return false;
  if (partes[1] === 'jpeg') return bytes.length > 4 && bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217;
  if (partes[1] === 'png') return bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    && bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(16) <= 1024 && bytes.readUInt32BE(20) > 0 && bytes.readUInt32BE(20) <= 1024;
  return bytes.length > 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
}
const texto = (campo, max) => body(campo).optional().isString().withMessage('Ingresa un texto válido').bail().trim()
  .isLength({ max }).withMessage(`Máximo ${max} caracteres`);
const enlace = (campo, max, dominio) => texto(campo, max).custom((v) => {
  if (!v) return true;
  try {
    const url = new URL(v);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      && (!dominio || url.hostname === dominio || url.hostname === `www.${dominio}`);
  } catch { return false; }
}).withMessage(dominio ? `Usa un enlace de https://${dominio}` : 'Ingresa un enlace completo que comience con https://');

module.exports = {
  fotoValida,
  guardar: [
    texto('nombre', 100).notEmpty().withMessage('Ingresa tu nombre completo'),
    texto('correo', 150).isEmail().withMessage('Ingresa un correo válido').bail().customSanitizer((v) => v.toLowerCase()),
    texto('telefono', 20).custom((v) => !v || /^\+?[\d\s()-]{8,20}$/.test(v)).withMessage('Ingresa un teléfono válido'),
    texto('biografia', 500), enlace('instagram', 200, 'instagram.com'), enlace('linkedin', 200, 'linkedin.com'), enlace('sitioWeb', 250),
    body('foto').optional().custom(fotoValida).withMessage('Usa una foto JPG, PNG o WebP de hasta 48 KB'),
    body('password').optional().isString().bail().isLength({ max: 200 }), texto('credencial', 12000),
    body().custom((v) => v && !Array.isArray(v) && typeof v === 'object'
      && Object.keys(v).length > 0 && Object.keys(v).every((k) => ['nombre', 'correo', 'telefono', 'biografia', 'instagram', 'linkedin', 'sitioWeb', 'foto', 'password', 'credencial'].includes(k)))
      .withMessage('Envía solo los datos de tu perfil'),
  ],
  // Eliminar la cuenta (SC-42): hay que escribir ELIMINAR y confirmar la identidad con la contraseña o con Google.
  eliminar: [
    body('confirmacion').isString().withMessage('Escribe ELIMINAR para confirmar').bail().trim()
      .custom((v) => v.toUpperCase() === 'ELIMINAR').withMessage('Escribe ELIMINAR para confirmar'),
    body('password').optional().isString().bail().isLength({ max: 200 }), texto('credencial', 12000),
    body().custom((v) => v && !Array.isArray(v) && typeof v === 'object'
      && Object.keys(v).every((k) => ['confirmacion', 'password', 'credencial'].includes(k)))
      .withMessage('Envía solo la confirmación'),
  ],
};
