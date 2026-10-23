import { afirmar, igual } from './lib/util.mjs';
import { conWidgets } from './lib/datos-prueba.mjs';

const fechaLocal = (desplazarDias = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + desplazarDias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const copiasGuardadas = `Object.keys(localStorage).filter(k => k.startsWith('copia:principal:')).sort()`;
const copia = (dias, nombre) => ({
  fecha: fechaLocal(-dias),
  datos: {
    version: 4, titulos: { local: 'Pruebas' }, widgets: [],
    grupos: [{ id: `g-${nombre}`, nombre, zona: 'local', color: '#6aa7e0', pos: { x: 1, y: 1, w: 6 }, plegado: false, privado: false, enlaces: [{ id: 'e-1', nombre: 'Uno', url: 'http://192.168.1.2/' }] }],
  },
  notas: {},
});
const NOTAS = conWidgets([{ id: 'w-notas', tipo: 'notas', panel: 'izq', pos: { x: 1, y: 1, w: 6, h: 4 }, config: {} }]);

export default {
  nombre: 'copias: una por día, las 7 últimas y recuperables desde Opciones',
  async ejecutar(abrir) {
    // (a) Al abrir con datos sin copias se crea la de hoy, con grupos y notas; recargar no la repite.
    let pg = await abrir({ datos: NOTAS, guardados: { 'nota:w-notas': 'apunte del día' } });
    await pg.esperar(400);
    igual(await pg.ev(copiasGuardadas), [`copia:principal:${fechaLocal()}`], 'copia de hoy');
    let c = JSON.parse(await pg.ev(`localStorage.getItem('copia:principal:${fechaLocal()}')`));
    igual(c.fecha, fechaLocal(), 'fecha de la copia');
    igual(c.datos.grupos.map(g => g.nombre), ['Alfa', 'Beta', 'Gamma', 'Trabajo', 'Ocio'], 'grupos de la copia');
    igual(c.datos.grupos[0].enlaces.length, 4, 'enlaces dentro de la copia');
    igual(c.notas, { 'w-notas': 'apunte del día' }, 'notas de la copia');
    await pg.ev(`localStorage.setItem('copia:principal:${fechaLocal()}', JSON.stringify({ ...JSON.parse(localStorage.getItem('copia:principal:${fechaLocal()}')), marca: 1 }))`);
    await pg.recargar();
    await pg.esperar(300);
    c = JSON.parse(await pg.ev(`localStorage.getItem('copia:principal:${fechaLocal()}')`));
    igual(c.marca, 1, 'recargar el mismo día no reescribe la copia');

    // (b) Con 8 copias antiguas, tras abrir quedan 7 y desaparece la más antigua.
    const antiguas = {};
    for (let i = 1; i <= 8; i++) antiguas[`copia:principal:${fechaLocal(-i)}`] = copia(i, `Dia${i}`);
    pg = await abrir({ guardados: antiguas });
    await pg.esperar(400);
    const claves = await pg.ev(copiasGuardadas);
    igual(claves.length, 7, 'copias tras abrir');
    afirmar(claves.includes(`copia:principal:${fechaLocal()}`), 'la de hoy está');
    afirmar(!claves.includes(`copia:principal:${fechaLocal(-8)}`) && !claves.includes(`copia:principal:${fechaLocal(-7)}`), 'las más antiguas se borraron');

    // (c) La lista muestra hoy y las válidas, ignora la corrupta, y «Recuperar» es deshacible.
    pg = await abrir({ guardados: { [`copia:principal:${fechaLocal(-2)}`]: copia(2, 'Antiguo'), [`copia:principal:${fechaLocal(-1)}`]: { basura: 1 } } });
    await pg.esperar(400);
    await pg.ev(`window.confirm = () => true`);
    await pg.clic('#btn-tema');
    const filas = await pg.ev(`[...document.querySelectorAll('#lista-copias li')].map(li => li.querySelector('span').textContent)`);
    igual(filas.length, 2, 'filas en la lista (hoy y hace dos días; la corrupta no)');
    afirmar(/hoy/i.test(filas[0]), 'la primera es la de hoy');
    const antes = (await pg.datos()).grupos.map(g => g.nombre);
    await pg.ev(`document.querySelectorAll('#lista-copias li')[1].querySelector('button').click()`);
    await pg.esperar(500);
    igual((await pg.datos()).grupos.map(g => g.nombre), ['Antiguo'], 'datos tras recuperar la copia');
    igual(await pg.ev(`document.getElementById('aviso-accion').hidden`), false, 'aviso de copia recuperada');
    await pg.tecla('z', 'ctrl');
    await pg.esperar(500);
    igual((await pg.datos()).grupos.map(g => g.nombre), antes, 'Ctrl+Z devuelve el estado de antes de recuperar');

    // (d) Recuperar una copia sin widgets de notas no deja notas huérfanas.
    pg = await abrir({ datos: NOTAS, guardados: { 'nota:w-notas': 'texto', [`copia:principal:${fechaLocal(-3)}`]: copia(3, 'Sin widgets') } });
    await pg.esperar(400);
    await pg.clic('#btn-tema');
    await pg.ev(`document.querySelectorAll('#lista-copias li')[1].querySelector('button').click()`);
    await pg.esperar(500);
    igual(await pg.ev(`Object.keys(localStorage).filter(k => k.startsWith('nota:'))`), [], 'sin notas huérfanas');

    // Revisión final · (e) Una copia de hoy corrupta no bloquea la del día y una clave que no es fecha no cuenta.
    const sembradas = { [`copia:principal:${fechaLocal()}`]: { basura: 1 }, 'copia:principal:zzz': copia(1, 'Rara') };
    for (let i = 1; i <= 6; i++) sembradas[`copia:principal:${fechaLocal(-i)}`] = copia(i, `Dia${i}`);
    pg = await abrir({ guardados: sembradas });
    await pg.esperar(400);
    c = JSON.parse(await pg.ev(`localStorage.getItem('copia:principal:${fechaLocal()}')`));
    afirmar(Array.isArray(c.datos?.grupos), 'la copia corrupta de hoy se sustituye por una válida');
    igual((await pg.ev(copiasGuardadas)).filter(k => /^copia:principal:\d{4}-\d{2}-\d{2}$/.test(k)).length, 7, 'siete copias con fecha');
  },
};
