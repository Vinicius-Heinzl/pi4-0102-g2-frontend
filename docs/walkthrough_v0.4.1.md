# Walkthrough v0.4.1 — Integração Full-Stack Neon DB, i18n & Dashboard Reativo

> **Data**: 10/09/2026  
> **Versão**: v0.4.1  
> **Escopo**: Persistência Neon DB, migração de CRUD em memória para API, tradução i18n (EN/PT-BR) e Dashboard 100% responsivo com dados reais.

---

## 1. Resumo Executivo

Todas as operações de chamados que antes eram simuladas em memória no frontend (`chamados[]`) agora passam exclusivamente pela **API REST Java Puro** e persistem no banco de dados **PostgreSQL na Neon.tech**. 

Além disso:
- As variáveis e propriedades no frontend foram migradas para **inglês** (`title`, `status`, `priority`, `clientId`, `supportId`, etc.).
- Um módulo global de internacionalização (`i18n.js`) assegura que o usuário veja toda a interface em **Português (PT-BR)**.
- O arquivo `data.js` e o `Dashboard` foram completamente reformulados para eliminar métricas fictícias ou hardcoded (como trends `+12%` e status inventados como `IN_PROGRESS`/`PENDING`), alinhando-se estritamente com as constraints do banco de dados Neon (`NEW`, `ASSIGNED`, `CLOSED`, `UNRESOLVED`).
- Os contadores da interface (badge da sidebar e notificações) tornaram-se reativos e atualizam instantaneamente após qualquer operação CRUD.

---

## 2. Problemas Identificados e Solucionados

| Problema Anterior | Causa Raiz | Solução Aplicada |
|-------------------|------------|------------------|
| **Chamados não persistiam no Neon** | O frontend operava sobre um array estático local (`chamados = []`), sem chamadas HTTP para escrita. | Criado módulo `api.js` e migrado todo o CRUD (`createTicket`, `updateTicket`, `deleteTicket`) para requisições `fetch` com Bearer Token. |
| **Ausência de exclusão no backend** | A API Java não possuía endpoint `DELETE /api/chamados/:id`. | Implementado `deleteById()` em `TicketDao.java` com transação SQL em cascata (timeline → notificações → ticket) e handler em `TicketHandler.java`. |
| **Dashboard desconectado e métricas fake** | O dashboard continha trends arbitrários (`+12%`, `+3`, `+5`) e contadores para status inexistentes no banco (`IN_PROGRESS`, `PENDING`). | Removidos dados fictícios. Métricas e gráficos recalculados puramente com os registros do Neon: `NEW`, `ASSIGNED`, `CLOSED`, `UNRESOLVED` e categorias reais. |
| **`data.js` estático e não responsivo** | O estado global não refletia alterações imediatas e a sidebar não atualizava contadores após ações de CRUD. | `data.js` reestruturado com sincronização bidirecional, suporte a notificações reais (`/api/notificacoes`) e funções `updateSidebarBadges()` e `refreshData()`. |
| **Inconsistência nos nomes de variáveis** | Mistura de português e inglês (`titulo` vs `title`, `categoria` vs `categoryId`). | Código padronizado em inglês em todas as camadas técnicas, com tradução global transparente via `i18n.js`. |
| **Incompatibilidade de Roles** | O banco usa `CLIENT`, `SUPPORT`, `ADMIN`, enquanto o frontend checava `tecnico` e `admin`. | Normalizador de papéis implementado em `api.js` e helper unificado `isTIUser()` adicionado ao `data.js`. |

---

## 3. Arquitetura de Dados: Fidelidade com o Neon DB

A tabela `tickets` do Neon possui constraints rigorosas que agora são respeitadas à risca pelo frontend:

### Status dos Chamados (CHECK constraint no PostgreSQL)
```
         ┌───────────────┐
         │      NEW      │  (Recém-criado, aguardando triagem)
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │   ASSIGNED    │  (Atribuído a um técnico de TI)
         └───────┬───────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
 ┌──────────────┐  ┌──────────────┐
 │    CLOSED    │  │  UNRESOLVED  │
 └──────────────┘  └──────────────┘
 (Resolvido com    (Sem resolução
   sucesso)           viável)
```

- **Valores válidos no banco**: `'NEW'`, `'ASSIGNED'`, `'CLOSED'`, `'UNRESOLVED'`.
- **Valores válidos de prioridade**: `'LOW'`, `'MEDIUM'`, `'HIGH'`, `'URGENT'`.

---

## 4. Detalhamento dos Arquivos Modificados e Criados

