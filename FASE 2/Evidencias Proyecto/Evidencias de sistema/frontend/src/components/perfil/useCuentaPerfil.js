import { useEffect, useState } from 'react';
import { useSesion } from '../../context/SesionContext.jsx';
import { solicitar } from '../../services/api.js';

export default function useCuentaPerfil() {
  const { sesion, actualizarSesion } = useSesion();
  const [estado, setEstado] = useState({ cargando: true });
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vigente = true;
    solicitar('/perfil/cuenta').then(({ cuenta }) => {
      if (!cuenta) throw new Error('No pudimos cargar los datos de tu cuenta. Intenta nuevamente.');
      if (vigente) setEstado({ cuenta });
    }).catch((error) => { if (vigente) setEstado({ error: error.message }); });
    return () => { vigente = false; };
  }, [intento]);
  async function guardar(datos) {
    const respuesta = await solicitar('/perfil/cuenta', { metodo: 'PUT', cuerpo: datos });
    setEstado({ cuenta: respuesta.cuenta });
    if (respuesta.usuario && actualizarSesion) {
      actualizarSesion({ ...sesion, token: respuesta.token || sesion.token, usuario: respuesta.usuario });
    }
    return respuesta.cuenta;
  }
  return { ...estado, guardar, reintentar: () => { setEstado({ cargando: true }); setIntento((v) => v + 1); } };
}
