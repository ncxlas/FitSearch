import { useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Icono from '../Icono.jsx';
import MarcaFitSearch from './MarcaFitSearch.jsx';
import Notificaciones from './Notificaciones.jsx';
import MenuMas from './MenuMas.jsx';
import { ESPACIOS } from './secciones.js';
import useBloquearScroll from './useBloquearScroll.js';
import useMenuDesplegable from './useMenuDesplegable.js';

export default function MenuLateral({ abierto, onCerrar, espacio = 'usuario', tema, onTema }) {
  const { secciones, menu } = ESPACIOS[espacio];
  const { desplegado, propiedades } = useMenuDesplegable();
  const panel = useRef(null);
  const cerrar = useRef(null);
  useBloquearScroll(abierto);
  useEffect(() => {
    if (!abierto) return undefined;
    const anterior = document.activeElement;
    cerrar.current?.focus();
    const alTeclear = (evento) => {
      if (evento.key === 'Escape') {
        if (panel.current.querySelector('.notificaciones__boton[aria-expanded="true"], .menu-sesion > button[aria-expanded="true"]')) return;
        onCerrar(); return;
      }
      if (evento.key !== 'Tab') return;
      const controles = [...panel.current.querySelectorAll('a[href], button:not(:disabled)')];
      const primero = controles[0];
      const ultimo = controles.at(-1);
      const afuera = !panel.current.contains(document.activeElement);
      if (evento.shiftKey && (afuera || document.activeElement === primero)) { evento.preventDefault(); ultimo?.focus(); }
      else if (!evento.shiftKey && (afuera || document.activeElement === ultimo)) { evento.preventDefault(); primero?.focus(); }
    };
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      if (anterior?.isConnected) anterior.focus();
    };
  }, [abierto, onCerrar]);
  const posicionAvisos = menu.indexOf('mensajes');
  return <>
    <div className={`menu-lateral__fondo${abierto ? ' menu-lateral__fondo--visible' : ''}`} onClick={onCerrar} aria-hidden="true" />
    <div ref={panel} role={abierto ? 'dialog' : undefined} aria-modal={abierto ? true : undefined} aria-label={abierto ? 'Navegación' : undefined} className={`navegacion-lateral${abierto ? ' navegacion-lateral--abierta' : ''}`}>
      <nav id="menu-principal" className={`menu-lateral${abierto ? ' menu-lateral--abierto' : ''}${desplegado ? ' menu-lateral--desplegado' : ''}`} aria-label="Menú principal" {...propiedades}>
        <div className="menu-lateral__cabecera">
          <MarcaFitSearch />
          <button ref={cerrar} type="button" className="boton-icono" aria-label="Cerrar menú" onClick={onCerrar}><Icono nombre="cerrar" tamano={22} /></button>
        </div>
        <ul className="menu-lateral__lista">
          {menu.map((clave, indice) => {
            const { ruta, nombre, icono, proximamente } = secciones[clave];
            return <li key={clave}>
              <NavLink to={ruta} className="menu-lateral__enlace" onClick={onCerrar}>
                {({ isActive }) => <><Icono nombre={icono} tamano={21} activo={isActive} />
                  <span className="menu-lateral__texto">{nombre}</span>
                  {proximamente && <span className="etiqueta-proximamente">Próximamente</span>}
                </>}
              </NavLink>
              {indice === posicionAvisos && <Notificaciones ubicacion="lateral" />}
            </li>;
          })}
          {espacio === 'usuario' && <li><Link to="/asistente/nuevo?inicio=profesional" className="menu-lateral__enlace" onClick={onCerrar}><Icono nombre="chispa" tamano={21} /><span>Pedir recomendación</span></Link></li>}
          {posicionAvisos === -1 && <li><Notificaciones ubicacion="lateral" /></li>}
        </ul>
      </nav>
      <MenuMas tema={tema} onTema={onTema} />
    </div>
  </>;
}
