// Regiones y comunas de Chile (14-11-2026): lista de shared/regiones.json y agrupación de las comunas guardadas.
const { NOMBRES, comunasDeRegion, ubicarComuna, nombreOficial, agruparPorRegion } = require('../../src/utils/regiones');

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
