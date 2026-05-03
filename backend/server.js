const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

const express = require('express');
const cors = require('cors');

// Executa migrations pendentes ao iniciar
(async () => {
    try {
        const pool = require('./db');
        const migDir = path.join(__dirname, 'migrations');
        if (fs.existsSync(migDir)) {
            const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
            for (const file of files) {
                const sql = fs.readFileSync(path.join(migDir, file), 'utf8');
                const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
                for (const stmt of statements) {
                    await pool.query(stmt).catch(err => {
                        console.warn(`[migration] ${file}: ${err.message}`);
                    });
                }
            }
        }
    } catch (err) {
        console.warn('[migration] Erro ao executar migrations:', err.message);
    }
})();

const app = express();

const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'http://127.0.0.1:5176'
];
const configuredOrigins = String(process.env.CORS_ORIGIN || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];
const allowSameHostOrigin = String(process.env.CORS_ALLOW_SAME_HOST || 'true').toLowerCase() !== 'false';

function getOriginHost(origin) {
    try {
        return new URL(origin).host.toLowerCase();
    } catch {
        return '';
    }
}

function getRequestHosts(req) {
    const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim().toLowerCase();
    const directHost = String(req.headers.host || '').trim().toLowerCase();
    return [forwardedHost, directHost].filter(Boolean);
}

// Middlewares globais
app.use(cors((req, callback) => {
    const origin = req.headers.origin;

    const corsOptions = {
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization']
    };

    const allow = () => callback(null, { ...corsOptions, origin: true });

    try {
        // Permite chamadas sem Origin (ex: health checks/server-to-server)
        if (!origin) return allow();
        if (allowedOrigins.includes(origin)) return allow();
        // Permite qualquer porta do localhost ou 127.0.0.1 em desenvolvimento
        if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return allow();

        if (allowSameHostOrigin) {
            const originHost = getOriginHost(origin);
            const requestHosts = getRequestHosts(req);
            if (originHost && requestHosts.includes(originHost)) return allow();
        }

        const corsError = new Error('Origem não permitida pelo CORS');
        corsError.status = 403;
        corsError.code = 'CORS_NOT_ALLOWED';
        return callback(corsError);
    } catch (err) {
        return callback(err);
    }
}));
app.use(express.json({ limit: '20mb' }));

// Rotas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/locadores', require('./routes/locadores'));
app.use('/api/locatarios', require('./routes/locatarios'));
app.use('/api/colaboradores', require('./routes/colaboradores'));
app.use('/api/veiculos', require('./routes/veiculos'));
app.use('/api/financeiro', require('./routes/financeiro'));
app.use('/api/locacoes', require('./routes/locacoes'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/aprovacoes', require('./routes/aprovacoes'));
app.use('/api/configuracoes', require('./routes/configuracoes'));
app.use('/api/pagamentos', require('./routes/pagamentos'));
app.use('/api/debitos', require('./routes/debitos'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Diagnóstico SMTP — sem auth, protegido por chave (remover após teste)
app.get('/api/smtp-ping', async (req, res) => {
    if (req.query.key !== 'rcb-diag-2026') return res.status(403).json({ erro: 'Proibido.' });
    try {
        const nodemailer = require('nodemailer');
        const pool = require('./db');
        const dbInfo = {
            DB_HOST: process.env.DB_HOST || 'não definido',
            DB_NAME: process.env.DB_NAME || 'não definido',
            MYSQLHOST: process.env.MYSQLHOST || 'não definido',
            MYSQLDATABASE: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'não definido',
        };
        // Testa conexão direta ao MySQL
        let dbStatus = 'desconhecido';
        try {
            const [testRows] = await pool.query('SELECT 1 AS ok');
            dbStatus = 'conectado';
        } catch(dbErr) {
            dbStatus = 'erro: ' + dbErr.message;
        }
        const [rows] = await pool.query("SELECT chave,valor FROM configuracoes WHERE chave LIKE 'smtp_%' OR chave='mail_from'");
        const cfg = {};
        rows.forEach(r => cfg[r.chave] = r.valor);
        const host=cfg.smtp_host, user=cfg.smtp_user, pass=String(cfg.smtp_pass||'').replace(/\s+/g,'');
        const port=Number(cfg.smtp_port||587);
        const secure=String(cfg.smtp_secure||'false').toLowerCase()==='true';
        const from=cfg.mail_from||user;
        if (!host||!user||!pass) return res.json({smtp:'não configurado', dbInfo, dbStatus, cfgKeys: Object.keys(cfg)});
        const t=nodemailer.createTransport({host,port,secure,auth:{user,pass},tls:{rejectUnauthorized:false}});
        await t.verify();
        const destino=req.query.to||from;
        const info=await t.sendMail({from,to:destino,subject:'[Diagnóstico Railway] RentCarBrasil',html:'<p>Teste do servidor <strong>Railway</strong>.</p>'});
        res.json({ok:true,messageId:info.messageId,para:destino,host,port,dbInfo,dbStatus});
    } catch(e) {
        res.json({ok:false,erro:e.message,code:e.code});
    }
});

// Servir frontend React
const publicDir = path.join(__dirname, 'public');
app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && (!path.extname(req.path) || req.path.endsWith('.html'))) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});
app.use(express.static(publicDir));

// SPA fallback: rotas não-API servem o index.html
app.get(/^(?!\/api).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(path.join(publicDir, 'index.html'));
});

// Tratamento global de erros
app.use((err, req, res, _next) => {
    const status = Number(err?.status || err?.statusCode) || 500;

    if (err?.code === 'CORS_NOT_ALLOWED') {
        return res.status(403).json({
            erro: `Origem não permitida pelo CORS: ${req.headers.origin || 'desconhecida'}. Configure CORS_ORIGIN no backend para incluir este domínio.`
        });
    }

    if (status >= 500) {
        console.error(err?.stack || err);
        return res.status(500).json({ erro: 'Erro interno no servidor.' });
    }

    return res.status(status).json({ erro: err?.message || 'Erro na requisição.' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`SisLoVe API rodando na porta ${PORT}`);
});

module.exports = app;
