// Clientes (FS-HU-27) y reportes (FS-HU-28) del profesional. Solo el propio profesional ve su actividad.
const { Router } = require('express');
const { param, query, matchedData } = require('express-validator');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');
const validar = require('../middlewares/validar');
const servicio = require('../services/actividadProfesional.service');

const router = Router();
router.use(autenticar, autorizarRoles('profesional'));

router.get('/clientes', async (req, res) => res.json(await servicio.listarClientes(req.usuario.id)));
// Catálogo de alimentos para armar un plan de comidas que se envía por el chat (SC-46).
const { busqueda } = require('../validators/comida.validators');
const comidas = require('../services/comida.service');
router.get('/alimentos', busqueda, validar, async (req, res) => res.json(await comidas.buscarAlimentos(req.query.q)));
// Progreso que cada cliente decidió compartir (SC-45): la lista y el detalle, solo con las categorías permitidas.
const compartir = require('../services/compartir.service');
router.get('/progreso', async (req, res) => res.json(await compartir.listarDelProfesional(req.usuario.id)));
router.get('/progreso/:usuarioId', param('usuarioId').isInt({ min: 1, max: 2147483647 }).withMessage('El cliente indicado no es válido').toInt(), validar,
  async (req, res) => res.json(await compartir.progreso(req.usuario.id, matchedData(req).usuarioId)));

router.get(
  '/clientes/:id',
  param('id').isInt({ min: 1, max: 2147483647 }).withMessage('El cliente no es válido').toInt(),
  validar,
  async (req, res) => res.json(await servicio.historialCliente(req.usuario.id, matchedData(req).id)),
);

router.get(
  '/reportes',
  query('semanas').optional().isInt({ min: 4, max: 26 }).withMessage('Elige entre 4 y 26 semanas').toInt(),
  validar,
  async (req, res) => res.json(await servicio.reportes(req.usuario.id, matchedData(req))),
);

module.exports = router;
