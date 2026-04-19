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

async function ensureLocadorContext(req, res) {
    if (req.usuario?.perfil !== 'locador') return null;

    const locadorId = await getLocadorIdForUser(req.usuario);
    if (!locadorId) {
        res.status(403).json({ erro: 'Não foi encontrado cadastro de locador vinculado a este usuário.' });
        return null;
    }
    return locadorId;
}

// GET /api/veiculos
router.get('/', async (req, res) => {
    try {
        let sql = `
            SELECT v.*,
                   COALESCE(l.razao_social, l.nome) AS nome_locador
            FROM veiculos v
            LEFT JOIN locadores l ON v.locador_id = l.id
        `;
        const params = [];

        if (req.usuario?.perfil === 'locador') {
            const locadorId = await ensureLocadorContext(req, res);
            if (!locadorId) return;
            sql += ' WHERE v.locador_id = ?';
            params.push(locadorId);
        } else if (req.usuario?.perfil === 'locatario') {
            sql += `
                LEFT JOIN locacoes lc_ativa
                  ON lc_ativa.veiculo_id = v.id
                 AND lc_ativa.status = 'ativa'
                WHERE v.locador_id IS NOT NULL
                  AND lc_ativa.id IS NULL
            `;
        }

        sql += ' ORDER BY v.placa';

        const [rows] = await pool.query(sql, params);
        return res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar veículos.' });
    }
});

