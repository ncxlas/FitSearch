// Ficha propia del profesional (FS-HU-04) en el modelo, con el cliente de Prisma simulado.
jest.mock('../../src/models/prisma', () => ({ $transaction: jest.fn(), $queryRaw: jest.fn(), profesional: { create: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() } }));
jest.mock('../../src/models/verificacion.model', () => ({ decidir: jest.fn() }));
const { Prisma } = require('@prisma/client');
const prisma = require('../../src/models/prisma');
const { guardarFicha, obtenerPorUsuario, verificarPerfil, listar } = require('../../src/models/profesional.model');
const { comunasDeRegion } = require('../../src/utils/regiones');

// Respuestas de $queryRaw: la búsqueda por nombre devuelve el id y el bloqueo por id, si está activa.
function catalogo({ id = 4, activa = 1, existe = true } = {}) {
  prisma.$queryRaw.mockImplementation((partes) => Promise.resolve(
    !existe ? [] : partes.join('?').includes('FOR SHARE') ? [{ activa }] : [{ id }],
  ));
}
const sql = (llamada) => llamada[0].join('?').replace(/\s+/g, ' ');
const datos = { especialidad: 'Nutrición', descripcion: null, comuna: 'Providencia', modalidad: 'presencial', ubicacionLat: -33.43, ubicacionLng: -70.65 };
beforeEach(() => {
  jest.clearAllMocks();
  prisma.$transaction.mockImplementation((f) => f(prisma));
  prisma.profesional.findUnique.mockResolvedValue(null);
  // La especialidad elegida existe (id 4) y está activa (SELECT … FOR SHARE).
  catalogo({ activa: 1 });
});

// Filtro por comuna o por región del buscador (14-11-2026): la comuna guardada se compara con sus espacios unidos, así
// también aparece una guardada antes como «San  Antonio» (15-11-2026).
test('el buscador compara la comuna guardada con sus espacios unidos, al filtrar por comuna o por región', async () => {
  prisma.$queryRaw.mockImplementation((partes) => Promise.resolve(partes.join('').includes('COUNT(*) AS total') ? [{ total: 0n }] : []));
  const comunaUnida = String.raw`TRIM\(REGEXP_REPLACE\(p\.comuna, '\[\[:space:\]\]\+', ' '\)\)`;

  // Con una comuna basta: la región no agrega otra condición.
  await listar({ usuarioId: 1, comuna: 'San Antonio', region: 'Valparaíso' });
  const conComuna = Prisma.sql(...prisma.$queryRaw.mock.calls[1]);
  expect(conComuna.sql).toMatch(new RegExp(`AND ${comunaUnida} IN \\(\\?\\)`));
  expect(conComuna.values).toEqual(['San Antonio']);

  prisma.$queryRaw.mockClear();
  await listar({ usuarioId: 1, region: 'Valparaíso' });
  const conRegion = Prisma.sql(...prisma.$queryRaw.mock.calls[1]);
  expect(conRegion.sql).toMatch(new RegExp(`COUNT\\(\\*\\) AS total .* AND ${comunaUnida} IN \\(\\?(, ?\\?)+\\)`, 's'));
  // Las comunas de la región y, al final, la forma anterior de Llaillay («Llay-Llay», 15-11-2026).
  expect(conRegion.values).toEqual([...comunasDeRegion('Valparaíso'), 'Llay-Llay']);
});

// Pedido del PO del 16-11-2026: la palabra clave se busca en la presentación del profesional, que el listado trae
// en lugar de la descripción de la ficha (que ya no se edita).
test('la palabra clave se busca en el nombre, la especialidad y la presentación, no en la descripción de la ficha', async () => {
  prisma.$queryRaw.mockImplementation((partes) => Promise.resolve(partes.join('').includes('COUNT(*) AS total') ? [{ total: 0n }] : []));
  await listar({ usuarioId: 1, q: 'trail' });
  const [filas, conteo] = prisma.$queryRaw.mock.calls.map((llamada) => Prisma.sql(...llamada));
  for (const consulta of [filas, conteo]) {
    expect(consulta.sql).toContain('LEFT JOIN datos_cuenta dc ON dc.usuario_id = p.usuario_id');
    expect(consulta.sql).toMatch(/\(u\.nombre LIKE \? OR p\.especialidad LIKE \? OR dc\.biografia LIKE \?\)/);
    expect(consulta.sql).not.toContain('p.descripcion');
  }
  expect(filas.sql).toContain('dc.biografia AS presentacion');
});

