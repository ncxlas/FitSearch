import { useEffect, useRef, useState } from 'react';
import { cargarMapLibre, ESTILO_MAPA } from '../../services/mapas.js';
import { ALFILER, cargaDelEstilo, esperarEstilo, plegarAtribucion, TEXTOS_MAPA } from '../../services/cargaMapa.js';
import { CHILE } from './ubicacionMapa.js';

// Mapa del lugar de atención en la ficha pública del profesional (15-11-2026): el mismo mapa de FitSearch (MapLibre con
// OpenFreeMap), con un solo marcador fijo. Solo pide gestos cooperativos (Ctrl + rueda, dos dedos) para no atrapar el
// desplazamiento de la página. Si no carga, se ofrece reintentar; la dirección escrita sigue visible al lado.
export default function MapaLugar({ lat, lng, nombre }) {
  const contenedor = useRef(null);
  const mapa = useRef(null);
  const [estado, setEstado] = useState('cargando');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const maplibregl = await cargarMapLibre();
        if (!vigente) return;
        if (!mapa.current) {
          mapa.current = new maplibregl.Map({
            container: contenedor.current,
            style: ESTILO_MAPA,
            center: [lng, lat],
            zoom: 15,
            maxBounds: CHILE,
            renderWorldCopies: false,
            cooperativeGestures: true,
            attributionControl: { compact: true },
            locale: { ...TEXTOS_MAPA, 'Map.Title': `Mapa del lugar de atención de ${nombre}` },
          });
          mapa.current.addControl(new maplibregl.NavigationControl({ showCompass: false }));
          const carga = cargaDelEstilo(mapa.current);
          plegarAtribucion(mapa.current, contenedor);
          const alfiler = document.createElement('span');
          alfiler.className = 'mapa-lugar__marcador';
          alfiler.setAttribute('aria-hidden', 'true');
          alfiler.innerHTML = ALFILER;
          new maplibregl.Marker({ element: alfiler, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(mapa.current);
          await esperarEstilo(carga);
        }
        if (vigente) setEstado('listo');
      } catch {
        if (vigente) {
          mapa.current?.remove();
          mapa.current = null;
          setEstado('error');
        }
      }
    })();
    return () => { vigente = false; };
  }, [intento, lat, lng, nombre]);

  useEffect(() => () => {
    mapa.current?.remove();
    mapa.current = null;
  }, []);

  return (
    <div className="mapa-lugar">
      {estado === 'cargando' && <p className="mapa-lugar__aviso" role="status">Cargando mapa…</p>}
      {estado === 'error' && (
        <p className="mapa-lugar__aviso" role="alert">
          No se pudo cargar el mapa.{' '}
          <button className="boton-texto" type="button" onClick={() => { setEstado('cargando'); setIntento((i) => i + 1); }}>Reintentar mapa</button>
        </p>
      )}
      <div className="mapa-lugar__mapa" ref={contenedor} hidden={estado === 'error'} />
    </div>
  );
}
