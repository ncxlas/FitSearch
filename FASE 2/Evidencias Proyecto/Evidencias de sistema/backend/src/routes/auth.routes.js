const { Router } = require('express');
const controlador = require('../controllers/auth.controller');
const validadores = require('../validators/auth.validators');
const validar = require('../middlewares/validar');
const { autenticar } = require('../middlewares/autenticar');
const limite = require('../middlewares/limiteIntentos');

const router = Router();

// Los límites de intentos (SC-41) van después de validar: cuentan solo peticiones bien formadas y con el correo ya normalizado.
router.post('/registro', validadores.registro, validar, limite.limitarRegistro, controlador.registrar);
router.post('/login', validadores.inicioSesion, validar, limite.limitarInicioSesion, controlador.iniciarSesion);
router.post('/google', validadores.inicioSesionGoogle, validar, limite.limitarGoogle, controlador.iniciarSesionConGoogle);
router.post('/logout', autenticar, controlador.cerrarSesion);
router.post('/recuperar', validadores.solicitarRecuperacion, validar, limite.limitarRecuperacion, controlador.solicitarRecuperacion);
router.post('/restablecer', validadores.restablecer, validar, limite.limitarRestablecer, controlador.restablecerPassword);

module.exports = router;
