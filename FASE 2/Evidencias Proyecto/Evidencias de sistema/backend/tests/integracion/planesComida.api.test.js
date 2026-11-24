// Rutas de los planes de comidas (SC-44). El servicio se simula; su lógica está en planComida.service.test.js.
jest.mock('../../src/services/planComida.service');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const servicio = require('../../src/services/planComida.service');

const firmar = (rol) => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: '1', expiresIn: '1h' });
const api = (metodo, ruta, rol = 'usuario') => request(app)[metodo](`/api/comidas${ruta}`).set('Authorization', `Bearer ${firmar(rol)}`);
const LISTA = { planes: [], max: 10, hoy: '2026-11-24', diaDeHoy: 2 };
const PLAN = { nombre: 'Base', tipo: 'dia', items: [{ momento: 'almuerzo', alimentoId: 3, gramos: 150 }] };

beforeEach(() => {
  jest.resetAllMocks();
  for (const f of ['listar', 'crear', 'actualizar', 'eliminar', 'usar']) servicio[f].mockResolvedValue(LISTA);
  servicio.registrar.mockResolvedValue({ registrados: 1, fecha: '2026-11-24', momento: 'almuerzo' });
});

test('CP-268: listar, crear (con «usar»), editar, borrar y poner en uso; solo la cuenta de usuario', async () => {
  expect((await api('get', '/planes-comida')).body).toEqual(LISTA);
  expect((await api('post', '/planes-comida').send({ ...PLAN, usar: true, extra: 'x' })).status).toBe(201);
  expect(servicio.crear).toHaveBeenCalledWith(1, { ...PLAN, nota: undefined }, { usar: true });
  expect((await api('put', '/planes-comida/5').send(PLAN)).status).toBe(200);
  expect(servicio.actualizar).toHaveBeenCalledWith(1, 5, { ...PLAN, nota: undefined });
  expect((await api('put', '/planes-comida/5/uso').send({ enUso: false })).status).toBe(200);
  expect(servicio.usar).toHaveBeenCalledWith(1, 5, false);
  expect((await api('delete', '/planes-comida/5')).status).toBe(200);
  expect((await api('get', '/planes-comida', 'profesional')).status).toBe(403);
});

test('CP-268: valida la forma del plan antes de llegar al servicio', async () => {
  expect((await api('post', '/planes-comida').send({ ...PLAN, tipo: 'mes' })).status).toBe(400);
  expect((await api('post', '/planes-comida').send({ ...PLAN, items: [] })).status).toBe(400);
  expect((await api('put', '/planes-comida/abc').send(PLAN)).status).toBe(400);
  expect((await api('put', '/planes-comida/5/uso').send({ enUso: 'sí' })).status).toBe(400);
  expect(servicio.crear).not.toHaveBeenCalled();
});

test('CP-269: «Lo comí» responde 201 con lo registrado y valida el momento', async () => {
  const r = await api('post', '/planes-comida/5/registrar').send({ momento: 'almuerzo', items: [{ alimentoId: 3, gramos: 150 }] });
  expect(r.status).toBe(201);
  expect(r.body).toEqual({ registrados: 1, fecha: '2026-11-24', momento: 'almuerzo' });
  expect(servicio.registrar).toHaveBeenCalledWith(1, 5, { fecha: undefined, momento: 'almuerzo', items: [{ alimentoId: 3, gramos: 150 }] });
  expect((await api('post', '/planes-comida/5/registrar').send({ momento: 'once', items: [{ alimentoId: 3, gramos: 1 }] })).status).toBe(400);
});
