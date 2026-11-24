import { useEffect, useState } from 'react';
import Alerta from '../Alerta.jsx';
import Icono from '../Icono.jsx';
import EditorPlanComidas from './EditorPlanComidas.jsx';
import { DIAS } from './planComun.js';
import { formatearNumero } from '../../services/formato.js';
import {
  actualizarPlanComida, crearPlanComida, eliminarPlanComida, listarPlanesComida, usarPlanComida,
} from '../../services/comidas.service.js';
import './PlanesComidas.css';

const gramos = (g) => `${String(g).replace('.', ',')} g`;

// Detalle de un plan, de solo lectura: los momentos del día elegido con sus alimentos, gramos, calorías y notas.
export function DetallePlan({ plan, diaInicial }) {
  const [dia, setDia] = useState(plan.tipo === 'semana' ? (diaInicial ?? 1) : 0);
  const elegido = plan.dias.find((d) => d.dia === dia) ?? plan.dias[0];
  return (
    <div className="detalle-plan">
      {plan.tipo === 'semana' && (
        <div className="editor-plan__segmentos editor-plan__segmentos--dias" role="group" aria-label="Día de la semana">
          {DIAS.map((d) => (
            <button key={d.dia} type="button" aria-pressed={dia === d.dia} onClick={() => setDia(d.dia)}>
              <span aria-hidden="true">{d.corto}</span><span className="solo-lector">{d.nombre}</span>
            </button>
          ))}
        </div>
      )}
      <dl className="detalle-plan__momentos">
        {elegido.momentos.filter((m) => m.items.length).map((m) => (
          <div key={m.momento} className="detalle-plan__momento">
            <dt>{m.etiqueta}{m.totales.calorias > 0 && <span> · {formatearNumero(m.totales.calorias)} kcal</span>}</dt>
            {m.items.map((i) => (
              <dd key={i.id}>{i.nombre ? <>{i.nombre} <span className="texto-secundario">{gramos(i.gramos)}</span></> : <em>{i.nota}</em>}</dd>
            ))}
          </div>
        ))}
      </dl>
      {!elegido.momentos.some((m) => m.items.length) && <p className="texto-secundario">Este día no tiene comidas en el plan.</p>}
      <p className="detalle-plan__total"><strong>{formatearNumero(elegido.totales.calorias)} kcal</strong> {plan.tipo === 'semana' ? `el ${elegido.nombre.toLowerCase()}` : 'al día'}</p>
      {plan.nota && <p className="detalle-plan__nota"><Icono nombre="info" tamano={16} /> {plan.nota}</p>}
    </div>
  );
}

