// Límites de intentos de las rutas de acceso (SC-41; DAS, QS8 y D41). Responden 429 con la cabecera Retry-After
// y un mensaje que dice cuánto esperar; el frontend lo muestra como cualquier otro error de la API.
//
// - Inicio de sesión: espera progresiva por correo (5 fallos libres) y por dirección IP (20 fallos libres),
//   desde 1 minuto y hasta 15 minutos. Un ingreso correcto olvida los fallos del correo y descuenta el de la IP:
//   así una cuenta propia no sirve para borrar los fallos acumulados contra otras desde la misma red.
// - Confirmar la identidad al cambiar el correo (PUT /perfil/cuenta): espera progresiva por cuenta.
// - Recuperar contraseña: 3 solicitudes por correo y 10 por IP cada hora (nadie puede llenar de correos una casilla).
// - Restablecer contraseña: 10 por IP cada 15 minutos. Registro: 10 por IP cada hora. Google: 30 por IP cada 15 minutos.
const { esperaProgresiva, ventana } = require('../utils/limitador');
const ErrorHttp = require('../utils/ErrorHttp');

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;
const progresiva = (libres) => esperaProgresiva({ libres, esperaBaseMs: MINUTO, esperaMaxMs: 15 * MINUTO, olvidoMs: 15 * MINUTO });

const limites = {
  sesionCorreo: progresiva(5),
  sesionIp: progresiva(20),
  identidadCuenta: progresiva(5),
  recuperarCorreo: ventana({ max: 3, duracionMs: HORA }),
  recuperarIp: ventana({ max: 10, duracionMs: HORA }),
  restablecerIp: ventana({ max: 10, duracionMs: 15 * MINUTO }),
  registroIp: ventana({ max: 10, duracionMs: HORA }),
  googleIp: ventana({ max: 30, duracionMs: 15 * MINUTO }),
};

function textoEspera(ms) {
  const segundos = Math.max(Math.ceil(ms / 1000), 1);
  if (segundos < 60) return segundos === 1 ? '1 segundo' : `${segundos} segundos`;
  const minutos = Math.ceil(segundos / 60);
  return minutos === 1 ? '1 minuto' : `${minutos} minutos`;
}

function demasiados(res, ms, motivo) {
  res.set('Retry-After', String(Math.max(Math.ceil(ms / 1000), 1)));
  return new ErrorHttp(429, `${motivo} Espera ${textoEspera(ms)} antes de volver a intentarlo.`);
}

const claveIp = (req) => `ip:${req.ip}`;
// El correo ya llega recortado y en minúsculas: el limitador va después de los validadores.
const claveCorreo = (req) => `correo:${req.body.correo}`;

function limitarInicioSesion(req, res, next) {
  const correo = claveCorreo(req);
  const ip = claveIp(req);
  const espera = Math.max(limites.sesionCorreo.espera(correo), limites.sesionIp.espera(ip));
  if (espera > 0) return next(demasiados(res, espera, 'Hiciste demasiados intentos para iniciar sesión.'));
  limites.sesionCorreo.fallo(correo);
  limites.sesionIp.fallo(ip);
  // El controlador lo llama solo si el ingreso fue correcto.
  req.limite = { exito: () => { limites.sesionCorreo.olvidar(correo); limites.sesionIp.descontar(ip); } };
  return next();
}

// Solo cuenta cuando la petición trae una confirmación de identidad (contraseña o cuenta de Google).
function limitarConfirmacionIdentidad(req, res, next) {
  if (!req.body?.password && !req.body?.credencial) return next();
  const clave = `cuenta:${req.usuario.id}`;
  const espera = limites.identidadCuenta.espera(clave);
  if (espera > 0) return next(demasiados(res, espera, 'Hiciste demasiados intentos para confirmar tu identidad.'));
  limites.identidadCuenta.fallo(clave);
  req.limite = { exito: () => limites.identidadCuenta.olvidar(clave) };
  return next();
}

function porVentana(limite, clave, motivo) {
  return (req, res, next) => {
    const espera = limite.consumir(clave(req));
    return next(espera > 0 ? demasiados(res, espera, motivo) : undefined);
  };
}

const limitarRecuperacion = [
  porVentana(limites.recuperarIp, claveIp, 'Se pidieron demasiados enlaces de recuperación desde tu red.'),
  porVentana(limites.recuperarCorreo, claveCorreo, 'Ya pediste varios enlaces de recuperación para este correo.'),
];
const limitarRestablecer = porVentana(limites.restablecerIp, claveIp, 'Hiciste demasiados intentos para restablecer la contraseña.');
const limitarRegistro = porVentana(limites.registroIp, claveIp, 'Se crearon demasiadas cuentas desde tu red.');
const limitarGoogle = porVentana(limites.googleIp, claveIp, 'Hiciste demasiados intentos para entrar con Google.');

// Para las pruebas: cada prueba parte con los contadores vacíos.
function reiniciarLimites() {
  Object.values(limites).forEach((limite) => limite.reiniciar());
}

module.exports = {
  limitarInicioSesion,
  limitarConfirmacionIdentidad,
  limitarRecuperacion,
  limitarRestablecer,
  limitarRegistro,
  limitarGoogle,
  reiniciarLimites,
  textoEspera,
};
