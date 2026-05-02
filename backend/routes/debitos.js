const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

const CELCOIN_BASE = process.env.CELCOIN_ENV === 'production'
    ? 'https://api.celcoin.com.br'
    : 'https://sandbox.openfinance.celcoin.dev';

const CACHE_TTL_MINUTES = 60;

async function getCelcoinToken() {
    const clientId = process.env.CELCOIN_CLIENT_ID || '';
    const clientSecret = process.env.CELCOIN_CLIENT_SECRET || '';

    if (!clientId || !clientSecret) {
        throw new Error('CELCOIN_CLIENT_ID e CELCOIN_CLIENT_SECRET não configurados. Acesse developer.celcoin.com.br para obter as credenciais.');
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

async function consultarDebitosVeiculares(placa, renavam, estado) {
    const token = await getCelcoinToken();

    const res = await axios.post(
        `${CELCOIN_BASE}/v5/transactions/debit/veicular/consult`,
        { plate: placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase(), renavam, state: estado || 'SP' },
        {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            timeout: 15000,
        }
    );

    return res.data;
}

// GET /api/debitos/:veiculoId
router.get('/:veiculoId', authMiddleware, async (req, res) => {
    const { veiculoId } = req.params;
    const forcar = req.query.forcar === '1';

    try {
        const [vRows] = await pool.query('SELECT * FROM veiculos WHERE id = ?', [veiculoId]);
        if (!vRows.length) return res.status(404).json({ erro: 'Veículo não encontrado.' });

        const veiculo = vRows[0];

        if (!veiculo.placa || !veiculo.renavam) {
            return res.status(400).json({ erro: 'Veículo sem placa ou RENAVAM cadastrado.' });
        }

        // Verifica cache
        if (!forcar) {
            const [cache] = await pool.query(
                `SELECT dados_json, consultado_em FROM debitos_veiculares_cache
                 WHERE veiculo_id = ? AND consultado_em > DATE_SUB(NOW(), INTERVAL ${CACHE_TTL_MINUTES} MINUTE)
                 ORDER BY consultado_em DESC LIMIT 1`,
                [veiculoId]
            );
            if (cache.length) {
                const dados = JSON.parse(cache[0].dados_json);
                return res.json({ ...dados, cache: true, consultado_em: cache[0].consultado_em });
            }
        }

        const dados = await consultarDebitosVeiculares(veiculo.placa, veiculo.renavam, veiculo.estado_locador || 'SP');

        // Salva cache
        await pool.query(
            `INSERT INTO debitos_veiculares_cache (veiculo_id, dados_json) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE dados_json=VALUES(dados_json), consultado_em=NOW()`,
            [veiculoId, JSON.stringify(dados)]
        );

        res.json({ ...dados, cache: false, consultado_em: new Date() });
    } catch (err) {
        console.error('Celcoin erro:', err.response?.data || err.message);
        const msg = err.message.includes('configurad') ? err.message : 'Erro ao consultar débitos veiculares.';
        res.status(500).json({ erro: msg, detalhe: err.response?.data?.message || null });
    }
});

module.exports = router;
