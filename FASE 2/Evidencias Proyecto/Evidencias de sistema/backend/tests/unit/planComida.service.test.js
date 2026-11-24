// Planes de comidas (SC-44): validación, forma pública y «Lo comí». Prisma se simula; MySQL real en
// scripts/probar-planes-comida-mysql.js.
jest.mock('../../src/models/prisma', () => {
  const tx = {
    alimento: { findMany: jest.fn() },
    planComida: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
    planComidaItem: { deleteMany: jest.fn() },
    $queryRaw: jest.fn(),
  };
  tx.$transaction = jest.fn(async (f) => f(tx));
  return tx;
});
jest.mock('../../src/models/comida.model');
const { Prisma } = require('@prisma/client');
const prisma = require('../../src/models/prisma');
const comidaModelo = require('../../src/models/comida.model');
const servicio = require('../../src/services/planComida.service');

const AHORA = new Date('2026-11-24T13:00:00Z'); // martes 24-11-2026 en Chile
const POLLO = { id: 3, nombre: 'Pechuga de pollo', calorias: new Prisma.Decimal('165'), proteinasG: new Prisma.Decimal('31'), carbohidratosG: new Prisma.Decimal('0'), grasasG: new Prisma.Decimal('3.6'), activo: true };
const ARROZ = { id: 7, nombre: 'Arroz blanco cocido', calorias: new Prisma.Decimal('130'), proteinasG: new Prisma.Decimal('2.7'), carbohidratosG: new Prisma.Decimal('28.2'), grasasG: new Prisma.Decimal('0.3'), activo: true };

beforeEach(() => {
  jest.clearAllMocks();
  prisma.alimento.findMany.mockImplementation(async ({ where }) => [POLLO, ARROZ].filter((a) => where.id.in.includes(a.id)));
  prisma.planComida.findMany.mockResolvedValue([]);
  prisma.planComida.count.mockResolvedValue(0);
  prisma.planComida.findFirst.mockResolvedValue({ id: 5 });
});

describe('normalizarPlan', () => {
  test('ordena las líneas por momento, copia el nombre del alimento y redondea los gramos', async () => {
    const plan = await servicio.normalizarPlan({
      nombre: '  Semana   liviana ', tipo: 'dia', nota: ' Tomar agua ',
      items: [
        { momento: 'almuerzo', alimentoId: 3, gramos: 150.04 }, { momento: 'almuerzo', alimentoId: '7', gramos: '120' },
        { momento: 'cena', nota: ' Ensalada a gusto ' },
      ],
    });
    expect(plan).toEqual({
      nombre: 'Semana liviana', tipo: 'dia', nota: 'Tomar agua',
      items: [
        { dia: 0, momento: 'almuerzo', orden: 0, alimentoId: 3, gramos: 150, nota: null, nombreAlimento: 'Pechuga de pollo' },
        { dia: 0, momento: 'almuerzo', orden: 1, alimentoId: 7, gramos: 120, nota: null, nombreAlimento: 'Arroz blanco cocido' },
        { dia: 0, momento: 'cena', orden: 0, alimentoId: null, gramos: null, nota: 'Ensalada a gusto', nombreAlimento: null },
      ],
    });
  });

  test('junta los errores de cada línea', async () => {
    await expect(servicio.normalizarPlan({
      nombre: 'Plan', tipo: 'semana',
      items: [{ dia: 0, momento: 'almuerzo', alimentoId: 3, gramos: 100 }, { dia: 1, momento: 'once', nota: 'x' },
        { dia: 2, momento: 'cena', alimentoId: 3, gramos: 5000 }, { dia: 3, momento: 'cena' }],
    })).rejects.toMatchObject({
      estado: 400,
      detalles: {
        'items[0]': 'El día no corresponde al tipo de plan', 'items[1]': 'Elige el momento del día',
        'items[2]': 'Indica entre 1 y 2000 gramos', 'items[3]': 'Escribe la nota o elige un alimento',
      },
    });
  });

  test('sin nombre, tipo o líneas responde 400 con cada campo; un alimento fuera del catálogo también', async () => {
    await expect(servicio.normalizarPlan({ nombre: '', tipo: 'mes', items: [] })).rejects.toMatchObject({ detalles: { nombre: expect.any(String), tipo: expect.any(String), items: expect.any(String) } });
    await expect(servicio.normalizarPlan({ nombre: 'Plan', tipo: 'dia', items: [{ momento: 'cena', alimentoId: 99, gramos: 100 }] })).rejects.toMatchObject({ estado: 400 });
  });

  test('no acepta más de 12 líneas por comida', async () => {
    const items = Array.from({ length: 13 }, () => ({ momento: 'cena', alimentoId: 3, gramos: 10 }));
    await expect(servicio.normalizarPlan({ nombre: 'Plan', tipo: 'dia', items })).rejects.toMatchObject({ detalles: { 'items[12]': 'Cada comida puede tener hasta 12 líneas' } });
  });
});

