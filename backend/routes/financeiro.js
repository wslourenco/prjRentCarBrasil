const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, requireProfiles } = require('../middleware/auth');

router.use(authMiddleware);

async function getLocadorIdForUser(usuario) {
    const email = String(usuario?.email || '').trim();
    if (email) {
        const [rowsByEmail] = await pool.query(
            'SELECT id FROM locadores WHERE email = ? ORDER BY id ASC LIMIT 1',
            [email]
        );
        if (rowsByEmail[0]?.id) return rowsByEmail[0].id;
    }

    const userId = Number(usuario?.id || 0);
    if (Number.isInteger(userId) && userId > 0) {
        const [rowsById] = await pool.query(
            'SELECT id FROM locadores WHERE id = ? LIMIT 1',
            [userId]
        );
        if (rowsById[0]?.id) return rowsById[0].id;
    }

    return null;
}

async function getLocatarioIdByUserEmail(email) {
    const [rows] = await pool.query(
        'SELECT id FROM locatarios WHERE email = ? ORDER BY id ASC LIMIT 1',
        [email]
    );
    return rows[0]?.id || null;
}

async function ensureLocadorContext(req, res) {
    if (req.usuario?.perfil !== 'locador') return null;

    const locadorId = await getLocadorIdForUser(req.usuario);
    if (!locadorId) {
        res.status(403).json({ erro: 'Não foi encontrado cadastro de locador vinculado a este usuário.' });
        return null;
    }
    return locadorId;
}

// GET /api/financeiro
router.get('/', async (req, res) => {
    try {
        let sql = `
            SELECT dr.*,
                   v.placa AS placa_veiculo,
                   CONCAT(v.marca, ' ', v.modelo) AS nome_veiculo,
                   lt.nome AS nome_locatario,
                   COALESCE(col.razao_social, col.nome) AS nome_colaborador
            FROM despesas_receitas dr
            LEFT JOIN veiculos v ON dr.veiculo_id = v.id
            LEFT JOIN locatarios lt ON dr.locatario_id = lt.id
            LEFT JOIN colaboradores col ON dr.colaborador_id = col.id
        `;
        const params = [];

        if (req.usuario?.perfil === 'locador') {
            const locadorId = await ensureLocadorContext(req, res);
            if (!locadorId) return;
            sql += ' WHERE v.locador_id = ?';
            params.push(locadorId);
        } else if (req.usuario?.perfil === 'locatario') {
            const locatarioId = await getLocatarioIdByUserEmail(req.usuario.email);
            if (!locatarioId) return res.json([]);

            sql += `
                WHERE (
                    dr.locatario_id = ?
                    OR EXISTS (
                        SELECT 1
                        FROM locacoes lc
                        WHERE lc.veiculo_id = dr.veiculo_id
                          AND lc.locatario_id = ?
                    )
                )
            `;
            params.push(locatarioId, locatarioId);
        }

        sql += ' ORDER BY dr.data DESC';

        const [rows] = await pool.query(sql, params);
        return res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar lançamentos.' });
    }
});

// GET /api/financeiro/:id
router.get('/:id', async (req, res) => {
    try {
        let sql = 'SELECT dr.* FROM despesas_receitas dr WHERE dr.id = ?';
        const params = [req.params.id];

        if (req.usuario?.perfil === 'locador') {
            const locadorId = await ensureLocadorContext(req, res);
            if (!locadorId) return;
            sql = `
                SELECT dr.*
                FROM despesas_receitas dr
                INNER JOIN veiculos v ON dr.veiculo_id = v.id
                WHERE dr.id = ? AND v.locador_id = ?
            `;
            params.push(locadorId);
        } else if (req.usuario?.perfil === 'locatario') {
            const locatarioId = await getLocatarioIdByUserEmail(req.usuario.email);
            if (!locatarioId) return res.status(404).json({ erro: 'Lançamento não encontrado.' });

            sql = `
                                SELECT dr.*
                                FROM despesas_receitas dr
                                WHERE dr.id = ?
                                    AND (
                                        dr.locatario_id = ?
                                        OR EXISTS (
                                                SELECT 1
                                                FROM locacoes lc
                                                WHERE lc.veiculo_id = dr.veiculo_id
                                                    AND lc.locatario_id = ?
                                        )
                                    )
                        `;
            params.push(locatarioId, locatarioId);
        }

        const [rows] = await pool.query(sql, params);
        if (rows.length === 0) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar lançamento.' });
    }
});

