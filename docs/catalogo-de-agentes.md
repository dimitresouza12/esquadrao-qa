# Esquadrão QA: catálogo de agentes

Versão 1 do catálogo. Serve de base para a skill do Claude Code e para a cena 3D da página.

## Princípios

1. **O mapa vem primeiro.** Antes de qualquer teste, um agente de reconhecimento lê o projeto e produz o "mapa do sistema": stack, rotas, telas, papéis de usuário, banco, integrações (pagamento, e-mail, filas) e como rodar localmente. Cada agente abaixo só entra se o mapa disser que ele faz sentido.
2. **Cada agente recebe um plano próprio**, gerado a partir do mapa. "Teste a segurança" não funciona. "Teste estas 25 rotas com estes 3 papéis" funciona.
3. **Achado sem evidência é suspeita.** O relatório separa *confirmado* (com a requisição, a resposta ou o print) de *suspeita* (visto no código, não reproduzido).
4. **Ninguém toca produção.** As travas valem para todos os agentes e estão no fim deste documento.

## Os 22 agentes

Legenda do modo: **L** entra no modo leve (5 agentes). **C** só no modo completo. A coluna "Entra se" vem do mapa do sistema. Quando está vazia, o agente roda sempre.

### Segurança

| Agente | O que testa | Entra se | Modo |
|---|---|---|---|
| `api-seguranca` | Acesso às rotas sem login, com papel errado e com IDs de outro cliente. Mass assignment, CORS, limite de tentativas. | tem API | L |
| `login-sessao` | Força bruta, recuperação de senha, expiração e invalidação de sessão, enumeração de usuários, senhas fracas. | tem login | L |
| `revisao-codigo` | Leitura estática atrás de segredos no código, injeção de SQL e HTML, dependências com falha conhecida, validação ausente, erros engolidos. | | C |

### Fluxos do usuário

| Agente | O que testa | Entra se | Modo |
|---|---|---|---|
| `fluxo-usuario` | Percorre as telas principais num navegador: voltar, recarregar, erros, telas vazias, mensagens. | tem interface | L |
| `abuso-publico` | Formulários públicos em massa, enumeração de contas e reservas, ausência de captcha ou limite. | tem telas públicas | C |
| `novo-cliente` | Jornada completa: cadastro, primeiro uso, upgrade, cancelamento, exclusão de conta. | tem cadastro | C |

### Regras de negócio

| Agente | O que testa | Entra se | Modo |
|---|---|---|---|
| `regras-negocio` | Cálculos de preço, desconto, comissão, imposto e arredondamento, com valores negativos, zero e extremos. | | L |
| `estados-fluxos` | Todas as transições de status, inclusive as proibidas, e os estados finais. | tem entidades com status | C |
| `permissoes` | Matriz papel × rota × ação. Escalada de privilégio, convite com papel maior, revogação de acesso. | tem 2 ou mais papéis | C |

### Formulários e dados

| Agente | O que testa | Entra se | Modo |
|---|---|---|---|
| `formularios` | Limites de tamanho, tipos de arquivo, HTML nos campos, validação só no navegador, uploads. | tem formulários ou uploads | C |
| `fuzz-api` | JSON quebrado, tipos errados, caractere nulo, unicode, números gigantes, corpos enormes, métodos inesperados. | tem API | L |
| `privacidade` | Importação e exportação de planilhas, exportação que vaza outro cliente, exclusão de conta, dados pessoais em logs e URLs. | tem dados pessoais ou planilhas | C |

### Cobrança e rotinas

| Agente | O que testa | Entra se | Modo |
|---|---|---|---|
| `cobranca` | Webhook de pagamento repetido ou fora de ordem, planos, período de teste, cancelamento, reembolso, idempotência. Só no modo de teste do provedor. | tem pagamentos | C |
| `tarefas-webhooks` | Rotinas agendadas e webhooks de entrada: execução dupla, assinatura do webhook, falha silenciosa, repetição. | tem filas, cron ou webhooks | C |

### Infraestrutura

| Agente | O que testa | Entra se | Modo |
|---|---|---|---|
| `infra-deploy` | Volumes, variáveis de ambiente, cabeçalhos de segurança, backup, usuário root, o que some a cada deploy. | tem Docker ou CI | C |
| `migracoes` | Aplica as migrações do zero e sobre dados antigos, deploys seguidos, possibilidade de voltar atrás. | tem migrações | C |

### Banco de dados

