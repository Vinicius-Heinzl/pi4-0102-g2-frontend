# Backend API — Implementação em Java Puro

> **Stack:** Java 21 (sem frameworks) | `com.sun.net.httpserver.HttpServer` | JDBC Nativo | Gson  
> **Porta:** 8000  
> **Contêiner:** `backend-api/`

Este documento detalha a arquitetura interna do backend-api, a estrutura de pacotes, os endpoints expostos e o fluxo de cada camada.

---

## 1. Arquitetura de Pacotes

```
backend-api/src/com/helpdesk/api/
├── Main.java                    ← Entry point, inicia o HttpServer na porta 8000
├── config/
│   └── Database.java            ← Connection pool JDBC (variáveis de ambiente)
├── model/
│   ├── User.java                ← POJO: id, name, email, passwordHash, role, department, ...
│   ├── Ticket.java              ← POJO: id, title, description, status, priority, ...
│   ├── Category.java            ← POJO: id, name, icon, description, isActive
│   ├── TicketTimeline.java      ← POJO: id, ticketId, authorId, eventType, message, ...
│   └── Notification.java        ← POJO: id, userId, ticketId, type, title, message, isRead, ...
├── dao/
│   ├── UserDao.java             ← SQL puro: findByEmail, findById, findAll, insert
│   ├── TicketDao.java           ← SQL puro: insert, findAll, findById, updateStatus, filtros
│   ├── CategoryDao.java         ← SQL puro: findAll, findById
│   ├── TicketTimelineDao.java   ← SQL puro: insert, findByTicketId
│   └── NotificationDao.java     ← SQL puro: findByUserId, markAsRead, insert
├── handler/
│   ├── LoginHandler.java        ← POST /api/login
│   ├── TicketHandler.java       ← GET/POST /api/chamados, GET/PUT /api/chamados/{id}
│   ├── CategoryHandler.java     ← GET /api/categorias
│   ├── NotificationHandler.java ← GET /api/notificacoes, PUT /api/notificacoes/{id}/read
│   └── UserHandler.java         ← GET /api/users (para admin), POST /api/register
└── util/
    ├── JsonUtil.java            ← Wrappers do Gson (parse, toJson)
    └── AuthUtil.java            ← Hash de senha (SHA-256) e token assinado via HMAC-SHA256
```

---

## 2. Camadas e Responsabilidades

### 2.1. `Main.java` — Entry Point

- Cria `HttpServer` na porta 8000
- Registra todos os handlers nos contexts (`/api/login`, `/api/chamados`, etc.)
- Inicia o servidor com thread pool (`Executors.newFixedThreadPool(10)`)

### 2.2. `config/Database.java` — Conexão JDBC

- Lê `DB_URL`, `DB_USER`, `DB_PASS` das variáveis de ambiente
- Mantém um pool simples de conexões JDBC (sem lib externa)
- Método `getConnection()` retorna `java.sql.Connection`

### 2.3. `model/` — POJOs

Classes simples que espelham as tabelas do banco. Sem lógica de negócio.

| Classe | Tabela | Campos principais |
|:---|:---|:---|
| `User` | `users` | id, name, email, passwordHash, role, department, jobTitle, avatarUrl, isActive |
| `Ticket` | `tickets` | id, title, description, status, priority, categoryId, clientId, supportId, closedAt |
| `Category` | `categories` | id, name, icon, description, isActive |
| `TicketTimeline` | `ticket_timeline` | id, ticketId, authorId, eventType, message |
| `Notification` | `notifications` | id, userId, ticketId, type, title, message, isRead |

### 2.4. `dao/` — Data Access Objects (SQL Puro)

Cada DAO usa `PreparedStatement` e SQL puro. Sem ORM.

| DAO | Métodos |
|:---|:---|
| `UserDao` | `findByEmail(email)`, `findById(id)`, `findAll()`, `insert(User)` |
| `TicketDao` | `insert(Ticket)`, `findAll(filtros)`, `findById(id)`, `updateStatus(id, status, supportId)` |
| `CategoryDao` | `findAll()`, `findById(id)` |
| `TicketTimelineDao` | `insert(TicketTimeline)`, `findByTicketId(ticketId)` |
| `NotificationDao` | `findByUserId(userId)`, `markAsRead(id)`, `insert(Notification)` |

