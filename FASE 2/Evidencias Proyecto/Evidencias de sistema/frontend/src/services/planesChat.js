import { solicitar } from './api.js';

// Planes enviados por el chat (SC-46): el profesional envía un plan de comidas o de macronutrientes y la persona lo guarda.
export const enviarPlan = (chatId, { tipo, plan, texto }) => solicitar(`/chats/${chatId}/planes`, { metodo: 'POST', cuerpo: { tipo, plan, texto } });
export const guardarPlanRecibido = (chatId, mensajeId) => solicitar(`/chats/${chatId}/mensajes/${mensajeId}/guardar`, { metodo: 'POST' });
// El profesional busca en el mismo catálogo de alimentos (la ruta de Comidas es solo para cuentas de usuario).
export const buscarAlimentosProfesional = (q) => solicitar(`/profesional/alimentos?q=${encodeURIComponent(q)}`);
