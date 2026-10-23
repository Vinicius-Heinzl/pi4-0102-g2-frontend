# Setores, status e atribuição de chamados

Os fluxos E2 e E5 e o contrato CT22 orientam os nomes apresentados na interface:

| Valor da API | Nome exibido |
| --- | --- |
| `NEW` | Em aberto |
| `ASSIGNED` | Em atendimento |
| `CLOSED` | Resolvido |
| `UNRESOLVED` | Não solucionado |

Na abertura, o solicitante é obtido do token. Todo chamado começa em `NEW` (Em aberto), inclusive quando uma pessoa é indicada como responsável. Atribuir alguém não inicia o atendimento. O formulário mantém o status inicial fixo em Em aberto e a API ignora qualquer status enviado na criação.

Ao entrar na página de detalhes de um chamado `NEW`, uma pessoa do departamento TI aciona `POST /api/chamados/{id}/iniciar`. A API confere o departamento salvo no banco, muda o status para `ASSIGNED`, registra essa pessoa da TI como responsável e inclui um evento na timeline. A mudança de status e o histórico são gravados na mesma operação SQL condicional: somente o primeiro técnico consegue iniciar um chamado ainda `NEW`. Repetir a operação não troca o responsável nem duplica o evento. Chamados resolvidos ou não solucionados não são reabertos por essa operação.

Consultar listas, dashboard, detalhes por GET, editar o formulário ou visualizar como solicitante não inicia o atendimento. O frontend aciona a operação somente ao abrir a rota de detalhes pela TI, depois de verificar que o chamado continua Em aberto. As páginas visíveis sincronizam os chamados a cada 15 segundos e ao retornar à aba, refletindo a alteração tanto na conta da TI quanto na do solicitante.

O seletor de setor filtra as pessoas cadastradas. Qualquer pessoa cadastrada, de qualquer setor, pode ser indicada como responsável. O vínculo usa `supportId`, conforme o contrato existente, sem depender de texto livre ou armazenamento local. Ao selecionar um setor sem pessoas cadastradas, é necessário escolher outro setor ou voltar a “Todos os setores” para abrir sem responsável.

O cadastro oferece Financeiro, Compras, TI, Produção, Recursos Humanos, Marketing, Vendas, Logística e Administrativo. Nomes antigos de TI, como “Tecnologia da Informação”, continuam reconhecidos.

Somente o departamento **TI** pode editar, alterar status, reatribuir ou excluir chamados. O perfil ADMIN/SUPPORT sozinho não concede essa permissão. Usuários de outros setores podem abrir e consultar chamados. O frontend oculta os controles e bloqueia as funções; a API consulta o departamento salvo no banco antes de aceitar PUT/DELETE. O cadastro público mantém o perfil CLIENT, mesmo quando outro perfil é enviado pelo navegador.

## Painéis e consulta por departamento

A rota `#dashboard` (Visão geral) é exclusiva da TI, que continua consultando todos os chamados. Para os demais setores, o início é `#meu-departamento`, com o nome do departamento, indicadores, distribuições e chamados recentes restritos ao setor. Tentar acessar `#dashboard` diretamente redireciona ao painel do próprio departamento antes da renderização.

Um chamado pertence ao escopo do departamento quando seu solicitante (`clientId`) **ou** responsável (`supportId`) integra esse departamento. Assim, Vendas acompanha as solicitações dos colegas de Vendas, inclusive as atendidas pela TI, e também as solicitações atribuídas a alguém de Vendas. Compras e os demais setores seguem a mesma regra. Chamados sem responsável continuam visíveis ao setor do solicitante. Perfis ADMIN/SUPPORT fora da TI não recebem acesso global; departamentos ausentes ou desconhecidos não recebem acesso a chamados.

A mesma regra vale para lista, busca, filtros, contadores, gráficos, notificações e detalhes. A API calcula os vínculos com os departamentos registrados no banco, sem confiar em parâmetros de setor enviados pelo navegador. Consultas diretas a chamados de outros setores retornam 404 antes de carregar a timeline. Mudanças de departamento passam a valer na próxima requisição da API e na atualização dos dados da interface.

Editar também grava título, descrição, categoria e prioridade. O solicitante original não muda. Uma alteração apenas de status preserva o responsável; voltar para `NEW` sem indicar um responsável remove a atribuição. Indicar explicitamente um responsável em `NEW` preserva o chamado em aberto. `ASSIGNED` e `CLOSED` exigem um responsável. Reabrir limpa a data de encerramento.

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

O fluxo de início de atendimento está em [start-service.patch](start-service.patch), aplicado **depois** dos dois patches anteriores. Ele modifica `TicketHandler` e `TicketDao`; a mudança também foi aplicada no checkout local irmão. Para outro checkout, execute da raiz do repositório principal:

```powershell
git apply --check <caminho-do-frontend>/docs/backend/start-service.patch
git apply <caminho-do-frontend>/docs/backend/start-service.patch
```

Essa mudança exige publicar a API junto com o frontend. A API anterior ainda inicia atendimento durante a criação e não possui a rota `/iniciar`. Não há migração automática de chamados antigos: o fluxo novo é aplicado às novas criações e aos chamados em `NEW`.

### Publicação v0.1.12

A correção foi publicada diretamente na `main` do repositório de produção [cauagreccodev/pi4-2026-2-0102-grupo2, commit 04a5f78](https://github.com/cauagreccodev/pi4-2026-2-0102-grupo2/commit/04a5f78). Esse commit inclui o início de atendimento pela TI e a restrição de consultas por departamento. A publicação anterior do frontend não havia atualizado esses arquivos Java, pois o workflow sincroniza somente a pasta `frontend`.

O deploy no Render foi confirmado pelo [health check da API](https://help-desk-pi-iv.onrender.com/health), que agora retorna `ticketLifecycle: "NEW_UNTIL_TI_OPEN"`. A tag `v0.1.12` deste frontend registra essa publicação; o código do frontend já estava preparado na `v0.1.11`. A validação do backend publicado passou em 43 verificações de contrato, com DAOs em memória.

## Verificação

O patch [ticket-persistence.patch](ticket-persistence.patch) deve ser aplicado depois de `start-service.patch`. Ele corrige o DAO para que o INSERT grave `NEW` mesmo com responsável indicado e para que falhas de atualização no banco sejam propagadas como erro de servidor, em vez de serem confundidas com chamado inexistente. O frontend distingue falha na gravação de falha na sincronização após uma gravação bem-sucedida e apresenta a mensagem retornada pela API. Esses ajustes não confirmam, por si só, a causa do erro observado ao resolver o chamado #22.

O script abaixo também testa o `TicketDao` de produção, substituindo apenas a conexão JDBC. Essa etapa verifica os parâmetros de INSERT/UPDATE e a propagação de exceções; não acessa o banco de produção.

```powershell
node --test tests/ticket-rules.test.cjs tests/department-access.test.cjs tests/ticket-sync.test.cjs
./tests/run-backend-contract.ps1
# Para outro checkout do backend:
./tests/run-backend-contract.ps1 -BackendPath C:/projetos/principal/backend-api
```

Os testes Java compilam o backend real com compatibilidade Java 21 e executam seus handlers HTTP com DAOs de teste em memória. Não acessam o banco nem validam uma migração ou implantação. A verificação no navegador usa respostas simuladas para testar abertura, atribuição por setor, permissões, edição, cadastro e layouts de 320 a 1440 px.
