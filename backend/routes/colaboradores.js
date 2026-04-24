const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authMiddleware, adminOnly, requireProfiles } = require('../middleware/auth');

router.use(authMiddleware);

/**
 * Para cada auxiliar com senha informada, cria ou atualiza o usuário no sistema
 * com perfil='auxiliar' e senha_deve_trocar=1.
 * Auxiliares sem senha mantêm credenciais existentes inalteradas.
 */
async function sincronizarUsuariosAuxiliares(conn, auxiliares) {
    for (const aux of auxiliares) {
        const email = String(aux.usuario || aux.email || '').trim().toLowerCase();
        const nome = String(aux.nome || '').trim();
        const senha = String(aux.senha || '').trim();
        if (!email || !nome) continue;

        const [existente] = await conn.query(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );

        if (existente.length > 0) {
            // Atualiza nome e, se senha fornecida, reseta hash + obriga troca
            if (senha) {
                const hash = await bcrypt.hash(senha, 10);
                await conn.query(
                    'UPDATE usuarios SET nome=?, senha_hash=?, perfil=?, ativo=1, senha_deve_trocar=1 WHERE email=?',
                    [nome, hash, 'auxiliar', email]
                );
            } else {
                await conn.query(
                    'UPDATE usuarios SET nome=?, perfil=?, ativo=1 WHERE email=?',
                    [nome, 'auxiliar', email]
                );
            }
        } else if (senha) {
            const hash = await bcrypt.hash(senha, 10);
            await conn.query(
                `INSERT INTO usuarios (nome, email, senha_hash, perfil, tipo_documento, documento, senha_deve_trocar)
                 VALUES (?, ?, ?, 'auxiliar', 'cpf', '', 1)`,
                [nome, email, hash]
            );
        }
    }
}

// GET /api/colaboradores
router.get('/', requireProfiles('admin', 'locador'), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM colaboradores ORDER BY nome');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar colaboradores.' });
    }
});

// GET /api/colaboradores/:id
router.get('/:id', requireProfiles('admin', 'locador'), async (req, res) => {
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
router.post('/', requireProfiles('admin', 'locador'), async (req, res) => {
    const perfil = req.usuario?.perfil;

    const {
        tipo, categoria, nome, cpf, razao_social, cnpj, insc_estadual,
        email, telefone, celular, whatsapp, site,
        contato_nome, contato_cargo, contato_telefone,
        cep, endereco, numero, complemento, bairro, cidade, estado,
        banco, agencia, conta, pix_chave,
        contrato, valor_contrato, vencimento_contrato, observacoes,
        auxiliares,
    } = req.body;

    if (!categoria) return res.status(400).json({ erro: 'Categoria é obrigatória.' });

    // Locador só pode cadastrar Auxiliar Administrativo
    if (perfil === 'locador' && categoria !== 'Auxiliar Administrativo') {
        return res.status(403).json({ erro: 'Locadores só podem cadastrar Auxiliares Administrativos.' });
    }

    const auxiliaresArr = Array.isArray(auxiliares) ? auxiliares : [];
    const auxiliaresJson = auxiliaresArr.length > 0
        ? JSON.stringify(auxiliaresArr.map(({ senha: _senha, ...rest }) => rest))
        : null;

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [result] = await conn.query(
            `INSERT INTO colaboradores
            (tipo, categoria, nome, cpf, razao_social, cnpj, insc_estadual,
             email, telefone, celular, whatsapp, site,
             contato_nome, contato_cargo, contato_telefone,
             cep, endereco, numero, complemento, bairro, cidade, estado,
             banco, agencia, conta, pix_chave,
             contrato, valor_contrato, vencimento_contrato, observacoes, auxiliares_json)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [tipo || 'juridica', categoria, nome || null, cpf || null,
            razao_social || null, cnpj || null, insc_estadual || null,
                email, telefone, celular, whatsapp, site,
                contato_nome, contato_cargo, contato_telefone,
                cep, endereco, numero, complemento, bairro, cidade, estado,
                banco, agencia, conta, pix_chave,
                contrato, valor_contrato || null, vencimento_contrato || null, observacoes,
                auxiliaresJson]
        );

        if (categoria === 'Auxiliar Administrativo' && auxiliaresArr.length > 0) {
            await sincronizarUsuariosAuxiliares(conn, auxiliaresArr);
        }

        await conn.commit();

        const [novo] = await pool.query('SELECT * FROM colaboradores WHERE id = ?', [result.insertId]);
        res.status(201).json(novo[0]);
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar colaborador.' });
    } finally {
        conn.release();
    }
});

// PUT /api/colaboradores/:id — admin ou locador
router.put('/:id', requireProfiles('admin', 'locador'), async (req, res) => {
    const {
        tipo, categoria, nome, cpf, razao_social, cnpj, insc_estadual,
        email, telefone, celular, whatsapp, site,
        contato_nome, contato_cargo, contato_telefone,
        cep, endereco, numero, complemento, bairro, cidade, estado,
        banco, agencia, conta, pix_chave,
        contrato, valor_contrato, vencimento_contrato, observacoes,
        auxiliares,
    } = req.body;

    const auxiliaresArr = Array.isArray(auxiliares) ? auxiliares : [];
    const auxiliaresJson = auxiliaresArr.length > 0
        ? JSON.stringify(auxiliaresArr.map(({ senha: _senha, ...rest }) => rest))
        : null;

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [result] = await conn.query(
            `UPDATE colaboradores SET
             tipo=?, categoria=?, nome=?, cpf=?, razao_social=?, cnpj=?, insc_estadual=?,
             email=?, telefone=?, celular=?, whatsapp=?, site=?,
             contato_nome=?, contato_cargo=?, contato_telefone=?,
             cep=?, endereco=?, numero=?, complemento=?, bairro=?, cidade=?, estado=?,
             banco=?, agencia=?, conta=?, pix_chave=?,
             contrato=?, valor_contrato=?, vencimento_contrato=?, observacoes=?, auxiliares_json=?
             WHERE id=?`,
            [tipo || 'juridica', categoria, nome || null, cpf || null,
            razao_social || null, cnpj || null, insc_estadual || null,
                email, telefone, celular, whatsapp, site,
                contato_nome, contato_cargo, contato_telefone,
                cep, endereco, numero, complemento, bairro, cidade, estado,
                banco, agencia, conta, pix_chave,
                contrato, valor_contrato || null, vencimento_contrato || null, observacoes,
                auxiliaresJson, req.params.id]
        );

        if (result.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ erro: 'Colaborador não encontrado.' });
        }

        if (categoria === 'Auxiliar Administrativo' && auxiliaresArr.length > 0) {
            await sincronizarUsuariosAuxiliares(conn, auxiliaresArr);
        }

        await conn.commit();

        const [atualizado] = await pool.query('SELECT * FROM colaboradores WHERE id = ?', [req.params.id]);
        res.json(atualizado[0]);
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ erro: 'Erro ao atualizar colaborador.' });
    } finally {
        conn.release();
    }
});

// DELETE /api/colaboradores/:id — somente admin
router.delete('/:id', adminOnly, async (req, res) => {
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
