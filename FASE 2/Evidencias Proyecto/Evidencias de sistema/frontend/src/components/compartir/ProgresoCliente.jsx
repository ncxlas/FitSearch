import { useEffect, useState } from 'react';
import Alerta from '../Alerta.jsx';
import Icono from '../Icono.jsx';
import { DetallePlan } from '../comidas/PlanesComidas.jsx';
import { formatearNumero } from '../../services/formato.js';
import { obtenerProgresoCliente } from '../../services/compartir.js';
import './Compartir.css';

const diaCorto = new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
const fechaCorta = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dia = (iso) => new Date(`${iso}T00:00:00Z`);
const kg = (v) => `${String(v).replace('.', ',')} kg`;
const lista = (valores) => (valores?.length ? valores.join(', ') : 'Ninguna');

function Perfil({ datos }) {
  if (!datos) return <p className="texto-secundario">Aún no completa su perfil.</p>;
  const filas = [
    ['Edad', datos.edad ? `${datos.edad} años` : null], ['Sexo', datos.sexo], ['Estatura', datos.alturaCm ? `${formatearNumero(datos.alturaCm)} cm` : null],
    ['Peso', datos.pesoKg ? kg(datos.pesoKg) : null], ['Actividad física', datos.actividadFisica], ['Objetivo', datos.objetivo],
    ['Comidas al día', datos.comidasDia], ['Horas de sueño', datos.horasSueno],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '');
  return <dl className="progreso__datos">{filas.map(([t, v]) => <div key={t}><dt>{t}</dt><dd>{v}</dd></div>)}</dl>;
}

function Salud({ datos }) {
  if (!datos) return <p className="texto-secundario">Aún no completa su información de salud.</p>;
  return (
    <dl className="progreso__datos progreso__datos--una">
      <div><dt>Condiciones médicas</dt><dd>{lista(datos.condiciones)}</dd></div>
      <div><dt>Medicamentos</dt><dd>{datos.tomaMedicamentos ? lista(datos.medicamentos) : 'No toma'}</dd></div>
      <div><dt>Alergias</dt><dd>{lista(datos.alergias)}</dd></div>
    </dl>
  );
}

function Comidas({ datos }) {
  return (
    <div className="progreso__tabla">
      <table>
        <caption className="solo-lector">Calorías, macronutrientes y agua de los últimos 7 días</caption>
        <thead><tr><th scope="col">Día</th><th scope="col">Calorías</th><th scope="col">P / C / G</th><th scope="col">Agua</th></tr></thead>
        <tbody>
          {datos.dias.map((d) => (
            <tr key={d.fecha}>
              <th scope="row">{diaCorto.format(dia(d.fecha))}</th>
              <td>{d.calorias ? `${formatearNumero(d.calorias)} kcal` : '—'}{datos.metaCalorias && d.calorias ? <small> {Math.round((d.calorias / datos.metaCalorias) * 100)} %</small> : null}</td>
              <td>{d.calorias ? `${d.proteinasG} / ${d.carbohidratosG} / ${d.grasasG} g` : '—'}</td>
              <td>{d.aguaMl ? `${formatearNumero(d.aguaMl)} ml` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {datos.metaCalorias && <p className="texto-secundario">Meta diaria: {formatearNumero(datos.metaCalorias)} kcal.</p>}
    </div>
  );
}

function Peso({ datos }) {
  const ultimos = [...datos.pesos].reverse().slice(0, 8);
  return (
    <div className="progreso__peso">
      {datos.meta && <p>Meta: {datos.meta.objetivo.toLowerCase()} de {kg(datos.meta.pesoInicialKg)} a {kg(datos.meta.pesoObjetivoKg)}, {String(datos.meta.ritmoSemanalKg).replace('.', ',')} kg por semana (desde el {fechaCorta.format(dia(datos.meta.fechaInicio))}).</p>}
      {ultimos.length ? (
        <ul>{ultimos.map((p) => <li key={p.fecha}><span>{fechaCorta.format(dia(p.fecha))}</span><strong>{kg(p.pesoKg)}</strong></li>)}</ul>
      ) : <p className="texto-secundario">No tiene pesajes en los últimos 90 días.</p>}
    </div>
  );
}

function Planes({ datos }) {
  const m = datos.macronutrientes;
  return (
    <div className="progreso__planes">
      <p><strong>Plan de macronutrientes:</strong> {m.kcal ? `${formatearNumero(m.kcal)} kcal al día` : 'sin calorías (perfil incompleto)'} · {m.porcentajes.proteinas} % proteínas, {m.porcentajes.carbohidratos} % carbohidratos y {m.porcentajes.grasas} % grasas{m.tipo === 'personalizado' && m.nombre ? ` («${m.nombre}»)` : ' (según su meta)'}.</p>
      {datos.planComidas ? (
        <>
          <p><strong>Plan de comidas en uso:</strong> {datos.planComidas.nombre}</p>
          <DetallePlan plan={datos.planComidas} />
        </>
      ) : <p className="texto-secundario">No tiene un plan de comidas en uso.</p>}
    </div>
  );
}

const VISTAS = { perfil: Perfil, salud: Salud, comidas: Comidas, peso: Peso, planes: Planes };

// Progreso que el cliente decidió compartir (SC-45), en su ficha del espacio del profesional. Solo lectura.
export default function ProgresoCliente({ usuarioId, nombre }) {
  const [estado, setEstado] = useState({ cargando: true });
  const [pestana, setPestana] = useState(null);
  useEffect(() => {
    let activo = true;
    obtenerProgresoCliente(usuarioId)
      .then((datos) => { if (activo) { setEstado({ datos }); setPestana(datos.categorias[0]?.clave ?? null); } })
      .catch((error) => activo && setEstado({ error }));
    return () => { activo = false; };
  }, [usuarioId]);

  let cuerpo;
  if (estado.cargando) cuerpo = <p className="texto-secundario" role="status">Cargando su progreso…</p>;
  else if (estado.error?.estado === 403) {
    cuerpo = <p className="progreso__sin-permiso"><Icono nombre="escudo" tamano={18} /> {nombre} no comparte su progreso contigo. Puede hacerlo desde el chat con el botón «Compartir mi progreso».</p>;
  } else if (estado.error) cuerpo = <Alerta>{estado.error.message}</Alerta>;
  else {
    const { categorias, secciones } = estado.datos;
    const Vista = VISTAS[pestana];
    cuerpo = (
      <>
        <div className="editor-plan__segmentos progreso__pestanas" role="group" aria-label="Qué comparte">
          {categorias.map((c) => <button key={c.clave} type="button" aria-pressed={pestana === c.clave} onClick={() => setPestana(c.clave)}>{c.titulo}</button>)}
        </div>
        {Vista && <Vista datos={secciones[pestana]} />}
        <p className="texto-secundario progreso__nota">{nombre} ve cada vez que consultas su progreso.</p>
      </>
    );
  }
  return (
    <section className="progreso" aria-labelledby="titulo-progreso">
      <h2 id="titulo-progreso" className="historial__titulo">Progreso compartido</h2>
      {cuerpo}
    </section>
  );
}
