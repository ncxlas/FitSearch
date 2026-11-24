// Comprobación con MySQL real de los planes enviados por el chat (SC-46): el profesional envía un plan de comidas y uno de
// macronutrientes, la persona los ve en el chat y los guarda una sola vez en sus planes; nadie más puede enviar ni guardar.
// Cuentas temporales que se borran al terminar.
// Uso: npm run test:mysql:planes-chat
const path = require('node:path');
const assert = require('node:assert/strict');
const base = path.resolve(__dirname, '..');
require(path.join(base, 'node_modules/dotenv')).config({ path: path.join(base, '.env'), quiet: true });
process.env.SMTP_USUARIO = '';
process.env.SMTP_CONTRASENA = '';
const bcrypt = require(path.join(base, 'node_modules/bcryptjs'));
const db = require(path.join(base, 'src/models/prisma'));
const servicio = require(path.join(base, 'src/services/planesPorChat.service'));
const chat = require(path.join(base, 'src/services/chat.service'));
const planComida = require(path.join(base, 'src/services/planComida.service'));
const planAlimentacion = require(path.join(base, 'src/services/planAlimentacion.service'));

const marca = Date.now();
const creados = [];
const comprobaciones = [];
const igual = (caso, real, esperado) => { assert.deepEqual(real, esperado, caso); comprobaciones.push(caso); };
const estado = (promesa) => promesa.then(() => 200, (e) => e.estado);

async function cuenta(nombre, rol) {
  const r = await db.rol.findUniqueOrThrow({ where: { nombre: rol } });
  const u = await db.usuario.create({ data: { nombre, correo: `qa.planchat.${nombre.split(' ')[0].toLowerCase()}.${marca}@example.com`, passwordHash: bcrypt.hashSync(`Qa-${marca}`, 4), rolId: r.id, rolConfirmado: true } });
  creados.push(u.id);
  return { id: u.id, rol, nombre };
}