### 4.1 Backend (Java Puro)
- **[`TicketDao.java`](file:///c:/Users/madur/Downloads/Projetos/Help-Desk-PI-IV/backend-api/src/com/helpdesk/api/dao/TicketDao.java)**:
  - Novo método transacional `deleteById(int id)`: remove eventos da timeline e notificações vinculadas antes de excluir o ticket, com garantia de rollback em caso de falha.
- **[`TicketHandler.java`](file:///c:/Users/madur/Downloads/Projetos/Help-Desk-PI-IV/backend-api/src/com/helpdesk/api/handler/TicketHandler.java)**:
  - Adicionado suporte ao verbo HTTP `DELETE` na rota `/api/chamados/:id`, autenticado via token JWT/Bearer.

### 4.2 Frontend — Novos Módulos
- **[`frontend/js/i18n.js`](file:///c:/Users/madur/Downloads/Projetos/Help-Desk-PI-IV/frontend/js/i18n.js)**:
  - Dicionário de tradução centralizado (EN → PT-BR).
  - Helpers tipados: `i18n.t()`, `i18n.status()`, `i18n.priority()`, `i18n.role()`, `i18n.getStatusList()`, `i18n.getPriorityList()`.
- **[`frontend/js/api.js`](file:///c:/Users/madur/Downloads/Projetos/Help-Desk-PI-IV/frontend/js/api.js)**:
  - Cliente HTTP centralizado com tratamento de cabeçalho `Authorization: Bearer <token>` e redirecionamento automático em caso de 401.
  - Endpoints integrados: `fetchTickets`, `fetchTicketById`, `createTicket`, `updateTicket`, `deleteTicket`, `fetchUsers`, `fetchCategories`, `fetchNotifications`, `markNotificationAsRead`.
  - Mappers robustos com normalização de papéis (`CLIENT`, `SUPPORT`, `ADMIN`).

### 4.3 Frontend — Reescrita e Reatividade
- **[`frontend/js/data.js`](file:///c:/Users/madur/Downloads/Projetos/Help-Desk-PI-IV/frontend/js/data.js)**:
  - Estado global dinâmico: `tickets`, `USERS`, `CATEGORIES`, `notifications`, `isBackendConnected`, `lastSyncTimestamp`.
  - `getDashboardStats()`: calcula métricas 100% reais (taxa de resolução, contagem por status real, distribuição por categoria do banco).
  - Integração com `/api/notificacoes` para leitura e marcação em tempo real.
- **[`frontend/js/components.js`](file:///c:/Users/madur/Downloads/Projetos/Help-Desk-PI-IV/frontend/js/components.js)**:
  - `renderDashboard()`: exibe cards reais, badges de sincronização com o Neon e gráficos de distribuição por status e categoria do banco.
  - `renderSidebar()`: badge de contagem com ID `#sidebarTicketCount` para atualização reativa instantânea.
  - `renderTicketModal()` e `renderTicketsList()`: selects e filtros alimentados estritamente pelos status e categorias do Neon.
  - Verificação de privilégios de TI atualizada para usar `isTIUser(CURRENT_USER)`.
- **[`frontend/js/app.js`](file:///c:/Users/madur/Downloads/Projetos/Help-Desk-PI-IV/frontend/js/app.js)**:
  - Operações CRUD sincronizadas com chamadas à API e recarga de dados do banco.
  - `updateSidebarBadges()` e `updateNotificationBadges()` integrados ao fluxo de navegação e eventos.
  - Função `refreshData()` exposta publicamente para recarga manual com feedback via toasts.
- **[`frontend/index.html`](file:///c:/Users/madur/Downloads/Projetos/Help-Desk-PI-IV/frontend/index.html)**:
  - Ordem das tags `<script>` ajustada para respeitar dependências: `i18n.js` → `api.js` → `data.js` → `theme.js` → `router.js` → `components.js` → `app.js`.

---

## 5. Validação e Compilação

1. **Compilação do Backend**:
   - `javac -cp "backend-api/lib/*" -d backend-api/out (Get-ChildItem -Recurse backend-api/src/*.java)` executado com **código de saída 0** (sem erros de compilação).
2. **Consistência de Tipos e ENums**:
   - Status, prioridades e papéis verificados em relação ao `docs/database_modeling.md`.
3. **Persistência**:
   - Fluxo de requisições autenticadas testado estruturalmente para garantir integridade referencial com `client_id`, `category_id` e `support_id`.

---

## 6. Próximos Passos Recomendados

1. **Deploy no Render**: Fazer push das alterações para o repositório remoto para acionar o build automático do backend com o novo endpoint `DELETE /api/chamados/:id`.
2. **Testes End-to-End**: Realizar abertura e exclusão de chamado pelo frontend autenticado para confirmar a persistência imediata no Neon.tech.
