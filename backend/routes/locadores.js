const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use(authMiddleware, adminOnly);

// GET /api/locadores
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM locadores ORDER BY COALESCE(razao_social, nome)'
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar locadores.' });
    }
});

// GET /api/locadores/:id
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM locadores WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ erro: 'Locador não encontrado.' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar locador.' });
    }
});

// POST /api/locadores
router.post('/', async (req, res) => {
    const {
        tipo, nome, cpf, rg, data_nascimento, razao_social, cnpj, insc_estadual,
        telefone, celular, email, cep, endereco, numero, complemento,
        bairro, cidade, estado, banco, agencia, conta, tipo_conta, pix_chave, observacoes
    } = req.body;

    if (!tipo) return res.status(400).json({ erro: 'Tipo é obrigatório.' });
    if (tipo === 'fisica' && !nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });
    if (tipo === 'juridica' && !razao_social) return res.status(400).json({ erro: 'Razão social é obrigatória.' });

    try {
        const [result] = await pool.query(
            `INSERT INTO locadores
            (tipo, nome, cpf, rg, data_nascimento, razao_social, cnpj, insc_estadual,
             telefone, celular, email, cep, endereco, numero, complemento,
             bairro, cidade, estado, banco, agencia, conta, tipo_conta, pix_chave, observacoes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [tipo, nome || null, cpf || null, rg || null, data_nascimento || null,
                razao_social || null, cnpj || null, insc_estadual || null,
                telefone, celular, email, cep, endereco, numero, complemento,
                bairro, cidade, estado, banco, agencia, conta, tipo_conta, pix_chave, observacoes]
        );
        const [novo] = await pool.query('SELECT * FROM locadores WHERE id = ?', [result.insertId]);
        res.status(201).json(novo[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar locador.' });
    }
});

// PUT /api/locadores/:id
router.put('/:id', async (req, res) => {
    const {
        tipo, nome, cpf, rg, data_nascimento, razao_social, cnpj, insc_estadual,
        telefone, celular, email, cep, endereco, numero, complemento,
        bairro, cidade, estado, banco, agencia, conta, tipo_conta, pix_chave, observacoes
    } = req.body;

    try {
        const [result] = await pool.query(
            `UPDATE locadores SET
             tipo=?, nome=?, cpf=?, rg=?, data_nascimento=?, razao_social=?, cnpj=?, insc_estadual=?,
             telefone=?, celular=?, email=?, cep=?, endereco=?, numero=?, complemento=?,
             bairro=?, cidade=?, estado=?, banco=?, agencia=?, conta=?, tipo_conta=?, pix_chave=?, observacoes=?
             WHERE id=?`,
            [tipo, nome || null, cpf || null, rg || null, data_nascimento || null,
                razao_social || null, cnpj || null, insc_estadual || null,
                telefone, celular, email, cep, endereco, numero, complemento,
                bairro, cidade, estado, banco, agencia, conta, tipo_conta, pix_chave, observacoes,
                req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Locador não encontrado.' });
        const [atualizado] = await pool.query('SELECT * FROM locadores WHERE id = ?', [req.params.id]);
        res.json(atualizado[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao atualizar locador.' });
    }
});

// DELETE /api/locadores/:id
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM locadores WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Locador não encontrado.' });
        res.json({ mensagem: 'Locador removido com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao remover locador.' });
    }
});

module.exports = router;
