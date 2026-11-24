// Pruebas de integración del límite de intentos (SC-41; DAS, QS8 y D41): inicio de sesión, recuperar y restablecer
// contraseña, registro, Google y la confirmación de identidad al cambiar el correo. El acceso a datos se simula.
jest.mock('../../src/models/usuario.model');
jest.mock('../../src/models/tokenRecuperacion.model');
jest.mock('../../src/services/correo.service');
jest.mock('../../src/services/google.service');
jest.mock('../../src/models/prisma', () => ({ usuario: { findUnique: jest.fn(), update: jest.fn() }, tokenRecuperacion: { deleteMany: jest.fn() }, $queryRaw: jest.fn(), $transaction: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const usuarioModel = require('../../src/models/usuario.model');
const correoService = require('../../src/services/correo.service');
const google = require('../../src/services/google.service');
const prisma = require('../../src/models/prisma');
const { textoEspera } = require('../../src/middlewares/limiteIntentos');
const ErrorHttp = require('../../src/utils/ErrorHttp');
const { PASSWORD, usuarioDePrueba } = require('../ayudantes');

const MINUTO = 60 * 1000;
const usuario = usuarioDePrueba();
const login = (correo, password) => request(app).post('/api/auth/login').send({ correo, password });

beforeEach(() => {
  jest.resetAllMocks();
  usuarioModel.buscarPorCorreo.mockImplementation(async (correo) => (correo === 'ana@correo.cl' ? usuario : null));
  correoService.enviarRecuperacion.mockResolvedValue();
});
afterEach(() => jest.restoreAllMocks());

describe('POST /api/auth/login', () => {
  test('CP-251: tras 5 fallos el correo queda bloqueado; responde 429 con Retry-After aunque la contraseña sea correcta', async () => {
    for (let i = 0; i < 5; i += 1) expect((await login('ana@correo.cl', 'incorrecta')).status).toBe(401);
    const bloqueado = await login('ana@correo.cl', PASSWORD);
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.headers['retry-after']).toBe('60');
    expect(bloqueado.body.error).toBe('Hiciste demasiados intentos para iniciar sesión. Espera 1 minuto antes de volver a intentarlo.');
    expect(bloqueado.body.token).toBeUndefined();
  });

  test('CP-251: el mismo correo escrito con mayúsculas y espacios cuenta como el mismo', async () => {
    for (let i = 0; i < 5; i += 1) await login(i % 2 ? '  ANA@Correo.cl ' : 'ana@correo.cl', 'incorrecta');
    expect((await login('Ana@Correo.CL', 'incorrecta')).status).toBe(429);
  });

  test('CP-252: pasado el bloqueo se puede entrar, y cada fallo nuevo duplica la espera', async () => {
    let t = Date.UTC(2026, 10, 24, 12);
    jest.spyOn(Date, 'now').mockImplementation(() => t);
    for (let i = 0; i < 5; i += 1) await login('ana@correo.cl', 'incorrecta');
    t += MINUTO;
    expect((await login('ana@correo.cl', 'incorrecta')).status).toBe(401);
    const segundo = await login('ana@correo.cl', PASSWORD);
    expect(segundo.status).toBe(429);
    expect(segundo.headers['retry-after']).toBe('120');
    t += 2 * MINUTO;
    expect((await login('ana@correo.cl', PASSWORD)).status).toBe(200);
  });

  test('CP-252: un ingreso correcto olvida los fallos anteriores del correo', async () => {
    for (let i = 0; i < 4; i += 1) await login('ana@correo.cl', 'incorrecta');
    expect((await login('ana@correo.cl', PASSWORD)).status).toBe(200);
    for (let i = 0; i < 4; i += 1) expect((await login('ana@correo.cl', 'incorrecta')).status).toBe(401);
  });

  test('CP-253: 20 fallos desde una misma IP la bloquean aunque cada intento use otro correo', async () => {
    for (let i = 0; i < 20; i += 1) expect((await login(`persona${i}@correo.cl`, 'incorrecta')).status).toBe(401);
    expect((await login('ana@correo.cl', PASSWORD)).status).toBe(429);
  });

  test('CP-253: entrar a la cuenta propia no borra los fallos de la red contra otras cuentas', async () => {
    for (let i = 0; i < 19; i += 1) await login(`persona${i}@correo.cl`, 'incorrecta');
    expect((await login('ana@correo.cl', PASSWORD)).status).toBe(200);
    expect((await login('otra@correo.cl', 'incorrecta')).status).toBe(401);
    expect((await login('ana@correo.cl', PASSWORD)).status).toBe(429);
  });

  test('una petición mal formada no consume intentos', async () => {
    for (let i = 0; i < 10; i += 1) expect((await login('no-es-correo', 'x')).status).toBe(400);
    expect((await login('ana@correo.cl', PASSWORD)).status).toBe(200);
  });
});

describe('POST /api/auth/recuperar, /restablecer, /registro y /google', () => {
  test('CP-254: 3 enlaces por correo cada hora; el cuarto responde 429 sin revelar si la cuenta existe', async () => {
    for (const correo of ['ana@correo.cl', 'nadie@correo.cl']) {
      for (let i = 0; i < 3; i += 1) expect((await request(app).post('/api/auth/recuperar').send({ correo })).status).toBe(200);
      const r = await request(app).post('/api/auth/recuperar').send({ correo });
      expect(r.status).toBe(429);
      expect(r.body.error).toBe('Ya pediste varios enlaces de recuperación para este correo. Espera 60 minutos antes de volver a intentarlo.');
    }
    expect(correoService.enviarRecuperacion).toHaveBeenCalledTimes(3);
  });

  test('CP-254: 10 solicitudes de recuperación por IP cada hora', async () => {
    for (let i = 0; i < 10; i += 1) await request(app).post('/api/auth/recuperar').send({ correo: `p${i}@correo.cl` });
    expect((await request(app).post('/api/auth/recuperar').send({ correo: 'ana@correo.cl' })).status).toBe(429);
  });

  test('CP-255: restablecer, registro y Google tienen su presupuesto por IP', async () => {
    const tokenFalso = 'b'.repeat(64);
    for (let i = 0; i < 10; i += 1) {
      expect((await request(app).post('/api/auth/restablecer').send({ token: tokenFalso, password: 'NuevaClave123' })).status).not.toBe(429);
    }
    expect((await request(app).post('/api/auth/restablecer').send({ token: tokenFalso, password: 'NuevaClave123' })).status).toBe(429);

    usuarioModel.crearConPerfil.mockImplementation(async (datos) => usuarioDePrueba({ correo: datos.correo }));
    for (let i = 0; i < 10; i += 1) {
      expect((await request(app).post('/api/auth/registro').send({ nombre: 'Ana Pérez', correo: `n${i}@correo.cl`, password: PASSWORD })).status).toBe(201);
    }
    expect((await request(app).post('/api/auth/registro').send({ nombre: 'Ana Pérez', correo: 'n10@correo.cl', password: PASSWORD })).status).toBe(429);

    google.verificarCredencial.mockRejectedValue(new ErrorHttp(401, 'No fue posible validar tu cuenta de Google'));
    for (let i = 0; i < 30; i += 1) await request(app).post('/api/auth/google').send({ credencial: 'x'.repeat(30) });
    expect((await request(app).post('/api/auth/google').send({ credencial: 'x'.repeat(30) })).status).toBe(429);
  });
});

describe('PUT /api/perfil/cuenta: confirmar la identidad para cambiar el correo', () => {
  const token = jwt.sign({ rol: 'usuario', versionSesion: 0 }, process.env.JWT_SECRET, { subject: '7', expiresIn: '1h' });
  const cuenta = () => request(app).put('/api/perfil/cuenta').set('Authorization', `Bearer ${token}`);

  beforeEach(() => {
    const bcrypt = require('bcryptjs');
    const datos = { id: 7, nombre: 'Ana Pérez', correo: 'ana@example.test', rol: { nombre: 'usuario' }, rolConfirmado: true,
      fechaRegistro: new Date('2026-09-01'), versionSesion: 0, passwordHash: bcrypt.hashSync('ClaveActual123', 4), googleId: null, datosCuenta: null };
    prisma.usuario.findUnique.mockResolvedValue(datos);
    prisma.$queryRaw.mockResolvedValue([{ versionSesion: 0 }]);
    prisma.$transaction.mockImplementation(async (f) => f(prisma));
    prisma.usuario.update.mockImplementation(async ({ data }) => ({ ...datos, ...data, versionSesion: data.versionSesion ? 1 : 0 }));
  });

  test('CP-256: 5 contraseñas incorrectas bloquean la cuenta; los cambios sin confirmación siguen permitidos', async () => {
    for (let i = 0; i < 5; i += 1) expect((await cuenta().send({ correo: 'nuevo@example.test', password: 'incorrecta' })).status).toBe(400);
    const r = await cuenta().send({ correo: 'nuevo@example.test', password: 'ClaveActual123' });
    expect(r.status).toBe(429);
    expect(r.body.error).toMatch(/^Hiciste demasiados intentos para confirmar tu identidad\./);
    expect((await cuenta().send({ nombre: 'Ana Actualizada' })).status).toBe(200);
  });

  test('CP-256: una confirmación correcta olvida los fallos anteriores', async () => {
    for (let i = 0; i < 4; i += 1) await cuenta().send({ correo: 'nuevo@example.test', password: 'incorrecta' });
    expect((await cuenta().send({ correo: 'nuevo@example.test', password: 'ClaveActual123' })).status).toBe(200);
    for (let i = 0; i < 4; i += 1) expect((await cuenta().send({ correo: 'otro@example.test', password: 'incorrecta' })).status).toBe(400);
  });
});

describe('IP real detrás de nginx (TRUST_PROXY)', () => {
  function appCon(valor) {
    let instancia;
    jest.isolateModules(() => {
      const anterior = process.env.TRUST_PROXY;
      process.env.TRUST_PROXY = valor;
      instancia = require('../../src/app');
      require('../../src/models/usuario.model').buscarPorCorreo.mockResolvedValue(null);
      if (anterior === undefined) delete process.env.TRUST_PROXY; else process.env.TRUST_PROXY = anterior;
    });
    return instancia;
  }
  const fallar = (instancia, ip, i) => request(instancia).post('/api/auth/login').set('X-Forwarded-For', ip).send({ correo: `p${i}@correo.cl`, password: 'x' });

  test('CP-257: con TRUST_PROXY=1 cada cliente cuenta por separado', async () => {
    const instancia = appCon('1');
    for (let i = 0; i < 20; i += 1) await fallar(instancia, '200.1.1.1', i);
    expect((await fallar(instancia, '200.1.1.1', 99)).status).toBe(429);
    expect((await fallar(instancia, '200.2.2.2', 98)).status).toBe(401);
  });

  test('CP-257: sin proxy configurado, X-Forwarded-For se ignora y no sirve para cambiar de IP', async () => {
    const instancia = appCon('');
    for (let i = 0; i < 20; i += 1) await fallar(instancia, `200.1.1.${i}`, i);
    expect((await fallar(instancia, '200.9.9.9', 99)).status).toBe(429);
  });
});

test('el mensaje dice la espera en segundos o minutos', () => {
  expect([500, 1000, 45000, 60000, 61000, 15 * MINUTO].map(textoEspera))
    .toEqual(['1 segundo', '1 segundo', '45 segundos', '1 minuto', '2 minutos', '15 minutos']);
});
