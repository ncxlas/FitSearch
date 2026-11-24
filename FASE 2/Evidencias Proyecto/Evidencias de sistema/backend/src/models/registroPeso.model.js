// Historial de peso (SC-43): un pesaje por usuario y día. Al guardar o borrar un pesaje, el más reciente pasa a ser el
// peso del perfil (perfiles_usuario.peso_kg), en la misma transacción, para que el plan de macronutrientes y la meta de
// peso usen siempre el último peso anotado.
const prisma = require('./prisma');

const dia = (fecha) => new Date(`${fecha}T00:00:00Z`);
const SELECCION = { id: true, fecha: true, pesoKg: true };

function listar(usuarioId, desde) {
  return prisma.registroPeso.findMany({ where: { usuarioId, fecha: { gte: dia(desde) } }, select: SELECCION, orderBy: { fecha: 'asc' } });
}

// El último pesaje (si hay) queda como peso del perfil. Sin pesajes, el perfil conserva el peso que tenía.
async function sincronizarPerfil(tx, usuarioId) {
  const ultimo = await tx.registroPeso.findFirst({ where: { usuarioId }, orderBy: { fecha: 'desc' }, select: { pesoKg: true } });
  if (!ultimo) return null;
  await tx.perfilUsuario.upsert({ where: { usuarioId }, update: { pesoKg: ultimo.pesoKg }, create: { usuarioId, pesoKg: ultimo.pesoKg } });
  return ultimo.pesoKg;
}

// Anotar el peso de un día reemplaza el de ese mismo día.
function registrar(usuarioId, fecha, pesoKg) {
  return prisma.$transaction(async (tx) => {
    await tx.registroPeso.upsert({
      where: { usuarioId_fecha: { usuarioId, fecha: dia(fecha) } },
      create: { usuarioId, fecha: dia(fecha), pesoKg },
      update: { pesoKg },
    });
    return sincronizarPerfil(tx, usuarioId);
  });
}

// Devuelve false si el pesaje no existe o no es de esta persona.
function eliminar(usuarioId, id) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.registroPeso.deleteMany({ where: { id, usuarioId } });
    if (!count) return false;
    await sincronizarPerfil(tx, usuarioId);
    return true;
  });
}

module.exports = { listar, registrar, eliminar };
