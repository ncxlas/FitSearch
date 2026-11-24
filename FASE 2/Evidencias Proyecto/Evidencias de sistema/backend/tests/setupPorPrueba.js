// Se ejecuta antes de cada archivo de pruebas, con Jest ya cargado.
// Los límites de intentos (SC-41) guardan sus contadores en memoria: cada prueba parte con ellos vacíos, para que
// los fallos de inicio de sesión de una prueba no bloqueen a la siguiente.
beforeEach(() => {
  require('../src/middlewares/limiteIntentos').reiniciarLimites();
});
