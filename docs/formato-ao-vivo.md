# Cena ao vivo: formato dos arquivos

A cena lê `.esquadrao/` do projeto testado, por um servidor local (`viewer/servidor.mjs`, só em 127.0.0.1).
Sem servidor, a página abre em modo demonstração.

```
.esquadrao/
  plano.json            escrito uma vez pelo agente de reconhecimento
  ao-vivo/<id>.json     um arquivo por agente, atualizado a cada etapa
  relatorio/RESUMO.md   escrito no fim (habilita o botão "Abrir relatório")
```

## plano.json
```json
{ "versao": 1, "sistema": "Loja Exemplo", "modo": "leve", "iniciadoEm": "2026-10-07T01:00:00Z",
  "agentes": [ { "id": "api-seguranca" }, { "id": "login-sessao" } ] }
```
Só ids do catálogo (`docs/catalogo-de-agentes.md`). `iniciadoEm` novo faz a página recarregar.

## ao-vivo/<id>.json
```json
{ "id": "api-seguranca", "estado": "rodando", "acao": "testando /api/pedidos com o papel atendente",
  "achados": [ { "sev": "crit", "texto": "Dados de outro cliente abertos trocando o ID", "confirmado": true } ],
  "atualizadoEm": "2026-10-07T01:02:03Z" }
```
- `estado`: `fila` | `rodando` | `concluido` | `falhou`
- `sev`: `crit` | `alto` | `medio` | `baixo`
- `confirmado: false` marca suspeita (sem evidência reproduzida).

## Como os agentes escrevem
Pelo auxiliar (escrita atômica, não corrompe o arquivo se o servidor ler no meio):
```
node viewer/reportar.mjs plano --sistema "Loja" --modo leve --agentes api-seguranca,login-sessao
node viewer/reportar.mjs agente api-seguranca --estado rodando --acao "testando /api/pedidos"
node viewer/reportar.mjs agente api-seguranca --achado crit "Dados de outro cliente abertos" 
node viewer/reportar.mjs agente api-seguranca --estado concluido
```

## Servidor e segurança
- Rotas: `/` (cena), `/api/estado` (estado já validado), `/relatorio/*.md` (texto), `/vendor/three.min.js`.
- Só GET, só `Host` localhost, sem listagem de pasta, CSP restrita.
- O servidor limita tamanhos, valida `id`, `estado` e `sev` e descarta caracteres de controle.
- A página escapa todo texto vindo dos agentes antes de exibir (um achado pode citar HTML do sistema testado).
- Teste rápido: `node viewer/build.mjs`, `node viewer/servidor.mjs --dir /tmp/x`, `node viewer/simular.mjs --dir /tmp/x`.
