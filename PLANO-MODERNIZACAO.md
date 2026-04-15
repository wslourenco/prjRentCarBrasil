# Plano de Modernização — SisLoVe

> Sistema de gestão de locação de veículos (React 19 + Vite 8 / Express 5 + MySQL)
> Gerado em: 15 de abril de 2026

---

## 1. Objetivo do Plano

Estabilizar, proteger e profissionalizar o SisLoVe — aplicação full-stack React + Node/Express que gerencia locadores, locatários, veículos, locações e financeiro. O plano prioriza: (1) fechar brechas de segurança no backend; (2) estabelecer contratos API claros entre frontend e backend; (3) introduzir testes automatizados; (4) melhorar a experiência de desenvolvimento local; e (5) garantir deploy confiável na Vercel com MySQL remoto.

---

## 2. Premissas Assumidas

| # | Premissa |
|---|----------|
| P1 | O banco de dados MySQL é hospedado externamente (Hostinger ou PlanetScale). Não há plano de migrar de SGBD. |
| P2 | Deploy de produção continua na Vercel (frontend estático + serverless function p/ backend). |
| P3 | Não existe nenhum teste automatizado hoje (confirmado via busca — zero matches para jest/vitest/mocha). |
| P4 | Não há rate limiting, helmet ou qualquer hardening HTTP no backend (confirmado via busca). |
| P5 | O `db.js` possui um array `demoUsers` com hashes embutidos para fallback quando o banco está indisponível — comportamento que deve ser mantido apenas em dev. |
| P6 | O frontend usa `localStorage` para token JWT e dados do usuário; não há refresh token. |
| P7 | Não existe validação de input (schema validation) no backend — apenas checagens manuais parciais. |
| P8 | O módulo `api/index.js` (CommonJS importando ESM) pode causar problemas; o `vercel.json` da raiz redireciona tudo para `backend/server.js`. |
| P9 | O time é pequeno (1-2 devs), portanto cada fase deve ser curta e incremental. |

---

## 3. Plano por Fases

### Fase 0 — Fundação & Segurança (Prioridade Crítica)

**Objetivo:** Fechar os riscos de segurança mais graves e estabilizar o ambiente local.

| # | Tarefa | Detalhes | Critério de Aceite |
|---|--------|----------|--------------------|
| 0.1 | **Instalar e configurar `helmet`** | `npm i helmet` no backend; `app.use(helmet())` antes das rotas. Remove headers que expõem tecnologia. | Response headers não contêm `X-Powered-By`. |
| 0.2 | **Instalar e configurar `express-rate-limit`** | Rate limit global (ex: 100 req/min) + rate limit específico em `/api/auth/login` e `/api/auth/register` (ex: 5 tentativas/min por IP). | Rota de login retorna 429 após 5 chamadas rápidas. |
| 0.3 | **Proteger endpoint de registro** | O `/api/auth/register` está aberto e aceita qualquer perfil `locador`/`locatario` sem aprovação. Avaliar: exigir validação de e-mail ou flag `ativo=0` até aprovação admin. | Novo usuário não acessa dados sensíveis até aprovação (ou e-mail confirmado). |
| 0.4 | **Remover `?debug=1` da rota de login** | `routes/auth.js` L109-113: em `?debug=1` retorna `err.message` e `err.code` ao cliente — vazamento de info. | Nenhum query param altera o corpo de erro em produção. |
| 0.5 | **Isolar `demoUsers` do código de produção** | O fallback em `db.js` que usa credenciais demo hardcoded deve ser desabilitado quando `NODE_ENV=production`. | Em produção, login demo retorna erro de conexão em vez de sucesso falso. |
| 0.6 | **Criar `.env.example`** | Documentar todas as variáveis obrigatórias: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `NODE_ENV`. | Arquivo versionado; `.env` e `.env.local` no `.gitignore`. |
| 0.7 | **Validar `JWT_SECRET` mínimo** | Rejeitar startup se `JWT_SECRET` tiver < 32 caracteres ou estiver vazio em produção. | Server não sobe em prod sem secret forte. |

**Riscos:**
- Mudança no register pode quebrar fluxo de onboarding existente → testar em staging primeiro.
- Rate limit agressivo pode afetar demo com muitos logins simultâneos.

---

### Fase 1 — Validação de Input & Contratos API

