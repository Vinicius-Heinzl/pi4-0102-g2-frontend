# Frontend Authentication & Organization Plan

Este plano define a estruturação do frontend dentro do projeto e a criação do fluxo de autenticação (Login e Cadastro) para integrar com nossa nova `backend-api` em Java Puro.

## User Review Required

> [!IMPORTANT]
> Verifique se a organização de pastas abaixo está do seu agrado (pasta `frontend` englobando o HTML/CSS/JS). E confirme se a comunicação com a API deverá apontar para o `http://localhost:8000` durante o desenvolvimento local.

## Open Questions

- Você quer que o formulário de Login e Cadastro fiquem na mesma página (com um botão para alternar entre "Entrar" e "Criar Conta") usando animações suaves para impressionar?
- Devemos usar um "guard" simples no `app.js` (se não tiver token no localStorage, manda pro `login.html`)?

## Proposed Changes

### Organização de Diretórios

Todas as pastas e arquivos frontend soltos na raiz serão movidos para dentro da pasta `frontend/` para espelhar a arquitetura dos backends.

#### [NEW] `frontend/`
Novo diretório que irá abrigar todo o client-side da aplicação.

#### [MODIFY] `index.html`, `css/`, `js/`
Serão movidos para a pasta `frontend/`.

---

### Página de Autenticação (Login / Cadastro)

#### [NEW] `frontend/login.html`
Nova página inicial de autenticação do sistema. Conterá um layout clean e centralizado em card (glassmorphism/blur se adequado).

#### [NEW] `frontend/css/login.css`
Estilos específicos para a tela de login/cadastro.

#### [NEW] `frontend/js/auth.js`
Script dedicado à página de autenticação:
- Lógica de transição entre tela de Login e tela de Registro.
- Chamadas HTTP `fetch()` para o `backend-api` (`POST /api/login` e `POST /api/register`).
- Validação de formulários.
- Armazenamento do token JWT e dados do usuário no `localStorage`.
- Redirecionamento para `index.html` em caso de sucesso.

---

### Proteção de Rotas (Guards)

#### [MODIFY] `frontend/js/app.js` (e scripts principais)
Adicionar verificação:
```javascript
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'login.html';
}
```
Atualizar os requests (quando o frontend for refatorado para conectar com a API ao invés do `data.js`) para sempre enviarem o Header `Authorization: Bearer <token>`.

---

### Documentação

#### [MODIFY] `README.md`
Atualizar a "Estrutura do Projeto" no README para refletir a criação da pasta `frontend/`.

## Verification Plan

### Testes Manuais
1. Ao acessar `index.html` diretamente sem login, ser redirecionado para `login.html`.
2. Registrar um novo usuário pela tela de Cadastro e verificar inserção no banco de dados.
3. Fazer login com o usuário criado, verificar o recebimento do Token JWT via console/network.
4. Ser redirecionado com sucesso para a tela principal (`index.html`).
