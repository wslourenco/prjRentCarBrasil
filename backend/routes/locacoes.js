const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/locacoes
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT lc.*,
                   CONCAT(v.marca, ' ', v.modelo) AS nome_veiculo, v.placa,
                   lt.nome AS nome_locatario, lt.celular AS celular_locatario
            FROM locacoes lc
            LEFT JOIN veiculos v ON lc.veiculo_id = v.id
            LEFT JOIN locatarios lt ON lc.locatario_id = lt.id
            ORDER BY lc.data_inicio DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar locações.' });
    }
});

// GET /api/locacoes/:id
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT lc.*,
                   CONCAT(v.marca, ' ', v.modelo) AS nome_veiculo, v.placa,
                   lt.nome AS nome_locatario, lt.celular AS celular_locatario
            FROM locacoes lc
            LEFT JOIN veiculos v ON lc.veiculo_id = v.id
            LEFT JOIN locatarios lt ON lc.locatario_id = lt.id
            WHERE lc.id = ?
        `, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ erro: 'Locação não encontrada.' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar locação.' });
    }
});

// POST /api/locacoes
router.post('/', async (req, res) => {
    const {
        veiculo_id, locatario_id, data_inicio, data_previsao_fim,
        valor_semanal, caucao, km_entrada, condicoes
    } = req.body;

    if (!veiculo_id || !locatario_id || !data_inicio || !valor_semanal) {
        return res.status(400).json({ erro: 'Veículo, locatário, data de início e valor são obrigatórios.' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Verifica se veículo está disponível
        const [ativas] = await conn.query(
            'SELECT id FROM locacoes WHERE veiculo_id = ? AND status = "ativa"',
            [veiculo_id]
        );
        if (ativas.length > 0) {
            await conn.rollback();
            return res.status(409).json({ erro: 'Este veículo já possui uma locação ativa.' });
        }

        const [result] = await conn.query(
            `INSERT INTO locacoes
            (veiculo_id, locatario_id, data_inicio, data_previsao_fim,
             valor_semanal, caucao, km_entrada, status, condicoes)
            VALUES (?,?,?,?,?,?,?,'ativa',?)`,
            [veiculo_id, locatario_id, data_inicio, data_previsao_fim || null,
                valor_semanal, caucao || 0, km_entrada || 0, condicoes]
        );

        // Cria lançamento de caução se houver
        if (caucao && parseFloat(caucao) > 0) {
            await conn.query(
                `INSERT INTO despesas_receitas
                (tipo, categoria, descricao, valor, data, veiculo_id, locatario_id)
                VALUES ('receita','Caução/Depósito','Caução – início de locação',?,?,?,?)`,
                [caucao, data_inicio, veiculo_id, locatario_id]
            );
        }

        await conn.commit();

        const [nova] = await pool.query(`
            SELECT lc.*, CONCAT(v.marca,' ',v.modelo) AS nome_veiculo, v.placa,
                   lt.nome AS nome_locatario, lt.celular AS celular_locatario
            FROM locacoes lc
            LEFT JOIN veiculos v ON lc.veiculo_id = v.id
            LEFT JOIN locatarios lt ON lc.locatario_id = lt.id
            WHERE lc.id = ?
        `, [result.insertId]);
        res.status(201).json(nova[0]);
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar locação.' });
    } finally {
        conn.release();
    }
});

// PUT /api/locacoes/:id
router.put('/:id', async (req, res) => {
    const {
        veiculo_id, locatario_id, data_inicio, data_previsao_fim, data_encerramento,
        valor_semanal, caucao, km_entrada, km_saida, status, condicoes
    } = req.body;

    try {
        const [result] = await pool.query(
            `UPDATE locacoes SET
             veiculo_id=?, locatario_id=?, data_inicio=?, data_previsao_fim=?, data_encerramento=?,
             valor_semanal=?, caucao=?, km_entrada=?, km_saida=?, status=?, condicoes=?
             WHERE id=?`,
            [veiculo_id, locatario_id, data_inicio, data_previsao_fim || null, data_encerramento || null,
                valor_semanal, caucao || 0, km_entrada || 0, km_saida || null, status, condicoes,
                req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Locação não encontrada.' });
        const [atualizada] = await pool.query(`
            SELECT lc.*, CONCAT(v.marca,' ',v.modelo) AS nome_veiculo, v.placa,
                   lt.nome AS nome_locatario, lt.celular AS celular_locatario
            FROM locacoes lc
            LEFT JOIN veiculos v ON lc.veiculo_id = v.id
            LEFT JOIN locatarios lt ON lc.locatario_id = lt.id
            WHERE lc.id = ?
        `, [req.params.id]);
        res.json(atualizada[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao atualizar locação.' });
    }
});

// PATCH /api/locacoes/:id/encerrar
router.patch('/:id/encerrar', async (req, res) => {
    const { km_saida, data_encerramento } = req.body;
    const hoje = data_encerramento || new Date().toISOString().split('T')[0];

    try {
        const [result] = await pool.query(
            `UPDATE locacoes SET status='encerrada', data_encerramento=?, km_saida=? WHERE id=? AND status='ativa'`,
            [hoje, km_saida || null, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Locação não encontrada ou já encerrada.' });
        res.json({ mensagem: 'Locação encerrada com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao encerrar locação.' });
    }
});

// DELETE /api/locacoes/:id
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM locacoes WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Locação não encontrada.' });
        res.json({ mensagem: 'Locação removida com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao remover locação.' });
    }
});

module.exports = router;
