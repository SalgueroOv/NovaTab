'use strict';

// Común a los tres mockups: datos, iconos, buscador estilo Google, reloj y selector de tema.
const Comun = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const grupos = DATOS_DEFECTO.grupos;
  const local = grupos.filter(g => g.zona !== 'online');
  const online = grupos.filter(g => g.zona === 'online');

  const TIPOS = [
    [/proxmox/i, 'PX', '#f4b183'],
    [/neo4j/i, 'N4', '#9cc3e6'],
    [/gitlab/i, 'GL', '#f2a7a0'],
    [/alfresco/i, 'AF', '#a9d5b5'],
    [/redcap/i, 'RC', '#f0b8c6'],
  ];

  const ICONOS = {
    buscar: 'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    ia: 'M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z',
    imagen: 'M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z',
    video: 'M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z',
    noticias: 'M20 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zM11 17H6v-2h5v2zm7-4H6v-2h12v2zm0-4H6V7h12v2z',
    mapa: 'M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z',
    paleta: 'M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
    lapiz: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  };

  const svg = nombre => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONOS[nombre]}"/></svg>`;

  function partes(url) {
    try {
      const u = new URL(url);
      return { host: u.hostname, puerto: u.port || (u.protocol === 'https:' ? '443' : '80') };
    } catch {
      return { host: '', puerto: '' };
    }
  }

  const dominio = url => partes(url).host.replace(/^www\./, '');
  const direccion = url => { const p = partes(url); return `${p.host}:${p.puerto}`; };

  function icono(e, g) {
    if (g.zona === 'online') {
      const img = document.createElement('img');
      img.className = 'icono favicon';
      img.alt = '';
      img.src = `https://www.google.com/s2/favicons?domain=${partes(e.url).host}&sz=64`;
      return img;
    }
    const t = TIPOS.find(([re]) => re.test(e.nombre));
    const s = document.createElement('span');
    s.className = 'icono letras';
    s.textContent = t ? t[1] : e.nombre.trim().slice(0, 2).toUpperCase();
    s.style.setProperty('--tono', t ? t[2] : g.color);
    return s;
  }

  function atajo(e, g) {
    const a = document.createElement('a');
    a.className = 'atajo';
    a.href = e.url;
    a.title = e.url;
    const nombre = document.createElement('span');
    nombre.className = 'nombre';
    nombre.textContent = e.nombre;
    a.append(icono(e, g), nombre);
    if (g.zona !== 'online') {
      const puerto = document.createElement('span');
      puerto.className = 'puerto mono';
      puerto.textContent = `:${partes(e.url).puerto}`;
      a.append(puerto);
    }
    return a;
  }

  // ---------- Buscador ----------

  const GOOGLE = [
    { icono: 'buscar', titulo: q => `Buscar «${q}» en Google`, url: q => `https://www.google.com/search?q=${q}` },
    { icono: 'ia', titulo: () => 'Preguntar al Modo IA', url: q => `https://www.google.com/search?udm=50&q=${q}` },
    { icono: 'imagen', titulo: () => 'Imágenes', url: q => `https://www.google.com/search?udm=2&q=${q}` },
    { icono: 'video', titulo: () => 'Vídeos', url: q => `https://www.google.com/search?udm=7&q=${q}` },
    { icono: 'noticias', titulo: () => 'Noticias', url: q => `https://www.google.com/search?tbm=nws&q=${q}` },
    { icono: 'mapa', titulo: () => 'Maps', url: q => `https://www.google.com/maps/search/${q}` },
  ];

  function fila(url, iconoNodo, titulo, sub, etiqueta) {
    const a = document.createElement('a');
    a.className = 'sugerencia';
    a.href = url;
    const t = document.createElement('span');
    t.className = 's-titulo';
    t.textContent = titulo;
    const s = document.createElement('span');
    s.className = 's-sub mono';
    s.textContent = sub;
    const et = document.createElement('span');
    et.className = 's-etiqueta';
    et.textContent = etiqueta;
    if (typeof iconoNodo === 'string') a.insertAdjacentHTML('beforeend', iconoNodo);
    else a.append(iconoNodo);
    a.append(t, s, et);
    return a;
  }

  function buscador(raiz) {
    raiz.innerHTML = `
      <div class="caja">
        <div class="fila-input">
          ${svg('buscar')}
          <input type="search" placeholder="Busca en Google o en tus servicios" autocomplete="off" spellcheck="false" aria-label="Buscar">
          <a class="modo-ia" href="https://www.google.com/search?udm=50">${svg('ia')}Modo IA</a>
        </div>
        <div class="sugerencias" role="listbox"></div>
      </div>`;
    const input = $('input', raiz);
    const lista = $('.sugerencias', raiz);
    const modoIa = $('.modo-ia', raiz);
    const todos = grupos.flatMap(g => g.enlaces.map(e => ({ e, g, texto: `${g.nombre} ${e.nombre} ${e.url}`.toLowerCase() })));
    let items = [];
    let sel = 0;
    let primeraGoogle = 0;

    function marcar() {
      items.forEach((n, i) => n.classList.toggle('sel', i === sel));
    }

    function pintar() {
      const q = input.value.trim();
      const qq = encodeURIComponent(q);
      modoIa.href = q ? GOOGLE[1].url(qq) : 'https://www.google.com/search?udm=50';
      if (!q) {
        raiz.classList.remove('abierto');
        lista.replaceChildren();
        items = [];
        return;
      }
      const palabras = q.toLowerCase().split(/\s+/);
      const propios = todos.filter(t => palabras.every(p => t.texto.includes(p))).slice(0, 6)
        .map(({ e, g }) => fila(e.url, icono(e, g), e.nombre,
          g.zona === 'online' ? dominio(e.url) : direccion(e.url),
          g.zona === 'online' ? 'Internet' : g.nombre));
      const deGoogle = GOOGLE.map(o => fila(o.url(qq), svg(o.icono), o.titulo(q), '', 'Google'));
      items = [...propios, ...deGoogle];
      primeraGoogle = propios.length;
      const nodos = propios.length ? [...propios, Object.assign(document.createElement('div'), { className: 'separador' }), ...deGoogle] : deGoogle;
      lista.replaceChildren(...nodos);
      sel = 0;
      marcar();
      raiz.classList.add('abierto');
    }

    const abrir = (url, nueva) => (nueva ? window.open(url, '_blank') : (location.href = url));

    input.addEventListener('input', pintar);
    input.addEventListener('focus', pintar);
    input.addEventListener('keydown', ev => {
      if (!items.length) return;
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        sel = (sel + (ev.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        marcar();
      } else if (ev.key === 'Enter') {
        const destino = ev.shiftKey ? items[primeraGoogle] : items[sel];
        abrir(destino.href, ev.ctrlKey || ev.metaKey);
      } else if (ev.key === 'Escape') {
        input.value = '';
        pintar();
      }
    });
    lista.addEventListener('mousemove', ev => {
      const i = items.indexOf(ev.target.closest('.sugerencia'));
      if (i >= 0 && i !== sel) { sel = i; marcar(); }
    });
    document.addEventListener('click', ev => {
      if (!raiz.contains(ev.target)) raiz.classList.remove('abierto');
    });
    document.addEventListener('keydown', ev => {
      if (ev.key === '/' && document.activeElement !== input) {
        ev.preventDefault();
        input.focus();
      }
    });
  }

  // ---------- Tema ----------

  function temas(lista, clave) {
    const html = document.documentElement;
    const esquina = document.createElement('div');
    esquina.className = 'esquina';
    esquina.innerHTML = `
      <button class="icono-boton" type="button" title="Editar enlaces">${svg('lapiz')}</button>
      <button class="icono-boton" type="button" id="btn-tema" title="Personalizar" aria-expanded="false">${svg('paleta')}</button>
      <div class="panel-tema" hidden><h2>Tema</h2><div class="muestras"></div></div>`;
    document.body.append(esquina);
    const boton = $('#btn-tema', esquina);
    const panel = $('.panel-tema', esquina);
    const muestras = lista.map(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'muestra';
      b.dataset.tema = t.id;
      b.style.setProperty('--m1', t.muestra[0]);
      b.style.setProperty('--m2', t.muestra[1]);
      b.innerHTML = '<i></i>';
      b.append(t.nombre);
      b.addEventListener('click', () => poner(t.id));
      return b;
    });
    $('.muestras', panel).append(...muestras);

    function poner(id) {
      const t = lista.find(x => x.id === id) || lista[0];
      html.dataset.tema = t.id;
      html.dataset.modo = t.modo;
      muestras.forEach(m => m.setAttribute('aria-pressed', String(m.dataset.tema === t.id)));
      try { localStorage.setItem(clave, t.id); } catch { /* sin almacenamiento */ }
    }
    let guardado = null;
    try { guardado = localStorage.getItem(clave); } catch { /* sin almacenamiento */ }
    poner(guardado);

    boton.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      boton.setAttribute('aria-expanded', String(!panel.hidden));
    });
    document.addEventListener('click', ev => {
      if (!esquina.contains(ev.target)) panel.hidden = true;
    });
    document.addEventListener('keydown', ev => {
      if (ev.key === 'Escape') panel.hidden = true;
    });
  }

  // ---------- Varios ----------

  function reloj(hora, fecha) {
    const pintar = () => {
      const d = new Date();
      hora.textContent = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      if (fecha) fecha.textContent = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    };
    pintar();
    setInterval(pintar, 10000);
  }

  // Aleatorio con semilla: el dibujo de fondo es siempre el mismo.
  function azar(semilla) {
    let a = semilla >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function alRedimensionar(fn) {
    let t;
    fn();
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fn, 120); });
  }

  return { grupos, local, online, icono, atajo, partes, dominio, direccion, buscador, temas, reloj, azar, alRedimensionar };
})();
