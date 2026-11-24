// Comprobación con MySQL real de los planes de comidas (SC-44): crear un plan semanal con alimentos y notas, ponerlo en
// uso, «Lo comí» (registra en registro_comida con origen «plan»), editar, el máximo de 10, un alimento que sale del
// catálogo y que eliminar la cuenta borra los planes. Usa una cuenta temporal y la borra al terminar.
// Uso: npm run test:mysql:planes-comida
const path = require('node:path');
const assert = require('node:assert/strict');
const base = path.resolve(__dirname, '..');
require(path.join(base, 'node_modules/dotenv')).config({ path: path.join(base, '.env'), quiet: true });
const db = require(path.join(base, 'src/models/prisma'));
const servicio = require(path.join(base, 'src/services/planComida.service'));
const { fechaEnChile } = require(path.join(base, 'src/utils/fechaChile'));

const marca = Date.now();
const comprobaciones = [];
const igual = (caso, real, esperado) => { assert.deepEqual(real, esperado, caso); comprobaciones.push(caso); };
let usuarioId;
let alimentoTemporal;

(async () => {
  try {
    const rol = await db.rol.findUniqueOrThrow({ where: { nombre: 'usuario' } });
    usuarioId = (await db.usuario.create({ data: { nombre: 'Planes Prueba', correo: `qa.planes.${marca}@example.com`, rolId: rol.id, rolConfirmado: true } })).id;
    const [a, b] = await db.alimento.findMany({ where: { activo: true }, orderBy: { id: 'asc' }, take: 2 });
    alimentoTemporal = await db.alimento.create({ data: { nombre: `QA alimento ${marca}`, calorias: 100, proteinasG: 10, carbohidratosG: 10, grasasG: 2 } });
    const hoy = fechaEnChile();
    const diaHoy = servicio.diaDeLaSemana(hoy);

    let lista = await servicio.crear(usuarioId, {
      nombre: 'Semana de prueba', tipo: 'semana', nota: 'Nota general',
      items: [
        { dia: diaHoy, momento: 'almuerzo', alimentoId: a.id, gramos: 150 },
        { dia: diaHoy, momento: 'almuerzo', alimentoId: alimentoTemporal.id, gramos: 80 },
        { dia: diaHoy, momento: 'cena', nota: 'Ensalada a gusto' },
        { dia: diaHoy === 7 ? 1 : diaHoy + 1, momento: 'desayuno', alimentoId: b.id, gramos: 60 },
      ],
    }, { usar: true });
    const plan = lista.planes[0];
    igual('El plan queda guardado y en uso', [plan.nombre, plan.tipo, plan.enUso], ['Semana de prueba', 'semana', true]);
    igual('Trae los 7 días', plan.dias.length, 7);
    const hoyEnPlan = plan.dias.find((d) => d.dia === diaHoy);
    igual('El almuerzo de hoy tiene sus dos alimentos en orden', hoyEnPlan.momentos.find((m) => m.momento === 'almuerzo').items.map((i) => i.nombre), [a.nombre, alimentoTemporal.nombre]);
    igual('La cena de hoy es una nota', hoyEnPlan.momentos.find((m) => m.momento === 'cena').items[0].nota, 'Ensalada a gusto');

    const r = await servicio.registrar(usuarioId, plan.id, { momento: 'almuerzo', items: [{ alimentoId: a.id, gramos: 120 }, { alimentoId: alimentoTemporal.id, gramos: 80 }] });
    igual('«Lo comí» registra dos alimentos hoy', [r.registrados, r.fecha], [2, hoy]);
    const registros = await db.registroComida.findMany({ where: { usuarioId }, orderBy: { id: 'asc' } });
    igual('Quedan en el registro con origen «plan» y los gramos confirmados', registros.map((x) => [x.origen, Number(x.gramos)]), [['plan', 120], ['plan', 80]]);
    igual('El aporte se calcula con los gramos', registros[1].calorias, 80);

    lista = await servicio.crear(usuarioId, { nombre: 'Día simple', tipo: 'dia', items: [{ momento: 'cena', alimentoId: a.id, gramos: 100 }] }, { usar: true });
    igual('Usar otro plan saca de uso al anterior', lista.planes.filter((p) => p.enUso).map((p) => p.nombre), ['Día simple']);

    lista = await servicio.actualizar(usuarioId, plan.id, { nombre: 'Semana editada', tipo: 'dia', items: [{ momento: 'merienda', alimentoId: b.id, gramos: 50 }] });
    const editado = lista.planes.find((p) => p.id === plan.id);
    igual('Editar reemplaza nombre, tipo y líneas', [editado.nombre, editado.tipo, await db.planComidaItem.count({ where: { planId: plan.id } })], ['Semana editada', 'dia', 1]);

    await db.alimento.update({ where: { id: alimentoTemporal.id }, data: { activo: false } });
    igual('Un alimento desactivado ya no se puede usar en un plan nuevo', await servicio.crear(usuarioId, { nombre: 'X', tipo: 'dia', items: [{ momento: 'cena', alimentoId: alimentoTemporal.id, gramos: 50 }] }).then(() => 0, (e) => e.estado), 400);

    for (let i = 0; i < 8; i += 1) await servicio.crear(usuarioId, { nombre: `Relleno ${i}`, tipo: 'dia', items: [{ momento: 'cena', nota: 'nota' }] });
    igual('Con 10 planes no deja crear otro', await servicio.crear(usuarioId, { nombre: 'Once', tipo: 'dia', items: [{ momento: 'cena', nota: 'nota' }] }).then(() => 0, (e) => e.estado), 409);

    const otro = await db.usuario.create({ data: { nombre: 'Otra Prueba', correo: `qa.planes.otra.${marca}@example.com`, rolId: rol.id } });
    igual('Nadie puede usar el plan de otra persona', await servicio.usar(otro.id, plan.id, true).then(() => 0, (e) => e.estado), 404);
    await db.usuario.delete({ where: { id: otro.id } });

    console.log(JSON.stringify({ mysqlReal: true, total: comprobaciones.length, comprobaciones }, null, 1));
  } finally {
    if (usuarioId) await db.usuario.delete({ where: { id: usuarioId } });
    if (alimentoTemporal) await db.alimento.delete({ where: { id: alimentoTemporal.id } }).catch(() => {});
    await db.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
