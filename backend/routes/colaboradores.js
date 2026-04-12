const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/colaboradores
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM colaboradores ORDER BY nome');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar colaboradores.' });
    }
});

// GET /api/colaboradores/:id
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM colaboradores WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ erro: 'Colaborador não encontrado.' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar colaborador.' });
    }
});

// POST /api/colaboradores
router.post('/', async (req, res) => {
    const {
        tipo, categoria, nome, cpf, razao_social, cnpj, insc_estadual,
        email, telefone, celular, whatsapp, site,
        contato_nome, contato_cargo, contato_telefone,
        cep, endereco, numero, complemento, bairro, cidade, estado,
        banco, agencia, conta, pix_chave,
        contrato, valor_contrato, vencimento_contrato, observacoes
    } = req.body;

    if (!categoria) return res.status(400).json({ erro: 'Categoria é obrigatória.' });

    try {
        const [result] = await pool.query(
            `INSERT INTO colaboradores
            (tipo, categoria, nome, cpf, razao_social, cnpj, insc_estadual,
             email, telefone, celular, whatsapp, site,
             contato_nome, contato_cargo, contato_telefone,
             cep, endereco, numero, complemento, bairro, cidade, estado,
             banco, agencia, conta, pix_chave,
             contrato, valor_contrato, vencimento_contrato, observacoes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [tipo || 'juridica', categoria, nome || null, cpf || null,
            razao_social || null, cnpj || null, insc_estadual || null,
                email, telefone, celular, whatsapp, site,
                contato_nome, contato_cargo, contato_telefone,
                cep, endereco, numero, complemento, bairro, cidade, estado,
                banco, agencia, conta, pix_chave,
                contrato, valor_contrato || null, vencimento_contrato || null, observacoes]
        );
        const [novo] = await pool.query('SELECT * FROM colaboradores WHERE id = ?', [result.insertId]);
        res.status(201).json(novo[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar colaborador.' });
    }
});

// PUT /api/colaboradores/:id
router.put('/:id', async (req, res) => {
    const {
        tipo, categoria, nome, cpf, razao_social, cnpj, insc_estadual,
        email, telefone, celular, whatsapp, site,
        contato_nome, contato_cargo, contato_telefone,
        cep, endereco, numero, complemento, bairro, cidade, estado,
        banco, agencia, conta, pix_chave,
        contrato, valor_contrato, vencimento_contrato, observacoes
    } = req.body;

    try {
        const [result] = await pool.query(
            `UPDATE colaboradores SET
             tipo=?, categoria=?, nome=?, cpf=?, razao_social=?, cnpj=?, insc_estadual=?,
             email=?, telefone=?, celular=?, whatsapp=?, site=?,
             contato_nome=?, contato_cargo=?, contato_telefone=?,
             cep=?, endereco=?, numero=?, complemento=?, bairro=?, cidade=?, estado=?,
             banco=?, agencia=?, conta=?, pix_chave=?,
             contrato=?, valor_contrato=?, vencimento_contrato=?, observacoes=?
             WHERE id=?`,
            [tipo || 'juridica', categoria, nome || null, cpf || null,
            razao_social || null, cnpj || null, insc_estadual || null,
                email, telefone, celular, whatsapp, site,
                contato_nome, contato_cargo, contato_telefone,
                cep, endereco, numero, complemento, bairro, cidade, estado,
                banco, agencia, conta, pix_chave,
                contrato, valor_contrato || null, vencimento_contrato || null, observacoes,
            req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Colaborador não encontrado.' });
        const [atualizado] = await pool.query('SELECT * FROM colaboradores WHERE id = ?', [req.params.id]);
        res.json(atualizado[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao atualizar colaborador.' });
    }
});

// DELETE /api/colaboradores/:id
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM colaboradores WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Colaborador não encontrado.' });
        res.json({ mensagem: 'Colaborador removido com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao remover colaborador.' });
    }
});

module.exports = router;
