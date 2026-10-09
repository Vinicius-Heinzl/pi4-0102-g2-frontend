# ADR 0002: Organizar o frontend em páginas HTML independentes.

*Status:* proposto

*Contexto:* O sistema de Help Desk possui diferentes telas, incluindo página inicial, login e cadastro de usuários. Essas funcionalidades precisam ser acessadas por meio de uma interface web organizada e de fácil manutenção. A equipe precisa definir como estruturar a navegação e distribuir os arquivos responsáveis pela apresentação e pelo comportamento das páginas.

*Decisão:* Organizar o frontend em páginas HTML independentes, utilizando arquivos separados para a página inicial, login e cadastro, com estilos CSS e scripts JavaScript armazenados em diretórios próprios.

*Alternativas consideradas:*
•⁠  ⁠Single Page Application (SPA): alternativa que centralizaria a navegação em uma única aplicação, mas exigiria maior controle das rotas e da atualização dinâmica das telas.
•⁠  ⁠Concentrar toda a interface em um único arquivo HTML: alternativa não escolhida por dificultar a organização e a manutenção das diferentes telas.

*Consequências:*
•⁠  ⁠Positivas: separação das telas por responsabilidade, organização dos arquivos e facilidade para localizar e modificar funcionalidades específicas.
•⁠  ⁠Negativas: navegação entre páginas pode exigir novos carregamentos, elementos compartilhados podem precisar ser repetidos e alterações visuais comuns podem demandar manutenção em vários arquivos.
