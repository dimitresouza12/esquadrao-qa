#!/usr/bin/env node
// Servidor local do Esquadrão QA: serve a cena e o estado dos agentes. Escuta só em 127.0.0.1.
// Uso: node servidor.mjs [--dir .esquadrao] [--port 4777] [--web ../site/dist]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { achadosDoRelatorio } from './achados.mjs';
const aqui = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const DIR = path.resolve(arg('dir', '.esquadrao')), WEB = path.resolve(arg('web', path.join(aqui, 'web'))), PORTA = +arg('port', 4777);
const ID = /^[a-z0-9-]{1,40}$/, SEV = ['crit', 'alto', 'medio', 'baixo'], EST = ['fila', 'rodando', 'concluido', 'falhou'];
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
const limpa = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, n);
const lerJson = (f) => { try { if (fs.statSync(f).size > 200000) return null; return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
let cache = new Map(), ultimoPlano = '';

function estado() {
  const p = lerJson(path.join(DIR, 'plano.json'));
  const plano = p && Array.isArray(p.agentes) ? { sistema: limpa(p.sistema, 60) || 'Sistema', modo: limpa(p.modo, 12), iniciadoEm: limpa(p.iniciadoEm, 40), agentes: p.agentes.slice(0, 40).map((a) => ({ id: limpa(a?.id, 40) })).filter((a) => ID.test(a.id)) } : null;
  if (plano && plano.iniciadoEm !== ultimoPlano) { cache = new Map(); ultimoPlano = plano.iniciadoEm; }
  const agentes = {};
  if (plano) for (const { id } of plano.agentes) {
    let d = lerJson(path.join(DIR, 'ao-vivo', id + '.json'));
    if (d) cache.set(id, d); else d = cache.get(id); // arquivo lido no meio da escrita: usa a última leitura boa
    if (!d) continue;
    if (!(d.achados || []).length && d.estado !== 'fila') { // agente não reportou ao vivo: usa o relatório dele
      try { const r = path.join(DIR, 'relatorio', id + '.md'); if (fs.statSync(r).size < 200000) d = { ...d, achados: achadosDoRelatorio(fs.readFileSync(r, 'utf8')) }; } catch {}
    }
    agentes[id] = { estado: EST.includes(d.estado) ? d.estado : 'fila', acao: limpa(d.acao, 160), atualizadoEm: limpa(d.atualizadoEm, 40), achados: (Array.isArray(d.achados) ? d.achados : []).slice(0, 60).map((x) => ({ sev: SEV.includes(x?.sev) ? x.sev : 'baixo', texto: limpa(x?.texto, 240), confirmado: x?.confirmado !== false })) };
  }
  return { versao: 1, plano, agentes, relatorio: fs.existsSync(path.join(DIR, 'relatorio', 'RESUMO.md')) };
}
const enviar = (res, cod, tipo, corpo) => { res.writeHead(cod, { 'Content-Type': tipo, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': CSP }); res.end(corpo); };
const arquivo = (res, f, tipo) => fs.readFile(f, (e, b) => (e ? enviar(res, 404, 'text/plain', 'nao encontrado') : enviar(res, 200, tipo, b)));

const srv = http.createServer((req, res) => {
  const host = (req.headers.host || '').replace(/:\d+$/, '');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) return enviar(res, 403, 'text/plain', 'host nao permitido');
  if (req.method !== 'GET') return enviar(res, 405, 'text/plain', 'metodo nao permitido');
  let u; try { u = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return enviar(res, 400, 'text/plain', 'url invalida'); }
  if (u === '/api/estado') return enviar(res, 200, 'application/json; charset=utf-8', JSON.stringify(estado()));
  if (u === '/' || u === '/index.html') return arquivo(res, path.join(WEB, 'index.html'), 'text/html; charset=utf-8');
  if (u === '/vendor/three.min.js') return arquivo(res, path.join(WEB, 'vendor', 'three.min.js'), 'application/javascript');
  const m = u.match(/^\/relatorio\/([A-Za-z0-9._-]{1,80}\.md)$/);
  if (m) return arquivo(res, path.join(DIR, 'relatorio', m[1]), 'text/plain; charset=utf-8');
  enviar(res, 404, 'text/plain', 'nao encontrado');
});
let porta = PORTA;
srv.on('error', (e) => { if (e.code === 'EADDRINUSE' && porta < PORTA + 20) { porta++; srv.listen(porta, '127.0.0.1'); } else { console.error(e.message); process.exit(1); } });
srv.on('listening', () => console.log(`Esquadrão QA ao vivo: http://localhost:${porta}  (dados em ${DIR})`));
srv.listen(porta, '127.0.0.1');
