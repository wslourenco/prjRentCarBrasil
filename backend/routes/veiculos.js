const axios = require('axios');
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, requireProfiles } = require('../middleware/auth');

router.use(authMiddleware);

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

async function getAuxiliarLocadorIdForUser(usuario) {
    const emailUsuario = String(usuario?.email || '').trim().toLowerCase();
    if (!emailUsuario) return null;

    const [locadorIdColumnRows] = await pool.query(
        "SHOW COLUMNS FROM colaboradores LIKE 'locador_id'"
    );
    const hasLocadorIdColumn = Array.isArray(locadorIdColumnRows) && locadorIdColumnRows.length > 0;

    const [rows] = await pool.query(
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

        const possuiAuxiliar = Array.isArray(auxiliares) && auxiliares.some((aux) => {
            const emailAux = String(aux?.email || aux?.usuario || '').trim().toLowerCase();
            return emailAux && emailAux === emailUsuario;
        });

        if (!possuiAuxiliar) continue;

        if (row.locador_id) return Number(row.locador_id);

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

async function buscarValorFipe(marca, modelo, ano) {
    try {
        const marcasResp = await axios.get('https://fipe.parallelum.com.br/api/v2/cars/brands');
        const marcaObj = marcasResp.data.find(m => m.name.toLowerCase() === String(marca).toLowerCase());
        if (!marcaObj) return null;

        const modelosResp = await axios.get(`https://fipe.parallelum.com.br/api/v2/cars/brands/${marcaObj.code}/models`);
        const modeloObj = modelosResp.data.find(m => m.name.toLowerCase() === String(modelo).toLowerCase());
        if (!modeloObj) return null;

        const anosResp = await axios.get(`https://fipe.parallelum.com.br/api/v2/cars/brands/${marcaObj.code}/models/${modeloObj.code}/years`);
        let anoObj = anosResp.data.find(a => String(a.code).includes(String(ano)));
        if (!anoObj) anoObj = anosResp.data[0];
        if (!anoObj) return null;

        const valorResp = await axios.get(`https://fipe.parallelum.com.br/api/v2/cars/brands/${marcaObj.code}/models/${modeloObj.code}/years/${anoObj.code}`);
        return valorResp.data.price || null;
    } catch {
        return null;
    }
}

function normalizarValorFipe(valor) {
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
    if (typeof valor !== 'string') return null;

    const limpo = valor
        .replace(/[^\d,.-]/g, '')
        .replace(/\.(?=\d{3}(\D|$))/g, '')
        .replace(',', '.');

    const numero = Number(limpo);
    return Number.isFinite(numero) ? numero : null;
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

// GET /api/veiculos
router.get('/', async (req, res) => {
    try {
        let sql = `
            SELECT v.*,
                   COALESCE(l.razao_social, l.nome) AS nome_locador,
                   l.cidade AS cidade_locador,
                   l.estado AS estado_locador
            FROM veiculos v
            LEFT JOIN locadores l ON v.locador_id = l.id
        `;
        const params = [];

        if (req.usuario?.perfil === 'locador') {
            const locadorId = await ensureLocadorContext(req, res);
            if (!locadorId) return;
            sql += ' WHERE v.locador_id = ?';
            params.push(locadorId);
        } else if (req.usuario?.perfil === 'auxiliar') {
            const locadorId = await getAuxiliarLocadorIdForUser(req.usuario);
            if (!locadorId) return res.json([]);
            sql += ' WHERE v.locador_id = ?';
            params.push(locadorId);
        } else if (req.usuario?.perfil === 'locatario') {
            sql += `
                LEFT JOIN locacoes lc_ativa
                  ON lc_ativa.veiculo_id = v.id
                                 AND lc_ativa.status = 'ativa'
                 AND lc_ativa.data_encerramento IS NULL
                 AND (lc_ativa.data_previsao_fim IS NULL OR lc_ativa.data_previsao_fim >= CURDATE())
                WHERE lc_ativa.id IS NULL
            `;
        }

        sql += ' ORDER BY v.placa';

        // Busca todos os veículos
        const [rows] = await pool.query(sql, params);

        // Atualiza valor FIPE de cada veículo
        for (const v of rows) {
            if (!v.marca || !v.modelo || !v.ano_modelo) continue;

            try {
                const valorFipeBruto = await buscarValorFipe(v.marca, v.modelo, v.ano_modelo);
                const valorFipe = normalizarValorFipe(valorFipeBruto);
                const valorAtual = normalizarValorFipe(v.valor_fipe);

                if (valorFipe != null && valorFipe !== valorAtual) {
                    await pool.query('UPDATE veiculos SET valor_fipe = ? WHERE id = ?', [valorFipe, v.id]);
                    v.valor_fipe = valorFipe;
                }
            } catch (updateError) {
                console.warn(`Falha ao atualizar FIPE do veículo ${v.id}:`, updateError?.message || updateError);
            }
        }

        return res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar veículos.' });
    }
});

// GET /api/veiculos/:id
router.get('/:id', async (req, res) => {
    try {
        let sql = `
            SELECT v.*,
                   COALESCE(l.razao_social, l.nome) AS nome_locador
            FROM veiculos v
            LEFT JOIN locadores l ON v.locador_id = l.id
            WHERE v.id = ?
        `;
        const params = [req.params.id];

        if (req.usuario?.perfil === 'locador') {
            const locadorId = await ensureLocadorContext(req, res);
            if (!locadorId) return;
            sql += ' AND v.locador_id = ?';
            params.push(locadorId);
        } else if (req.usuario?.perfil === 'auxiliar') {
            const locadorId = await getAuxiliarLocadorIdForUser(req.usuario);
            if (!locadorId) return res.status(404).json({ erro: 'Veículo não encontrado.' });
            sql += ' AND v.locador_id = ?';
            params.push(locadorId);
        } else if (req.usuario?.perfil === 'locatario') {
            sql += `
                AND NOT EXISTS (
                    SELECT 1
                    FROM locacoes lc_ativa
                    WHERE lc_ativa.veiculo_id = v.id
                                            AND lc_ativa.status = 'ativa'
                      AND lc_ativa.data_encerramento IS NULL
                      AND (lc_ativa.data_previsao_fim IS NULL OR lc_ativa.data_previsao_fim >= CURDATE())
                )
            `;
        }

        const [rows] = await pool.query(sql, params);
        if (rows.length === 0) return res.status(404).json({ erro: 'Veículo não encontrado.' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar veículo.' });
    }
});

// POST /api/veiculos
router.post('/', requireProfiles('admin', 'locador', 'auxiliar'), async (req, res) => {
    const {
        placa, marca, modelo, ano_fabricacao, ano_modelo, cor, combustivel,
        transmissao, nr_portas, capacidade,
        renavam, chassi, km_atual, km_compra, km_troca_oleo, km_troca_correia, km_troca_pneu,
        data_compra, valor_compra, valor_fipe,
        seguradora, nr_apolice, vencimento_seguro,
        data_licenciamento, data_vistoria,
        bloqueador, nr_bloqueador, locador_id, valor_diario, foto, observacoes
    } = req.body;

    if (!placa || !marca || !modelo) {
        return res.status(400).json({ erro: 'Placa, marca e modelo são obrigatórios.' });
    }

    try {
        let locadorIdValue = locador_id || null;
        if (req.usuario?.perfil === 'locador') {
            const locadorId = await ensureLocadorContext(req, res);
            if (!locadorId) return;
            locadorIdValue = locadorId;
        }

        const [result] = await pool.query(
            `INSERT INTO veiculos
            (placa, marca, modelo, ano_fabricacao, ano_modelo, cor, combustivel,
             transmissao, nr_portas, capacidade,
             renavam, chassi, km_atual, km_compra, km_troca_oleo, km_troca_correia, km_troca_pneu,
             data_compra, valor_compra, valor_fipe,
             seguradora, nr_apolice, vencimento_seguro,
             data_licenciamento, data_vistoria,
             bloqueador, nr_bloqueador, locador_id, valor_diario, foto, observacoes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [placa, marca, modelo,
                ano_fabricacao || null, ano_modelo || null, cor, combustivel || 'Flex',
                transmissao || 'Manual', nr_portas || 4, capacidade || 5,
                renavam, chassi, km_atual || 0, km_compra || 0,
                km_troca_oleo || null, km_troca_correia || null, km_troca_pneu || null,
                data_compra || null, valor_compra || null, valor_fipe || null,
                seguradora, nr_apolice, vencimento_seguro || null,
                data_licenciamento || null, data_vistoria || null,
                bloqueador, nr_bloqueador, locadorIdValue, valor_diario || null, foto, observacoes]
        );
        const [novo] = await pool.query(`
            SELECT v.*, COALESCE(l.razao_social, l.nome) AS nome_locador
            FROM veiculos v LEFT JOIN locadores l ON v.locador_id = l.id
            WHERE v.id = ?
        `, [result.insertId]);
        res.status(201).json(novo[0]);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Já existe um veículo com essa placa.' });
        }
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar veículo.' });
    }
});

// PUT /api/veiculos/:id
router.put('/:id', requireProfiles('admin', 'locador', 'auxiliar'), async (req, res) => {
    const {
        placa, marca, modelo, ano_fabricacao, ano_modelo, cor, combustivel,
        transmissao, nr_portas, capacidade,
        renavam, chassi, km_atual, km_compra, km_troca_oleo, km_troca_correia, km_troca_pneu,
        data_compra, valor_compra, valor_fipe,
        seguradora, nr_apolice, vencimento_seguro,
        data_licenciamento, data_vistoria,
        bloqueador, nr_bloqueador, locador_id, valor_diario, foto, observacoes
    } = req.body;

    try {
        let locadorIdValue = locador_id || null;

        if (req.usuario?.perfil === 'locador') {
            const locadorId = await ensureLocadorContext(req, res);
            if (!locadorId) return;

            const [ownRows] = await pool.query(
                'SELECT id FROM veiculos WHERE id = ? AND locador_id = ? LIMIT 1',
                [req.params.id, locadorId]
            );
            if (ownRows.length === 0) {
                return res.status(403).json({ erro: 'Você só pode editar veículos vinculados ao seu cadastro de locador.' });
            }
            locadorIdValue = locadorId;
        } else if (req.usuario?.perfil === 'auxiliar') {
            const locadorId = await getAuxiliarLocadorIdForUser(req.usuario);
            if (!locadorId) {
                return res.status(403).json({ erro: 'Não foi encontrado cadastro de locador vinculado a este auxiliar.' });
            }

            const [ownRows] = await pool.query(
                'SELECT id FROM veiculos WHERE id = ? AND locador_id = ? LIMIT 1',
                [req.params.id, locadorId]
            );
            if (ownRows.length === 0) {
                return res.status(403).json({ erro: 'Você só pode editar veículos vinculados ao seu locador.' });
            }
            locadorIdValue = locadorId;
        }

        const [result] = await pool.query(
            `UPDATE veiculos SET
             placa=?, marca=?, modelo=?, ano_fabricacao=?, ano_modelo=?, cor=?, combustivel=?,
             transmissao=?, nr_portas=?, capacidade=?,
             renavam=?, chassi=?, km_atual=?, km_compra=?, km_troca_oleo=?, km_troca_correia=?, km_troca_pneu=?,
             data_compra=?, valor_compra=?, valor_fipe=?,
             seguradora=?, nr_apolice=?, vencimento_seguro=?,
             data_licenciamento=?, data_vistoria=?,
             bloqueador=?, nr_bloqueador=?, locador_id=?, valor_diario=?, foto=?, observacoes=?
             WHERE id=?`,
            [placa, marca, modelo,
                ano_fabricacao || null, ano_modelo || null, cor, combustivel || 'Flex',
                transmissao || 'Manual', nr_portas || 4, capacidade || 5,
                renavam, chassi, km_atual || 0, km_compra || 0,
                km_troca_oleo || null, km_troca_correia || null, km_troca_pneu || null,
                data_compra || null, valor_compra || null, valor_fipe || null,
                seguradora, nr_apolice, vencimento_seguro || null,
                data_licenciamento || null, data_vistoria || null,
                bloqueador, nr_bloqueador, locadorIdValue, valor_diario || null, foto, observacoes,
                req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Veículo não encontrado.' });
        const [atualizado] = await pool.query(`
            SELECT v.*, COALESCE(l.razao_social, l.nome) AS nome_locador
            FROM veiculos v LEFT JOIN locadores l ON v.locador_id = l.id
            WHERE v.id = ?
        `, [req.params.id]);
        res.json(atualizado[0]);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Já existe um veículo com essa placa.' });
        }
        console.error(err);
        res.status(500).json({ erro: 'Erro ao atualizar veículo.' });
    }
});

// DELETE /api/veiculos/:id
router.delete('/:id', requireProfiles('admin', 'locador', 'auxiliar'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        if (req.usuario?.perfil === 'locador') {
            const locadorId = await ensureLocadorContext(req, res);
            if (!locadorId) {
                await connection.rollback();
                return;
            }

            const [ownRows] = await connection.query(
                'SELECT id FROM veiculos WHERE id = ? AND locador_id = ? LIMIT 1',
                [req.params.id, locadorId]
            );
            if (ownRows.length === 0) {
                await connection.rollback();
                return res.status(403).json({ erro: 'Você só pode remover veículos vinculados ao seu cadastro de locador.' });
            }
        } else if (req.usuario?.perfil === 'auxiliar') {
            const locadorId = await getAuxiliarLocadorIdForUser(req.usuario);
            if (!locadorId) {
                await connection.rollback();
                return res.status(403).json({ erro: 'Não foi encontrado cadastro de locador vinculado a este auxiliar.' });
            }
            const [ownRows] = await connection.query(
                'SELECT id FROM veiculos WHERE id = ? AND locador_id = ? LIMIT 1',
                [req.params.id, locadorId]
            );
            if (ownRows.length === 0) {
                await connection.rollback();
                return res.status(403).json({ erro: 'Você só pode remover veículos vinculados ao seu locador.' });
            }
        }

        const [despesasRows] = await connection.query(
            'SELECT COUNT(*) AS total FROM despesas_receitas WHERE veiculo_id = ?',
            [req.params.id]
        );
        const totalDespesas = Number(despesasRows?.[0]?.total || 0);

        if (totalDespesas > 0) {
            await connection.rollback();
            return res.status(400).json({ erro: 'Não é possível excluir o veículo porque existem despesas cadastradas para ele.' });
        }

        const [historicoRows] = await connection.query(
            'SELECT COUNT(*) AS total FROM locacoes WHERE veiculo_id = ?',
            [req.params.id]
        );
        const totalLocacoesExcluidas = Number(historicoRows?.[0]?.total || 0);

        if (totalLocacoesExcluidas > 0) {
            await connection.query('DELETE FROM locacoes WHERE veiculo_id = ?', [req.params.id]);
        }

        const [result] = await connection.query('DELETE FROM veiculos WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ erro: 'Veículo não encontrado.' });
        }

        await connection.commit();
        res.json({
            mensagem: 'Veículo removido com sucesso.',
            locacoesExcluidas: totalLocacoesExcluidas,
        });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ erro: 'Erro ao remover veículo.' });
    } finally {
        connection.release();
    }
});

module.exports = router;
