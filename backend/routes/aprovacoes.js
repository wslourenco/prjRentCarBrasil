const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use(authMiddleware, adminOnly);

// GET /api/aprovacoes — lista cadastros pendentes com documentos
router.get('/', async (req, res) => {
    try {
        const status = req.query.status || 'pendente';
        const [rows] = await pool.query(
            `SELECT id, nome, email, perfil, tipo_documento, documento, status_aprovacao, motivo_rejeicao,
                    doc_rg, doc_cpf, doc_comprovante, criado_em
             FROM usuarios
             WHERE status_aprovacao = ?
             ORDER BY criado_em ASC`,
            [status]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao listar aprovações.' });
    }
});

// PATCH /api/aprovacoes/:id/aprovar
router.patch('/:id/aprovar', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query(
            "UPDATE usuarios SET ativo = 1, status_aprovacao = 'aprovado', motivo_rejeicao = NULL WHERE id = ? AND status_aprovacao = 'pendente'",
            [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: 'Cadastro não encontrado ou já processado.' });
        }
        res.json({ mensagem: 'Cadastro aprovado com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao aprovar cadastro.' });
    }
});

// PATCH /api/aprovacoes/:id/rejeitar
router.patch('/:id/rejeitar', async (req, res) => {
    const { id } = req.params;
    const motivo = String(req.body?.motivo || '').trim().slice(0, 500) || null;
    try {
        const [result] = await pool.query(
            "UPDATE usuarios SET ativo = 0, status_aprovacao = 'rejeitado', motivo_rejeicao = ? WHERE id = ? AND status_aprovacao = 'pendente'",
            [motivo, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: 'Cadastro não encontrado ou já processado.' });
        }
        res.json({ mensagem: 'Cadastro rejeitado.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao rejeitar cadastro.' });
    }
});

module.exports = router;
