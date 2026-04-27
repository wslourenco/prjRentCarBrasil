import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;
const TARGET_BASE = process.env.TARGET_BASE || 'https://prjrentcarbrasil-production.up.railway.app';

app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', proxy: true });
});

app.use('/api', async (req, res) => {
    const targetUrl = `${TARGET_BASE}${req.originalUrl}`;

    const headers = { ...req.headers };
    delete headers.host;
    delete headers.origin;
    delete headers['content-length'];

    try {
        const upstream = await fetch(targetUrl, {
            method: req.method,
            headers,
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body)
        });

        const contentType = upstream.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        const text = await upstream.text();
        return res.status(upstream.status).send(text);
    } catch (error) {
        return res.status(502).json({ erro: 'Falha no proxy da API.', detalhe: error?.message || String(error) });
    }
});

app.listen(PORT, () => {
    console.log(`Proxy API rodando na porta ${PORT}`);
});