**Objetivo:** Garantir integridade de dados e definir contratos claros frontend ↔ backend.

| # | Tarefa | Detalhes | Critério de Aceite |
|---|--------|----------|--------------------|
| 1.1 | **Instalar `zod` no backend** | Criar schemas de validação para cada entidade: `usuarioSchema`, `locadorSchema`, `locatarioSchema`, `veiculoSchema`, `financeiroSchema`, `locacaoSchema`. | Toda rota POST/PUT valida body com zod antes de tocar no banco. |
| 1.2 | **Middleware de validação genérico** | `function validate(schema)` que retorna 400 com erros estruturados `{ erro: string, campos: {...} }`. | Erros de validação retornam HTTP 400 com detalhes por campo. |
| 1.3 | **Documentar contratos API (OpenAPI lite)** | Criar `docs/api-contracts.md` com tabela: rota, método, body esperado, response shape, códigos HTTP. Baseado nos schemas zod. | Documento versionado e consultável pelo time front. |
| 1.4 | **Alinhar mappers frontend** | Revisar `services/mappers.js` — garantir que `toApi()` produz exatamente o shape validado pelo zod backend. | Zero erros de validação ao submeter formulários existentes. |
| 1.5 | **Sanitização de inputs string** | Trim e escape de campos de texto livre (observações, descrições) contra XSS armazenado. | Inputs com `<script>` são gravados como texto plano. |

**Riscos:**
- Schemas muito restritivos podem rejeitar dados legados no banco → migrar dados existentes se necessário.

---

### Fase 2 — Qualidade de Código & DX (Developer Experience)

**Objetivo:** Padronizar código, facilitar manutenção e acelerar ciclo de desenvolvimento.

| # | Tarefa | Detalhes | Critério de Aceite |
|---|--------|----------|--------------------|
| 2.1 | **Configurar Vitest no frontend** | `npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom`. Configurar em `vite.config.js`. | `npm test` roda sem erro (mesmo com 0 testes ainda). |
| 2.2 | **Testes unitários dos mappers** | Testar cada par `toApi`/`fromApi` em `mappers.test.js` — cobrir ida e volta (roundtrip). | ≥ 90% de cobertura em `services/mappers.js`. |
| 2.3 | **Testes de integração das rotas backend** | Usar `supertest` + banco de teste (ou mock de `pool`). Cobrir: auth (login/register), CRUD de locadores, controle de acesso por perfil. | ≥ 1 teste por rota × método; `npm test` no backend passa. |
| 2.4 | **Lint unificado CI** | Garantir que `npm run lint` cobre frontend E backend (o ESLint config atual já faz isso). Adicionar script `"lint:fix"`. | `npm run lint` retorna 0 warnings não-intencionais. |
| 2.5 | **Extrair lógica duplicada de rotas** | As funções `getLocadorIdByUserEmail` e `ensureLocadorContext` estão duplicadas em `veiculos.js`, `financeiro.js` e `locacoes.js` → extrair para `utils/ownership.js`. | Funções importadas de um único lugar; zero duplicação. |
| 2.6 | **Adicionar `prettier`** | Config compartilhada `.prettierrc` para JS/JSX. | `npx prettier --check .` passa sem erros. |

**Riscos:**
- Refatoração de rotas pode introduzir regressão → fazer junto com testes da tarefa 2.3.

---

### Fase 3 — Auth Robusta & Gestão de Sessão

**Objetivo:** Melhorar o ciclo de vida da autenticação e preparar para multi-tenancy seguro.

| # | Tarefa | Detalhes | Critério de Aceite |
|---|--------|----------|--------------------|
| 3.1 | **Implementar refresh token** | Token de acesso curto (15-30 min) + refresh token (httpOnly cookie, 7 dias). Endpoint `/api/auth/refresh`. | Frontend renova token automaticamente sem redirecionar para login. |
| 3.2 | **Rota `/api/auth/me`** | Retorna dados do usuário logado a partir do token. Substituir dependência de `localStorage('sislove_usuario')`. | `AppContext` carrega perfil via API ao montar, não do localStorage. |
| 3.3 | **Logout server-side** | Invalidar refresh token no servidor (blacklist ou tabela `refresh_tokens` no banco). | Após logout, refresh token antigo é rejeitado. |
| 3.4 | **Auditoria de login** | Tabela `audit_log` com: `usuario_id`, `acao`, `ip`, `user_agent`, `timestamp`. Registrar login, logout, falha. | Consulta SQL retorna últimos logins de um usuário. |
| 3.5 | **CSRF protection** | Se refresh token for via cookie, adicionar token CSRF (double submit ou `SameSite=Strict`). | Requisições cross-origin sem cookie CSRF são rejeitadas. |

