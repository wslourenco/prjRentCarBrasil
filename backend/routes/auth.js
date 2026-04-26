const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { sanitizeProfile, normalizeDocumento, requiresRg } = require('../utils/auth-utils');

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

async function getLocatarioProfileForUser(db, usuario) {
    const perfil = String(usuario?.perfil || '').toLowerCase();
    if (perfil !== 'locatario') return null;

    const email = String(usuario?.email || '').trim();
    const userId = Number(usuario?.id || 0);

    let rows = [];
    if (email) {
        const [byEmail] = await db.query(
            `SELECT id, nome, email, cpf, rg, telefone, celular, endereco, numero, complemento, bairro, cidade, estado, cep
             FROM locatarios
             WHERE LOWER(TRIM(email)) = LOWER(?)
             ORDER BY id ASC
             LIMIT 1`,
            [email]
        );
        rows = byEmail;
    }

    if ((!rows || rows.length === 0) && userId) {
        const [byId] = await db.query(
            `SELECT id, nome, email, cpf, rg, telefone, celular, endereco, numero, complemento, bairro, cidade, estado, cep
             FROM locatarios
             WHERE id = ?
             LIMIT 1`,
            [userId]
        );
        rows = byId;
    }

    if (!rows || rows.length === 0) return null;
    return rows[0];
}

async function getAuxiliarLocadorForUser(db, usuario) {
    const perfil = String(usuario?.perfil || '').trim().toLowerCase();
    if (perfil !== 'auxiliar') return null;

    const emailUsuario = String(usuario?.email || '').trim().toLowerCase();
    if (!emailUsuario) return null;

    const [locadorIdColumnRows] = await db.query(
        "SHOW COLUMNS FROM colaboradores LIKE 'locador_id'"
    );
    const hasLocadorIdColumn = Array.isArray(locadorIdColumnRows) && locadorIdColumnRows.length > 0;

    const [rows] = await db.query(
        `SELECT ${hasLocadorIdColumn ? 'c.locador_id' : 'NULL AS locador_id'}, c.email, c.auxiliares_json
         FROM colaboradores c
         WHERE c.categoria = 'Auxiliar Administrativo'
           AND c.auxiliares_json IS NOT NULL
         ORDER BY c.atualizado_em DESC, c.id DESC`
    );

    for (const row of rows) {
        let auxiliares = [];
        try {
            auxiliares = JSON.parse(row.auxiliares_json || '[]');
        } catch {
            auxiliares = [];
        }

        const pertenceAoColaborador = Array.isArray(auxiliares) && auxiliares.some((aux) => {
            const emailAux = String(aux?.email || aux?.usuario || '').trim().toLowerCase();
            return emailAux && emailAux === emailUsuario;
        });

        if (!pertenceAoColaborador) continue;

        let locadorId = row.locador_id ? Number(row.locador_id) : null;

        if (!locadorId) {
            const emailColaborador = String(row.email || '').trim();
            if (emailColaborador) {
                const [locadorByEmail] = await db.query(
                    'SELECT id FROM locadores WHERE LOWER(email) = LOWER(?) ORDER BY id ASC LIMIT 1',
                    [emailColaborador]
                );
                if (locadorByEmail[0]?.id) locadorId = Number(locadorByEmail[0].id);
            }
        }

        if (!locadorId) continue;

        const [locadorRows] = await db.query(
            `SELECT id, nome, email, tipo, cpf, cnpj
             FROM locadores
             WHERE id = ?
             LIMIT 1`,
            [locadorId]
        );

        if (locadorRows.length > 0) return locadorRows[0];
    }

    const [locadores] = await db.query(
        'SELECT id, nome, email, tipo, cpf, cnpj FROM locadores ORDER BY id ASC'
    );
    if (locadores.length === 1) return locadores[0];

    return null;
}

