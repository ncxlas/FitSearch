const { Router } = require('express');
const controlador = require('../controllers/perfil.controller');
const validadores = require('../validators/perfil.validators');
const validar = require('../middlewares/validar');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');

const router = Router();

router.use(autenticar);
// Contacto y presentación propios, compartidos por las cuentas de usuario y profesional.
const cuentaPerfil = require('../services/cuentaPerfil.service');
const cuentaValidadores = require('../validators/cuentaPerfil.validators');
const { matchedData } = require('express-validator');
router.get('/cuenta', async (req, res) => res.json(await cuentaPerfil.obtener(req.usuario.id)));
router.put('/cuenta', cuentaValidadores.guardar, validar,
  async (req, res) => res.json(await cuentaPerfil.guardar(req.usuario.id, matchedData(req), req.usuario.vencimiento)));
router.get('/', controlador.obtener);
router.put('/tipo-cuenta', validadores.tipoCuenta, validar, controlador.actualizarTipoCuenta);
// Datos personales, objetivos y salud son del asistente del usuario: una cuenta profesional no los completa (DAS, D25).
router.put('/', autorizarRoles('usuario'), validadores.actualizar, validar, controlador.actualizar);
router.put('/objetivos', autorizarRoles('usuario'), validadores.objetivos, validar, controlador.actualizarObjetivos);
router.put('/salud', autorizarRoles('usuario'), validadores.salud, validar, controlador.actualizarSalud);

module.exports = router;
