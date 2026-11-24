// Planes de comidas (SC-44; DAS, D45): qué comer cada día y en cada momento, con alimentos del catálogo y sus gramos, más
// notas libres. Un plan es de un día (el mismo todos los días) o de una semana (lunes a domingo). Hasta 10 por persona y
// uno en uso: el Resumen muestra «Hoy te toca…» y «Lo comí» lo registra en el día, con los gramos que la persona ajuste.
// normalizarPlan también valida los planes que un profesional envía por el chat (SC-46).
const prisma = require('../models/prisma');
const comidaModelo = require('../models/comida.model');
const { comidas: reglas } = require('../../../shared/reglas.json');
const { fechaEnChile } = require('../utils/fechaChile');
const ErrorHttp = require('../utils/ErrorHttp');

const MAX_PLANES = 10;
const MAX_ITEMS = 200;
const MAX_POR_MOMENTO = 12;
const TIPOS = { dia: [0], semana: [1, 2, 3, 4, 5, 6, 7] };
const NOMBRES_DIA = ['Todos los días', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MOMENTOS = reglas.momentos.map(({ valor }) => valor);
const ETIQUETAS = Object.fromEntries(reglas.momentos.map(({ valor, etiqueta }) => [valor, etiqueta]));
const { min: GRAMOS_MIN, max: GRAMOS_MAX } = reglas.gramos;
const redondear = (v) => Math.round(v * 10) / 10;

// Día de la semana de una fecha AAAA-MM-DD: 1 = lunes … 7 = domingo.
const diaDeLaSemana = (fecha) => ((new Date(`${fecha}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;

function aporte(alimento, gramos) {
  if (!alimento || gramos === null) return { calorias: null, proteinasG: null, carbohidratosG: null, grasasG: null };
  const f = gramos / 100;
  return {
    calorias: Math.round(Number(alimento.calorias) * f), proteinasG: redondear(Number(alimento.proteinasG) * f),
    carbohidratosG: redondear(Number(alimento.carbohidratosG) * f), grasasG: redondear(Number(alimento.grasasG) * f),
  };
}

function sumar(lista) {
  const total = { calorias: 0, proteinasG: 0, carbohidratosG: 0, grasasG: 0 };
  for (const i of lista) for (const k of Object.keys(total)) total[k] += i[k] ?? 0;
  for (const k of ['proteinasG', 'carbohidratosG', 'grasasG']) total[k] = redondear(total[k]);
  return total;
}

// Valida y ordena un plan escrito por la persona o por un profesional. Devuelve los datos listos para guardar, con el
// nombre de cada alimento copiado del catálogo. Junta todos los errores en `detalles`.
async function normalizarPlan(datos, db = prisma) {
  const errores = {};
  const nombre = typeof datos?.nombre === 'string' ? datos.nombre.trim().replace(/\s+/g, ' ') : '';
  if (!nombre || nombre.length > 80) errores.nombre = 'Ponle un nombre de hasta 80 caracteres';
  const tipo = datos?.tipo;
  if (!TIPOS[tipo]) errores.tipo = 'Elige si el plan es para un día o para una semana';
  const nota = typeof datos?.nota === 'string' && datos.nota.trim() ? datos.nota.trim() : null;
  if (nota && nota.length > 300) errores.nota = 'La nota puede tener hasta 300 caracteres';
  const items = Array.isArray(datos?.items) ? datos.items : [];
  if (!items.length) errores.items = 'Agrega al menos un alimento o una nota';
  if (items.length > MAX_ITEMS) errores.items = `Un plan puede tener hasta ${MAX_ITEMS} líneas`;
  if (Object.keys(errores).length) throw new ErrorHttp(400, 'Revisa el plan de comidas', errores);

  const limpios = [];
  const porMomento = new Map();
  items.forEach((item, i) => {
    const dia = Number(item?.dia ?? (tipo === 'dia' ? 0 : NaN));
    const { momento } = item ?? {};
    const alimentoId = item?.alimentoId === undefined || item?.alimentoId === null || item?.alimentoId === '' ? null : Number(item.alimentoId);
    const gramos = item?.gramos === undefined || item?.gramos === null || item?.gramos === '' ? null : Number(item.gramos);
    const notaItem = typeof item?.nota === 'string' && item.nota.trim() ? item.nota.trim() : null;
    let error = null;
    if (!TIPOS[tipo].includes(dia)) error = 'El día no corresponde al tipo de plan';
    else if (!MOMENTOS.includes(momento)) error = 'Elige el momento del día';
    else if (alimentoId !== null && (!Number.isInteger(alimentoId) || alimentoId < 1)) error = 'Elige un alimento del catálogo';
    else if (alimentoId !== null && !(Number.isFinite(gramos) && gramos >= GRAMOS_MIN && gramos <= GRAMOS_MAX)) error = `Indica entre ${GRAMOS_MIN} y ${GRAMOS_MAX} gramos`;
    else if (alimentoId === null && !notaItem) error = 'Escribe la nota o elige un alimento';
    else if (notaItem && notaItem.length > 200) error = 'La nota puede tener hasta 200 caracteres';
    if (error) { errores[`items[${i}]`] = error; return; }
    const clave = `${dia}-${momento}`;
    const orden = porMomento.get(clave) ?? 0;
    if (orden >= MAX_POR_MOMENTO) { errores[`items[${i}]`] = `Cada comida puede tener hasta ${MAX_POR_MOMENTO} líneas`; return; }
    porMomento.set(clave, orden + 1);
    limpios.push({ dia, momento, orden, alimentoId, gramos: alimentoId === null ? null : redondear(gramos), nota: notaItem });
  });
  if (Object.keys(errores).length) throw new ErrorHttp(400, 'Revisa las comidas del plan', errores);

  const ids = [...new Set(limpios.filter((l) => l.alimentoId !== null).map((l) => l.alimentoId))];
  const alimentos = ids.length ? await db.alimento.findMany({ where: { id: { in: ids }, activo: true }, select: { id: true, nombre: true } }) : [];
  const nombres = new Map(alimentos.map((a) => [a.id, a.nombre]));
  const faltan = ids.filter((id) => !nombres.has(id));
  if (faltan.length) throw new ErrorHttp(400, 'Algún alimento ya no está en el catálogo; elige otro', { items: `Alimentos no disponibles: ${faltan.join(', ')}` });
  return { nombre, tipo, nota, items: limpios.map((l) => ({ ...l, nombreAlimento: l.alimentoId === null ? null : nombres.get(l.alimentoId) })) };
}

const INCLUIR = {
  items: { orderBy: [{ dia: 'asc' }, { momento: 'asc' }, { orden: 'asc' }], include: { alimento: true } },
  profesional: { select: { id: true, especialidad: true, usuario: { select: { nombre: true } } } },
};

// Forma pública de un plan: sus días con cada momento (en el orden del día), las líneas con su aporte y los totales.
function formatear(plan) {
  const dias = TIPOS[plan.tipo].map((dia) => {
    const momentos = MOMENTOS.map((momento) => {
      const items = plan.items.filter((i) => i.dia === dia && i.momento === momento).map((i) => ({
        id: i.id, alimentoId: i.alimentoId, nombre: i.alimento?.nombre ?? i.nombreAlimento, gramos: i.gramos === null ? null : Number(i.gramos),
        nota: i.nota, ...aporte(i.alimento, i.gramos === null ? null : Number(i.gramos)),
      }));
      return { momento, etiqueta: ETIQUETAS[momento], items, totales: sumar(items) };
    });
    return { dia, nombre: NOMBRES_DIA[dia], momentos, totales: sumar(momentos.map((m) => m.totales)) };
  });
  const conComida = dias.filter((d) => d.totales.calorias > 0);
  return {
    id: plan.id, nombre: plan.nombre, tipo: plan.tipo, nota: plan.nota, origen: plan.origen, enUso: plan.enUso,
    profesional: plan.profesional ? { id: plan.profesional.id, nombre: plan.profesional.usuario.nombre, especialidad: plan.profesional.especialidad } : null,
    fechaCreacion: plan.fechaCreacion, dias,
    caloriasPromedio: conComida.length ? Math.round(conComida.reduce((s, d) => s + d.totales.calorias, 0) / conComida.length) : 0,
  };
}

async function listar(usuarioId, ahora = new Date()) {
  const planes = await prisma.planComida.findMany({ where: { usuarioId }, include: INCLUIR, orderBy: [{ enUso: 'desc' }, { fechaActualizacion: 'desc' }, { id: 'desc' }] });
  const hoy = fechaEnChile(ahora);
  return { planes: planes.map(formatear), max: MAX_PLANES, hoy, diaDeHoy: diaDeLaSemana(hoy) };
}

async function propio(tx, usuarioId, id) {
  const plan = await tx.planComida.findFirst({ where: { id, usuarioId }, select: { id: true } });
  if (!plan) throw new ErrorHttp(404, 'No encontramos ese plan de comidas');
  return plan;
}

// Crea un plan (propio o guardado desde un profesional). Con `usar`, queda en uso y los demás dejan de estarlo.
async function crear(usuarioId, datos, { origen = 'propio', profesionalId = null, usar = false } = {}, ahora = new Date()) {
  const plan = await normalizarPlan(datos);
  await prisma.$transaction(async (tx) => {
    // Serializa las creaciones de la misma persona para respetar el máximo.
    await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${usuarioId} FOR UPDATE`;
    if (await tx.planComida.count({ where: { usuarioId } }) >= MAX_PLANES) {
      throw new ErrorHttp(409, `Puedes guardar hasta ${MAX_PLANES} planes de comidas; elimina uno para agregar otro`);
    }
    if (usar) await tx.planComida.updateMany({ where: { usuarioId, enUso: true }, data: { enUso: false } });
    await tx.planComida.create({
      data: {
        usuarioId, nombre: plan.nombre, tipo: plan.tipo, nota: plan.nota, origen, profesionalId, enUso: Boolean(usar),
        items: { create: plan.items },
      },
    });
  });
  return listar(usuarioId, ahora);
}

async function actualizar(usuarioId, id, datos, ahora = new Date()) {
  const plan = await normalizarPlan(datos);
  await prisma.$transaction(async (tx) => {
    await propio(tx, usuarioId, id);
    await tx.planComidaItem.deleteMany({ where: { planId: id } });
    await tx.planComida.update({ where: { id }, data: { nombre: plan.nombre, tipo: plan.tipo, nota: plan.nota, items: { create: plan.items } } });
  });
  return listar(usuarioId, ahora);
}

async function eliminar(usuarioId, id, ahora = new Date()) {
  const { count } = await prisma.planComida.deleteMany({ where: { id, usuarioId } });
  if (!count) throw new ErrorHttp(404, 'No encontramos ese plan de comidas');
  return listar(usuarioId, ahora);
}

async function usar(usuarioId, id, enUso, ahora = new Date()) {
  await prisma.$transaction(async (tx) => {
    await propio(tx, usuarioId, id);
    if (enUso) await tx.planComida.updateMany({ where: { usuarioId, enUso: true, NOT: { id } }, data: { enUso: false } });
    await tx.planComida.update({ where: { id }, data: { enUso } });
  });
  return listar(usuarioId, ahora);
}

// «Lo comí»: registra en el día los alimentos de un momento del plan, con los gramos que la persona confirmó. Las notas no
// se registran. Todo o nada.
async function registrar(usuarioId, id, { fecha, momento, items }, ahora = new Date()) {
  const dia = fecha ?? fechaEnChile(ahora);
  if (dia > fechaEnChile(ahora)) throw new ErrorHttp(400, 'No puedes registrar comidas en días que aún no llegan');
  if (!MOMENTOS.includes(momento)) throw new ErrorHttp(400, 'Elige el momento del día', { momento: 'Elige el momento del día' });
  const lista = (Array.isArray(items) ? items : []).map((i) => ({ alimentoId: Number(i?.alimentoId), gramos: Number(i?.gramos) }));
  if (!lista.length || lista.length > MAX_POR_MOMENTO) throw new ErrorHttp(400, 'Elige qué alimentos del plan comiste', { items: 'Elige al menos un alimento' });
  if (lista.some((i) => !Number.isInteger(i.alimentoId) || !(i.gramos >= GRAMOS_MIN && i.gramos <= GRAMOS_MAX))) {
    throw new ErrorHttp(400, `Indica entre ${GRAMOS_MIN} y ${GRAMOS_MAX} gramos para cada alimento`, { items: 'Revisa los gramos' });
  }
  const registrados = await prisma.$transaction(async (tx) => {
    await propio(tx, usuarioId, id);
    const alimentos = await tx.alimento.findMany({ where: { id: { in: lista.map((i) => i.alimentoId) }, activo: true } });
    const porId = new Map(alimentos.map((a) => [a.id, a]));
    if (lista.some((i) => !porId.has(i.alimentoId))) throw new ErrorHttp(400, 'Algún alimento ya no está en el catálogo');
    for (const i of lista) {
      const alimento = porId.get(i.alimentoId);
      await comidaModelo.crear({
        usuarioId, fecha: dia, momento, alimentoId: alimento.id, descripcionAlimento: alimento.nombre, gramos: redondear(i.gramos),
        origen: 'plan', ...aporte(alimento, redondear(i.gramos)),
      }, tx);
    }
    return lista.length;
  });
  return { registrados, fecha: dia, momento };
}

module.exports = { normalizarPlan, formatear, listar, crear, actualizar, eliminar, usar, registrar, diaDeLaSemana, MAX_PLANES, INCLUIR };
