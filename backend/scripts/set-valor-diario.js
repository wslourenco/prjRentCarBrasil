// Script para adicionar coluna valor_diario e definir 100.00 para todos os veículos
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'sislove',
    });

    // Adiciona coluna se não existir
    const [cols] = await pool.query(
        'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        ['veiculos', 'valor_diario']
    );

    if (cols.length === 0) {
        await pool.query('ALTER TABLE veiculos ADD COLUMN valor_diario DECIMAL(10,2) AFTER nr_bloqueador');
        console.log('Coluna valor_diario criada.');
    } else {
        console.log('Coluna valor_diario ja existe.');
    }

    const [r] = await pool.query('UPDATE veiculos SET valor_diario = 100.00');
    console.log('Linhas atualizadas:', r.affectedRows);

    await pool.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
