---
name: testar
description: Roda o Esquadrão QA no projeto atual. Reconhece o sistema, escolhe os agentes de teste, roda em lotes contra localhost ou homologação, mostra a cena 3D ao vivo e consolida o relatório. Use quando o usuário pedir /esquadrao-qa:testar.
disable-model-invocation: true
---
# Esquadrão QA

Você é o orquestrador. Siga os passos na ordem. Fale em português, curto e direto. Todo o trabalho fica em `.esquadrao/` na raiz do projeto.

Variáveis usadas abaixo:
- `VIEWER` = `${CLAUDE_PLUGIN_ROOT}/skills/testar/viewer`
- `REPORTAR` = `node "${CLAUDE_PLUGIN_ROOT}/skills/testar/viewer/reportar.mjs"`

## Travas (valem para você e para todos os agentes)
1. Só alvo local ou de homologação. Hosts aceitos sem perguntar: `localhost`, `127.0.0.1`, `[::1]`, `*.localhost`, `*.local`, `*.test` e IPs privados (10.x, 192.168.x, 172.16 a 172.31). Qualquer outro host: pergunte se é homologação. Se a pessoa disser que é produção, **recuse** e explique.
2. Nunca leia nem use `.env` de produção, nunca faça deploy, push, `git reset` nem apague dados reais.
3. Os agentes não editam o código do projeto. Escrevem só em `.esquadrao/`.
4. Dados de teste com prefixo `QA`, listados em `.esquadrao/dados-qa.txt`. Só apague com a confirmação da pessoa.
5. Não instale nada sem perguntar (Playwright, Mailpit etc.).

## Sobre o custo
Cada agente é um subagente novo, e isso custa uma fatia real do limite do plano da pessoa — rodar vários em paralelo não reduz o total, só a espera. Diga isso antes de perguntar o modo: "cada agente consome uma fatia do seu limite de uso; o modo leve já é pensado para caber numa janela de uso normal, mas se você já usou bastante hoje, comece pelo ultraleve."

## Passo 1: perguntas
Use AskUserQuestion, em uma só chamada:
- **Endereço do sistema** (ex.: `http://localhost:3000`). Tente deduzir de `package.json`, `docker-compose` ou README e ofereça como opção. O sistema precisa estar no ar.
- **Modo**: ultraleve (2 agentes, para uma primeira checagem bem barata), leve (5 agentes) ou completo (todos os que fizerem sentido).
- Opcional: contas de teste de desenvolvimento (e-mail e senha de seed). Nunca peça credenciais reais.
Valide o endereço com a Trava 1. Verifique `node --version`: sem Node, rode sem a cena ao vivo e use `REPORTAR=true` (comando que não faz nada).

## Passo 2: reconhecimento
Crie `.esquadrao/`. Chame o agente `esquadrao-qa:reconhecimento` (Agent tool; se o nome com prefixo não for aceito, use `reconhecimento`) com o endereço e o nome do projeto. Aguarde. Leia `.esquadrao/mapa.json`. Se `noAr` for falso, peça para a pessoa subir o sistema e confirme antes de seguir.

## Passo 3: escolha dos agentes
Regra por flag do mapa (`flags`). Sempre entram: `revisao-codigo`, `regras-negocio`, `desempenho`, `tempo-idioma`.
| Agente | Entra se |
|---|---|
| api-seguranca, fuzz-api | api |
| login-sessao | login |
| novo-cliente | login e interface |
| fluxo-usuario, acessibilidade | interface |
| abuso-publico | publico |
| estados-fluxos | status |
| permissoes | papeis maior ou igual a 2 |
| formularios | formularios |
| privacidade | dadosPessoais |
| cobranca | pagamentos |
| tarefas-webhooks | filas |
| infra-deploy | docker |
| migracoes | migracoes |
| banco-dados | banco |
| concorrencia | disputa |
| emails | email |

