// Comprobación con MySQL real del progreso compartido (SC-45): la persona comparte categorías con un profesional con el
// que tiene un chat, el profesional ve solo eso, cada consulta queda registrada (una cada 30 minutos), cambiar y quitar el
// permiso funcionan y eliminar la cuenta borra los permisos y el registro. Cuentas temporales que se borran al terminar.
// Uso: npm run test:mysql:compartir
const path = require('node:path');
const assert = require('node:assert/strict');
const base = path.resolve(__dirname, '..');
require(path.join(base, 'node_modules/dotenv')).config({ path: path.join(base, '.env'), quiet: true });
process.env.SMTP_USUARIO = '';
process.env.SMTP_CONTRASENA = '';
const bcrypt = require(path.join(base, 'node_modules/bcryptjs'));
const db = require(path.join(base, 'src/models/prisma'));
const servicio = require(path.join(base, 'src/services/compartir.service'));
const miCuenta = require(path.join(base, 'src/services/miCuenta.service'));
const { fechaEnChile } = require(path.join(base, 'src/utils/fechaChile'));

const marca = Date.now();
const creados = [];
const comprobaciones = [];
const igual = (caso, real, esperado) => { assert.deepEqual(real, esperado, caso); comprobaciones.push(caso); };
const estado = (promesa) => promesa.then(() => 200, (e) => e.estado);
const CLAVE = `Qa-compartir-${marca}`;

async function cuenta(nombre, rol) {
  const r = await db.rol.findUniqueOrThrow({ where: { nombre: rol } });
  const u = await db.usuario.create({ data: { nombre, correo: `qa.compartir.${nombre.split(' ')[0].toLowerCase()}.${marca}@example.com`, passwordHash: bcrypt.hashSync(CLAVE, 4), rolId: r.id, rolConfirmado: true } });
  creados.push(u.id);
  return u;
}

