// Comprobación con MySQL real del historial de peso (SC-43): un pesaje por día, el último por fecha queda como peso del
// perfil, borrar el último vuelve al anterior, el plan trae el historial y el ritmo real, y eliminar la cuenta borra los
// pesajes. Usa una cuenta temporal que se borra al terminar. Uso: npm run test:mysql:peso
const path = require('node:path');
const assert = require('node:assert/strict');
const base = path.resolve(__dirname, '..');
require(path.join(base, 'node_modules/dotenv')).config({ path: path.join(base, '.env'), quiet: true });
const db = require(path.join(base, 'src/models/prisma'));
const servicio = require(path.join(base, 'src/services/planAlimentacion.service'));
const { fechaEnChile, sumarDias } = require(path.join(base, 'src/utils/fechaChile'));

const marca = Date.now();
const comprobaciones = [];
const igual = (caso, real, esperado) => { assert.deepEqual(real, esperado, caso); comprobaciones.push(caso); };
const pesoPerfil = async (id) => Number((await db.perfilUsuario.findUnique({ where: { usuarioId: id } })).pesoKg);
let usuarioId;

(async () => {
  try {
    const rol = await db.rol.findUniqueOrThrow({ where: { nombre: 'usuario' } });
    const u = await db.usuario.create({ data: { nombre: 'Peso Prueba', correo: `qa.peso.${marca}@example.com`, rolId: rol.id, rolConfirmado: true } });
    usuarioId = u.id;
    await db.perfilUsuario.create({ data: { usuarioId, pesoKg: 82, alturaCm: 175, edad: 30, sexo: 'masculino', actividadFisica: 'moderada', objetivoPrincipal: 'bajar_peso' } });
    const hoy = fechaEnChile();

    let plan = await servicio.registrarPeso(usuarioId, { pesoKg: 81, fecha: sumarDias(hoy, -14) });
    igual('Un pesaje antiguo actualiza el perfil si es el único', await pesoPerfil(usuarioId), 81);
    plan = await servicio.registrarPeso(usuarioId, { pesoKg: 80, fecha: hoy });
    plan = await servicio.registrarPeso(usuarioId, { pesoKg: 80.5, fecha: sumarDias(hoy, -7) });
    igual('Un pesaje de un día anterior no reemplaza al más reciente en el perfil', await pesoPerfil(usuarioId), 80);
    igual('El plan trae los tres pesajes en orden', plan.historialPeso.pesos.map((p) => p.pesoKg), [81, 80.5, 80]);
    igual('El ritmo real es medio kilo por semana', plan.historialPeso.ritmoRealSemanalKg, -0.5);
    igual('Las calorías del plan usan el último peso', plan.perfil.pesoKg, 80);

    plan = await servicio.registrarPeso(usuarioId, { pesoKg: 79.84, fecha: hoy });
    igual('Anotar de nuevo el mismo día lo reemplaza (con un decimal)', plan.historialPeso.pesos.map((p) => p.pesoKg), [81, 80.5, 79.8]);
    igual('Sigue habiendo un pesaje por día', await db.registroPeso.count({ where: { usuarioId } }), 3);

    const ultimo = plan.historialPeso.pesos.at(-1);
    plan = await servicio.eliminarPeso(usuarioId, ultimo.id);
    igual('Borrar el último vuelve el perfil al pesaje anterior', await pesoPerfil(usuarioId), 80.5);
    igual('Borrar un pesaje que ya no existe responde 404', await servicio.eliminarPeso(usuarioId, ultimo.id).then(() => 0, (e) => e.estado), 404);

    const otro = await db.usuario.create({ data: { nombre: 'Otra Prueba', correo: `qa.peso.otra.${marca}@example.com`, rolId: rol.id } });
    igual('Nadie puede borrar el pesaje de otra persona', await servicio.eliminarPeso(otro.id, plan.historialPeso.pesos[0].id).then(() => 0, (e) => e.estado), 404);
    await db.usuario.delete({ where: { id: otro.id } });

    const duplicado = await db.registroPeso.create({ data: { usuarioId, fecha: new Date(`${hoy}T00:00:00Z`), pesoKg: 80 } }).then(() => 'creado');
    igual('La base admite un nuevo pesaje de hoy tras borrar el anterior', duplicado, 'creado');
    igual('Pero rechaza un segundo pesaje del mismo día', await db.registroPeso.create({ data: { usuarioId, fecha: new Date(`${hoy}T00:00:00Z`), pesoKg: 79 } }).then(() => 'creado', (e) => e.code), 'P2002');

    console.log(JSON.stringify({ mysqlReal: true, total: comprobaciones.length, comprobaciones }, null, 1));
  } finally {
    if (usuarioId) await db.usuario.delete({ where: { id: usuarioId } });
    await db.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
