const express = require('express');
const router = express.Router();
const axios = require('axios');
const { randomUUID } = require('crypto');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

const CELCOIN_BASE = process.env.CELCOIN_ENV === 'production'
    ? 'https://api.openfinance.celcoin.com.br'
    : 'https://sandbox.openfinance.celcoin.dev';

const DEBITS_API = `${CELCOIN_BASE}/vehicledebtsapi/v1`;
const CACHE_TTL_MINUTES = 60;
const PROCESSING_TIMEOUT_MINUTES = 10;

async function getCelcoinToken() {
    const clientId = process.env.CELCOIN_CLIENT_ID || '';
    const clientSecret = process.env.CELCOIN_CLIENT_SECRET || '';

    if (!clientId || !clientSecret) {
        throw new Error('CELCOIN_CLIENT_ID e CELCOIN_CLIENT_SECRET não configurados. Acesse developers.celcoin.com.br para obter as credenciais.');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const res = await axios.post(`${CELCOIN_BASE}/v5/token`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
    });

    return res.data.access_token;
}

async function enriquecerPlaca(placa, uf, token) {
    const res = await axios.post(
        `${DEBITS_API}/enrichment/getdata`,
        {
            licensePlate: placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
            uf: uf || 'SP',
            clientRequestId: randomUUID(),
        },
        {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            timeout: 15000,
        }
    );
    return res.data;
}

async function iniciarConsultaDebitos(placa, renavam, estado, token) {
    const clientRequestId = randomUUID();
    const body = {
        licensePlate: placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
        state: estado || 'SP',
        clientRequestId,
    };
    if (renavam) body.renavam = renavam;

    const res = await axios.post(`${DEBITS_API}/debts`, body, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 15000,
    });

    return { transactionId: res.data.transactionId, clientRequestId };
}

function normalizarDebitos(payload) {
    const debts = payload.debts || [];

    const multas = debts.filter(d => {
        const t = (d.type || d.tipo || '').toUpperCase();
        return t === 'MULTA' || t === 'RENAINF' || t.includes('MULTA');
    }).map(d => ({
        description: d.description || d.descricao || 'Multa de trânsito',
        amount: d.amount || d.valor || 0,
        date: d.date || d.data || null,
        location: d.location || d.local || null,
        status: d.status || 'pendente',
        type: d.type || d.tipo,
        dependsOn: d.dependsOn,
        distinct: d.distinct,
        required: d.required,
        id: d.id,
    }));

    const ipva = debts.find(d => (d.type || d.tipo || '').toUpperCase() === 'IPVA');
    const licenciamento = debts.find(d => {
        const t = (d.type || d.tipo || '').toUpperCase();
        return t === 'LICENCIAMENTO' || t.includes('LICEN');
    });

    return {
        transactionId: payload.transactionId,
        debts,
        multas,
        ipva: ipva ? {
            description: ipva.description || ipva.descricao || 'IPVA',
            amount: ipva.amount || ipva.valor || 0,
            year: ipva.year || ipva.ano,
            status: ipva.status || 'pendente',
            id: ipva.id,
        } : null,
        licenciamento: licenciamento ? {
            description: licenciamento.description || licenciamento.descricao || 'Licenciamento anual',
            amount: licenciamento.amount || licenciamento.valor || 0,
            status: licenciamento.status || 'pendente',
            id: licenciamento.id,
        } : null,
    };
}

// POST /api/debitos/webhook — Celcoin entrega resultado assíncrono aqui
router.post('/webhook', async (req, res) => {
    // Responde 200 imediatamente para evitar retentativas da Celcoin
    res.status(200).json({ ok: true });

    try {
        const payload = req.body;
        console.log('[Celcoin webhook]', JSON.stringify(payload));

        const transactionId = payload.transactionId || payload.id;
        if (!transactionId) return;

        const eventType = payload.eventType || payload.type;
        let status, dadosJson;

        if (eventType === 'VehicleWithoutDebts') {
            status = 'sem_debitos';
            dadosJson = JSON.stringify({ debts: [], multas: [], ipva: null, licenciamento: null });
        } else if (eventType === 'VehicleNotFound') {
            status = 'nao_encontrado';
            dadosJson = JSON.stringify({ erro: 'Veículo não encontrado no DETRAN.' });
        } else if (eventType === 'search-error-event') {
            status = 'erro';
            dadosJson = JSON.stringify({ erro: 'Serviço Celcoin temporariamente indisponível.' });
        } else {
            // eventType === 'debts' ou similar
            status = 'disponivel';
            dadosJson = JSON.stringify(normalizarDebitos(payload));
        }

        await pool.query(
            `UPDATE debitos_veiculares_cache
             SET status = ?, dados_json = ?, consultado_em = NOW()
             WHERE transaction_id = ?`,
            [status, dadosJson, transactionId]
        );
    } catch (err) {
        console.error('[Celcoin webhook] erro ao processar:', err.message);
    }
});

