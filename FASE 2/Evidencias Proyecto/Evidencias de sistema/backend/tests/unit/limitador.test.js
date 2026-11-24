// Pruebas del límite de intentos en memoria (SC-41; DAS, QS8 y D41). El reloj se avanza a mano, sin esperar.
const { esperaProgresiva, ventana, MAX_CLAVES } = require('../../src/utils/limitador');

const MINUTO = 60 * 1000;

function reloj(inicio = Date.UTC(2026, 10, 24, 12)) {
  let t = inicio;
  const ahora = () => t;
  ahora.avanzar = (ms) => { t += ms; };
  return ahora;
}

describe('espera progresiva', () => {
  const crear = (ahora, extra = {}) => esperaProgresiva({ libres: 5, esperaBaseMs: MINUTO, esperaMaxMs: 15 * MINUTO, olvidoMs: 15 * MINUTO, ahora, ...extra });

  test('los primeros fallos son libres y el quinto bloquea un minuto', () => {
    const ahora = reloj();
    const limite = crear(ahora);
    for (let i = 0; i < 4; i += 1) limite.fallo('correo:ana@correo.cl');
    expect(limite.espera('correo:ana@correo.cl')).toBe(0);
    limite.fallo('correo:ana@correo.cl');
    expect(limite.espera('correo:ana@correo.cl')).toBe(MINUTO);
    ahora.avanzar(30 * 1000);
    expect(limite.espera('correo:ana@correo.cl')).toBe(30 * 1000);
    expect(limite.espera('correo:otra@correo.cl')).toBe(0);
  });

  test('cada fallo nuevo duplica la espera hasta el máximo de 15 minutos', () => {
    const ahora = reloj();
    const limite = crear(ahora);
    const esperas = [];
    for (let i = 0; i < 10; i += 1) {
      ahora.avanzar(limite.espera('k'));
      limite.fallo('k');
      esperas.push(limite.espera('k') / MINUTO);
    }
    expect(esperas).toEqual([0, 0, 0, 0, 1, 2, 4, 8, 15, 15]);
  });

  test('al terminar la espera máxima no vuelven los intentos libres: hay que esperar 15 minutos más sin fallar', () => {
    const ahora = reloj();
    const limite = crear(ahora);
    for (let i = 0; i < 9; i += 1) { ahora.avanzar(limite.espera('k')); limite.fallo('k'); }
    ahora.avanzar(15 * MINUTO);
    expect(limite.espera('k')).toBe(0);
    limite.fallo('k');
    expect(limite.espera('k')).toBe(15 * MINUTO);
    ahora.avanzar(30 * MINUTO);
    limite.fallo('k');
    expect(limite.espera('k')).toBe(0);
  });

  test('olvidar borra los fallos; descontar quita uno y levanta el bloqueo bajo el umbral', () => {
    const ahora = reloj();
    const limite = crear(ahora);
    for (let i = 0; i < 5; i += 1) limite.fallo('a');
    expect(limite.espera('a')).toBeGreaterThan(0);
    limite.descontar('a');
    expect(limite.espera('a')).toBe(0);
    limite.fallo('a');
    expect(limite.espera('a')).toBe(MINUTO);
    limite.olvidar('a');
    expect(limite.espera('a')).toBe(0);
    expect(limite.claves).toBe(0);
  });

  test('una clave sin fallos por 15 minutos y sin bloqueo vigente empieza de cero', () => {
    const ahora = reloj();
    const limite = crear(ahora);
    for (let i = 0; i < 4; i += 1) limite.fallo('a');
    ahora.avanzar(15 * MINUTO);
    limite.fallo('a');
    expect(limite.espera('a')).toBe(0);
  });

  test('con el mapa lleno sale una clave libre, nunca una bloqueada', () => {
    const ahora = reloj();
    const limite = crear(ahora, { maxClaves: 3, libres: 2 });
    limite.fallo('bloqueada');
    limite.fallo('bloqueada');
    for (let i = 0; i < 10; i += 1) limite.fallo(`nueva-${i}`);
    expect(limite.claves).toBe(3);
    expect(limite.espera('bloqueada')).toBe(MINUTO);
  });
});

describe('ventana fija', () => {
  test('deja pasar el máximo y después dice cuánto falta para que se renueve', () => {
    const ahora = reloj();
    const limite = ventana({ max: 3, duracionMs: 60 * MINUTO, ahora });
    expect([1, 2, 3].map(() => limite.consumir('correo:ana'))).toEqual([0, 0, 0]);
    expect(limite.consumir('correo:ana')).toBe(60 * MINUTO);
    ahora.avanzar(45 * MINUTO);
    expect(limite.consumir('correo:ana')).toBe(15 * MINUTO);
    expect(limite.consumir('correo:otra')).toBe(0);
    ahora.avanzar(15 * MINUTO);
    expect(limite.consumir('correo:ana')).toBe(0);
  });

  test('el mapa no crece más allá de su tope', () => {
    const limite = ventana({ max: 1, duracionMs: MINUTO, maxClaves: 50, ahora: reloj() });
    for (let i = 0; i < 500; i += 1) limite.consumir(`ip:${i}`);
    expect(limite.claves).toBe(50);
    expect(MAX_CLAVES).toBe(10000);
  });
});
