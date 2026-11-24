// Pruebas del servicio de «Mi cuenta» (SC-42): descargar mis datos y eliminar la cuenta anonimizándola.
// Prisma se simula; la comprobación contra MySQL real está en scripts/probar-cuenta-mysql.js.
jest.mock('../../src/models/prisma', () => {
  const modelo = () => ({ deleteMany: jest.fn(), findMany: jest.fn(), update: jest.fn(), findUnique: jest.fn() });
  const tx = {};
  ['planAlimentacion', 'planPersonalizado', 'metaPeso', 'registroPeso', 'planComida', 'permisoCompartir', 'accesoCompartido', 'registroComida', 'registroAgua', 'conversacion', 'usoAsistente',
    'favorito', 'listaEspera', 'chatCita', 'tokenRecuperacion', 'informacionSalud', 'perfilUsuario', 'datosCuenta',
    'documentoProfesional', 'bloqueoAgenda', 'disponibilidad', 'profesional', 'reserva', 'usuario'].forEach((m) => { tx[m] = modelo(); });
  tx.$queryRaw = jest.fn();
  tx.$transaction = jest.fn(async (f) => f(tx));
  return tx;
});
jest.mock('../../src/services/google.service');
jest.mock('../../src/services/aviso.service');
jest.mock('../../src/services/documento.service');

const bcrypt = require('bcryptjs');
const { Prisma } = require('@prisma/client');
const prisma = require('../../src/models/prisma');
const google = require('../../src/services/google.service');
const avisos = require('../../src/services/aviso.service');
const documentos = require('../../src/services/documento.service');
const { exportar, eliminar, limpiar } = require('../../src/services/miCuenta.service');

const HASH = bcrypt.hashSync('ClaveActual123', 4);
// 24-11-2026 15:00 en Chile (UTC-3).
const RELOJ = new Date('2026-11-24T18:00:00Z');
const bloque = (fecha, hora) => ({ fecha: new Date(`${fecha}T00:00:00Z`), horaInicio: new Date(`1970-01-01T${hora}:00Z`), profesionalId: 9 });

function cuenta(extra = {}) {
  return { id: 7, nombre: 'Ana Pérez', correo: 'ana@correo.cl', passwordHash: HASH, googleId: null, versionSesion: 2, eliminadoEn: null,
    rol: { nombre: 'usuario' }, profesional: null, ...extra };
}

beforeEach(() => {
  jest.clearAllMocks();
  prisma.$queryRaw.mockResolvedValue([{ versionSesion: 2, eliminadoEn: null }]);
  prisma.reserva.findMany.mockResolvedValue([]);
  prisma.documentoProfesional.findMany.mockResolvedValue([]);
  documentos.eliminarArchivos.mockResolvedValue();
});

describe('limpiar: el archivo descargado no trae claves internas ni credenciales', () => {
  test('quita id, claves foráneas y secretos; convierte fechas, horas y decimales', () => {
    expect(limpiar({
      id: 3, usuarioId: 7, passwordHash: 'x', googleId: 'g', tokenHash: 't', clave: 'k', versionSesion: 1,
      fecha: new Date('2026-11-24T00:00:00Z'), horaInicio: new Date('1970-01-01T09:30:00Z'),
      fechaCreacion: new Date('2026-11-24T12:34:56Z'), pesoKg: new Prisma.Decimal('71.50'), lista: [{ id: 1, nombre: 'Pollo' }],
    })).toEqual({
      fecha: '2026-11-24', horaInicio: '09:30', fechaCreacion: '2026-11-24T12:34:56.000Z', pesoKg: 71.5, lista: [{ nombre: 'Pollo' }],
    });
  });
});

describe('exportar', () => {
  test('arma las secciones de una cuenta de usuario y marca quién escribió cada mensaje del chat', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      ...cuenta(), rol: { nombre: 'usuario' }, fechaRegistro: new Date('2026-09-01T10:00:00Z'), datosCuenta: { usuarioId: 7, telefono: '+56 9 1234 5678' },
      perfil: { id: 1, usuarioId: 7, pesoKg: new Prisma.Decimal('70') }, informacionSalud: { condiciones: ['asma'] }, usoAsistente: null,
      favoritos: [], resenas: [], reservas: [], listaEspera: [], conversaciones: [], registrosAgua: [], planesAlimentacion: [],
      planesPersonalizados: [], metasPeso: [], registrosPeso: [], planesComida: [], permisosCompartir: [], accesosCompartidos: [],
      registrosComida: [{ id: 5, gramos: 120, alimento: { nombre: 'Pollo' } }],
      chats: [{ profesional: { especialidad: 'Nutrición', usuario: { nombre: 'Matías Rojas' } },
        mensajes: [{ autorId: 7, texto: 'Hola', leido: true, fechaCreacion: new Date('2026-11-20T10:00:00Z') },
          { autorId: 30, texto: 'Hola Ana', leido: false, fechaCreacion: new Date('2026-11-20T10:05:00Z') }] }],
      profesional: null,
    });
    const datos = await exportar(7);
    expect(datos.cuenta).toEqual(expect.objectContaining({ nombre: 'Ana Pérez', correo: 'ana@correo.cl', tipoDeCuenta: 'usuario', tieneContrasena: true, vinculadaConGoogle: false }));
    expect(datos.perfil).toEqual({ pesoKg: 70 });
    expect(datos.comidas).toEqual([{ gramos: 120, alimento: 'Pollo' }]);
    expect(datos.chats[0].mensajes.map((m) => m.autor)).toEqual(['Tú', 'Matías Rojas']);
    expect(datos.fichaProfesional).toBeUndefined();
    expect(JSON.stringify(datos)).not.toMatch(/passwordHash|googleId|usuarioId/);
  });

  test('una cuenta eliminada ya no puede descargar', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ ...cuenta(), eliminadoEn: new Date() });
    await expect(exportar(7)).rejects.toMatchObject({ estado: 401 });
  });
});

