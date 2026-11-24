// Progreso compartido con un profesional (SC-45; DAS, QS10 y D46). La persona elige, para cada profesional con el que tiene
// un chat, qué categorías puede ver: perfil, salud, comidas, peso y planes. El profesional solo mira lo permitido; cada
// permiso dado, cambiado o quitado y cada consulta quedan en un registro que solo ve la persona. La información de salud es
// un dato sensible (Ley 21.719): se comparte solo si la persona marca esa categoría de forma expresa.
const prisma = require('../models/prisma');
const comidaModelo = require('../models/comida.model');
const aguaModelo = require('../models/agua.model');
const pesosModelo = require('../models/registroPeso.model');
const planesModelo = require('../models/planAlimentacion.model');
const planAlimentacion = require('./planAlimentacion.service');
const planComida = require('./planComida.service');
const { fechaEnChile, sumarDias } = require('../utils/fechaChile');
const { CON_FOTO, fotoUrlDe } = require('../utils/fotos');
const { perfil: reglasPerfil, salud: reglasSalud } = require('../../../shared/reglas.json');
const ErrorHttp = require('../utils/ErrorHttp');

const CATEGORIAS = [
  { clave: 'perfil', titulo: 'Perfil y objetivos', incluye: 'Edad, sexo, estatura, peso, actividad física, objetivo, comidas al día y horas de sueño.' },
  { clave: 'salud', titulo: 'Información de salud', incluye: 'Condiciones médicas, medicamentos y alergias.', sensible: true },
  { clave: 'comidas', titulo: 'Comidas y agua', incluye: 'Lo que registras en Comidas y el agua de los últimos 7 días, frente a tu meta diaria.' },
  { clave: 'peso', titulo: 'Peso', incluye: 'Tus pesajes de los últimos 90 días y tu meta de peso.' },
  { clave: 'planes', titulo: 'Planes', incluye: 'Tu plan de macronutrientes y el plan de comidas que tienes en uso.' },
];
const CLAVES = CATEGORIAS.map((c) => c.clave);
const MINUTOS_ENTRE_CONSULTAS = 30;
const numero = (v) => (v === null || v === undefined ? null : Number(v));
const etiqueta = (lista, valor) => lista.find((o) => o.valor === valor)?.etiqueta ?? valor;
const permisosDe = (fila) => Object.fromEntries(CLAVES.map((c) => [c, Boolean(fila?.[c])]));
const elegidas = (permisos) => CLAVES.filter((c) => permisos[c]);

async function profesionalDe(usuarioId) {
  const p = await prisma.profesional.findUnique({ where: { usuarioId }, select: { id: true } });
  if (!p) throw new ErrorHttp(409, 'Completa tu ficha profesional para ver el progreso de tus clientes');
  return p.id;
}

// ---------------------------------------------------------------- La persona

async function listarDelUsuario(usuarioId) {
  const [chats, permisos, registro] = await Promise.all([
    prisma.chatCita.findMany({
      where: { usuarioId, profesional: { usuario: { activo: true } } },
      select: { profesional: { select: { id: true, especialidad: true, usuario: { select: { id: true, nombre: true, ...CON_FOTO } } } } },
    }),
    prisma.permisoCompartir.findMany({ where: { usuarioId } }),
    prisma.accesoCompartido.findMany({
      where: { usuarioId }, orderBy: [{ fecha: 'desc' }, { id: 'desc' }], take: 50,
      select: { id: true, accion: true, categorias: true, fecha: true, profesional: { select: { usuario: { select: { nombre: true } } } } },
    }),
  ]);
  const porProfesional = new Map(permisos.map((p) => [p.profesionalId, p]));
  return {
    categorias: CATEGORIAS,
    profesionales: chats.map(({ profesional: p }) => {
      const permiso = porProfesional.get(p.id);
      return {
        id: p.id, nombre: p.usuario.nombre, especialidad: p.especialidad, fotoUrl: fotoUrlDe(p.usuario),
        permisos: permisosDe(permiso), desde: permiso?.fechaOtorgado ?? null,
      };
    }).sort((a, b) => Number(Boolean(b.desde)) - Number(Boolean(a.desde)) || a.nombre.localeCompare(b.nombre, 'es')),
    registro: registro.map((r) => ({
      id: r.id, accion: r.accion, categorias: r.categorias ? r.categorias.split(',') : [], fecha: r.fecha, profesional: r.profesional.usuario.nombre,
    })),
  };
}

