const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/veiculos
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT v.*,
                   COALESCE(l.razao_social, l.nome) AS nome_locador
            FROM veiculos v
            LEFT JOIN locadores l ON v.locador_id = l.id
            ORDER BY v.placa
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar veículos.' });
    }
});

// GET /api/veiculos/:id
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT v.*,
                   COALESCE(l.razao_social, l.nome) AS nome_locador
            FROM veiculos v
            LEFT JOIN locadores l ON v.locador_id = l.id
            WHERE v.id = ?
        `, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ erro: 'Veículo não encontrado.' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar veículo.' });
    }
});

// POST /api/veiculos
router.post('/', async (req, res) => {
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
                bloqueador, nr_bloqueador, locador_id || null, foto, observacoes]
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
router.put('/:id', async (req, res) => {
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
                bloqueador, nr_bloqueador, locador_id || null, foto, observacoes,
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
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM veiculos WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Veículo não encontrado.' });
        res.json({ mensagem: 'Veículo removido com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao remover veículo.' });
    }
});

module.exports = router;
