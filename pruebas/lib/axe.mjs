// axe-core en la página por CDP. Las herramientas viven en herramientas/ (solo desarrollo, fuera del paquete).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from './util.mjs';

const RUTA = join(RAIZ, 'herramientas', 'node_modules', 'axe-core', 'axe.min.js');
export const axeDisponible = () => existsSync(RUTA);

// Las violaciones de impacto «serious» o «critical» de lo que haya en pantalla (WCAG 2 A y AA, y buenas prácticas).
// «excluir» son selectores que no se auditan (con su motivo en quien llama).
export async function auditar(pg, { excluir = [] } = {}) {
  await pg.ev(readFileSync(RUTA, 'utf8'));
  const contexto = excluir.length ? `{ include: [['body']], exclude: ${JSON.stringify(excluir.map(s => [s]))} }` : 'document';
  const violaciones = await pg.ev(`axe.run(${contexto}, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
    resultTypes: ['violations'],
  }).then(r => r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => ({
    id: v.id, impacto: v.impact, ayuda: v.help,
    nodos: v.nodes.slice(0, 5).map(n => { const d = n.any[0] && n.any[0].data; return n.target.join(' ') + (d && d.contrastRatio ? ' [' + d.fgColor + ' sobre ' + d.bgColor + ': ' + d.contrastRatio + ', hace falta ' + d.expectedContrastRatio + ']' : ''); }),
  })))`);
  return { violaciones };
}

export const describir = (estado, violaciones) => violaciones.map(v => `${estado} · ${v.id} (${v.impacto}) · ${v.nodos.join(' | ')}`);
