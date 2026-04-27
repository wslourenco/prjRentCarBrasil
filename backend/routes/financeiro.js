const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, requireProfiles } = require('../middleware/auth');

router.use(authMiddleware);

let despesasReceitasHasLocadorIdColumnCache;

async function hasFinanceiroLocadorIdColumn() {
    if (typeof despesasReceitasHasLocadorIdColumnCache === 'boolean') {
        return despesasReceitasHasLocadorIdColumnCache;
    }

    const [rows] = await pool.query(
        "SHOW COLUMNS FROM despesas_receitas LIKE 'locador_id'"
    );
    despesasReceitasHasLocadorIdColumnCache = Array.isArray(rows) && rows.length > 0;
    return despesasReceitasHasLocadorIdColumnCache;
}

async function getLocadorIdForUser(usuario) {
    const email = String(usuario?.email || '').trim();
    if (email) {
        const [rowsByEmail] = await pool.query(
            'SELECT id FROM locadores WHERE LOWER(email) = LOWER(?) ORDER BY id ASC LIMIT 1',
            [email]
        );
        if (rowsByEmail[0]?.id) return rowsByEmail[0].id;
    }

    const userId = Number(usuario?.id || 0);
    if (userId) {
        const [rowsById] = await pool.query(
            'SELECT id FROM locadores WHERE id = ? LIMIT 1',
            [userId]
        );
        if (rowsById[0]?.id) return rowsById[0].id;
    }

    return null;
}

async function getLocatarioIdByUserEmail(email) {
    const emailNormalizado = String(email || '').trim();
    if (!emailNormalizado) return null;

    const [rows] = await pool.query(
        'SELECT id FROM locatarios WHERE LOWER(TRIM(email)) = LOWER(?) ORDER BY id ASC LIMIT 1',
        [emailNormalizado]
    );
    return rows[0]?.id || null;
}

async function getLocatarioIdByUserId(userId) {
    const id = Number(userId || 0);
    if (!id) return null;

    const [rows] = await pool.query(
        'SELECT id FROM locatarios WHERE id = ? LIMIT 1',
        [id]
    );
    return rows[0]?.id || null;
}

async function getLocatarioIdFromUsuario(usuario) {
    const byEmail = await getLocatarioIdByUserEmail(usuario?.email);
    if (byEmail) return byEmail;

    const byUserId = await getLocatarioIdByUserId(usuario?.id);
    if (byUserId) return byUserId;

    return null;
}

async function getLocadorIdByVeiculoId(veiculoId) {
    const id = Number(veiculoId || 0);
    if (!id) return null;

    const [rows] = await pool.query(
        'SELECT locador_id FROM veiculos WHERE id = ? LIMIT 1',
        [id]
    );
    return rows[0]?.locador_id ? Number(rows[0].locador_id) : null;
}

async function ensureLocadorContext(req, res) {
    if (req.usuario?.perfil !== 'locador') return null;

    const locadorId = await getLocadorIdForUser(req.usuario);
    if (!locadorId) {
        res.status(403).json({ erro: 'Não foi encontrado cadastro de locador vinculado a este usuário.' });
        return null;
    }
    return locadorId;
}