### 2.5. `handler/` — Endpoints HTTP

Cada handler implementa `HttpHandler` e roteia por método HTTP (GET, POST, PUT).

### 2.6. `util/` — Utilitários

| Classe | Responsabilidade |
|:---|:---|
| `JsonUtil` | Serialização/deserialização via Gson |
| `AuthUtil` | Hash SHA-256 (com salt), geração e validação de token assinado via HMAC-SHA256 (seguro, sem adulteração) |

---

## 3. Endpoints

| Método | Rota | Handler | Descrição |
|:---|:---|:---|:---|
| `POST` | `/api/login` | LoginHandler | Autenticação (email + senha → token) |
| `POST` | `/api/register` | UserHandler | Cadastro de novo usuário |
| `GET` | `/api/users` | UserHandler | Lista usuários (para atribuição) |
| `GET` | `/api/categorias` | CategoryHandler | Lista categorias ativas |
| `POST` | `/api/chamados` | TicketHandler | Cria chamado (status = NEW) |
| `GET` | `/api/chamados` | TicketHandler | Lista chamados (filtros via query params) |
| `GET` | `/api/chamados/{id}` | TicketHandler | Detalhes do chamado + timeline |
| `PUT` | `/api/chamados/{id}` | TicketHandler | Atualiza status/prioridade/suporte |
| `GET` | `/api/notificacoes` | NotificationHandler | Notificações do usuário |
| `PUT` | `/api/notificacoes/{id}/read` | NotificationHandler | Marca notificação como lida |

---

## 4. Fluxo de uma Requisição

```
Cliente HTTP
    │
    ▼
HttpServer (porta 8000)
    │
    ▼
Handler (ex: TicketHandler)
    ├── Lê body com HttpHelper.readBody()
    ├── Parseia JSON com JsonUtil.fromJson()
    ├── Valida token com AuthUtil.validateToken()
    │
    ▼
DAO (ex: TicketDao)
    ├── Obtém conexão via Database.getConnection()
    ├── Executa SQL com PreparedStatement
    ├── Mapeia ResultSet → Model (POJO)
    │
    ▼
Handler
    ├── Serializa resposta com JsonUtil.toJson()
    ├── Envia com HttpHelper.sendJson()
    │
    ▼
Cliente HTTP (recebe JSON)
```

---

## 5. Autenticação

- **Hash de senha:** SHA-256 nativo com Salt (`java.security.MessageDigest` + `java.security.SecureRandom`)
- **Token seguro:** Assinado digitalmente com **HMAC-SHA256** (`javax.crypto.Mac`), nativo do JDK (sem bibliotecas externas)
  - Estrutura: `payload.assinatura_hmac` (onde payload contém `userId` e expiração em timestamp)
  - À prova de adulteração: se o cliente alterar o `userId` ou o timestamp, a assinatura se torna inválida e a requisição é rejeitada (401 Unauthorized)
  - Expiração configurável (padrão: 24 horas)
- **Header:** `Authorization: Bearer <token>`

---

## 6. Compilação e Execução

### Local (sem Docker)
```bash
cd backend-api
javac -cp "lib/*" -d out $(find src -name "*.java")
java -cp "out:lib/*" com.helpdesk.api.Main
```

### Docker
```bash
docker compose build api_principal
docker compose up api_principal
```

### Variáveis de Ambiente
| Variável | Descrição | Exemplo |
|:---|:---|:---|
| `DB_URL` | Connection string JDBC | `jdbc:postgresql://db:5432/helpdesk` |
| `DB_USER` | Usuário do banco | `root` |
| `DB_PASS` | Senha do banco | `rootpassword` |
| `JWT_SECRET` | Chave secreta para assinar tokens HMAC (opcional, possui fallback seguro) | `minha-chave-secreta-super-segura` |
