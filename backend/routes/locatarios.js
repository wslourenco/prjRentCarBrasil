const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, adminOnly, requireProfiles } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/locatarios
router.get('/', requireProfiles('admin', 'auxiliar'), async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT lt.*, COALESCE(av.media_estrelas, 0) AS pontuacao_media, COALESCE(av.total_avaliacoes, 0) AS total_avaliacoes
             FROM locatarios lt
             LEFT JOIN (
                SELECT locatario_id, ROUND(AVG(media_geral), 2) AS media_estrelas, COUNT(*) AS total_avaliacoes
                FROM locatario_avaliacoes
                GROUP BY locatario_id
             ) av ON av.locatario_id = lt.id
             ORDER BY lt.nome`
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar locatários.' });
    }
});

// GET /api/locatarios/:id
router.get('/:id', requireProfiles('admin', 'auxiliar'), async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT lt.*, COALESCE(av.media_estrelas, 0) AS pontuacao_media, COALESCE(av.total_avaliacoes, 0) AS total_avaliacoes
             FROM locatarios lt
             LEFT JOIN (
                SELECT locatario_id, ROUND(AVG(media_geral), 2) AS media_estrelas, COUNT(*) AS total_avaliacoes
                FROM locatario_avaliacoes
                GROUP BY locatario_id
             ) av ON av.locatario_id = lt.id
             WHERE lt.id = ?`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ erro: 'Locatário não encontrado.' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar locatário.' });
    }
});

// POST /api/locatarios
router.post('/', adminOnly, async (req, res) => {
    const {
        tipo, nome, cpf, rg, data_nascimento, razao_social, cnpj, insc_estadual,
        telefone, celular, email, whatsapp,
        cep, endereco, numero, complemento, bairro, cidade, estado,
        cnh, categoria_cnh, validade_cnh, orgao_emissor_cnh, estado_cnh,
        motorist_app, plataformas_app, avaliacao_app,
        profissao, renda_mensal,
        ref_nome1, ref_telefone1, ref_nome2, ref_telefone2, observacoes
    } = req.body;

    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });

    try {
        const [result] = await pool.query(
            `INSERT INTO locatarios
            (tipo, nome, cpf, rg, data_nascimento, razao_social, cnpj, insc_estadual,
             telefone, celular, email, whatsapp,
             cep, endereco, numero, complemento, bairro, cidade, estado,
             cnh, categoria_cnh, validade_cnh, orgao_emissor_cnh, estado_cnh,
             motorist_app, plataformas_app, avaliacao_app,
             profissao, renda_mensal,
             ref_nome1, ref_telefone1, ref_nome2, ref_telefone2, observacoes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [tipo || 'fisica', nome, cpf, rg, data_nascimento || null,
            razao_social || null, cnpj || null, insc_estadual || null,
                telefone, celular, email, whatsapp,
                cep, endereco, numero, complemento, bairro, cidade, estado,
                cnh, categoria_cnh || 'B', validade_cnh || null, orgao_emissor_cnh, estado_cnh,
            motorist_app ? 1 : 0, plataformas_app, avaliacao_app,
                profissao, renda_mensal || null,
                ref_nome1, ref_telefone1, ref_nome2, ref_telefone2, observacoes]
        );
        const [novo] = await pool.query('SELECT * FROM locatarios WHERE id = ?', [result.insertId]);
        res.status(201).json(novo[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar locatário.' });
    }
});

// PUT /api/locatarios/:id
router.put('/:id', adminOnly, async (req, res) => {
    const {
        tipo, nome, cpf, rg, data_nascimento, razao_social, cnpj, insc_estadual,
        telefone, celular, email, whatsapp,
        cep, endereco, numero, complemento, bairro, cidade, estado,
        cnh, categoria_cnh, validade_cnh, orgao_emissor_cnh, estado_cnh,
        motorist_app, plataformas_app, avaliacao_app,
        profissao, renda_mensal,
        ref_nome1, ref_telefone1, ref_nome2, ref_telefone2, observacoes
    } = req.body;

    try {
        const [result] = await pool.query(
            `UPDATE locatarios SET
             tipo=?, nome=?, cpf=?, rg=?, data_nascimento=?, razao_social=?, cnpj=?, insc_estadual=?,
             telefone=?, celular=?, email=?, whatsapp=?,
             cep=?, endereco=?, numero=?, complemento=?, bairro=?, cidade=?, estado=?,
             cnh=?, categoria_cnh=?, validade_cnh=?, orgao_emissor_cnh=?, estado_cnh=?,
             motorist_app=?, plataformas_app=?, avaliacao_app=?,
             profissao=?, renda_mensal=?,
             ref_nome1=?, ref_telefone1=?, ref_nome2=?, ref_telefone2=?, observacoes=?
             WHERE id=?`,
            [tipo || 'fisica', nome, cpf, rg, data_nascimento || null,
            razao_social || null, cnpj || null, insc_estadual || null,
                telefone, celular, email, whatsapp,
                cep, endereco, numero, complemento, bairro, cidade, estado,
                cnh, categoria_cnh || 'B', validade_cnh || null, orgao_emissor_cnh, estado_cnh,
            motorist_app ? 1 : 0, plataformas_app, avaliacao_app,
                profissao, renda_mensal || null,
                ref_nome1, ref_telefone1, ref_nome2, ref_telefone2, observacoes,
            req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Locatário não encontrado.' });
        const [atualizado] = await pool.query('SELECT * FROM locatarios WHERE id = ?', [req.params.id]);
        res.json(atualizado[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao atualizar locatário.' });
    }
});

// DELETE /api/locatarios/:id
router.delete('/:id', adminOnly, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM locatarios WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Locatário não encontrado.' });
        res.json({ mensagem: 'Locatário removido com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao remover locatário.' });
    }
});

module.exports = router;
