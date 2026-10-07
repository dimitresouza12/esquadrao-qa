// Alvo de exemplo, PROPOSITALMENTE vulnerável, para testar o Esquadrão QA com segurança.
// Escuta só em 127.0.0.1:3999. Nunca publique este arquivo em um servidor.
import http from 'node:http';
const clientes = { 1: { id: 1, nome: 'Ana', email: 'ana@exemplo.test' }, 2: { id: 2, nome: 'Bruno', email: 'bruno@exemplo.test' } };
const pedidos = [];
const json = (res, c, o) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
http.createServer((req, res) => {
  let b = ''; req.on('data', (c) => (b += c)).on('end', () => {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'GET' && u.pathname === '/') return res.end('<h1>Loja de exemplo</h1><p>Alvo de teste do Esquadrão QA</p>');
    const m = u.pathname.match(/^\/api\/clientes\/(\d+)$/);
    if (req.method === 'GET' && m) return clientes[m[1]] ? json(res, 200, clientes[m[1]]) : json(res, 404, { erro: 'não encontrado' }); // sem login: qualquer um lê qualquer cliente
    if (req.method === 'POST' && u.pathname === '/api/pedidos') {
      const d = JSON.parse(b); // JSON quebrado derruba com 500
      pedidos.push({ id: pedidos.length + 1, preco: d.preco, qtd: d.qtd }); // aceita preço e quantidade negativos
      return json(res, 201, { id: pedidos.length, total: d.preco * d.qtd });
    }
    if (req.method === 'POST' && u.pathname === '/api/login') { const d = JSON.parse(b); return json(res, 200, { ok: !!d.senha }); } // qualquer senha serve
    json(res, 404, { erro: 'rota inexistente' });
  });
}).on('clientError', (e, s) => s.end()).listen(3999, '127.0.0.1', () => console.log('alvo-demo em http://localhost:3999'));
process.on('uncaughtException', (e) => console.error('erro:', e.message));
