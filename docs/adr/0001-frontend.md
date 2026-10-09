
# ADR 0001: adotar HTML, CSS e JavaScript no frontend

**Status:** proposto

**Contexto:** O sistema de Help Desk precisa de uma interface web para que funcionários, técnicos e administradores possam acessar suas funcionalidades. O frontend deve permitir a navegação entre páginas, o preenchimento de formulários e a interação com o sistema. A equipe precisa definir as tecnologias utilizadas na construção da interface, considerando o tempo de desenvolvimento e a manutenção do projeto.

**Decisão:** Adotar HTML, CSS e JavaScript nativos para desenvolver a interface web do sistema, sem utilizar frameworks de frontend.

**Alternativas consideradas:**
- React: alternativa baseada em componentes, mas acrescentaria ferramentas e dependências ao projeto.
- Vue.js: alternativa para construção de interfaces reativas, mas exigiria a adoção de um framework e de suas convenções.

**Consequências:**
- Positivas: desenvolvimento sem dependência de frameworks, menor complexidade inicial e controle direto sobre a estrutura e o comportamento das páginas.
- Negativas: maior necessidade de manipulação manual do DOM, possível repetição de código e maior esforço para organizar interfaces complexas conforme o sistema crescer.