| Agente | O que testa | Entra se | Modo |
|---|---|---|---|
| `banco-dados` | Restrições, chaves estrangeiras com escopo de cliente, índices, valores impossíveis gravados direto. | tem banco | C |
| `concorrencia` | Requisições paralelas na mesma vaga, saldo ou estoque: duplicidade, deadlock, erro 500. | há disputa por recurso | C |

### Acessibilidade e celular

| Agente | O que testa | Entra se | Modo |
|---|---|---|---|
| `acessibilidade` | Teclado, foco, contraste, alvos de toque de 44 px, tela de 375 px, zoom do iPhone, rede lenta. | tem interface | C |

### Desempenho

| Agente | O que testa | Entra se | Modo |
|---|---|---|---|
| `desempenho` | Tempo das rotas, tamanho das respostas, consultas repetidas, atualização automática, imagens, carga leve com 50 acessos. | | C |

### Comunicação e tempo

| Agente | O que testa | Entra se | Modo |
|---|---|---|---|
| `emails` | Modelos com HTML injetado, links de convite e de reset, envio duplicado, destinatário errado. Sempre em caixa de teste local. | envia e-mail ou mensagem | C |
| `tempo-idioma` | Fuso, horário de verão, virada de mês e de ano, 29 de fevereiro, moeda, acentos. | | C |

## Modos de execução

| Modo | Agentes | Para quem |
|---|---|---|
| **Ultraleve** | 2: `api-seguranca`, `regras-negocio` | Primeiríssima checagem, sem reconhecimento. |
| **Leve** | 5: `api-seguranca`, `login-sessao`, `fluxo-usuario`, `regras-negocio`, `fuzz-api` | Rodada normal. |
| **Completo** | Todos os que o mapa do sistema justificar, até 22 | Antes de um lançamento ou depois de uma mudança grande. |

Os agentes rodam em lotes de 3, não todos de uma vez, para não estourar o limite do plano da pessoa. A skill avisa o custo antes de começar. Agentes mecânicos (fuzz, formulários, e-mails, acessibilidade, tempo/fuso, migrações, privacidade, abuso público, desempenho) rodam em Haiku; os que exigem julgamento mais fino ficam em Sonnet. Cada agente tem teto de turnos e instrução para ser direto. Se o limite acabar no meio, o teste retoma de onde parou numa sessão seguinte, sem repetir os agentes já concluídos.

## Como o relatório é montado

- **Gravidade**
  - **Crítico:** perde dinheiro, vaza dados de outro cliente ou derruba o sistema.
  - **Alto:** quebra uma regra importante ou abre uma brecha explorável com esforço baixo.
  - **Médio:** comportamento errado com impacto limitado ou que exige condições específicas.
  - **Baixo:** acabamento, boas práticas e riscos teóricos.
- **Estado:** confirmado (com evidência anexada) ou suspeita (precisa de revisão humana).
- **Nota (0 a 100):** peso por gravidade, com texto "nota de risco estimada". É um termômetro, não uma certificação.
- **Por agente:** um arquivo `relatorio/<agente>.md` com o plano executado, os achados e o que ficou de fora.
- **Consolidado:** um `RESUMO.md` com a nota, os 3 piores achados e a lista por gravidade.

## Travas de segurança (valem para todos)

1. Só roda em `localhost` ou homologação. Se detectar um endereço de produção, para e pergunta.
2. Nunca lê nem usa `.env` de produção, nunca faz deploy, push ou exclusão de dados reais.
3. Dados de teste sempre com o prefixo `QA`, e a limpeza no final só acontece com a confirmação da pessoa.
4. Pagamentos só com chaves e cartões de teste do provedor. E-mails e mensagens só para caixa de teste local.
5. Pede permissão antes de instalar qualquer ferramenta, como o Playwright.
6. Testes agressivos (carga, força bruta, fuzz) só no sistema da própria pessoa.
7. Nenhum achado de segurança é publicado ou enviado para fora do computador.

## O que o catálogo ainda não cobre

- **Itens que só aparecem fora do localhost:** cookie `Secure`, HTTPS, limite por IP real, cabeçalhos do proxy.
- **Leitor de tela de verdade e safe-area do iPhone.** O agente de acessibilidade cobre o que dá para verificar por código e por navegador.
- **Aplicativos nativos** (iOS e Android). A v1 é para sistemas web e APIs.
- **Ataques que exigem infraestrutura externa:** negação de serviço distribuída, engenharia social, ataques à cadeia de fornecedores.

## Próximos passos

1. Escrever o prompt-base de cada agente (entrada, passos, formato do relatório).
2. Escrever o agente de reconhecimento que gera o mapa do sistema e escolhe os agentes.
3. Testar em 3 sistemas de stacks diferentes e medir o uso gasto por modo.