async function getLocadorProfileForUser(db, usuario) {
    const perfil = String(usuario?.perfil || '').trim().toLowerCase();
    if (perfil !== 'locador') return null;

    const email = String(usuario?.email || '').trim();
    if (!email) return null;

    const [rows] = await db.query(
        `SELECT id, nome, email, tipo, cpf, cnpj
         FROM locadores
         WHERE LOWER(TRIM(email)) = LOWER(?)
         ORDER BY id ASC
         LIMIT 1`,
        [email]
    );

    if (!rows || rows.length === 0) return null;
    return rows[0];
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { nome, email, senha, perfil, tipoDocumento, documento, rg } = req.body;
    const perfilEscolhido = sanitizeProfile(perfil);
    const tipoDoc = (tipoDocumento === 'cnpj') ? 'cnpj' : 'cpf';
    const doc = normalizeDocumento(documento);
    const rgLimpo = String(rg || '').trim();

    if (!nome || !email || !senha || !perfilEscolhido || !tipoDoc || !doc) {
        return res.status(400).json({ erro: 'Nome, email, senha, perfil, tipo de documento e documento são obrigatórios.' });
    }

    if (requiresRg(tipoDoc) && !rgLimpo) {
        return res.status(400).json({ erro: 'RG é obrigatório para cadastro com CPF.' });
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
            'INSERT INTO usuarios (nome, email, senha_hash, perfil, tipo_documento, documento) VALUES (?,?,?,?,?,?)',
            [nome, email, hash, perfilEscolhido, tipoDoc, doc]
        );

        if (perfilEscolhido === 'locador') {
            await conn.query(
                'INSERT INTO locadores (tipo, nome, email, cpf, rg) VALUES (?,?,?,?,?)',
                ['fisica', nome, email, tipoDoc === 'cpf' ? doc : null, rgLimpo || null]
            );
        } else {
            await conn.query(
                'INSERT INTO locatarios (tipo, nome, email, cpf, rg, categoria_cnh, motorist_app) VALUES (?,?,?,?,?,?,?)',
                ['fisica', nome, email, tipoDoc === 'cpf' ? doc : null, rgLimpo || null, 'B', 0]
            );
        }

        await conn.commit();

        const usuario = {
            id: result.insertId,
            nome,
            email,
            perfil: perfilEscolhido,
            tipo_documento: tipoDoc,
            documento: doc,
            rg: rgLimpo || null,
        };
        const token = buildJwtToken(usuario);
        const locatario = await getLocatarioProfileForUser(conn, usuario);
        return res.status(201).json({ token, usuario, locatario });
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

        const locatario = await getLocatarioProfileForUser(pool, usuario);

        res.json({
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                perfil: usuario.perfil,
                tipo_documento: usuario.tipo_documento,
                documento: usuario.documento,
                rg: locatario?.rg || null,
                senha_deve_trocar: usuario.senha_deve_trocar ? true : false,
            },
            locatario,
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

// PUT /api/auth/trocar-senha
router.put('/trocar-senha', authMiddleware, async (req, res) => {
    const { novaSenha } = req.body;
    if (!novaSenha || String(novaSenha).length < 6) {
        return res.status(400).json({ erro: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }
    try {
        const hash = await bcrypt.hash(novaSenha, 10);
        const [result] = await pool.query(
            'UPDATE usuarios SET senha_hash=?, senha_deve_trocar=0 WHERE id=?',
            [hash, req.usuario.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });
        res.json({ mensagem: 'Senha alterada com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao alterar senha.' });
    }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, nome, email, perfil, tipo_documento, documento FROM usuarios WHERE id = ? AND ativo = TRUE',
            [req.usuario.id]
        );
        if (rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });
        const usuario = rows[0];
        const locatario = await getLocatarioProfileForUser(pool, usuario);
        const locadorVinculado = await getAuxiliarLocadorForUser(pool, usuario);
        const locadorProprio = await getLocadorProfileForUser(pool, usuario);
        res.json({
            ...usuario,
            rg: locatario?.rg || null,
            locatario,
            locador_vinculado: locadorVinculado ?? null,
            locador_proprio: locadorProprio ?? null,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
});

module.exports = router;
