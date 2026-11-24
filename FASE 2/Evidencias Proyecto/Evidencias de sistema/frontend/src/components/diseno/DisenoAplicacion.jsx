import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext.jsx';
import Alerta from '../Alerta.jsx';
import Bienvenida from '../Bienvenida.jsx';
import Encabezado from '../Encabezado.jsx';
import BarraInferior from './BarraInferior.jsx';
import MenuLateral from './MenuLateral.jsx';
import MensajesFlotantes from './MensajesFlotantes.jsx';
import './DisenoAplicacion.css';
import './EstiloCristal.css';
import './NavegacionCompacta.css';
import './TemaAplicacion.css';

// Estructura común de las pantallas con sesión: encabezado, menú lateral, contenido y barra inferior (DAS, D22).
// "espacio" elige el menú del usuario o el del profesional (DAS, D25).
export default function DisenoAplicacion({ espacio = 'usuario' }) {
  const { sesion, aviso: avisoSesion, limpiarAviso } = useSesion();
  const { pathname } = useLocation();
  const tipoNavegacion = useNavigationType();
  const [tema, setTema] = useState(() => { try { return localStorage.getItem('fitsearch_aspecto') === 'oscuro' ? 'oscuro' : 'claro'; } catch { return 'claro'; } });
  const cambiarTema = (valor) => { setTema(valor); try { localStorage.setItem('fitsearch_aspecto', valor); } catch { /* El tema sigue funcionando sin almacenamiento. */ } };
  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    return () => { delete document.documentElement.dataset.tema; };
  }, [tema]);
  const [menuAbierto, setMenuAbierto] = useState(false);
  // El aviso de sesión iniciada o de cuenta creada se muestra una vez, en la primera pantalla.
  const [aviso, setAviso] = useState(avisoSesion);
  const [rutaActual, setRutaActual] = useState(pathname);
  if (rutaActual !== pathname) {
    // Al cambiar de pantalla se cierra el menú del celular y se descarta el aviso, salvo en una redirección
    // automática (por ejemplo, del Inicio al asistente de perfil), para que el aviso alcance a verse.
    setRutaActual(pathname);
    setMenuAbierto(false);
    if (tipoNavegacion !== 'REPLACE') setAviso(null);
  }
  useEffect(() => {
    if (avisoSesion) limpiarAviso();
  }, [avisoSesion, limpiarAviso]);
  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);
  const cerrarBienvenida = useCallback(() => setAviso(null), []);
  const esBienvenida = aviso?.origen === 'ingreso' && ['usuario', 'profesional'].includes(sesion?.usuario.rol);

  return (
    <div className={`app app--${espacio}${tema === 'oscuro' ? ' app--oscuro' : ''}${menuAbierto ? ' app--menu-abierto' : ''}`}>
      <a className="app__saltar" href="#contenido">Saltar al contenido</a>
      <Encabezado soloMarca menuAbierto={menuAbierto} onAlternarMenu={() => setMenuAbierto(!menuAbierto)} />
      <div className="app__cuerpo">
        <MenuLateral abierto={menuAbierto} onCerrar={cerrarMenu} espacio={espacio} tema={tema} onTema={cambiarTema} />
        <main id="contenido" className="app__contenido" tabIndex={-1}>
          {aviso && !esBienvenida && <Alerta flotante={false} tipo={aviso.tipo}>{aviso.texto}</Alerta>}
          {/* Las pantallas pueden descartar el aviso cuando la persona avanza (por ejemplo, en el asistente de perfil). */}
          <Outlet context={{ descartarAviso: () => setAviso(null) }} />
        </main>
      </div>
      <BarraInferior espacio={espacio} />
      {espacio !== 'administrador' && <MensajesFlotantes />}
      {esBienvenida && <Bienvenida usuario={sesion.usuario} onCerrar={cerrarBienvenida} />}
    </div>
  );
}
