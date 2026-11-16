// Pruebas de carga (npm run test:carga): reglas pedidas en la revisión del PR #51, sin API ni base de datos.
jest.mock('../../src/models/prisma', () => ({
  usuario: { deleteMany: jest.fn(), count: jest.fn() },
  establecimiento: { deleteMany: jest.fn(), count: jest.fn() },
  $disconnect: jest.fn(),
}));
const prisma = require('../../src/models/prisma');
const { evaluarReservas, codigoDeSalida, limpiar, creados, marca } = require('../../scripts/probar-carga');

beforeEach(() => {
  jest.clearAllMocks();
  creados.establecimientos.length = 0;
});

describe('reservas simultáneas (QS5)', () => {
  test('cumple con exactamente una reserva creada (201) y las otras 49 rechazadas por horario ocupado (409)', () => {
    expect(evaluarReservas({ 201: 1, 409: 49 }, 1, 50)).toBe(true);
  });

  test('no cumple si hay un error de red u otro estado, aunque solo una reserva quede activa', () => {
    expect(evaluarReservas({ 201: 1, 409: 48, 'error de red': 1 }, 1, 50)).toBe(false);
    expect(evaluarReservas({ 201: 1, 409: 48, 500: 1 }, 1, 50)).toBe(false);
    expect(evaluarReservas({ 201: 1, 409: 48, 429: 1 }, 1, 50)).toBe(false);
  });

  test('no cumple si se crean dos reservas, ninguna, o el horario no queda con una sola activa', () => {
    expect(evaluarReservas({ 201: 2, 409: 48 }, 2, 50)).toBe(false);
    expect(evaluarReservas({ 409: 50 }, 0, 50)).toBe(false);
    expect(evaluarReservas({ 201: 1, 409: 49 }, 0, 50)).toBe(false);
    expect(evaluarReservas({ 201: 1, 409: 49 }, 2, 50)).toBe(false);
  });
});

describe('código de salida', () => {
  const limpio = { cuentasEliminadas: 571, establecimientosEliminados: 100, cuentasRestantes: 0, establecimientosRestantes: 0 };

  test('termina sin error solo si todo cumple y la limpieza no dejó datos', () => {
    expect(codigoDeSalida({ resultado: 'CUMPLE', limpieza: limpio })).toBe(0);
  });

  test('termina con error si el resultado es «NO CUMPLE» o «ERROR»', () => {
    expect(codigoDeSalida({ resultado: 'NO CUMPLE', limpieza: limpio })).toBe(1);
    expect(codigoDeSalida({ resultado: 'ERROR', limpieza: limpio })).toBe(1);
  });

  test('termina con error si la limpieza falló o dejó cuentas o centros', () => {
    expect(codigoDeSalida({ resultado: 'CUMPLE', limpieza: { error: 'sin conexión' } })).toBe(1);
    expect(codigoDeSalida({ resultado: 'CUMPLE', limpieza: { ...limpio, cuentasRestantes: 3 } })).toBe(1);
    expect(codigoDeSalida({ resultado: 'CUMPLE', limpieza: { ...limpio, establecimientosRestantes: 1 } })).toBe(1);
    expect(codigoDeSalida({ resultado: 'CUMPLE' })).toBe(1);
  });
});

describe('limpieza', () => {
  test('borra las cuentas de esta ejecución por su marca y los centros solo por los IDs que creó', async () => {
    creados.establecimientos.push(7, 8);
    prisma.usuario.deleteMany.mockResolvedValueOnce({ count: 70 }).mockResolvedValueOnce({ count: 501 });
    prisma.establecimiento.deleteMany.mockResolvedValue({ count: 2 });
    prisma.usuario.count.mockResolvedValue(0);
    prisma.establecimiento.count.mockResolvedValue(0);

    await expect(limpiar()).resolves.toEqual({
      cuentasEliminadas: 571, establecimientosEliminados: 2, cuentasRestantes: 0, establecimientosRestantes: 0,
    });
    const deEstaEjecucion = { correo: { startsWith: `${marca}-` } };
    expect(prisma.usuario.deleteMany).toHaveBeenNthCalledWith(1, { where: { ...deEstaEjecucion, rol: { nombre: 'usuario' } } });
    expect(prisma.usuario.deleteMany).toHaveBeenNthCalledWith(2, { where: deEstaEjecucion });
    // Nunca por nombre o dirección: otro centro llamado «Centro de carga …» no se toca.
    expect(prisma.establecimiento.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.establecimiento.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [7, 8] } } });
    expect(prisma.establecimiento.count).toHaveBeenCalledWith({ where: { id: { in: [7, 8] } } });
  });

  test('si no alcanzó a crear centros, no borra ninguno', async () => {
    prisma.usuario.deleteMany.mockResolvedValue({ count: 0 });
    prisma.usuario.count.mockResolvedValue(0);

    await expect(limpiar()).resolves.toEqual({
      cuentasEliminadas: 0, establecimientosEliminados: 0, cuentasRestantes: 0, establecimientosRestantes: 0,
    });
    expect(prisma.establecimiento.deleteMany).not.toHaveBeenCalled();
    expect(prisma.establecimiento.count).not.toHaveBeenCalled();
  });

  test('informa lo que haya quedado sin borrar', async () => {
    creados.establecimientos.push(9);
    prisma.usuario.deleteMany.mockResolvedValue({ count: 0 });
    prisma.establecimiento.deleteMany.mockResolvedValue({ count: 0 });
    prisma.usuario.count.mockResolvedValue(2);
    prisma.establecimiento.count.mockResolvedValue(1);

    const limpieza = await limpiar();
    expect(limpieza).toMatchObject({ cuentasRestantes: 2, establecimientosRestantes: 1 });
    expect(codigoDeSalida({ resultado: 'CUMPLE', limpieza })).toBe(1);
  });
});
