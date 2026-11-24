// Comprobación con MySQL real de «Mi cuenta» (SC-42): descargar mis datos y eliminar la cuenta de una persona y de un
// profesional. Crea cuentas temporales con perfil, salud, agua, favorito, citas (una pasada y una futura), reseña, chat y
// conversación con el asistente; descarga, elimina y revisa qué se borró, qué se anonimizó y qué se conservó. Los correos
// no salen (sin SMTP se muestran en la consola). Al terminar borra todo lo que creó. Uso: npm run test:mysql:cuenta
const path = require('node:path');
const assert = require('node:assert/strict');
const base = path.resolve(__dirname, '..');
require(path.join(base, 'node_modules/dotenv')).config({ path: path.join(base, '.env'), quiet: true });
process.env.SMTP_USUARIO = '';
process.env.SMTP_CONTRASENA = '';
const bcrypt = require(path.join(base, 'node_modules/bcryptjs'));
const request = require(path.join(base, 'node_modules/supertest'));
const db = require(path.join(base, 'src/models/prisma'));
const app = require(path.join(base, 'src/app'));
const miCuenta = require(path.join(base, 'src/services/miCuenta.service'));

const marca = Date.now();
const creados = [];
const comprobaciones = [];
const ok = (caso, condicion) => { assert.ok(condicion, caso); comprobaciones.push(caso); };
const igual = (caso, real, esperado) => { assert.deepEqual(real, esperado, caso); comprobaciones.push(caso); };
const esperar = (ms) => new Promise((listo) => { setTimeout(listo, ms); });
const dia = (desplazamiento) => new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + desplazamiento));
const hora = (h) => new Date(`1970-01-01T${h}:00Z`);
const CLAVE = `Qa-cuenta-${marca}`;

async function cuenta(nombre, rol) {
  const r = await db.rol.findUniqueOrThrow({ where: { nombre: rol } });
  const u = await db.usuario.create({ data: {
    nombre, correo: `qa.cuenta.${nombre.split(' ')[0].toLowerCase()}.${marca}@example.com`, passwordHash: bcrypt.hashSync(CLAVE, 4), rolId: r.id, rolConfirmado: true,
  } });
  creados.push(u.id);
  return u;
}

