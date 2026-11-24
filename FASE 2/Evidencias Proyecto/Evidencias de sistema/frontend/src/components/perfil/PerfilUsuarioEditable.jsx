import { useState } from 'react';
import Icono from '../Icono.jsx';
import Alerta from '../Alerta.jsx';
import PerfilEditable from './PerfilEditable.jsx';
import InformacionCuenta from './InformacionCuenta.jsx';
import useCuentaPerfil from './useCuentaPerfil.js';
import PasoDatosPersonales from './PasoDatosPersonales.jsx';
import PasoObjetivos from './PasoObjetivos.jsx';
import PasoSalud from './PasoSalud.jsx';

const PASOS = [
  { paso: 'datosPersonales', seccion: 'fisicos', titulo: 'Datos físicos' },
  { paso: 'objetivos', seccion: 'objetivos', titulo: 'Objetivos y estilo de vida' },
  { paso: 'salud', seccion: 'salud', titulo: 'Información de salud' },
];

// Desde el 15-11-2026 el cuadro solo aparece si a su perfil le falta algo, con un acceso a cada sección pendiente.
// Con el perfil completo no se muestra: ya no aporta nada.
function PerfilPendiente({ pasos, onIr }) {
  const faltan = PASOS.filter(({ paso }) => pasos?.[paso] === false);
  if (faltan.length === 0) return null;
  return (
    <div className="perfil-editor__pendiente">
      <Icono nombre="info" tamano={22} />
      <div>
        <strong>Completa tu perfil</strong>
        <p>Te falta completar:</p>
        <ul>
          {faltan.map(({ seccion, titulo }) => (
            <li key={seccion}><button type="button" className="boton-texto" onClick={() => onIr(seccion)}>{titulo}</button></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function PerfilUsuarioEditable({ datos, onGuardado }) {
  const cuentaEstado = useCuentaPerfil();
  const [activa, setActiva] = useState('informacion');
  const [mensaje, setMensaje] = useState(null);
  const nombre = cuentaEstado.cuenta?.nombre || datos.usuario.nombre;
  function guardar(respuesta) { onGuardado(respuesta); setMensaje({ texto: 'Cambios guardados.', id: Date.now() }); }
  const cambiar = (seccion) => { setActiva(seccion); setMensaje(''); };
  const props = { onGuardado: guardar, onVolver: () => { setMensaje(''); setActiva('informacion'); }, textoVolver: 'Cancelar', textoPrincipal: 'Guardar cambios' };
  const secciones = [
    { id: 'informacion', titulo: 'Información personal', icono: 'usuario', ayuda: 'Actualiza tus datos desde aquí.', contenido: <InformacionCuenta estado={cuentaEstado} /> },
    { id: 'fisicos', titulo: 'Datos físicos', icono: 'balanza', ayuda: 'Estos datos nos ayudan a calcular tu estimación nutricional.', contenido: <PasoDatosPersonales perfil={datos.perfil} {...props} /> },
    { id: 'objetivos', titulo: 'Objetivos y estilo de vida', icono: 'objetivoMantener', ayuda: 'Ajusta tus metas y los hábitos de tu día a día.', contenido: <PasoObjetivos objetivos={datos.objetivos} {...props} /> },
    { id: 'salud', titulo: 'Información de salud', icono: 'corazon', ayuda: 'Tus condiciones, medicamentos y alergias son información privada.', contenido: <PasoSalud salud={datos.salud} {...props} /> },
  ];
  // Por decisión del PO (15-11-2026), «Mi perfil» ya no muestra el requerimiento calórico: se ve al terminar el
  // asistente y en el plan de alimentación de Comidas.
  return <PerfilEditable titulo="Mi perfil" subtitulo="Tus datos y objetivos, siempre a mano." nombre={nombre} rol="Usuario"
    cuentaEstado={cuentaEstado} activa={activa} onCambiar={cambiar} secciones={secciones}
    aviso={<Alerta key={mensaje?.id} tipo="exito">{mensaje?.texto}</Alerta>}
    resumen={<PerfilPendiente pasos={datos.pasos} onIr={cambiar} />} />;
}
