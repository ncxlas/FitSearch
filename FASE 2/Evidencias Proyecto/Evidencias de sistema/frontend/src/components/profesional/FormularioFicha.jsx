import { useEffect, useRef, useState } from 'react';
import reglas from '@shared/reglas.json';
import Alerta from '../Alerta.jsx';
import CampoFormulario from '../CampoFormulario.jsx';
import Icono from '../Icono.jsx';
import MapaUbicacion from './MapaUbicacion.jsx';
import { enMapa } from '../profesionales/ubicacionMapa.js';
import { direccionDelPunto, guardarMiFicha, ubicarDireccion } from '../../services/profesional.service.js';
import { regionDeComuna } from '../../services/regiones.js';
import './FormularioFicha.css';

// Pausa antes de buscar la dirección del punto donde quedó el marcador: con las flechas del teclado se mueve paso a paso
// y solo interesa el punto final (además, la API consulta Nominatim una vez por segundo como máximo).
const ESPERA_PUNTO_MS = 600;

const { modalidades, comuna: { max: MAX_COMUNA }, direccion: { max: MAX_DIRECCION } } = reglas.profesionales;

// Campos de la ficha que se editan en «Información personal» (la especialidad, 16-11-2026): un error de la API en
// ellos se señala con un botón para ir a esa sección.
const CAMPOS_DE_INFORMACION = ['especialidad', 'descripcion'];

// Los nombres de los campos coinciden con la API, así los errores del servidor caen en su campo. SC-24: la dirección es
// obligatoria si atiende presencial o de ambas formas. SC-28: las coordenadas ya no se escriben, salen de la comuna y
// la dirección (ver ubicar).
function validar({ comuna, direccion, modalidad }) {
  const errores = {};
  if (!modalidad) errores.modalidad = 'Selecciona cómo atiendes';
  if (modalidad !== 'online' && !comuna.trim()) errores.comuna = 'Ingresa la comuna donde atiendes';
  if (modalidad !== 'online' && !direccion.trim()) errores.direccion = 'Ingresa la dirección donde atiendes';
  return errores;
}

const desdeFicha = (ficha) => ({
  comuna: ficha?.comuna ?? '',
  direccion: ficha?.direccion ?? '',
  modalidad: ficha?.modalidad ?? '',
});

// La comuna y la dirección que produjeron una ubicación: si cambian, hay que buscarla de nuevo.
const consultaDe = ({ comuna, direccion }) => `${comuna.trim()}|${direccion.trim()}`.toLocaleLowerCase('es');
// La ubicación guardada se reutiliza mientras no cambie la dirección. Una fuera de Chile (fichas anteriores a la SC-24)
// no se muestra: se busca de nuevo con la dirección.
function ubicacionGuardada(ficha) {
  if (!ficha || !enMapa(ficha)) return null;
  return {
    lat: Number(ficha.ubicacionLat), lng: Number(ficha.ubicacionLng), precision: 'guardada', origen: 'guardada',
    consulta: consultaDe(desdeFicha(ficha)),
  };
}
// La ficha guarda 7 decimales (DECIMAL(10,7)); al mover el marcador MapLibre entrega más.
const redondear = (valor) => Math.round(valor * 1e7) / 1e7;
// Revisión del PR 61 (16-11-2026): si tras mover el marcador falla la búsqueda de la dirección de ese punto, o el punto
// no tiene calle, la dirección escrita puede ser de otro lugar (Providencia con el marcador en San Antonio). Esa
// ubicación no se guarda hasta que el profesional corrija la dirección (se busca de nuevo) o confirme que es la correcta.
const porConfirmar = (ubicacion, datos) => Boolean(ubicacion?.porConfirmar) && ubicacion.consulta === consultaDe(datos);