(async () => {
  try {
    // --- Datos de prueba
    const pro = await cuenta('Matías Prueba', 'profesional');
    const ficha = await db.profesional.create({ data: { usuarioId: pro.id, especialidad: 'Nutrición', descripcion: 'Ficha temporal', telefono: '+56 9 1111 2222', comuna: 'Santiago', direccion: 'Calle 123', modalidad: 'presencial' } });
    await db.documentoProfesional.create({ data: { profesionalId: ficha.id, tipo: 'titulo', nombre: 'titulo.pdf', clave: `00000000-0000-4000-8000-${String(marca).slice(-12).padStart(12, '0')}.data`, mime: 'application/pdf', tamano: 10 } });
    const pasada = await db.disponibilidad.create({ data: { profesionalId: ficha.id, fecha: dia(-3), horaInicio: hora('10:00'), horaFin: hora('11:00') } });
    const futura = await db.disponibilidad.create({ data: { profesionalId: ficha.id, fecha: dia(5), horaInicio: hora('10:00'), horaFin: hora('11:00') } });
    const futura2 = await db.disponibilidad.create({ data: { profesionalId: ficha.id, fecha: dia(6), horaInicio: hora('12:00'), horaFin: hora('13:00') } });
    await db.disponibilidad.create({ data: { profesionalId: ficha.id, fecha: dia(7), horaInicio: hora('09:00'), horaFin: hora('10:00') } });

    const ana = await cuenta('Ana Prueba', 'usuario');
    await db.perfilUsuario.create({ data: { usuarioId: ana.id, pesoKg: 70, alturaCm: 165, edad: 30, sexo: 'femenino' } });
    await db.informacionSalud.create({ data: { usuarioId: ana.id, condicionesMedicas: ['asma'], tomaMedicamentos: false, medicamentos: [], alergias: [] } });
    await db.datosCuenta.create({ data: { usuarioId: ana.id, telefono: '+56 9 3333 4444', biografia: 'Biografía temporal' } });
    await db.registroAgua.create({ data: { usuarioId: ana.id, fecha: dia(0), ml: 500 } });
    await db.registroPeso.create({ data: { usuarioId: ana.id, fecha: dia(0), pesoKg: 69.5 } });
    await db.favorito.create({ data: { usuarioId: ana.id, profesionalId: ficha.id } });
    const citaPasada = await db.reserva.create({ data: { usuarioId: ana.id, disponibilidadId: pasada.id, mensaje: 'Cita pasada de prueba', estado: 'confirmada' } });
    const citaFutura = await db.reserva.create({ data: { usuarioId: ana.id, disponibilidadId: futura.id, mensaje: 'Cita futura de prueba', estado: 'pendiente' } });
    await db.resena.create({ data: { usuarioId: ana.id, profesionalId: ficha.id, puntaje: 5, comentario: 'Muy buena atención', reservaId: citaPasada.id } });
    const chat = await db.chatCita.create({ data: { usuarioId: ana.id, profesionalId: ficha.id } });
    await db.mensajeCita.create({ data: { chatId: chat.id, autorId: ana.id, texto: 'Hola, tengo una consulta' } });
    await db.mensajeCita.create({ data: { chatId: chat.id, autorId: pro.id, texto: 'Hola Ana, dime' } });
    const conversacion = await db.conversacion.create({ data: { usuarioId: ana.id, titulo: 'Conversación temporal' } });
    await db.mensaje.create({ data: { conversacionId: conversacion.id, remitente: 'usuario', contenido: '¿Qué ceno hoy?' } });

    // --- Descargar mis datos (por la API, con sesión)
    const sesion = await request(app).post('/api/auth/login').send({ correo: ana.correo, password: CLAVE });
    igual('La cuenta de prueba inicia sesión', sesion.status, 200);
    const descarga = await request(app).get('/api/perfil/mis-datos').set('Authorization', `Bearer ${sesion.body.token}`);
    igual('Descargar mis datos responde 200', descarga.status, 200);
    ok('Se descarga como archivo JSON', /attachment; filename="fitsearch-mis-datos-/.test(descarga.headers['content-disposition']));
    const datos = descarga.body;
    igual('Trae el correo de la cuenta', datos.cuenta.correo, ana.correo);
    igual('Trae el perfil con números', datos.perfil.pesoKg, 70);
    igual('Trae la información de salud', datos.informacionDeSalud.condicionesMedicas, ['asma']);
    igual('Trae las dos citas con su profesional', datos.citas.map((c) => c.profesional.nombre), ['Matías Prueba', 'Matías Prueba']);
    igual('Trae el chat diciendo quién escribió', datos.chats[0].mensajes.map((m) => m.autor), ['Tú', 'Matías Prueba']);
    igual('Trae la reseña escrita', datos.resenasEscritas.map((r) => r.puntaje), [5]);
    igual('Trae los pesajes', datos.pesajes.map((p) => p.pesoKg), [69.5]);
    igual('Trae la conversación con el asistente', datos.asistente.conversaciones[0].mensajes[0].contenido, '¿Qué ceno hoy?');
    ok('No trae contraseñas ni identificadores internos', !/passwordHash|googleId|usuarioId|tokenHash/.test(JSON.stringify(datos)));

    // --- Eliminar la cuenta de la persona
    const fallida = await request(app).delete('/api/perfil/cuenta').set('Authorization', `Bearer ${sesion.body.token}`).send({ confirmacion: 'ELIMINAR', password: 'otra-clave' });
    igual('Con una contraseña incorrecta no se elimina', fallida.status, 400);
    const eliminada = await request(app).delete('/api/perfil/cuenta').set('Authorization', `Bearer ${sesion.body.token}`).send({ confirmacion: 'ELIMINAR', password: CLAVE });
    igual('Eliminar la cuenta responde 204', eliminada.status, 204);
    const despues = await db.usuario.findUnique({ where: { id: ana.id } });
    igual('La cuenta queda como «Usuario eliminado»', despues.nombre, 'Usuario eliminado');
    ok('El correo real desaparece', /^eliminado-\d+-[a-f0-9]{12}@fitsearch\.invalid$/.test(despues.correo));
    ok('Sin contraseña, inactiva y con fecha de eliminación', !despues.passwordHash && !despues.activo && despues.eliminadoEn instanceof Date);
    igual('La sesión abierta deja de servir', (await request(app).get('/api/perfil').set('Authorization', `Bearer ${sesion.body.token}`)).status, 401);
    igual('El correo anterior ya no inicia sesión', (await request(app).post('/api/auth/login').send({ correo: ana.correo, password: CLAVE })).status, 401);
    const quedan = await Promise.all([
      db.perfilUsuario.count({ where: { usuarioId: ana.id } }), db.informacionSalud.count({ where: { usuarioId: ana.id } }),
      db.datosCuenta.count({ where: { usuarioId: ana.id } }), db.registroAgua.count({ where: { usuarioId: ana.id } }),
      db.favorito.count({ where: { usuarioId: ana.id } }), db.chatCita.count({ where: { usuarioId: ana.id } }),
      db.conversacion.count({ where: { usuarioId: ana.id } }), db.registroPeso.count({ where: { usuarioId: ana.id } }),
    ]);
    igual('Se borran perfil, salud, contacto, agua, favoritos, chats, asistente y pesajes', quedan, [0, 0, 0, 0, 0, 0, 0, 0]);
    igual('La cita futura queda cancelada por la persona', await db.reserva.findUnique({ where: { id: citaFutura.id }, select: { estado: true, canceladaPor: true } }), { estado: 'cancelada', canceladaPor: 'usuario' });
    igual('La cita pasada se conserva', (await db.reserva.findUnique({ where: { id: citaPasada.id } })).estado, 'confirmada');
    igual('La reseña se conserva, ahora anónima', (await db.resena.findFirst({ where: { reservaId: citaPasada.id }, include: { usuario: { select: { nombre: true } } } })).usuario.nombre, 'Usuario eliminado');
    igual('Una segunda eliminación no encuentra la cuenta', await miCuenta.eliminar(ana.id, { password: CLAVE }).then(() => 0, (e) => e.estado), 401);
    ok('Un correo nuevo con el mismo nombre se puede registrar', (await request(app).post('/api/auth/registro').send({ nombre: 'Ana Prueba', correo: ana.correo, password: CLAVE })).status === 201);
    const nueva = await db.usuario.findUnique({ where: { correo: ana.correo } });
    creados.push(nueva.id);

    // --- Eliminar la cuenta del profesional: sus pacientes reciben la cancelación y la ficha desaparece
    const beto = await cuenta('Beto Prueba', 'usuario');
    const citaBeto = await db.reserva.create({ data: { usuarioId: beto.id, disponibilidadId: futura2.id, mensaje: 'Cita de Beto', estado: 'confirmada' } });
    igual('El profesional se elimina con su contraseña', await miCuenta.eliminar(pro.id, { password: CLAVE }), { citasCanceladas: 1 });
    igual('La cita del paciente queda cancelada por el profesional', await db.reserva.findUnique({ where: { id: citaBeto.id }, select: { estado: true, canceladaPor: true } }), { estado: 'cancelada', canceladaPor: 'profesional' });
    const fichaDespues = await db.profesional.findUnique({ where: { id: ficha.id }, include: { usuario: true, documentos: true } });
    igual('La cuenta queda como «Profesional eliminado»', fichaDespues.usuario.nombre, 'Profesional eliminado');
    ok('La ficha pierde contacto, ubicación y documentos', !fichaDespues.descripcion && !fichaDespues.telefono && !fichaDespues.direccion && fichaDespues.documentos.length === 0);
    igual('Los horarios sin reservas se borran y los con historial se conservan', await db.disponibilidad.count({ where: { profesionalId: ficha.id } }), 3);
    igual('La ficha ya no aparece en el directorio', await db.profesional.count({ where: { id: ficha.id, usuario: { activo: true } } }), 0);

    await esperar(800); // los avisos se envían en segundo plano
    console.log(JSON.stringify({ mysqlReal: true, correoSimulado: true, total: comprobaciones.length, comprobaciones }, null, 1));
  } finally {
    // Limpieza: las reservas impiden borrar horarios, así que se borran primero; luego las cuentas (en cascada).
    const fichas = await db.profesional.findMany({ where: { usuarioId: { in: creados } }, select: { id: true } });
    const ids = fichas.map((f) => f.id);
    await db.reserva.deleteMany({ where: { OR: [{ usuarioId: { in: creados } }, { disponibilidad: { profesionalId: { in: ids } } }] } });
    await db.usuario.deleteMany({ where: { id: { in: creados } } });
    await db.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
