const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

function sanitizeProfile(profile) {
    const normalized = String(profile || '').trim().toLowerCase();
    return ['locador', 'locatario'].includes(normalized) ? normalized : '';
}

function buildTokenPayload(usuario) {
    return { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil };
}

function buildJwtToken(usuario) {
    const jwtSecret = String(process.env.JWT_SECRET || '').trim().replace(/^['"]|['"]$/g, '');
    if (!jwtSecret) {
        const err = new Error('Configuração de autenticação ausente.');
        err.status = 500;
        throw err;
    }

    const rawExpiresIn = String(process.env.JWT_EXPIRES_IN || '8h').trim().replace(/^['"]|['"]$/g, '');
    const expiresIn = /^(\d+|\d+\s*(ms|s|m|h|d|w|y))$/i.test(rawExpiresIn) ? rawExpiresIn : '8h';

    return jwt.sign(buildTokenPayload(usuario), jwtSecret, { expiresIn });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { nome, email, senha, perfil } = req.body;
    const perfilEscolhido = sanitizeProfile(perfil);

    if (!nome || !email || !senha || !perfilEscolhido) {
        return res.status(400).json({ erro: 'Nome, email, senha e perfil (locador ou locatário) são obrigatórios.' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [existente] = await conn.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existente.length > 0) {
            await conn.rollback();
            return res.status(409).json({ erro: 'Já existe um usuário com esse email.' });
        }

        const hash = await bcrypt.hash(senha, 10);
        const [result] = await conn.query(
            'INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?,?,?,?)',
            [nome, email, hash, perfilEscolhido]
        );

        if (perfilEscolhido === 'locador') {
            await conn.query(
                'INSERT INTO locadores (tipo, nome, email) VALUES (?,?,?)',
                ['fisica', nome, email]
            );
        } else {
            await conn.query(
                'INSERT INTO locatarios (tipo, nome, email, categoria_cnh, motorist_app) VALUES (?,?,?,?,?)',
                ['fisica', nome, email, 'B', 0]
            );
        }

        await conn.commit();

        const usuario = { id: result.insertId, nome, email, perfil: perfilEscolhido };
        const token = buildJwtToken(usuario);
        return res.status(201).json({ token, usuario });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        return res.status(err.status || 500).json({ erro: err.message || 'Erro ao registrar usuário.' });
    } finally {
        conn.release();
    }
});

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

        const token = buildJwtToken(usuario);

        res.json({
            token,
            usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil }
        });
    } catch (err) {
        console.error(err);
        if (req.query?.debug === '1') {
            return res.status(500).json({
                erro: err.message || 'Erro interno no servidor.',
                code: err.code || null
            });
        }
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