// GET /api/debitos/:veiculoId
router.get('/:veiculoId', authMiddleware, async (req, res) => {
    const { veiculoId } = req.params;
    const forcar = req.query.forcar === '1';

    try {
        const [vRows] = await pool.query(
            `SELECT v.*, l.estado AS estado_locador
             FROM veiculos v
             LEFT JOIN locadores l ON l.id = v.locador_id
             WHERE v.id = ?`,
            [veiculoId]
        );
        if (!vRows.length) return res.status(404).json({ erro: 'Veículo não encontrado.' });

        const veiculo = vRows[0];
        if (!veiculo.placa) {
            return res.status(400).json({ erro: 'Veículo sem placa cadastrada.' });
        }

        if (!forcar) {
            const [cache] = await pool.query(
                `SELECT dados_json, consultado_em, status, transaction_id
                 FROM debitos_veiculares_cache
                 WHERE veiculo_id = ?
                 ORDER BY consultado_em DESC LIMIT 1`,
                [veiculoId]
            );

            if (cache.length) {
                const entrada = cache[0];
                const ageMin = (Date.now() - new Date(entrada.consultado_em)) / 60000;

                if (entrada.status === 'processando') {
                    if (ageMin < PROCESSING_TIMEOUT_MINUTES) {
                        return res.json({ status: 'processando', consultado_em: entrada.consultado_em });
                    }
                    // Timeout — deixa cair para nova consulta
                } else if (entrada.dados_json && ageMin < CACHE_TTL_MINUTES) {
                    const dados = JSON.parse(entrada.dados_json);
                    return res.json({ ...dados, cache: true, status: entrada.status, consultado_em: entrada.consultado_em });
                }
            }
        }

        const token = await getCelcoinToken();
        const placa = veiculo.placa;
        const estado = veiculo.estado_locador || 'SP';
        let renavam = veiculo.renavam || null;

        if (!renavam) {
            try {
                const enrichment = await enriquecerPlaca(placa, estado, token);
                renavam = enrichment.renavam || null;
            } catch (_) {
                // Sem RENAVAM — continua sem ele
            }
        }

        const { transactionId, clientRequestId } = await iniciarConsultaDebitos(placa, renavam, estado, token);

        await pool.query('DELETE FROM debitos_veiculares_cache WHERE veiculo_id = ?', [veiculoId]);
        await pool.query(
            `INSERT INTO debitos_veiculares_cache
               (veiculo_id, transaction_id, client_request_id, status, dados_json, consultado_em)
             VALUES (?, ?, ?, 'processando', NULL, NOW())`,
            [veiculoId, transactionId, clientRequestId]
        );

        res.json({ status: 'processando', transactionId, consultado_em: new Date() });
    } catch (err) {
        console.error('[Celcoin] erro:', err.response?.data || err.message);
        const msg = err.message.includes('configurad') ? err.message : 'Erro ao consultar débitos veiculares.';
        res.status(500).json({ erro: msg, detalhe: err.response?.data?.message || null });
    }
});

// Registra o webhook da Celcoin (chamado na inicialização do servidor)
async function registrarWebhook() {
    const backendUrl = process.env.BACKEND_URL;
    const clientId = process.env.CELCOIN_CLIENT_ID;
    const clientSecret = process.env.CELCOIN_CLIENT_SECRET;

    if (!backendUrl || !clientId || clientId === 'SEU_CLIENT_ID_AQUI') return;

    try {
        const token = await getCelcoinToken();
        await axios.post(
            `${DEBITS_API}/webhook/register`,
            {
                url: `${backendUrl}/api/debitos/webhook`,
                clientId,
                clientSecret,
            },
            {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                timeout: 10000,
            }
        );
        console.log('[Celcoin] Webhook registrado:', `${backendUrl}/api/debitos/webhook`);
    } catch (err) {
        console.warn('[Celcoin] Falha ao registrar webhook:', err.response?.data?.message || err.message);
    }
}

// Executa o registro sem bloquear a inicialização
registrarWebhook();

module.exports = router;
