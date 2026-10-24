'use strict';
// Mockups v2 de NovaTab. Común a las tres propuestas: datos de ejemplo, terreno generado por perfil,
// temas que tiñen todas las superficies, latencias simuladas, paleta de comandos y Personalizar.
const Nova = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reducido = matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- Iconos (trazos al estilo Lucide) ----------

  const ICONOS = {
    buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    ojo: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    ojoNo: '<path d="M10.7 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.2 3.1M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    lapiz: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    ajustes: '<path d="M20 7h-9M14 17H4"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
    comando: '<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>',
    cerrar: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    mas: '<path d="M5 12h14M12 5v14"/>',
    abajo: '<path d="m6 9 6 6 6-6"/>',
    arriba: '<path d="m18 15-6-6-6 6"/>',
    descargar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    subir: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    papelera: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    marcador: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/>',
    montana: '<path d="m8 3 4 8 5-5 5 15H2Z"/>',
    dado: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h.01M16 16h.01M16 8h.01M8 16h.01M12 12h.01"/>',
    flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    mundo: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    servidor: '<rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01"/>',
    deshacer: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    widget: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
    asa: '<path d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01"/>',
    puntos: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    capas: '<path d="m12 2 10 5-10 5L2 7Z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  };
  const ico = (n, c = '') => `<svg class="ico ${c}" viewBox="0 0 24 24" aria-hidden="true">${ICONOS[n]}</svg>`;

  // ---------- Temas: tres colores; todo lo demás se deriva en CSS ----------

  const TEMAS = {
    bosque: { nombre: 'Bosque', modo: 'oscuro', bg: '#131c17', ink: '#e3ece5', acento: '#a8d672' },
    noche: { nombre: 'Noche', modo: 'oscuro', bg: '#0f1216', ink: '#e6eaf0', acento: '#f2b35b' },
    carbon: { nombre: 'Carbón', modo: 'oscuro', bg: '#151515', ink: '#ececec', acento: '#ff7a45' },
    abismo: { nombre: 'Abismo', modo: 'oscuro', bg: '#0b191d', ink: '#dcecef', acento: '#4fd1c5' },
    papel: { nombre: 'Papel', modo: 'claro', bg: '#f0ece3', ink: '#1d1c19', acento: '#2a4fb0' },
    glaciar: { nombre: 'Glaciar', modo: 'claro', bg: '#e5eef2', ink: '#0f2029', acento: '#0a7099' },
    menta: { nombre: 'Menta', modo: 'claro', bg: '#e8f2ec', ink: '#122219', acento: '#1b7d4c' },
    rosa: { nombre: 'Rosa', modo: 'claro', bg: '#f8eef0', ink: '#2a1418', acento: '#bd2d57' },
  };
  const ALTERNATIVOS = ['#e8c547', '#f08a5d', '#e5566f', '#4fd1c5', '#6aa8ff'];

  const FONDOS = {
    curvas: { nombre: 'Curvas' },
    cotas: { nombre: 'Cotas' },
    sombreado: { nombre: 'Sombreado' },
    crestas: { nombre: 'Crestas' },
    grafo: { nombre: 'Grafo' },
    rayas: { nombre: 'Rayas' },
    rombos: { nombre: 'Rombos' },
    trama: { nombre: 'Trama' },
    galaxia: { nombre: 'Galaxia' },
    liso: { nombre: 'Liso' },
    imagen: { nombre: 'Tu imagen' },
  };
  // Imágenes propias ya cargadas, por dirección; al terminar de cargar se repinta lo que las usa.
  const imagenes = new Map();
  function imagenDe(src) {
    if (!src) return null;
    if (!imagenes.has(src)) {
      const img = new Image();
      img.onload = () => { if (terreno) terreno.pedido = true; pintarMinis(); };
      img.src = src;
      imagenes.set(src, img);
    }
    const img = imagenes.get(src);
    return img.complete && img.naturalWidth ? img : null;
  }
  const MOVIMIENTOS = [['quieto', 'Quieto'], ['lento', 'Lento'], ['vivo', 'Vivo']];

  // ---------- Datos de ejemplo ----------

  const aspectoBase = { estilo: 'mapa', imagen: null, velo: .45, acento: null, fondo: 'curvas', densidad: .55, relieve: .45, movimiento: 'lento', brillo: true,
    dens: 'comoda', esquinas: 'medio', reloj: { h24: true, segundos: false, fecha: true }, paneles: { inicio: true, internet: true, servicios: true } };

  const PERFILES = [
    { ...aspectoBase, id: 'casa', nombre: 'Casa', semilla: 'casa', tema: 'bosque',
      grupos: [
        { nombre: 'Servidor', servicios: [
          { nombre: 'Proxmox', url: 'https://192.168.1.10:8006', icono: 'proxmox', ms: 4 },
          { nombre: 'Portainer', url: 'http://192.168.1.10:9000', icono: 'portainer', ms: 6 },
          { nombre: 'Jellyfin', url: 'http://192.168.1.10:8096', icono: 'jellyfin', ms: 9 },
          { nombre: 'Home Assistant', url: 'http://192.168.1.20:8123', icono: 'home-assistant', ms: 12 },
        ] },
        { nombre: 'Red y almacenamiento', servicios: [
          { nombre: 'Router', url: 'http://192.168.1.1', icono: 'openwrt', ms: 2 },
          { nombre: 'NAS', url: 'https://192.168.1.30:5001', icono: 'synology', caido: '23:14' },
          { nombre: 'Pi-hole', url: 'http://192.168.1.2/admin', icono: 'pi-hole', ms: 3 },
        ] },
        { nombre: 'Familia', privado: true, servicios: [
          { nombre: 'Immich', url: 'http://192.168.1.10:2283', icono: 'immich', ms: 15 },
          { nombre: 'Nextcloud', url: 'https://192.168.1.10:8443', icono: 'nextcloud', ms: 21 },
        ] },
      ],
      internet: [
        { nombre: 'YouTube', url: 'https://www.youtube.com', icono: 'youtube' },
        { nombre: 'Gmail', url: 'https://mail.google.com', icono: 'gmail' },
        { nombre: 'WhatsApp', url: 'https://web.whatsapp.com', icono: 'whatsapp' },
        { nombre: 'Discord', url: 'https://discord.com/app', icono: 'discord' },
        { nombre: 'GitHub', url: 'https://github.com', icono: 'github' },
      ] },
    { ...aspectoBase, id: 'trabajo', nombre: 'Trabajo', semilla: 'trabajo', tema: 'glaciar', densidad: .4, relieve: .3, dens: 'compacta', esquinas: 'recto', estilo: 'compacto',
      grupos: [
        { nombre: 'Desarrollo', servicios: [
          { nombre: 'GitLab', url: 'https://gitlab.lab.local', icono: 'gitlab', ms: 18 },
          { nombre: 'Jenkins', url: 'http://10.0.4.15:8080', icono: 'jenkins', ms: 24 },
          { nombre: 'Grafana', url: 'http://10.0.4.20:3000', icono: 'grafana', ms: 11 },
          { nombre: 'SonarQube', url: 'http://10.0.4.21:9000', icono: 'sonarqube', ms: 140 },
        ] },
        { nombre: 'Datos', servicios: [
          { nombre: 'Neo4j', url: 'http://10.0.5.3:7474', icono: 'neo4j', ms: 8 },
          { nombre: 'Alfresco', url: 'http://10.0.5.8:8080', icono: 'alfresco', ms: 33 },
          { nombre: 'REDCap', url: 'https://10.0.5.12', icono: 'redcap', ms: 27 },
        ] },
      ],
      internet: [
        { nombre: 'Calendar', url: 'https://calendar.google.com', icono: 'google-calendar' },
        { nombre: 'Drive', url: 'https://drive.google.com', icono: 'google-drive' },
        { nombre: 'Slack', url: 'https://app.slack.com', icono: 'slack' },
        { nombre: 'Jira', url: 'https://jira.lab.local', icono: 'jira' },
      ] },
    { ...aspectoBase, id: 'taller', nombre: 'Taller', semilla: 'taller', tema: 'carbon', fondo: 'sombreado', densidad: .45, relieve: .7, movimiento: 'vivo', esquinas: 'redondo', estilo: 'baldosas',
      grupos: [
        { nombre: 'Impresión 3D', servicios: [
          { nombre: 'OctoPrint', url: 'http://192.168.1.50', icono: 'octoprint', ms: 7 },
          { nombre: 'Spoolman', url: 'http://192.168.1.50:7912', icono: 'spoolman', ms: 9 },
        ] },
        { nombre: 'Domótica', servicios: [
          { nombre: 'Node-RED', url: 'http://192.168.1.51:1880', icono: 'node-red', ms: 5 },
          { nombre: 'ESPHome', url: 'http://192.168.1.51:6052', icono: 'esphome', ms: 6 },
          { nombre: 'Zigbee2MQTT', url: 'http://192.168.1.51:8080', icono: 'zigbee2mqtt', ms: 6 },
        ] },
      ],
      internet: [
        { nombre: 'Printables', url: 'https://www.printables.com', icono: 'printables' },
        { nombre: 'Reddit', url: 'https://www.reddit.com', icono: 'reddit' },
        { nombre: 'GitHub', url: 'https://github.com', icono: 'github' },
      ] },
  ];
  const ATAJOS = [
    { clave: 'y', nombre: 'YouTube', url: 'youtube.com/results?search_query=%s' },
    { clave: 'gh', nombre: 'GitHub', url: 'github.com/search?q=%s' },
    { clave: 'w', nombre: 'Wikipedia', url: 'es.wikipedia.org/w/index.php?search=%s' },
    { clave: 'm', nombre: 'Maps', url: 'google.com/maps/search/%s' },
  ];
  const COPIAS = [
    { cuando: 'Hoy, 09:12', detalle: '3 perfiles · 17 enlaces' },
    { cuando: 'Ayer, 08:47', detalle: '3 perfiles · 16 enlaces' },
    { cuando: 'Miércoles 21', detalle: '2 perfiles · 14 enlaces' },
  ];

  const plano = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const slug = s => plano(s).replace(/[^a-z0-9]+/g, '-');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const mono = n => { const p = n.split(/[\s-]+/).filter(Boolean); return (p.length > 1 ? p[0][0] + p[1][0] : n.slice(0, 2)).toUpperCase(); };
  const host = url => { try { const u = new URL(url); return u.host; } catch { return url; } };
  for (const p of PERFILES) for (const g of p.grupos) for (const s of g.servicios) s.id = `${p.id}/${slug(g.nombre)}/${slug(s.nombre)}`;

  // ---------- Estado ----------

  const estado = { perfil: 'casa', reunion: false, editando: false, motor: 'Google', sugerencias: false };
  const perfil = (id = estado.perfil) => PERFILES.find(p => p.id === id);
  const temaDe = p => { const t = TEMAS[p.tema]; return p.acento ? { ...t, acento: p.acento } : t; };
  const visibles = p => p.grupos.filter(g => !(estado.reunion && g.privado));
  const contar = p => p.grupos.reduce((n, g) => n + g.servicios.length, 0);
  const emitir = (nombre, detail = {}) => document.dispatchEvent(new CustomEvent(nombre, { detail }));
  let terreno = null;

  function luz(hex) {
    const n = parseInt(hex.slice(1), 16);
    const c = [n >> 16, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  }
  function mezclar(a, b, k) {
    const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
    const m = (s) => Math.round(((x >> s) & 255) * (1 - k) + ((y >> s) & 255) * k);
    return '#' + ((m(16) << 16) | (m(8) << 8) | m(0)).toString(16).padStart(6, '0');
  }
  // Un tema completo a partir de solo el fondo y el acento (el formulario «Crear tema»).
  function temaDesde(nombre, bg, acento) {
    const modo = luz(bg) > .3 ? 'claro' : 'oscuro';
    return { nombre, modo, bg, acento, ink: modo === 'claro' ? mezclar(bg, '#000000', .88) : mezclar(bg, '#ffffff', .9), propio: true };
  }

  function pintarTema(t) {
    const r = document.documentElement;
    r.style.setProperty('--bg', t.bg);
    r.style.setProperty('--ink', t.ink);
    r.style.setProperty('--acento', t.acento);
    r.style.setProperty('--sobre-acento', luz(t.acento) > .45 ? '#111111' : '#ffffff');
    r.dataset.modo = t.modo;
  }
  function aplicar() {
    const p = perfil(), r = document.documentElement;
    pintarTema(temaDe(p));
    r.dataset.densidad = p.dens;
    r.dataset.esquinas = p.esquinas;
    r.dataset.estilo = p.estilo;
    r.classList.toggle('reunion', estado.reunion);
    r.classList.toggle('editando', estado.editando);
    for (const [k, v] of Object.entries(p.paneles)) r.classList.toggle(`sin-${k}`, !v);
    terreno?.config({ semilla: p.semilla, estilo: p.fondo, densidad: p.densidad, relieve: p.relieve, movimiento: p.movimiento, brillo: p.brillo, imagen: p.imagen, velo: p.velo });
  }
  function cambiar(parcial, origen) { Object.assign(estado, parcial); aplicar(); emitir('nova:cambio', { origen }); }
  function cambiarAspecto(parcial, origen) { Object.assign(perfil(), parcial); aplicar(); emitir('nova:cambio', { origen }); }
  function cambiarPerfil(id) {
    if (id === estado.perfil) return;
    const antes = estado.perfil;
    estado.perfil = id;
    aplicar();
    const i = PERFILES.findIndex(p => p.id === id), j = PERFILES.findIndex(p => p.id === antes);
    emitir('nova:perfil', { antes, id, sentido: i > j ? 1 : -1 });
    emitir('nova:cambio', {});
  }
  function siguientePerfil(d) {
    const i = PERFILES.findIndex(p => p.id === estado.perfil);
    cambiarPerfil(PERFILES[(i + d + PERFILES.length) % PERFILES.length].id);
  }

  addEventListener('keydown', e => {
    if (e.altKey && e.code === 'KeyP') { e.preventDefault(); siguientePerfil(e.shiftKey ? -1 : 1); }
    else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') { e.preventDefault(); emitir('nova:paleta'); }
  });

  // ---------- Latencias simuladas ----------

  const latencias = new Map();
  function medir() {
    for (const p of PERFILES) for (const g of p.grupos) for (const s of g.servicios) {
      if (s.caido) { latencias.set(s.id, null); continue; }
      const pico = Math.random() > .95 ? 2.2 : 1;
      latencias.set(s.id, Math.max(1, Math.round(s.ms * (.75 + Math.random() * .6) * pico)));
    }
    emitir('nova:latencias');
  }
  const estadoDe = s => s.caido ? 'caido' : (latencias.get(s.id) > 110 ? 'lento' : 'ok');
  const textoMs = s => s.caido ? 'Sin respuesta' : `${latencias.get(s.id)} ms`;
  medir();
  setInterval(medir, 2500);

  // Una frase con el dato que más importa ahora: lo caído, después lo lento.
  function resumen(p = perfil()) {
    const todos = visibles(p).flatMap(g => g.servicios);
    const ok = todos.filter(s => estadoDe(s) !== 'caido').length;
    const caido = todos.find(s => s.caido);
    const lento = todos.find(s => estadoDe(s) === 'lento');
    const hallazgo = caido ? `${caido.nombre} no responde desde las ${caido.caido}`
      : lento ? `${lento.nombre} va lento (${latencias.get(lento.id)} ms)` : 'Todo responde';
    return { ok, total: todos.length, hallazgo, grave: !!caido };
  }
  function actualizarLatencias(raiz = document) {
    for (const el of $$('[data-sid]', raiz)) {
      const s = buscarServicio(el.dataset.sid);
      if (!s) continue;
      el.dataset.estado = estadoDe(s);
      const ms = $('.ms', el);
      if (ms) ms.textContent = textoMs(s);
      const barra = $('.barra-lat i', el);
      if (barra) barra.style.transform = `scaleX(${s.caido ? 1 : Math.min(1, latencias.get(s.id) / 150)})`;
    }
  }
  const buscarServicio = id => PERFILES.flatMap(p => p.grupos.flatMap(g => g.servicios)).find(s => s.id === id);

  const logo = (s, clase = '') => `<span class="logo ${clase}" data-mono="${esc(mono(s.nombre))}"><img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/${s.icono}.svg" alt="" loading="lazy" onerror="this.parentNode.classList.add('sin-logo');this.remove()"></span>`;

  // ---------- Reloj con dígitos que caen al cambiar ----------

  function reloj(elHora, elFecha) {
    let previo = '';
    const tic = () => {
      const d = new Date(), o = perfil().reloj;
      let h = d.getHours();
      if (!o.h24) h = h % 12 || 12;
      const dos = n => String(n).padStart(2, '0');
      const txt = `${o.h24 ? dos(h) : h}:${dos(d.getMinutes())}${o.segundos ? ':' + dos(d.getSeconds()) : ''}`;
      if (txt !== previo) {
        elHora.innerHTML = [...txt].map((ch, i) => `<span class="digito${previo && previo.length === txt.length && previo[i] !== ch ? ' cambia' : ''}${ch === ':' ? ' dos-puntos' : ''}">${ch}</span>`).join('');
        elHora.setAttribute('aria-label', txt);
        previo = txt;
      }
      if (elFecha) {
        elFecha.hidden = !o.fecha;
        elFecha.textContent = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, c => c.toUpperCase());
      }
    };
    tic();
    setInterval(tic, 1000);
    document.addEventListener('nova:cambio', () => { previo = ''; tic(); });
  }

  // ---------- Aviso breve ----------

  let avisoT;
  function aviso(txt) {
    let el = $('#nova-aviso');
    if (!el) {
      el = document.createElement('div');
      el.id = 'nova-aviso';
      el.className = 'aviso';
      el.setAttribute('role', 'status');
      document.body.append(el);
    }
    el.textContent = txt;
    el.classList.add('visible');
    clearTimeout(avisoT);
    avisoT = setTimeout(() => el.classList.remove('visible'), 2200);
  }

  // Abre y cierra un elemento con su transición (clase .flotante en CSS).
  function abrir(el) { el.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('abierto'))); }
  function cerrar(el) {
    if (el.hidden) return;
    el.classList.remove('abierto');
    const fin = () => { if (!el.classList.contains('abierto')) el.hidden = true; };
    if (reducido.matches) fin(); else setTimeout(fin, 260);
  }

  // ---------- Terreno: un relieve por perfil, dibujado como curvas, cotas o sombreado ----------

  function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function azar(semilla) {
    let a = semilla;
    return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  // Ruido de valor con cuatro octavas; la semilla decide la tabla y el desplazamiento.
  function ruido(semilla) {
    const r = azar(hashStr(semilla));
    const p = new Uint16Array(512), v = new Float32Array(256);
    for (let i = 0; i < 256; i++) { p[i] = i; v[i] = r(); }
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 256; i++) p[i + 256] = p[i];
    const s = t => t * t * (3 - 2 * t);
    const n = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
      const a = v[p[p[X] + Y]], b = v[p[p[X + 1] + Y]], c = v[p[p[X] + Y + 1]], d = v[p[p[X + 1] + Y + 1]];
      const u = s(xf), w = s(yf);
      return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
    };
    const ox = r() * 200, oy = r() * 200;
    return (x, y) => { let f = 0, amp = 1, fr = 1, tot = 0; for (let o = 0; o < 4; o++) { f += amp * n(x * fr + ox, y * fr + oy); tot += amp; amp *= .5; fr *= 2.03; } return f / tot; };
  }
  const plana = () => .5;
  const suave = k => k < .5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
  const VELOCIDAD = { quieto: 0, lento: .45, vivo: 1.5 };
  // Segmentos de cada caso de «marching squares»; bordes: 0 arriba, 1 derecha, 2 abajo, 3 izquierda.
  const TABLA = [[], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], [[3, 0], [2, 1]], [[0, 2]], [[3, 0]], [[3, 0]], [[0, 2]], [[0, 1], [3, 2]], [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], []];
  function borde(e, x0, y0, c, a, b, cc, d, L) {
    if (e === 0) return [x0 + c * (L - a) / (b - a), y0];
    if (e === 1) return [x0 + c, y0 + c * (L - b) / (cc - b)];
    if (e === 2) return [x0 + c * (L - d) / (cc - d), y0 + c];
    return [x0, y0 + c * (L - a) / (d - a)];
  }

  class Terreno {
    constructor(canvas, { celda = 22, estatico = false, colores = null } = {}) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.celda = celda;
      this.colores = colores;
      this.escala = 1;
      this.t = 0;
      this.op = { semilla: '', estilo: 'curvas', densidad: .5, relieve: .5, movimiento: 'lento', brillo: true };
      this.campoA = plana;
      this.campoB = null;
      this.k = 1;
      this.raton = null;
      this.pedido = true;
      if (estatico) return;
      this.medir();
      addEventListener('resize', () => { this.medir(); this.pedido = true; });
      addEventListener('pointermove', e => {
        const r = this.c.getBoundingClientRect();
        this.raton = { x: (e.clientX - r.left) * this.w / r.width, y: (e.clientY - r.top) * this.h / r.height };
        if (this.op.brillo && this.op.estilo !== 'imagen') this.pedido = true;
      });
      document.addEventListener('pointerleave', () => { this.raton = null; this.pedido = true; });
      this.bucle = this.bucle.bind(this);
      requestAnimationFrame(this.bucle);
    }
    medir() {
      this.dpr = Math.min(2, devicePixelRatio || 1);
      this.w = this.c.clientWidth;
      this.h = this.c.clientHeight;
      this.c.width = Math.round(this.w * this.dpr);
      this.c.height = Math.round(this.h * this.dpr);
    }
    config(op) {
      const nueva = op.semilla && op.semilla !== this.op.semilla, antes = this.op.semilla;
      Object.assign(this.op, op);
      if (nueva) {
        this.semAnt = antes;
        if (this.campoB) this.campoA = this.campoB;
        this.campoB = ruido(op.semilla);
        this.k = reducido.matches ? 1 : 0;
      }
      this.pedido = true;
    }
    valor(x, y) {
      const e = (640 - 380 * this.op.relieve) * this.escala;
      const u = x / e + this.t * .03, v = y / e + this.t * .017;
      const a = this.campoA(u, v);
      if (!this.campoB) return a;
      return a + (this.campoB(u, v) - a) * suave(this.k);
    }
    bucle(ahora) {
      requestAnimationFrame(this.bucle);
      const dt = this.prev ? Math.min(.1, (ahora - this.prev) / 1000) : 0;
      this.prev = ahora;
      if (document.hidden || !this.w) return;
      const vel = reducido.matches || this.op.estilo === 'imagen' ? 0 : VELOCIDAD[this.op.movimiento];
      this.t += dt * vel;
      if (this.campoB) {
        this.k = Math.min(1, this.k + dt / 1.3);
        if (this.k >= 1) { this.campoA = this.campoB; this.campoB = null; }
        this.dibujar();
        return;
      }
      if ((this.pedido || vel) && ahora - (this.ultimo || 0) > 33) {
        this.pedido = false;
        this.ultimo = ahora;
        this.dibujar();
      }
    }
    // Altura bajo un punto de la ventana, en metros de mentira (para la lectura de cota).
    cota(cx, cy) {
      if (!this.malla) return null;
      const r = this.c.getBoundingClientRect();
      const v = this.valor((cx - r.left) * this.w / r.width, (cy - r.top) * this.h / r.height);
      const { min, max } = this.malla;
      return Math.round(180 + (v - min) / (max - min || 1) * 1500);
    }
    dibujar() {
      const { ctx, w, h } = this;
      const css = getComputedStyle(document.documentElement);
      const col = this.colores || { bg: css.getPropertyValue('--bg').trim(), ink: css.getPropertyValue('--ink').trim(), acento: css.getPropertyValue('--acento').trim(), modo: document.documentElement.dataset.modo };
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (this.colores) { ctx.fillStyle = col.bg; ctx.fillRect(0, 0, w, h); }
      if (this.op.estilo === 'imagen') {
        // La imagen cubre todo, como background-size: cover, con un velo del color del tema.
        const img = imagenDe(this.op.imagen);
        if (!img) return;
        const k = Math.max(w / img.naturalWidth, h / img.naturalHeight), iw = img.naturalWidth * k, ih = img.naturalHeight * k;
        ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
        ctx.globalAlpha = this.op.velo ?? .35;
        ctx.fillStyle = col.bg;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
        return;
      }
      const base = col.modo === 'claro' ? .2 : .15;
      const c = this.celda, cols = Math.ceil(w / c) + 1, filas = Math.ceil(h / c) + 1;
      const g = new Float32Array(cols * filas);
      let min = 1, max = 0;
      for (let i = 0; i < filas; i++) for (let j = 0; j < cols; j++) {
        const v = this.valor(j * c, i * c);
        g[i * cols + j] = v;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      this.malla = { g, cols, filas, min, max };
      if (this.op.estilo === 'liso') return;
      const estilo = ESTILOS[this.op.estilo], r = this.raton && this.op.brillo ? this.raton : null;
      const args = { g, cols, filas, min, max, ink: col.ink, acento: col.acento, bg: col.bg, base, r, luz: .9, semilla: this.op.semilla };
      if (this.campoB && POR_SEMILLA.has(this.op.estilo)) {
        // Los dibujos que salen de la semilla y no del relieve se funden: el del perfil viejo se va y llega el nuevo.
        const k = suave(this.k);
        if (this.semAnt) estilo(this, ctx, { ...args, semilla: this.semAnt, base: base * (1 - k), luz: .9 * (1 - k) });
        estilo(this, ctx, { ...args, base: base * k, luz: .9 * k });
      } else estilo(this, ctx, args);
      ctx.globalAlpha = 1;
    }
  }

  const RADIO = 190, BINS = 10;
  // Dibujos que salen de la semilla del perfil y no del relieve; al cambiar de perfil se funden.
  const POR_SEMILLA = new Set(['grafo', 'trama', 'galaxia']);
  // Luz bajo el ratón: un nivel de 0 a BINS-1 que crece hacia el centro con una curva suave, o -1 si está lejos.
  function nivelLuz(r, x, y) {
    if (!r) return -1;
    const d2 = (x - r.x) ** 2 + (y - r.y) ** 2;
    if (d2 >= RADIO * RADIO) return -1;
    const t = 1 - Math.sqrt(d2) / RADIO;
    return Math.min(BINS - 1, Math.floor(t * t * (3 - 2 * t) * BINS));
  }
  const capasLuz = () => Array.from({ length: BINS }, () => new Path2D());
  // La capa más externa es casi transparente, así la luz se difumina hacia el borde sin dejar un círculo.
  function pintarLuz(ctx, capas, acento, tope, modo = 'stroke') {
    ctx.strokeStyle = acento;
    ctx.fillStyle = acento;
    capas.forEach((ruta, i) => { ctx.globalAlpha = tope * ((i + .5) / BINS) ** 1.7; ctx[modo](ruta); });
  }
  // Datos fijos por semilla (nodos, estrellas), guardados para no rehacerlos en cada dibujo.
  const guardados = new Map();
  function fijo(clave, crear) {
    if (!guardados.has(clave)) {
      if (guardados.size > 40) guardados.clear();
      guardados.set(clave, crear());
    }
    return guardados.get(clave);
  }

  const ESTILOS = {
    curvas(T, ctx, { g, cols, filas, min, max, ink, acento, base, r, luz }) {
      if (max - min < .002) return;
      const n = Math.round(8 + 22 * T.op.densidad), c = T.celda;
      const lejos = new Path2D(), indice = new Path2D(), capas = capasLuz();
      for (let l = 1; l < n; l++) {
        const L = min + (max - min) * l / n, destino = l % 5 === 0 ? indice : lejos;
        for (let i = 0; i < filas - 1; i++) for (let j = 0; j < cols - 1; j++) {
          const a = g[i * cols + j], b = g[i * cols + j + 1], cc = g[(i + 1) * cols + j + 1], d = g[(i + 1) * cols + j];
          const segs = TABLA[(a > L) << 3 | (b > L) << 2 | (cc > L) << 1 | (d > L)];
          if (!segs.length) continue;
          const x0 = j * c, y0 = i * c;
          for (const [e1, e2] of segs) {
            const p = borde(e1, x0, y0, c, a, b, cc, d, L), q = borde(e2, x0, y0, c, a, b, cc, d, L);
            destino.moveTo(p[0], p[1]);
            destino.lineTo(q[0], q[1]);
            const lv = nivelLuz(r, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
            if (lv >= 0) { capas[lv].moveTo(p[0], p[1]); capas[lv].lineTo(q[0], q[1]); }
          }
        }
      }
      ctx.lineCap = 'round';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      ctx.globalAlpha = base;
      ctx.stroke(lejos);
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = Math.min(1, base * 1.9);
      ctx.stroke(indice);
      ctx.lineWidth = 1.4;
      pintarLuz(ctx, capas, acento, luz);
    },
    cotas(T, ctx, { min, max, ink, acento, base, r, luz }) {
      const f = Math.max(.35, Math.min(1, T.escala * 2));
      const paso = Math.max(4, (30 - 14 * T.op.densidad) * Math.min(1, T.escala * 2.2));
      const puntos = new Path2D(), capas = capasLuz();
      for (let y = paso / 2; y < T.h; y += paso) for (let x = paso / 2; x < T.w; x += paso) {
        const n = (T.valor(x, y) - min) / (max - min || 1), rad = (.45 + n * n * 2.8) * f;
        puntos.moveTo(x + rad, y);
        puntos.arc(x, y, rad, 0, Math.PI * 2);
        const lv = nivelLuz(r, x, y);
        if (lv >= 0) { capas[lv].moveTo(x + rad + .6, y); capas[lv].arc(x, y, rad + .6, 0, Math.PI * 2); }
      }
      ctx.fillStyle = ink;
      ctx.globalAlpha = Math.min(1, base * 2.2);
      ctx.fill(puntos);
      pintarLuz(ctx, capas, acento, luz, 'fill');
    },
    sombreado(T, ctx, { min, max, ink, acento, base, r, luz }) {
      const paso = Math.max(4, (20 - 8 * T.op.densidad) * Math.min(1, T.escala * 2.2));
      const e = (640 - 380 * T.op.relieve) * T.escala, rango = max - min || 1;
      const trazos = new Path2D(), capas = capasLuz();
      for (let y = paso / 2; y < T.h; y += paso) for (let x = paso / 2; x < T.w; x += paso) {
        const v = T.valor(x, y), gx = T.valor(x + 1, y) - v, gy = T.valor(x, y + 1) - v, m = Math.hypot(gx, gy);
        if (!m) continue;
        const len = Math.min(paso * .95, m / rango * e * paso * .5);
        if (len < .6) continue;
        const ux = gx / m * len / 2, uy = gy / m * len / 2;
        trazos.moveTo(x - ux, y - uy);
        trazos.lineTo(x + ux, y + uy);
        const lv = nivelLuz(r, x, y);
        if (lv >= 0) { capas[lv].moveTo(x - ux, y - uy); capas[lv].lineTo(x + ux, y + uy); }
      }
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = ink;
      ctx.globalAlpha = Math.min(1, base * 2);
      ctx.stroke(trazos);
      pintarLuz(ctx, capas, acento, luz);
    },
    // Perfiles de altura en filas, de atrás adelante: cada fila tapa las de detrás con el color del fondo.
    crestas(T, ctx, { min, max, ink, acento, base, bg, r, luz }) {
      const f = Math.min(1, T.escala * 2.2), paso = Math.max(3, (28 - 14 * T.op.densidad) * f), dx = Math.max(2, 8 * f);
      const amp = paso * (2.2 + 3.4 * T.op.relieve), rango = max - min || 1;
      ctx.lineWidth = 1.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (let y0 = paso; y0 < T.h + amp; y0 += paso) {
        const linea = new Path2D(), capas = r && Math.abs(r.y - y0) < RADIO + amp ? capasLuz() : null;
        let px = 0, py = 0;
        for (let x = 0; x <= T.w + dx; x += dx) {
          const n = (T.valor(x, y0) - min) / rango, y = y0 - n * n * amp;
          if (x === 0) linea.moveTo(x, y);
          else {
            linea.lineTo(x, y);
            const lv = capas ? nivelLuz(r, (px + x) / 2, (py + y) / 2) : -1;
            if (lv >= 0) { capas[lv].moveTo(px, py); capas[lv].lineTo(x, y); }
          }
          px = x;
          py = y;
        }
        const relleno = new Path2D(linea);
        relleno.lineTo(T.w + dx, T.h + amp);
        relleno.lineTo(0, T.h + amp);
        relleno.closePath();
        ctx.globalAlpha = 1;
        ctx.fillStyle = bg;
        ctx.fill(relleno);
        ctx.strokeStyle = ink;
        ctx.globalAlpha = Math.min(1, base * 2.4);
        ctx.stroke(linea);
        if (capas) pintarLuz(ctx, capas, acento, luz);
      }
    },
    // Grafo: nodos que se mecen despacio, cada uno unido a sus dos vecinos más cercanos de ese momento.
    grafo(T, ctx, { ink, acento, base, r, luz, semilla }) {
      const nodos = fijo(`grafo/${semilla}`, () => {
        const a = azar(hashStr(`${semilla}/grafo`));
        return Array.from({ length: Math.round(innerWidth * innerHeight / 15000) }, () => ({ x: a(), y: a(), s: a(), f: a() * 6.28, g: a() * 6.28, v: .5 + a() }));
      });
      const k = Math.max(.3, Math.min(1, T.escala * 2)), amp = 18 * T.escala;
      const pos = nodos.map(n => [n.x * T.w + Math.sin(T.t * .35 * n.v + n.f) * amp, n.y * T.h + Math.cos(T.t * .3 * n.v + n.g) * amp]);
      const aristas = new Path2D(), capas = capasLuz(), vistas = new Set();
      pos.forEach((a, i) => {
        let m1 = -1, m2 = -1, d1 = Infinity, d2 = Infinity;
        pos.forEach((b, j) => {
          if (j === i) return;
          const d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
          if (d < d1) { d2 = d1; m2 = m1; d1 = d; m1 = j; } else if (d < d2) { d2 = d; m2 = j; }
        });
        for (const j of [m1, m2]) {
          const clave = Math.min(i, j) * 100000 + Math.max(i, j);
          if (j < 0 || vistas.has(clave)) continue;
          vistas.add(clave);
          const b = pos[j];
          aristas.moveTo(a[0], a[1]);
          aristas.lineTo(b[0], b[1]);
          const lv = nivelLuz(r, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
          if (lv >= 0) { capas[lv].moveTo(a[0], a[1]); capas[lv].lineTo(b[0], b[1]); }
        }
      });
      ctx.lineWidth = 1;
      ctx.strokeStyle = ink;
      ctx.globalAlpha = Math.min(1, base * 2);
      ctx.stroke(aristas);
      ctx.lineWidth = 1.4;
      pintarLuz(ctx, capas, acento, luz);
      const chicos = new Path2D(), grandes = new Path2D(), luzNodos = capasLuz();
      nodos.forEach((n, i) => {
        const [x, y] = pos[i], rad = (n.s > .9 ? 6 + n.s * 3 : 2 + n.s * 3) * k, ruta = n.s > .9 ? grandes : chicos;
        ruta.moveTo(x + rad, y);
        ruta.arc(x, y, rad, 0, Math.PI * 2);
        const lv = nivelLuz(r, x, y);
        if (lv >= 0) { luzNodos[lv].moveTo(x + rad, y); luzNodos[lv].arc(x, y, rad, 0, Math.PI * 2); }
      });
      ctx.fillStyle = ink;
      ctx.strokeStyle = ink;
      ctx.globalAlpha = Math.min(1, base * 3);
      ctx.fill(chicos);
      ctx.lineWidth = 1.5;
      ctx.stroke(grandes);
      pintarLuz(ctx, luzNodos, acento, luz, 'fill');
    },
    // Rayas: diagonales paralelas, cada quinta más marcada, que se deslizan despacio.
    rayas(T, ctx, { ink, acento, base, r, luz }) {
      const f = Math.min(1, T.escala * 2.2), paso = Math.max(4, (48 - 24 * T.op.densidad) * f), tramo = Math.max(4, 24 * f);
      const desliza = (T.t * 8 * f) % (paso * 5);
      const finas = new Path2D(), maestras = new Path2D(), capas = capasLuz();
      for (let k = 0, x = -T.h - paso * 5 + desliza; x < T.w + paso; k++, x += paso) {
        const ruta = k % 5 === 0 ? maestras : finas;
        ruta.moveTo(x, T.h);
        ruta.lineTo(x + T.h, 0);
        if (r && Math.abs((r.x - x) - (T.h - r.y)) < RADIO * 1.5) {
          for (let d = 0; d < T.h; d += tramo) {
            const lv = nivelLuz(r, x + d + tramo / 2, T.h - d - tramo / 2);
            if (lv >= 0) { capas[lv].moveTo(x + d, T.h - d); capas[lv].lineTo(x + d + tramo, T.h - d - tramo); }
          }
        }
      }
      ctx.lineCap = 'butt';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      ctx.globalAlpha = Math.min(1, base * 1.3);
      ctx.stroke(finas);
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = Math.min(1, base * 2.4);
      ctx.stroke(maestras);
      ctx.lineWidth = 1.4;
      pintarLuz(ctx, capas, acento, luz);
    },
    // Rombos: solo la red, dos familias de diagonales; cada tramo se ve más o menos según el relieve
    // y una de cada cinco líneas va más marcada.
    rombos(T, ctx, { min, max, ink, acento, base, r, luz }) {
      const f = Math.min(1, T.escala * 2.2), a = Math.max(4, (36 - 14 * T.op.densidad) * f), b = a * .58, rango = max - min || 1;
      const tramo = Math.max(4, 16 * f), th = Math.atan2(b, a), paso = 2 * b * Math.cos(th);
      const cx = T.w / 2, cy = T.h / 2, D = Math.hypot(T.w, T.h) / 2 + paso * 5;
      const capas = [new Path2D(), new Path2D(), new Path2D(), new Path2D()], maestras = [new Path2D(), new Path2D(), new Path2D(), new Path2D()], luzC = capasLuz();
      for (const signo of [1, -1]) {
        const dx = Math.cos(th), dy = signo * Math.sin(th);
        for (let k = Math.round(-D / paso), o = k * paso; o <= D; k++, o += paso) {
          const destino = k % 5 === 0 ? maestras : capas;
          for (let d = -D; d < D; d += tramo) {
            const x0 = cx - dy * o + dx * d, y0 = cy + dx * o + dy * d, x1 = x0 + dx * tramo, y1 = y0 + dy * tramo, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
            if (mx < -tramo || my < -tramo || mx > T.w + tramo || my > T.h + tramo) continue;
            const q = Math.max(0, Math.min(3, Math.floor((T.valor(mx, my) - min) / rango * 4)));
            destino[q].moveTo(x0, y0);
            destino[q].lineTo(x1, y1);
            const lv = nivelLuz(r, mx, my);
            if (lv >= 0) { luzC[lv].moveTo(x0, y0); luzC[lv].lineTo(x1, y1); }
          }
        }
      }
      const alfas = [.35, .8, 1.4, 2.2];
      ctx.lineCap = 'butt';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      capas.forEach((ruta, i) => { ctx.globalAlpha = Math.min(1, base * alfas[i]); ctx.stroke(ruta); });
      ctx.lineWidth = 1.5;
      maestras.forEach((ruta, i) => { ctx.globalAlpha = Math.min(1, base * alfas[i] * 1.4); ctx.stroke(ruta); });
      ctx.lineWidth = 1.3;
      pintarLuz(ctx, luzC, acento, luz);
    },
    // Trama: tres familias de rectas que se cruzan; cada tramo es más o menos visible según el relieve.
    trama(T, ctx, { min, max, ink, acento, base, r, luz, semilla }) {
      const f = Math.min(1, T.escala * 2.2), paso = Math.max(5, (72 - 34 * T.op.densidad) * f), tramo = Math.max(4, 18 * f), rango = max - min || 1;
      const giro = azar(hashStr(`${semilla}/trama`))() * Math.PI / 3 + T.t * .003;
      const cx = T.w / 2, cy = T.h / 2, D = Math.hypot(T.w, T.h) / 2 + paso;
      const capas = [new Path2D(), new Path2D(), new Path2D(), new Path2D()], luzC = capasLuz();
      for (let fam = 0; fam < 3; fam++) {
        const th = giro + fam * Math.PI / 3, dx = Math.cos(th), dy = Math.sin(th);
        for (let o = -D; o <= D; o += paso) for (let d = -D; d < D; d += tramo) {
          const x0 = cx - dy * o + dx * d, y0 = cy + dx * o + dy * d, x1 = x0 + dx * tramo, y1 = y0 + dy * tramo, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
          if (mx < -tramo || my < -tramo || mx > T.w + tramo || my > T.h + tramo) continue;
          const q = Math.max(0, Math.min(3, Math.floor((T.valor(mx, my) - min) / rango * 4)));
          capas[q].moveTo(x0, y0);
          capas[q].lineTo(x1, y1);
          const lv = nivelLuz(r, mx, my);
          if (lv >= 0) { luzC[lv].moveTo(x0, y0); luzC[lv].lineTo(x1, y1); }
        }
      }
      ctx.lineCap = 'butt';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      capas.forEach((ruta, i) => { ctx.globalAlpha = Math.min(1, base * [.3, .9, 1.7, 2.8][i]); ctx.stroke(ruta); });
      ctx.lineWidth = 1.3;
      pintarLuz(ctx, luzC, acento, luz);
    },
    // Galaxia: brazos en espiral más grandes que la pantalla, nebulosa tenue a lo largo de ellos, un núcleo
    // y estrellas sueltas que titilan. Gira entera muy despacio; brazos, centro e inclinación salen de la semilla.
    galaxia(T, ctx, { ink, acento, base, r, luz, semilla }) {
      const G = fijo(`galaxia/${semilla}`, () => {
        const a = azar(hashStr(`${semilla}/galaxia`)), area = innerWidth * innerHeight;
        const brazos = 2 + Math.floor(a() * 3), giro = 2.4 + a() * 1.6, gauss = () => (a() + a() + a() - 1.5) / 1.5;
        const enBrazo = (rr, ancho) => Math.floor(a() * brazos) * Math.PI * 2 / brazos + Math.log(1 + rr * 9) * giro + gauss() * ancho;
        const fondo = Array.from({ length: Math.round(area / 360) }, () => [a(), a(), a(), a() * 6.28]);
        const espiral = Array.from({ length: Math.round(area / 75) }, () => {
          const rr = .03 + Math.pow(a(), .85) * .97;
          return [rr, enBrazo(rr, .26 - .12 * rr), a(), a() < .035 ? 1 : 0];
        });
        const nucleo = Array.from({ length: Math.round(area / 500) }, () => [Math.abs(gauss()) * .06, a() * 6.28, a(), 0]);
        const nebulosa = Array.from({ length: Math.round(area / 2600) }, () => { const rr = .05 + Math.pow(a(), .9) * .9; return [rr, enBrazo(rr, .16), .4 + a() * .6]; });
        return { cx: .56 + a() * .24, cy: .3 + a() * .4, plano: .55 + a() * .3, rot: a() * 6.28, fondo, espiral: espiral.concat(nucleo), nebulosa };
      });
      const f = Math.max(.35, Math.min(1, T.escala * 2.2)), R = Math.hypot(T.w, T.h) * .8, cx = G.cx * T.w, cy = G.cy * T.h;
      const giro = G.rot + T.t * .015, cg = Math.cos(giro), sg = Math.sin(giro);
      const situar = (rr, ang) => {
        const ex = Math.cos(ang) * rr * R, ey = Math.sin(ang) * rr * R * G.plano;
        return [cx + ex * cg - ey * sg, cy + ex * sg + ey * cg];
      };
      const nubes = new Path2D();
      for (const [rr, ang, t] of G.nebulosa) {
        const [px, py] = situar(rr, ang), rad = (18 + t * 34) * f * (1.2 - rr * .5);
        if (px < -rad || py < -rad || px > T.w + rad || py > T.h + rad) continue;
        nubes.moveTo(px + rad, py);
        nubes.arc(px, py, rad, 0, Math.PI * 2);
      }
      // La nebulosa va desenfocada: así no se ven los círculos que la forman.
      ctx.filter = `blur(${Math.max(2, 16 * f)}px)`;
      ctx.fillStyle = ink;
      ctx.globalAlpha = base * .3;
      ctx.fill(nubes);
      ctx.filter = 'none';
      const brillo = [new Path2D(), new Path2D(), new Path2D(), new Path2D()], color = new Path2D(), capas = capasLuz();
      const punto = (ruta, x, y, t) => ruta.rect(x - t / 2, y - t / 2, t, t);
      for (const [x, y, s, fase] of G.fondo) {
        const px = x * T.w, py = y * T.h, titila = .5 + .5 * Math.sin(T.t * 1.6 + fase), t = (.7 + s * 1.2) * f;
        punto(brillo[Math.min(3, Math.floor((s * .6 + titila * .4) * 4))], px, py, t);
        const lv = nivelLuz(r, px, py);
        if (lv >= 0) punto(capas[lv], px, py, t + .8);
      }
      for (const [rr, ang, s, esAcento] of G.espiral) {
        const [px, py] = situar(rr, ang);
        if (px < -4 || py < -4 || px > T.w + 4 || py > T.h + 4) continue;
        const t = (.8 + s * 1.5) * f * (1.15 - rr * .4);
        punto(esAcento ? color : brillo[Math.min(3, Math.floor((1 - rr) * 2.6 + s * 1.6))], px, py, t);
        const lv = nivelLuz(r, px, py);
        if (lv >= 0) punto(capas[lv], px, py, t + .8);
      }
      ctx.fillStyle = ink;
      brillo.forEach((ruta, i) => { ctx.globalAlpha = Math.min(1, base * [1.2, 2.2, 3.4, 5][i]); ctx.fill(ruta); });
      ctx.fillStyle = acento;
      ctx.globalAlpha = Math.min(1, base * 3.5);
      ctx.fill(color);
      pintarLuz(ctx, capas, acento, luz, 'fill');
    },
  };

  // Una vista fija del terreno de un perfil, con los colores de un tema (miniaturas de temas, fondos y perfiles).
  function miniatura(canvas, { semilla, estilo, densidad, relieve, tema, imagen, velo }) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w) return;
    const T = new Terreno(canvas, { celda: Math.max(3, w / 36), estatico: true, colores: tema });
    T.dpr = Math.min(2, devicePixelRatio || 1);
    T.w = w; T.h = h;
    canvas.width = Math.round(w * T.dpr);
    canvas.height = Math.round(h * T.dpr);
    T.escala = w / innerWidth;
    T.op = { ...T.op, semilla, estilo, densidad, relieve, imagen, velo, brillo: false };
    T.campoA = ruido(semilla);
    T.dibujar();
  }
  let borrador = null;
  function pintarMinis(raiz = document) {
    for (const c of $$('canvas[data-mini]', raiz)) {
      const p = perfil(c.dataset.perfil) || perfil();
      const tema = c.dataset.temaMini ? TEMAS[c.dataset.temaMini] : c.hasAttribute('data-tema-propio') && borrador ? borrador : temaDe(p);
      miniatura(c, { semilla: c.dataset.mini, estilo: c.dataset.estilo || (p.fondo === 'liso' ? 'curvas' : p.fondo), densidad: p.densidad, relieve: p.relieve, tema, imagen: p.imagen, velo: p.velo });
    }
  }

  // ---------- Paleta de comandos ----------

  function comandos() {
    const p = perfil(), lista = [];
    const sig = PERFILES[(PERFILES.indexOf(p) + 1) % PERFILES.length];
    for (const q of PERFILES) if (q !== p) {
      lista.push({ grupo: 'Perfiles', titulo: `Cambiar a ${q.nombre}`, sub: `${contar(q)} servicios · ${TEMAS[q.tema].nombre}`, mini: q, inicio: true,
        atajo: q === sig ? ['Alt', 'P'] : null, accion: () => cambiarPerfil(q.id) });
    }
    lista.push({ grupo: 'Vista', titulo: estado.reunion ? 'Salir del modo reunión' : 'Modo reunión', sub: 'Oculta los grupos privados', icono: estado.reunion ? 'ojo' : 'ojoNo', inicio: true, accion: () => cambiar({ reunion: !estado.reunion }) });
    lista.push({ grupo: 'Vista', titulo: estado.editando ? 'Terminar de editar' : 'Editar grupos y enlaces', icono: 'lapiz', inicio: true, accion: () => cambiar({ editando: !estado.editando }) });
    lista.push({ grupo: 'Vista', titulo: 'Personalizar', sub: 'Tema, fondo, disposición, buscador y datos', icono: 'ajustes', inicio: true, accion: () => emitir('nova:ajustes') });
    let n = 0;
    for (const g of visibles(p)) for (const s of g.servicios) {
      lista.push({ grupo: 'Servicios', titulo: s.nombre, sub: `${host(s.url)} · ${g.nombre}`, logo: s, inicio: n++ < 5, accion: () => aviso(`Abriendo ${s.nombre}…`) });
    }
    for (const s of p.internet) lista.push({ grupo: 'Internet', titulo: s.nombre, sub: host(s.url), logo: s, accion: () => aviso(`Abriendo ${s.nombre}…`) });
    // Lo de los demás perfiles también se encuentra; abrirlo cambia de perfil.
    for (const q of PERFILES) if (q !== p) for (const g of visibles(q)) for (const s of g.servicios) {
      lista.push({ grupo: 'En otros perfiles', titulo: s.nombre, sub: `${q.nombre} · ${g.nombre}`, logo: s, accion: () => { cambiarPerfil(q.id); aviso(`Abriendo ${s.nombre} desde ${q.nombre}…`); } });
    }
    for (const [id, t] of Object.entries(TEMAS)) {
      lista.push({ grupo: 'Aspecto', titulo: `Tema ${t.nombre}`, sub: id === p.tema ? 'El actual' : `Para ${p.nombre}`, tema: t, accion: () => cambiarAspecto({ tema: id, acento: null }) });
    }
    for (const [id, f] of Object.entries(FONDOS)) if (id !== 'imagen' || p.imagen) lista.push({ grupo: 'Aspecto', titulo: `Fondo: ${f.nombre}`, icono: 'capas', accion: () => cambiarAspecto({ fondo: id }) });
    for (const [id, nombre] of MOVIMIENTOS) lista.push({ grupo: 'Aspecto', titulo: `Terreno ${nombre.toLowerCase()}`, sub: 'Movimiento del fondo', icono: 'montana', accion: () => cambiarAspecto({ movimiento: id }) });
    lista.push({ grupo: 'Aspecto', titulo: 'Generar otro terreno', sub: `Nuevo relieve para ${p.nombre}`, icono: 'dado', accion: () => cambiarAspecto({ semilla: `${p.id}-${Math.random().toString(36).slice(2, 7)}` }) });
    lista.push({ grupo: 'Datos', titulo: 'Exportar copia', icono: 'descargar', accion: () => aviso('Copia descargada') });
    lista.push({ grupo: 'Datos', titulo: 'Importar marcadores de Chrome', icono: 'marcador', accion: () => aviso('Elige las carpetas que quieres traer') });
    return lista;
  }

  function puntuar(q, t) {
    const a = plano(q), b = plano(t);
    let j = 0, puntos = 0, racha = 0;
    const marcas = [];
    for (let i = 0; i < b.length && j < a.length; i++) {
      if (b[i] === a[j]) {
        marcas.push(i);
        racha++;
        puntos += 1 + racha * 2 + (i === 0 || b[i - 1] === ' ' ? 6 : 0);
        j++;
      } else racha = 0;
    }
    return j === a.length ? { puntos, marcas } : null;
  }
  const resaltar = (t, marcas = []) => [...t].map((ch, i) => marcas.includes(i) ? `<mark>${esc(ch)}</mark>` : esc(ch)).join('');

  class Paleta {
    constructor(raiz, { alCerrar = () => {}, buscador = false, placeholder = 'Busca un servicio, un perfil o un ajuste…' } = {}) {
      this.raiz = raiz;
      this.alCerrar = alCerrar;
      this.buscador = buscador;
      this.items = [];
      this.sel = 0;
      raiz.classList.add('paleta');
      raiz.innerHTML = `<div class="paleta-cab">${ico(buscador ? 'buscar' : 'comando')}<input class="paleta-input" placeholder="${placeholder}" aria-label="${buscador ? 'Buscar o mandar' : 'Comando'}" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true"><kbd class="paleta-esc">Esc</kbd></div>
        <ul class="paleta-lista" role="listbox" aria-label="Resultados"></ul>
        <div class="paleta-pie"><span><kbd>↑</kbd><kbd>↓</kbd> elegir</span><span><kbd>↵</kbd> abrir</span><span><kbd>Alt</kbd><kbd>P</kbd> siguiente perfil</span>${buscador ? '<span><kbd>&gt;</kbd> solo comandos</span>' : ''}</div>`;
      this.input = $('.paleta-input', raiz);
      this.lista = $('.paleta-lista', raiz);
      this.input.addEventListener('input', () => { this.sel = 0; this.pintar(); });
      this.input.addEventListener('keydown', e => this.tecla(e));
      this.lista.addEventListener('pointermove', e => {
        const li = e.target.closest('[data-i]');
        if (li && +li.dataset.i !== this.sel) { this.sel = +li.dataset.i; this.marcar(); }
      });
      this.lista.addEventListener('click', e => { const li = e.target.closest('[data-i]'); if (li) this.ejecutar(+li.dataset.i); });
    }
    abrir(texto = '') {
      this.input.value = texto;
      this.sel = 0;
      this.pintar();
      requestAnimationFrame(() => this.input.focus());
    }
    tecla(e) {
      const n = this.items.length;
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && n) {
        e.preventDefault();
        this.sel = (this.sel + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
        this.marcar(true);
      } else if (e.key === 'Enter') { e.preventDefault(); this.ejecutar(this.sel); }
      else if (e.key === 'Escape') { e.preventDefault(); this.alCerrar(); }
    }
    ejecutar(i) {
      const it = this.items[i];
      if (!it) return;
      this.alCerrar();
      it.accion();
    }
    pintar() {
      let q = this.input.value.trim();
      const soloComandos = this.buscador && q.startsWith('>');
      if (soloComandos) q = q.slice(1).trim();
      let base = comandos();
      if (soloComandos) base = base.filter(c => !['Servicios', 'Internet', 'En otros perfiles'].includes(c.grupo));
      let items;
      if (!q) items = base.filter(c => c.inicio);
      else {
        const puntuados = [];
        for (const c of base) {
          const t = puntuar(q, c.titulo), s = !t && c.sub ? puntuar(q, c.sub) : null;
          if (t || s) puntuados.push({ ...c, puntos: t ? t.puntos : s.puntos * .5, marcas: t ? t.marcas : [] });
        }
        // Grupos ordenados por su mejor resultado, y dentro de cada grupo por puntos.
        const mejor = {};
        for (const c of puntuados) mejor[c.grupo] = Math.max(mejor[c.grupo] || 0, c.puntos);
        items = puntuados.sort((a, b) => (mejor[b.grupo] - mejor[a.grupo]) || (b.puntos - a.puntos)).slice(0, 16);
      }
      if (this.buscador && q && !soloComandos) items.unshift({ grupo: 'Buscar', titulo: `Buscar «${q}» en ${estado.motor}`, icono: 'buscar', accion: () => aviso(`Buscando «${q}» en ${estado.motor}…`) });
      this.items = items;
      let grupo = '', html = '';
      items.forEach((c, i) => {
        if (c.grupo !== grupo) { grupo = c.grupo; html += `<li class="paleta-grupo" role="presentation">${grupo}</li>`; }
        const icono = c.logo ? logo(c.logo) : c.mini ? `<canvas data-mini="${c.mini.semilla}" data-perfil="${c.mini.id}" data-tema-mini="${c.mini.tema}"></canvas>`
          : c.tema ? `<span class="muestra-tema" style="--m-bg:${c.tema.bg};--m-ac:${c.tema.acento}"></span>` : ico(c.icono);
        const atajo = c.atajo ? `<span class="paleta-atajo">${c.atajo.map(k => `<kbd>${k}</kbd>`).join('')}</span>` : '';
        html += `<li class="paleta-item" role="option" data-i="${i}" id="op-${i}"><span class="paleta-ico">${icono}</span><span class="paleta-txt"><span class="paleta-tit">${resaltar(c.titulo, c.marcas)}</span>${c.sub ? `<span class="paleta-sub">${esc(c.sub)}</span>` : ''}</span>${atajo}${ico('flecha', 'paleta-flecha')}</li>`;
      });
      this.lista.innerHTML = html || `<li class="paleta-vacio">Nada coincide con «${esc(q)}». Pulsa Esc para cerrar.</li>`;
      pintarMinis(this.lista);
      this.marcar();
    }
    marcar(desplazar) {
      $$('.paleta-item', this.lista).forEach(li => li.setAttribute('aria-selected', +li.dataset.i === this.sel));
      this.input.setAttribute('aria-activedescendant', `op-${this.sel}`);
      if (desplazar) $(`[data-i="${this.sel}"]`, this.lista)?.scrollIntoView({ block: 'nearest' });
    }
  }

  // ---------- Personalizar: cuatro vistas, cada ajuste dice a qué perfil afecta ----------

  const PESTANAS = [['aspecto', 'Aspecto'], ['disposicion', 'Disposición'], ['buscador', 'Buscador'], ['datos', 'Datos']];
  const ambito = todos => todos ? '<span class="ambito">Todos los perfiles</span>' : `<span class="ambito ambito-perfil"><i></i>Solo ${esc(perfil().nombre)}</span>`;
  const seccion = (titulo, todos, cuerpo) => `<section class="ajuste"><header class="ajuste-cab"><h3>${titulo}</h3>${ambito(todos)}</header>${cuerpo}</section>`;
  const segmentado = (nombre, valor, opciones) => `<div class="segmentado" role="group" aria-label="${nombre}">${opciones.map(([v, t]) => `<button type="button" data-seg="${nombre}" data-v="${v}" aria-pressed="${v === valor}">${t}</button>`).join('')}</div>`;
  const interruptor = (id, texto, on, sub = '') => `<label class="interruptor"><span><span class="int-tit">${texto}</span>${sub ? `<span class="int-sub">${sub}</span>` : ''}</span><input type="checkbox" role="switch" data-int="${id}" ${on ? 'checked' : ''}></label>`;
  const deslizador = (id, texto, v) => `<label class="deslizador"><span>${texto}</span><input type="range" min="0" max="100" value="${Math.round(v * 100)}" data-rango="${id}"></label>`;

  // Esquemas de cada estilo para su carta en Personalizar: bloques, no capturas.
  const MUESTRAS = {
    mapa: '<span class="em-col"><b class="em-reloj"></b><b></b><b class="em-caja"></b></span><span class="em-panel"><b></b><b></b><b></b><b></b><b></b></span>',
    baldosas: '<span class="em-fila"><b class="em-reloj"></b><b class="em-caja"></b></span><span class="em-rejilla"><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b></span>',
    compacto: '<span class="em-col em-estrecha"><b class="em-reloj"></b><b></b><b></b></span><span class="em-panel em-lineas"><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b></span>',
  };

  class Ajustes {
    // estilos: [[id, nombre, descripción]] si la página ofrece varias composiciones.
    constructor(raiz, { estilos = null } = {}) {
      this.raiz = raiz;
      this.estilos = estilos;
      this.pestana = 'aspecto';
      this.creando = false;
      raiz.classList.add('ajustes');
      raiz.innerHTML = `<div class="ajustes-tabs" role="tablist" aria-label="Personalizar">${PESTANAS.map(([id, n]) => `<button role="tab" type="button" data-p="${id}">${n}</button>`).join('')}<span class="ajustes-indicador" aria-hidden="true"></span></div><div class="ajustes-cuerpo" role="tabpanel"></div>`;
      this.cuerpo = $('.ajustes-cuerpo', raiz);
      raiz.addEventListener('click', e => this.clic(e));
      raiz.addEventListener('input', e => this.entrada(e));
      raiz.addEventListener('change', e => this.cambio(e));
      document.addEventListener('nova:cambio', e => { if (e.detail?.origen !== 'ajustes') this.pintar(); });
      this.pintar();
    }
    alMostrar() { this.pintar(); }
    pintar(animar) {
      $$('[role=tab]', this.raiz).forEach(b => b.setAttribute('aria-selected', b.dataset.p === this.pestana));
      const arriba = this.cuerpo.scrollTop;
      this.cuerpo.innerHTML = this[this.pestana]();
      if (animar) {
        this.cuerpo.classList.remove('entra');
        void this.cuerpo.offsetWidth;
        this.cuerpo.classList.add('entra');
        this.cuerpo.scrollTop = 0;
      } else this.cuerpo.scrollTop = arriba;
      pintarMinis(this.cuerpo);
      const b = $('[aria-selected="true"]', this.raiz), ind = $('.ajustes-indicador', this.raiz);
      if (b?.offsetWidth) { ind.style.width = `${b.offsetWidth}px`; ind.style.transform = `translateX(${b.offsetLeft}px)`; }
    }
    aspecto() {
      const p = perfil(), t = temaDe(p), estilo = p.fondo === 'liso' ? 'curvas' : p.fondo;
      const temas = Object.entries(TEMAS).map(([id, tt]) => `<button type="button" class="tema-carta" data-tema="${id}" aria-pressed="${id === p.tema}"><canvas data-mini="${p.semilla}" data-estilo="${estilo}" data-tema-mini="${id}"></canvas><span class="tema-nombre"><i style="background:${tt.acento}"></i>${tt.nombre}</span></button>`).join('');
      const b = borrador;
      const crear = this.creando
        ? `<div class="tema-crear"><canvas data-mini="${p.semilla}" data-estilo="${estilo}" data-tema-propio></canvas>
            <label>Nombre <input type="text" data-nuevo="nombre" value="${esc(b.nombre)}" maxlength="20"></label>
            <label>Fondo <input type="color" data-nuevo="bg" value="${b.bg}"></label>
            <label>Acento <input type="color" data-nuevo="acento" value="${b.acento}"></label>
            <div class="acciones"><button type="button" class="boton fantasma" data-accion="cancelar-tema">Cancelar</button><button type="button" class="boton primario" data-accion="guardar-tema">${ico('check')}Guardar tema</button></div></div>`
        : `<button type="button" class="tema-carta tema-nuevo" data-accion="crear-tema">${ico('mas')}Crear tema</button>`;
      const acentos = [TEMAS[p.tema].acento, ...ALTERNATIVOS].map(c => `<button type="button" class="acento-punto" data-acento="${c}" aria-pressed="${t.acento.toLowerCase() === c.toLowerCase()}" style="--c:${c}" aria-label="Acento ${c}"></button>`).join('');
      const subir = (texto, clase) => `<label class="${clase}">${texto}<input type="file" accept="image/png,image/jpeg,image/webp" data-subir hidden></label>`;
      const fondos = Object.entries(FONDOS).map(([id, f]) => id === 'imagen' && !p.imagen
        ? subir(`<span class="subir-caja">${ico('subir')}</span><span>${f.nombre}</span>`, 'fondo-carta fondo-subir')
        : `<button type="button" class="fondo-carta" data-fondo="${id}" aria-pressed="${id === p.fondo}"><canvas data-mini="${p.semilla}" data-estilo="${id}"></canvas><span>${f.nombre}</span></button>`).join('');
      const conImagen = p.fondo === 'imagen' && p.imagen;
      const deImagen = conImagen ? `<div class="imagen-ajustes">${deslizador('velo', 'Oscurecer', p.velo)}
            <p class="ajuste-nota">Con una imagen el fondo no se mueve ni se ilumina con el ratón. Se guarda reducida y solo en este equipo.</p>
            <div class="fila-botones">${subir(`${ico('subir')}Cambiar imagen`, 'boton')}<button type="button" class="boton fantasma" data-accion="quitar-imagen">${ico('papelera')}Quitar</button></div></div>` : '';
      const estilos = this.estilos ? seccion('Estilo', false, `<div class="estilos">${this.estilos.map(([id, nombre, desc]) => `<button type="button" class="estilo-carta" data-estilo-v="${id}" aria-pressed="${id === p.estilo}"><span class="estilo-muestra em-${id}">${MUESTRAS[id] || ''}</span><b>${nombre}</b><small>${desc}</small></button>`).join('')}</div>`) : '';
      return estilos + seccion('Tema', false, `<div class="temas">${temas}${crear}</div>`)
        + seccion('Acento', false, `<div class="acentos">${acentos}<label class="acento-libre" title="Otro color"><input type="color" value="${t.acento}" data-acento-libre aria-label="Otro color de acento"></label></div>`)
        + seccion('Fondo', false, `<div class="fondos">${fondos}</div>${deImagen}`)
        + (conImagen || p.fondo === 'liso' ? '' : seccion('Terreno', false, `<p class="ajuste-nota">Cada perfil tiene su propio relieve, generado a partir de su nombre.</p>
            ${deslizador('densidad', 'Densidad', p.densidad)}${deslizador('relieve', 'Relieve', p.relieve)}
            <div class="fila-ajuste"><span>Movimiento</span>${segmentado('movimiento', p.movimiento, MOVIMIENTOS)}</div>
            ${interruptor('brillo', 'Iluminar bajo el ratón', p.brillo, 'Lo que hay debajo toma el color de acento')}
            <button type="button" class="boton" data-accion="semilla">${ico('dado')}Generar otro terreno</button>`));
    }
    disposicion() {
      const p = perfil();
      const esquinas = [['recto', 'Rectas'], ['medio', 'Medias'], ['redondo', 'Redondas']].map(([v, t]) => `<button type="button" class="esquina-carta" data-seg="esquinas" data-v="${v}" aria-pressed="${p.esquinas === v}"><span class="esquina-muestra esq-${v}"></span>${t}</button>`).join('');
      return seccion('Densidad', false, segmentado('dens', p.dens, [['comoda', 'Cómoda'], ['compacta', 'Compacta']]))
        + seccion('Esquinas', false, `<div class="esquinas">${esquinas}</div>`)
        + seccion('Qué se ve', false, interruptor('p-inicio', 'Reloj y buscador', p.paneles.inicio) + interruptor('p-internet', 'Accesos a Internet', p.paneles.internet) + interruptor('p-servicios', 'Servicios de la red', p.paneles.servicios))
        + seccion('Reloj', false, interruptor('r-h24', 'Formato de 24 horas', p.reloj.h24) + interruptor('r-segundos', 'Segundos', p.reloj.segundos) + interruptor('r-fecha', 'Fecha', p.reloj.fecha));
    }
    buscador() {
      const motores = ['Google', 'DuckDuckGo', 'Bing', 'Brave', 'Ecosia'].map(m => `<option ${m === estado.motor ? 'selected' : ''}>${m}</option>`).join('');
      const atajos = ATAJOS.map(a => `<div class="atajo"><span class="atajo-clave mono">!${a.clave}</span><span>${a.nombre}</span><span class="atajo-url">${a.url}</span><button type="button" class="icono-mini" aria-label="Quitar ${a.nombre}" data-accion="quitar-atajo">${ico('cerrar')}</button></div>`).join('');
      return seccion('Motor de búsqueda', true, `<select class="campo" data-sel="motor" aria-label="Motor de búsqueda">${motores}</select>`)
        + seccion('Atajos', true, `<p class="ajuste-nota">Escribe <kbd>!y</kbd> gatos en el buscador para buscar «gatos» en YouTube.</p><div class="atajos">${atajos}</div><button type="button" class="boton" data-accion="atajo">${ico('mas')}Añadir atajo</button>`)
        + seccion('Sugerencias', true, interruptor('sugerencias', 'Sugerencias mientras escribes', estado.sugerencias, `Envía a ${estado.motor} lo que escribes`));
    }
    datos() {
      const p = perfil();
      const copias = COPIAS.map(c => `<li><span>${c.cuando}<span class="copia-sub">${c.detalle}</span></span><button type="button" class="boton fantasma" data-accion="recuperar">${ico('historial')}Recuperar</button></li>`).join('');
      return seccion('Copias automáticas', true, `<p class="ajuste-nota">Una al día; se guardan las siete últimas.</p><ul class="copias">${copias}</ul>`)
        + seccion('Traer y llevar', true, `<div class="botonera"><button type="button" class="boton" data-accion="exportar">${ico('descargar')}Exportar copia</button><button type="button" class="boton" data-accion="importar">${ico('subir')}Importar copia</button><button type="button" class="boton" data-accion="marcadores">${ico('marcador')}Importar marcadores de Chrome</button></div>`)
        + seccion('Empezar de cero', false, `<p class="ajuste-nota">Borra los grupos, enlaces y widgets de ${esc(p.nombre)} y vuelve al ejemplo inicial. Los demás perfiles no se tocan.</p><button type="button" class="boton peligro" data-accion="restablecer">${ico('papelera')}Restablecer ${esc(p.nombre)}…</button>`);
    }
    clic(e) {
      const t = e.target.closest('button');
      if (!t) return;
      const p = perfil();
      if (t.dataset.p) { this.pestana = t.dataset.p; this.creando = false; this.pintar(true); return; }
      if (t.dataset.estiloV) { cambiarAspecto({ estilo: t.dataset.estiloV }, 'ajustes'); this.pintar(); return; }
      if (t.dataset.tema) { cambiarAspecto({ tema: t.dataset.tema, acento: null }, 'ajustes'); this.pintar(); return; }
      if (t.dataset.acento) { cambiarAspecto({ acento: t.dataset.acento === TEMAS[p.tema].acento ? null : t.dataset.acento }, 'ajustes'); this.pintar(); return; }
      if (t.dataset.fondo) { cambiarAspecto({ fondo: t.dataset.fondo }, 'ajustes'); this.pintar(); return; }
      if (t.dataset.seg) { cambiarAspecto({ [t.dataset.seg]: t.dataset.v }, 'ajustes'); this.pintar(); return; }
      const accion = t.dataset.accion;
      if (accion === 'crear-tema') {
        const actual = temaDe(p);
        borrador = temaDesde('Mi tema', actual.bg, actual.acento);
        this.creando = true;
        this.pintar();
      } else if (accion === 'cancelar-tema') {
        this.creando = false;
        aplicar();
        this.pintar();
      } else if (accion === 'guardar-tema') {
        const id = `propio-${Object.keys(TEMAS).length}`;
        TEMAS[id] = borrador;
        this.creando = false;
        cambiarAspecto({ tema: id, acento: null }, 'ajustes');
        this.pintar();
        aviso(`Tema «${borrador.nombre}» guardado`);
      } else if (accion === 'quitar-imagen') {
        cambiarAspecto({ imagen: null, fondo: 'curvas' }, 'ajustes');
        this.pintar();
      } else if (accion === 'semilla') {
        cambiarAspecto({ semilla: `${p.id}-${Math.random().toString(36).slice(2, 7)}` }, 'ajustes');
        this.pintar();
      } else if (accion) {
        const textos = { exportar: 'Copia descargada', importar: 'Elige el archivo de copia', marcadores: 'Elige las carpetas que quieres traer', recuperar: 'Copia recuperada', restablecer: `Pide confirmación antes de borrar ${p.nombre}`, atajo: 'Nuevo atajo al final de la lista', 'quitar-atajo': 'Atajo quitado' };
        aviso(textos[accion] || accion);
      }
    }
    entrada(e) {
      const t = e.target;
      if (t.dataset.rango) cambiarAspecto({ [t.dataset.rango]: t.value / 100 }, 'ajustes');
      else if (t.hasAttribute('data-acento-libre')) cambiarAspecto({ acento: t.value }, 'ajustes');
      else if (t.dataset.nuevo) {
        const b = { ...borrador, [t.dataset.nuevo]: t.value };
        borrador = temaDesde(b.nombre, b.bg, b.acento);
        pintarTema(borrador);
        pintarMinis($('.tema-crear', this.cuerpo));
      }
    }
    cambio(e) {
      const t = e.target, p = perfil();
      if (t.hasAttribute('data-subir')) {
        const archivo = t.files[0];
        if (archivo) { cambiarAspecto({ imagen: URL.createObjectURL(archivo), fondo: 'imagen' }, 'ajustes'); this.pintar(); }
        return;
      }
      if (t.dataset.rango || t.hasAttribute('data-acento-libre')) { this.pintar(); return; }
      if (t.dataset.sel === 'motor') { cambiar({ motor: t.value }, 'ajustes'); this.pintar(); return; }
      const id = t.dataset.int;
      if (!id) return;
      if (id === 'brillo') cambiarAspecto({ brillo: t.checked }, 'ajustes');
      else if (id === 'sugerencias') cambiar({ sugerencias: t.checked }, 'ajustes');
      else if (id.startsWith('p-')) cambiarAspecto({ paneles: { ...p.paneles, [id.slice(2)]: t.checked } }, 'ajustes');
      else if (id.startsWith('r-')) cambiarAspecto({ reloj: { ...p.reloj, [id.slice(2)]: t.checked } }, 'ajustes');
    }
  }

  function iniciar({ canvas } = {}) {
    if (canvas) {
      terreno = new Terreno(canvas);
      // El terreno sube desde el llano al abrir la pestaña.
      terreno.op.semilla = '';
    }
    aplicar();
    return terreno;
  }

  return {
    $, $$, ico, esc, host, logo, mono, TEMAS, FONDOS, PERFILES, estado, perfil, temaDe, visibles, contar,
    estadoDe, textoMs, resumen, actualizarLatencias, latencias,
    cambiar, cambiarAspecto, cambiarPerfil, siguientePerfil, aplicar, iniciar, reloj, aviso, abrir, cerrar,
    pintarMinis, Paleta, Ajustes, get terreno() { return terreno; }, reducido,
  };
})();
