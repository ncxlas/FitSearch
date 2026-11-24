import { solicitar } from './api.js';

// Progreso compartido con un profesional (SC-45).
export const listarCompartidos = () => solicitar('/compartir');
export const guardarCompartir = (profesionalId, permisos) => solicitar(`/compartir/${profesionalId}`, { metodo: 'PUT', cuerpo: permisos });
export const dejarDeCompartir = (profesionalId) => solicitar(`/compartir/${profesionalId}`, { metodo: 'DELETE' });
export const obtenerProgresoCliente = (usuarioId) => solicitar(`/profesional/progreso/${usuarioId}`);

export const NOMBRES_CATEGORIA = { perfil: 'Perfil', salud: 'Salud', comidas: 'Comidas', peso: 'Peso', planes: 'Planes' };
export const nombresDe = (permisos) => Object.keys(NOMBRES_CATEGORIA).filter((c) => permisos?.[c]).map((c) => NOMBRES_CATEGORIA[c]);
