import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { solicitar } from '../services/api.js';
import { ahoraChile, fechaHorario, fechaLarga, futura, minutosEntre, moverMes, sumarMinutos, textoDuracion } from '../services/agenda.js';
import { useSesion } from '../context/SesionContext.jsx';
import Icono from '../components/Icono.jsx';
import CalendarioMes from '../components/reservas/CalendarioMes.jsx';
import { ESTADOS, estadoVisible, lunesDe, sumarDias } from '../components/agenda/semana.js';
import useAgenda from '../components/reservas/useAgenda.js';
import './Agenda.css';

function Avisos({ error, aviso, onReintentar }) {
  return (
    <>
      {error && (
        <p role="alert" className="agenda__error">
          {error}{' '}
          <button type="button" className="boton-texto" onClick={onReintentar}>
            Reintentar
          </button>
        </p>
      )}
      {aviso && <p role="status">{aviso}</p>}
    </>
  );
}

// Pregunta de confirmación dentro de la misma tarjeta, junto a lo que se va a cambiar. Antes aparecía al final de
// la lista y, con varias citas, quedaba fuera de la pantalla. Recibe el foco al abrirse y Escape la cierra.
function Confirmacion({ id, titulo, texto, accion, ocupado, onConfirmar, onVolver }) {
  const caja = useRef(null);
  useEffect(() => {
    caja.current?.focus();
  }, []);
  return (
    <div
      ref={caja}
      className="agenda__confirmacion"
      role="group"
      aria-labelledby={id}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onVolver();
      }}
    >
      <h4 id={id}>{titulo}</h4>
      <p>{texto}</p>
      <div className="agenda__acciones">
        <button
          type="button"
          className="boton boton--principal boton--compacto"
          disabled={ocupado}
          onClick={onConfirmar}
        >
          {accion}
        </button>
        <button
          type="button"
          className="boton boton--secundario boton--compacto"
          disabled={ocupado}
          onClick={onVolver}
        >
          Volver
        </button>
      </div>
    </div>
  );
}

// Al cerrar la pregunta con "Volver" o Escape, el foco regresa al botón que la abrió: mientras la pregunta está
// abierta, las acciones de la tarjeta quedan ocultas (no desmontadas). Tras confirmar no se devuelve (la lista se recarga).
function useVolverFoco(abierta) {
  const disparador = useRef(null);
  useEffect(() => {
    if (abierta || !disparador.current) return;
    if (disparador.current.isConnected) disparador.current.focus();
    disparador.current = null;
  }, [abierta]);
  return {
    recordar: (boton) => {
      disparador.current = boton;
    },
    olvidar: () => {
      disparador.current = null;
    },
  };
}

const MODALIDAD = { presencial: 'Presencial', online: 'Online' };

// Datos de la reserva que eligió el usuario al reservar (09-11-2026) y acceso a la conversación (FS-HU-31).
function DetallesCita({ r, profesional, compacto }) {
  const datos = [MODALIDAD[r.modalidad], r.primeraVisita === true && 'Primera visita', r.estado === 'cancelada' && r.canceladaPor
    && `Cancelada por ${r.canceladaPor === 'profesional' ? (profesional ? 'ti' : 'el profesional') : profesional ? 'la persona' : 'ti'}`].filter(Boolean);
  const conversacion = profesional ? `/profesional/mensajes?reserva=${r.id}` : `/mensajes?reserva=${r.id}`;
  const pasadaConfirmada = !profesional && r.estado === 'confirmada' && !futura(r);
  return (
    <>
      {datos.length > 0 && <p className="agenda__datos">{datos.join(' · ')}</p>}
      {!compacto && (r.estado !== 'cancelada' || r.mensajesNoLeidos > 0) && (
        <p className="agenda__enlaces">
          <Link to={conversacion} className="agenda__enlace">
            <Icono nombre="chat" tamano={16} /> Mensajes
            {r.mensajesNoLeidos > 0 && <span className="agenda__no-leidos" aria-label={`${r.mensajesNoLeidos} sin leer`}>{r.mensajesNoLeidos}</span>}
          </Link>
          {/* Reseñas verificadas: después de una cita confirmada, la persona puede calificar al profesional. */}
          {pasadaConfirmada && (
            <Link to={`/profesionales/${r.profesional.id}#titulo-resenas`} className="agenda__enlace">
              <Icono nombre="estrella" tamano={16} /> Calificar
            </Link>
          )}
        </p>
      )}
    </>
  );
}

