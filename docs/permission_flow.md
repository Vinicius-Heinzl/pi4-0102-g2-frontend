# Fluxo de Permissoes e Papeis de Usuario

Este documento descreve o modelo de permissoes do sistema HelpDesk e o fluxo de criacao de contas por tipo de usuario.

---

## 1. Papeis Existentes

O sistema possui 3 papeis (roles) de usuario, armazenados na coluna `role` da tabela `users`:

| Role | Nome no Sistema | Descricao |
|:---|:---|:---|
| `admin` | Administrador | Gestor de TI. Acesso total ao sistema, gerencia usuarios e permissoes. |
| `tecnico` | Tecnico / Suporte | Funcionario de infraestrutura. Atende chamados, altera status, recebe atribuicoes. |
| `usuario` | Usuario / Cliente | Colaborador comum. Abre chamados e acompanha o andamento dos seus proprios. |

---

## 2. Fluxo de Criacao de Contas

### 2.1. Administrador (admin)

- A primeira conta de administrador sera criada diretamente no banco de dados (seed) quando o sistema for implantado pela primeira vez.
- Futuramente, um administrador existente podera criar outros administradores pelo painel de gerenciamento.

### 2.2. Tecnico / Suporte (tecnico)

- Quando um novo funcionario de infraestrutura for contratado, o **administrador** cria a conta dele pelo painel administrativo, ja atribuindo o papel `tecnico`.
- O tecnico recebe suas credenciais (e-mail e senha temporaria) e faz login normalmente.

### 2.3. Usuario / Cliente (usuario)

- Qualquer colaborador da empresa pode se registrar pela pagina publica de cadastro (`register.html`).
- Todas as contas criadas pelo formulario publico recebem automaticamente o papel `usuario`.
- O usuario nao pode alterar seu proprio papel.

---

## 3. Fluxo Futuro de Gerenciamento de Permissoes

> **Status: A IMPLEMENTAR**

O painel de gerenciamento de usuarios deve permitir que o administrador:

1. **Listar todos os usuarios** do sistema com seus papeis atuais.
2. **Promover um usuario** para `tecnico` ou `admin`.
3. **Rebaixar um tecnico** de volta para `usuario`.
4. **Desativar contas** de usuarios que sairam da empresa (sem deletar, apenas inativar).
5. **Resetar senha** de qualquer usuario.

### Endpoint sugerido (futuro)

| Metodo | Rota | Descricao |
|:---|:---|:---|
| `PUT` | `/api/users/{id}/role` | Altera o papel de um usuario. Apenas admin. |
| `PUT` | `/api/users/{id}/status` | Ativa/desativa um usuario. Apenas admin. |
| `PUT` | `/api/users/{id}/reset-password` | Gera senha temporaria. Apenas admin. |

### Regras de Negocio

- Apenas usuarios com papel `admin` podem acessar rotas de gerenciamento.
- Um admin nao pode rebaixar a si mesmo (para evitar ficar sem admin no sistema).
- A validacao de permissao deve ser feita tanto no frontend (esconder opcoes) quanto no backend (validar token e role no handler).

---

## 4. Resumo Visual

```
Registro Publico (register.html)
    |
    v
  [usuario]  <--- papel padrao
    |
    | (admin promove)
    v
  [tecnico]
    |
    | (admin promove)
    v
  [admin]
```
