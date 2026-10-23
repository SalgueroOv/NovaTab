// Pila de deshacer y rehacer. No sabe qué guarda: cada «foto» es un valor opaco que pone quien la usa.

export function crearHistorial(max = 20) {
  let atras = [];
  let adelante = [];
  return {
    // Una foto nueva descarta la más antigua si se pasa de «max» y borra lo que se podía rehacer.
    empujar(foto) {
      atras.push(foto);
      if (atras.length > max) atras.shift();
      adelante = [];
    },
    // «actual» es la foto del estado de ahora: pasa a poder rehacerse.
    deshacer(actual) {
      if (!atras.length) return null;
      adelante.push(actual);
      return atras.pop();
    },
    rehacer(actual) {
      if (!adelante.length) return null;
      atras.push(actual);
      return adelante.pop();
    },
    limpiar() { atras = []; adelante = []; },
    puedeDeshacer: () => atras.length > 0,
    puedeRehacer: () => adelante.length > 0,
  };
}