(async () => {
  try {
    const pro = await cuenta('Matías Prueba', 'profesional');
    const ficha = await db.profesional.create({ data: { usuarioId: pro.id, especialidad: 'Nutrición' } });
    const otro = await cuenta('Otra Prueba', 'profesional');
    await db.profesional.create({ data: { usuarioId: otro.id, especialidad: 'Kinesiología' } });
    const ana = await cuenta('Ana Prueba', 'usuario');
    const luis = await cuenta('Luis Prueba', 'usuario');
    await db.perfilUsuario.create({ data: { usuarioId: ana.id, pesoKg: 70, alturaCm: 165, edad: 30, sexo: 'femenino', actividadFisica: 'ligera', objetivoPrincipal: 'bajar_peso' } });
    const { id: chatId } = await db.chatCita.create({ data: { usuarioId: ana.id, profesionalId: ficha.id } });
    const [a1, a2] = await db.alimento.findMany({ where: { activo: true }, take: 2, orderBy: { id: 'asc' } });

    const semanal = {
      nombre: 'Semana de inicio', tipo: 'semana', nota: 'Toma agua entre comidas',
      items: [
        { dia: 1, momento: 'desayuno', alimentoId: a1.id, gramos: 150 },
        { dia: 1, momento: 'almuerzo', alimentoId: a2.id, gramos: 200, nota: 'Sin sal' },
        { dia: 3, momento: 'cena', nota: 'Ensalada a gusto' },
      ],
    };
    const enviado = await servicio.enviar(pro, chatId, { tipo: 'comidas', plan: semanal, texto: '' });
    igual('El profesional envía un plan de comidas semanal; llega como mensaje con su vista', [
      enviado.mensaje.adjunto.tipo, enviado.mensaje.adjunto.plan.nombre, enviado.mensaje.adjunto.plan.dias.length, enviado.mensaje.texto, enviado.mensaje.adjunto.guardadoEn,
    ], ['plan_comidas', 'Semana de inicio', 7, 'Te envié un plan de comidas: «Semana de inicio».', null]);
    const lunes = enviado.mensaje.adjunto.plan.dias.find((d) => d.dia === 1);
    igual('La vista trae el aporte de cada línea', lunes.momentos.find((m) => m.momento === 'desayuno').items[0].calorias > 0, true);
    igual('Sin mensaje del profesional, el texto se marca como automático', enviado.mensaje.adjunto.automatico, true);

    const macros = await servicio.enviar(pro, chatId, { tipo: 'macros', plan: { nombre: 'Alto en proteína', proteinas: 40, carbohidratos: 35, grasas: 25 }, texto: 'Prueba este reparto' });
    igual('Envía un plan de macronutrientes con su mensaje', [macros.mensaje.adjunto.tipo, macros.mensaje.adjunto.plan, macros.mensaje.texto, macros.mensaje.adjunto.automatico],
      ['plan_macros', { nombre: 'Alto en proteína', proteinas: 40, carbohidratos: 35, grasas: 25 }, 'Prueba este reparto', false]);
    igual('Un plan de macronutrientes que no suma 100 % se rechaza', await estado(servicio.enviar(pro, chatId, { tipo: 'macros', plan: { nombre: 'Malo', proteinas: 50, carbohidratos: 30, grasas: 30 } })), 400);
    igual('Un plan de comidas sin líneas se rechaza', await estado(servicio.enviar(pro, chatId, { tipo: 'comidas', plan: { nombre: 'Vacío', tipo: 'dia', items: [] } })), 400);
    igual('La persona no puede enviar planes', await estado(servicio.enviar(ana, chatId, { tipo: 'macros', plan: { nombre: 'X', proteinas: 30, carbohidratos: 40, grasas: 30 } })), 403);
    igual('Otro profesional no puede enviar a ese chat', await estado(servicio.enviar(otro, chatId, { tipo: 'macros', plan: { nombre: 'X', proteinas: 30, carbohidratos: 40, grasas: 30 } })), 404);

    const abierto = await chat.abrir(ana, chatId);
    igual('La persona ve los dos planes en el chat', abierto.mensajes.filter((m) => m.adjunto).map((m) => m.adjunto.tipo), ['plan_comidas', 'plan_macros']);

    igual('Otra persona no puede guardar el plan', await estado(servicio.guardar(luis, chatId, enviado.mensaje.id)), 404);
    igual('El profesional no puede guardarlo', await estado(servicio.guardar(pro, chatId, enviado.mensaje.id)), 403);
    const guardado = await servicio.guardar(ana, chatId, enviado.mensaje.id);
    igual('Guardar el plan de comidas lo marca como guardado y lleva a Plan de comidas', [Boolean(guardado.mensaje.adjunto.guardadoEn), guardado.destino], [true, 'planes-comida']);
    const lista = await planComida.listar(ana.id);
    igual('El plan queda en sus planes de comidas como enviado por el profesional', lista.planes.map((p) => [p.nombre, p.origen, p.profesional?.nombre, p.dias.length]),
      [['Semana de inicio', 'profesional', 'Matías Prueba', 7]]);
    igual('Guardarlo de nuevo responde 409 y no duplica', [await estado(servicio.guardar(ana, chatId, enviado.mensaje.id)), (await planComida.listar(ana.id)).planes.length], [409, 1]);

    // Dos pulsaciones a la vez: solo una guarda.
    const doble = await Promise.all([servicio.guardar(ana, chatId, macros.mensaje.id), servicio.guardar(ana, chatId, macros.mensaje.id)].map((p) => p.then(() => 201, (e) => e.estado)));
    const personalizados = (await planAlimentacion.obtener(ana.id)).personalizados;
    igual('Dos guardados simultáneos del plan de macronutrientes crean uno solo', [doble.sort(), personalizados.map((p) => [p.nombre, p.porcentajes])],
      [[201, 409], [['Alto en proteína', { proteinas: 40, carbohidratos: 35, grasas: 25 }]]]);

    const repetido = await servicio.enviar(pro, chatId, { tipo: 'macros', plan: { nombre: 'Alto en proteína', proteinas: 35, carbohidratos: 40, grasas: 25 } });
    await servicio.guardar(ana, chatId, repetido.mensaje.id);
    igual('Con un nombre que ya tiene, lo guarda como «Nombre (2)»', (await planAlimentacion.obtener(ana.id)).personalizados.map((p) => p.nombre).sort(), ['Alto en proteína', 'Alto en proteína (2)']);

    // Si guardar falla (por ejemplo, ya tiene 10 planes de comidas), el plan queda disponible para guardarlo después.
    for (let n = 1; n <= 9; n += 1) await planComida.crear(ana.id, { nombre: `Propio ${n}`, tipo: 'dia', items: [{ momento: 'cena', nota: 'Algo liviano' }] });
    const otroPlan = await servicio.enviar(pro, chatId, { tipo: 'comidas', plan: { nombre: 'Día extra', tipo: 'dia', items: [{ momento: 'desayuno', alimentoId: a1.id, gramos: 100 }] } });
    igual('Con 10 planes de comidas no se guarda (409)', await estado(servicio.guardar(ana, chatId, otroPlan.mensaje.id)), 409);
    const sigue = await db.mensajeCita.findUnique({ where: { id: otroPlan.mensaje.id }, select: { guardadoEn: true } });
    igual('El plan que no se pudo guardar sigue disponible', sigue.guardadoEn, null);

    console.log(JSON.stringify({ mysqlReal: true, total: comprobaciones.length, comprobaciones }, null, 1));
  } finally {
    await db.usuario.deleteMany({ where: { id: { in: creados } } });
    await db.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
