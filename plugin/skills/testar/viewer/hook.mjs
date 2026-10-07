// Rede de segurança: marca início e fim de subagentes do Esquadrão QA mesmo que o agente esqueça de reportar.
import fs from 'node:fs'; import path from 'node:path';
import { achadosDoRelatorio } from './achados.mjs';
let raw = ''; process.stdin.on('data', (c) => (raw += c)).on('end', () => {
  try {
    const e = JSON.parse(raw), modo = process.argv[2], id = String(e.agent_type || e.agent_name || e.subagent_type || '').split(':').pop();
    if (!/^[a-z0-9-]{1,40}$/.test(id)) return;
    const dir = path.join(e.cwd || process.cwd(), '.esquadrao'), f = path.join(dir, 'ao-vivo', id + '.json');
    if (!fs.existsSync(f)) return;
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    const rel = path.join(dir, 'relatorio', id + '.md');
    if (modo === 'start' && d.estado === 'fila') d.estado = 'rodando';
    else if (modo === 'stop') {
      if (d.estado === 'rodando') d.estado = fs.existsSync(rel) && /^##\s*(Plano executado|N[aã]o testado)/im.test(fs.readFileSync(rel, 'utf8')) ? 'concluido' : 'falhou'; // relatório só com "Achados" = agente parou no meio
      if (!(d.achados || []).length && fs.existsSync(rel)) d.achados = achadosDoRelatorio(fs.readFileSync(rel, 'utf8'));
    } else return;
    d.atualizadoEm = new Date().toISOString();
    const t = f + '.' + process.pid + '.tmp'; fs.writeFileSync(t, JSON.stringify(d, null, 2)); fs.renameSync(t, f);
  } catch {}
});
