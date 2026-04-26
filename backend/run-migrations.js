const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigrations() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'sislove',
    });

    try {
        console.log('Executando migrations...\n');

        // Migration 1: Criar tabela configuracoes
        console.log('1. Criando tabela configuracoes...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS configuracoes (
                id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                chave             VARCHAR(120) NOT NULL UNIQUE COMMENT 'Identificador único da config',
                valor             TEXT COMMENT 'Valor da configuração',
                tipo              ENUM('texto','numero','booleano','json') DEFAULT 'texto',
                descricao         VARCHAR(255),
                criado_em         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                atualizado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✓ Tabela configuracoes criada/verificada\n');

        // Migration 2: Inserir configurações SMTP iniciais
        console.log('2. Inserindo configurações SMTP iniciais...');
        const configs = [
            ['smtp_host', 'smtp.gmail.com', 'texto', 'Host do servidor SMTP'],
            ['smtp_port', '587', 'numero', 'Porta do servidor SMTP'],
            ['smtp_secure', 'false', 'booleano', 'Usar conexão segura (TLS/SSL)'],
            ['smtp_user', '', 'texto', 'Usuário/email para autenticação SMTP'],
            ['smtp_pass', '', 'texto', 'Senha para autenticação SMTP'],
            ['mail_from', 'noreply@sislove.com', 'texto', 'Endereço de email padrão para envios'],
        ];

        for (const [chave, valor, tipo, descricao] of configs) {
            await conn.execute(`
                INSERT IGNORE INTO configuracoes (chave, valor, tipo, descricao)
                VALUES (?, ?, ?, ?)
            `, [chave, valor, tipo, descricao]);
            console.log(`   ✓ ${chave}`);
        }
        console.log();

        // Verificar configurações
        console.log('3. Verificando configurações inseridas:');
        const [rows] = await conn.execute(`
            SELECT chave, valor, tipo FROM configuracoes ORDER BY chave
        `);
        rows.forEach(row => {
            console.log(`   • ${row.chave}: ${row.valor || '(vazio)'} [${row.tipo}]`);
        });
        console.log();

        console.log('✅ Todas as migrations executadas com sucesso!\n');
        console.log('Próximo passo: Configure o SMTP em http://localhost:5174/admin/configuracoes');

    } catch (err) {
        console.error('❌ Erro ao executar migrations:', err);
        process.exit(1);
    } finally {
        await conn.end();
    }
}

runMigrations();
