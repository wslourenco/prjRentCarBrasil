# 📧 Sistema de Configuração SMTP do SisLoVe

## 🎯 Visão Geral

O sistema agora busca as configurações de SMTP do **banco de dados** ao invés de variáveis de ambiente. Isto permite que o administrador configure SMTP dinamicamente sem necessidade de reiniciar o servidor ou modificar arquivos `.env`.

## 📁 Arquivos Modificados

### 1. **backend/schema.sql**
- Adicionada tabela `configuracoes` para armazenar settings do sistema
- Suporta tipos: `texto`, `numero`, `booleano`, `json`

### 2. **backend/routes/configuracoes.js**
- Nova rota para gerenciar configurações via API
- Endpoints:
  - `GET /api/configuracoes/smtp/status` - Verificar status do SMTP
  - `PUT /api/configuracoes/smtp` - Atualizar configurações SMTP
  - `PUT /api/configuracoes/smtp/testar` - Testar conexão SMTP
  - `GET /api/configuracoes/:chave` - Obter configuração específica
  - `PUT /api/configuracoes/:chave` - Atualizar configuração específica

### 3. **backend/routes/locacoes.js**
- Função `criarTransporter()` agora é assíncrona
- Busca configurações do banco de dados em vez do `.env`
- Fallback para variáveis de ambiente se não encontrar no banco

### 4. **backend/run-migrations.js**
- Script para criar tabelas e popular configurações iniciais
- Já foi executado com sucesso

## 🔧 Como Usar

### 1️⃣ Verificar Status do SMTP

```bash
curl -X GET http://localhost:3001/api/configuracoes/smtp/status \
  -H "Authorization: Bearer <token>"
```

**Resposta:**
```json
{
  "configurado": false,
  "faltantes": ["smtp_user", "smtp_pass"],
  "smtp": {
    "smtp_host": "smtp.gmail.com",
    "smtp_port": "587",
    "smtp_secure": "false",
    "smtp_user": "",
    "smtp_pass_configurado": false,
    "mail_from": "noreply@sislove.com"
  }
}
```

### 2️⃣ Configurar SMTP

```bash
curl -X PUT http://localhost:3001/api/configuracoes/smtp \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_user": "seu-email@gmail.com",
    "smtp_pass": "sua-senha-app",
    "smtp_secure": false,
    "mail_from": "seu-email@gmail.com"
  }'
```

**Resposta:**
```json
{
  "mensagem": "Configuração SMTP salva com sucesso.",
  "configurado": true,
  "faltantes": [],
  "smtp": {
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_secure": false,
    "smtp_user": "seu-email@gmail.com",
    "mail_from": "seu-email@gmail.com"
  }
}
```

### 3️⃣ Testar Conexão SMTP

```bash
curl -X PUT http://localhost:3001/api/configuracoes/smtp/testar \
  -H "Authorization: Bearer <token>"
```

**Resposta (sucesso):**
```json
{
  "sucesso": true,
  "mensagem": "Conexão SMTP testada com sucesso!"
}
```

**Resposta (erro):**
```json
{
  "erro": "Erro na conexão SMTP: Invalid login: 535 5.7.0 Invalid credentials"
}
```

### 4️⃣ Obter Configuração Específica

```bash
curl -X GET http://localhost:3001/api/configuracoes/smtp_host \
  -H "Authorization: Bearer <token>"
```

**Resposta:**
```json
{
  "id": 1,
  "chave": "smtp_host",
  "valor": "smtp.gmail.com",
  "tipo": "texto",
  "descricao": "Host do servidor SMTP"
}
```

## 🔐 Autenticação e Permissões

- **GET** endpoints: Qualquer usuário autenticado pode visualizar
- **PUT/POST/DELETE** endpoints: Apenas administradores (`admin`) podem modificar

## 📊 Estrutura da Tabela

```sql
CREATE TABLE configuracoes (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  chave             VARCHAR(120) NOT NULL UNIQUE,
  valor             TEXT,
  tipo              ENUM('texto','numero','booleano','json') DEFAULT 'texto',
  descricao         VARCHAR(255),
  criado_em         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 🚀 Providers SMTP Recomendados

### Gmail
```json
{
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587,
  "smtp_secure": false,
  "smtp_user": "seu-email@gmail.com",
  "smtp_pass": "sua-senha-app"
}
```

### SendGrid
```json
{
  "smtp_host": "smtp.sendgrid.net",
  "smtp_port": 587,
  "smtp_secure": false,
  "smtp_user": "apikey",
  "smtp_pass": "SG.xxxxxxxxxxxxx"
}
```

### Brevo (ex-Sendinblue)
```json
{
  "smtp_host": "smtp-relay.brevo.com",
  "smtp_port": 587,
  "smtp_secure": false,
  "smtp_user": "seu-email@email.com",
  "smtp_pass": "sua-chave-smtp"
}
```

## 💾 Fallback para .env

Se a configuração não for encontrada no banco de dados, o sistema ainda tenta usar variáveis de ambiente:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_SECURE`
- `MAIL_FROM`

## 🔄 Cache

As configurações são cacheadas em memória por **5 minutos** para reduzir consultas ao banco. Quando uma configuração é atualizada, o cache é automaticamente limpo.

## 📝 Notas Importantes

1. **Senha SMTP**: Nunca é retornada pela API. Apenas um booleano `smtp_pass_configurado` indica se foi definida.
2. **Email do Locador**: O sistema tenta enviar uma cópia do contrato para o email do locador se disponível.
3. **TEST_MODE**: Pode ser definido em `.env` para simular envio de emails sem SMTP real.
