import { Children, useEffect, useId, useRef, useState } from 'react';
import Icono from '../Icono.jsx';
import './CarruselHerramientas.css';

const MOVIMIENTO_REDUCIDO = '(prefers-reduced-motion: reduce)';
const circular = (valor, limite) => ((valor % limite) + limite) % limite;

export default function CarruselHerramientas({ children }) {
  const id = useId();
  const ventana = useRef(null);
  const fila = useRef(null);
  const acciones = useRef({});
  const cantidad = Children.count(children);
  const [disponible, setDisponible] = useState(false);
  const [pausada, setPausada] = useState(false);
  const [reducido, setReducido] = useState(() => Boolean(window.matchMedia?.(MOVIMIENTO_REDUCIDO).matches));

  useEffect(() => {
    const marco = ventana.current;
    const pista = fila.current;
    const originales = [...pista.children];
    const preferencia = window.matchMedia?.(MOVIMIENTO_REDUCIDO);
    let animacion = null, copias = [], longitud = 0, duracion = 1;
    let foco = false, pausa = false, arrastrando = false;
    let visible = !window.IntersectionObserver, puntero = null, bloquearClic = false;
    let inicioX = 0, inicioY = 0, inicioTiempo = 0;

    function sincronizar() {
      if (!animacion) return;
      if (foco || pausa || arrastrando || !visible || document.hidden || preferencia?.matches) animacion.pause();
      else animacion.play();
    }

    function configurar() {
      const fase = animacion ? Number(animacion.currentTime ?? 0) / duracion : 0;
      animacion?.cancel(); animacion = null;
      copias.forEach((copia) => copia.remove()); copias = [];
      marco.classList.remove('carrusel-herramientas__ventana--animada');
      marco.style.setProperty('--carrusel-ancho', `${marco.clientWidth}px`);
      longitud = pista.scrollWidth;
      const desborda = longitud > marco.clientWidth + 4;
      setDisponible(desborda);
      if (!desborda || preferencia?.matches || !pista.animate) return;
      // Las copias completan la cinta; solo los originales participan del teclado y del lector.
      originales.forEach((original, indice) => {
        const copia = original.cloneNode(true);
        copia.dataset.copiaHerramienta = indice;
        copia.setAttribute('aria-hidden', 'true');
        copia.removeAttribute('id');
        copia.querySelectorAll('[id]').forEach((nodo) => nodo.removeAttribute('id'));
        copia.querySelectorAll('a, button, input, select, textarea, [tabindex]').forEach((nodo) => nodo.setAttribute('tabindex', '-1'));
        pista.append(copia); copias.push(copia);
      });
      longitud = copias[0].offsetLeft - originales[0].offsetLeft;
      if (!longitud) { copias.forEach((copia) => copia.remove()); copias = []; return; }
      duracion = longitud / (marco.clientWidth < 900 ? 45 : 70) * 1000;
      marco.scrollLeft = 0;
      marco.classList.add('carrusel-herramientas__ventana--animada');
      animacion = pista.animate([{ transform: 'translate3d(0,0,0)' }, { transform: `translate3d(-${longitud}px,0,0)` }], {
        duration: duracion, iterations: Infinity, easing: 'linear',
      });
      animacion.currentTime = circular(fase, 1) * duracion;
      sincronizar();
    }

    function mover(direccion) {
      const paso = originales[1]?.offsetLeft - originales[0]?.offsetLeft || marco.clientWidth * .75;
      if (animacion) animacion.currentTime = circular(Number(animacion.currentTime ?? 0) + direccion * paso * duracion / longitud, duracion);
      else {
        const limite = Math.max(0, pista.scrollWidth - marco.clientWidth);
        const destino = direccion > 0 ? marco.scrollLeft >= limite - 2 ? 0 : Math.min(limite, marco.scrollLeft + paso)
          : marco.scrollLeft <= 2 ? limite : Math.max(0, marco.scrollLeft - paso);
        marco.scrollTo({ left: destino, behavior: preferencia?.matches ? 'auto' : 'smooth' });
      }
    }
    acciones.current = { mover, pausar: (valor) => { pausa = valor; sincronizar(); } };
    const enfocar = (evento) => {
      foco = true;
      const tarjeta = originales.find((original) => original.contains(evento.target));
      if (animacion && tarjeta) {
        animacion.currentTime = (tarjeta.offsetLeft - originales[0].offsetLeft) * duracion / longitud;
        marco.scrollLeft = 0;
      }
      sincronizar();
    };
    const desenfocar = (evento) => { if (!marco.contains(evento.relatedTarget)) { foco = false; sincronizar(); } };
    const teclado = (evento) => {
      if (evento.key === 'ArrowLeft' || evento.key === 'ArrowRight') { evento.preventDefault(); mover(evento.key === 'ArrowRight' ? 1 : -1); }
    };
    const empezar = (evento) => {
      bloquearClic = false;
      if (evento.button !== 0 || !evento.isPrimary || !animacion) return;
      puntero = evento.pointerId; inicioX = evento.clientX; inicioY = evento.clientY;
      inicioTiempo = Number(animacion.currentTime ?? 0);
    };
    const arrastrar = (evento) => {
      if (puntero !== evento.pointerId || !animacion) return;
      const dx = evento.clientX - inicioX, dy = evento.clientY - inicioY;
      if (!arrastrando && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        arrastrando = true; bloquearClic = true;
        marco.setPointerCapture?.(puntero); marco.classList.add('carrusel-herramientas__ventana--arrastrando'); sincronizar();
      }
      if (arrastrando) animacion.currentTime = circular(inicioTiempo - dx * duracion / longitud, duracion);
    };
    const terminar = (evento) => {
      if (puntero !== evento.pointerId) return;
      puntero = null; arrastrando = false;
      marco.classList.remove('carrusel-herramientas__ventana--arrastrando'); sincronizar();
    };
    const pulsar = (evento) => {
      if (bloquearClic) { evento.preventDefault(); evento.stopPropagation(); bloquearClic = false; return; }
      const copia = evento.target.closest('[data-copia-herramienta]');
      const enlace = evento.target.closest('a');
      if (!copia || !enlace || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
      const indice = [...copia.querySelectorAll('a')].indexOf(enlace);
      evento.preventDefault();
      originales[Number(copia.dataset.copiaHerramienta)].querySelectorAll('a')[indice]?.click();
    };
    const cambiarPreferencia = () => { setReducido(Boolean(preferencia?.matches)); configurar(); };
    const eventos = { focusin: enfocar, focusout: desenfocar,
      keydown: teclado, pointerdown: empezar, pointermove: arrastrar, pointerup: terminar, pointercancel: terminar, lostpointercapture: terminar, click: pulsar };
    Object.entries(eventos).forEach(([nombre, manejar]) => marco.addEventListener(nombre, manejar));
    const interseccion = window.IntersectionObserver ? new IntersectionObserver(([entrada]) => { visible = entrada.isIntersecting; sincronizar(); }) : null;
    interseccion?.observe(marco);
    const tamano = window.ResizeObserver ? new ResizeObserver(configurar) : null;
    tamano?.observe(marco);
    window.addEventListener('resize', configurar);
    document.addEventListener('visibilitychange', sincronizar);
    preferencia?.addEventListener('change', cambiarPreferencia);
    configurar();
    return () => {
      animacion?.cancel(); copias.forEach((copia) => copia.remove());
      interseccion?.disconnect(); tamano?.disconnect(); acciones.current = {};
      Object.entries(eventos).forEach(([nombre, manejar]) => marco.removeEventListener(nombre, manejar));
      window.removeEventListener('resize', configurar);
      document.removeEventListener('visibilitychange', sincronizar);
      preferencia?.removeEventListener('change', cambiarPreferencia);
    };
  }, [cantidad]);

  function alternarPausa() {
    const valor = !pausada;
    acciones.current.pausar?.(valor); setPausada(valor);
  }

  return <div className="carrusel-herramientas" role="region" aria-roledescription="carrusel" aria-label="Herramientas de FitSearch">
    <div ref={ventana} id={id} className="carrusel-herramientas__ventana" tabIndex={0} aria-label="Herramientas; usa las flechas para recorrerlas">
      <div ref={fila} className="portada__herramientas">{children}</div>
    </div>
    <div className="carrusel-herramientas__controles">
      <button type="button" aria-label="Ver herramientas anteriores" aria-controls={id} disabled={!disponible} onClick={() => acciones.current.mover?.(-1)}><Icono nombre="chevronIzquierda" tamano={22} /></button>
      {!reducido && <button type="button" className="carrusel-herramientas__pausa" aria-controls={id} disabled={!disponible} aria-pressed={pausada}
        aria-label={pausada ? 'Reanudar carrusel de herramientas' : 'Pausar carrusel de herramientas'} onClick={alternarPausa}>{pausada ? 'Reanudar' : 'Pausar'}</button>}
      <button type="button" aria-label="Ver herramientas siguientes" aria-controls={id} disabled={!disponible} onClick={() => acciones.current.mover?.(1)}><Icono nombre="chevronDerecha" tamano={22} /></button>
    </div>
  </div>;
}
