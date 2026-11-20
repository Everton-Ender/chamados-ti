# HelpDesk TI

Sistema de gerenciamento de chamados de suporte técnico, desenvolvido como projeto acadêmico.

## Tecnologias utilizadas

- Node.js
- Express
- EJS
- Firebase Authentication
- Cloud Firestore
- HTML, CSS e JavaScript

## Funcionalidades

- Cadastro e autenticação de usuários.
- Login com e-mail e senha ou Google.
- Gerenciamento de sessões com cookies.
- Controle de acesso baseado em funções (RBAC).
- Abertura e consulta de chamados.
- Edição e atualização de chamados conforme as permissões.
- Comentários nos chamados.
- Gerenciamento de categorias.
- Gerenciamento de técnicos.
- Dashboard com indicadores e estatísticas.

## Níveis de acesso

| Perfil | Permissões |
|---|---|
| Usuário (`user`) | Consultar, abrir chamados e adicionar comentários. |
| Técnico (`technician`) | Permissões de usuário e edição/atualização de chamados. |
| Administrador (`admin`) | Acesso completo, incluindo gerenciamento de técnicos, categorias e exclusão de chamados. |

## Requisitos

- Node.js 20 ou 22.
- npm.
- Projeto configurado no Firebase.
- Firebase Authentication habilitado.
- Cloud Firestore criado.

## Instalação

1. Clone o repositório:

```bash
git clone https://github.com/Everton-Ender/chamados-ti.git
```

2. Entre na pasta:

```bash
cd chamados-ti
```

3. Instale as dependências:

```bash
npm install
```

4. Configure as credenciais do Firebase:
   - Coloque o arquivo `firebase-service-account.json` na raiz do projeto.
   - Configure os dados do Firebase Web em `public/js/firebase-client.js`.

5. Inicie o sistema:

```bash
npm start
```

6. Acesse no navegador:

```text
http://localhost:3000
```

## Banco de dados

O sistema utiliza o Cloud Firestore para armazenar:

- Usuários.
- Chamados.
- Categorias.
- Técnicos.
- Comentários.
- Contadores de identificadores.

## Segurança

- Autenticação realizada pelo Firebase Authentication.
- Sessões gerenciadas por cookies HTTP-only.
- Verificação de permissões por perfil de usuário.
- Credenciais administrativas protegidas e excluídas do Git por meio do `.gitignore`.

**Importante:** o arquivo `firebase-service-account.json` não deve ser enviado ao repositório.

## Autor

Desenvolvido por Everton-Ender como atividade acadêmica de desenvolvimento de sistemas.