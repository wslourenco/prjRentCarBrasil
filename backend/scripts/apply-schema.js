const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function main() {
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'sislove',
        multipleStatements: true,
    });

    try {
        await conn.query(sql);
        const [rows] = await conn.query("SHOW COLUMNS FROM locacoes LIKE 'antecedente_criminal_arquivo'");
        if (!Array.isArray(rows) || rows.length === 0) {
            throw new Error('Coluna antecedente_criminal_arquivo não encontrada após aplicar schema.');
        }
        console.log('Schema aplicado com sucesso. Coluna antecedente_criminal_arquivo confirmada.');
    } finally {
        await conn.end();
    }
}

main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});
