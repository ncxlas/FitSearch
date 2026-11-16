// Fechas del calendario semanal del profesional (mejoras del 09-11-2026). Las fechas son "AAAA-MM-DD" y las horas "HH:MM"
// en hora de Chile; se calculan en UTC para que la zona del navegador no corra el día.
const ms = (fecha) => Date.parse(`${fecha}T12:00:00Z`);
const NOMBRES = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const NOMBRES_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const sumarDias = (fecha, dias) => new Date(ms(fecha) + dias * 86400000).toISOString().slice(0, 10);
export const lunesDe = (fecha) => sumarDias(fecha, -((new Date(ms(fecha)).getUTCDay() + 6) % 7));

// Los siete días de la semana que empieza en "lunes".
export const diasDeSemana = (lunes) => NOMBRES.map((corto, indice) => {
  const fecha = sumarDias(lunes, indice);
  return { fecha, corto, largo: NOMBRES_LARGOS[indice], numero: Number(fecha.slice(8)) };
});

export const aMinutos = (hora) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
export const aHora = (minutos) => `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

// "9 – 15 de noviembre de 2026" o "30 de noviembre – 6 de diciembre de 2026".
export function tituloSemana(lunes) {
  const domingo = sumarDias(lunes, 6);
  const [a1, m1, d1] = lunes.split('-').map(Number);
  const [a2, m2, d2] = domingo.split('-').map(Number);
  if (a1 !== a2) return `${d1} de ${MESES[m1 - 1]} de ${a1} – ${d2} de ${MESES[m2 - 1]} de ${a2}`;
  if (m1 !== m2) return `${d1} de ${MESES[m1 - 1]} – ${d2} de ${MESES[m2 - 1]} de ${a2}`;
  return `${d1} – ${d2} de ${MESES[m2 - 1]} de ${a2}`;
}

// "martes 10 de noviembre"
export function diaLargo(fecha) {
  const [, mes, dia] = fecha.split('-').map(Number);
  return `${NOMBRES_LARGOS[(new Date(ms(fecha)).getUTCDay() + 6) % 7]} ${dia} de ${MESES[mes - 1]}`;
}

// "mar 10 nov"
export function diaCorto(fecha) {
  const [, mes, dia] = fecha.split('-').map(Number);
  return `${NOMBRES[(new Date(ms(fecha)).getUTCDay() + 6) % 7]} ${dia} ${MESES[mes - 1].slice(0, 3)}`;
}

// Rango de horas visible: al menos el de las reglas y, si hay horarios antes o después, se amplía a la hora entera.
export function rangoVisible(horarios, { horaInicio, horaFin }) {
  let inicio = aMinutos(horaInicio);
  let fin = aMinutos(horaFin);
  for (const h of horarios) {
    inicio = Math.min(inicio, Math.floor(aMinutos(h.horaInicio) / 60) * 60);
    fin = Math.max(fin, Math.ceil(aMinutos(h.horaFin) / 60) * 60);
  }
  return { inicio, fin: Math.min(fin, 24 * 60) };
}

// Estados que se ven en la agenda (pedido del PO del 15-11-2026). Una hora que ya comenzó deja de estar «por
// confirmar» o «confirmada»: si se confirmó, se cuenta como realizada (igual que en Reportes); si no, como no
// realizada. Un horario libre de un día bloqueado no se ofrece a los usuarios.
export const ESTADOS = {
  libre: 'Libre',
  pendiente: 'Por confirmar',
  confirmada: 'Confirmada',
  realizada: 'Realizada',
  noRealizada: 'No realizada',
  bloqueado: 'Bloqueado',
  sinReservas: 'Sin reservas',
  cancelada: 'Cancelada',
};
// Orden de la leyenda del calendario.
export const LEYENDA = ['libre', 'pendiente', 'confirmada', 'realizada', 'noRealizada', 'bloqueado'];

// Estado visible de un horario de la semana ({ estado, pasado, bloqueado }) o de una reserva ({ estado } y si ya pasó).
export function estadoVisible({ estado, pasado, bloqueado }) {
  if (estado === 'cancelada') return 'cancelada';
  if (estado === 'confirmada') return pasado ? 'realizada' : 'confirmada';
  if (estado === 'pendiente') return pasado ? 'noRealizada' : 'pendiente';
  if (pasado) return 'sinReservas';
  return bloqueado ? 'bloqueado' : 'libre';
}

// Explicación corta de las horas que ya pasaron, para el detalle.
export const NOTA_ESTADO = {
  realizada: 'La cita estaba confirmada y su hora ya comenzó.',
  noRealizada: 'La reserva no se confirmó antes de la hora de la cita.',
};

// Texto que leen los lectores de pantalla para cada horario del calendario.
export function describirHorario(h) {
  const estado = ESTADOS[estadoVisible(h)].toLowerCase();
  const quien = h.reserva ? `${h.reserva.usuario.nombre}, ${estado}` : estado;
  return `${diaLargo(h.fecha)}, ${h.horaInicio} a ${h.horaFin}, ${quien}${h.bloqueado && h.reserva ? ', día bloqueado' : ''}`;
}

// Horas en que se publicarán los bloques (uno solo o una serie de igual duración).
export function bloquesPrevistos({ horaInicio, horaFin, dividir, duracion }) {
  if (!horaInicio || !horaFin || horaFin <= horaInicio) return [];
  if (!dividir) return [{ horaInicio, horaFin }];
  const bloques = [];
  for (let m = aMinutos(horaInicio); m + duracion <= aMinutos(horaFin); m += duracion) bloques.push({ horaInicio: aHora(m), horaFin: aHora(m + duracion) });
  return bloques;
}
