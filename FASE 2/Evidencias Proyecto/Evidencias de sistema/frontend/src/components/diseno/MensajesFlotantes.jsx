import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext.jsx';
import { Bandeja, ChatAbierto, useConsultaPeriodica } from '../../pages/Mensajes.jsx';
import Alerta from '../Alerta.jsx';
import Icono from '../Icono.jsx';

export default function MensajesFlotantes() {
  const { sesion } = useSesion();
  const { pathname } = useLocation();
  const profesional = sesion.usuario.rol === 'profesional';
  const base = profesional ? '/profesional/mensajes' : '/mensajes';
  const [modo, setModo] = useState('minimizado');
  const [iniciado, setIniciado] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [revision, setRevision] = useState(0);
  const boton = useRef(null);
  const panel = useRef(null);
  const enPagina = pathname === base || pathname.startsWith(`${base}/`);
  const visible = modo !== 'minimizado' && !enPagina;
  const lista = useConsultaPeriodica(iniciado ? '/chats' : null, revision, visible);
  const detalle = useConsultaPeriodica(chatId ? `/chats/${chatId}` : null, revision, visible);
  const avisos = useConsultaPeriodica('/chats/no-leidos', revision);
  const total = avisos.datos?.total || 0;
  const minimizar = () => { setModo('minimizado'); boton.current?.focus(); };
  const abrir = () => { setIniciado(true); setModo('compacto'); };
  useEffect(() => {
    if (!visible) return undefined;
    panel.current?.focus({ preventScroll: true });
  }, [visible]);
  if (enPagina) return null;
  return <aside className={`mensajes-flotantes mensajes-flotantes--${modo}`} aria-label="Mensajes flotantes">
    <button ref={boton} type="button" className="mensajes-flotantes__abrir" hidden={visible} aria-expanded={visible}
      aria-controls="ventana-mensajes" onClick={abrir}>
      <Icono nombre="chat" tamano={22} />Mensajes{total > 0 && <span className="mensajes-flotantes__contador">{total}</span>}
      <span aria-hidden="true">⌃</span>
    </button>
    {iniciado && <section ref={panel} id="ventana-mensajes" className="mensajes-flotantes__ventana" hidden={!visible} tabIndex={-1}
      aria-label="Ventana de mensajes" onKeyDown={(e) => { if (e.key === 'Escape' && !e.defaultPrevented && !e.target.closest('.buscador-chat, .confirmar-eliminar')) minimizar(); }}>
      <header className="mensajes-flotantes__barra">
        <strong>Mensajes{total > 0 && <span className="mensajes-flotantes__contador">{total}</span>}</strong>
        <div>
          <button type="button" className="boton-icono" aria-label={modo === 'ampliado' ? 'Achicar mensajes' : 'Ampliar mensajes'} onClick={() => setModo(modo === 'ampliado' ? 'compacto' : 'ampliado')}><span aria-hidden="true">{modo === 'ampliado' ? '▣' : '⛶'}</span></button>
          <button type="button" className="boton-icono" aria-label="Minimizar mensajes" onClick={minimizar}><span aria-hidden="true">⌄</span></button>
          <button type="button" className="boton-icono" aria-label="Cerrar ventana de mensajes" onClick={minimizar}><Icono nombre="cerrar" tamano={19} /></button>
        </div>
      </header>
      <div className={`mensajes-flotantes__cuerpo${chatId ? ' mensajes-flotantes__cuerpo--con-chat' : ''}`}>
        <div className="mensajes-flotantes__lista">
          {lista.error && !lista.datos ? <Alerta>{lista.error.message}</Alerta> : !lista.datos ? <p role="status">Cargando chats…</p>
            : <Bandeja base={base} chats={lista.datos.chats} activo={chatId} profesional={profesional} onAbrirChat={setChatId} />}
        </div>
        <div className="mensajes-flotantes__chat mensajes__conversacion">
          {!chatId ? <p className="mensajes-flotantes__vacio">Elige una conversación para leer y responder.</p>
            : detalle.error && !detalle.datos ? <><Alerta>{detalle.error.message}</Alerta><button type="button" className="boton-texto" onClick={() => setChatId(null)}>Volver a los chats</button></>
              : !detalle.datos ? <p role="status">Cargando chat…</p>
                : <ChatAbierto key={chatId} base={base} datos={detalle.datos} profesional={profesional} onVolver={() => setChatId(null)}
                  onEnviado={() => setRevision((r) => r + 1)} onEliminado={() => { setChatId(null); setRevision((r) => r + 1); }} />}
        </div>
      </div>
    </section>}
  </aside>;
}
