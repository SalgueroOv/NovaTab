import { afirmar, igual } from './lib/util.mjs';

const modulo = `import('/js/widgets/reloj-mundial.js')`;
const anadirReloj = async (pg, marcar) => {
  await pg.clic('#btn-editar');
  await pg.clic('#btn-nuevo-widget');
  await pg.esperar(200);
  await pg.ev(`[...document.querySelectorAll('#dlg-widget .tipo-widget')].find(b => b.textContent.startsWith('Reloj mundial')).click()`);
  await pg.esperar(300);
  if (marcar) await marcar();
};
const casillas = `[...document.querySelectorAll('#dlg-widget input[type="checkbox"]')]`;
const guardar = async pg => {
  await pg.clic('#dlg-widget button[value="ok"]');
  await pg.esperar(400);
};
const filas = pg => pg.ev(`[...document.querySelectorAll('.widget-relojMundial .reloj-zona .nombre')].map(n => n.textContent)`);

export default {
  nombre: 'reloj mundial: registro de widgets, zonas, formato y ciclo completo',
  async ejecutar(abrir) {
    let pg = await abrir();
    await pg.esperar(300);

    // (a) registrar: un tipo repetido lanza; el nuevo sale en «Añadir widget».
    igual(await pg.ev(`import('/js/widgets.js').then(m => { try { m.registrar('notas', { def: {}, pintar() {}, configurador() {} }); return 'no lanza'; } catch (e) { return 'lanza'; } })`), 'lanza', 'registrar con un tipo repetido');
    await pg.clic('#btn-editar');
    await pg.clic('#btn-nuevo-widget');
    await pg.esperar(200);
    afirmar(await pg.ev(`[...document.querySelectorAll('#dlg-widget .tipo-widget')].some(b => b.textContent.startsWith('Reloj mundial'))`), 'el tipo nuevo está en el diálogo');
    await pg.ev(`document.getElementById('dlg-widget').close()`);

    // (b) La lista de zonas.
    const zonas = await pg.ev(`${modulo}.then(m => m.ZONAS)`);
    afirmar(zonas.length >= 38 && zonas.length <= 42, `entre 38 y 42 zonas (hay ${zonas.length})`);
    igual(new Set(zonas.map(z => z.id)).size, zonas.length, 'ids únicos');
    igual(new Set(zonas.map(z => z.nombre)).size, zonas.length, 'nombres únicos');
    igual(await pg.ev(`${modulo}.then(m => m.ZONAS.filter(z => { try { new Intl.DateTimeFormat('es', { timeZone: z.id }); return false; } catch { return true; } }).length)`), 0, 'todos los ids son zonas válidas');

    // (c) y (d) formatoZona con fechas fijas y el equipo en UTC.
    await pg.p.send('Emulation.setTimezoneOverride', { timezoneId: 'UTC' });
    const f = (id, iso, h24 = true) => pg.ev(`${modulo}.then(m => m.formatoZona('${id}', new Date('${iso}'), ${h24}))`);
    let r = await f('Europe/Madrid', '2026-03-29T01:30:00Z');
    igual([r.hora, r.utc], ['03:30', 'UTC+2'], 'Madrid al empezar la hora de verano');
    r = await f('Asia/Kolkata', '2026-03-29T01:30:00Z');
    igual([r.hora, r.utc], ['07:00', 'UTC+5:30'], 'Mumbai, media hora');
    r = await f('Pacific/Auckland', '2026-06-15T23:30:00Z');
    igual([r.hora, r.dia], ['11:30', 'mañana'], 'Auckland, un día después');
    r = await f('America/Los_Angeles', '2026-06-15T23:30:00Z');
    igual([r.hora, r.dia], ['16:30', 'hoy'], 'Los Ángeles, el mismo día');
    r = await f('Pacific/Honolulu', '2026-06-15T05:30:00Z');
    igual(r.dia, 'ayer', 'Honolulu, un día antes');
    afirmar(/[ap]\.?\s?m\./i.test((await f('Europe/Madrid', '2026-06-15T13:30:00Z', false)).hora), 'a. m. o p. m. con 12 horas');
    afirmar(!/[ap]\.?\s?m\./i.test((await f('Europe/Madrid', '2026-06-15T13:30:00Z', true)).hora), 'sin a. m. con 24 horas');

    // (e) zonasValidas.
    igual(await pg.ev(`${modulo}.then(m => m.zonasValidas(['Europe/Madrid', 'Europe/Madrid', 'x', 7, 'Asia/Tokyo']))`), ['Europe/Madrid', 'Asia/Tokyo'], 'sin repetidos ni inválidos');
    igual((await pg.ev(`${modulo}.then(m => m.zonasValidas(m.ZONAS.slice(0, 9).map(z => z.id)))`)).length, 6, 'como mucho 6');
    igual(await pg.ev(`${modulo}.then(m => m.zonasValidas(undefined))`), ['Europe/Madrid', 'America/New_York', 'Asia/Tokyo'], 'por defecto');

    // (f) Ciclo: añadir (con más de 6 casillas), configurar, recargar y borrar.
    pg = await abrir();
    await pg.esperar(300);
    await anadirReloj(pg);
    igual(await pg.ev(`${casillas}.filter(c => c.checked).map(c => c.value)`), ['Europe/Madrid', 'Asia/Tokyo', 'America/New_York'], 'casillas por defecto');
    await pg.ev(`${casillas}.forEach(c => { if (c.checked) c.click(); })`);
    await pg.ev(`${casillas}.slice(0, 6).forEach(c => c.click())`);
    await pg.ev(`${casillas}[6].click()`);
    igual(await pg.ev(`${casillas}.filter(c => c.checked).length`), 6, 'no se pueden marcar más de 6');
    await pg.ev(`${casillas}.forEach(c => { if (c.checked) c.click(); })`);
    await pg.clic('#dlg-widget button[value="ok"]');
    afirmar(await pg.ev(`document.getElementById('dlg-widget').open`), 'sin ciudades no se guarda');
    await pg.ev(`${casillas}.filter(c => ['Europe/London', 'Australia/Sydney'].includes(c.value)).forEach(c => c.click())`);
    await guardar(pg);
    igual(await filas(pg), ['Londres', 'Sídney'], 'dos ciudades pintadas');
    afirmar((await pg.ev(`document.querySelector('.widget-relojMundial .reloj-zona .hora').textContent`)).includes(':'), 'cada zona muestra su hora');
    await pg.recargar();
    await pg.esperar(400);
    igual(await filas(pg), ['Londres', 'Sídney'], 'tras recargar');
    await pg.clic('#btn-editar');
    await pg.ev(`document.querySelector('.widget-relojMundial [data-accion-widget="configurar"]').click()`);
    await pg.esperar(300);
    await pg.ev(`${casillas}.filter(c => c.value === 'Asia/Tokyo').forEach(c => c.click())`);
    await guardar(pg);
    igual(await filas(pg), ['Londres', 'Tokio', 'Sídney'], 'configurar cambia las ciudades (en el orden de la lista)');
    await pg.ev(`window.confirm = () => true`);
    await pg.ev(`document.querySelector('.widget-relojMundial [data-accion-widget="borrar"]').click()`);
    await pg.esperar(300);
    igual(await pg.ev(`novatab.datos.widgets.length`), 0, 'borrado de los datos');
    igual(await pg.ev(`document.querySelectorAll('.widget-relojMundial').length`), 0, 'borrado de la página');

    // (g) El día no depende del formato de toLocaleDateString: Honolulu y Auckland siguen bien.
    pg = await abrir();
    await pg.esperar(300);
    await pg.p.send('Emulation.setTimezoneOverride', { timezoneId: 'UTC' });
    const dias = await pg.ev(`${modulo}.then(m => ['Pacific/Auckland', 'Pacific/Honolulu', 'Europe/Madrid'].map(z => m.formatoZona(z, new Date('2026-06-15T11:00:00Z'), true).dia))`);
    igual(dias, ['hoy', 'hoy', 'hoy'], '11:00 UTC: el mismo día en esas zonas');
    const dias2 = await pg.ev(`${modulo}.then(m => ['Pacific/Auckland', 'Pacific/Honolulu'].map(z => m.formatoZona(z, new Date('2026-06-15T23:30:00Z'), true).dia))`);
    igual(dias2, ['mañana', 'hoy'], 'a las 23:30 UTC Auckland ya está en el día siguiente');
  },
};