describe('forma pública', () => {
  test('un plan semanal trae los 7 días con sus 5 momentos, aportes y promedio de los días con comida', () => {
    const plan = servicio.formatear({
      id: 5, nombre: 'Semana', tipo: 'semana', nota: null, origen: 'profesional', enUso: true, fechaCreacion: AHORA,
      profesional: { id: 9, especialidad: 'Nutrición', usuario: { nombre: 'Matías Rojas' } },
      items: [
        { id: 1, dia: 1, momento: 'almuerzo', alimentoId: 3, alimento: POLLO, nombreAlimento: 'Pechuga de pollo', gramos: new Prisma.Decimal('200'), nota: null },
        { id: 2, dia: 2, momento: 'cena', alimentoId: 7, alimento: ARROZ, nombreAlimento: 'Arroz blanco cocido', gramos: new Prisma.Decimal('100'), nota: null },
        { id: 3, dia: 2, momento: 'cena', alimentoId: null, alimento: null, nombreAlimento: null, gramos: null, nota: 'Con verduras' },
      ],
    });
    expect(plan.dias.map((d) => d.nombre)).toEqual(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']);
    expect(plan.dias[0].momentos.map((m) => m.etiqueta)).toEqual(['Desayuno', 'Media mañana', 'Almuerzo', 'Merienda', 'Cena']);
    expect(plan.dias[0].momentos[2].items[0]).toEqual({ id: 1, alimentoId: 3, nombre: 'Pechuga de pollo', gramos: 200, nota: null, calorias: 330, proteinasG: 62, carbohidratosG: 0, grasasG: 7.2 });
    expect(plan.dias[1].momentos[4].items[1]).toMatchObject({ nombre: null, nota: 'Con verduras', calorias: null });
    expect(plan.dias[1].totales.calorias).toBe(130);
    expect(plan.caloriasPromedio).toBe(230);
    expect(plan.profesional).toEqual({ id: 9, nombre: 'Matías Rojas', especialidad: 'Nutrición' });
  });

  test('el día de la semana va de 1 (lunes) a 7 (domingo)', () => {
    expect(['2026-11-23', '2026-11-24', '2026-11-29'].map(servicio.diaDeLaSemana)).toEqual([1, 2, 7]);
  });
});

describe('crear, usar y registrar', () => {
  const PLAN = { nombre: 'Base', tipo: 'dia', items: [{ momento: 'almuerzo', alimentoId: 3, gramos: 150 }] };

  test('con «usar» deja el plan nuevo en uso y saca de uso a los demás', async () => {
    await servicio.crear(1, PLAN, { usar: true }, AHORA);
    expect(prisma.planComida.updateMany).toHaveBeenCalledWith({ where: { usuarioId: 1, enUso: true }, data: { enUso: false } });
    expect(prisma.planComida.create.mock.calls[0][0].data).toMatchObject({ usuarioId: 1, nombre: 'Base', enUso: true, origen: 'propio', profesionalId: null });
  });

  test('no deja guardar más de 10 planes', async () => {
    prisma.planComida.count.mockResolvedValue(10);
    await expect(servicio.crear(1, PLAN, {}, AHORA)).rejects.toMatchObject({ estado: 409 });
    expect(prisma.planComida.create).not.toHaveBeenCalled();
  });

  test('editar, usar o borrar un plan ajeno responde 404', async () => {
    prisma.planComida.findFirst.mockResolvedValue(null);
    prisma.planComida.deleteMany.mockResolvedValue({ count: 0 });
    await expect(servicio.actualizar(1, 99, PLAN, AHORA)).rejects.toMatchObject({ estado: 404 });
    await expect(servicio.usar(1, 99, true, AHORA)).rejects.toMatchObject({ estado: 404 });
    await expect(servicio.eliminar(1, 99, AHORA)).rejects.toMatchObject({ estado: 404 });
  });

  test('«Lo comí» registra cada alimento con origen «plan» y su aporte por los gramos confirmados', async () => {
    const r = await servicio.registrar(1, 5, { momento: 'almuerzo', items: [{ alimentoId: 3, gramos: 180 }, { alimentoId: 7, gramos: '90' }] }, AHORA);
    expect(r).toEqual({ registrados: 2, fecha: '2026-11-24', momento: 'almuerzo' });
    expect(comidaModelo.crear.mock.calls.map(([d]) => d)).toEqual([
      expect.objectContaining({ usuarioId: 1, fecha: '2026-11-24', momento: 'almuerzo', alimentoId: 3, gramos: 180, origen: 'plan', calorias: 297 }),
      expect.objectContaining({ alimentoId: 7, gramos: 90, origen: 'plan', calorias: 117 }),
    ]);
  });

  test('«Lo comí» rechaza un día futuro, gramos fuera de rango y alimentos fuera del catálogo', async () => {
    await expect(servicio.registrar(1, 5, { fecha: '2026-11-25', momento: 'cena', items: [{ alimentoId: 3, gramos: 100 }] }, AHORA)).rejects.toMatchObject({ estado: 400 });
    await expect(servicio.registrar(1, 5, { momento: 'cena', items: [{ alimentoId: 3, gramos: 0 }] }, AHORA)).rejects.toMatchObject({ estado: 400 });
    await expect(servicio.registrar(1, 5, { momento: 'cena', items: [{ alimentoId: 99, gramos: 100 }] }, AHORA)).rejects.toMatchObject({ estado: 400 });
    expect(comidaModelo.crear).not.toHaveBeenCalled();
  });
});
