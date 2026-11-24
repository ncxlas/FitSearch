import { Children, useCallback, useEffect, useId, useRef, useState } from 'react';
import Icono from '../Icono.jsx';
import './CarruselHerramientas.css';

const MOVIMIENTO_REDUCIDO = '(prefers-reduced-motion: reduce)';
const INTERVALO = 4500;

export default function CarruselHerramientas({ children }) {
  const id = useId();
  const raiz = useRef(null);
  const fila = useRef(null);
  const cantidad = Children.count(children);
  const [desborda, setDesborda] = useState(false);
  const [pausada, setPausada] = useState(false);
  const [mouseDentro, setMouseDentro] = useState(false);
  const [focoDentro, setFocoDentro] = useState(false);
  const [enVista, setEnVista] = useState(() => !window.IntersectionObserver);
  const [pestanaVisible, setPestanaVisible] = useState(() => document.visibilityState !== 'hidden');
  const [reducido, setReducido] = useState(() => Boolean(window.matchMedia?.(MOVIMIENTO_REDUCIDO).matches));

  useEffect(() => {
    const preferencia = window.matchMedia?.(MOVIMIENTO_REDUCIDO);
    const cambiarMovimiento = () => setReducido(Boolean(preferencia?.matches));
    const cambiarVisibilidad = () => setPestanaVisible(document.visibilityState !== 'hidden');
    preferencia?.addEventListener('change', cambiarMovimiento);
    document.addEventListener('visibilitychange', cambiarVisibilidad);
    return () => {
      preferencia?.removeEventListener('change', cambiarMovimiento);
      document.removeEventListener('visibilitychange', cambiarVisibilidad);
    };
  }, []);

  useEffect(() => {
    const lista = fila.current;
    const medir = () => setDesborda(lista.scrollWidth > lista.clientWidth + 4);
    medir();
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir);
    observador?.observe(lista);
    for (const tarjeta of lista.children) observador?.observe(tarjeta);
    window.addEventListener('resize', medir);
    return () => { observador?.disconnect(); window.removeEventListener('resize', medir); };
  }, [cantidad]);

  useEffect(() => {
    if (!window.IntersectionObserver) return undefined;
    const observador = new IntersectionObserver(([entrada]) => setEnVista(entrada.isIntersecting), { threshold: 0.2 });
    observador.observe(raiz.current);
    return () => observador.disconnect();
  }, []);

  const mover = useCallback((direccion) => {
    const lista = fila.current;
    const limite = Math.max(0, lista.scrollWidth - lista.clientWidth);
    if (!limite) return;
    const paso = lista.children[1]?.offsetLeft - lista.children[0]?.offsetLeft || Math.max(120, lista.clientWidth * 0.8);
    const destino = direccion > 0
      ? lista.scrollLeft >= limite - 2 ? 0 : Math.min(limite, lista.scrollLeft + paso)
      : lista.scrollLeft <= 2 ? limite : Math.max(0, lista.scrollLeft - paso);
    if (lista.scrollTo) lista.scrollTo({ left: destino, behavior: reducido ? 'auto' : 'smooth' });
    else lista.scrollLeft = destino;
  }, [reducido]);

  useEffect(() => {
    if (!desborda || pausada || mouseDentro || focoDentro || !enVista || !pestanaVisible || reducido) return undefined;
    const temporizador = setInterval(() => mover(1), INTERVALO);
    return () => clearInterval(temporizador);
  }, [desborda, pausada, mouseDentro, focoDentro, enVista, pestanaVisible, reducido, mover]);

  function recorrer(direccion) { setPausada(true); mover(direccion); }

  return <div ref={raiz} className="carrusel-herramientas" role="region" aria-roledescription="carrusel" aria-label="Herramientas de FitSearch"
    onMouseEnter={() => setMouseDentro(true)} onMouseLeave={() => setMouseDentro(false)}
    onFocus={() => setFocoDentro(true)} onBlur={(evento) => { if (!evento.currentTarget.contains(evento.relatedTarget)) setFocoDentro(false); }}>
    <div ref={fila} id={id} className="portada__herramientas" onPointerDown={() => setPausada(true)}>{children}</div>
    <div className="carrusel-herramientas__controles">
      <button type="button" aria-label="Ver herramientas anteriores" aria-controls={id} disabled={!desborda} onClick={() => recorrer(-1)}><Icono nombre="chevronIzquierda" tamano={22} /></button>
      {!reducido && <button type="button" className="carrusel-herramientas__pausa" aria-controls={id} disabled={!desborda}
        aria-label={pausada ? 'Reanudar carrusel de herramientas' : 'Pausar carrusel de herramientas'} onClick={() => setPausada((valor) => !valor)}>{pausada ? 'Reanudar' : 'Pausar'}</button>}
      <button type="button" aria-label="Ver herramientas siguientes" aria-controls={id} disabled={!desborda} onClick={() => recorrer(1)}><Icono nombre="chevronDerecha" tamano={22} /></button>
    </div>
  </div>;
}
