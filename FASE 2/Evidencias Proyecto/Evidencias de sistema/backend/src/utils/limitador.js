// Límite de intentos en memoria para las rutas de acceso (SC-41; DAS, QS8 y D41).
//
// Dos formas de contar, cada una con su propio mapa de claves (un correo, una dirección IP o una cuenta):
//  - esperaProgresiva: cuenta fallos. Los primeros `libres` no cuestan nada; desde ahí la clave queda bloqueada
//    `esperaBaseMs`, el doble con cada fallo nuevo, hasta `esperaMaxMs`. Se olvida tras `olvidoMs` sin fallos
//    contados desde que terminó su último bloqueo.
//    El intento se anota ANTES de conocer el resultado (una contraseña tarda en compararse y una ráfaga en paralelo
//    pasaría completa) y se borra o se descuenta si resulta correcto.
//  - ventana: cuenta todas las peticiones de una clave dentro de una ventana fija de tiempo (un presupuesto simple).
//
// El estado vive en memoria del proceso: la API corre como un solo proceso y, si se reinicia, los contadores
// empiezan de cero (los bloqueos duran minutos). Cada mapa tiene un tope de claves para que nadie lo haga crecer
// sin fin enviando correos o direcciones distintas. `ahora` se inyecta en las pruebas para avanzar el reloj sin esperar.

const MAX_CLAVES = 10000;

function mapaAcotado(maxClaves, bloqueada) {
  const mapa = new Map();
  return {
    get: (clave) => mapa.get(clave),
    delete: (clave) => mapa.delete(clave),
    clear: () => mapa.clear(),
    get size() { return mapa.size; },
    // Reinsertar deja la clave al final: el mapa queda ordenado de la menos a la más recientemente usada.
    set(clave, valor) {
      mapa.delete(clave);
      if (mapa.size >= maxClaves) {
        // Sale la clave menos reciente que no esté bloqueada. Sacar una bloqueada le daría al atacante una forma
        // de borrar su propio bloqueo llenando el mapa con claves nuevas; solo si todas lo están, sale la más antigua.
        let victima = mapa.keys().next().value;
        for (const [k, v] of mapa) {
          if (!bloqueada(v)) { victima = k; break; }
        }
        mapa.delete(victima);
      }
      mapa.set(clave, valor);
    },
  };
}

const relojDelSistema = () => Date.now();

function esperaProgresiva({ libres, esperaBaseMs, esperaMaxMs, olvidoMs, maxClaves = MAX_CLAVES, ahora = relojDelSistema }) {
  const mapa = mapaAcotado(maxClaves, (e) => e.bloqueoHasta > ahora());

  function vigente(clave) {
    const entrada = mapa.get(clave);
    if (!entrada) return null;
    const t = ahora();
    // El olvido se cuenta desde el último fallo o desde que terminó el bloqueo, lo que sea más tarde: si no, al acabar
    // una espera máxima de 15 minutos la clave quedaría olvidada al instante y volvería a tener sus intentos libres.
    if (entrada.bloqueoHasta <= t && t - Math.max(entrada.ultimoFallo, entrada.bloqueoHasta) >= olvidoMs) {
      mapa.delete(clave);
      return null;
    }
    return entrada;
  }

  return {
    // Milisegundos que faltan para que la clave pueda volver a intentar (0 si está libre).
    espera(clave) {
      const entrada = vigente(clave);
      return entrada ? Math.max(entrada.bloqueoHasta - ahora(), 0) : 0;
    },
    // Anota un intento como fallo. Al llegar a `libres` fallos, bloquea; cada fallo siguiente duplica la espera.
    fallo(clave) {
      const t = ahora();
      const entrada = vigente(clave) || { fallos: 0, bloqueoHasta: 0, ultimoFallo: t };
      entrada.fallos += 1;
      entrada.ultimoFallo = t;
      if (entrada.fallos >= libres) {
        const espera = Math.min(esperaBaseMs * 2 ** (entrada.fallos - libres), esperaMaxMs);
        entrada.bloqueoHasta = t + espera;
      }
      mapa.set(clave, entrada);
    },
    // El intento anotado resultó correcto: se descuenta (sin tocar un bloqueo que otras peticiones ya ganaron).
    descontar(clave) {
      const entrada = vigente(clave);
      if (!entrada) return;
      entrada.fallos = Math.max(entrada.fallos - 1, 0);
      if (entrada.fallos < libres) entrada.bloqueoHasta = 0;
      if (entrada.fallos === 0) mapa.delete(clave);
    },
    // Ingreso correcto de la cuenta: se olvidan todos sus fallos.
    olvidar(clave) { mapa.delete(clave); },
    reiniciar() { mapa.clear(); },
    get claves() { return mapa.size; },
  };
}

function ventana({ max, duracionMs, maxClaves = MAX_CLAVES, ahora = relojDelSistema }) {
  const mapa = mapaAcotado(maxClaves, (e) => e.cuenta >= max && ahora() - e.inicio < duracionMs);

  return {
    // Cuenta la petición. Devuelve 0 si cabe en el presupuesto, o los milisegundos que faltan para que se renueve.
    consumir(clave) {
      const t = ahora();
      let entrada = mapa.get(clave);
      if (!entrada || t - entrada.inicio >= duracionMs) entrada = { inicio: t, cuenta: 0 };
      if (entrada.cuenta >= max) {
        mapa.set(clave, entrada);
        return entrada.inicio + duracionMs - t;
      }
      entrada.cuenta += 1;
      mapa.set(clave, entrada);
      return 0;
    },
    reiniciar() { mapa.clear(); },
    get claves() { return mapa.size; },
  };
}

module.exports = { esperaProgresiva, ventana, MAX_CLAVES };
