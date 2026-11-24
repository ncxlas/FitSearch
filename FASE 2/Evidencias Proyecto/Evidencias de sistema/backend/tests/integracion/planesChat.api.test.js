// Rutas de los planes enviados por el chat (SC-46). Los servicios se simulan; su lógica se prueba con MySQL real
// (scripts/probar-planes-chat-mysql.js, 17 comprobaciones).
jest.mock('../../src/services/planesPorChat.service');
jest.mock('../../src/services/comida.service');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const servicio = require('../../src/services/planesPorChat.service');
const comidas = require('../../src/services/comida.service');
const ErrorHttp = require('../../src/utils/ErrorHttp');

const firmar = (rol) => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: '1', expiresIn: '1h' });
const api = (metodo, ruta, rol) => request(app)[metodo](`/api${ruta}`).set('Authorization', `Bearer ${firmar(rol)}`);
const PLAN = { nombre: 'Alto en proteína', proteinas: 40, carbohidratos: 35, grasas: 25 };

beforeEach(() => {
  jest.resetAllMocks();
  servicio.enviar.mockResolvedValue({ mensaje: { id: 5 } });
  servicio.guardar.mockResolvedValue({ mensaje: { id: 5 }, destino: 'plan' });
  comidas.buscarAlimentos.mockResolvedValue({ alimentos: [] });
});

test('CP-277: el profesional envía un plan por el chat; se valida el tipo, el plan y el chat', async () => {
  const r = await api('post', '/chats/3/planes', 'profesional').send({ tipo: 'macros', plan: PLAN, texto: 'Prueba este reparto' });
  expect(r.status).toBe(201);
  expect(servicio.enviar).toHaveBeenCalledWith(expect.objectContaining({ id: 1, rol: 'profesional' }), 3, { tipo: 'macros', plan: PLAN, texto: 'Prueba este reparto' });
  expect((await api('post', '/chats/3/planes', 'profesional').send({ tipo: 'rutina', plan: PLAN })).status).toBe(400);
  expect((await api('post', '/chats/3/planes', 'profesional').send({ tipo: 'macros', plan: 'todo' })).status).toBe(400);
  expect((await api('post', '/chats/abc/planes', 'profesional').send({ tipo: 'macros', plan: PLAN })).status).toBe(400);
  servicio.enviar.mockRejectedValueOnce(new ErrorHttp(403, 'Solo el profesional puede enviar planes por el chat'));
  expect((await api('post', '/chats/3/planes', 'usuario').send({ tipo: 'macros', plan: PLAN })).status).toBe(403);
  expect((await api('post', '/chats/3/planes', 'administrador').send({ tipo: 'macros', plan: PLAN })).status).toBe(403);
});

test('CP-278: la persona guarda el plan recibido una vez; el profesional busca en el catálogo de alimentos', async () => {
  const r = await api('post', '/chats/3/mensajes/5/guardar', 'usuario');
  expect([r.status, r.body.destino]).toEqual([201, 'plan']);
  expect(servicio.guardar).toHaveBeenCalledWith(expect.objectContaining({ id: 1, rol: 'usuario' }), 3, 5);
  servicio.guardar.mockRejectedValueOnce(new ErrorHttp(409, 'Ya guardaste este plan'));
  const otra = await api('post', '/chats/3/mensajes/5/guardar', 'usuario');
  expect([otra.status, otra.body.error]).toEqual([409, 'Ya guardaste este plan']);
  expect((await api('post', '/chats/3/mensajes/x/guardar', 'usuario')).status).toBe(400);

  expect((await api('get', '/profesional/alimentos?q=avena', 'profesional')).status).toBe(200);
  expect(comidas.buscarAlimentos).toHaveBeenCalledWith('avena');
  expect((await api('get', '/profesional/alimentos?q=a', 'profesional')).status).toBe(400);
  expect((await api('get', '/profesional/alimentos?q=avena', 'usuario')).status).toBe(403);
});