// Qué encontró el buscador de direcciones, dicho para el profesional (sin coordenadas).
function explicarUbicacion(ubicacion, modalidad) {
  if (ubicacion.origen === 'manual' && ubicacion.confirmada) return 'Confirmaste tu dirección: guardaremos el marcador donde lo dejaste.';
  // Al mover el marcador, la comuna y la dirección se actualizan con las de ese punto (15-11-2026).
  if (ubicacion.origen === 'manual' && ubicacion.punto) {
    const { comuna, direccion, precision } = ubicacion.punto;
    if (!direccion) return `Ajustaste el marcador en ${comuna}, pero no encontramos una calle en ese punto: revisa tu dirección.`;
    return `Actualizamos tu comuna y tu dirección según el marcador: ${direccion}, ${comuna}.`
      + (precision === 'calle' ? ' No encontramos el número: agrégalo a la dirección.' : '')
      + ' Si atiendes en una oficina o departamento, agrégalo a la dirección.';
  }
  switch (ubicacion.origen === 'manual' ? 'manual' : ubicacion.precision) {
    case 'guardada': return 'Esta es la ubicación guardada en tu ficha. Si cambias tu comuna o tu dirección, la buscamos de nuevo.';
    case 'manual': return 'Ajustaste el marcador: guardaremos ese punto como tu lugar de atención.';
    case 'exacta': return `Encontramos ${ubicacion.encontrada}.`;
    case 'calle': return `Encontramos la calle (${ubicacion.encontrada}), pero no el número: mueve el marcador hasta tu lugar de atención.`;
    default:
      if (ubicacion.conDireccion) {
        return `No encontramos esa dirección en ${ubicacion.encontrada}: el marcador quedó en el centro de la comuna. Revisa la dirección o mueve el marcador hasta tu lugar de atención.`;
      }
      return modalidad === 'online'
        ? `Atiendes solo online: el marcador queda en el centro de ${ubicacion.encontrada}.`
        : `Mostramos ${ubicacion.encontrada}. Escribe tu dirección para ubicar tu lugar de atención.`;
  }
}

