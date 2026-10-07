#!/usr/bin/env node
// Simulação curta (só para testar a cena ao vivo): node simular.mjs --dir /tmp/x --agentes a,b,c
import { plano, agente } from './reportar.mjs';
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const dir = arg('dir', '.esquadrao'), ids = arg('agentes', 'api-seguranca,login-sessao,fluxo-usuario,regras-negocio,fuzz-api').split(',');
const achados = [['crit', 'Preço aceita valor negativo'], ['alto', 'JSON quebrado derruba a rota'], ['medio', 'Sessão não expira']];
plano(dir, { sistema: 'Sistema de Teste', modo: 'leve', agentes: ids });
ids.forEach((id, i) => {
  setTimeout(() => agente(dir, id, { estado: 'rodando', acao: 'testando ' + id }), 1500 + i * 1200);
  achados.forEach(([sev, texto], k) => setTimeout(() => agente(dir, id, { achados: [{ sev, texto: texto + ' (' + id + ')', confirmado: true }] }), 2500 + i * 1200 + k * 900));
  setTimeout(() => agente(dir, id, { estado: 'concluido', acao: '' }), 2500 + i * 1200 + 3 * 900 + 400);
});
