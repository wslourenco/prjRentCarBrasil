const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, requireProfiles } = require('../middleware/auth');

router.use(authMiddleware);

async function getLocadorIdForUser(usuario) {
    const email = String(usuario?.email || '').trim();
    if (email) {
        const [rowsByEmail] = await pool.query(
            'SELECT id FROM locadores WHERE LOWER(email) = LOWER(?) ORDER BY id ASC LIMIT 1',
            [email]
        );
        if (rowsByEmail[0]?.id) return rowsByEmail[0].id;
    }

    return null;
}

async function getLocatarioIdByUserEmail(email) {
    const emailNormalizado = String(email || '').trim();
    if (!emailNormalizado) return null;

    const [rows] = await pool.query(
        'SELECT id FROM locatarios WHERE LOWER(TRIM(email)) = LOWER(?) ORDER BY id ASC LIMIT 1',
        [emailNormalizado]
    );
    return rows[0]?.id || null;
}

function computeEndDate(dataInicio, periodicidade, quantidade) {
    const base = new Date(`${dataInicio}T00:00:00`);
    if (Number.isNaN(base.getTime())) return null;

    const total = Number(quantidade || 0);
    if (!total) return null;

    if (periodicidade === 'semanal') base.setDate(base.getDate() + (total * 7));
    else if (periodicidade === 'quinzenal') base.setDate(base.getDate() + (total * 15));
    else if (periodicidade === 'mensal') base.setMonth(base.getMonth() + total);
    else return null;

    return base.toISOString().split('T')[0];
}

function estimateWeeklyValue(veiculo) {
    const fipe = Number(veiculo?.valor_fipe || 0);
    if (fipe > 0) {
        return Number((fipe * 0.01).toFixed(2));
    }
    return 900;
}

// GET /api/locacoes
router.get('/', async (req, res) => {
    try {
        let sql = `
            SELECT lc.*,
                   CONCAT(v.marca, ' ', v.modelo) AS nome_veiculo, v.placa,
                   lt.nome AS nome_locatario, lt.celular AS celular_locatario
            FROM locacoes lc
            LEFT JOIN veiculos v ON lc.veiculo_id = v.id
            LEFT JOIN locatarios lt ON lc.locatario_id = lt.id
        `;
        const params = [];

        if (req.usuario?.perfil === 'locatario') {
            const locatarioId = await getLocatarioIdByUserEmail(req.usuario.email);
            if (!locatarioId) return res.json([]);
            sql += ' WHERE lc.locatario_id = ?';
            params.push(locatarioId);
        } else if (req.usuario?.perfil === 'locador') {
            const locadorId = await getLocadorIdForUser(req.usuario);
            if (!locadorId) return res.json([]);
            sql += ' WHERE v.locador_id = ?';
            params.push(locadorId);
        }

        sql += ' ORDER BY lc.data_inicio DESC';

        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar locações.' });
    }
});

