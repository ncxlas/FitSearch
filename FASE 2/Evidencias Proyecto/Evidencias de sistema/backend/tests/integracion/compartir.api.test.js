// Rutas del progreso compartido (SC-45). El servicio se simula; su lógica se prueba con MySQL real
// (scripts/probar-compartir-mysql.js, 20 comprobaciones).
jest.mock('../../src/services/compartir.service');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const servicio = require('../../src/services/compartir.service');
const ErrorHttp = require('../../src/utils/ErrorHttp');

const firmar = (rol) => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: '1', expiresIn: '1h' });
const api = (metodo, ruta, rol) => request(app)[metodo](`/api${ruta}`).set('Authorization', `Bearer ${firmar(rol)}`);
const LISTA = { categorias: [], profesionales: [], registro: [] };

beforeEach(() => {
  jest.resetAllMocks();
  servicio.listarDelUsuario.mockResolvedValue(LISTA);
  servicio.guardar.mockResolvedValue(LISTA);
  servicio.quitar.mockResolvedValue(LISTA);
  servicio.listarDelProfesional.mockResolvedValue({ clientes: [] });
  servicio.progreso.mockResolvedValue({ cliente: { id: 7 }, secciones: {} });
});

test('CP-273: la persona lista, guarda y quita permisos; solo envía sí o no por categoría', async () => {
  expect((await api('get', '/compartir', 'usuario')).status).toBe(200);
  const r = await api('put', '/compartir/9', 'usuario').send({ comidas: true, peso: false, rol: 'administrador' });
  expect(r.status).toBe(200);
  expect(servicio.guardar).toHaveBeenCalledWith(1, 9, { comidas: true, peso: false });
  expect((await api('put', '/compartir/9', 'usuario').send({ salud: 'sí' })).status).toBe(400);
  expect((await api('put', '/compartir/abc', 'usuario').send({ salud: true })).status).toBe(400);
  expect((await api('delete', '/compartir/9', 'usuario')).status).toBe(200);
  expect(servicio.quitar).toHaveBeenCalledWith(1, 9);
  expect((await api('get', '/compartir', 'profesional')).status).toBe(403);
});

test('CP-274: el profesional lista a quienes le comparten y ve el progreso permitido; sin permiso recibe 403', async () => {
  expect((await api('get', '/profesional/progreso', 'profesional')).status).toBe(200);
  expect((await api('get', '/profesional/progreso/7', 'profesional')).body).toEqual({ cliente: { id: 7 }, secciones: {} });
  expect(servicio.progreso).toHaveBeenCalledWith(1, 7);
  servicio.progreso.mockRejectedValueOnce(new ErrorHttp(403, 'Esta persona no comparte su progreso contigo'));
  const sin = await api('get', '/profesional/progreso/8', 'profesional');
  expect([sin.status, sin.body.error]).toEqual([403, 'Esta persona no comparte su progreso contigo']);
  expect((await api('get', '/profesional/progreso/7', 'usuario')).status).toBe(403);
  expect((await api('get', '/profesional/progreso/x', 'profesional')).status).toBe(400);
});
