import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext.jsx';
import Icono from '../Icono.jsx';
import useDesplegable from './useDesplegable.js';
import useMenuDesplegable from './useMenuDesplegable.js';

export default function MenuMas({ tema, onTema }) {
  const { sesion, cerrarSesion } = useSesion();
  const { abierto, setAbierto, contenedor, boton } = useDesplegable();
  const { desplegado, propiedades } = useMenuDesplegable();
  const [aspecto, setAspecto] = useState(false);
  const configuracion = sesion.usuario.rol === 'profesional' ? '/profesional/configuracion' : sesion.usuario.rol === 'administrador' ? '/admin/dashboard' : '/perfil';
  return <nav ref={contenedor} className={`menu-sesion${desplegado ? ' menu-sesion--desplegada' : ''}`} aria-label="Cuenta" {...propiedades}>
    <button ref={boton} type="button" aria-label="Más opciones" aria-expanded={abierto} aria-controls="menu-mas"
      onClick={() => { setAbierto(!abierto); setAspecto(false); }}>
      <Icono nombre="menu" tamano={23} /><span className="menu-lateral__texto">Más</span>
    </button>
    {abierto && <div id="menu-mas" className="menu-mas__panel">
      {aspecto ? <>
        <button type="button" onClick={() => setAspecto(false)}><Icono nombre="flechaIzquierda" tamano={18} />Cambiar aspecto</button>
        <fieldset className="menu-mas__temas"><legend className="solo-lector">Tema de la aplicación</legend>
          {['claro', 'oscuro'].map((valor) => <label key={valor}><span>{valor === 'claro' ? 'Claro' : 'Oscuro'}</span>
            <input type="radio" name="aspecto" value={valor} checked={tema === valor} onChange={() => onTema(valor)} /></label>)}
        </fieldset>
      </> : <>
        <Link to={configuracion} onClick={() => setAbierto(false)}><Icono nombre="ajustes" tamano={20} />Configuración</Link>
        <button type="button" onClick={() => setAspecto(true)}><Icono nombre="luna" tamano={20} />Cambiar aspecto</button>
        <hr />
        <button type="button" onClick={cerrarSesion}><Icono nombre="salir" tamano={21} />Cerrar sesión</button>
      </>}
    </div>}
  </nav>;
}
