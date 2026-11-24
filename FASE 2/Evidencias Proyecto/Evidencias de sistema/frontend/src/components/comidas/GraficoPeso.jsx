import { useId, useMemo, useRef, useState } from 'react';
import { decimal, pesoDeLaMeta } from './planComun.js';

// Gráfico del historial de peso (SC-43): el peso anotado (línea continua con puntos) contra el ritmo de la meta de peso
// (línea punteada que baja o sube al ritmo elegido y se queda en el peso objetivo). Un solo eje, en kg. Colores validados
// con el verificador de paletas en claro y oscuro; la línea punteada es la segunda señal además del color. Al pasar el
// mouse (o al moverse con las flechas) muestra el pesaje más cercano; la tabla de pesajes es la vista accesible.
const ANCHO = 640;
const ALTO = 240;
const M = { arriba: 16, derecha: 74, abajo: 30, izquierda: 46 };
const DIA = 86400000;
const fechaCorta = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fechaTooltip = new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const ms = (iso) => Date.parse(`${iso}T00:00:00Z`);
const iso = (t) => new Date(t).toISOString().slice(0, 10);

function escalaLimpia(min, max) {
  const rango = Math.max(max - min, 2);
  const paso = rango <= 4 ? 1 : rango <= 10 ? 2 : rango <= 25 ? 5 : 10;
  const desde = Math.floor((min - 0.5) / paso) * paso;
  const hasta = Math.ceil((max + 0.5) / paso) * paso;
  const marcas = [];
  for (let v = desde; v <= hasta + 1e-9; v += paso) marcas.push(Math.round(v * 10) / 10);
  return { desde, hasta, marcas };
}

