// Fotos de perfil (15-11-2026): GET /api/fotos/:cuenta/:clave sirve la foto de una cuenta solo si la clave coincide
// con la foto vigente. Revisión del PR 62 (16-11-2026): :cuenta es el id cifrado (enlace opaco) y la foto de una cuenta
// desactivada no se muestra. La base de datos se simula.
jest.mock('../../src/models/prisma', () => ({ datosCuenta: { findUnique: jest.fn() } }));
const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/models/prisma');
const { cifrarCuenta, claveDe, descifrarCuenta, fotoUrl, fotoUrlConClave } = require('../../src/utils/fotos');

const BYTES = Buffer.from('foto-de-prueba');
const FOTO = `data:image/jpeg;base64,${BYTES.toString('base64')}`;
const activa = (foto) => ({ foto, usuario: { activo: true } });
beforeEach(() => jest.resetAllMocks());

test('la dirección lleva la cuenta cifrada (no su id) y una clave de 16 caracteres que cambia con la foto', () => {
  const url = fotoUrl(12, FOTO);
  expect(url).toMatch(/^\/api\/fotos\/[0-9a-f]{32}\/[0-9a-f]{16}$/);
  expect(url).toBe(`/api/fotos/${cifrarCuenta(12)}/${claveDe(FOTO)}`);
  expect(url).not.toMatch(/\/12\//);
  // Siempre la misma para la misma cuenta (la caché sirve) y distinta para otra cuenta.
  expect(cifrarCuenta(12)).toBe(cifrarCuenta(12));
  expect(cifrarCuenta(13)).not.toBe(cifrarCuenta(12));
  expect(claveDe(`${FOTO}A`)).not.toBe(claveDe(FOTO));
  expect(fotoUrl(12, null)).toBeNull();
  expect(fotoUrlConClave(12, null)).toBeNull();
  expect(fotoUrlConClave(12n, 'abc')).toBe(`/api/fotos/${cifrarCuenta(12)}/abc`);
});

test('solo el servidor descifra la cuenta: un id a la vista o un bloque inventado no sirven', () => {
  expect(descifrarCuenta(cifrarCuenta(12))).toBe(12);
  expect(descifrarCuenta(cifrarCuenta(987654))).toBe(987654);
  for (const texto of ['12', '0'.repeat(32), 'f'.repeat(32), `${cifrarCuenta(12).slice(0, 31)}0`, cifrarCuenta(12).toUpperCase(), null]) {
    expect(descifrarCuenta(texto)).toBeNull();
  }
});

test('sin sesión entrega la imagen con su tipo y caché por un año si la clave es la vigente', async () => {
  prisma.datosCuenta.findUnique.mockResolvedValue(activa(FOTO));
  const res = await request(app).get(fotoUrl(12, FOTO)).buffer(true).parse((r, listo) => {
    const partes = []; r.on('data', (p) => partes.push(p)); r.on('end', () => listo(null, Buffer.concat(partes)));
  });
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toBe('image/jpeg');
  expect(res.headers['cache-control']).toBe('private, max-age=31536000, immutable');
  expect(res.body.equals(BYTES)).toBe(true);
  expect(prisma.datosCuenta.findUnique).toHaveBeenCalledWith({ where: { usuarioId: 12 }, select: { foto: true, usuario: { select: { activo: true } } } });
});

test('responde 404 si la clave no es la vigente, si no tiene foto, si la cuenta está desactivada o si la dirección no es válida', async () => {
  const cuenta = cifrarCuenta(12);
  prisma.datosCuenta.findUnique.mockResolvedValue(activa(FOTO));
  expect((await request(app).get(`/api/fotos/${cuenta}/0000000000000000`)).status).toBe(404);
  prisma.datosCuenta.findUnique.mockResolvedValue(activa(null));
  expect((await request(app).get(`/api/fotos/${cuenta}/${claveDe(FOTO)}`)).status).toBe(404);
  prisma.datosCuenta.findUnique.mockResolvedValue(null);
  expect((await request(app).get(`/api/fotos/${cuenta}/${claveDe(FOTO)}`)).status).toBe(404);
  // La foto de una cuenta desactivada deja de verse (revisión del PR 62).
  prisma.datosCuenta.findUnique.mockResolvedValue({ foto: FOTO, usuario: { activo: false } });
  expect((await request(app).get(fotoUrl(12, FOTO))).status).toBe(404);

  prisma.datosCuenta.findUnique.mockClear();
  // El id a la vista (la dirección anterior), un bloque inventado o una clave mal escrita no llegan a la base de datos.
  for (const ruta of [`/api/fotos/12/${claveDe(FOTO)}`, `/api/fotos/${'0'.repeat(32)}/${claveDe(FOTO)}`, '/api/fotos/abc/0123456789abcdef',
    `/api/fotos/${cuenta}/XYZ`, `/api/fotos/${cuenta}/0123456789ABCDEF`]) {
    expect((await request(app).get(ruta)).status).toBe(404);
  }
  expect(prisma.datosCuenta.findUnique).not.toHaveBeenCalled();
});

test('no sirve contenido que no sea una imagen guardada como data URL', async () => {
  const otra = 'data:text/html;base64,PHNjcmlwdD4=';
  prisma.datosCuenta.findUnique.mockResolvedValue(activa(otra));
  expect((await request(app).get(fotoUrl(12, otra))).status).toBe(404);
});
