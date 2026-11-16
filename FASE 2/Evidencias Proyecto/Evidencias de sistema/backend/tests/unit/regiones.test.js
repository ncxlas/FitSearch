// Regiones y comunas de Chile (14-11-2026): lista de shared/regiones.json y agrupación de las comunas guardadas.
const {
  NOMBRES, comunasDeRegion, ubicarComuna, nombreOficial, agruparPorRegion, unirEspacios, nombreCompletoRegion, formasDeComuna, formasDeRegion, ubicarRegion,
} = require('../../src/utils/regiones');

test('la lista tiene las 16 regiones de norte a sur y sus 346 comunas', () => {
  expect(NOMBRES).toHaveLength(16);
  expect(NOMBRES[0]).toBe('Arica y Parinacota');
  expect(NOMBRES.at(-1)).toBe('Magallanes');
  expect(NOMBRES.reduce((total, region) => total + comunasDeRegion(region).length, 0)).toBe(346);
  expect(comunasDeRegion('Metropolitana')).toHaveLength(52);
  expect(comunasDeRegion('Valparaíso')).toEqual(expect.arrayContaining(['San Antonio', 'Cartagena', 'Santo Domingo']));
  expect(comunasDeRegion('Narnia')).toEqual([]);
});

test('ubica una comuna escrita sin tildes ni mayúsculas, y no inventa una que no existe', () => {
  expect(ubicarComuna('nunoa')).toEqual({ region: 'Metropolitana', comuna: 'Ñuñoa' });
  expect(ubicarComuna('  SAN   antonio ')).toEqual({ region: 'Valparaíso', comuna: 'San Antonio' });
  expect(ubicarComuna('Ciudad Gótica')).toBeNull();
  expect(ubicarComuna(null)).toBeNull();
  // Para mostrarla: el nombre oficial, o tal como se guardó si no está en la lista.
  expect(nombreOficial('san antonio')).toBe('San Antonio');
  expect(nombreOficial('Provdencia')).toBe('Provdencia');
  expect(nombreOficial(null)).toBeNull();
});

test('agrupa por región con el nombre oficial, de norte a sur, y deja en la lista general una comuna mal escrita', () => {
  expect(agruparPorRegion(['Providencia', 'san antonio', 'Ñuñoa', 'Temuco', 'Provdencia'])).toEqual({
    regiones: [
      { nombre: 'Valparaíso', comunas: ['San Antonio'] },
      { nombre: 'Metropolitana', comunas: ['Ñuñoa', 'Providencia'] },
      { nombre: 'La Araucanía', comunas: ['Temuco'] },
    ],
    comunas: ['Ñuñoa', 'Provdencia', 'Providencia', 'San Antonio', 'Temuco'],
  });
});

test('une los espacios repetidos de una comuna para guardarla, buscarla y mostrarla (15-11-2026)', () => {
  expect(unirEspacios('  San \t  Antonio\n')).toBe('San Antonio');
  expect(unirEspacios(undefined)).toBe('');
  expect(ubicarComuna('San  Antonio')).toEqual({ region: 'Valparaíso', comuna: 'San Antonio' });
  // Una comuna que no está en la lista también se muestra y se ofrece en el filtro con los espacios unidos, una vez.
  expect(nombreOficial('Ciudad  Gótica')).toBe('Ciudad Gótica');
  expect(agruparPorRegion(['Ciudad  Gótica', 'Ciudad Gótica', 'San  Antonio'])).toEqual({
    regiones: [{ nombre: 'Valparaíso', comunas: ['San Antonio'] }],
    comunas: ['Ciudad Gótica', 'San Antonio'],
  });
});

// Listado de regiones y comunas entregado por el PO el 15-11-2026.
test('usa los nombres del listado del PO y reconoce las formas anteriores de cuatro comunas', () => {
  expect(comunasDeRegion('Valparaíso')).toContain('Llaillay');
  expect(comunasDeRegion('Metropolitana')).toContain('Tiltil');
  expect(comunasDeRegion("O'Higgins")).toContain('Marchihue');
  expect(comunasDeRegion('Biobío')).toContain('San Pedro de la Paz');
  expect(ubicarComuna('Llay-Llay')).toEqual({ region: 'Valparaíso', comuna: 'Llaillay' });
  expect(ubicarComuna('til til')).toEqual({ region: 'Metropolitana', comuna: 'Tiltil' });
  expect(nombreOficial('Marchigüe')).toBe('Marchihue');
  expect(nombreOficial('san pedro de la paz')).toBe('San Pedro de la Paz');
  // Al filtrar se buscan también las formas anteriores, por si una ficha quedó guardada así.
  expect(formasDeComuna('Llaillay')).toEqual(['Llaillay', 'Llay-Llay']);
  expect(formasDeComuna('Providencia')).toEqual(['Providencia']);
  expect(formasDeComuna('Ciudad Gótica')).toEqual(['Ciudad Gótica']);
  expect(formasDeRegion('Metropolitana')).toEqual([...comunasDeRegion('Metropolitana'), 'Til Til']);
});

test('reconoce una región por su nombre corto o completo, como la escribe el mapa', () => {
  expect(ubicarRegion('Región de Valparaíso')).toBe('Valparaíso');
  expect(ubicarRegion('region metropolitana de santiago')).toBe('Metropolitana');
  expect(ubicarRegion('Biobío')).toBe('Biobío');
  expect(ubicarRegion('Provincia de Santiago')).toBeNull();
  expect(ubicarRegion(undefined)).toBeNull();
});

test('entrega el nombre completo de cada región', () => {
  expect(nombreCompletoRegion('Valparaíso')).toBe('Región de Valparaíso');
  expect(nombreCompletoRegion('Metropolitana')).toBe('Región Metropolitana de Santiago');
  expect(nombreCompletoRegion('Magallanes')).toBe('Región de Magallanes y de la Antártica Chilena');
  expect(nombreCompletoRegion('Narnia')).toBeNull();
});