// `de`: «tu» cuando lo mira la persona; «su» cuando lo mira su profesional (progreso compartido, SC-45).
export default function GraficoPeso({ pesos, meta, hoy, de = 'tu' }) {
  const Tu = de === 'su' ? 'Su' : 'Tu';
  const id = useId();
  const svg = useRef(null);
  const [activo, setActivo] = useState(null);

  const datos = useMemo(() => {
    const inicioMeta = meta && ms(meta.fechaInicio) >= ms(hoy) - 180 * DIA ? meta.fechaInicio : null;
    const primeros = [pesos[0]?.fecha, inicioMeta].filter(Boolean).map(ms);
    let x0 = primeros.length ? Math.min(...primeros) : ms(hoy) - 30 * DIA;
    const x1 = ms(hoy);
    if (x1 - x0 < 14 * DIA) x0 = x1 - 14 * DIA;
    // La meta se dibuja por tramos: del inicio (o del borde izquierdo) a hoy, con un quiebre si llega al objetivo antes.
    let lineaMeta = null;
    if (meta) {
      const desde = Math.max(x0, ms(meta.fechaInicio));
      const diasHastaObjetivo = (Math.abs(meta.pesoInicialKg - meta.pesoObjetivoKg) / meta.ritmoSemanalKg) * 7;
      const quiebre = ms(meta.fechaInicio) + diasHastaObjetivo * DIA;
      const tramos = [desde, ...(quiebre > desde && quiebre < x1 ? [quiebre] : []), x1];
      lineaMeta = tramos.map((t) => ({ t, kg: pesoDeLaMeta(meta, iso(t)) })).filter((p) => p.kg !== null);
    }
    const valores = [...pesos.map((p) => p.pesoKg), ...(lineaMeta ?? []).map((p) => p.kg)];
    const y = escalaLimpia(Math.min(...valores), Math.max(...valores));
    const ancho = ANCHO - M.izquierda - M.derecha;
    const alto = ALTO - M.arriba - M.abajo;
    const px = (t) => M.izquierda + ((t - x0) / (x1 - x0 || 1)) * ancho;
    const py = (kg) => M.arriba + (1 - (kg - y.desde) / (y.hasta - y.desde)) * alto;
    const puntos = pesos.map((p) => ({ ...p, x: px(ms(p.fecha)), y: py(p.pesoKg), meta: pesoDeLaMeta(meta, p.fecha) }));
    const marcasX = [];
    const pasos = 4;
    for (let i = 0; i <= pasos; i += 1) marcasX.push(x0 + ((x1 - x0) * i) / pasos);
    return { puntos, lineaMeta: lineaMeta?.map((p) => ({ x: px(p.t), y: py(p.kg), kg: p.kg })), y, py, px, marcasX };
  }, [pesos, meta, hoy]);

  const { puntos, lineaMeta, y, py, px, marcasX } = datos;
  const camino = (lista) => lista.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const ultimo = puntos.at(-1);
  const finMeta = lineaMeta?.at(-1);
  // Etiquetas directas al final de cada línea, separadas si quedan encima una de otra.
  const etiquetas = [ultimo && { clave: 'peso', y: ultimo.y, texto: `${decimal(ultimo.pesoKg)} kg` },
    finMeta && { clave: 'meta', y: finMeta.y, texto: `Meta ${decimal(Math.round(finMeta.kg * 10) / 10)}` }].filter(Boolean);
  if (etiquetas.length === 2 && Math.abs(etiquetas[0].y - etiquetas[1].y) < 16) {
    const [a, b] = etiquetas[0].y <= etiquetas[1].y ? etiquetas : [etiquetas[1], etiquetas[0]];
    const medio = (a.y + b.y) / 2;
    a.y = medio - 8;
    b.y = medio + 8;
  }

  function cercano(evento) {
    if (!puntos.length) return;
    const caja = svg.current.getBoundingClientRect();
    const x = ((evento.clientX - caja.left) / caja.width) * ANCHO;
    let mejor = 0;
    puntos.forEach((p, i) => { if (Math.abs(p.x - x) < Math.abs(puntos[mejor].x - x)) mejor = i; });
    setActivo(mejor);
  }
  function teclado(evento) {
    if (!puntos.length) return;
    if (evento.key === 'ArrowLeft' || evento.key === 'ArrowRight') {
      evento.preventDefault();
      const paso = evento.key === 'ArrowLeft' ? -1 : 1;
      setActivo((actual) => Math.min(puntos.length - 1, Math.max(0, (actual ?? puntos.length - 1) + (actual === null ? 0 : paso))));
    }
    if (evento.key === 'Escape') setActivo(null);
  }
  const marcado = activo !== null ? puntos[activo] : null;

  return (
    <figure className="grafico-peso">
      <ul className="grafico-peso__leyenda" aria-hidden="true">
        <li><span className="grafico-peso__clave grafico-peso__clave--peso" />{Tu} peso</li>
        {lineaMeta && <li><span className="grafico-peso__clave grafico-peso__clave--meta" />Ritmo de {de} meta</li>}
      </ul>
      <div className="grafico-peso__lienzo">
        <svg ref={svg} viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-labelledby={`${id}-titulo`} tabIndex={0}
          onPointerMove={cercano} onPointerLeave={() => setActivo(null)} onKeyDown={teclado} onBlur={() => setActivo(null)}>
          <title id={`${id}-titulo`}>
            {`Evolución de ${de} peso: ${puntos.length} pesajes${ultimo ? `, el último ${decimal(ultimo.pesoKg)} kg` : ''}${lineaMeta ? `; la línea punteada es el ritmo de ${de} meta` : ''}. Usa las flechas para recorrer los pesajes.`}
          </title>
          {y.marcas.map((kg) => (
            <g key={kg} className="grafico-peso__eje">
              <line x1={M.izquierda} x2={ANCHO - M.derecha} y1={py(kg)} y2={py(kg)} />
              <text x={M.izquierda - 8} y={py(kg)} dy="0.32em" textAnchor="end">{decimal(kg)}</text>
            </g>
          ))}
          {marcasX.map((t, i) => (
            <text key={t} className="grafico-peso__fecha" x={px(t)} y={ALTO - 8}
              textAnchor={i === 0 ? 'start' : i === marcasX.length - 1 ? 'end' : 'middle'}>{fechaCorta.format(new Date(t))}</text>
          ))}
          {lineaMeta && <path className="grafico-peso__meta" d={camino(lineaMeta)} />}
          {puntos.length > 1 && <path className="grafico-peso__linea" d={camino(puntos)} />}
          {marcado && <line className="grafico-peso__guia" x1={marcado.x} x2={marcado.x} y1={M.arriba} y2={ALTO - M.abajo} />}
          {puntos.map((p, i) => (
            <circle key={p.id ?? p.fecha} className={`grafico-peso__punto${i === activo ? ' grafico-peso__punto--activo' : ''}`} cx={p.x} cy={p.y} r={i === activo ? 5.5 : 4} />
          ))}
          {etiquetas.map((e) => (
            <text key={e.clave} className={`grafico-peso__etiqueta grafico-peso__etiqueta--${e.clave}`} x={ANCHO - M.derecha + 8} y={e.y} dy="0.32em">{e.texto}</text>
          ))}
        </svg>
        {marcado && (
          <div className="grafico-peso__tooltip" role="status"
            style={{ left: `${(marcado.x / ANCHO) * 100}%`, top: `${(marcado.y / ALTO) * 100}%` }}>
            <strong>{fechaTooltip.format(new Date(`${marcado.fecha}T00:00:00Z`))}</strong>
            <span>{decimal(marcado.pesoKg)} kg</span>
            {marcado.meta !== null && <span className="grafico-peso__tooltip-meta">Meta ese día: {decimal(Math.round(marcado.meta * 10) / 10)} kg</span>}
          </div>
        )}
      </div>
    </figure>
  );
}
