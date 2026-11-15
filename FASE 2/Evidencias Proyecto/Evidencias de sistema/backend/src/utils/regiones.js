// Regiones de Chile y sus comunas (14-11-2026): la lista oficial está en shared/regiones.json (16 regiones y 346
// comunas, de norte a sur). La usan los filtros por región del buscador de profesionales y de los establecimientos.
const { regiones } = require('../../../shared/regiones.json');

// Para comparar una comuna escrita a mano con la lista: sin tildes, sin mayúsculas y sin espacios de más.
const normalizar = (texto) => String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const NOMBRES = regiones.map(({ nombre }) => nombre);
const DE_COMUNA = new Map(regiones.flatMap(({ nombre, comunas }) => comunas.map((comuna) => [normalizar(comuna), { region: nombre, comuna }])));
const ordenar = (lista) => [...lista].sort((a, b) => a.localeCompare(b, 'es'));

// Espacios repetidos, tabulaciones o saltos de línea quedan como un solo espacio, sin espacios a los lados. Se aplica a
// la comuna al guardarla y al buscarla, para que «San  Antonio» y «San Antonio» sean la misma (15-11-2026).
const unirEspacios = (texto) => (typeof texto === 'string' ? texto.replace(/\s+/g, ' ').trim() : '');

const comunasDeRegion = (region) => regiones.find(({ nombre }) => nombre === region)?.comunas ?? [];

// Región y nombre oficial de una comuna guardada («san antonio» → San Antonio, de Valparaíso); null si no es de Chile.
const ubicarComuna = (comuna) => (comuna ? DE_COMUNA.get(normalizar(comuna)) ?? null : null);

// Nombre oficial para mostrar una comuna guardada; si no está en la lista, como se guardó pero con los espacios unidos.
const nombreOficial = (comuna) => (comuna ? ubicarComuna(comuna)?.comuna ?? unirEspacios(comuna) : null);

// Agrupa las comunas que tienen resultados por región, con su nombre oficial y de norte a sur. Una comuna que no está
// en la lista (mal escrita) no tiene región, pero sigue en la lista general para que se pueda filtrar por ella.
function agruparPorRegion(guardadas) {
  const porRegion = new Map();
  const todas = new Set();
  for (const guardada of guardadas) {
    const ubicada = ubicarComuna(guardada);
    if (!ubicada) {
      todas.add(unirEspacios(guardada));
      continue;
    }
    todas.add(ubicada.comuna);
    if (!porRegion.has(ubicada.region)) porRegion.set(ubicada.region, new Set());
    porRegion.get(ubicada.region).add(ubicada.comuna);
  }
  return {
    regiones: NOMBRES.filter((nombre) => porRegion.has(nombre)).map((nombre) => ({ nombre, comunas: ordenar(porRegion.get(nombre)) })),
    comunas: ordenar(todas),
  };
}

module.exports = { NOMBRES, comunasDeRegion, ubicarComuna, nombreOficial, agruparPorRegion, normalizar, unirEspacios };