// GET /api/locacoes/:id
router.get('/:id', async (req, res) => {
    try {
        let sql = `
            SELECT lc.*,
                   CONCAT(v.marca, ' ', v.modelo) AS nome_veiculo, v.placa,
                   lt.nome AS nome_locatario, lt.celular AS celular_locatario
            FROM locacoes lc
            LEFT JOIN veiculos v ON lc.veiculo_id = v.id
            LEFT JOIN locatarios lt ON lc.locatario_id = lt.id
            WHERE lc.id = ?
        `;
        const params = [req.params.id];

        if (req.usuario?.perfil === 'locatario') {
            const locatarioId = await getLocatarioIdByUserEmail(req.usuario.email);
            if (!locatarioId) return res.status(404).json({ erro: 'Locação não encontrada.' });
            sql += ' AND lc.locatario_id = ?';
            params.push(locatarioId);
        } else if (req.usuario?.perfil === 'locador') {
            const locadorId = await getLocadorIdForUser(req.usuario);
            if (!locadorId) return res.status(404).json({ erro: 'Locação não encontrada.' });
            sql += ' AND v.locador_id = ?';
            params.push(locadorId);
        }

        const [rows] = await pool.query(sql, params);
        if (rows.length === 0) return res.status(404).json({ erro: 'Locação não encontrada.' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar locação.' });
    }
});

// POST /api/locacoes
router.post('/', requireProfiles('admin', 'locatario'), async (req, res) => {
    const {
        veiculo_id, locatario_id, data_inicio, data_previsao_fim,
        valor_semanal, caucao, km_entrada, condicoes,
        periodicidade, quantidade_periodos
    } = req.body;

    if (!veiculo_id || !data_inicio) {
        return res.status(400).json({ erro: 'Veículo e data de início são obrigatórios.' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        let locatarioIdValue = locatario_id;
        let valorSemanalValue = valor_semanal;
        let dataPrevisaoFimValue = data_previsao_fim || null;
        let condicoesValue = condicoes || '';

        const [veiculoRows] = await conn.query(
            'SELECT id, valor_fipe FROM veiculos WHERE id = ? LIMIT 1',
            [veiculo_id]
        );
        if (veiculoRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ erro: 'Veículo não encontrado.' });
        }

        if (req.usuario?.perfil === 'locatario') {
            const locatarioIdByEmail = await getLocatarioIdByUserEmail(req.usuario.email);
            if (!locatarioIdByEmail) {
                await conn.rollback();
                return res.status(403).json({ erro: 'Não foi encontrado cadastro de locatário vinculado a este usuário.' });
            }

            locatarioIdValue = locatarioIdByEmail;
            valorSemanalValue = estimateWeeklyValue(veiculoRows[0]);

            const periodicidadeNormalizada = String(periodicidade || '').trim().toLowerCase();
            const quantidade = Number(quantidade_periodos || 0);

            if (!['semanal', 'quinzenal', 'mensal'].includes(periodicidadeNormalizada) || quantidade <= 0) {
                await conn.rollback();
                return res.status(400).json({ erro: 'Periodicidade e quantidade de períodos são obrigatórias para locatário.' });
            }

            dataPrevisaoFimValue = computeEndDate(data_inicio, periodicidadeNormalizada, quantidade);
            condicoesValue = `${condicoesValue ? `${condicoesValue} | ` : ''}Periodicidade: ${periodicidadeNormalizada}; Quantidade: ${quantidade}`;
        }

        if (!locatarioIdValue || !valorSemanalValue) {
            await conn.rollback();
            return res.status(400).json({ erro: 'Veículo, locatário, data de início e valor são obrigatórios.' });
        }

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
            [veiculo_id, locatarioIdValue, data_inicio, dataPrevisaoFimValue,
                valorSemanalValue, caucao || 0, km_entrada || 0, condicoesValue]
        );

        // Cria lançamento de caução se houver
        if (caucao && parseFloat(caucao) > 0) {
            await conn.query(
                `INSERT INTO despesas_receitas
                (tipo, categoria, descricao, valor, data, veiculo_id, locatario_id)
                VALUES ('receita','Caução/Depósito','Caução – início de locação',?,?,?,?)`,
                [caucao, data_inicio, veiculo_id, locatarioIdValue]
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
router.put('/:id', requireProfiles('admin'), async (req, res) => {
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
router.patch('/:id/encerrar', requireProfiles('admin', 'locador'), async (req, res) => {
    const { km_saida, data_encerramento } = req.body;
    const hoje = data_encerramento || new Date().toISOString().split('T')[0];

    try {
        if (req.usuario?.perfil === 'locador') {
            const locadorId = await getLocadorIdForUser(req.usuario);
            if (!locadorId) {
                return res.status(403).json({ erro: 'Não foi encontrado cadastro de locador vinculado a este usuário.' });
            }

            const [ownership] = await pool.query(
                `SELECT lc.id
                 FROM locacoes lc
                 INNER JOIN veiculos v ON lc.veiculo_id = v.id
                 WHERE lc.id = ? AND v.locador_id = ?
                 LIMIT 1`,
                [req.params.id, locadorId]
            );
            if (ownership.length === 0) {
                return res.status(403).json({ erro: 'Você só pode encerrar locações dos seus veículos.' });
            }
        }

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
router.delete('/:id', requireProfiles('admin'), async (req, res) => {
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