describe('eliminar', () => {
  test('exige la contraseña correcta y no toca nada si falla', async () => {
    prisma.usuario.findUnique.mockResolvedValue(cuenta());
    await expect(eliminar(7, { password: 'incorrecta', confirmacion: 'ELIMINAR' }, RELOJ)).rejects.toMatchObject({ estado: 400 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('una cuenta de Google confirma con la misma cuenta vinculada', async () => {
    prisma.usuario.findUnique.mockResolvedValue(cuenta({ passwordHash: null, googleId: 'g-ana' }));
    google.verificarCredencial.mockResolvedValueOnce({ googleId: 'otra' }).mockResolvedValueOnce({ googleId: 'g-ana' });
    await expect(eliminar(7, { credencial: 'token-otra' }, RELOJ)).rejects.toMatchObject({ estado: 400 });
    await expect(eliminar(7, { credencial: 'token-ana' }, RELOJ)).resolves.toEqual({ citasCanceladas: 0 });
  });

  test('el administrador no puede eliminar su cuenta desde la aplicación', async () => {
    prisma.usuario.findUnique.mockResolvedValue(cuenta({ rol: { nombre: 'administrador' } }));
    await expect(eliminar(7, { password: 'ClaveActual123' }, RELOJ)).rejects.toMatchObject({ estado: 403 });
  });

  test('si la cuenta cambió entre la lectura y el bloqueo, responde 409', async () => {
    prisma.usuario.findUnique.mockResolvedValue(cuenta());
    prisma.$queryRaw.mockResolvedValue([{ versionSesion: 3, eliminadoEn: null }]);
    await expect(eliminar(7, { password: 'ClaveActual123' }, RELOJ)).rejects.toMatchObject({ estado: 409 });
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  test('cancela solo las citas futuras, borra los datos personales y anonimiza la cuenta', async () => {
    prisma.usuario.findUnique.mockResolvedValue(cuenta());
    prisma.reserva.findMany.mockResolvedValue([
      { id: 1, usuarioId: 7, disponibilidad: bloque('2026-11-24', '16:00') }, // hoy, más tarde: se cancela
      { id: 2, usuarioId: 7, disponibilidad: bloque('2026-11-24', '14:00') }, // hoy, ya pasó: se conserva
      { id: 3, usuarioId: 7, disponibilidad: bloque('2026-12-01', '09:00') }, // futura: se cancela
    ]);
    await expect(eliminar(7, { password: 'ClaveActual123' }, RELOJ)).resolves.toEqual({ citasCanceladas: 2 });

    expect(prisma.reserva.update.mock.calls.map(([a]) => a.where.id)).toEqual([1, 3]);
    expect(prisma.reserva.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { estado: 'cancelada', canceladaPor: 'usuario', fechaCambio: RELOJ } });
    for (const m of ['perfilUsuario', 'informacionSalud', 'datosCuenta', 'registroComida', 'registroAgua', 'conversacion', 'favorito', 'chatCita', 'metaPeso', 'registroPeso', 'planComida', 'permisoCompartir', 'accesoCompartido']) {
      expect(prisma[m].deleteMany).toHaveBeenCalledWith({ where: { usuarioId: 7 } });
    }
    const { data } = prisma.usuario.update.mock.calls[0][0];
    expect(data).toEqual(expect.objectContaining({ nombre: 'Usuario eliminado', passwordHash: null, googleId: null, activo: false, eliminadoEn: RELOJ, versionSesion: { increment: 1 } }));
    expect(data.correo).toMatch(/^eliminado-7-[a-f0-9]{12}@fitsearch\.invalid$/);
    expect(prisma.profesional.update).not.toHaveBeenCalled();
    expect(avisos.avisarCuentaEliminada).toHaveBeenCalledWith(1, { nombre: 'Ana Pérez', rol: 'usuario' });
    expect(avisos.avisarHoraLiberada).toHaveBeenCalledWith(9);
  });

  test('una cuenta profesional pierde su ficha y sus documentos, y avisa a sus pacientes', async () => {
    prisma.usuario.findUnique.mockResolvedValue(cuenta({ nombre: 'Matías Rojas', rol: { nombre: 'profesional' }, profesional: { id: 9 } }));
    prisma.reserva.findMany.mockResolvedValue([{ id: 4, usuarioId: 12, disponibilidad: bloque('2026-11-30', '10:00') }]);
    prisma.documentoProfesional.findMany.mockResolvedValue([{ clave: 'a.data' }]);
    await eliminar(7, { password: 'ClaveActual123' }, RELOJ);

    expect(prisma.reserva.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ canceladaPor: 'profesional' }) }));
    expect(prisma.disponibilidad.deleteMany).toHaveBeenCalledWith({ where: { profesionalId: 9, reservas: { none: {} } } });
    expect(prisma.profesional.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 9 }, data: expect.objectContaining({ descripcion: null, direccion: null, telefono: null, verificado: false }) }));
    expect(prisma.usuario.update.mock.calls[0][0].data.nombre).toBe('Profesional eliminado');
    expect(documentos.eliminarArchivos).toHaveBeenCalledWith(['a.data']);
    expect(avisos.avisarCuentaEliminada).toHaveBeenCalledWith(4, { nombre: 'Matías Rojas', rol: 'profesional' });
    expect(avisos.avisarHoraLiberada).not.toHaveBeenCalled();
  });
});
