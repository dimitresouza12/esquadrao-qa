#!/usr/bin/env node
// Escreve o andamento dos agentes em .esquadrao/ (escrita atômica, um arquivo por agente).
//   node reportar.mjs plano --sistema "Loja" --modo leve --agentes api-seguranca,login-sessao
//   node reportar.mjs agente api-seguranca --estado rodando --acao "testando /api/pedidos"
//   node reportar.mjs agente api-seguranca --achado crit "Dados de outro cliente abertos" [--suspeita]
//   node reportar.mjs agente api-seguranca --estado concluido
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const agora = () => new Date().toISOString();
export function escrever(f, obj) { fs.mkdirSync(path.dirname(f), { recursive: true }); const t = `${f}.${process.pid}.tmp`; fs.writeFileSync(t, JSON.stringify(obj, null, 2)); fs.renameSync(t, f); }
export function plano(dir, { sistema, modo, agentes }) {
  const av = path.join(dir, 'ao-vivo'); fs.mkdirSync(av, { recursive: true });
  for (const f of fs.readdirSync(av)) if (f.endsWith('.json')) fs.unlinkSync(path.join(av, f));
  for (const id of agentes) escrever(path.join(av, id + '.json'), { id, estado: 'fila', acao: '', achados: [], atualizadoEm: agora() });
  escrever(path.join(dir, 'plano.json'), { versao: 1, sistema, modo, iniciadoEm: agora(), agentes: agentes.map((id) => ({ id })) });
}
export function agente(dir, id, { estado, acao, achados = [] }) {
  if (!/^[a-z0-9-]{1,40}$/.test(id)) throw new Error('id invalido: ' + id);
  const f = path.join(dir, 'ao-vivo', id + '.json'); let d = { id, estado: 'fila', acao: '', achados: [] };
  try { d = JSON.parse(fs.readFileSync(f, 'utf8')); } catch {}
  if (estado) d.estado = estado; if (acao !== undefined) d.acao = acao; d.achados = [...(d.achados || []), ...achados]; d.atualizadoEm = agora();
  escrever(f, d);
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), cmd = a.shift(); let dir = '.esquadrao', o = { achados: [] }, id = null, suspeita = false;
  if (cmd === 'agente') id = a.shift();
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (k === '--dir') dir = a[++i]; else if (k === '--sistema') o.sistema = a[++i]; else if (k === '--modo') o.modo = a[++i];
    else if (k === '--agentes') o.agentes = a[++i].split(',').filter(Boolean); else if (k === '--estado') o.estado = a[++i];
    else if (k === '--acao') o.acao = a[++i]; else if (k === '--suspeita') suspeita = true;
    else if (k === '--achado') o.achados.push({ sev: a[++i], texto: a[++i], confirmado: true });
  }
  if (suspeita) o.achados.forEach((x) => (x.confirmado = false));
  if (cmd === 'plano') plano(dir, o); else if (cmd === 'agente') agente(dir, id, o); else { console.error('uso: plano | agente <id>'); process.exit(1); }
}
