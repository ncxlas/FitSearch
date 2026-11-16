// Fotos de perfil (15-11-2026): GET /api/fotos/:usuarioId/:clave sirve la foto de una cuenta solo si la clave coincide
// con la foto vigente. La base de datos se simula.
jest.mock('../../src/models/prisma', () => ({ datosCuenta: { findUnique: jest.fn() } }));
const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/models/prisma');
const { claveDe, fotoUrl, fotoUrlConClave } = require('../../src/utils/fotos');

const BYTES = Buffer.from('foto-de-prueba');
const FOTO = `data:image/jpeg;base64,${BYTES.toString('base64')}`;
beforeEach(() => jest.resetAllMocks());

test('la dirección lleva el id de la cuenta y una clave de 16 caracteres que cambia con la foto', () => {
  expect(fotoUrl(12, FOTO)).toBe(`/api/fotos/12/${claveDe(FOTO)}`);
  expect(claveDe(FOTO)).toMatch(/^[0-9a-f]{16}$/);
  expect(claveDe(`${FOTO}A`)).not.toBe(claveDe(FOTO));
  expect(fotoUrl(12, null)).toBeNull();
  expect(fotoUrlConClave(12, null)).toBeNull();
  expect(fotoUrlConClave(12n, 'abc')).toBe('/api/fotos/12/abc');
});

test('sin sesión entrega la imagen con su tipo y caché por un año si la clave es la vigente', async () => {
  prisma.datosCuenta.findUnique.mockResolvedValue({ foto: FOTO });
  const res = await request(app).get(fotoUrl(12, FOTO)).buffer(true).parse((r, listo) => {
    const partes = []; r.on('data', (p) => partes.push(p)); r.on('end', () => listo(null, Buffer.concat(partes)));
  });
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toBe('image/jpeg');
  expect(res.headers['cache-control']).toBe('private, max-age=31536000, immutable');
  expect(res.body.equals(BYTES)).toBe(true);
  expect(prisma.datosCuenta.findUnique).toHaveBeenCalledWith({ where: { usuarioId: 12 }, select: { foto: true } });
});

test('responde 404 si la clave no es la de la foto vigente, si no tiene foto o si la dirección no es válida', async () => {
  prisma.datosCuenta.findUnique.mockResolvedValue({ foto: FOTO });
  expect((await request(app).get('/api/fotos/12/0000000000000000')).status).toBe(404);
  prisma.datosCuenta.findUnique.mockResolvedValue({ foto: null });
  expect((await request(app).get(`/api/fotos/12/${claveDe(FOTO)}`)).status).toBe(404);
  prisma.datosCuenta.findUnique.mockResolvedValue(null);
  expect((await request(app).get(`/api/fotos/12/${claveDe(FOTO)}`)).status).toBe(404);
  prisma.datosCuenta.findUnique.mockClear();
  for (const ruta of ['/api/fotos/abc/0123456789abcdef', '/api/fotos/0/0123456789abcdef', '/api/fotos/12/XYZ', '/api/fotos/12/0123456789ABCDEF']) {
    expect((await request(app).get(ruta)).status).toBe(404);
  }
  expect(prisma.datosCuenta.findUnique).not.toHaveBeenCalled();
});

test('no sirve contenido que no sea una imagen guardada como data URL', async () => {
  const otra = 'data:text/html;base64,PHNjcmlwdD4=';
  prisma.datosCuenta.findUnique.mockResolvedValue({ foto: otra });
  expect((await request(app).get(fotoUrl(12, otra))).status).toBe(404);
});
