// Progreso compartido (SC-45): la persona decide qué ve cada profesional con el que tiene un chat. Solo cuentas de usuario.
const { Router } = require('express');
const { body, param, matchedData } = require('express-validator');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');
const validar = require('../middlewares/validar');
const servicio = require('../services/compartir.service');

const router = Router();
router.use(autenticar, autorizarRoles('usuario'));

const profesionalId = param('profesionalId').isInt({ min: 1, max: 2147483647 }).withMessage('El profesional indicado no es válido').toInt();
const categorias = body(['perfil', 'salud', 'comidas', 'peso', 'planes']).optional().isBoolean({ strict: true }).withMessage('Indica sí o no para cada categoría');

router.get('/', async (req, res) => res.json(await servicio.listarDelUsuario(req.usuario.id)));
router.put('/:profesionalId', profesionalId, categorias, validar, async (req, res) => {
  const { profesionalId: id, ...permisos } = matchedData(req);
  res.json(await servicio.guardar(req.usuario.id, id, permisos));
});
router.delete('/:profesionalId', profesionalId, validar, async (req, res) => res.json(await servicio.quitar(req.usuario.id, matchedData(req).profesionalId)));

module.exports = router;
