import { useState } from 'react';
import { Link } from 'react-router-dom';
import reglas from '@shared/reglas.json';
import Alerta from '../Alerta.jsx';
import Dialogo from '../Dialogo.jsx';
import Icono from '../Icono.jsx';
import EditorPlanComidas from '../comidas/EditorPlanComidas.jsx';
import { DetallePlan } from '../comidas/PlanesComidas.jsx';
import { formatearNumero } from '../../services/formato.js';
import { buscarAlimentosProfesional, enviarPlan, guardarPlanRecibido } from '../../services/planesChat.js';
import './PlanesPorChat.css';

const { personalizado: LIMITES, nombrePersonalizado } = reglas.comidas.planes;
const MACROS = [['proteinas', 'Proteínas'], ['carbohidratos', 'Carbohidratos'], ['grasas', 'Grasas']];
const DESTINO = { plan_comidas: { seccion: 'planes-comida', texto: 'Plan de comidas' }, plan_macros: { seccion: 'plan', texto: 'Plan de macronutrientes' } };

// Tarjeta de un plan que llegó por el chat (SC-46). La persona que lo recibe lo guarda en sus planes con un botón, una vez.
export function PlanAdjunto({ chatId, mensaje, puedeGuardar, nombreCliente, onGuardado }) {
  const { adjunto } = mensaje;
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState({ ocupado: false, error: '' });
  const esComidas = adjunto.tipo === 'plan_comidas';
  const { plan } = adjunto;
  const destino = DESTINO[adjunto.tipo];

  async function guardar() {
    setEstado({ ocupado: true, error: '' });
    try {
      await guardarPlanRecibido(chatId, mensaje.id);
      setEstado({ ocupado: false, error: '' });
      onGuardado?.();
    } catch (error) {
      setEstado({ ocupado: false, error: error.message });
    }
  }

  return (
    <div className="plan-adjunto">
      <div className="plan-adjunto__cabecera">
        <span className="plan-adjunto__icono" aria-hidden="true"><Icono nombre={esComidas ? 'comida' : 'grafico'} tamano={20} /></span>
        <span className="plan-adjunto__titulo">
          <small>{esComidas ? `Plan de comidas · ${plan.tipo === 'semana' ? 'una semana' : 'un día'}` : 'Plan de macronutrientes'}</small>
          <strong>{plan.nombre}</strong>
        </span>
      </div>
      {esComidas ? (
        <p className="plan-adjunto__resumen">
          {plan.caloriasPromedio ? `${formatearNumero(plan.caloriasPromedio)} kcal ${plan.tipo === 'semana' ? 'al día en promedio' : 'en el día'}` : 'Con notas, sin alimentos del catálogo'}
          {plan.nota ? ` · ${plan.nota}` : ''}
        </p>
      ) : (
        <ul className="plan-adjunto__macros" aria-label="Reparto de calorías">
          {MACROS.map(([clave, nombre]) => <li key={clave}><strong>{plan[clave]} %</strong> {nombre.toLowerCase()}</li>)}
        </ul>
      )}
      {esComidas && (
        <button type="button" className="boton-texto plan-adjunto__ver" aria-expanded={abierto} onClick={() => setAbierto((a) => !a)}>
          {abierto ? 'Ocultar el detalle' : 'Ver el detalle'}
        </button>
      )}
      {esComidas && abierto && <div className="plan-adjunto__detalle"><DetallePlan plan={plan} /></div>}
      <div className="plan-adjunto__pie">
        {adjunto.guardadoEn ? (
          <span className="plan-adjunto__guardado" role="status">
            <Icono nombre="check" tamano={16} />
            {puedeGuardar
              ? <>Guardado en tus planes · <Link to={`/comidas?seccion=${destino.seccion}`}>Ver en {destino.texto}</Link></>
              : `${nombreCliente} lo guardó en sus planes`}
          </span>
        ) : puedeGuardar ? (
          <button type="button" className="boton boton--principal boton--compacto" disabled={estado.ocupado} onClick={guardar}>
            {estado.ocupado ? 'Guardando…' : 'Guardar en mis planes'}
          </button>
        ) : <span className="plan-adjunto__pendiente">Aún no lo guarda</span>}
      </div>
      <Alerta>{estado.error}</Alerta>
    </div>
  );
}