// Listado del PO del 15-11-2026: una ficha guardada con el nombre anterior de la comuna también aparece al filtrar.
test('al filtrar por Llaillay también busca la forma anterior «Llay-Llay»', async () => {
  prisma.$queryRaw.mockImplementation((partes) => Promise.resolve(partes.join('').includes('COUNT(*) AS total') ? [{ total: 0n }] : []));
  await listar({ usuarioId: 1, comuna: 'llaillay' });
  expect(Prisma.sql(...prisma.$queryRaw.mock.calls[1]).values).toEqual(['Llaillay', 'Llay-Llay']);
});

test('guardar la ficha la crea si la cuenta profesional todavía no tiene una', async () => {
  await guardarFicha(7, datos);
  const [{ data, select }] = prisma.profesional.create.mock.calls[0];
  expect(data).toEqual({ usuarioId: 7, ...datos });
  // La ficha propia muestra el estado, pero no permite modificarlo.
  expect(select.verificado).toBe(true);
  expect(data).not.toHaveProperty('verificado');
});
test('cambiar la especialidad retira la insignia y protege frente a una edición concurrente', async () => {
  prisma.profesional.findUnique.mockResolvedValue({ id: 2, especialidad: 'Kinesiología', verificado: true, revisionVerificacion: 3 });
  prisma.profesional.updateMany.mockResolvedValue({ count: 1 });
  await guardarFicha(7, datos);
  expect(prisma.profesional.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 2, revisionVerificacion: 3 }, data: expect.objectContaining({ verificado: false, estadoVerificacion: 'rechazado' }) }));
  prisma.profesional.updateMany.mockResolvedValue({ count: 0 });
  await expect(guardarFicha(7, datos)).rejects.toMatchObject({ estado: 409 });
});

test('la ficha propia se busca por la cuenta y devuelve solo sus campos', async () => {
  await obtenerPorUsuario(7);
  const [{ where, select }] = prisma.profesional.findUnique.mock.calls[0];
  expect(where).toEqual({ usuarioId: 7 });
  expect(Object.keys(select).sort()).toEqual(['comuna', 'descripcion', 'direccion', 'especialidad', 'id', 'modalidad', 'ubicacionLat', 'ubicacionLng', 'verificado']);
});

test('cambiar especialidad antes de postular no crea un motivo de rechazo', async () => {
  prisma.profesional.findUnique.mockResolvedValue({ id: 2, especialidad: 'Kinesiología', verificado: false, estadoVerificacion: 'sin_solicitud', revisionVerificacion: 3, historialVerificacion: [] });
  prisma.profesional.updateMany.mockResolvedValue({ count: 1 });
  await guardarFicha(7, datos);
  expect(prisma.profesional.updateMany.mock.calls[0][0].data).toMatchObject({ estadoVerificacion: 'sin_solicitud', motivoRechazo: null });
});

test('la ruta anterior aplica las mismas reglas de documentos e historial que el panel', async () => {
  await verificarPerfil(5, 7);
  expect(require('../../src/models/verificacion.model').decidir).toHaveBeenCalledWith(5, { accion: 'aprobar', administradorId: 7 });
});

test('guardar bloquea en modo compartido la especialidad elegida por su id, igual que el administrador', async () => {
  await guardarFicha(7, datos);
  const [busqueda, bloqueo] = prisma.$queryRaw.mock.calls;
  expect(sql(busqueda)).toBe('SELECT id FROM especialidades WHERE nombre = ?');
  expect(sql(bloqueo)).toBe('SELECT activa FROM especialidades WHERE id = ? AND nombre = ? FOR SHARE');
  expect(bloqueo.slice(1)).toEqual([4, 'Nutrición']);
  expect(prisma.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(prisma.profesional.create.mock.invocationCallOrder[0]);
});

test('si la especialidad se eliminó o se renombró mientras se guardaba, la ficha no se guarda', async () => {
  catalogo({ existe: false });
  await expect(guardarFicha(7, datos)).rejects.toMatchObject({ estado: 400, detalles: { especialidad: 'Selecciona tu especialidad' } });
  expect(prisma.profesional.create).not.toHaveBeenCalled();
  expect(prisma.profesional.updateMany).not.toHaveBeenCalled();
});

test('una especialidad desactivada solo se acepta si es la que la ficha ya tenía', async () => {
  catalogo({ activa: 0 });
  await expect(guardarFicha(7, datos)).rejects.toMatchObject({ estado: 400 });
  prisma.profesional.findUnique.mockResolvedValue({ id: 2, especialidad: 'Nutrición', verificado: false, estadoVerificacion: 'sin_solicitud', revisionVerificacion: 1 });
  prisma.profesional.updateMany.mockResolvedValue({ count: 1 });
  await guardarFicha(7, datos);
  expect(prisma.profesional.updateMany).toHaveBeenCalled();
});
