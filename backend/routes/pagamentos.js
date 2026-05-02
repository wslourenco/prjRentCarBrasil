const express = require('express');
const router = express.Router();
const { MercadoPagoConfig, Payment } = require('mercadopago');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

function getMpClient() {
    const token = process.env.MP_ACCESS_TOKEN || '';
    if (!token) throw new Error('MP_ACCESS_TOKEN não configurado. Acesse o Mercado Pago Developers e configure a variável de ambiente.');
    return new MercadoPagoConfig({ accessToken: token });
}

// POST /api/pagamentos/pix
router.post('/pix', authMiddleware, async (req, res) => {
    const { locacaoId, valor, descricao, emailPagador } = req.body;

    if (!valor || !emailPagador) {
        return res.status(400).json({ erro: 'Valor e email do pagador são obrigatórios.' });
    }

    try {
        const client = getMpClient();
        const payment = new Payment(client);

        const result = await payment.create({
            body: {
                transaction_amount: Number(valor),
                description: descricao || 'Locação de veículo - RentCarBrasil',
                payment_method_id: 'pix',
                payer: { email: emailPagador },
                notification_url: `${process.env.BACKEND_URL || 'https://backend-api-production-3d96.up.railway.app'}/api/pagamentos/webhook`,
                metadata: { locacao_id: locacaoId || null, usuario_id: req.usuario?.id },
            },
        });

        const qrCode = result.point_of_interaction?.transaction_data?.qr_code || null;
        const qrBase64 = result.point_of_interaction?.transaction_data?.qr_code_base64 || null;

        const [ins] = await pool.query(
            `INSERT INTO pagamentos (locacao_id, mp_payment_id, valor, status, qr_code, qr_code_base64, pix_copia_cola, email_pagador)
             VALUES (?,?,?,?,?,?,?,?)`,
            [locacaoId || null, result.id, valor, 'pendente', qrCode, qrBase64, qrCode, emailPagador]
        );

        res.json({
            pagamentoId: ins.insertId,
            mpPaymentId: result.id,
            status: result.status,
            qrCode,
            qrCodeBase64: qrBase64,
            pixCopiaCola: qrCode,
        });
    } catch (err) {
        console.error('Erro Mercado Pago:', err);
        res.status(500).json({ erro: err.message || 'Erro ao criar pagamento PIX.' });
    }
});

// GET /api/pagamentos/:id/status
router.get('/:id/status', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM pagamentos WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ erro: 'Pagamento não encontrado.' });

        const pag = rows[0];

        if (pag.status === 'pendente' && pag.mp_payment_id) {
            try {
                const client = getMpClient();
                const payment = new Payment(client);
                const mp = await payment.get({ id: pag.mp_payment_id });

                const statusMap = { approved: 'aprovado', cancelled: 'cancelado', rejected: 'rejeitado', in_process: 'em_processo', pending: 'pendente' };
                const novoStatus = statusMap[mp.status] || pag.status;

                if (novoStatus !== pag.status) {
                    await pool.query('UPDATE pagamentos SET status=? WHERE id=?', [novoStatus, pag.id]);
                    pag.status = novoStatus;
                }
            } catch { /* ignora erro de consulta ao MP */ }
        }

        res.json(pag);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// POST /api/pagamentos/webhook (Mercado Pago notifica aqui)
router.post('/webhook', async (req, res) => {
    res.sendStatus(200); // responde imediatamente

    const { type, data } = req.body;
    if (type !== 'payment' || !data?.id) return;

    try {
        const client = getMpClient();
        const payment = new Payment(client);
        const mp = await payment.get({ id: data.id });

        const statusMap = { approved: 'aprovado', cancelled: 'cancelado', rejected: 'rejeitado', in_process: 'em_processo', pending: 'pendente' };
        const novoStatus = statusMap[mp.status] || 'pendente';

        await pool.query(
            'UPDATE pagamentos SET status=? WHERE mp_payment_id=?',
            [novoStatus, data.id]
        );

        if (novoStatus === 'aprovado') {
            const locacaoId = mp.metadata?.locacao_id;
            if (locacaoId) {
                await pool.query(
                    "UPDATE locacoes SET status='ativa' WHERE id=? AND status='pendente_aprovacao'",
                    [locacaoId]
                );
            }
        }
    } catch (err) {
        console.error('Webhook MP erro:', err.message);
    }
});

module.exports = router;
