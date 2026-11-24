// Rutas de «Mi cuenta» (SC-42): GET /api/perfil/mis-datos y DELETE /api/perfil/cuenta. El servicio se simula.
jest.mock('../../src/services/miCuenta.service');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const miCuenta = require('../../src/services/miCuenta.service');
const ErrorHttp = require('../../src/utils/ErrorHttp');

const token = jwt.sign({ rol: 'usuario', versionSesion: 0 }, process.env.JWT_SECRET, { subject: '7', expiresIn: '1h' });
const conSesion = (peticion) => peticion.set('Authorization', `Bearer ${token}`);

beforeEach(() => jest.resetAllMocks());

describe('GET /api/perfil/mis-datos', () => {
  test('CP-259: descarga un JSON con nombre de archivo, sin caché, solo con sesión', async () => {
    expect((await request(app).get('/api/perfil/mis-datos')).status).toBe(401);
    miCuenta.exportar.mockResolvedValue({ cuenta: { nombre: 'Ana Pérez' } });
    const r = await conSesion(request(app).get('/api/perfil/mis-datos'));
    expect(r.status).toBe(200);
    expect(r.headers['content-disposition']).toMatch(/^attachment; filename="fitsearch-mis-datos-\d{4}-\d{2}-\d{2}\.json"$/);
    expect(r.headers['cache-control']).toBe('no-store');
    expect(r.body).toEqual({ cuenta: { nombre: 'Ana Pérez' } });
    expect(miCuenta.exportar).toHaveBeenCalledWith(7);
  });
});

describe('DELETE /api/perfil/cuenta', () => {
  const eliminar = (cuerpo) => conSesion(request(app).delete('/api/perfil/cuenta')).send(cuerpo);

  test('CP-260: exige escribir ELIMINAR y no acepta otros campos', async () => {
    expect((await eliminar({ password: 'x' })).status).toBe(400);
    expect((await eliminar({ confirmacion: 'borrar', password: 'x' })).status).toBe(400);
    expect((await eliminar({ confirmacion: 'ELIMINAR', password: 'x', rol: 'administrador' })).status).toBe(400);
    expect(miCuenta.eliminar).not.toHaveBeenCalled();
  });

  test('CP-260: responde 204 y pasa al servicio solo la confirmación de identidad', async () => {
    miCuenta.eliminar.mockResolvedValue({ citasCanceladas: 1 });
    const r = await eliminar({ confirmacion: ' eliminar ', password: 'ClaveActual123' });
    expect(r.status).toBe(204);
    expect(miCuenta.eliminar).toHaveBeenCalledWith(7, { password: 'ClaveActual123' });
  });

  test('CP-261: las confirmaciones fallidas tienen el mismo límite de intentos que cambiar el correo', async () => {
    miCuenta.eliminar.mockRejectedValue(new ErrorHttp(400, 'Confirma tu identidad para eliminar la cuenta'));
    for (let i = 0; i < 5; i += 1) expect((await eliminar({ confirmacion: 'ELIMINAR', password: 'incorrecta' })).status).toBe(400);
    const r = await eliminar({ confirmacion: 'ELIMINAR', password: 'ClaveActual123' });
    expect(r.status).toBe(429);
    expect(miCuenta.eliminar).toHaveBeenCalledTimes(5);
  });
});