// POST /api/financeiro
router.post('/', requireProfiles('admin', 'locador'), async (req, res) => {
    const {
        tipo, categoria, descricao, valor, data,
        forma_pagamento, comprovante,
        veiculo_id, locatario_id, colaborador_id, observacoes
    } = req.body;

    if (!tipo || !categoria || !valor || !data) {
        return res.status(400).json({ erro: 'Tipo, categoria, valor e data são obrigatórios.' });
    }

    try {
        if (req.usuario?.perfil === 'locador') {
            const locadorId = await ensureLocadorContext(req, res);
            if (!locadorId) return;

            if (!veiculo_id) {
                return res.status(400).json({ erro: 'Locador deve informar o veículo do lançamento.' });
            }

            const [ownRows] = await pool.query(
                'SELECT id FROM veiculos WHERE id = ? AND locador_id = ? LIMIT 1',
                [veiculo_id, locadorId]
            );
            if (ownRows.length === 0) {
                return res.status(403).json({ erro: 'Você só pode lançar movimentações para veículos vinculados ao seu cadastro.' });
            }
        }

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
router.put('/:id', requireProfiles('admin', 'locador'), async (req, res) => {
    const {
        tipo, categoria, descricao, valor, data,
        forma_pagamento, comprovante,
        veiculo_id, locatario_id, colaborador_id, observacoes
    } = req.body;

    try {
        if (req.usuario?.perfil === 'locador') {
            const locadorId = await ensureLocadorContext(req, res);
            if (!locadorId) return;

            if (!veiculo_id) {
                return res.status(400).json({ erro: 'Locador deve informar o veículo do lançamento.' });
            }

            const [ownRows] = await pool.query(
                'SELECT id FROM veiculos WHERE id = ? AND locador_id = ? LIMIT 1',
                [veiculo_id, locadorId]
            );
            if (ownRows.length === 0) {
                return res.status(403).json({ erro: 'Você só pode alterar movimentações dos seus veículos.' });
            }

            const [ownership] = await pool.query(
                `SELECT dr.id
                 FROM despesas_receitas dr
                 INNER JOIN veiculos v ON dr.veiculo_id = v.id
                 WHERE dr.id = ? AND v.locador_id = ?
                 LIMIT 1`,
                [req.params.id, locadorId]
            );
            if (ownership.length === 0) {
                return res.status(403).json({ erro: 'Você só pode alterar movimentações dos seus veículos.' });
            }
        }

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
router.delete('/:id', requireProfiles('admin', 'locador'), async (req, res) => {
    try {
        if (req.usuario?.perfil === 'locador') {
            const locadorId = await ensureLocadorContext(req, res);
            if (!locadorId) return;

            const [ownership] = await pool.query(
                `SELECT dr.id
                 FROM despesas_receitas dr
                 INNER JOIN veiculos v ON dr.veiculo_id = v.id
                 WHERE dr.id = ? AND v.locador_id = ?
                 LIMIT 1`,
                [req.params.id, locadorId]
            );
            if (ownership.length === 0) {
                return res.status(403).json({ erro: 'Você só pode remover movimentações dos seus veículos.' });
            }
        }

        const [result] = await pool.query('DELETE FROM despesas_receitas WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
        res.json({ mensagem: 'Lançamento removido com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao remover lançamento.' });
    }
});

module.exports = router;