function FormularioMacros({ ocupado, error, detalles, alEnviar, alVolver }) {
  const [valores, setValores] = useState({ nombre: '', proteinas: 30, carbohidratos: 40, grasas: 30, texto: '' });
  const suma = MACROS.reduce((s, [c]) => s + (Number(valores[c]) || 0), 0);
  const fuera = MACROS.some(([c]) => !Number.isInteger(Number(valores[c])) || valores[c] < LIMITES.min || valores[c] > LIMITES.max);
  const listo = valores.nombre.trim() && suma === 100 && !fuera;
  return (
    <form className="enviar-plan__macros" noValidate onSubmit={(e) => {
      e.preventDefault();
      if (!listo) return;
      alEnviar({ nombre: valores.nombre.trim(), proteinas: Number(valores.proteinas), carbohidratos: Number(valores.carbohidratos), grasas: Number(valores.grasas) }, valores.texto);
    }}>
      <label className="campo">
        <span className="campo__etiqueta">Nombre del plan</span>
        <input className="campo__control" value={valores.nombre} maxLength={nombrePersonalizado.max} placeholder="Ej.: Alto en proteína"
          onChange={(e) => setValores((v) => ({ ...v, nombre: e.target.value }))} aria-invalid={Boolean(detalles.nombre)} />
        {detalles.nombre && <span className="campo__mensaje" role="alert">{detalles.nombre}</span>}
      </label>
      <fieldset className="enviar-plan__porcentajes" aria-describedby="suma-macros">
        <legend className="campo__etiqueta">Reparto de las calorías</legend>
        {MACROS.map(([clave, nombre]) => (
          <label key={clave} className="campo">
            <span className="campo__etiqueta">{nombre} (%)</span>
            <input className="campo__control" type="number" inputMode="numeric" min={LIMITES.min} max={LIMITES.max} step={1} value={valores[clave]}
              onChange={(e) => setValores((v) => ({ ...v, [clave]: e.target.value === '' ? '' : Number(e.target.value) }))} />
          </label>
        ))}
        <p id="suma-macros" className={`enviar-plan__suma${suma === 100 ? ' enviar-plan__suma--ok' : ''}`} aria-live="polite">
          {suma === 100 ? 'Suman 100 %.' : `Suman ${suma} %: ajústalos para llegar a 100 %.`} Cada uno entre {LIMITES.min} y {LIMITES.max} %.
        </p>
      </fieldset>
      <label className="campo">
        <span className="campo__etiqueta">Mensaje (opcional)</span>
        <textarea className="campo__control" rows={2} maxLength={500} value={valores.texto}
          onChange={(e) => setValores((v) => ({ ...v, texto: e.target.value }))} placeholder="Ej.: Pruébalo dos semanas y lo revisamos." />
      </label>
      <p className="texto-secundario enviar-plan__nota">Las calorías salen del perfil de tu cliente: el plan solo define cómo se reparten.</p>
      <Alerta>{error}</Alerta>
      <div className="dialogo__acciones">
        <button type="button" className="boton boton--secundario" disabled={ocupado} onClick={alVolver}>Volver</button>
        <button type="submit" className="boton boton--principal" disabled={ocupado || !listo}>{ocupado ? 'Enviando…' : 'Enviar plan'}</button>
      </div>
    </form>
  );
}

// Botón del chat (lado del profesional): elige qué plan enviar y lo arma con el mismo editor que usa la persona.
export function EnviarPlan({ chatId, nombreCliente, onEnviado }) {
  const [paso, setPaso] = useState(null);
  const [estado, setEstado] = useState({ ocupado: false, error: '', detalles: {} });
  const cerrar = () => { setPaso(null); setEstado({ ocupado: false, error: '', detalles: {} }); };

  async function enviar(tipo, plan, texto = '') {
    setEstado({ ocupado: true, error: '', detalles: {} });
    try {
      await enviarPlan(chatId, { tipo, plan, texto });
      cerrar();
      onEnviado?.();
    } catch (error) {
      setEstado({ ocupado: false, error: error.message, detalles: error.detalles ?? {} });
    }
  }

  return (
    <>
      <button type="button" className="boton-icono" aria-label="Enviar un plan" title="Enviar un plan" onClick={() => setPaso('elegir')}>
        <Icono nombre="capas" tamano={20} />
      </button>
      {paso && (
        <Dialogo titulo={paso === 'macros' ? 'Enviar un plan de macronutrientes' : paso === 'comidas' ? 'Enviar un plan de comidas' : `Enviar un plan a ${nombreCliente}`}
          descripcion={paso === 'elegir' ? `Llega como un mensaje y ${nombreCliente} lo guarda en sus planes con un botón.` : undefined}
          ancho={paso === 'comidas' ? 'ancho' : 'normal'} ocupado={estado.ocupado} onCerrar={cerrar}>
          {paso === 'elegir' && (
            <ul className="enviar-plan__opciones">
              <li>
                <button type="button" onClick={() => setPaso('comidas')}>
                  <Icono nombre="comida" tamano={22} />
                  <span><strong>Plan de comidas</strong><small>Un día que se repite o una semana, con alimentos del catálogo y notas.</small></span>
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setPaso('macros')}>
                  <Icono nombre="grafico" tamano={22} />
                  <span><strong>Plan de macronutrientes</strong><small>Cómo repartir las calorías del día entre proteínas, carbohidratos y grasas.</small></span>
                </button>
              </li>
            </ul>
          )}
          {paso === 'comidas' && (
            <EditorPlanComidas titulo={`Plan de comidas para ${nombreCliente}`} textoGuardar="Enviar plan" buscar={buscarAlimentosProfesional}
              guardando={estado.ocupado} error={estado.error} detalles={estado.detalles}
              alGuardar={(plan, aviso) => (plan ? enviar('comidas', plan) : setEstado((e) => ({ ...e, error: aviso })))} alCancelar={() => setPaso('elegir')} />
          )}
          {paso === 'macros' && (
            <FormularioMacros ocupado={estado.ocupado} error={estado.error} detalles={estado.detalles}
              alEnviar={(plan, texto) => enviar('macros', plan, texto)} alVolver={() => setPaso('elegir')} />
          )}
        </Dialogo>
      )}
    </>
  );
}
