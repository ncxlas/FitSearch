import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import EstadoVacio from '../../components/EstadoVacio.jsx';
import Icono from '../../components/Icono.jsx';
import ErrorCarga from '../../components/profesional/ErrorCarga.jsx';
import useConsulta from '../../components/profesional/useConsulta.js';
import { SECCIONES_PROFESIONAL as SECCIONES } from '../../components/diseno/secciones.js';
import { diaYMes, obtenerReportes } from '../../services/actividadProfesional.service.js';
import { hoyEnChile } from '../../services/agua.service.js';
import { ColumnasApiladas } from '../../components/graficos/Graficos.jsx';
import './Reportes.css';

const PERIODOS = [4, 8, 12];
// Orden de las barras apiladas, de abajo hacia arriba, con el color de cada estado (los mismos de Reportes.css).
const ESTADOS = [
  { clave: 'realizadas', nombre: 'Realizadas', color: '#1b6b46' },
  { clave: 'confirmadas', nombre: 'Confirmadas', color: '#3aa57b' },
  { clave: 'pendientes', nombre: 'Pendientes', color: '#1c74c9' },
  { clave: 'sinConfirmar', nombre: 'Sin confirmar', color: '#d39a1c' },
  { clave: 'canceladas', nombre: 'Canceladas', color: '#c0473f' },
];

const sumar = (semanas, clave) => semanas.reduce((total, semana) => total + semana[clave], 0);
const rangoSemana = ({ inicio, fin }) => `${diaYMes(inicio)} – ${diaYMes(fin)}`;
const porcentaje = (parte, total) => (total ? Math.round((parte / total) * 100) : 0);

// Reservas de cada semana (por la fecha de la cita) apiladas por estado. Desde el 15-11-2026 usa el mismo gráfico que
// el administrador y Comidas: al pasar el mouse, tocar o enfocar una semana se ve su detalle (fechas, cada estado y el
// total), con un eje de cantidades y la semana en curso marcada. Los valores también van en una tabla para lectores.
function ReservasPorSemana({ semanas }) {
  const hoy = hoyEnChile();
  return (
    <ColumnasApiladas
      grupos={semanas.map((semana) => ({ ...semana, clave: semana.inicio, actual: semana.inicio <= hoy && hoy <= semana.fin }))}
      series={ESTADOS}
      etiqueta={(semana) => diaYMes(semana.inicio)}
      titulo={(semana) => `Semana del ${rangoSemana(semana)}`}
      tituloTabla="Reservas por semana y por estado"
      filaTabla={{ encabezado: 'Semana', texto: rangoSemana }}
      unidad={['reserva', 'reservas']}
      mostrarTotal
    />
  );
}

// Una barra de «Reservas por estado»: al pasar el mouse, tocarla o enfocarla dice cuántas son del total (15-11-2026).
function EstadoReservas({ clave, nombre, cantidad, total }) {
  const detalle = `${cantidad} de ${total} ${total === 1 ? 'reserva' : 'reservas'} (${porcentaje(cantidad, total)} %)`;
  return (
    <li className="reportes-estado" tabIndex={0} aria-label={`${nombre}: ${detalle}`}>
      <span className={`reportes-leyenda__color reportes-barras__tramo--${clave}`} aria-hidden="true" />
      <span aria-hidden="true">{nombre}</span>
      <strong aria-hidden="true">{cantidad}</strong>
      <span className="reportes-estados__barra" aria-hidden="true">
        <span className={`reportes-barras__tramo--${clave}`} style={{ width: `${porcentaje(cantidad, total)}%` }} />
      </span>
      <span className="reportes-estado__ayuda" role="tooltip" aria-hidden="true"><strong>{nombre}</strong>{detalle}</span>
    </li>
  );
}

function Indicador({ icono, nombre, valor, detalle }) {
  return (
    <li className="reportes-indicador">
      <span className="reportes-indicador__icono"><Icono nombre={icono} tamano={20} /></span>
      <span className="reportes-indicador__nombre">{nombre}</span>
      <strong className="reportes-indicador__valor">{valor}</strong>
      {detalle && <span className="reportes-indicador__detalle">{detalle}</span>}
    </li>
  );
}