// Guardar sin ninguna categoría equivale a dejar de compartir.
async function guardar(usuarioId, profesionalId, valores) {
  const permisos = Object.fromEntries(CLAVES.map((c) => [c, valores?.[c] === true]));
  await prisma.$transaction(async (tx) => {
    const chat = await tx.chatCita.findFirst({ where: { usuarioId, profesionalId, profesional: { usuario: { activo: true } } }, select: { id: true } });
    if (!chat) throw new ErrorHttp(404, 'Solo puedes compartir tu progreso con profesionales con los que tienes un chat');
    const actual = await tx.permisoCompartir.findUnique({ where: { usuarioId_profesionalId: { usuarioId, profesionalId } } });
    const nuevas = elegidas(permisos);
    if (!nuevas.length) {
      if (!actual) return;
      await tx.permisoCompartir.delete({ where: { id: actual.id } });
      await tx.accesoCompartido.create({ data: { usuarioId, profesionalId, accion: 'revoco', categorias: null } });
      return;
    }
    if (actual && elegidas(permisosDe(actual)).join() === nuevas.join()) return;
    await tx.permisoCompartir.upsert({
      where: { usuarioId_profesionalId: { usuarioId, profesionalId } },
      create: { usuarioId, profesionalId, ...permisos },
      update: permisos,
    });
    await tx.accesoCompartido.create({ data: { usuarioId, profesionalId, accion: actual ? 'cambio' : 'otorgo', categorias: nuevas.join(',') } });
  });
  return listarDelUsuario(usuarioId);
}

const quitar = (usuarioId, profesionalId) => guardar(usuarioId, profesionalId, {});

// ---------------------------------------------------------------- El profesional

async function listarDelProfesional(usuarioIdProfesional) {
  const profesionalId = await profesionalDe(usuarioIdProfesional);
  const filas = await prisma.permisoCompartir.findMany({
    where: { profesionalId, usuario: { activo: true } },
    include: { usuario: { select: { id: true, nombre: true, ...CON_FOTO } } },
    orderBy: { fechaActualizacion: 'desc' },
  });
  return {
    clientes: filas.map((f) => ({
      id: f.usuario.id, nombre: f.usuario.nombre, fotoUrl: fotoUrlDe(f.usuario), categorias: elegidas(permisosDe(f)), desde: f.fechaOtorgado,
    })),
  };
}

async function seccionPerfil(usuarioId) {
  const perfil = await prisma.perfilUsuario.findUnique({ where: { usuarioId } });
  if (!perfil) return null;
  return {
    edad: perfil.edad, sexo: perfil.sexo, alturaCm: numero(perfil.alturaCm), pesoKg: numero(perfil.pesoKg),
    actividadFisica: perfil.actividadFisica ? etiqueta(reglasPerfil.actividadFisica, perfil.actividadFisica) : null,
    objetivo: perfil.objetivoPrincipal ? etiqueta(reglasPerfil.objetivoPrincipal, perfil.objetivoPrincipal) : null,
    comidasDia: perfil.comidasDia ?? null, horasSueno: perfil.horasSueno ?? null,
  };
}

async function seccionSalud(usuarioId) {
  const s = await prisma.informacionSalud.findUnique({ where: { usuarioId } });
  if (!s) return null;
  const etiquetas = (lista, valores) => (Array.isArray(valores) ? valores.map((v) => etiqueta(lista, v)) : []);
  return {
    condiciones: etiquetas(reglasSalud.condicionesMedicas, s.condicionesMedicas),
    tomaMedicamentos: s.tomaMedicamentos,
    medicamentos: etiquetas(reglasSalud.medicamentos, s.medicamentos),
    alergias: etiquetas(reglasSalud.alergias, s.alergias),
    actualizada: s.fechaActualizacion,
  };
}

