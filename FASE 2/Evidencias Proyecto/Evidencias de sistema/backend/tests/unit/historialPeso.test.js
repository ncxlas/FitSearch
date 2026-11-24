// Historial de peso (SC-43): anotar y borrar pesajes, el historial en la respuesta del plan y el ritmo real.
// Datos simulados; la comprobación con MySQL real está en scripts/probar-peso-mysql.js.
jest.mock('../../src/models/planAlimentacion.model');
jest.mock('../../src/models/usuario.model');
jest.mock('../../src/models/registroPeso.model');
const { Prisma } = require('@prisma/client');
const modelo = require('../../src/models/planAlimentacion.model');
const usuarioModel = require('../../src/models/usuario.model');
const pesos = require('../../src/models/registroPeso.model');
const servicio = require('../../src/services/planAlimentacion.service');

// 24-11-2026 a las 10:00 en Chile.
const AHORA = new Date('2026-11-24T13:00:00Z');
const HOY = '2026-11-24';
const perfil = { pesoKg: '80.00', alturaCm: '175.00', edad: 30, sexo: 'masculino', actividadFisica: 'moderada', objetivoPrincipal: 'bajar_peso' };
const fila = (id, fecha, kg) => ({ id, fecha: new Date(`${fecha}T00:00:00Z`), pesoKg: new Prisma.Decimal(kg) });

beforeEach(() => {
  jest.resetAllMocks();
  usuarioModel.buscarPorIdConPerfil.mockResolvedValue({ id: 7, perfil });
  modelo.personalizados.mockResolvedValue([]);
  pesos.listar.mockResolvedValue([]);
});

describe('ritmo real', () => {
  const p = (fecha, pesoKg) => ({ fecha, pesoKg });
  test('baja medio kilo por semana con una recta exacta', () => {
    expect(servicio.ritmoReal([p('2026-11-03', 81), p('2026-11-10', 80.5), p('2026-11-17', 80), p('2026-11-24', 79.5)], HOY)).toBe(-0.5);
  });
  test('sube cuando el peso aumenta', () => {
    expect(servicio.ritmoReal([p('2026-11-10', 70), p('2026-11-24', 70.6)], HOY)).toBe(0.3);
  });
  test('sin dos pesajes separados por al menos una semana no hay ritmo', () => {
    expect(servicio.ritmoReal([], HOY)).toBeNull();
    expect(servicio.ritmoReal([p('2026-11-24', 80)], HOY)).toBeNull();
    expect(servicio.ritmoReal([p('2026-11-20', 80), p('2026-11-24', 79)], HOY)).toBeNull();
  });
  test('solo cuenta las últimas 8 semanas', () => {
    expect(servicio.ritmoReal([p('2026-08-01', 95), p('2026-11-10', 80), p('2026-11-24', 79)], HOY)).toBe(-0.5);
  });
  test('un peso estable da 0, no -0', () => {
    expect(Object.is(servicio.ritmoReal([p('2026-11-10', 80), p('2026-11-24', 80)], HOY), 0)).toBe(true);
  });
});

describe('historial en el plan', () => {
  test('trae los pesajes de los últimos 180 días como números y el ritmo real', async () => {
    pesos.listar.mockResolvedValue([fila(1, '2026-11-10', '80.50'), fila(2, '2026-11-24', '79.50')]);
    const r = await servicio.obtener(7, AHORA);
    expect(pesos.listar).toHaveBeenCalledWith(7, '2026-05-28');
    expect(r.historialPeso).toEqual({
      pesos: [{ id: 1, fecha: '2026-11-10', pesoKg: 80.5 }, { id: 2, fecha: '2026-11-24', pesoKg: 79.5 }],
      ritmoRealSemanalKg: -0.5, dias: 180, hoy: HOY,
    });
  });
});

describe('anotar y borrar', () => {
  test('anota hoy por defecto, redondea a un decimal y responde el plan', async () => {
    const r = await servicio.registrarPeso(7, { pesoKg: 79.46 }, AHORA);
    expect(pesos.registrar).toHaveBeenCalledWith(7, HOY, 79.5);
    expect(r).toHaveProperty('historialPeso');
  });
  test('acepta un día anterior y rechaza el futuro o más de un año atrás', async () => {
    await servicio.registrarPeso(7, { pesoKg: 80, fecha: '2026-11-20' }, AHORA);
    expect(pesos.registrar).toHaveBeenCalledWith(7, '2026-11-20', 80);
    await expect(servicio.registrarPeso(7, { pesoKg: 80, fecha: '2026-11-25' }, AHORA)).rejects.toMatchObject({ estado: 400, detalles: { fecha: 'Elige hoy o un día anterior' } });
    await expect(servicio.registrarPeso(7, { pesoKg: 80, fecha: '2025-11-23' }, AHORA)).rejects.toMatchObject({ estado: 400 });
    expect(pesos.registrar).toHaveBeenCalledTimes(1);
  });
  test('borrar un pesaje ajeno o inexistente responde 404', async () => {
    pesos.eliminar.mockResolvedValue(false);
    await expect(servicio.eliminarPeso(7, 99, AHORA)).rejects.toMatchObject({ estado: 404 });
    pesos.eliminar.mockResolvedValue(true);
    await expect(servicio.eliminarPeso(7, 1, AHORA)).resolves.toHaveProperty('historialPeso');
    expect(pesos.eliminar).toHaveBeenCalledWith(7, 1);
  });
});