(async () => {
  try {
    const pro = await cuenta('Matías Prueba', 'profesional');
    const ficha = await db.profesional.create({ data: { usuarioId: pro.id, especialidad: 'Nutrición' } });
    const otro = await cuenta('Otra Prueba', 'profesional');
    const fichaOtra = await db.profesional.create({ data: { usuarioId: otro.id, especialidad: 'Kinesiología' } });
    const ana = await cuenta('Ana Prueba', 'usuario');
    const hoy = fechaEnChile();
    await db.perfilUsuario.create({ data: { usuarioId: ana.id, pesoKg: 70, alturaCm: 165, edad: 30, sexo: 'femenino', actividadFisica: 'ligera', objetivoPrincipal: 'bajar_peso' } });
    await db.informacionSalud.create({ data: { usuarioId: ana.id, condicionesMedicas: ['diabetes'], tomaMedicamentos: false, medicamentos: [], alergias: ['alimentarias'] } });
    await db.registroAgua.create({ data: { usuarioId: ana.id, fecha: new Date(`${hoy}T00:00:00Z`), ml: 750 } });
    await db.registroPeso.create({ data: { usuarioId: ana.id, fecha: new Date(`${hoy}T00:00:00Z`), pesoKg: 70 } });
    const alimento = await db.alimento.findFirstOrThrow({ where: { activo: true } });
    await db.registroComida.create({ data: { usuarioId: ana.id, fecha: new Date(`${hoy}T00:00:00Z`), momento: 'almuerzo', alimentoId: alimento.id, descripcionAlimento: alimento.nombre, gramos: 100, calorias: 300, proteinasG: 20, carbohidratosG: 30, grasasG: 10 } });
    await db.chatCita.create({ data: { usuarioId: ana.id, profesionalId: ficha.id } });

    let lista = await servicio.listarDelUsuario(ana.id);
    igual('La persona ve solo a los profesionales con los que tiene chat', lista.profesionales.map((p) => p.nombre), ['Matías Prueba']);
    igual('Al principio no comparte nada', Object.values(lista.profesionales[0].permisos).some(Boolean), false);
    igual('No puede compartir con un profesional sin chat', await estado(servicio.guardar(ana.id, fichaOtra.id, { comidas: true })), 404);

    lista = await servicio.guardar(ana.id, ficha.id, { comidas: true, peso: true });
    igual('Comparte comidas y peso', lista.profesionales[0].permisos, { perfil: false, salud: false, comidas: true, peso: true, planes: false });
    igual('Queda registrado como permiso otorgado', [lista.registro[0].accion, lista.registro[0].categorias], ['otorgo', ['comidas', 'peso']]);
    igual('El profesional ve a la persona con sus categorías', (await servicio.listarDelProfesional(pro.id)).clientes.map((c) => [c.nombre, c.categorias]), [['Ana Prueba', ['comidas', 'peso']]]);

    let vista = await servicio.progreso(pro.id, ana.id);
    igual('El profesional recibe solo comidas y peso', Object.keys(vista.secciones), ['comidas', 'peso']);
    igual('Comidas trae los 7 días con las calorías y el agua de hoy', [vista.secciones.comidas.dias.length, vista.secciones.comidas.dias.at(-1).calorias, vista.secciones.comidas.dias.at(-1).aguaMl], [7, 300, 750]);
    igual('Peso trae el pesaje de hoy', vista.secciones.peso.pesos.map((p) => p.pesoKg), [70]);
    await servicio.progreso(pro.id, ana.id);
    igual('Dos consultas seguidas se registran una sola vez', await db.accesoCompartido.count({ where: { usuarioId: ana.id, accion: 'consulto' } }), 1);
    igual('Otro profesional sin permiso recibe 403', await estado(servicio.progreso(otro.id, ana.id)), 403);

    await servicio.guardar(ana.id, ficha.id, { comidas: true, peso: true, salud: true });
    vista = await servicio.progreso(pro.id, ana.id);
    igual('Al sumar salud, el profesional la ve con sus nombres', [vista.secciones.salud.condiciones, vista.secciones.salud.alergias], [['Diabetes'], ['Alimentarias']]);
    igual('El cambio queda registrado', (await db.accesoCompartido.findFirst({ where: { usuarioId: ana.id, accion: 'cambio' } })).categorias, 'salud,comidas,peso');

    await servicio.guardar(ana.id, ficha.id, { perfil: true, salud: true, comidas: true, peso: true, planes: true });
    vista = await servicio.progreso(pro.id, ana.id, new Date(Date.now() + 31 * 60000));
    igual('Con las cinco categorías ve perfil, salud, comidas, peso y planes', Object.keys(vista.secciones), ['perfil', 'salud', 'comidas', 'peso', 'planes']);
    igual('El perfil trae el objetivo y el sexo con su nombre', [vista.secciones.perfil.objetivo, vista.secciones.perfil.sexo, vista.secciones.perfil.pesoKg], ['Bajar de peso', 'Femenino', 70]);
    igual('Los planes traen el plan de macronutrientes con sus calorías', typeof vista.secciones.planes.macronutrientes.kcal, 'number');
    igual('Pasados 30 minutos, la consulta se registra de nuevo', await db.accesoCompartido.count({ where: { usuarioId: ana.id, accion: 'consulto' } }), 2);

    lista = await servicio.quitar(ana.id, ficha.id);
    igual('Dejar de compartir quita el permiso y lo registra', [Object.values(lista.profesionales[0].permisos).some(Boolean), lista.registro.some((r) => r.accion === 'revoco')], [false, true]);
    igual('Sin permiso, el profesional recibe 403', await estado(servicio.progreso(pro.id, ana.id)), 403);

    await servicio.guardar(ana.id, ficha.id, { perfil: true });
    await miCuenta.eliminar(ana.id, { password: CLAVE });
    igual('Eliminar la cuenta borra los permisos y el registro', [await db.permisoCompartir.count({ where: { usuarioId: ana.id } }), await db.accesoCompartido.count({ where: { usuarioId: ana.id } })], [0, 0]);

    console.log(JSON.stringify({ mysqlReal: true, total: comprobaciones.length, comprobaciones }, null, 1));
  } finally {
    const fichas = await db.profesional.findMany({ where: { usuarioId: { in: creados } }, select: { id: true } });
    await db.reserva.deleteMany({ where: { OR: [{ usuarioId: { in: creados } }, { disponibilidad: { profesionalId: { in: fichas.map((f) => f.id) } } }] } });
    await db.usuario.deleteMany({ where: { id: { in: creados } } });
    await db.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