// GET /api/veiculos/:id
router.get('/:id', async (req, res) => {
    try {
        let sql = `
            SELECT v.*,
                   COALESCE(l.razao_social, l.nome) AS nome_locador
            FROM veiculos v
            LEFT JOIN locadores l ON v.locador_id = l.id
            WHERE v.id = ?
        `;
        const params = [req.params.id];

        if (req.usuario?.perfil === 'locador') {
            const locadorId = await ensureLocadorContext(req, res);
            if (!locadorId) return;
            sql += ' AND v.locador_id = ?';
            params.push(locadorId);
        } else if (req.usuario?.perfil === 'locatario') {
            sql += `
                AND v.locador_id IS NOT NULL
                AND NOT EXISTS (
                    SELECT 1
                    FROM locacoes lc_ativa
                    WHERE lc_ativa.veiculo_id = v.id
                      AND lc_ativa.status = 'ativa'
                )
            `;
        }

        const [rows] = await pool.query(sql, params);
        if (rows.length === 0) return res.status(404).json({ erro: 'Veículo não encontrado.' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar veículo.' });
    }
});

// POST /api/veiculos
router.post('/', requireProfiles('admin', 'locador'), async (req, res) => {
    const {
        placa, marca, modelo, ano_fabricacao, ano_modelo, cor, combustivel,
        transmissao, nr_portas, capacidade,
        renavam, chassi, km_atual, km_compra, km_troca_oleo, km_troca_correia, km_troca_pneu,
        data_compra, valor_compra, valor_fipe,
        seguradora, nr_apolice, vencimento_seguro,
        data_licenciamento, data_vistoria,
        bloqueador, nr_bloqueador, locador_id, foto, observacoes
    } = req.body;

    if (!placa || !marca || !modelo) {
        return res.status(400).json({ erro: 'Placa, marca e modelo são obrigatórios.' });
    }

    try {
        let locadorIdValue = locador_id || null;
        if (req.usuario?.perfil === 'locador') {
            const locadorId = await ensureLocadorContext(req, res);
            if (!locadorId) return;
            locadorIdValue = locadorId;
        }

        const [result] = await pool.query(
            `INSERT INTO veiculos
            (placa, marca, modelo, ano_fabricacao, ano_modelo, cor, combustivel,
             transmissao, nr_portas, capacidade,
             renavam, chassi, km_atual, km_compra, km_troca_oleo, km_troca_correia, km_troca_pneu,
             data_compra, valor_compra, valor_fipe,
             seguradora, nr_apolice, vencimento_seguro,
             data_licenciamento, data_vistoria,
             bloqueador, nr_bloqueador, locador_id, foto, observacoes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [placa, marca, modelo,
                ano_fabricacao || null, ano_modelo || null, cor, combustivel || 'Flex',
                transmissao || 'Manual', nr_portas || 4, capacidade || 5,
                renavam, chassi, km_atual || 0, km_compra || 0,
                km_troca_oleo || null, km_troca_correia || null, km_troca_pneu || null,
                data_compra || null, valor_compra || null, valor_fipe || null,
                seguradora, nr_apolice, vencimento_seguro || null,
                data_licenciamento || null, data_vistoria || null,
                bloqueador, nr_bloqueador, locadorIdValue, foto, observacoes]
        );
        const [novo] = await pool.query(`
            SELECT v.*, COALESCE(l.razao_social, l.nome) AS nome_locador
            FROM veiculos v LEFT JOIN locadores l ON v.locador_id = l.id
            WHERE v.id = ?
        `, [result.insertId]);
        res.status(201).json(novo[0]);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Já existe um veículo com essa placa.' });
        }
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar veículo.' });
    }
});

// PUT /api/veiculos/:id
router.put('/:id', requireProfiles('admin', 'locador'), async (req, res) => {
    const {
        placa, marca, modelo, ano_fabricacao, ano_modelo, cor, combustivel,
        transmissao, nr_portas, capacidade,
        renavam, chassi, km_atual, km_compra, km_troca_oleo, km_troca_correia, km_troca_pneu,
        data_compra, valor_compra, valor_fipe,
        seguradora, nr_apolice, vencimento_seguro,
        data_licenciamento, data_vistoria,
        bloqueador, nr_bloqueador, locador_id, foto, observacoes
    } = req.body;

    try {
        let locadorIdValue = locador_id || null;

        if (req.usuario?.perfil === 'locador') {
            const locadorId = await ensureLocadorContext(req, res);
            if (!locadorId) return;

            const [ownRows] = await pool.query(
                'SELECT id FROM veiculos WHERE id = ? AND locador_id = ? LIMIT 1',
                [req.params.id, locadorId]
            );
            if (ownRows.length === 0) {
                return res.status(403).json({ erro: 'Você só pode editar veículos vinculados ao seu cadastro de locador.' });
            }
            locadorIdValue = locadorId;
        }

        const [result] = await pool.query(
            `UPDATE veiculos SET
             placa=?, marca=?, modelo=?, ano_fabricacao=?, ano_modelo=?, cor=?, combustivel=?,
             transmissao=?, nr_portas=?, capacidade=?,
             renavam=?, chassi=?, km_atual=?, km_compra=?, km_troca_oleo=?, km_troca_correia=?, km_troca_pneu=?,
             data_compra=?, valor_compra=?, valor_fipe=?,
             seguradora=?, nr_apolice=?, vencimento_seguro=?,
             data_licenciamento=?, data_vistoria=?,
             bloqueador=?, nr_bloqueador=?, locador_id=?, foto=?, observacoes=?
             WHERE id=?`,
            [placa, marca, modelo,
                ano_fabricacao || null, ano_modelo || null, cor, combustivel || 'Flex',
                transmissao || 'Manual', nr_portas || 4, capacidade || 5,
                renavam, chassi, km_atual || 0, km_compra || 0,
                km_troca_oleo || null, km_troca_correia || null, km_troca_pneu || null,
                data_compra || null, valor_compra || null, valor_fipe || null,
                seguradora, nr_apolice, vencimento_seguro || null,
                data_licenciamento || null, data_vistoria || null,
                bloqueador, nr_bloqueador, locadorIdValue, foto, observacoes,
                req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Veículo não encontrado.' });
        const [atualizado] = await pool.query(`
            SELECT v.*, COALESCE(l.razao_social, l.nome) AS nome_locador
            FROM veiculos v LEFT JOIN locadores l ON v.locador_id = l.id
            WHERE v.id = ?
        `, [req.params.id]);
        res.json(atualizado[0]);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Já existe um veículo com essa placa.' });
        }
        console.error(err);
        res.status(500).json({ erro: 'Erro ao atualizar veículo.' });
    }
});

// DELETE /api/veiculos/:id
router.delete('/:id', requireProfiles('admin', 'locador'), async (req, res) => {
    try {
        if (req.usuario?.perfil === 'locador') {
            const locadorId = await ensureLocadorContext(req, res);
            if (!locadorId) return;

            const [ownRows] = await pool.query(
                'SELECT id FROM veiculos WHERE id = ? AND locador_id = ? LIMIT 1',
                [req.params.id, locadorId]
            );
            if (ownRows.length === 0) {
                return res.status(403).json({ erro: 'Você só pode remover veículos vinculados ao seu cadastro de locador.' });
            }
        }

        const [result] = await pool.query('DELETE FROM veiculos WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Veículo não encontrado.' });
        res.json({ mensagem: 'Veículo removido com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao remover veículo.' });
    }
});

module.exports = router;
