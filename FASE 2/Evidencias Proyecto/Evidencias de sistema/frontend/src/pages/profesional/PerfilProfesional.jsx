import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alerta from '../../components/Alerta.jsx';
import { Calificacion } from '../../components/Calificacion.jsx';
import Icono from '../../components/Icono.jsx';
import FormularioFicha from '../../components/profesional/FormularioFicha.jsx';
import Certificaciones from '../../components/profesional/Certificaciones.jsx';
import Experiencia from '../../components/profesional/Experiencia.jsx';
import PerfilEditable from '../../components/perfil/PerfilEditable.jsx';
import InformacionCuenta from '../../components/perfil/InformacionCuenta.jsx';
import useCuentaPerfil from '../../components/perfil/useCuentaPerfil.js';
import { useSesion } from '../../context/SesionContext.jsx';
import { etiquetaModalidad } from '../../services/formato.js';
import { obtenerMiFicha, obtenerProfesional } from '../../services/profesional.service.js';
import './PerfilProfesional.css';

function CompartirPerfil({ id }) {
  const [copiando, setCopiando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [manual, setManual] = useState(false);
  const enlace = new URL(`/profesionales/${id}`, window.location.origin).href;

  async function copiar() {
    setCopiando(true);
    setCopiado(false);
    setManual(false);
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
    } catch {
      setManual(true);
    } finally {
      setCopiando(false);
    }
  }

  return (
    <footer className="perfil-prof__acciones">
      <div className="perfil-prof__botones">
        <button type="button" className="boton boton--secundario boton--compacto" disabled={copiando} onClick={copiar}>
          <Icono nombre={copiado ? 'check' : 'enlace'} tamano={18} /> {copiado ? 'Enlace copiado' : 'Copiar enlace'}
        </button>
        <Link to="/profesional/perfil/publico" className="boton boton--secundario boton--compacto">
          <Icono nombre="ojo" tamano={18} /> Ver mi perfil público
        </Link>
      </div>
      {copiado && <p className="perfil-prof__copia" role="status">Enlace de tu perfil copiado.</p>}
      {manual && (
        <label className="perfil-prof__enlace-manual">
          No pudimos copiarlo automáticamente. Selecciona y copia este enlace:
          <input readOnly value={enlace} onFocus={(e) => e.target.select()} />
        </label>
      )}
    </footer>
  );
}


export default function PerfilProfesional() {
  const { sesion } = useSesion();
  const cuentaEstado = useCuentaPerfil();
  const [estado, setEstado] = useState({ cargando: true });
  const [intento, setIntento] = useState(0);
  const [activa, setActiva] = useState('informacion');
  const [editor, setEditor] = useState(0);
  const [mensaje, setMensaje] = useState('');
  useEffect(() => {
    let vigente = true;
    obtenerMiFicha().then(async ({ ficha }) => {
      const publica = ficha ? await obtenerProfesional(ficha.id) : null;
      if (!vigente) return;
      setEstado({ ficha, profesional: publica?.profesional });
      // Sin ficha, el perfil abre directamente en la sección para completarla (15-11-2026).
      if (!ficha) setActiva((actual) => (actual === 'informacion' ? 'ficha' : actual));
    }).catch((e) => { if (vigente) setEstado({ error: e.message }); });
    return () => { vigente = false; };
  }, [intento]);
  const p = estado.profesional;
  function alGuardarFicha() {
    setMensaje('Tu ficha profesional se guardó correctamente.');
    setIntento((v) => v + 1);
  }
  // Mientras carga la ficha (o si falló), las secciones que dependen de ella lo indican.
  const sinFicha = estado.cargando ? <p role="status">Cargando tu ficha profesional…</p> : estado.error ? <>
    <Alerta>{estado.error}</Alerta><button type="button" className="boton-texto" onClick={() => setIntento((v) => v + 1)}>Reintentar</button>
  </> : null;
  const completaFicha = (texto) => <p className="perfil-prof__aviso"><Icono nombre="info" tamano={20} /> {texto}</p>;
  // Desde el 15-11-2026, el mismo flujo que el perfil del usuario: cada sección por separado y solo una abierta a la
  // vez (antes, información, especialidad y experiencia estaban juntas en una sola sección).
  const secciones = [
    { id: 'informacion', titulo: 'Información personal', icono: 'usuario', ayuda: 'Tus datos de contacto y tu presentación.', contenido: <>
      {!estado.cargando && !estado.error && !estado.ficha && completaFicha('Completa tu ficha en «Especialidad y lugar de atención» para aparecer en el buscador de FitSearch.')}
      <InformacionCuenta estado={cuentaEstado} profesional />
    </> },
    { id: 'ficha', titulo: 'Especialidad y lugar de atención', icono: 'medico', ayuda: 'Lo que ven los usuarios en el buscador y en tu perfil público.',
      contenido: sinFicha ?? <>
        {!estado.ficha && completaFicha('Completa tu ficha para aparecer en el buscador de FitSearch.')}
        <FormularioFicha key={editor} ficha={estado.ficha} onGuardado={alGuardarFicha}
          onCancelar={estado.ficha ? () => { setEditor((v) => v + 1); setMensaje(''); } : undefined} />
      </> },
    { id: 'experiencia', titulo: 'Experiencia y formación', icono: 'birrete', ayuda: 'Comparte tu trayectoria y a quiénes atiendes.',
      contenido: sinFicha ?? (estado.ficha ? <Experiencia /> : completaFicha('Completa tu ficha profesional para agregar tu experiencia y formación.')) },
    { id: 'certificaciones', titulo: 'Certificaciones', icono: 'escudo', ayuda: 'Tus documentos y el estado de tu verificación.',
      contenido: sinFicha ?? (estado.ficha ? <Certificaciones /> : completaFicha('Completa tu ficha profesional antes de solicitar la verificación.')) },
  ];
  return <PerfilEditable titulo="Mi perfil profesional" subtitulo="Tu información, lista para conectar con más personas."
    nombre={cuentaEstado.cuenta?.nombre || p?.nombre || sesion.usuario.nombre} rol={p?.especialidad || 'Profesional'} cuentaEstado={cuentaEstado}
    activa={activa} onCambiar={(s) => { setActiva(s); setMensaje(''); }} secciones={secciones}
    aviso={<Alerta tipo="exito">{mensaje}</Alerta>}
    identidad={p && <>
      <span className={p.verificado ? 'perfil-prof__verificado' : 'perfil-prof__sin-verificar'}>
        {p.verificado && <Icono nombre="escudo" tamano={16} />}{p.verificado ? 'Verificado' : 'Sin verificar'}
      </span>
      <Calificacion promedio={p.calificacion.promedio} total={p.calificacion.total} />
      <p className="perfil-editor__antiguedad"><Icono nombre={p.modalidad === 'online' ? 'video' : 'pin'} tamano={16} />{p.modalidad === 'online' ? 'Atención online' : p.comuna || 'Comuna por confirmar'}</p>
      <p className="perfil-editor__antiguedad">{etiquetaModalidad(p.modalidad)}</p>
    </>}
    pie={<div className="perfil-editor__mini-resumen"><Link to="/profesional/agenda" className="boton boton--secundario boton--compacto"><Icono nombre="calendario" tamano={18} /> Ir a mi agenda</Link></div>}
    acciones={p && <CompartirPerfil id={p.id} />} />;
}
