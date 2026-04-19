const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use(authMiddleware, adminOnly);

function normalizePerfil(perfil) {
    return String(perfil || '').trim().toLowerCase();
}

async function ensureProfileRecord(conn, perfil, nome, email) {
    if (perfil === 'locador') {
        const [existing] = await conn.query(
            'SELECT id FROM locadores WHERE email = ? ORDER BY id ASC LIMIT 1',
            [email]
        );
        if (existing.length === 0) {
            await conn.query(
                'INSERT INTO locadores (tipo, nome, email) VALUES (?,?,?)',
                ['fisica', nome, email]
            );
        }
    }

    if (perfil === 'locatario') {
        const [existing] = await conn.query(
            'SELECT id FROM locatarios WHERE email = ? ORDER BY id ASC LIMIT 1',
            [email]
        );
        if (existing.length === 0) {
            await conn.query(
                'INSERT INTO locatarios (tipo, nome, email, categoria_cnh, motorist_app) VALUES (?,?,?,?,?)',
                ['fisica', nome, email, 'B', 0]
            );
        }
    }
}

// GET /api/usuarios
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, nome, email, perfil, tipo_documento, documento, ativo, criado_em FROM usuarios ORDER BY nome'
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar usuários.' });
    }
});

// POST /api/usuarios
router.post('/', async (req, res) => {
    const { nome, email, senha, perfil, tipoDocumento, documento } = req.body;
    const perfilNormalizado = normalizePerfil(perfil);
    const tipoDoc = (tipoDocumento === 'cnpj') ? 'cnpj' : 'cpf';
    const doc = String(documento || '').replace(/\D/g, '');

    if (!nome || !email || !senha || !perfilNormalizado || !tipoDoc || !doc) {
        return res.status(400).json({ erro: 'Nome, email, senha, perfil, tipo de documento e documento são obrigatórios.' });
    }

    if (!['admin', 'locador', 'locatario'].includes(perfilNormalizado)) {
        return res.status(400).json({ erro: 'Perfil inválido. Use admin, locador ou locatario.' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const hash = await bcrypt.hash(senha, 10);
        const [result] = await conn.query(
            'INSERT INTO usuarios (nome, email, senha_hash, perfil, tipo_documento, documento) VALUES (?,?,?,?,?,?)',
            [nome, email, hash, perfilNormalizado, tipoDoc, doc]
        );

        await ensureProfileRecord(conn, perfilNormalizado, nome, email);

        await conn.commit();

        const [novo] = await pool.query(
            'SELECT id, nome, email, perfil, tipo_documento, documento, ativo, criado_em FROM usuarios WHERE id = ?',
            [result.insertId]
        );
        res.status(201).json(novo[0]);
    } catch (err) {
        await conn.rollback();
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Já existe um usuário com esse email.' });
        }
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar usuário.' });
    } finally {
        conn.release();
    }
});

// PUT /api/usuarios/:id
router.put('/:id', async (req, res) => {
    const { nome, email, perfil, ativo, senha, tipoDocumento, documento } = req.body;

    try {
        let query, params;
        const tipoDoc = (tipoDocumento === 'cnpj') ? 'cnpj' : 'cpf';
        const doc = String(documento || '').replace(/\D/g, '');
        if (senha) {
            const hash = await bcrypt.hash(senha, 10);
            query = 'UPDATE usuarios SET nome=?, email=?, perfil=?, ativo=?, senha_hash=?, tipo_documento=?, documento=? WHERE id=?';
            params = [nome, email, perfil, ativo !== undefined ? ativo : true, hash, tipoDoc, doc, req.params.id];
        } else {
            query = 'UPDATE usuarios SET nome=?, email=?, perfil=?, ativo=?, tipo_documento=?, documento=? WHERE id=?';
            params = [nome, email, perfil, ativo !== undefined ? ativo : true, tipoDoc, doc, req.params.id];
        }

        const [result] = await pool.query(query, params);
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });
        const [atualizado] = await pool.query(
            'SELECT id, nome, email, perfil, tipo_documento, documento, ativo, criado_em FROM usuarios WHERE id = ?',
            [req.params.id]
        );
        res.json(atualizado[0]);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Já existe um usuário com esse email.' });
        }
        console.error(err);
        res.status(500).json({ erro: 'Erro ao atualizar usuário.' });
    }
});

// DELETE /api/usuarios/:id
router.delete('/:id', async (req, res) => {
    if (parseInt(req.params.id) === req.usuario.id) {
        return res.status(400).json({ erro: 'Você não pode excluir sua própria conta.' });
    }
    try {
        const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });
        res.json({ mensagem: 'Usuário removido com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao remover usuário.' });
    }
});

module.exports = router;
