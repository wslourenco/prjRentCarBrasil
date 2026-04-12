require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middlewares globais
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
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
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// SPA fallback: rotas não-API servem o index.html
app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

// Tratamento global de erros
app.use((err, req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ erro: 'Erro interno no servidor.' });
});

const PORT = process.env.PORT || 3001;

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`SisLoVe API rodando na porta ${PORT}`);
    });
}

module.exports = app;
