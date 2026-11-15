import datos from '@shared/regiones.json';

// Región de una comuna escrita en la ficha del profesional (15-11-2026), con la misma lista que usa la API
// (shared/regiones.json): sin tildes, mayúsculas ni espacios de más, y con las formas anteriores («Llay-Llay»).
const normalizar = (texto) => String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const DE_COMUNA = new Map(datos.regiones.flatMap((region) => region.comunas.map((comuna) => [normalizar(comuna), region])));
for (const [otraForma, oficial] of Object.entries(datos.alias)) DE_COMUNA.set(normalizar(otraForma), DE_COMUNA.get(normalizar(oficial)));

// Nombre completo de la región («Región de Valparaíso»), o null si la comuna no está en la lista.
export const regionDeComuna = (comuna) => (comuna ? DE_COMUNA.get(normalizar(comuna))?.nombreCompleto ?? null : null);
