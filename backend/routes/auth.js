const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) {
        return res.status(400).json({ erro: 'Email e senha são obrigatórios.' });
    }

    try {
        const [rows] = await pool.query(
            'SELECT * FROM usuarios WHERE email = ? AND ativo = TRUE',
            [email]
        );
        if (rows.length === 0) {
            return res.status(401).json({ erro: 'Credenciais inválidas.' });
        }

        const usuario = rows[0];
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaCorreta) {
            return res.status(401).json({ erro: 'Credenciais inválidas.' });
        }

        const jwtSecret = (process.env.JWT_SECRET || '').trim();
        if (!jwtSecret) {
            return res.status(500).json({ erro: 'Configuração de autenticação ausente.' });
        }

        const token = jwt.sign(
            { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
            jwtSecret,
            { expiresIn: (process.env.JWT_EXPIRES_IN || '8h').trim() || '8h' }
        );

        res.json({
            token,
            usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, nome, email, perfil FROM usuarios WHERE id = ? AND ativo = TRUE',
            [req.usuario.id]
        );
        if (rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
});

module.exports = router;
