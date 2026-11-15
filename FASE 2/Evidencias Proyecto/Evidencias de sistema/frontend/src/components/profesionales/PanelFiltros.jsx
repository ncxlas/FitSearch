import { useEffect, useRef } from 'react';
import reglas from '@shared/reglas.json';
import Icono from '../Icono.jsx';
import useBloquearScroll from '../diseno/useBloquearScroll.js';

const { distanciasKm, calificacionesMinimas, filtroModalidad } = reglas.profesionales;
const { filtroDisponible } = reglas.agenda;

// Si la URL trae un valor que ya no está en el catálogo (enlace antiguo), se conserva para que se vea seleccionado.
const conValorActual = (lista, actual) => (actual && !lista.includes(actual) ? [actual, ...lista] : lista);

function textoUbicacion({ buscando, estado }) {
  if (buscando) return 'Obteniendo tu ubicación…';
  if (estado === 'lista') return 'Usando tu ubicación aproximada.';
  if (estado === 'inactiva') return 'Al elegir una distancia te pediremos permiso para usar tu ubicación.';
  return 'Sin acceso a tu ubicación.';
}

// Filtros del buscador (FS-HU-22): se abren con el botón «Filtros» en todos los tamaños (15-11-2026, SC-35), como hoja
// inferior en celular y panel lateral derecho en escritorio; antes, en escritorio eran una franja fija sobre la lista
// que le quitaba alto a la lista y al mapa. Todos son listas desplegables (SC-27). Cada cambio se aplica de inmediato
// y queda en la URL.
export default function PanelFiltros({ id, abierto, onCerrar, filtros, catalogo, ubicacion, onCambiar, onLimpiar, total, hayFiltros }) {
  const panel = useRef(null);
  useBloquearScroll(abierto);
  useEffect(() => {
    if (!abierto) return undefined;
    const alTeclear = (evento) => { if (evento.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [abierto, onCerrar]);
  // Con teclado, el foco entra al panel al abrirlo (en el DOM va antes del botón) y vuelve al botón al cerrarlo.
  useEffect(() => {
    if (!abierto) return undefined;
    const anterior = document.activeElement;
    panel.current?.querySelector('.panel-filtros__cerrar')?.focus();
    return () => anterior?.focus?.();
  }, [abierto]);

  const lista = (nombre, etiqueta, opciones, extra = {}, alCambiar = (valor) => onCambiar({ [nombre]: valor })) => (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor={`filtro-${nombre}`}>{etiqueta}</label>
      <select className="campo__control" id={`filtro-${nombre}`} value={filtros[nombre]} {...extra}
        onChange={(evento) => alCambiar(evento.target.value)}>
        {opciones.map(([valor, texto]) => <option key={valor || 'todas'} value={valor}>{texto}</option>)}
      </select>
      {nombre === 'distancia' && (
        <p id="estado-ubicacion" className="panel-filtros__ubicacion">
          <Icono nombre="mira" tamano={15} /> {textoUbicacion(ubicacion)}
        </p>
      )}
    </div>
  );
  const valores = (catalogoActual, actual) => conValorActual(catalogoActual, actual).map((valor) => [valor, valor]);
  // Región (14-11-2026): al elegirla, la lista de comunas muestra solo las de esa región; si la comuna elegida no es de
  // la región nueva, se quita.
  const regiones = catalogo.regiones ?? [];
  const comunasDe = (region) => (region ? regiones.find(({ nombre }) => nombre === region)?.comunas ?? [] : catalogo.comunas);
  const cambiarRegion = (region) => onCambiar({ region, ...(filtros.comuna && !comunasDe(region).includes(filtros.comuna) && { comuna: '' }) });

  return (
    <>
      {/* El fondo siempre está montado para fundirse junto con la hoja de filtros (al abrir y al cerrar). */}
      <div className={`panel-filtros__fondo${abierto ? ' panel-filtros__fondo--visible' : ''}`} onClick={onCerrar} aria-hidden="true" />
      <aside ref={panel} id={id} className={`panel-filtros${abierto ? ' panel-filtros--abierto' : ''}`} aria-label="Filtros">
        <div className="panel-filtros__cabecera">
          <h2>Filtros</h2>
          <button type="button" className="boton-icono panel-filtros__cerrar" aria-label="Cerrar filtros" onClick={onCerrar}><Icono nombre="cerrar" tamano={22} /></button>
        </div>
        {lista('region', 'Región', [['', 'Todas'], ...valores(regiones.map(({ nombre }) => nombre), filtros.region)], {}, cambiarRegion)}
        {lista('comuna', 'Comuna', [['', 'Todas'], ...valores(comunasDe(filtros.region), filtros.comuna)])}
        {lista('distancia', 'Distancia máxima', [['', 'Sin límite'], ...distanciasKm.map((km) => [String(km), `Hasta ${km} km`])],
          { 'aria-describedby': 'estado-ubicacion' })}
        {lista('especialidad', 'Especialidad', [['', 'Todas'], ...valores(catalogo.especialidades, filtros.especialidad)])}
        {lista('modalidad', 'Modalidad', [['', 'Todas'], ...filtroModalidad.map(({ valor, etiqueta }) => [valor, etiqueta])])}
        {lista('disponible', 'Con horas libres', [['', 'Cualquier día'], ...filtroDisponible.map(({ valor, etiqueta }) => [valor, etiqueta])])}
        {lista('calificacion', 'Calificación mínima', [['', 'Cualquiera'], ...calificacionesMinimas.map((n) => [String(n), `${n} estrellas o más`])])}
        <div className="panel-filtros__pie">
          {hayFiltros && <button type="button" className="boton boton--secundario" onClick={onLimpiar}>Limpiar filtros</button>}
          <button type="button" className="boton boton--principal panel-filtros__ver" onClick={onCerrar}>
            {total === undefined ? 'Ver resultados' : `Ver ${total} ${total === 1 ? 'resultado' : 'resultados'}`}
          </button>
        </div>
      </aside>
    </>
  );
}
