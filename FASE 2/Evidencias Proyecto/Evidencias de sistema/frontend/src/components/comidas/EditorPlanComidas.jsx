import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Alerta from '../Alerta.jsx';
import Icono from '../Icono.jsx';
import { formatearNumero } from '../../services/formato.js';
import { aporte, buscarAlimentos, GRAMOS_MAX, GRAMOS_MIN, leerGramos, MOMENTOS } from '../../services/comidas.service.js';
import { DIAS } from './planComun.js';
import './PlanesComidas.css';

const ESPERA_BUSQUEDA_MS = 250;
let contador = 0;
const nuevaClave = () => { contador += 1; return `linea-${contador}`; };

// Líneas del editor a partir de un plan guardado (lista de días con momentos) o de un plan enviado (lista plana).
function lineasDesde(plan) {
  if (!plan) return [];
  if (Array.isArray(plan.items)) {
    return plan.items.map((i) => ({ clave: nuevaClave(), dia: i.dia, momento: i.momento, alimento: i.alimentoId ? { id: i.alimentoId, nombre: i.nombre ?? i.nombreAlimento, ...(i.valores ?? {}) } : null, gramos: i.gramos ? String(i.gramos).replace('.', ',') : '', nota: i.nota ?? '' }));
  }
  return plan.dias.flatMap((d) => d.momentos.flatMap((m) => m.items.map((i) => ({
    clave: nuevaClave(), dia: d.dia, momento: m.momento, gramos: i.gramos ? String(i.gramos).replace('.', ',') : '', nota: i.nota ?? '',
    // Valores por 100 g reconstruidos desde el aporte guardado, para recalcular al cambiar los gramos.
    alimento: i.alimentoId ? {
      id: i.alimentoId, nombre: i.nombre,
      ...(i.gramos && i.calorias !== null ? { calorias: (i.calorias * 100) / i.gramos, proteinasG: (i.proteinasG * 100) / i.gramos, carbohidratosG: (i.carbohidratosG * 100) / i.gramos, grasasG: (i.grasasG * 100) / i.gramos } : {}),
    } : null,
  }))));
}

function totales(lineas) {
  const t = { calorias: 0, proteinasG: 0, carbohidratosG: 0, grasasG: 0 };
  for (const l of lineas) {
    const g = l.alimento && leerGramos(l.gramos);
    if (!g || l.alimento.calorias === undefined) continue;
    const a = aporte(l.alimento, g);
    for (const k of Object.keys(t)) t[k] += a[k];
  }
  return { calorias: Math.round(t.calorias), proteinasG: Math.round(t.proteinasG), carbohidratosG: Math.round(t.carbohidratosG), grasasG: Math.round(t.grasasG) };
}