**Riscos:**
- Migração de JWT simples para refresh token requer coordenação front+back e pode deslogar todos os usuários em deploy → planejar janela de manutenção.

---

### Fase 4 — Frontend: Resiliência & UX

**Objetivo:** Melhorar a experiência do usuário e a robustez do frontend.

| # | Tarefa | Detalhes | Critério de Aceite |
|---|--------|----------|--------------------|
| 4.1 | **Error boundaries globais** | Componente React `ErrorBoundary` que captura erros de renderização e mostra fallback amigável. | Erro em componente filho não derruba a aplicação inteira. |
| 4.2 | **Loading states consistentes** | O `AppContext` tem `carregando` mas nem todas as páginas o utilizam. Padronizar skeleton/spinner. | Toda página mostra indicador de carregamento durante fetch. |
| 4.3 | **Feedback de erro nas ações** | Toast/notificação ao falhar POST/PUT/DELETE (hoje erros podem ser silenciosos). | Usuário vê mensagem de erro/sucesso em toda operação CRUD. |
| 4.4 | **Lazy loading de rotas** | `React.lazy()` + `Suspense` para páginas pesadas (Financeiro, Painel com Recharts). | Bundle initial < 200 KB; chunks carregados sob demanda. |
| 4.5 | **Proteção de rota no Layout** | `Layout.jsx` já redireciona não-logados, mas após token expirado a tela pode piscar. Verificar token validity antes de renderizar. | Sem flash de conteúdo protegido ao perder sessão. |

**Riscos:**
- Lazy loading pode causar flicker em conexões lentas → usar Suspense com fallback adequado.

---

### Fase 5 — Deploy & CI/CD

**Objetivo:** Pipeline automatizado e deploys confiáveis.

| # | Tarefa | Detalhes | Critério de Aceite |
|---|--------|----------|--------------------|
| 5.1 | **Resolver conflito `api/index.js` vs `vercel.json`** | O `api/index.js` faz `import app from '../backend/server.js'` (ESM) mas o backend é CommonJS. Unificar: ou usar `require()` ou converter backend para ESM. O `vercel.json` raiz aponta tudo para `backend/server.js` diretamente, tornando `api/index.js` redundante. Simplificar. | Deploy na Vercel sobe com zero erros; rotas `/api/*` funcionam. |
| 5.2 | **GitHub Actions CI** | Workflow: `lint → test:frontend → test:backend → build`. Rodar em push para `main` e PRs. | PR com lint error ou teste falhando é bloqueada. |
| 5.3 | **Preview deployments** | Habilitar preview automático na Vercel para cada PR. | Cada PR tem URL de preview funcional. |
| 5.4 | **Health check em produção** | Monitorar `/api/health` com UptimeRobot ou similar. Alertar se down > 2 min. | Alerta chega por email/Slack em caso de downtime. |
| 5.5 | **Variáveis de ambiente por estágio** | Separar env vars de Vercel em `Production` vs `Preview`. JWT_SECRET diferente por ambiente. | Cada ambiente tem suas próprias credenciais. |

**Riscos:**
- Conflito ESM/CJS no `api/index.js` é o bloqueador mais provável de deploy — resolver primeiro.

---

## 4. Ordem Recomendada de Execução (Checklist)