// Reportes del profesional (FS-HU-28): reservas por semana y por estado, y su calificación promedio.
export default function Reportes() {
  const [semanas, setSemanas] = useState(8);
  const consultar = useCallback(() => obtenerReportes(semanas), [semanas]);
  const { datos, error, cargando, reintentar } = useConsulta(consultar, semanas);

  let contenido;
  if (cargando && !datos) {
    contenido = <p role="status">Cargando tus reportes…</p>;
  } else if (error) {
    contenido = <ErrorCarga error={error} reintentar={reintentar} />;
  } else {
    const { semanas: porSemana, calificacion, totales } = datos;
    const enPeriodo = sumar(porSemana, 'total');
    contenido = (
      <div className="reportes__contenido" aria-busy={cargando}>
        <ul className="reportes-indicadores" aria-label={`Resumen de las últimas ${porSemana.length} semanas`}>
          <Indicador icono="calendario" nombre="Reservas" valor={enPeriodo} detalle={`${totales.total} desde que empezaste`} />
          <Indicador icono="check" nombre="Citas realizadas" valor={sumar(porSemana, 'realizadas')} />
          <Indicador icono="cerrar" nombre="Canceladas" valor={sumar(porSemana, 'canceladas')}
            detalle={enPeriodo ? `${Math.round((sumar(porSemana, 'canceladas') / enPeriodo) * 100)} % de las reservas` : null} />
          <Indicador icono="estrella" nombre="Calificación promedio"
            valor={calificacion.promedio === null ? '—' : calificacion.promedio.toLocaleString('es-CL', { minimumFractionDigits: 1 })}
            detalle={calificacion.cantidad ? `${calificacion.cantidad} ${calificacion.cantidad === 1 ? 'reseña' : 'reseñas'}` : 'Aún sin reseñas'} />
        </ul>

        <section className="panel-tarjeta" aria-labelledby="titulo-reservas-semana">
          <h2 id="titulo-reservas-semana" className="panel-tarjeta__titulo">
            <span className="panel-tarjeta__icono"><Icono nombre="grafico" tamano={20} /></span> Reservas por semana
          </h2>
          {enPeriodo ? <ReservasPorSemana semanas={porSemana} /> : (
            <EstadoVacio icono="calendario" titulo={`Sin reservas en las últimas ${porSemana.length} semanas`} compacto
              accion={<Link to={SECCIONES.agenda.ruta} className="boton boton--principal boton--compacto">Publicar horario</Link>}>
              Publica horarios en tu agenda para que las personas puedan reservar contigo.
            </EstadoVacio>
          )}
        </section>

        <section className="panel-tarjeta" aria-labelledby="titulo-por-estado">
          <h2 id="titulo-por-estado" className="panel-tarjeta__titulo">
            <span className="panel-tarjeta__icono"><Icono nombre="check" tamano={20} /></span> Reservas por estado
          </h2>
          <ul className="reportes-estados">
            {ESTADOS.map(({ clave, nombre }) => (
              <EstadoReservas key={clave} clave={clave} nombre={nombre} cantidad={sumar(porSemana, clave)} total={enPeriodo} />
            ))}
          </ul>
          <p className="texto-secundario reportes__nota">
            Una cita confirmada que ya comenzó se cuenta como realizada; una pendiente que no se confirmó a tiempo, como sin confirmar.
          </p>
        </section>
      </div>
    );
  }

  return (
    <section className="reportes" aria-labelledby="titulo-reportes">
      <header className="reportes__cabecera">
        <div>
          <h1 id="titulo-reportes">Reportes</h1>
          <p className="texto-secundario">Cómo evoluciona tu atención: reservas por semana de la cita (hora de Chile) y tu calificación.</p>
        </div>
        <div className="reportes__periodos" role="group" aria-label="Período del reporte">
          {PERIODOS.map((n) => (
            <button key={n} type="button" className="boton boton--secundario boton--compacto" aria-pressed={semanas === n} onClick={() => setSemanas(n)}>
              {n} semanas
            </button>
          ))}
        </div>
      </header>
      {contenido}
    </section>
  );
}
