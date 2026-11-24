import { useEffect, useState } from 'react';
import Alerta from '../Alerta.jsx';
import Dialogo from '../Dialogo.jsx';
import Icono from '../Icono.jsx';
import { formatearNumero } from '../../services/formato.js';
import { diaDeLaSemana, leerGramos, listarPlanesComida, registrarDesdePlan } from '../../services/comidas.service.js';
import './PlanesComidas.css';

const gramos = (g) => `${String(g).replace('.', ',')} g`;

// «Lo comí»: confirma qué alimentos del momento se comieron y con cuántos gramos; las notas no se registran.
function ConfirmarComida({ plan, momento, fecha, alListo, alCerrar }) {
  const alimentos = momento.items.filter((i) => i.alimentoId);
  const [elegidos, setElegidos] = useState(() => alimentos.map((i) => ({ ...i, marcado: true, texto: String(i.gramos).replace('.', ',') })));
  const [estado, setEstado] = useState({ ocupado: false, error: '' });
  const marcados = elegidos.filter((e) => e.marcado);
  const validos = marcados.every((e) => leerGramos(e.texto));
  const kcal = marcados.reduce((s, e) => {
    const g = leerGramos(e.texto);
    return s + (g && e.gramos ? Math.round((e.calorias * g) / e.gramos) : 0);
  }, 0);

  async function registrar() {
    setEstado({ ocupado: true, error: '' });
    try {
      await registrarDesdePlan(plan.id, { fecha, momento: momento.momento, items: marcados.map((e) => ({ alimentoId: e.alimentoId, gramos: leerGramos(e.texto) })) });
      alListo(`Registraste tu ${momento.etiqueta.toLowerCase()} del plan.`);
    } catch (error) {
      setEstado({ ocupado: false, error: error.message });
    }
  }

  return (
    <Dialogo titulo={`¿Qué comiste en tu ${momento.etiqueta.toLowerCase()}?`} ocupado={estado.ocupado} onCerrar={alCerrar}
      descripcion="Desmarca lo que no comiste y ajusta los gramos si fueron distintos.">
      <ul className="confirmar-comida__lista">
        {elegidos.map((e, i) => (
          <li key={e.id}>
            <label className="confirmar-comida__alimento">
              <input type="checkbox" checked={e.marcado} onChange={(ev) => setElegidos((l) => l.map((x, j) => (j === i ? { ...x, marcado: ev.target.checked } : x)))} />
              {e.nombre}
            </label>
            <label className="editor-plan__gramos">
              <input className="campo__control" inputMode="decimal" value={e.texto} disabled={!e.marcado} aria-label={`Gramos de ${e.nombre}`}
                aria-invalid={e.marcado && !leerGramos(e.texto)} onChange={(ev) => setElegidos((l) => l.map((x, j) => (j === i ? { ...x, texto: ev.target.value } : x)))} />
              <span aria-hidden="true">g</span>
            </label>
          </li>
        ))}
      </ul>
      {momento.items.filter((i) => !i.alimentoId).map((i) => <p key={i.id} className="confirmar-comida__nota"><Icono nombre="info" tamano={16} /> {i.nota}</p>)}
      <p className="confirmar-comida__total" aria-live="polite">Suma {formatearNumero(kcal)} kcal</p>
      <Alerta>{estado.error}</Alerta>
      <div className="dialogo__acciones">
        <button type="button" className="boton boton--secundario" onClick={alCerrar} disabled={estado.ocupado}>Cancelar</button>
        <button type="button" className="boton boton--principal" onClick={registrar} disabled={!marcados.length || !validos || estado.ocupado}>
          {estado.ocupado ? 'Registrando…' : 'Registrar'}
        </button>
      </div>
    </Dialogo>
  );
}

// «Hoy te toca…» (SC-44): las comidas que el plan en uso propone para el día que se está viendo, con «Lo comí».
export default function HoyTeToca({ fecha, esHoy, version, alRegistrar, alVerPlanes }) {
  const [plan, setPlan] = useState(undefined);
  const [confirmando, setConfirmando] = useState(null);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    let activo = true;
    listarPlanesComida().then(({ planes }) => activo && setPlan(planes.find((p) => p.enUso) ?? null)).catch(() => activo && setPlan(null));
    return () => { activo = false; };
  }, [version]);

  if (!plan) return null;
  const dia = plan.tipo === 'semana' ? diaDeLaSemana(fecha) : 0;
  const delDia = plan.dias.find((d) => d.dia === dia);
  const momentos = delDia?.momentos.filter((m) => m.items.length) ?? [];

  return (
    <section className="panel-tarjeta hoy-te-toca" aria-labelledby="titulo-hoy-te-toca">
      <div className="hoy-te-toca__encabezado">
        <h2 id="titulo-hoy-te-toca" className="panel-tarjeta__titulo">{esHoy ? 'Hoy te toca' : `${delDia?.nombre ?? 'Ese día'} te tocaba`}</h2>
        <button type="button" className="enlace-panel boton-texto" onClick={alVerPlanes}>{plan.nombre} <Icono nombre="flecha" tamano={16} /></button>
      </div>
      {momentos.length === 0 ? (
        <p className="texto-secundario">Tu plan no tiene comidas para este día.</p>
      ) : (
        <ul className="hoy-te-toca__momentos">
          {momentos.map((m) => (
            <li key={m.momento}>
              <div className="hoy-te-toca__texto">
                <strong>{m.etiqueta}{m.totales.calorias > 0 && <span className="texto-secundario"> · {formatearNumero(m.totales.calorias)} kcal</span>}</strong>
                <span>{m.items.map((i) => (i.nombre ? `${i.nombre} ${gramos(i.gramos)}` : i.nota)).join(' · ')}</span>
              </div>
              {m.items.some((i) => i.alimentoId) && (
                <button type="button" className="boton boton--secundario boton--compacto hoy-te-toca__boton" onClick={() => { setMensaje(''); setConfirmando(m); }}>
                  <Icono nombre="check" tamano={16} /> Lo comí
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {mensaje && <Alerta tipo="exito">{mensaje}</Alerta>}
      {confirmando && (
        <ConfirmarComida plan={plan} momento={confirmando} fecha={fecha} alCerrar={() => setConfirmando(null)}
          alListo={(texto) => { setConfirmando(null); setMensaje(texto); alRegistrar?.(); }} />
      )}
    </section>
  );
}

