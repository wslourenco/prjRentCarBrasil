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

        console.log('4. Garantindo coluna locador_id em despesas_receitas...');
        const [locadorIdColumn] = await conn.execute("SHOW COLUMNS FROM despesas_receitas LIKE 'locador_id'");
        if (!Array.isArray(locadorIdColumn) || locadorIdColumn.length === 0) {
            await conn.execute(`
                ALTER TABLE despesas_receitas
                    ADD COLUMN locador_id INT UNSIGNED NULL AFTER colaborador_id,
                    ADD INDEX idx_despesas_receitas_locador_id (locador_id),
                    ADD CONSTRAINT fk_dr_locador FOREIGN KEY (locador_id) REFERENCES locadores(id) ON DELETE SET NULL
            `);
            console.log('   ✓ Coluna locador_id adicionada');
        } else {
            console.log('   ✓ Coluna locador_id já existe');
        }

        await conn.execute(`
            UPDATE despesas_receitas dr
            LEFT JOIN veiculos v ON v.id = dr.veiculo_id
            SET dr.locador_id = v.locador_id
            WHERE dr.locador_id IS NULL
              AND v.locador_id IS NOT NULL
        `);
        console.log('   ✓ Backfill de locador_id concluído\n');

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