// Buscador y filtros de la lista de reservas o citas (pedido del PO del 15-11-2026): por nombre, por estado y por la
// fecha de la cita. En «Próximas» solo caben las por confirmar y las confirmadas, y no hay meses pasados.
const ESTADOS_FILTRO = {
  proximas: ['pendiente', 'confirmada'],
  historial: ['pendiente', 'confirmada', 'realizada', 'noRealizada', 'cancelada'],
};
const PERIODOS = {
  proximas: [['todas', 'Cualquiera'], ['hoy', 'Hoy'], ['semana', 'Esta semana'], ['mes', 'Este mes'], ['rango', 'Elegir fechas']],
  historial: [['todas', 'Cualquiera'], ['hoy', 'Hoy'], ['semana', 'Esta semana'], ['mes', 'Este mes'], ['mesPasado', 'Mes pasado'], ['rango', 'Elegir fechas']],
};
const SIN_FILTROS = { texto: '', estado: 'todos', periodo: 'todas', desde: '', hasta: '' };
const normalizar = (texto) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
const finDeMes = (mes) => sumarDias(`${moverMes(mes, 1)}-01`, -1);

// Fechas (inclusive) del período elegido, o null si es cualquier fecha.
function fechasDe({ periodo, desde, hasta }, hoy) {
  const mes = hoy.slice(0, 7);
  if (periodo === 'hoy') return [hoy, hoy];
  if (periodo === 'semana') return [lunesDe(hoy), sumarDias(lunesDe(hoy), 6)];
  if (periodo === 'mes') return [`${mes}-01`, finDeMes(mes)];
  if (periodo === 'mesPasado') return [`${moverMes(mes, -1)}-01`, finDeMes(moverMes(mes, -1))];
  if (periodo === 'rango' && (desde || hasta)) return [desde || '0000-01-01', hasta || '9999-12-31'];
  return null;
}
const momento = (r) => `${r.horario.fecha}T${r.horario.horaInicio}`;

