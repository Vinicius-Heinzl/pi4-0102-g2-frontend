# Setores, status e atribuição de chamados

Os fluxos E2 e E5 e o contrato CT22 orientam os nomes apresentados na interface:

| Valor da API | Nome exibido |
| --- | --- |
| `NEW` | Em aberto |
| `ASSIGNED` | Em atendimento |
| `CLOSED` | Resolvido |
| `UNRESOLVED` | Não solucionado |

Na abertura, o solicitante é obtido do token. Um chamado sem responsável começa em `NEW`. Quando uma pessoa é escolhida, a criação já registra a atribuição e o status `ASSIGNED`. Esse status inicial é exibido automaticamente, sem permitir escolher um estado final na abertura.

O seletor de setor filtra as pessoas cadastradas. Qualquer pessoa cadastrada, de qualquer setor, pode ser indicada como responsável. O vínculo usa `supportId`, conforme o contrato existente, sem depender de texto livre ou armazenamento local. Ao selecionar um setor sem pessoas cadastradas, é necessário escolher outro setor ou voltar a “Todos os setores” para abrir sem responsável.

O cadastro oferece Financeiro, Compras, TI, Produção, Recursos Humanos, Marketing, Vendas, Logística e Administrativo. Nomes antigos de TI, como “Tecnologia da Informação”, continuam reconhecidos.

Somente o departamento **TI** pode editar, alterar status, reatribuir ou excluir chamados. O perfil ADMIN/SUPPORT sozinho não concede essa permissão. Usuários de outros setores podem abrir e consultar chamados. O frontend oculta os controles e bloqueia as funções; a API consulta o departamento salvo no banco antes de aceitar PUT/DELETE. O cadastro público mantém o perfil CLIENT, mesmo quando outro perfil é enviado pelo navegador.

## Painéis e consulta por departamento

A rota `#dashboard` (Visão geral) é exclusiva da TI, que continua consultando todos os chamados. Para os demais setores, o início é `#meu-departamento`, com o nome do departamento, indicadores, distribuições e chamados recentes restritos ao setor. Tentar acessar `#dashboard` diretamente redireciona ao painel do próprio departamento antes da renderização.

Um chamado pertence ao escopo do departamento quando seu solicitante (`clientId`) **ou** responsável (`supportId`) integra esse departamento. Assim, Vendas acompanha as solicitações dos colegas de Vendas, inclusive as atendidas pela TI, e também as solicitações atribuídas a alguém de Vendas. Compras e os demais setores seguem a mesma regra. Chamados sem responsável continuam visíveis ao setor do solicitante. Perfis ADMIN/SUPPORT fora da TI não recebem acesso global; departamentos ausentes ou desconhecidos não recebem acesso a chamados.

A mesma regra vale para lista, busca, filtros, contadores, gráficos, notificações e detalhes. A API calcula os vínculos com os departamentos registrados no banco, sem confiar em parâmetros de setor enviados pelo navegador. Consultas diretas a chamados de outros setores retornam 404 antes de carregar a timeline. Mudanças de departamento passam a valer na próxima requisição da API e na atualização dos dados da interface.

Editar também grava título, descrição, categoria e prioridade. O solicitante original não muda. Uma alteração apenas de status preserva o responsável; voltar para `NEW` remove a atribuição. `ASSIGNED` e `CLOSED` exigem um responsável. Reabrir limpa a data de encerramento.

## Backend e publicação

O backend está no repositório irmão `pi4-2026-2-0102-grupo2`, fora deste frontend. As alterações correspondentes estão registradas em [ticket-rules.patch](ticket-rules.patch), que modifica quatro arquivos Java. Na raiz de um checkout do repositório principal ainda sem essas mudanças, aplique:

```powershell
git apply --check <caminho-do-frontend>/docs/backend/ticket-rules.patch
git apply <caminho-do-frontend>/docs/backend/ticket-rules.patch
```

É necessário publicar também o backend atualizado. O workflow deste repositório sincroniza somente a pasta `frontend`; ele não atualiza o código Java automaticamente. A versão antiga da API ignora `supportId` no POST e não verifica o departamento em PUT/DELETE.

A restrição de leitura está em [department-access.patch](department-access.patch), aplicada **depois** de `ticket-rules.patch`. Ela altera `DepartmentPolicy`, `TicketHandler` e `NotificationHandler`. No checkout local irmão, essa alteração também foi aplicada diretamente. Em outro checkout que já tenha as regras anteriores, execute da raiz do repositório principal:

```powershell
git apply --check <caminho-do-frontend>/docs/backend/department-access.patch
git apply <caminho-do-frontend>/docs/backend/department-access.patch
```

Publique o frontend e o backend em conjunto para que a restrição também esteja ativa nas chamadas HTTP diretas em produção.

## Verificação

```powershell
node --test tests/ticket-rules.test.cjs tests/department-access.test.cjs
./tests/run-backend-contract.ps1
# Para outro checkout do backend:
./tests/run-backend-contract.ps1 -BackendPath C:/projetos/principal/backend-api
```

Os testes Java compilam o backend real com compatibilidade Java 21 e executam seus handlers HTTP com DAOs de teste em memória. Não acessam o banco nem validam uma migração ou implantação. A verificação no navegador usa respostas simuladas para testar abertura, atribuição por setor, permissões, edição, cadastro e layouts de 320 a 1440 px.