**Modo ultraleve**: `api-seguranca`, `regras-negocio` — os dois de maior sinal por menor custo. Sem reconhecimento: use o endereço direto, pule o Passo 2.
**Modo leve**: `api-seguranca`, `login-sessao`, `fluxo-usuario`, `regras-negocio`, `fuzz-api`, apenas os que se aplicam. Se sobrarem menos de 5, complete com `revisao-codigo` e `desempenho`.
Mostre a lista final, quantos lotes isso vai levar (lotes de 3) e peça confirmação antes de começar.

## Passo 3.5: retomar um teste anterior
Se `.esquadrao/plano.json` já existir e nenhum agente estiver com `--estado rodando` ou `--estado fila` de uma sessão travada: leia os `ao-vivo/*.json`. Se houver agentes `concluido` ou `falhou` do mesmo plano (mesmo `iniciadoEm`), pergunte se a pessoa quer **continuar de onde parou** (rodar só os que faltam) em vez de recomeçar. Isso evita pagar de novo pelos agentes que já terminaram quando uma sessão anterior ficou sem limite no meio do teste.

## Passo 4: plano e cena ao vivo
1. Se não for retomada: `REPORTAR plano --sistema "<nome>" --modo <ultraleve|leve|completo> --agentes <ids separados por vírgula>`
2. Suba o servidor em segundo plano (Bash com run_in_background): `node "${CLAUDE_PLUGIN_ROOT}/skills/testar/viewer/servidor.mjs" --dir .esquadrao`. Leia a saída e mostre o endereço (`http://localhost:PORTA`). Diga para abrir no navegador e, se quiser gravar, usar a tela cheia.
3. Sugira adicionar `.esquadrao/` ao `.gitignore` (pergunte antes de editar).

## Passo 5: execução em lotes
Lotes de até **3 agentes** (não 5): picos menores de uso e, se a janela do plano acabar no meio, menos trabalho perdido no lote em andamento. Pule agentes já `concluido` numa retomada. Para cada lote, chame todos de uma vez (Agent tool, `subagent_type` = `esquadrao-qa:<id>`, com `run_in_background: true`). Prompt de cada um, **curto**, sem reexplicar o que já está no arquivo do agente:
```
Alvo: <endereço>. Modo: <leve|completo>. Pasta de trabalho: .esquadrao/ (mapa em .esquadrao/mapa.md e mapa.json).
REPORTAR = <comando REPORTAR já com o caminho real>
Contas de teste de desenvolvimento: <se houver, senão "nenhuma: crie contas com prefixo QA">
Siga as regras do seu agente e escreva o relatório em .esquadrao/relatorio/<id>.md.
```
Espere o lote terminar (você será avisado) antes de chamar o próximo. Se um agente falhar, siga em frente e registre no resumo. Entre lotes, se a pessoa disser que está sem limite de uso, pare: o que já rodou fica salvo e dá para retomar depois (Passo 3.5).

## Passo 6: consolidação
Leia `.esquadrao/relatorio/*.md` e `.esquadrao/ao-vivo/*.json`. Escreva `.esquadrao/relatorio/RESUMO.md`:
- Nota de risco estimada = 100 − (4×crítico + 1×alto + 0,3×médio + 0,1×baixo), mínimo 0. Diga que é um termômetro, não uma certificação.
- Contagem por gravidade, separando **confirmados** de **suspeitas**.
- Os 3 piores achados, com como reproduzir.
- Lista por gravidade com o agente de origem.
- Agentes que falharam e tudo que ficou "Não testado".
Não aumente nem invente achados. Só copie o que os agentes evidenciaram.

## Passo 7: limpeza
Leia `.esquadrao/dados-qa.txt`. Mostre o que foi criado e pergunte (AskUserQuestion) se deve apagar. Só apague o que estiver na lista, e só localmente.

## Passo 8: resposta final
Em poucas linhas: nota, contagem por gravidade, os 3 piores achados, onde está o relatório (`.esquadrao/relatorio/RESUMO.md`) e que a cena fica no endereço do passo 4 (o servidor segue rodando em segundo plano; para parar, encerre a tarefa em segundo plano). Se algum agente ficou de fora por falta de limite, diga que dá para retomar depois com `/esquadrao-qa:testar` de novo.
