# Backend API — Task List

## Config
- [x] `config/Database.java` — Pool de conexão JDBC

## Models (POJOs)
- [x] `model/User.java`
- [x] `model/Ticket.java`
- [x] `model/Category.java`
- [x] `model/TicketTimeline.java`
- [x] `model/Notification.java`

## Util
- [x] `util/JsonUtil.java` — Wrappers Gson
- [x] `util/HttpHelper.java` — Respostas HTTP, CORS, parsers
- [x] `util/AuthUtil.java` — SHA-256 + HMAC-SHA256 token

## DAOs (SQL Puro)
- [x] `dao/UserDao.java`
- [x] `dao/TicketDao.java`
- [x] `dao/CategoryDao.java`
- [x] `dao/TicketTimelineDao.java`
- [x] `dao/NotificationDao.java`

## Handlers (Endpoints)
- [x] `handler/LoginHandler.java`
- [x] `handler/UserHandler.java`
- [x] `handler/TicketHandler.java`
- [x] `handler/CategoryHandler.java`
- [x] `handler/NotificationHandler.java`

## Entry Point
- [x] `Main.java`

## Verificação
- [ ] Compilação com `javac`
