# prjSisLoVe

Sistema para locação de veículos, com frontend em React (Vite) e backend em Node.js/Express com MySQL.

## Visão geral

- Frontend: React + Vite
- Backend: Node.js + Express
- Banco de dados: MySQL
- API base (dev): http://localhost:3001/api
- Frontend (dev): http://localhost:5173

## Pré-requisitos

- Node.js 18+
- npm 9+
- MySQL 8+

## Estrutura do projeto

- Raiz: aplicação frontend (Vite)
- backend: API Express e arquivos SQL

## Configuração do banco de dados

1. Crie o banco e tabelas com o script:

	mysql -u root -p < backend/schema.sql

2. Opcional: rode seeds adicionais, se necessário:

	mysql -u root -p sislove < backend/seed.sql

## Variáveis de ambiente (backend)

Crie o arquivo backend/.env com os valores abaixo:

PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=sislove
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=troque_esta_chave
JWT_EXPIRES_IN=8h
CORS_ALLOW_SAME_HOST=true

Observações:

- O backend usa backend/.env para configuração do servidor.
- O acesso ao MySQL usa defaults caso alguma variável não exista, mas é recomendado definir todas.
- `CORS_ORIGIN` aceita múltiplos domínios separados por vírgula.
- `CORS_ALLOW_SAME_HOST=true` permite automaticamente a origem que tiver o mesmo host da requisição (útil em produção com domínio próprio).
- Quando uma origem não é permitida, a API retorna `403` com mensagem clara de CORS (em vez de erro interno genérico).

## Instalação

1. Instale dependências do frontend (na raiz):

	npm install

2. Instale dependências do backend:

	cd backend
	npm install

## Executar em desenvolvimento

### Opção 1: usar o atalho do Windows

Na raiz do projeto, execute:

iniciar.bat

Isso abre dois terminais:

- Backend em http://localhost:3001
- Frontend em http://localhost:5173

### Opção 2: executar manualmente

Terminal 1 (backend):

cd backend
npm run dev

Terminal 2 (frontend):

npm run dev

## Build para produção

Na raiz:

npm run build

O frontend será gerado em dist.

Para usar o backend servindo o frontend estático:

1. Copie os arquivos de dist para backend/public
2. Inicie o backend:

	cd backend
	npm start

## Endpoints úteis

- Health check: http://localhost:3001/api/health

## Credenciais iniciais (seed do schema)

- admin@sislove.com / admin123
- locador@sislove.com / locador123
- locatario@sislove.com / locatario123

## Scripts disponíveis

Na raiz:

- npm run dev: sobe frontend em modo desenvolvimento
- npm run build: gera build do frontend
- npm run preview: pré-visualiza build do frontend
- npm run lint: executa lint

No backend:

- npm run dev: sobe API com nodemon
- npm start: sobe API com node