// «Lugar de atención» de la ficha pública del profesional (FS-HU-04), dentro de «Perfil profesional»: la modalidad, la
// comuna, la dirección y el mapa. La especialidad se elige en «Información personal» (16-11-2026) y la descripción ya no
// se pide (la presentación cumple ese papel). Como la API recibe la ficha completa, se reenvían la especialidad y la
// descripción guardadas. La primera vez (`ficha` en null) aquí se crea la ficha, con la `especialidad` elegida;
// onIrA('informacion') lleva a elegirla. Sin `onCancelar` no se ofrece volver (la ficha aún no existe).
export default function FormularioFicha({ ficha, especialidad, onGuardado, onCancelar, onIrA }) {
  const edicion = Boolean(ficha);
  const [datos, setDatos] = useState(() => desdeFicha(ficha));
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('error');
  // Un error que corresponde a «Información personal» (la especialidad que falta o que rechazó la API).
  const [revisarInformacion, setRevisarInformacion] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [ubicacion, setUbicacion] = useState(() => ubicacionGuardada(ficha));
  const [buscando, setBuscando] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState('');
  // La última ubicación y la búsqueda en curso, para leerlas sin esperar a que React vuelva a dibujar
  // (al guardar justo después de escribir la dirección, la búsqueda que empezó al salir del campo se reutiliza).
  const ubicacionActual = useRef(ubicacion);
  const enCurso = useRef(null);
  const ultimaFicha = useRef(ficha);
  // Los datos vigentes, para leerlos después de esperar la dirección del marcador (15-11-2026).
  const datosActuales = useRef(datos);
  const [buscandoPunto, setBuscandoPunto] = useState(false);
  // { mensaje, reintentable }: un 404 (el punto no está en una comuna de Chile) no mejora buscando de nuevo.
  const [errorPunto, setErrorPunto] = useState(null);
  const esperaPunto = useRef(null);
  const puntoEnCurso = useRef(null);
  useEffect(() => () => clearTimeout(esperaPunto.current), []);
  useEffect(() => { datosActuales.current = datos; }, [datos]);

  const fijarUbicacion = (nueva) => {
    ubicacionActual.current = nueva;
    setUbicacion(nueva);
  };
  const fijarDatos = (nuevos) => {
    datosActuales.current = nuevos;
    setDatos(nuevos);
  };

  const cambiar = (campo) => (evento) => {
    setDatos({ ...datos, [campo]: evento.target.value });
    // Lo que escribe el profesional gana: una búsqueda pendiente de la dirección del marcador ya no la reemplaza.
    if ((campo === 'comuna' || campo === 'direccion') && puntoEnCurso.current) {
      clearTimeout(esperaPunto.current);
      puntoEnCurso.current.resolver();
      puntoEnCurso.current = null;
      setBuscandoPunto(false);
    }
    if (campo === 'modalidad' && evento.target.value === 'online') {
      enCurso.current = null;
      setBuscando(false);
      setErrorUbicacion('');
    }
    if (errores[campo]) setErrores({ ...errores, [campo]: undefined });
  };

  // SC-28: busca las coordenadas de la comuna y la dirección escritas (DAS, D36) y devuelve la ubicación, o null si no
  // se pudo. Si ya se buscaron, o el profesional ya ajustó el marcador para esa misma dirección, no se busca de nuevo.
  function ubicar() {
    const actuales = datosActuales.current;
    if (actuales.modalidad === 'online') return Promise.resolve(null);
    const comuna = actuales.comuna.trim();
    const direccion = actuales.direccion.trim();
    if (!comuna) return Promise.resolve(null);
    const consulta = consultaDe(actuales);
    if (ubicacionActual.current?.consulta === consulta) return Promise.resolve(ubicacionActual.current);
    if (enCurso.current?.consulta === consulta) return enCurso.current.promesa;

    setBuscando(true);
    setErrorUbicacion('');
    // Solo la búsqueda más reciente cambia el mapa: una anterior que responde tarde se descarta.
    const esLaVigente = () => enCurso.current?.consulta === consulta;
    const promesa = ubicarDireccion({ comuna, direccion })
      .then((encontrada) => {
        const nueva = { ...encontrada, origen: 'busqueda', consulta, conDireccion: Boolean(direccion) };
        if (esLaVigente()) fijarUbicacion(nueva);
        return nueva;
      })
      .catch((error) => {
        if (esLaVigente()) {
          if (error.detalles?.comuna) setErrores((previos) => ({ ...previos, comuna: error.detalles.comuna }));
          else setErrorUbicacion(error.message);
        }
        return null;
      })
      .finally(() => {
        if (esLaVigente()) {
          enCurso.current = null;
          setBuscando(false);
        }
      });
    enCurso.current = { consulta, promesa };
    return promesa;
  }

  // Busca la comuna, la región y la dirección del punto donde quedó el marcador y las pone en el formulario
  // (15-11-2026). La ubicación queda asociada a esos textos, así al salir del campo o al guardar no se vuelve a buscar
  // la dirección escrita (lo que movería el marcador de vuelta). Solo cuenta la respuesta del último movimiento.
  function buscarPunto({ lat, lng }) {
    clearTimeout(esperaPunto.current);
    puntoEnCurso.current?.resolver();
    setErrorPunto(null);
    setBuscandoPunto(true);
    let resolver;
    const pedido = { promesa: new Promise((listo) => { resolver = listo; }), resolver: () => resolver() };
    puntoEnCurso.current = pedido;
    esperaPunto.current = setTimeout(() => {
      direccionDelPunto({ lat, lng })
        .then((punto) => {
          if (puntoEnCurso.current !== pedido || !punto?.comuna) return;
          const nuevos = { ...datosActuales.current, comuna: punto.comuna, ...(punto.direccion && { direccion: punto.direccion }) };
          fijarDatos(nuevos);
          // Sin calle en ese punto queda la dirección anterior: hay que corregirla o confirmarla antes de guardar.
          // Revisión del PR 61: las coordenadas son las del punto consultado, no las vigentes, que pudo cambiar una
          // búsqueda de la dirección escrita respondida entretanto (quedaba el texto de un lugar con el punto de otro).
          fijarUbicacion({
            ...ubicacionActual.current, lat, lng, origen: 'manual', consulta: consultaDe(nuevos), punto, porConfirmar: !punto.direccion,
          });
          setErrores((previos) => ({ ...previos, comuna: undefined, direccion: undefined }));
        })
        .catch((error) => {
          if (puntoEnCurso.current === pedido) setErrorPunto({ mensaje: error.message, reintentable: error.estado !== 404 });
        })
        .finally(() => {
          if (puntoEnCurso.current === pedido) {
            puntoEnCurso.current = null;
            setBuscandoPunto(false);
          }
          resolver();
        });
    }, ESPERA_PUNTO_MS);
  }

  // Hasta que llegue la dirección del punto (con su calle), la ubicación queda por confirmar.
  // El marcador gana sobre una búsqueda de la dirección escrita que siga en curso: su respuesta ya no lo devuelve atrás.
  const mover = ({ lat, lng }) => {
    const nueva = {
      ...ubicacionActual.current, lat: redondear(lat), lng: redondear(lng), origen: 'manual', punto: null, porConfirmar: true, confirmada: false,
    };
    enCurso.current = null;
    setBuscando(false);
    fijarUbicacion(nueva);
    setErrores((previos) => ({ ...previos, ubicacionLat: undefined, ubicacionLng: undefined }));
    buscarPunto(nueva);
  };

  const avisar = (texto, enInformacion = false, tipo = 'error') => {
    setTipoMensaje(tipo);
    setMensaje(texto);
    setRevisarInformacion(enInformacion);
  };

  // El profesional confirma que la dirección escrita es la del marcador aunque no la hayamos podido comprobar.
  const confirmarDireccion = () => {
    fijarUbicacion({ ...ubicacionActual.current, porConfirmar: false, confirmada: true });
    setErrorPunto(null);
    avisar('');
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    avisar('');
    // Si el marcador se acaba de mover, primero se espera su dirección, para guardar la comuna y la dirección de ese punto.
    if (puntoEnCurso.current) {
      setEnviando(true);
      await puntoEnCurso.current.promesa;
      setEnviando(false);
    }
    const datos = datosActuales.current;
    const nuevos = validar(datos);
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    const guardada = ultimaFicha.current;
    // La especialidad sale de la ficha guardada o, la primera vez, de la elegida en «Información personal».
    const especialidadFicha = guardada?.especialidad ?? especialidad;
    if (!especialidadFicha) {
      avisar('Antes de guardar, elige tu especialidad en «Información personal».', true);
      return;
    }
    const online = datos.modalidad === 'online';
    if (guardada) {
      const anterior = desdeFicha(guardada);
      const mismosCampos = Object.keys(anterior).every((campo) => datos[campo].trim() === anterior[campo].trim());
      const mismoLugar = online || (ubicacionActual.current
        && ubicacionActual.current.lat === Number(guardada.ubicacionLat) && ubicacionActual.current.lng === Number(guardada.ubicacionLng));
      if (mismosCampos && mismoLugar) {
        avisar('No hay cambios pendientes.', false, 'info');
        return;
      }
    }
    setEnviando(true);
    try {
      const lugar = online ? null : await ubicar();
      if (!online && !lugar) {
        avisar('No pudimos ubicar tu lugar de atención en el mapa. Revisa tu comuna y tu dirección, o intenta de nuevo.');
        return;
      }
      if (!online && lugar.porConfirmar) {
        avisar('Antes de guardar, corrige tu dirección o confirma que corresponde al marcador.');
        return;
      }
      const respuesta = await guardarMiFicha({
        especialidad: especialidadFicha, descripcion: guardada?.descripcion ?? '', comuna: online ? null : datos.comuna.trim(),
        direccion: online ? null : datos.direccion.trim(), modalidad: datos.modalidad,
        ubicacionLat: lugar?.lat ?? null, ubicacionLng: lugar?.lng ?? null,
      });
      ultimaFicha.current = respuesta.ficha;
      onGuardado(respuesta.ficha);
    } catch (error) {
      const detalles = error.detalles || {};
      setErrores(detalles);
      avisar(error.message, Object.keys(detalles).some((campo) => CAMPOS_DE_INFORMACION.includes(campo)));
    } finally {
      setEnviando(false);
    }
  };

  const online = datos.modalidad === 'online';
  const errorDelMapa = errorUbicacion || errorPunto?.mensaje || errores.ubicacionLat || errores.ubicacionLng;
  const pendiente = !online && !buscandoPunto && porConfirmar(ubicacion, datos);
  const region = regionDeComuna(datos.comuna);
  const irAInformacion = <button type="button" className="boton-texto" onClick={() => onIrA?.('informacion')}>{especialidad ? 'Cambiar' : 'Elegir especialidad'}</button>;

  return (
    <form className="ficha-prof" onSubmit={guardar} noValidate aria-label="Lugar de atención">
      {!edicion && (
        <p className="ficha-prof__paso">
          {especialidad
            ? <><strong>Último paso.</strong> Indica cómo y dónde atiendes: al guardar se crea tu ficha. Especialidad: {especialidad}. {irAInformacion}</>
            : <><strong>Primero elige tu especialidad</strong> en «Información personal»; luego vuelve aquí para crear tu ficha. {irAInformacion}</>}
        </p>
      )}
      <Alerta tipo={tipoMensaje}>{mensaje}</Alerta>
      {revisarInformacion && onIrA && (
        <button type="button" className="boton boton--secundario boton--compacto ficha-prof__revisar" onClick={() => onIrA('informacion')}>
          Ir a «Información personal»
        </button>
      )}

      {/* En un panel ancho, los campos van a la izquierda y el mapa a la derecha (16-11-2026). */}
      <div className={`ficha-prof__lugar${online ? ' ficha-prof__lugar--online' : ''}`}>
        <div className="ficha-prof__campos">
          <CampoFormulario id="modalidad" etiqueta="Modalidad de atención (obligatorio)" value={datos.modalidad}
            onChange={cambiar('modalidad')} error={errores.modalidad}>
            <option value="" disabled>Selecciona cómo atiendes</option>
            {modalidades.map(({ valor, etiqueta }) => <option key={valor} value={valor}>{etiqueta}</option>)}
          </CampoFormulario>

          {online ? (
            <section className="ficha-prof__online" aria-label="Atención online">
              <h3><Icono nombre="video" /> Atención online</h3>
              <p className="texto-secundario">Tu perfil no mostrará una dirección ni una ubicación en el mapa.</p>
            </section>
          ) : (
            <fieldset className="ficha-prof__seccion">
              <legend className="solo-lector">Ubicación de atención</legend>
              <CampoFormulario id="comuna" etiqueta="Comuna (obligatorio)" maxLength={MAX_COMUNA} autoComplete="address-level2"
                placeholder="Ej.: Providencia" value={datos.comuna} onChange={cambiar('comuna')} onBlur={ubicar} error={errores.comuna}
                ayuda={region ?? undefined} />
              <CampoFormulario id="direccion" maxLength={MAX_DIRECCION} autoComplete="street-address"
                etiqueta="Dirección de atención (obligatorio)"
                placeholder="Ej.: Av. Providencia 1234, oficina 501" value={datos.direccion} onChange={cambiar('direccion')}
                onBlur={ubicar} error={errores.direccion}
                ayuda="Calle y número. Te ubicamos en el mapa para que los usuarios sepan dónde atiendes." />
            </fieldset>
          )}
        </div>

        {!online && (
          <div className="ficha-prof__mapa-columna">
            {ubicacion
              ? <MapaUbicacion ubicacion={ubicacion} onMover={mover} />
              : (
                <div className="ficha-prof__mapa">
                  <Icono nombre="pin" tamano={34} />
                  <p>{buscando ? 'Buscando tu dirección…' : 'Escribe tu comuna y tu dirección para ver tu lugar de atención en el mapa.'}</p>
                  {!buscando && datos.comuna.trim() && (
                    <button type="button" className="boton-texto" onClick={ubicar}>Ver en el mapa</button>
                  )}
                </div>
              )}
            {errorDelMapa ? (
              <p className="ficha-prof__estado-mapa ficha-prof__estado-mapa--error" role="alert">
                {errorDelMapa}{' '}
                {errorUbicacion && <button type="button" className="boton-texto" onClick={ubicar}>Buscar de nuevo</button>}
                {!errorUbicacion && errorPunto?.reintentable && (
                  <button type="button" className="boton-texto" onClick={() => buscarPunto(ubicacionActual.current)}>Buscar de nuevo</button>
                )}
              </p>
            ) : (
              <p className="ficha-prof__estado-mapa" role="status">
                {buscandoPunto && 'Buscando la dirección de ese punto…'}
                {!buscandoPunto && buscando && ubicacion && 'Buscando tu dirección…'}
                {!buscandoPunto && !buscando && ubicacion && explicarUbicacion(ubicacion, datos.modalidad)}
              </p>
            )}
            {pendiente && (
              <p className="ficha-prof__estado-mapa">
                Revisa que tu dirección corresponda al marcador: corrígela o confírmala.{' '}
                <button type="button" className="boton-texto" onClick={confirmarDireccion}>Confirmar dirección</button>
              </p>
            )}
            {ubicacion && (
              <p className="campo__ayuda ficha-prof__pista-mapa">
                ¿No quedó justo en tu lugar de atención? Arrastra el marcador o haz clic en el mapa.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="ficha-prof__acciones">
        {onCancelar && <button type="button" className="boton-texto" onClick={onCancelar}>Cancelar</button>}
        <button type="submit" className="boton boton--principal boton--compacto" disabled={enviando}>
          {enviando ? 'Guardando…' : <>{edicion ? 'Guardar cambios' : 'Guardar perfil'} <Icono nombre="check" tamano={18} /></>}
        </button>
      </div>
    </form>
  );
}