async function seccionComidas(usuarioId, hoy) {
  const desde = sumarDias(hoy, -6);
  const [totales, objetivo, aguas] = await Promise.all([
    comidaModelo.totalesPorDia(usuarioId, desde, hoy),
    planAlimentacion.delDia(usuarioId, hoy),
    Promise.all(Array.from({ length: 7 }, (_, i) => sumarDias(desde, i)).map((f) => aguaModelo.delDia(usuarioId, f).then((filas) => [f, filas]))),
  ]);
  const porFecha = new Map(totales.map((t) => [t.fecha.toISOString().slice(0, 10), t._sum]));
  const agua = new Map(aguas.map(([f, filas]) => [f, (Array.isArray(filas) ? filas : filas?.registros ?? []).reduce((s, r) => s + (r.ml ?? 0), 0)]));
  return {
    metaCalorias: objetivo.kcal ?? null,
    dias: Array.from({ length: 7 }, (_, i) => {
      const fecha = sumarDias(desde, i);
      const t = porFecha.get(fecha) ?? {};
      return {
        fecha, calorias: t.calorias ?? 0, proteinasG: Math.round(numero(t.proteinasG) ?? 0), carbohidratosG: Math.round(numero(t.carbohidratosG) ?? 0),
        grasasG: Math.round(numero(t.grasasG) ?? 0), aguaMl: agua.get(fecha) ?? 0,
      };
    }),
  };
}

async function seccionPeso(usuarioId, hoy) {
  const [pesos, meta] = await Promise.all([pesosModelo.listar(usuarioId, sumarDias(hoy, -90)), planesModelo.metaPeso(usuarioId, hoy)]);
  return {
    pesos: pesos.map((p) => ({ fecha: p.fecha.toISOString().slice(0, 10), pesoKg: numero(p.pesoKg) })),
    meta: meta ? {
      objetivo: etiqueta(reglasPerfil.objetivoPrincipal, meta.objetivo), pesoInicialKg: numero(meta.pesoInicialKg), pesoObjetivoKg: numero(meta.pesoObjetivoKg),
      ritmoSemanalKg: numero(meta.ritmoSemanalKg), fechaInicio: meta.fechaInicio.toISOString().slice(0, 10),
    } : null,
  };
}

async function seccionPlanes(usuarioId, ahora) {
  const [macros, enUso] = await Promise.all([
    planAlimentacion.obtener(usuarioId, ahora),
    prisma.planComida.findFirst({ where: { usuarioId, enUso: true }, include: planComida.INCLUIR }),
  ]);
  return {
    macronutrientes: { tipo: macros.plan.tipo, nombre: macros.plan.nombre, kcal: macros.plan.kcal, porcentajes: macros.plan.porcentajes,
      proteinasG: macros.plan.proteinasG, carbohidratosG: macros.plan.carbohidratosG, grasasG: macros.plan.grasasG, meta: macros.meta.etiqueta },
    planComidas: enUso ? planComida.formatear(enUso) : null,
  };
}

const SECCIONES = { perfil: seccionPerfil, salud: seccionSalud, comidas: seccionComidas, peso: seccionPeso, planes: seccionPlanes };

// El progreso de una persona, solo con lo que permitió. Registra la consulta (una cada 30 minutos como máximo).
async function progreso(usuarioIdProfesional, clienteId, ahora = new Date()) {
  const profesionalId = await profesionalDe(usuarioIdProfesional);
  const permiso = await prisma.permisoCompartir.findFirst({
    where: { usuarioId: clienteId, profesionalId, usuario: { activo: true } },
    include: { usuario: { select: { id: true, nombre: true } } },
  });
  if (!permiso) throw new ErrorHttp(403, 'Esta persona no comparte su progreso contigo');
  const categorias = elegidas(permisosDe(permiso));
  const hoy = fechaEnChile(ahora);
  const secciones = {};
  for (const c of categorias) {
    secciones[c] = await SECCIONES[c](clienteId, c === 'planes' ? ahora : hoy);
  }
  const reciente = await prisma.accesoCompartido.findFirst({
    where: { usuarioId: clienteId, profesionalId, accion: 'consulto', fecha: { gte: new Date(ahora.getTime() - MINUTOS_ENTRE_CONSULTAS * 60000) } },
    select: { id: true },
  });
  if (!reciente) await prisma.accesoCompartido.create({ data: { usuarioId: clienteId, profesionalId, accion: 'consulto', categorias: categorias.join(','), fecha: ahora } });
  return { cliente: { id: permiso.usuario.id, nombre: permiso.usuario.nombre }, categorias: CATEGORIAS.filter((c) => categorias.includes(c.clave)), desde: permiso.fechaOtorgado, hoy, secciones };
}

module.exports = { CATEGORIAS, listarDelUsuario, guardar, quitar, listarDelProfesional, progreso };
