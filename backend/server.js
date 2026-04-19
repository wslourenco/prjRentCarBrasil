const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

const express = require('express');
const cors = require('cors');

const app = express();

const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'http://127.0.0.1:5176',
    'https://prjsislove-web.vercel.app'
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
        if (/^https:\/\/.*\.vercel\.app$/i.test(origin)) return allow();
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
app.use(express.json());

// Rotas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/locadores', require('./routes/locadores'));
app.use('/api/locatarios', require('./routes/locatarios'));
app.use('/api/colaboradores', require('./routes/colaboradores'));
app.use('/api/veiculos', require('./routes/veiculos'));
app.use('/api/financeiro', require('./routes/financeiro'));
app.use('/api/locacoes', require('./routes/locacoes'));
app.use('/api/usuarios', require('./routes/usuarios'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Servir frontend React (produção)
// No Vercel, preferimos o build atual em dist para evitar artefatos estáticos antigos.
const distDir = path.join(__dirname, '..', 'dist');
const legacyPublicDir = path.join(__dirname, 'public');
const publicDir = process.env.VERCEL ? distDir : legacyPublicDir;
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

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`SisLoVe API rodando na porta ${PORT}`);
    });
}

module.exports = app;