function BuscarAlimento({ momento, buscar, onElegir, onCerrar }) {
  const campo = useRef(null);
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState({ texto: '', alimentos: [], error: '' });
  const consulta = texto.trim();
  useEffect(() => { campo.current?.focus(); }, []);
  useEffect(() => {
    if (consulta.length < 2) return undefined;
    let activo = true;
    const espera = setTimeout(() => {
      buscar(consulta).then(({ alimentos }) => activo && setResultado({ texto: consulta, alimentos: alimentos.slice(0, 8), error: '' }))
        .catch((error) => activo && setResultado({ texto: consulta, alimentos: [], error: error.message }));
    }, ESPERA_BUSQUEDA_MS);
    return () => { activo = false; clearTimeout(espera); };
  }, [consulta, buscar]);
  const listo = resultado.texto === consulta && consulta.length >= 2;
  return (
    <div className="editor-plan__buscador">
      <div className="editor-plan__buscador-campo">
        <Icono nombre="buscar" tamano={18} />
        <input ref={campo} className="campo__control" value={texto} onChange={(e) => setTexto(e.target.value)}
          placeholder="Busca un alimento, por ejemplo «pollo»" aria-label={`Buscar alimento para ${momento}`}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onCerrar(); } }} />
        <button type="button" className="boton-texto" onClick={onCerrar}>Cancelar</button>
      </div>
      <div aria-live="polite">
        {consulta.length >= 2 && !listo && <p className="texto-secundario">Buscando…</p>}
        {listo && resultado.error && <Alerta>{resultado.error}</Alerta>}
        {listo && !resultado.error && !resultado.alimentos.length && <p className="texto-secundario">No encontramos «{consulta}» en el catálogo.</p>}
        {listo && resultado.alimentos.length > 0 && (
          <ul className="editor-plan__resultados" aria-label="Alimentos encontrados">
            {resultado.alimentos.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => onElegir(a)}>
                  <span>{a.nombre}</span><small>{formatearNumero(Math.round(a.calorias))} kcal / 100 g</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Editor de un plan de comidas (SC-44): nombre, un día o una semana, y para cada día los cinco momentos con alimentos del
// catálogo y sus gramos o notas libres. Lo usan la persona (Comidas › Plan de comidas) y el profesional al enviar un plan
// por el chat (SC-46), que le pasa su propia búsqueda del catálogo.
export default function EditorPlanComidas({
  inicial = null, titulo, textoGuardar = 'Guardar plan', conUsar = false, buscar = buscarAlimentos, guardando = false, error = '', detalles = {},
  alGuardar, alCancelar,
}) {
  const id = useId();
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [tipo, setTipo] = useState(inicial?.tipo ?? 'dia');
  const [nota, setNota] = useState(inicial?.nota ?? '');
  const [lineas, setLineas] = useState(() => lineasDesde(inicial));
  const [dia, setDia] = useState(inicial?.tipo === 'semana' ? 1 : 0);
  const [buscando, setBuscando] = useState(null);
  const [usar, setUsar] = useState(true);
  const [aviso, setAviso] = useState('');

  const delDia = useMemo(() => lineas.filter((l) => l.dia === dia), [lineas, dia]);
  const suma = totales(delDia);

  function cambiarTipo(nuevo) {
    if (nuevo === tipo) return;
    // Al pasar de un día a una semana, el día se copia a los siete; al revés, queda el lunes.
    setLineas((actuales) => (nuevo === 'semana'
      ? DIAS.flatMap(({ dia: d }) => actuales.filter((l) => l.dia === 0).map((l) => ({ ...l, clave: nuevaClave(), dia: d })))
      : actuales.filter((l) => l.dia === 1).map((l) => ({ ...l, dia: 0 }))));
    setTipo(nuevo);
    setDia(nuevo === 'semana' ? 1 : 0);
  }
  const actualizar = (clave, cambios) => setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)));
  const quitar = (clave) => setLineas((ls) => ls.filter((l) => l.clave !== clave));
  function agregarAlimento(momento, alimento) {
    setLineas((ls) => [...ls, { clave: nuevaClave(), dia, momento, alimento, gramos: '100', nota: '' }]);
    setBuscando(null);
  }
  const agregarNota = (momento) => setLineas((ls) => [...ls, { clave: nuevaClave(), dia, momento, alimento: null, gramos: '', nota: '' }]);
  function copiarATodos() {
    const base = lineas.filter((l) => l.dia === dia);
    setLineas([...DIAS.flatMap(({ dia: d }) => (d === dia ? base : base.map((l) => ({ ...l, clave: nuevaClave(), dia: d }))))]);
    setAviso(`Copiaste el ${DIAS[dia - 1].nombre.toLowerCase()} a toda la semana.`);
  }

  function guardar(evento) {
    evento.preventDefault();
    const items = lineas
      .filter((l) => l.alimento || l.nota.trim())
      .map((l) => (l.alimento
        ? { dia: l.dia, momento: l.momento, alimentoId: l.alimento.id, gramos: leerGramos(l.gramos), ...(l.nota.trim() && { nota: l.nota.trim() }) }
        : { dia: l.dia, momento: l.momento, nota: l.nota.trim() }));
    if (!nombre.trim()) { setAviso(''); alGuardar(null, 'Ponle un nombre al plan.'); return; }
    if (!items.length) { alGuardar(null, 'Agrega al menos un alimento o una nota.'); return; }
    if (items.some((i) => i.alimentoId && i.gramos === null)) { alGuardar(null, `Revisa los gramos: deben estar entre ${GRAMOS_MIN} y ${GRAMOS_MAX}.`); return; }
    alGuardar({ nombre: nombre.trim(), tipo, nota: nota.trim() || null, items, ...(conUsar && { usar }) });
  }

  return (
    <form className="editor-plan panel-tarjeta" onSubmit={guardar} noValidate aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`} className="panel-tarjeta__titulo">{titulo}</h2>
      <div className="editor-plan__datos">
        <label className="campo">
          <span className="campo__etiqueta">Nombre del plan</span>
          <input className="campo__control" value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej.: Semana liviana" aria-invalid={Boolean(detalles.nombre)} />
          {detalles.nombre && <span className="campo__mensaje" role="alert">{detalles.nombre}</span>}
        </label>
        <fieldset className="editor-plan__tipo">
          <legend className="campo__etiqueta">Para</legend>
          <div className="editor-plan__segmentos" role="group">
            <button type="button" aria-pressed={tipo === 'dia'} onClick={() => cambiarTipo('dia')}>Un día (se repite)</button>
            <button type="button" aria-pressed={tipo === 'semana'} onClick={() => cambiarTipo('semana')}>Una semana</button>
          </div>
        </fieldset>
      </div>

      {tipo === 'semana' && (
        <div className="editor-plan__dias">
          <div className="editor-plan__segmentos editor-plan__segmentos--dias" role="group" aria-label="Día de la semana">
            {DIAS.map((d) => (
              <button key={d.dia} type="button" aria-pressed={dia === d.dia} onClick={() => { setDia(d.dia); setBuscando(null); }}>
                <span aria-hidden="true">{d.corto}</span><span className="solo-lector">{d.nombre}</span>
                {lineas.some((l) => l.dia === d.dia) && <span className="editor-plan__punto" aria-hidden="true" />}
              </button>
            ))}
          </div>
          <button type="button" className="boton-texto" onClick={copiarATodos} disabled={!delDia.length}>
            <Icono nombre="capas" tamano={16} /> Copiar el {DIAS[dia - 1]?.nombre.toLowerCase()} a toda la semana
          </button>
        </div>
      )}
      {aviso && <p className="editor-plan__aviso" role="status">{aviso}</p>}

      <div className="editor-plan__momentos">
        {MOMENTOS.map(({ valor: momento, etiqueta }) => {
          const propias = delDia.filter((l) => l.momento === momento);
          return (
            <fieldset key={momento} className="editor-plan__momento"
              aria-label={tipo === 'semana' ? `${etiqueta} del ${DIAS[dia - 1].nombre.toLowerCase()}` : etiqueta}>
              <legend>{etiqueta}</legend>
              {propias.length > 0 && (
                <ul className="editor-plan__lineas">
                  {propias.map((l) => {
                    const g = l.alimento && leerGramos(l.gramos);
                    const kcal = g && l.alimento.calorias !== undefined ? aporte(l.alimento, g).calorias : null;
                    return (
                      <li key={l.clave} className={`editor-plan__linea${l.alimento ? '' : ' editor-plan__linea--nota'}`}>
                        {l.alimento ? (
                          <>
                            <span className="editor-plan__alimento">{l.alimento.nombre}</span>
                            <label className="editor-plan__gramos">
                              <input className="campo__control" inputMode="decimal" value={l.gramos} aria-label={`Gramos de ${l.alimento.nombre}`}
                                aria-invalid={l.gramos !== '' && g === null} onChange={(e) => actualizar(l.clave, { gramos: e.target.value })} />
                              <span aria-hidden="true">g</span>
                            </label>
                            <span className="editor-plan__kcal">{kcal !== null ? `${formatearNumero(kcal)} kcal` : ''}</span>
                          </>
                        ) : (
                          <input className="campo__control editor-plan__nota" value={l.nota} maxLength={200} placeholder="Ej.: ensalada a gusto"
                            aria-label={`Nota del ${etiqueta.toLowerCase()}`} onChange={(e) => actualizar(l.clave, { nota: e.target.value })} />
                        )}
                        <button type="button" className="editor-plan__quitar" aria-label={`Quitar ${l.alimento ? l.alimento.nombre : 'la nota'}`} onClick={() => quitar(l.clave)}>
                          <Icono nombre="cerrar" tamano={16} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {buscando === momento ? (
                <BuscarAlimento momento={etiqueta} buscar={buscar} onElegir={(a) => agregarAlimento(momento, a)} onCerrar={() => setBuscando(null)} />
              ) : (
                <div className="editor-plan__agregar">
                  <button type="button" className="boton-texto" onClick={() => setBuscando(momento)} disabled={propias.length >= 12}>
                    <Icono nombre="mas" tamano={16} /> Alimento
                  </button>
                  <button type="button" className="boton-texto" onClick={() => agregarNota(momento)} disabled={propias.length >= 12}>
                    <Icono nombre="mas" tamano={16} /> Nota
                  </button>
                </div>
              )}
            </fieldset>
          );
        })}
      </div>

      <p className="editor-plan__totales" aria-live="polite">
        <strong>{formatearNumero(suma.calorias)} kcal</strong>{tipo === 'semana' ? ` el ${DIAS[dia - 1].nombre.toLowerCase()}` : ' al día'}
        <span> · proteínas {formatearNumero(suma.proteinasG)} g · carbohidratos {formatearNumero(suma.carbohidratosG)} g · grasas {formatearNumero(suma.grasasG)} g</span>
      </p>

      <label className="campo">
        <span className="campo__etiqueta">Indicaciones generales (opcional)</span>
        <textarea className="campo__control" rows={2} maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)}
          placeholder="Ej.: toma 2 litros de agua al día" />
      </label>
      {conUsar && (
        <label className="editor-plan__usar">
          <input type="checkbox" checked={usar} onChange={(e) => setUsar(e.target.checked)} /> Usar este plan desde hoy
        </label>
      )}
      <Alerta>{error}</Alerta>
      <div className="editor-plan__acciones">
        <button type="button" className="boton boton--secundario boton--compacto" onClick={alCancelar} disabled={guardando}>Cancelar</button>
        <button type="submit" className="boton boton--principal boton--compacto" disabled={guardando}>{guardando ? 'Guardando…' : textoGuardar}</button>
      </div>
    </form>
  );
}
