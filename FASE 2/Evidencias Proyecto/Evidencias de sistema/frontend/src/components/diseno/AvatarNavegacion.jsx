import Avatar from '../Avatar.jsx';
import { useSesion } from '../../context/SesionContext.jsx';
import { useFotoCuenta } from '../../services/fotoCuenta.js';

// El menú y la barra móvil comparten la foto que actualiza el perfil al guardar.
export default function AvatarNavegacion() {
  const { sesion } = useSesion();
  const usuario = sesion.usuario;
  const foto = useFotoCuenta(usuario.id, usuario.rol !== 'administrador');
  return <Avatar nombre={usuario.nombre} fotoUrl={foto} className="avatar-navegacion" />;
}
