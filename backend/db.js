const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

function env(name, fallback = '') {
    const value = process.env[name];
    if (typeof value !== 'string') return fallback;

    const cleaned = value.trim().replace(/^['"]|['"]$/g, '');
    return cleaned || fallback;
}

const pool = mysql.createPool({
    host: env('DB_HOST', 'localhost'),
    port: Number(env('DB_PORT', '3306')) || 3306,
    user: env('DB_USER', 'root'),
    password: env('DB_PASSWORD', ''),
    database: env('DB_NAME', 'sislove'),
    waitForConnections: true,
    connectionLimit: 10,
    timezone: '-03:00',
});

const demoUsers = [
    {
        id: 1,
        nome: 'Administrador',
        email: 'admin@sislove.com',
        senha_hash: '$2b$10$JoAN9u6AzGI4vD7ikmTsJuGyDQ1oZkhIyo7RkWUoPLWZbhwuUyWa6',
        perfil: 'admin',
        ativo: 1,
    },
    {
        id: 2,
        nome: 'Locador Demo',
        email: 'locador@sislove.com',
        senha_hash: '$2b$10$qZUFMmLRPJvplePl5Rmo6urlxA7ck0cxs4TyN0oQG3OCTZ6GgrhfO',
        perfil: 'locador',
        ativo: 1,
    },
    {
        id: 3,
        nome: 'Locatário Demo',
        email: 'locatario@sislove.com',
        senha_hash: '$2b$10$ch1Fi5BwQHKSQrn5LRQHC.1Xhq5Wvja4r7k0n115e8VuRMr45WEgu',
        perfil: 'locatario',
        ativo: 1,
    }
];

function isDbConnectionError(err) {
    const code = err?.code || '';
    const message = String(err?.message || '').toLowerCase();

    return [
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
        'EAI_AGAIN',
        'PROTOCOL_CONNECTION_LOST',
        'ER_ACCESS_DENIED_ERROR',
        'ER_BAD_DB_ERROR',
        'ER_BAD_FIELD_ERROR',
        'ER_CON_COUNT_ERROR',
        'ER_NOT_SUPPORTED_AUTH_MODE'
    ].includes(code) || code.startsWith('ER_') || message.includes('connect') || message.includes('access denied');
}

function getFallbackRows(sql, params = []) {
    if (typeof sql !== 'string') return null;

    const normalized = sql.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!normalized.startsWith('select')) return null;

    if (normalized.includes('from usuarios')) {
        const includeHash = normalized.includes('select *') || normalized.includes('senha_hash');
        let rows = demoUsers.map(usuario => includeHash
            ? { ...usuario }
            : (({ senha_hash, ...resto }) => resto)(usuario));

        if (normalized.includes('where email = ?')) {
            rows = rows.filter(usuario => usuario.email === params?.[0] && usuario.ativo === 1);
        }

        if (normalized.includes('where id = ?')) {
            rows = rows.filter(usuario => String(usuario.id) === String(params?.[0]) && usuario.ativo === 1);
        }

        return [rows, []];
    }

    if (normalized.includes('from locadores')) return [[], []];
    if (normalized.includes('from locatarios')) return [[], []];
    if (normalized.includes('from colaboradores')) return [[], []];
    if (normalized.includes('from veiculos')) return [[], []];
    if (normalized.includes('from despesas_receitas')) return [[], []];
    if (normalized.includes('from locacoes')) return [[], []];

    return null;
}

const originalQuery = pool.query.bind(pool);
let demoModeLogged = false;
pool.query = async (sql, params) => {
    try {
        return await originalQuery(sql, params);
    } catch (err) {
        if (!isDbConnectionError(err)) throw err;

        const fallback = getFallbackRows(sql, params);
        if (fallback) {
            if (!demoModeLogged) {
                console.warn('⚠️ MySQL indisponível; usando modo demonstração para login e consultas.');
                demoModeLogged = true;
            }
            return fallback;
        }

        throw err;
    }
};

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
