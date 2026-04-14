const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sislove',
    waitForConnections: true,
    connectionLimit: 10,
    timezone: '-03:00',
});

// Testa conexão na inicialização
pool.getConnection()
    .then(conn => {
        console.log('✅ MySQL conectado com sucesso');
        conn.release();
    })
    .catch(err => {
        console.error('❌ Erro ao conectar no MySQL:', err.message);
        // Em produção serverless, não finalizar o processo para permitir respostas de diagnóstico.
    });

module.exports = pool;