async function getAuxiliarLocadorIdForUser(usuario) {
    const emailUsuario = String(usuario?.email || '').trim().toLowerCase();
    if (!emailUsuario) return null;

    const [locadorIdColumnRows] = await pool.query(
        "SHOW COLUMNS FROM colaboradores LIKE 'locador_id'"
    );
    const hasLocadorIdColumn = Array.isArray(locadorIdColumnRows) && locadorIdColumnRows.length > 0;

    const [rows] = await pool.query(
        `SELECT c.id, ${hasLocadorIdColumn ? 'c.locador_id' : 'NULL AS locador_id'}, c.email, c.auxiliares_json
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

        const possuiAuxiliar = Array.isArray(auxiliares) && auxiliares.some((aux) => {
            const emailAux = String(aux?.email || aux?.usuario || '').trim().toLowerCase();
            return emailAux && emailAux === emailUsuario;
        });

        if (!possuiAuxiliar) continue;

        if (row.locador_id) {
            return Number(row.locador_id);
        }

        const emailColaborador = String(row.email || '').trim();
        if (emailColaborador) {
            const [locadorByEmail] = await pool.query(
                'SELECT id FROM locadores WHERE LOWER(email) = LOWER(?) ORDER BY id ASC LIMIT 1',
                [emailColaborador]
            );
            if (locadorByEmail[0]?.id) return Number(locadorByEmail[0].id);
        }
    }

    const [locadores] = await pool.query('SELECT id FROM locadores ORDER BY id ASC');
    if (locadores.length === 1) return Number(locadores[0].id);

    return null;
}

// GET /api/financeiro
router.get('/', async (req, res) => {
    try {
        const hasFinanceiroLocadorId = await hasFinanceiroLocadorIdColumn();
        let sql = `
            SELECT dr.*,
                   v.placa AS placa_veiculo,
                 v.marca AS marca_veiculo,
                   CONCAT(v.marca, ' ', v.modelo) AS nome_veiculo,
                   lt.nome AS nome_locatario,
                   COALESCE(col.razao_social, col.nome) AS nome_colaborador
            FROM despesas_receitas dr
            LEFT JOIN veiculos v ON dr.veiculo_id = v.id
            LEFT JOIN locatarios lt ON dr.locatario_id = lt.id
            LEFT JOIN colaboradores col ON dr.colaborador_id = col.id
        `;
        const params = [];

        if (req.usuario?.perfil === 'locador') {
            const locadorId = await ensureLocadorContext(req, res);
            if (!locadorId) return;
            sql += hasFinanceiroLocadorId
                ? ' WHERE COALESCE(dr.locador_id, v.locador_id) = ?'
                : ' WHERE v.locador_id = ?';
            params.push(locadorId);
        } else if (req.usuario?.perfil === 'auxiliar') {
            const locadorId = await getAuxiliarLocadorIdForUser(req.usuario);
            if (!locadorId) return res.status(403).json({ erro: 'Não foi possível identificar o locador responsável por este auxiliar.' });
            sql += hasFinanceiroLocadorId
                ? ' WHERE COALESCE(dr.locador_id, v.locador_id) = ?'
                : ' WHERE v.locador_id = ?';
            params.push(locadorId);
        } else if (req.usuario?.perfil === 'locatario') {
            const locatarioId = await getLocatarioIdFromUsuario(req.usuario);
            if (!locatarioId) return res.json([]);

            sql += `
                WHERE (
                    dr.locatario_id = ?
                    OR EXISTS (
                        SELECT 1
                        FROM locacoes lc
                        WHERE lc.veiculo_id = dr.veiculo_id
                          AND lc.locatario_id = ?
                    )
                )
            `;
            params.push(locatarioId, locatarioId);
        }

        sql += ' ORDER BY dr.data DESC';

        const [rows] = await pool.query(sql, params);
        return res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar lançamentos.' });
    }
});

// GET /api/financeiro/:id
router.get('/:id', async (req, res) => {
    try {
        const hasFinanceiroLocadorId = await hasFinanceiroLocadorIdColumn();
        let sql = 'SELECT dr.* FROM despesas_receitas dr WHERE dr.id = ?';
        const params = [req.params.id];

        if (req.usuario?.perfil === 'locador') {
            const locadorId = await ensureLocadorContext(req, res);
            if (!locadorId) return;
            sql = `
                SELECT dr.*
                FROM despesas_receitas dr
                LEFT JOIN veiculos v ON dr.veiculo_id = v.id
                WHERE dr.id = ? AND ${hasFinanceiroLocadorId ? 'COALESCE(dr.locador_id, v.locador_id)' : 'v.locador_id'} = ?
            `;
            params.push(locadorId);
        } else if (req.usuario?.perfil === 'auxiliar') {
            const locadorId = await getAuxiliarLocadorIdForUser(req.usuario);
            if (!locadorId) return res.status(403).json({ erro: 'Não foi possível identificar o locador responsável por este auxiliar.' });

            sql = `
                SELECT dr.*
                FROM despesas_receitas dr
                LEFT JOIN veiculos v ON dr.veiculo_id = v.id
                WHERE dr.id = ? AND ${hasFinanceiroLocadorId ? 'COALESCE(dr.locador_id, v.locador_id)' : 'v.locador_id'} = ?
            `;
            params.push(locadorId);
        } else if (req.usuario?.perfil === 'locatario') {
            const locatarioId = await getLocatarioIdFromUsuario(req.usuario);
            if (!locatarioId) return res.status(404).json({ erro: 'Lançamento não encontrado.' });

            sql = `
                                SELECT dr.*
                                FROM despesas_receitas dr
                                WHERE dr.id = ?
                                    AND (
                                        dr.locatario_id = ?
                                        OR EXISTS (
                                                SELECT 1
                                                FROM locacoes lc
                                                WHERE lc.veiculo_id = dr.veiculo_id
                                                    AND lc.locatario_id = ?
                                        )
                                    )
                        `;
            params.push(locatarioId, locatarioId);
        }

        const [rows] = await pool.query(sql, params);
        if (rows.length === 0) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar lançamento.' });
    }
});

// POST /api/financeiro
router.post('/', requireProfiles('admin', 'locador', 'auxiliar'), async (req, res) => {
    const {
        tipo, categoria, descricao, valor, data,
        forma_pagamento, comprovante,
        veiculo_id, locatario_id, colaborador_id, observacoes
    } = req.body;

    if (!tipo || !categoria || !valor || !data) {
        return res.status(400).json({ erro: 'Tipo, categoria, valor e data são obrigatórios.' });
    }

    try {
        const hasFinanceiroLocadorId = await hasFinanceiroLocadorIdColumn();
        let locadorIdValue = null;

        if (req.usuario?.perfil === 'locador') {
            const locadorId = await ensureLocadorContext(req, res);
            if (!locadorId) return;
            locadorIdValue = locadorId;

            if (!veiculo_id) {
                return res.status(400).json({ erro: 'Locador deve informar o veículo do lançamento.' });
            }

            const [ownRows] = await pool.query(
                'SELECT id FROM veiculos WHERE id = ? AND locador_id = ? LIMIT 1',
                [veiculo_id, locadorId]
            );
            if (ownRows.length === 0) {
                return res.status(403).json({ erro: 'Você só pode lançar movimentações para veículos vinculados ao seu cadastro.' });
            }
        } else if (req.usuario?.perfil === 'auxiliar') {
            const locadorId = await getAuxiliarLocadorIdForUser(req.usuario);
            if (!locadorId) {
                return res.status(403).json({ erro: 'Não foi possível identificar o locador responsável por este auxiliar.' });
            }
            locadorIdValue = locadorId;

            if (!veiculo_id) {
                return res.status(400).json({ erro: 'Auxiliar deve informar o veículo do lançamento.' });
            }

            const [ownRows] = await pool.query(
                `SELECT v.id
                 FROM veiculos v
                 INNER JOIN locacoes lc ON lc.veiculo_id = v.id AND lc.status = 'ativa'
                 WHERE v.id = ? AND v.locador_id = ?
                 LIMIT 1`,
                [veiculo_id, locadorId]
            );
            if (ownRows.length === 0) {
                return res.status(403).json({ erro: 'Auxiliar só pode lançar movimentações para veículos alugados do seu locador.' });
            }
        } else if (hasFinanceiroLocadorId && veiculo_id) {
            locadorIdValue = await getLocadorIdByVeiculoId(veiculo_id);
        }

        const insertColumns = [
            'tipo', 'categoria', 'descricao', 'valor', 'data',
            'forma_pagamento', 'comprovante',
            'veiculo_id', 'locatario_id', 'colaborador_id', 'observacoes'
        ];
        const insertValues = [
            tipo, categoria, descricao, valor, data,
            forma_pagamento || 'pix', comprovante || null,
            veiculo_id || null, locatario_id || null, colaborador_id || null, observacoes
        ];

        if (hasFinanceiroLocadorId) {
            insertColumns.push('locador_id');
            insertValues.push(locadorIdValue || null);
        }

        const placeholders = insertColumns.map(() => '?').join(',');
        const [result] = await pool.query(
            `INSERT INTO despesas_receitas (${insertColumns.join(', ')}) VALUES (${placeholders})`,
            insertValues
        );
        const [novo] = await pool.query('SELECT * FROM despesas_receitas WHERE id = ?', [result.insertId]);
        res.status(201).json(novo[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar lançamento.' });
    }
});

// PUT /api/financeiro/:id
router.put('/:id', requireProfiles('admin', 'locador', 'auxiliar'), async (req, res) => {
    const {
        tipo, categoria, descricao, valor, data,
        forma_pagamento, comprovante,
        veiculo_id, locatario_id, colaborador_id, observacoes
    } = req.body;

    try {
        const hasFinanceiroLocadorId = await hasFinanceiroLocadorIdColumn();
        let locadorIdValue = null;

        if (req.usuario?.perfil === 'locador') {
            const locadorId = await ensureLocadorContext(req, res);
            if (!locadorId) return;
            locadorIdValue = locadorId;

            if (!veiculo_id) {
                return res.status(400).json({ erro: 'Locador deve informar o veículo do lançamento.' });
            }

            const [ownRows] = await pool.query(
                'SELECT id FROM veiculos WHERE id = ? AND locador_id = ? LIMIT 1',
                [veiculo_id, locadorId]
            );
            if (ownRows.length === 0) {
                return res.status(403).json({ erro: 'Você só pode alterar movimentações dos seus veículos.' });
            }

            const [ownership] = await pool.query(
                `SELECT dr.id
                 FROM despesas_receitas dr
                 LEFT JOIN veiculos v ON dr.veiculo_id = v.id
                 WHERE dr.id = ? AND ${hasFinanceiroLocadorId ? 'COALESCE(dr.locador_id, v.locador_id)' : 'v.locador_id'} = ?
                 LIMIT 1`,
                [req.params.id, locadorId]
            );
            if (ownership.length === 0) {
                return res.status(403).json({ erro: 'Você só pode alterar movimentações dos seus veículos.' });
            }
        } else if (req.usuario?.perfil === 'auxiliar') {
            const locadorId = await getAuxiliarLocadorIdForUser(req.usuario);
            if (!locadorId) {
                return res.status(403).json({ erro: 'Não foi possível identificar o locador responsável por este auxiliar.' });
            }
            locadorIdValue = locadorId;

            if (!veiculo_id) {
                return res.status(400).json({ erro: 'Auxiliar deve informar o veículo do lançamento.' });
            }

            const [ownRows] = await pool.query(
                `SELECT v.id
                 FROM veiculos v
                 INNER JOIN locacoes lc ON lc.veiculo_id = v.id AND lc.status = 'ativa'
                 WHERE v.id = ? AND v.locador_id = ?
                 LIMIT 1`,
                [veiculo_id, locadorId]
            );
            if (ownRows.length === 0) {
                return res.status(403).json({ erro: 'Auxiliar só pode alterar movimentações de veículos alugados do seu locador.' });
            }

            const [ownership] = await pool.query(
                `SELECT dr.id
                 FROM despesas_receitas dr
                 LEFT JOIN veiculos v ON dr.veiculo_id = v.id
                 WHERE dr.id = ? AND ${hasFinanceiroLocadorId ? 'COALESCE(dr.locador_id, v.locador_id)' : 'v.locador_id'} = ?
                 LIMIT 1`,
                [req.params.id, locadorId]
            );
            if (ownership.length === 0) {
                return res.status(403).json({ erro: 'Auxiliar só pode alterar movimentações de veículos do seu locador.' });
            }
        } else if (hasFinanceiroLocadorId && veiculo_id) {
            locadorIdValue = await getLocadorIdByVeiculoId(veiculo_id);
        }

        const updateFields = [
            'tipo=?', 'categoria=?', 'descricao=?', 'valor=?', 'data=?',
            'forma_pagamento=?', 'comprovante=?',
            'veiculo_id=?', 'locatario_id=?', 'colaborador_id=?', 'observacoes=?'
        ];
        const updateValues = [
            tipo, categoria, descricao, valor, data,
            forma_pagamento || 'pix', comprovante || null,
            veiculo_id || null, locatario_id || null, colaborador_id || null, observacoes
        ];

        if (hasFinanceiroLocadorId) {
            updateFields.push('locador_id=?');
            updateValues.push(locadorIdValue || null);
        }

        updateValues.push(req.params.id);

        const [result] = await pool.query(
            `UPDATE despesas_receitas SET ${updateFields.join(', ')} WHERE id=?`,
            updateValues
        );
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
        const [atualizado] = await pool.query('SELECT * FROM despesas_receitas WHERE id = ?', [req.params.id]);
        res.json(atualizado[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao atualizar lançamento.' });
    }
});

// DELETE /api/financeiro/:id
router.delete('/:id', requireProfiles('admin', 'locador', 'auxiliar'), async (req, res) => {
    try {
        const hasFinanceiroLocadorId = await hasFinanceiroLocadorIdColumn();
        if (req.usuario?.perfil === 'locador') {
            const locadorId = await ensureLocadorContext(req, res);
            if (!locadorId) return;

            const [ownership] = await pool.query(
                `SELECT dr.id
                 FROM despesas_receitas dr
                 LEFT JOIN veiculos v ON dr.veiculo_id = v.id
                 WHERE dr.id = ? AND ${hasFinanceiroLocadorId ? 'COALESCE(dr.locador_id, v.locador_id)' : 'v.locador_id'} = ?
                 LIMIT 1`,
                [req.params.id, locadorId]
            );
            if (ownership.length === 0) {
                return res.status(403).json({ erro: 'Você só pode remover movimentações dos seus veículos.' });
            }
        } else if (req.usuario?.perfil === 'auxiliar') {
            const locadorId = await getAuxiliarLocadorIdForUser(req.usuario);
            if (!locadorId) {
                return res.status(403).json({ erro: 'Não foi possível identificar o locador responsável por este auxiliar.' });
            }

            const [ownership] = await pool.query(
                `SELECT dr.id
                 FROM despesas_receitas dr
                 LEFT JOIN veiculos v ON dr.veiculo_id = v.id
                 WHERE dr.id = ? AND ${hasFinanceiroLocadorId ? 'COALESCE(dr.locador_id, v.locador_id)' : 'v.locador_id'} = ?
                 LIMIT 1`,
                [req.params.id, locadorId]
            );
            if (ownership.length === 0) {
                return res.status(403).json({ erro: 'Auxiliar só pode remover movimentações de veículos do seu locador.' });
            }
        }

        const [result] = await pool.query('DELETE FROM despesas_receitas WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
        res.json({ mensagem: 'Lançamento removido com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao remover lançamento.' });
    }
});

module.exports = router;