// Planes de comidas (SC-44): la lista (hasta 10, uno en uso), crear, editar, ver, usar y eliminar.
export default function PlanesComidas({ alCambiar }) {
  const [estado, setEstado] = useState({ cargando: true });
  const [editor, setEditor] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [confirmar, setConfirmar] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [errorEditor, setErrorEditor] = useState({ texto: '', detalles: {} });

  useEffect(() => {
    let activo = true;
    listarPlanesComida().then((datos) => activo && setEstado({ datos })).catch((error) => activo && setEstado({ error: error.message }));
    return () => { activo = false; };
  }, []);

  async function ejecutar(llamada, texto) {
    setOcupado(true);
    setMensaje(null);
    try {
      const datos = await llamada();
      setEstado({ datos });
      setMensaje({ tipo: 'exito', texto });
      alCambiar?.();
      return true;
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message });
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function guardar(datos, errorLocal) {
    if (!datos) { setErrorEditor({ texto: errorLocal, detalles: {} }); return; }
    setOcupado(true);
    setErrorEditor({ texto: '', detalles: {} });
    try {
      const nuevo = editor.plan ? await actualizarPlanComida(editor.plan.id, datos) : await crearPlanComida(datos);
      setEstado({ datos: nuevo });
      setMensaje({ tipo: 'exito', texto: editor.plan ? `Guardaste los cambios de «${datos.nombre}».` : `Creaste «${datos.nombre}»${datos.usar ? ' y lo usas desde hoy' : ''}.` });
      setEditor(null);
      alCambiar?.();
    } catch (error) {
      setErrorEditor({ texto: error.message, detalles: error.detalles || {} });
    } finally {
      setOcupado(false);
    }
  }

  if (estado.cargando) return <p className="comidas__estado" role="status">Cargando tus planes de comidas…</p>;
  if (estado.error) return <div className="comidas__estado"><Alerta>{estado.error}</Alerta></div>;
  const { planes, max } = estado.datos;

  if (editor) {
    return (
      <EditorPlanComidas key={editor.plan?.id ?? 'nuevo'} inicial={editor.plan} conUsar={!editor.plan}
        titulo={editor.plan ? `Editar «${editor.plan.nombre}»` : 'Nuevo plan de comidas'}
        guardando={ocupado} error={errorEditor.texto} detalles={errorEditor.detalles}
        alGuardar={guardar} alCancelar={() => { setEditor(null); setErrorEditor({ texto: '', detalles: {} }); }} />
    );
  }

  return (
    <div className="planes-comidas">
      <section className="panel-tarjeta planes-comidas__cabecera" aria-labelledby="titulo-planes-comidas">
        <div>
          <h2 id="titulo-planes-comidas" className="panel-tarjeta__titulo">Tus planes de comidas</h2>
          <p className="texto-secundario">Qué comer en cada momento del día. El plan en uso aparece en tu Resumen como «Hoy te toca…» y lo registras con un toque.</p>
        </div>
        <div className="planes-comidas__crear">
          <button type="button" className="boton boton--principal boton--compacto" disabled={planes.length >= max} onClick={() => { setMensaje(null); setEditor({ plan: null }); }}>
            <Icono nombre="mas" tamano={18} /> Crear plan
          </button>
          <span className="texto-secundario">{planes.length} de {max}</span>
        </div>
      </section>
      {mensaje && <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta>}

      {planes.length === 0 ? (
        <div className="planes-comidas__vacio panel-tarjeta">
          <span className="planes-comidas__vacio-icono" aria-hidden="true"><Icono nombre="comida" tamano={28} /></span>
          <p><strong>Aún no tienes planes de comidas.</strong> Arma uno para un día o para toda la semana, o pídele a tu nutricionista que te envíe el suyo por el chat.</p>
        </div>
      ) : (
        <ul className="planes-comidas__lista">
          {planes.map((plan) => (
            <li key={plan.id} className={`panel-tarjeta tarjeta-plan-comidas${plan.enUso ? ' tarjeta-plan-comidas--en-uso' : ''}`}>
              <div className="tarjeta-plan-comidas__encabezado">
                <div>
                  <h3>{plan.nombre}</h3>
                  <p className="tarjeta-plan-comidas__datos">
                    {plan.enUso && <span className="tarjeta-plan-comidas__chip"><Icono nombre="check" tamano={14} /> En uso</span>}
                    <span>{plan.tipo === 'semana' ? 'Semana' : 'Un día'}</span>
                    <span>≈ {formatearNumero(plan.caloriasPromedio)} kcal al día</span>
                    {plan.profesional && <span>De {plan.profesional.nombre}{plan.profesional.especialidad ? ` (${plan.profesional.especialidad})` : ''}</span>}
                  </p>
                </div>
              </div>
              {abierto === plan.id && <DetallePlan plan={plan} />}
              {confirmar === plan.id ? (
                <div className="tarjeta-plan-comidas__confirmar" role="group" aria-label={`Eliminar ${plan.nombre}`}>
                  <p>¿Eliminar «{plan.nombre}»? No se puede deshacer.</p>
                  <button type="button" className="boton boton--peligro boton--compacto" disabled={ocupado}
                    onClick={() => { setConfirmar(null); ejecutar(() => eliminarPlanComida(plan.id), `Eliminaste «${plan.nombre}».`); }}>Eliminar</button>
                  <button type="button" className="boton-texto" onClick={() => setConfirmar(null)}>Cancelar</button>
                </div>
              ) : (
                <div className="tarjeta-plan-comidas__acciones">
                  <button type="button" className={`boton ${plan.enUso ? 'boton--secundario' : 'boton--principal'} boton--compacto`} disabled={ocupado}
                    onClick={() => ejecutar(() => usarPlanComida(plan.id, !plan.enUso), plan.enUso ? `Dejaste de usar «${plan.nombre}».` : `Desde hoy usas «${plan.nombre}».`)}>
                    {plan.enUso ? 'Dejar de usar' : 'Usar este plan'}
                  </button>
                  <button type="button" className="boton-texto" aria-expanded={abierto === plan.id} onClick={() => setAbierto(abierto === plan.id ? null : plan.id)}>
                    {abierto === plan.id ? 'Ocultar' : 'Ver comidas'}
                  </button>
                  <button type="button" className="boton-texto" onClick={() => { setMensaje(null); setEditor({ plan }); }}>Editar</button>
                  <button type="button" className="boton-texto tarjeta-plan-comidas__eliminar" onClick={() => setConfirmar(plan.id)}>Eliminar</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="comidas__nota texto-secundario">Los planes son una guía para organizarte; no reemplazan la evaluación de un nutricionista.</p>
    </div>
  );
}