```
Fase 0 — Segurança (estimativa: imediato, tarefas independentes)
  [  ] 0.4 Remover ?debug=1 do login
  [  ] 0.5 Isolar demoUsers em produção
  [  ] 0.6 Criar .env.example
  [  ] 0.7 Validar JWT_SECRET mínimo
  [  ] 0.1 Instalar helmet
  [  ] 0.2 Instalar express-rate-limit
  [  ] 0.3 Proteger endpoint de registro

Fase 1 — Contratos API
  [  ] 1.1 Instalar zod + criar schemas
  [  ] 1.2 Middleware de validação genérico
  [  ] 1.5 Sanitização de inputs
  [  ] 1.4 Alinhar mappers frontend
  [  ] 1.3 Documentar contratos API

Fase 2 — Qualidade de Código
  [  ] 2.5 Extrair lógica duplicada
  [  ] 2.1 Configurar Vitest
  [  ] 2.2 Testes unitários mappers
  [  ] 2.3 Testes integração backend
  [  ] 2.6 Configurar prettier
  [  ] 2.4 Lint CI

Fase 3 — Auth Robusta
  [  ] 3.2 Rota /api/auth/me
  [  ] 3.1 Refresh token
  [  ] 3.3 Logout server-side
  [  ] 3.5 CSRF protection
  [  ] 3.4 Auditoria de login

Fase 4 — Frontend UX
  [  ] 4.1 Error boundaries
  [  ] 4.2 Loading states
  [  ] 4.3 Feedback de erro (toasts)
  [  ] 4.5 Proteção de rota sem flash
  [  ] 4.4 Lazy loading

Fase 5 — Deploy & CI/CD
  [  ] 5.1 Resolver conflito ESM/CJS no api/index.js
  [  ] 5.5 Variáveis de ambiente por estágio
  [  ] 5.2 GitHub Actions CI
  [  ] 5.3 Preview deployments
  [  ] 5.4 Health check produção
```

> **Nota:** Fases 0 e 1 são pré-requisito para todas as demais. Fases 2-4 podem correr em paralelo. Fase 5 deve começar junto com a Fase 2.

---

## 5. Dependências e Bloqueadores Potenciais

| Bloqueador | Impacto | Mitigação |
|-----------|---------|-----------|
| `api/index.js` importa CommonJS como ESM | Deploy Vercel pode falhar | Tarefa 5.1 — resolver antes de qualquer outro deploy |
| Banco MySQL indisponível localmente | Dev sem banco fica preso em fallback demo | Criar docker-compose.yml com MySQL local, ou usar serviço free (PlanetScale/Aiven) para dev |
| Nenhum teste existente | Qualquer refatoração é arriscada | Fase 2 deve começar o mais cedo possível, em paralelo com Fase 1 |
| `demoUsers` com hashes fixos no código-fonte | Credenciais previsíveis em produção | Tarefa 0.5 — prioridade máxima |
| Token JWT sem refresh | Sessão expira e UX degrada | Fase 3 resolve, mas depende de Fase 0 e 1 |
| Duplicação de `getLocadorIdByUserEmail` em 3 rotas | Manutenção propensa a erro | Tarefa 2.5 — baixo risco, alto valor |

---

## 6. Métricas de Sucesso

| Métrica | Valor Alvo | Como Medir |
|---------|-----------|------------|
| Vulnerabilidades de segurança críticas | 0 | Checklist Fase 0 completo |
| Cobertura de testes (frontend) | ≥ 60% nos services | `vitest --coverage` |
| Cobertura de testes (backend) | ≥ 1 teste por rota | `npm test` no backend |
| Lint warnings | 0 | `npm run lint` exit code 0 |
| Tempo de build frontend | < 30s | `npm run build` |
| Tamanho do bundle inicial | < 200 KB gzip | Vite build report |
| Uptime produção | ≥ 99.5% | Health check monitoring |
| Tempo de resposta API p95 | < 500ms | Logs Vercel / monitoring |
| Rotas API sem validação de input | 0 | Auditoria pós-Fase 1 |
| Código duplicado entre rotas | 0 instâncias | Grep por funções extraídas |

---

## Incertezas Explícitas

1. **Fallback completo do `db.js`**: Li apenas parte do arquivo; o mecanismo exato de fallback para `demoUsers` precisa ser revisado na íntegra para entender em quais cenários ele ativa.
2. **Páginas `Dashboard.jsx`, `Painel.jsx`, `Veiculos.jsx`**: Não li o conteúdo completo — podem haver chamadas API diretas fora do `AppContext` que precisarão de ajuste.
3. **Volume de dados em produção**: Não há informação sobre quantidade de registros — queries sem paginação (`SELECT *`) podem ser um problema de performance não coberto neste plano.
4. **Gestão de uploads**: `veiculos.foto` e `despesas_receitas.comprovante` são VARCHAR — não está claro se há upload de arquivos implementado ou apenas campos de texto.
5. **Versão exata do Node na Vercel**: Pode afetar compatibilidade com Express 5 (que requer Node ≥ 18).
