// Rutas del historial de peso (SC-43): POST /api/comidas/plan/pesos y DELETE /api/comidas/plan/pesos/:id. Datos simulados.
jest.mock('../../src/models/usuario.model');
jest.mock('../../src/models/planAlimentacion.model');
jest.mock('../../src/models/registroPeso.model');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const usuarioModel = require('../../src/models/usuario.model');
const planModelo = require('../../src/models/planAlimentacion.model');
const pesos = require('../../src/models/registroPeso.model');
const { fechaEnChile, sumarDias } = require('../../src/utils/fechaChile');

const firmar = (rol) => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: '1', expiresIn: '1h' });
const conSesion = (peticion, rol = 'usuario') => peticion.set('Authorization', `Bearer ${firmar(rol)}`);
const HOY = fechaEnChile();
const anotar = (cuerpo, rol) => conSesion(request(app).post('/api/comidas/plan/pesos'), rol).send(cuerpo);

beforeEach(() => {
  jest.resetAllMocks();
  usuarioModel.buscarPorIdConPerfil.mockResolvedValue({ id: 1, perfil: { pesoKg: '80', alturaCm: '175', edad: 30, sexo: 'masculino', actividadFisica: 'moderada', objetivoPrincipal: 'bajar_peso' } });
  planModelo.personalizados.mockResolvedValue([]);
  pesos.listar.mockResolvedValue([]);
  pesos.registrar.mockResolvedValue(79.5);
});

describe('POST /api/comidas/plan/pesos', () => {
  test('CP-264: anota el peso de hoy y responde 201 con el plan completo y su historial', async () => {
    pesos.listar.mockResolvedValue([{ id: 3, fecha: new Date(`${HOY}T00:00:00Z`), pesoKg: '79.50' }]);
    const r = await anotar({ pesoKg: '79.5' });
    expect(r.status).toBe(201);
    expect(pesos.registrar).toHaveBeenCalledWith(1, HOY, 79.5);
    expect(r.body.historialPeso.pesos).toEqual([{ id: 3, fecha: HOY, pesoKg: 79.5 }]);
    expect(r.body).toHaveProperty('plan.kcal');
  });

  test('CP-264: valida el peso, el formato de la fecha y que el día no sea futuro', async () => {
    expect((await anotar({ pesoKg: 10 })).body.detalles).toEqual({ pesoKg: 'Escribe un peso entre 20 y 350 kg' });
    expect((await anotar({ pesoKg: 'ochenta' })).status).toBe(400);
    expect((await anotar({ pesoKg: 80, fecha: '24-11-2026' })).body.detalles).toEqual({ fecha: 'La fecha debe tener el formato AAAA-MM-DD' });
    const futuro = await anotar({ pesoKg: 80, fecha: sumarDias(HOY, 1) });
    expect(futuro.status).toBe(400);
    expect(futuro.body.detalles).toEqual({ fecha: 'Elige hoy o un día anterior' });
    expect(pesos.registrar).not.toHaveBeenCalled();
  });

  test('solo la cuenta de usuario anota pesos', async () => {
    expect((await anotar({ pesoKg: 80 }, 'profesional')).status).toBe(403);
    expect((await request(app).post('/api/comidas/plan/pesos').send({ pesoKg: 80 })).status).toBe(401);
  });
});

describe('DELETE /api/comidas/plan/pesos/:id', () => {
  test('CP-265: borra un pesaje propio; uno ajeno o inexistente responde 404', async () => {
    pesos.eliminar.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await conSesion(request(app).delete('/api/comidas/plan/pesos/3'))).status).toBe(200);
    expect(pesos.eliminar).toHaveBeenCalledWith(1, 3);
    const ajeno = await conSesion(request(app).delete('/api/comidas/plan/pesos/99'));
    expect(ajeno.status).toBe(404);
    expect(ajeno.body.error).toBe('No encontramos ese pesaje');
    expect((await conSesion(request(app).delete('/api/comidas/plan/pesos/abc'))).status).toBe(400);
  });
});
