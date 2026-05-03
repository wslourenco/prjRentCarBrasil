const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

const APIBRASIL_HOST = 'https://apibrasil.io';
const CACHE_TTL_MINUTES = 60;

// Estados suportados pela APIBrasil (tier gratuito)
const ESTADOS_SUPORTADOS = ['mg', 'al', 'pb', 'go', 'ma', 'df', 'ms', 'pe', 'se', 'pr', 'sp', 'rj', 'rs', 'sc'];

async function consultarMultas(placa, renavam, estado) {
    const token = process.env.APIBRASIL_TOKEN;
    if (!token) throw new Error('APIBRASIL_TOKEN não configurado.');

    const uf = (estado || 'sp').toLowerCase();

    const res = await axios.post(
        `${APIBRASIL_HOST}/multas/${uf}`,
        { placa: placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase(), renavam: renavam || '' },
        {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'APIBRASIL/API-MULTAS',
                'token': token,
            },
            timeout: 30000,
        }
    );

    return res.data;
}

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
        if (!veiculo.placa) return res.status(400).json({ erro: 'Veículo sem placa cadastrada.' });

        const estado = (veiculo.estado_locador || 'SP').toLowerCase();

        if (!forcar) {
            const [cache] = await pool.query(
                `SELECT dados_json, consultado_em
                 FROM debitos_cache
                 WHERE veiculo_id = ? AND estado = ?
                 ORDER BY consultado_em DESC LIMIT 1`,
                [veiculoId, estado]
            );
            if (cache.length) {
                const ageMin = (Date.now() - new Date(cache[0].consultado_em)) / 60000;
                if (ageMin < CACHE_TTL_MINUTES) {
                    const dados = JSON.parse(cache[0].dados_json);
                    return res.json({ ...dados, cache: true, consultado_em: cache[0].consultado_em });
                }
            }
        }

        const dados = await consultarMultas(veiculo.placa, veiculo.renavam, estado);

        await pool.query('DELETE FROM debitos_cache WHERE veiculo_id = ? AND estado = ?', [veiculoId, estado]);
        await pool.query(
            'INSERT INTO debitos_cache (veiculo_id, estado, dados_json, consultado_em) VALUES (?, ?, ?, NOW())',
            [veiculoId, estado, JSON.stringify(dados)]
        );

        res.json({ ...dados, cache: false, consultado_em: new Date() });
    } catch (err) {
        console.error('[APIBrasil multas] erro:', err.response?.data || err.message);
        const status = err.response?.status;
        if (status === 429) {
            return res.status(429).json({ erro: 'Limite de consultas atingido. Tente novamente em alguns minutos.' });
        }
        const msg = err.message.includes('APIBRASIL_TOKEN') ? err.message : 'Erro ao consultar multas veiculares.';
        res.status(500).json({ erro: msg });
    }
});

module.exports = router;
