import { useState } from 'react';
import Icono from '../Icono.jsx';
import Alerta from '../Alerta.jsx';
import PerfilEditable from './PerfilEditable.jsx';
import InformacionCuenta from './InformacionCuenta.jsx';
import useCuentaPerfil from './useCuentaPerfil.js';
import PasoDatosPersonales from './PasoDatosPersonales.jsx';
import PasoObjetivos from './PasoObjetivos.jsx';
import PasoSalud from './PasoSalud.jsx';
import { TarjetaEstimacion } from './piezas.jsx';

export default function PerfilUsuarioEditable({ datos, onGuardado }) {
  const cuentaEstado = useCuentaPerfil();
  const [activa, setActiva] = useState('informacion');
  const [mensaje, setMensaje] = useState('');
  const nombre = cuentaEstado.cuenta?.nombre || datos.usuario.nombre;
  function guardar(respuesta) { onGuardado(respuesta); setMensaje('Tus cambios se guardaron correctamente.'); }
  const props = { onGuardado: guardar, onVolver: () => { setMensaje(''); setActiva('informacion'); }, textoVolver: 'Cancelar', textoPrincipal: 'Guardar cambios' };
  const secciones = [
    { id: 'informacion', titulo: 'Información personal', icono: 'usuario', ayuda: 'Actualiza tus datos desde aquí.', contenido: <InformacionCuenta estado={cuentaEstado} /> },
    { id: 'fisicos', titulo: 'Datos físicos', icono: 'balanza', ayuda: 'Estos datos nos ayudan a calcular tu estimación nutricional.', contenido: <><div className="perfil-editor__estimacion-movil"><TarjetaEstimacion kcal={datos.requerimientoCaloricoKcal} /></div><PasoDatosPersonales perfil={datos.perfil} {...props} /></> },
    { id: 'objetivos', titulo: 'Objetivos y estilo de vida', icono: 'objetivoMantener', ayuda: 'Ajusta tus metas y los hábitos de tu día a día.', contenido: <PasoObjetivos objetivos={datos.objetivos} {...props} /> },
    { id: 'salud', titulo: 'Información de salud', icono: 'corazon', ayuda: 'Tus condiciones, medicamentos y alergias son información privada.', contenido: <PasoSalud salud={datos.salud} {...props} /> },
  ];
  return <PerfilEditable titulo="Mi perfil" subtitulo="Tus datos y objetivos, siempre a mano." nombre={nombre} rol="Usuario"
    cuentaEstado={cuentaEstado} activa={activa} onCambiar={(s) => { setActiva(s); setMensaje(''); }} secciones={secciones}
    aviso={<Alerta tipo="exito">{mensaje}</Alerta>}
    resumen={<div className="perfil-editor__completo"><Icono nombre="check" tamano={26} /><div><strong>Perfil completo</strong><p>Datos, objetivos y salud al día.</p></div></div>}
    pie={<TarjetaEstimacion kcal={datos.requerimientoCaloricoKcal} />} />;
}
