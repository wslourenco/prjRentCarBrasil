const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/financeiro
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT dr.*,
                   v.placa AS placa_veiculo,
                   CONCAT(v.marca, ' ', v.modelo) AS nome_veiculo,
                   lt.nome AS nome_locatario,
                   COALESCE(col.razao_social, col.nome) AS nome_colaborador
            FROM despesas_receitas dr
            LEFT JOIN veiculos v ON dr.veiculo_id = v.id
            LEFT JOIN locatarios lt ON dr.locatario_id = lt.id
            LEFT JOIN colaboradores col ON dr.colaborador_id = col.id
            ORDER BY dr.data DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar lançamentos.' });
    }
});

// GET /api/financeiro/:id
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM despesas_receitas WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar lançamento.' });
    }
});

// POST /api/financeiro
router.post('/', async (req, res) => {
    const {
        tipo, categoria, descricao, valor, data,
        forma_pagamento, comprovante,
        veiculo_id, locatario_id, colaborador_id, observacoes
    } = req.body;

    if (!tipo || !categoria || !valor || !data) {
        return res.status(400).json({ erro: 'Tipo, categoria, valor e data são obrigatórios.' });
    }

    try {
        const [result] = await pool.query(
            `INSERT INTO despesas_receitas
            (tipo, categoria, descricao, valor, data,
             forma_pagamento, comprovante,
             veiculo_id, locatario_id, colaborador_id, observacoes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [tipo, categoria, descricao, valor, data,
                forma_pagamento || 'pix', comprovante || null,
                veiculo_id || null, locatario_id || null, colaborador_id || null, observacoes]
        );
        const [novo] = await pool.query('SELECT * FROM despesas_receitas WHERE id = ?', [result.insertId]);
        res.status(201).json(novo[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar lançamento.' });
    }
});

// PUT /api/financeiro/:id
router.put('/:id', async (req, res) => {
    const {
        tipo, categoria, descricao, valor, data,
        forma_pagamento, comprovante,
        veiculo_id, locatario_id, colaborador_id, observacoes
    } = req.body;

    try {
        const [result] = await pool.query(
            `UPDATE despesas_receitas SET
             tipo=?, categoria=?, descricao=?, valor=?, data=?,
             forma_pagamento=?, comprovante=?,
             veiculo_id=?, locatario_id=?, colaborador_id=?, observacoes=?
             WHERE id=?`,
            [tipo, categoria, descricao, valor, data,
                forma_pagamento || 'pix', comprovante || null,
                veiculo_id || null, locatario_id || null, colaborador_id || null, observacoes,
                req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
        const [atualizado] = await pool.query('SELECT * FROM despesas_receitas WHERE id = ?', [req.params.id]);
        res.json(atualizado[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao atualizar lançamento.' });
    }
});

// DELETE /api/financeiro/:id
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM despesas_receitas WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
        res.json({ mensagem: 'Lançamento removido com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao remover lançamento.' });
    }
});

module.exports = router;
