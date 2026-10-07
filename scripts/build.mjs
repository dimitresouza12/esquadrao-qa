// Gera site/dist/index.html (documento completo, para a Vercel) e copia a cena para dentro do plugin.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const frag = fs.readFileSync(path.join(raiz, 'site', 'index.html'), 'utf8');
const doc = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0;padding:0;font:14px system-ui,sans-serif;background:#0b1424}img{max-width:100%}[hidden]{display:none!important}</style></head><body>\n' + frag + '\n</body></html>\n';
for (const dest of [path.join(raiz, 'site', 'dist'), path.join(raiz, 'plugin', 'skills', 'testar', 'viewer', 'web')]) {
  fs.mkdirSync(path.join(dest, 'vendor'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'index.html'), doc);
  fs.copyFileSync(path.join(raiz, 'site', 'vendor', 'three.min.js'), path.join(dest, 'vendor', 'three.min.js'));
}
console.log('ok: site/dist e plugin/skills/testar/viewer/web');
