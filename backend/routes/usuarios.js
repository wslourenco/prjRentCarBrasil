const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use(authMiddleware, adminOnly);

// GET /api/usuarios
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, nome, email, perfil, ativo, criado_em FROM usuarios ORDER BY nome'
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar usuários.' });
    }
});

// POST /api/usuarios
router.post('/', async (req, res) => {
    const { nome, email, senha, perfil } = req.body;
    if (!nome || !email || !senha || !perfil) {
        return res.status(400).json({ erro: 'Nome, email, senha e perfil são obrigatórios.' });
    }

    try {
        const hash = await bcrypt.hash(senha, 10);
        const [result] = await pool.query(
            'INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?,?,?,?)',
            [nome, email, hash, perfil]
        );
        const [novo] = await pool.query(
            'SELECT id, nome, email, perfil, ativo, criado_em FROM usuarios WHERE id = ?',
            [result.insertId]
        );
        res.status(201).json(novo[0]);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Já existe um usuário com esse email.' });
        }
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar usuário.' });
    }
});

// PUT /api/usuarios/:id
router.put('/:id', async (req, res) => {
    const { nome, email, perfil, ativo, senha } = req.body;

    try {
        let query, params;
        if (senha) {
            const hash = await bcrypt.hash(senha, 10);
            query = 'UPDATE usuarios SET nome=?, email=?, perfil=?, ativo=?, senha_hash=? WHERE id=?';
            params = [nome, email, perfil, ativo !== undefined ? ativo : true, hash, req.params.id];
        } else {
            query = 'UPDATE usuarios SET nome=?, email=?, perfil=?, ativo=? WHERE id=?';
            params = [nome, email, perfil, ativo !== undefined ? ativo : true, req.params.id];
        }

        const [result] = await pool.query(query, params);
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });
        const [atualizado] = await pool.query(
            'SELECT id, nome, email, perfil, ativo, criado_em FROM usuarios WHERE id = ?',
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
