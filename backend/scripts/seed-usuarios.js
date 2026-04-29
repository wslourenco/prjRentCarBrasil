/**
 * Garante que os usuários padrão existam no banco de dados.
 * Uso: node backend/scripts/seed-usuarios.js
 *
 * Variáveis de ambiente necessárias (ou configure backend/.env):
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const usuariosPadrao = [
    {
        nome: 'Administrador',
        email: 'admin@rentcarbrasil.com.br',
        senha_hash: '$2b$10$JoAN9u6AzGI4vD7ikmTsJuGyDQ1oZkhIyo7RkWUoPLWZbhwuUyWa6',
        perfil: 'admin',
        tipo_documento: 'cpf',
        documento: '11122233344',
    },
    {
        nome: 'Locador Demo',
        email: 'locador@rentcarbrasil.com.br',
        senha_hash: '$2b$10$qZUFMmLRPJvplePl5Rmo6urlxA7ck0cxs4TyN0oQG3OCTZ6GgrhfO',
        perfil: 'locador',
        tipo_documento: 'cpf',
        documento: '22233344455',
    },
    {
        nome: 'Locatário Demo',
        email: 'locatario@rentcarbrasil.com.br',
        senha_hash: '$2b$10$ch1Fi5BwQHKSQrn5LRQHC.1Xhq5Wvja4r7k0n115e8VuRMr45WEgu',
        perfil: 'locatario',
        tipo_documento: 'cpf',
        documento: '33344455566',
    },
];

async function seedUsuarios() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'sislove',
    });

    try {
        console.log('Inserindo usuários padrão...\n');

        for (const u of usuariosPadrao) {
            const [result] = await conn.execute(
                `INSERT INTO usuarios (nome, email, senha_hash, perfil, tipo_documento, documento)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE id = id`,
                [u.nome, u.email, u.senha_hash, u.perfil, u.tipo_documento, u.documento]
            );

            const status = result.affectedRows === 1 ? '✓ inserido' : '• já existia';
            console.log(`   ${status}: ${u.email} (${u.perfil})`);
        }

        console.log('\n✅ Seed de usuários concluído!');
        console.log('\nCredenciais padrão:');
        console.log('   admin@rentcarbrasil.com.br    / admin123');
        console.log('   locador@rentcarbrasil.com.br  / locador123');
        console.log('   locatario@rentcarbrasil.com.br / locatario123');
    } catch (err) {
        console.error('❌ Erro ao inserir usuários:', err.message);
        process.exit(1);
    } finally {
        await conn.end();
    }
}

seedUsuarios();