export function MisCitas({ compacto = false, onCambio }) {
  const { sesion } = useSesion();
  const profesional = sesion.usuario.rol === 'profesional';
  const [revision, setRevision] = useState(0);
  const { datos, error: errorCarga } = useAgenda('/reservas', revision);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [confirmacion, setConfirmacion] = useState(null);
  const foco = useVolverFoco(confirmacion);
  const [ocupado, setOcupado] = useState(false);
  const [filtro, setFiltro] = useState('proximas');
  const [filtros, setFiltros] = useState(SIN_FILTROS);
  // Revisión del PR 63 (16-11-2026): con la lista abierta (por ejemplo, «Mis citas» del usuario, que no tiene otro reloj),
  // una cita que comienza pasa a realizada o no realizada y deja de ofrecer confirmar o cancelar sin recargar. futura()
  // lee la hora actual: basta con volver a dibujar cada minuto.
  const [, setMinuto] = useState(0);
  useEffect(() => {
    const temporizador = setInterval(() => setMinuto((m) => m + 1), 60000);
    return () => clearInterval(temporizador);
  }, []);
  const filtrar = (cambio) => setFiltros((antes) => ({ ...antes, ...cambio }));
  // Al pasar a «Próximas», los filtros que ahí no caben vuelven a «todos».
  const cambiarFiltro = (valor) => {
    setFiltro(valor);
    setFiltros((antes) => ({
      ...antes,
      estado: antes.estado === 'todos' || ESTADOS_FILTRO[valor].includes(antes.estado) ? antes.estado : 'todos',
      periodo: PERIODOS[valor].some(([p]) => p === antes.periodo) ? antes.periodo : 'todas',
    }));
  };
  const preguntar = (e, id, estado) => {
    foco.recordar(e.currentTarget);
    setConfirmacion({ id, estado });
  };
  async function decidir() {
    setOcupado(true);
    setError('');
    try {
      await solicitar(`/reservas/${confirmacion.id}`, {
        metodo: 'PATCH',
        cuerpo: { estado: confirmacion.estado },
      });
      setAviso(
        confirmacion.estado === 'cancelada'
          ? 'Reserva cancelada. El horario vuelve a estar disponible.'
          : 'Reserva confirmada.',
      );
      foco.olvidar();
      setConfirmacion(null);
      setRevision((r) => r + 1);
      onCambio?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }
  const fechas = compacto ? null : fechasDe(filtros, ahoraChile().slice(0, 10));
  const buscado = compacto ? '' : normalizar(filtros.texto);
  const hayFiltros = !compacto && (buscado !== '' || filtros.estado !== 'todos' || fechas !== null);
  const visibles =
    datos?.reservas.filter((r) => {
      if (filtro !== 'historial' && (r.estado === 'cancelada' || !futura(r))) return false;
      if (buscado && !normalizar(profesional ? r.usuario.nombre : r.profesional.nombre).includes(buscado)) return false;
      if (!compacto && filtros.estado !== 'todos' && estadoVisible({ estado: r.estado, pasado: !futura(r) }) !== filtros.estado) return false;
      return !fechas || (r.horario.fecha >= fechas[0] && r.horario.fecha <= fechas[1]);
    }) || [];
  if (filtro === 'historial') {
    // El historial va de la cita más reciente a la más antigua (15-11-2026).
    visibles.sort((a, b) => momento(b).localeCompare(momento(a)) || b.id - a.id);
  } else if (profesional && !compacto) {
    // Para el profesional, en «Próximas» van primero las que le falta confirmar; el resto sigue por fecha.
    visibles.sort((a, b) => (a.estado === 'pendiente' ? 0 : 1) - (b.estado === 'pendiente' ? 0 : 1));
  }
  const unidad = profesional ? ['reserva', 'reservas'] : ['cita', 'citas'];
  return (
    <section
      className="agenda"
      aria-label={compacto ? 'Próximas citas' : 'Mis citas'}
    >
      <div className="agenda__cabecera">
        <h2>
          <Icono nombre="calendario" />
          {compacto
            ? 'Próximas citas'
            : profesional
              ? 'Reservas recibidas'
              : 'Mis citas'}
        </h2>
        {compacto && <Link to="/citas">Ver todas</Link>}
      </div>
      <p className="texto-secundario">Horarios en hora de Chile (Santiago).</p>
      {!compacto && (
        <div className="agenda__filtros">
          {[
            ['proximas', 'Próximas'],
            ['historial', 'Todas e historial'],
          ].map(([v, n]) => (
            <button
              type="button"
              className="boton boton--secundario boton--compacto"
              key={v}
              aria-pressed={filtro === v}
              onClick={() => cambiarFiltro(v)}
            >
              {n}
            </button>
          ))}
        </div>
      )}
      {!compacto && datos?.reservas.length > 0 && (
        <div className="agenda__buscador" role="search" aria-label={profesional ? 'Buscar reservas' : 'Buscar citas'}>
          <label className="agenda__campo agenda__campo--texto">
            <span>Buscar</span>
            <input type="search" className="campo__control" value={filtros.texto} onChange={(e) => filtrar({ texto: e.target.value })}
              placeholder={profesional ? 'Nombre de la persona' : 'Nombre del profesional'} />
          </label>
          <label className="agenda__campo">
            <span>Estado</span>
            <select className="campo__control" value={filtros.estado} onChange={(e) => filtrar({ estado: e.target.value })}>
              <option value="todos">Todos</option>
              {ESTADOS_FILTRO[filtro].map((valor) => <option key={valor} value={valor}>{ESTADOS[valor]}</option>)}
            </select>
          </label>
          <label className="agenda__campo">
            <span>Fecha de la cita</span>
            <select className="campo__control" value={filtros.periodo} onChange={(e) => filtrar({ periodo: e.target.value })}>
              {PERIODOS[filtro].map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
            </select>
          </label>
          {filtros.periodo === 'rango' && (
            <>
              <label className="agenda__campo">
                <span>Desde</span>
                <input type="date" className="campo__control" value={filtros.desde} max={filtros.hasta || undefined}
                  onChange={(e) => filtrar({ desde: e.target.value })} />
              </label>
              <label className="agenda__campo">
                <span>Hasta</span>
                <input type="date" className="campo__control" value={filtros.hasta} min={filtros.desde || undefined}
                  onChange={(e) => filtrar({ hasta: e.target.value })} />
              </label>
            </>
          )}
        </div>
      )}
      {!compacto && datos?.reservas.length > 0 && (
        <p className="agenda__conteo" aria-live="polite">
          <span>{visibles.length} {visibles.length === 1 ? unidad[0] : unidad[1]}{filtro === 'historial' ? ', de la más reciente a la más antigua' : ''}</span>
          {hayFiltros && <button type="button" className="boton-texto" onClick={() => setFiltros(SIN_FILTROS)}>Limpiar filtros</button>}
        </p>
      )}
      <Avisos
        error={error || errorCarga}
        aviso={aviso}
        onReintentar={() => {
          setError('');
          setRevision((r) => r + 1);
        }}
      />
      {!datos && !errorCarga && <p role="status">Cargando citas…</p>}
      {datos && !visibles.length && hayFiltros && (
        <div className="agenda__vacio">
          <h3>No hay {unidad[1]} con esos filtros</h3>
          <p>Prueba con otro nombre, estado o fecha.</p>
          <button type="button" className="boton boton--secundario boton--compacto" onClick={() => setFiltros(SIN_FILTROS)}>Limpiar filtros</button>
        </div>
      )}
      {datos && !visibles.length && !hayFiltros && (
        <div className="agenda__vacio">
          <h3>Aún no tienes citas agendadas</h3>
          <p>
            {profesional
              ? 'Las solicitudes de tus horarios publicados aparecerán aquí.'
              : 'Cuando reserves una hora con un profesional, la verás aquí.'}
          </p>
          {!profesional && (
            <Link
              to="/profesionales"
              className="boton boton--secundario boton--compacto"
            >
              Buscar profesionales
            </Link>
          )}
        </div>
      )}
      <div className="agenda__lista">
        {(compacto ? visibles.slice(0, 3) : visibles).map((r) => {
          // Las que ya pasaron se nombran como en la agenda: realizada si se confirmó y no realizada si no (15-11-2026).
          const estado = estadoVisible({ estado: r.estado, pasado: !futura(r) });
          return (
          <article key={r.id} className="agenda__tarjeta">
            <div>
              <span className={`agenda__estado agenda__estado--${estado}`}>
                {ESTADOS[estado]}
              </span>
              <h3>{profesional ? r.usuario.nombre : r.profesional.nombre}</h3>
              <p>
                <strong>{fechaHorario(r.horario)}</strong>
              </p>
              <p className="agenda__mensaje">{r.mensaje}</p>
              <DetallesCita r={r} profesional={profesional} compacto={compacto} />
            </div>
            {!compacto && r.estado !== 'cancelada' && futura(r) && (
              <div
                className="agenda__acciones"
                hidden={confirmacion?.id === r.id}
              >
                {profesional && r.estado === 'pendiente' && (
                  <button
                    type="button"
                    className="boton boton--principal boton--compacto"
                    disabled={ocupado}
                    onClick={(e) => preguntar(e, r.id, 'confirmada')}
                  >
                    Confirmar reserva
                  </button>
                )}
                <button
                  type="button"
                  className="boton boton--secundario boton--compacto"
                  disabled={ocupado}
                  onClick={(e) => preguntar(e, r.id, 'cancelada')}
                >
                  Cancelar reserva
                </button>
              </div>
            )}
            {/* Si la hora llega con la pregunta abierta, la pregunta se cierra sola. */}
            {confirmacion?.id === r.id && futura(r) && (
              <Confirmacion
                id={`confirmar-reserva-${r.id}`}
                titulo={`¿${confirmacion.estado === 'cancelada' ? 'Cancelar' : 'Confirmar'} esta reserva?`}
                texto={
                  confirmacion.estado === 'cancelada'
                    ? 'Si cancelas, tendrás que reservar nuevamente para recuperar una hora.'
                    : 'La solicitud quedará confirmada en ambas agendas.'
                }
                accion="Confirmar cambio"
                ocupado={ocupado}
                onConfirmar={decidir}
                onVolver={() => setConfirmacion(null)}
              />
            )}
          </article>
          );
        })}
      </div>
    </section>
  );
}

export function HorariosProfesional() {
  const [revision, setRevision] = useState(0);
  const { datos, error: errorCarga } = useAgenda('/disponibilidades', revision);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [editando, setEditando] = useState(null);
  const [borrando, setBorrando] = useState(null);
  const foco = useVolverFoco(borrando);
  const [ocupado, setOcupado] = useState(false);
  const [campos, setCampos] = useState({
    fecha: '',
    horaInicio: '',
    horaFin: '',
  });
  // Calendario del formulario (SC-21): empieza en el mes actual y no deja elegir días pasados.
  const hoy = ahoraChile().slice(0, 10);
  const [mes, setMes] = useState(hoy.slice(0, 7));
  const formulario = useRef(null);
  const campoInicio = useRef(null);
  const porDia = new Map();
  for (const b of datos?.horarios || []) porDia.set(b.fecha, [...(porDia.get(b.fecha) || []), b]);
  const delDia = (porDia.get(campos.fecha) || []).filter((b) => b.id !== editando);
  const duracion = campos.horaInicio && campos.horaFin ? minutosEntre(campos.horaInicio, campos.horaFin) : null;
  // Al editar un horario de la lista, el formulario queda a la vista con el calendario en su mes y el foco en la hora.
  useEffect(() => {
    if (!editando) return;
    const suave = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    formulario.current?.scrollIntoView?.({ behavior: suave ? 'smooth' : 'auto', block: 'start' });
    campoInicio.current?.focus({ preventScroll: true });
  }, [editando]);
  async function guardar(e) {
    e.preventDefault();
    setError('');
    setAviso('');
    if (campos.horaFin <= campos.horaInicio) {
      setError('La hora de término debe ser posterior a la hora de inicio.');
      return;
    }
    setOcupado(true);
    try {
      await solicitar(`/disponibilidades${editando ? `/${editando}` : ''}`, {
        metodo: editando ? 'PUT' : 'POST',
        cuerpo: campos,
      });
      setAviso(editando ? 'Horario actualizado.' : 'Horario publicado.');
      setCampos({ fecha: '', horaInicio: '', horaFin: '' });
      setEditando(null);
      setRevision((r) => r + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }
  async function borrar() {
    setOcupado(true);
    setError('');
    try {
      const resultado = await solicitar(`/disponibilidades/${borrando}`, { metodo: 'DELETE' });
      if (editando === borrando) {
        setEditando(null);
        setCampos({ fecha: '', horaInicio: '', horaFin: '' });
      }
      foco.olvidar();
      setBorrando(null);
      setAviso(resultado.retirado
        ? 'Horario retirado. Ya no admite nuevas reservas; su historial se conserva.'
        : 'Horario eliminado.');
      setRevision((r) => r + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }
  return (
    <section className="agenda">
      <div className="agenda__cabecera">
        <h2>
          <Icono nombre="calendario" />
          Mis horarios disponibles
        </h2>
      </div>
      <p>
        Publica bloques concretos para que puedan reservar contigo. Horarios en
        hora de Chile (Santiago).
      </p>
      <Avisos
        error={error || errorCarga}
        aviso={aviso}
        onReintentar={() => {
          setError('');
          setRevision((r) => r + 1);
        }}
      />
      <form ref={formulario} className="agenda__formulario agenda__publicar" onSubmit={guardar}>
        <h3>{editando ? 'Editar horario' : 'Publicar un horario'}</h3>
        <div className="publicar">
          <CalendarioMes id="mes-publicar" mes={mes} dia={campos.fecha} onMes={setMes}
            onElegir={(fecha) => setCampos({ ...campos, fecha })}
            anterior={mes > hoy.slice(0, 7) ? moverMes(mes, -1) : undefined} siguiente={moverMes(mes, 1)}
            describirDia={(fecha) => {
              const cantidad = porDia.get(fecha)?.length || 0;
              const detalle = fecha < hoy ? 'día pasado'
                : cantidad ? `${cantidad} ${cantidad === 1 ? 'horario publicado' : 'horarios publicados'}` : 'sin horarios publicados';
              return { habilitado: fecha >= hoy, marcado: cantidad > 0, etiqueta: `${fechaLarga(fecha)}, ${detalle}` };
            }} />
          <div className="publicar__horas">
            <p className="publicar__dia" aria-live="polite">
              {campos.fecha ? fechaLarga(campos.fecha) : 'Elige un día en el calendario'}
            </p>
            {delDia.length > 0 && (
              <p className="publicar__existentes">
                Ya publicaste: {delDia.map((b) => `${b.horaInicio}–${b.horaFin}`).join(', ')}
              </p>
            )}
            <div className="publicar__campos">
              {[
                ['horaInicio', 'Hora de inicio', campoInicio],
                ['horaFin', 'Hora de término', null],
              ].map(([clave, texto, ref]) => (
                <label key={clave}>
                  {texto}
                  <input
                    ref={ref}
                    className="campo__control"
                    required
                    type="time"
                    step="900"
                    value={campos[clave]}
                    disabled={ocupado}
                    onChange={(e) =>
                      setCampos({ ...campos, [clave]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <div className="publicar__duraciones" role="group" aria-label="Duración del bloque">
              {[30, 45, 60, 90].map((minutos) => {
                const fin = campos.horaInicio && sumarMinutos(campos.horaInicio, minutos);
                return (
                  <button key={minutos} type="button" className="chip" aria-pressed={duracion === minutos}
                    disabled={!fin || ocupado} onClick={() => setCampos({ ...campos, horaFin: fin })}>
                    {textoDuracion(minutos)}
                  </button>
                );
              })}
            </div>
            <button className="boton boton--principal" disabled={ocupado || !campos.fecha}>
              {ocupado
                ? 'Guardando…'
                : editando
                  ? 'Guardar horario'
                  : 'Publicar horario'}
            </button>
            {editando && (
              <button
                type="button"
                className="boton boton--secundario"
                onClick={() => {
                  setEditando(null);
                  setCampos({ fecha: '', horaInicio: '', horaFin: '' });
                }}
              >
                Cancelar edición
              </button>
            )}
          </div>
        </div>
      </form>
      {!datos && !errorCarga && <p role="status">Cargando horarios…</p>}
      {datos && !datos.horarios.length && (
        <p>Aún no has publicado horarios disponibles.</p>
      )}
      <div className="agenda__lista">
        {datos?.horarios.map((b) => (
          <article className="agenda__tarjeta" key={b.id}>
            <div>
              <span className="agenda__estado">
                {b.ocupado ? 'Reservado' : 'Disponible'}
              </span>
              <h3>{fechaHorario(b)}</h3>
            </div>
            <div className="agenda__acciones" hidden={borrando === b.id}>
              <button
                type="button"
                className="boton boton--secundario boton--compacto"
                disabled={b.ocupado || b.conHistorial || ocupado}
                onClick={() => {
                  setEditando(b.id);
                  setMes(b.fecha.slice(0, 7));
                  setCampos({
                    fecha: b.fecha,
                    horaInicio: b.horaInicio,
                    horaFin: b.horaFin,
                  });
                }}
              >
                Editar horario
              </button>
              <button
                type="button"
                className="boton boton--secundario boton--compacto"
                disabled={b.ocupado || ocupado}
                onClick={(e) => {
                  foco.recordar(e.currentTarget);
                  setBorrando(b.id);
                }}
              >
                Retirar horario
              </button>
            </div>
            {borrando === b.id && (
              <Confirmacion
                id={`retirar-horario-${b.id}`}
                titulo="¿Retirar este horario?"
                texto="El bloque dejará de aparecer para nuevas reservas. Los bloques con historial se conservan."
                accion="Confirmar retiro"
                ocupado={ocupado}
                onConfirmar={borrar}
                onVolver={() => setBorrando(null)}
              />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default function AgendaProfesional() {
  return (
    <div>
      <h1>Mi agenda</h1>
      <HorariosProfesional />
      <MisCitas />
    </div>
  );
}
