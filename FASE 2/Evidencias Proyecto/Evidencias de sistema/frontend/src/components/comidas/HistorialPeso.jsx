import { useState } from 'react';
import { decimal } from './planComun.js';
import GraficoPeso from './GraficoPeso.jsx';
import Icono from '../Icono.jsx';
import './HistorialPeso.css';

const fechaLarga = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const conFecha = (iso) => fechaLarga.format(new Date(`${iso}T00:00:00Z`));
const leerPeso = (texto) => {
  const valor = Number(String(texto).trim().replace(',', '.'));
  return String(texto).trim() && Number.isFinite(valor) ? Math.round(valor * 10) / 10 : null;
};
const restarDias = (iso, dias) => {
  const fecha = new Date(`${iso}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() - dias);
  return fecha.toISOString().slice(0, 10);
};

function describirRitmo(ritmo) {
  if (ritmo === null || ritmo === undefined) return null;
  if (ritmo === 0) return 'Tu peso se mantiene estable';
  return `${ritmo < 0 ? 'Bajas' : 'Subes'} ${decimal(Math.abs(ritmo))} kg por semana`;
}

// Historial de peso (SC-43): anotar el peso de un día, ver su evolución contra el ritmo de la meta y borrar pesajes.
// El último pesaje es el peso del perfil: el plan de macronutrientes y la meta de peso se recalculan solos.
export default function HistorialPeso({ datos, guardando, acciones, mensaje }) {
  const { historialPeso: historial, metaPeso: meta } = datos;
  const { pesos = [], ritmoRealSemanalKg: ritmo = null, hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date()) } = historial ?? {};
  const [peso, setPeso] = useState('');
  const [fecha, setFecha] = useState(hoy);
  const [error, setError] = useState('');
  const metaQueAplica = meta?.aplica ? meta : null;
  const recientes = [...pesos].reverse();

  async function anotar(evento) {
    evento.preventDefault();
    const valor = leerPeso(peso);
    if (valor === null || valor < 20 || valor > 350) { setError('Escribe un peso entre 20 y 350 kg'); return; }
    setError('');
    if (await acciones.anotarPeso({ pesoKg: valor, fecha })) { setPeso(''); setFecha(hoy); }
  }

  const textoRitmo = describirRitmo(ritmo);
  return (
    <section className="panel-tarjeta historial-peso" aria-labelledby="titulo-historial-peso">
      <div className="historial-peso__encabezado">
        <h2 id="titulo-historial-peso" className="panel-tarjeta__titulo">Tu peso</h2>
        {textoRitmo && (
          <p className="historial-peso__ritmo">
            <strong>{textoRitmo}</strong>
            <span className="texto-secundario"> en las últimas 8 semanas{metaQueAplica ? ` · tu meta: ${decimal(metaQueAplica.ritmoSemanalKg)} kg por semana` : ''}</span>
          </p>
        )}
      </div>

      <form className="historial-peso__formulario" onSubmit={anotar} noValidate>
        <label className="campo">
          <span className="campo__etiqueta">Peso (kg)</span>
          <input className="campo__control" inputMode="decimal" placeholder="Ej.: 72,4" value={peso}
            onChange={(e) => { setPeso(e.target.value); setError(''); }} aria-invalid={Boolean(error)}
            aria-describedby={error ? 'error-historial-peso' : undefined} />
        </label>
        <label className="campo">
          <span className="campo__etiqueta">Día</span>
          <input type="date" className="campo__control" value={fecha} max={hoy} min={restarDias(hoy, 365)}
            onChange={(e) => setFecha(e.target.value || hoy)} />
        </label>
        <button type="submit" className="boton boton--principal boton--compacto" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Anotar peso'}
        </button>
        {error && <span id="error-historial-peso" className="campo__mensaje historial-peso__error" role="alert">{error}</span>}
      </form>

      {pesos.length ? (
        <GraficoPeso pesos={pesos} meta={metaQueAplica} hoy={hoy} />
      ) : (
        <p className="historial-peso__vacio texto-secundario">Anota tu peso cada semana para ver aquí cómo avanzas. Tu último pesaje queda como el peso de tu perfil.</p>
      )}
      {mensaje}

      {pesos.length > 0 && (
        <details className="historial-peso__lista">
          <summary>Ver tus pesajes ({pesos.length})</summary>
          <table>
            <caption className="solo-lector">Tus pesajes de los últimos 180 días, del más reciente al más antiguo</caption>
            <thead><tr><th scope="col">Día</th><th scope="col">Peso</th><th scope="col"><span className="solo-lector">Acciones</span></th></tr></thead>
            <tbody>
              {recientes.map((p) => (
                <tr key={p.id}>
                  <td>{conFecha(p.fecha)}</td>
                  <td>{decimal(p.pesoKg)} kg</td>
                  <td>
                    <button type="button" className="historial-peso__borrar" disabled={guardando}
                      aria-label={`Borrar el pesaje del ${conFecha(p.fecha)}`} onClick={() => acciones.borrarPeso(p)}>
                      <Icono nombre="basura" tamano={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}
