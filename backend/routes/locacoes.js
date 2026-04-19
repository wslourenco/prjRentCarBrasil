const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, requireProfiles } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

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

    return null;
}

async function getLocatarioIdByUserEmail(email, db = pool) {
    const emailNormalizado = String(email || '').trim();
    if (!emailNormalizado) return null;

    const [rows] = await db.query(
        'SELECT id FROM locatarios WHERE LOWER(TRIM(email)) = LOWER(?) ORDER BY id ASC LIMIT 1',
        [emailNormalizado]
    );
    return rows[0]?.id || null;
}

async function getLocatarioIdByUserId(userId, db = pool) {
    const id = Number(userId || 0);
    if (!id) return null;

    const [rows] = await db.query(
        'SELECT id FROM locatarios WHERE id = ? LIMIT 1',
        [id]
    );

    return rows[0]?.id || null;
}

async function getUserIdentity(conn, usuario) {
    const identity = {
        id: Number(usuario?.id || 0) || null,
        nome: String(usuario?.nome || '').trim(),
        email: String(usuario?.email || '').trim(),
    };

    if (identity.id && (!identity.email || !identity.nome)) {
        const [rows] = await conn.query(
            'SELECT nome, email FROM usuarios WHERE id = ? AND ativo = TRUE LIMIT 1',
            [identity.id]
        );

        if (rows[0]) {
            if (!identity.nome) identity.nome = String(rows[0].nome || '').trim();
            if (!identity.email) identity.email = String(rows[0].email || '').trim();
        }
    }

    return identity;
}

async function ensureLocatarioForUser(conn, usuario) {
    const identity = await getUserIdentity(conn, usuario);
    const email = identity.email;
    const existenteByEmail = email ? await getLocatarioIdByUserEmail(email, conn) : null;
    if (existenteByEmail) return existenteByEmail;

    const existenteById = identity.id ? await getLocatarioIdByUserId(identity.id, conn) : null;
    if (existenteById) return existenteById;

    if (!email) return null;

    const nome = identity.nome || 'Locatario';

    try {
        const [result] = await conn.query(
            'INSERT INTO locatarios (tipo, nome, email, categoria_cnh, motorist_app) VALUES (?,?,?,?,?)',
            ['fisica', nome, email, 'B', 0]
        );
        return result.insertId;
    } catch (err) {
        if (err?.code !== 'ER_DUP_ENTRY') throw err;

        const afterDuplicate = await getLocatarioIdByUserEmail(email, conn);
        return afterDuplicate || null;
    }
}

function computeEndDate(dataInicio, periodicidade, quantidade) {
    const base = new Date(`${dataInicio}T00:00:00`);
    if (Number.isNaN(base.getTime())) return null;

    const total = Number(quantidade || 0);
    if (!total) return null;

    if (periodicidade === 'semanal') base.setDate(base.getDate() + (total * 7));
    else if (periodicidade === 'quinzenal') base.setDate(base.getDate() + (total * 15));
    else if (periodicidade === 'mensal') base.setMonth(base.getMonth() + total);
    else return null;

    return base.toISOString().split('T')[0];
}

function estimateWeeklyValue(veiculo) {
    const fipe = Number(veiculo?.valor_fipe || 0);
    if (fipe > 0) {
        return Number((fipe * 0.01).toFixed(2));
    }
    return 900;
}

function formatCurrency(value) {
    const numero = Number(value || 0);
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(value) {
    if (!value) return '-';
    try {
        const data = new Date(`${value}T00:00:00`);
        return data.toLocaleDateString('pt-BR');
    } catch {
        return value;
    }
}

async function gerarContratoPdfBuffer(dados) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 42 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.fontSize(16).text('Contrato de Locacao de Veiculo', { align: 'center' });
        doc.moveDown(1.2);

        doc.fontSize(12).text(`Locatario: ${dados.locatario.nome || '-'}`);
        doc.text(`CPF: ${dados.locatario.cpf || '-'} | RG: ${dados.locatario.rg || '-'}`);
        doc.text(`E-mail: ${dados.locatario.email || '-'} | Telefone: ${dados.locatario.telefone || '-'}`);
        doc.text(`Endereco: ${dados.locatario.endereco || '-'}`);
        doc.moveDown();

        doc.text(`Veiculo: ${dados.veiculo.descricao || '-'} (${dados.veiculo.placa || '-'})`);
        doc.text(`Valor semanal: ${formatCurrency(dados.locacao.valorSemanal)}`);
        doc.text(`Caucao: ${formatCurrency(dados.locacao.caucao)}`);
        doc.text(`Inicio: ${formatDateBR(dados.locacao.dataInicio)}`);
        doc.text(`Previsao de termino: ${formatDateBR(dados.locacao.dataPrevisaoFim)}`);
        doc.text(`Periodicidade: ${dados.locacao.periodicidade || '-'}`);
        doc.text(`Quantidade de periodos: ${dados.locacao.quantidadePeriodos || '-'}`);
        doc.moveDown();

        doc.text('Condicoes e clausulas:', { underline: true });
        doc.moveDown(0.4);
        doc.text(dados.locacao.condicoes || 'Locacao conforme termos acordados entre as partes.');
        doc.moveDown();

        doc.text('Assinatura digital:', { underline: true });
        doc.moveDown(0.3);
        doc.text('Para assinar digitalmente, acesse o gov.br e utilize o portal Assinador ITI:');
        doc.fillColor('blue').text('https://assinador.iti.br', { link: 'https://assinador.iti.br', underline: true });
        doc.fillColor('black');
        doc.moveDown();

        doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}.`);

        doc.end();
    });
}

function criarTransporter() {
    const host = String(process.env.SMTP_HOST || '').trim();
    const user = String(process.env.SMTP_USER || '').trim();
    const pass = String(process.env.SMTP_PASS || '').trim();
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;

    if (!host || !user || !pass) return null;

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
    });
}

async function enviarContratoPorEmail({ para, nomeLocatario, pdfBuffer, nomeArquivo }) {
    const transporter = criarTransporter();
    if (!transporter) {
        throw new Error('SMTP nao configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS.');
    }

    const from = process.env.MAIL_FROM || process.env.SMTP_USER;
    const info = await transporter.sendMail({
        from,
        to: para,
        subject: 'Contrato de locacao - assinatura digital gov.br',
        text: `Ola ${nomeLocatario},\n\nSegue em anexo o contrato em PDF para assinatura digital.\n\nAcesse o portal oficial para assinatura com conta gov.br:\nhttps://assinador.iti.br\n\nAtenciosamente,\nEquipe SisLoVe`,
        html: `<p>Ola ${nomeLocatario},</p><p>Segue em anexo o contrato em PDF para assinatura digital.</p><p>Acesse o portal oficial para assinatura com conta gov.br:<br/><a href="https://assinador.iti.br">https://assinador.iti.br</a></p><p>Atenciosamente,<br/>Equipe SisLoVe</p>`,
        attachments: [
            {
                filename: nomeArquivo,
                content: pdfBuffer,
                contentType: 'application/pdf',
            },
        ],
    });

    return info;
}

// GET /api/locacoes
router.get('/', async (req, res) => {
    try {
        let sql = `
            SELECT lc.*,
                   CONCAT(v.marca, ' ', v.modelo) AS nome_veiculo, v.placa,
                   lt.nome AS nome_locatario, lt.celular AS celular_locatario
            FROM locacoes lc
            LEFT JOIN veiculos v ON lc.veiculo_id = v.id
            LEFT JOIN locatarios lt ON lc.locatario_id = lt.id
        `;
        const params = [];

        if (req.usuario?.perfil === 'locatario') {
            const conn = await pool.getConnection();
            let locatarioId = null;
            try {
                locatarioId = await ensureLocatarioForUser(conn, req.usuario);
            } finally {
                conn.release();
            }
            if (!locatarioId) return res.json([]);
            sql += ' WHERE lc.locatario_id = ?';
            params.push(locatarioId);
        } else if (req.usuario?.perfil === 'locador') {
            const locadorId = await getLocadorIdForUser(req.usuario);
            if (!locadorId) return res.json([]);
            sql += ' WHERE v.locador_id = ?';
            params.push(locadorId);
        }

        sql += ' ORDER BY lc.data_inicio DESC';

        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar locações.' });
    }
});

// GET /api/locacoes/:id
router.get('/:id', async (req, res) => {
    try {
        let sql = `
            SELECT lc.*,
                   CONCAT(v.marca, ' ', v.modelo) AS nome_veiculo, v.placa,
                   lt.nome AS nome_locatario, lt.celular AS celular_locatario
            FROM locacoes lc
            LEFT JOIN veiculos v ON lc.veiculo_id = v.id
            LEFT JOIN locatarios lt ON lc.locatario_id = lt.id
            WHERE lc.id = ?
        `;
        const params = [req.params.id];

        if (req.usuario?.perfil === 'locatario') {
            const conn = await pool.getConnection();
            let locatarioId = null;
            try {
                locatarioId = await ensureLocatarioForUser(conn, req.usuario);
            } finally {
                conn.release();
            }
            if (!locatarioId) return res.status(404).json({ erro: 'Locação não encontrada.' });
            sql += ' AND lc.locatario_id = ?';
            params.push(locatarioId);
        } else if (req.usuario?.perfil === 'locador') {
            const locadorId = await getLocadorIdForUser(req.usuario);
            if (!locadorId) return res.status(404).json({ erro: 'Locação não encontrada.' });
            sql += ' AND v.locador_id = ?';
            params.push(locadorId);
        }

        const [rows] = await pool.query(sql, params);
        if (rows.length === 0) return res.status(404).json({ erro: 'Locação não encontrada.' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar locação.' });
    }
});

// POST /api/locacoes
router.post('/', requireProfiles('admin', 'locatario'), async (req, res) => {
    const {
        veiculo_id, locatario_id, data_inicio, data_previsao_fim,
        valor_semanal, caucao, km_entrada, condicoes,
        periodicidade, quantidade_periodos, contrato
    } = req.body;

    if (!veiculo_id || !data_inicio) {
        return res.status(400).json({ erro: 'Veículo e data de início são obrigatórios.' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        let locatarioIdValue = locatario_id;
        let valorSemanalValue = valor_semanal;
        let dataPrevisaoFimValue = data_previsao_fim || null;
        let condicoesValue = condicoes || '';

        const [veiculoRows] = await conn.query(
            'SELECT id, placa, marca, modelo, valor_fipe FROM veiculos WHERE id = ? LIMIT 1',
            [veiculo_id]
        );
        if (veiculoRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ erro: 'Veículo não encontrado.' });
        }

        if (req.usuario?.perfil === 'locatario') {
            const locatarioIdByEmail = await ensureLocatarioForUser(conn, req.usuario);
            if (!locatarioIdByEmail) {
                await conn.rollback();
                return res.status(403).json({ erro: 'Não foi encontrado cadastro de locatário vinculado a este usuário.' });
            }

            locatarioIdValue = locatarioIdByEmail;
            valorSemanalValue = estimateWeeklyValue(veiculoRows[0]);

            const periodicidadeNormalizada = String(periodicidade || '').trim().toLowerCase();
            const quantidade = Number(quantidade_periodos || 0);

            if (!['semanal', 'quinzenal', 'mensal'].includes(periodicidadeNormalizada) || quantidade <= 0) {
                await conn.rollback();
                return res.status(400).json({ erro: 'Periodicidade e quantidade de períodos são obrigatórias para locatário.' });
            }

            dataPrevisaoFimValue = computeEndDate(data_inicio, periodicidadeNormalizada, quantidade);
            condicoesValue = `${condicoesValue ? `${condicoesValue} | ` : ''}Periodicidade: ${periodicidadeNormalizada}; Quantidade: ${quantidade}`;
        }

        if (!locatarioIdValue || !valorSemanalValue) {
            await conn.rollback();
            return res.status(400).json({ erro: 'Veículo, locatário, data de início e valor são obrigatórios.' });
        }

        // Verifica se veículo está disponível
        const [ativas] = await conn.query(
            'SELECT id FROM locacoes WHERE veiculo_id = ? AND status = "ativa"',
            [veiculo_id]
        );
        if (ativas.length > 0) {
            await conn.rollback();
            return res.status(409).json({ erro: 'Este veículo já possui uma locação ativa.' });
        }

        const [result] = await conn.query(
            `INSERT INTO locacoes
            (veiculo_id, locatario_id, data_inicio, data_previsao_fim,
             valor_semanal, caucao, km_entrada, status, condicoes)
            VALUES (?,?,?,?,?,?,?,'ativa',?)`,
            [veiculo_id, locatarioIdValue, data_inicio, dataPrevisaoFimValue,
                valorSemanalValue, caucao || 0, km_entrada || 0, condicoesValue]
        );

        // Cria lançamento de caução se houver
        if (caucao && parseFloat(caucao) > 0) {
            await conn.query(
                `INSERT INTO despesas_receitas
                (tipo, categoria, descricao, valor, data, veiculo_id, locatario_id)
                VALUES ('receita','Caução/Depósito','Caução – início de locação',?,?,?,?)`,
                [caucao, data_inicio, veiculo_id, locatarioIdValue]
            );
        }

        await conn.commit();

        const [nova] = await pool.query(`
            SELECT lc.*, CONCAT(v.marca,' ',v.modelo) AS nome_veiculo, v.placa,
                   lt.nome AS nome_locatario, lt.celular AS celular_locatario
            FROM locacoes lc
            LEFT JOIN veiculos v ON lc.veiculo_id = v.id
            LEFT JOIN locatarios lt ON lc.locatario_id = lt.id
            WHERE lc.id = ?
        `, [result.insertId]);

        let emailStatus = 'nao_enviado';
        let emailMensagem = null;

        if (req.usuario?.perfil === 'locatario') {
            try {
                const [locatarioRows] = await pool.query(
                    `SELECT id, nome, email, cpf, rg, celular, endereco, numero, bairro, cidade, estado, cep
                     FROM locatarios
                     WHERE id = ?
                     LIMIT 1`,
                    [locatarioIdValue]
                );

                const locatario = locatarioRows[0] || {};
                const veiculo = veiculoRows[0] || {};

                const contratoPayload = {
                    locatario: {
                        nome: contrato?.nome || locatario.nome || req.usuario?.nome || '',
                        email: contrato?.email || locatario.email || req.usuario?.email || '',
                        cpf: contrato?.cpf || locatario.cpf || '',
                        rg: contrato?.rg || locatario.rg || '',
                        telefone: contrato?.telefone || locatario.celular || '',
                        endereco: contrato?.endereco || [
                            locatario.endereco,
                            locatario.numero,
                            locatario.bairro,
                            locatario.cidade,
                            locatario.estado,
                            locatario.cep,
                        ].filter(Boolean).join(', '),
                    },
                    veiculo: {
                        descricao: `${veiculo.marca || ''} ${veiculo.modelo || ''}`.trim(),
                        placa: veiculo.placa || '',
                    },
                    locacao: {
                        valorSemanal: valorSemanalValue,
                        caucao: caucao || 0,
                        dataInicio: data_inicio,
                        dataPrevisaoFim: dataPrevisaoFimValue,
                        periodicidade: periodicidade || '',
                        quantidadePeriodos: quantidade_periodos || '',
                        condicoes: condicoesValue,
                    },
                };

                const emailDestino = contratoPayload.locatario.email;
                if (!emailDestino) {
                    throw new Error('Locatario sem e-mail para envio do contrato.');
                }

                const pdfBuffer = await gerarContratoPdfBuffer(contratoPayload);
                const nomeArquivo = `contrato-locacao-${result.insertId}.pdf`;

                await enviarContratoPorEmail({
                    para: emailDestino,
                    nomeLocatario: contratoPayload.locatario.nome || 'Locatario',
                    pdfBuffer,
                    nomeArquivo,
                });

                emailStatus = 'enviado';
            } catch (emailErr) {
                console.error('Falha ao enviar contrato por e-mail:', emailErr);
                emailStatus = 'falhou';
                emailMensagem = emailErr?.message || 'Nao foi possivel enviar o e-mail do contrato.';
            }
        }

        res.status(201).json({ ...nova[0], contrato_email_status: emailStatus, contrato_email_mensagem: emailMensagem });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar locação.' });
    } finally {
        conn.release();
    }
});

// PUT /api/locacoes/:id
router.put('/:id', requireProfiles('admin'), async (req, res) => {
    const {
        veiculo_id, locatario_id, data_inicio, data_previsao_fim, data_encerramento,
        valor_semanal, caucao, km_entrada, km_saida, status, condicoes
    } = req.body;

    try {
        const [result] = await pool.query(
            `UPDATE locacoes SET
             veiculo_id=?, locatario_id=?, data_inicio=?, data_previsao_fim=?, data_encerramento=?,
             valor_semanal=?, caucao=?, km_entrada=?, km_saida=?, status=?, condicoes=?
             WHERE id=?`,
            [veiculo_id, locatario_id, data_inicio, data_previsao_fim || null, data_encerramento || null,
                valor_semanal, caucao || 0, km_entrada || 0, km_saida || null, status, condicoes,
                req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Locação não encontrada.' });
        const [atualizada] = await pool.query(`
            SELECT lc.*, CONCAT(v.marca,' ',v.modelo) AS nome_veiculo, v.placa,
                   lt.nome AS nome_locatario, lt.celular AS celular_locatario
            FROM locacoes lc
            LEFT JOIN veiculos v ON lc.veiculo_id = v.id
            LEFT JOIN locatarios lt ON lc.locatario_id = lt.id
            WHERE lc.id = ?
        `, [req.params.id]);
        res.json(atualizada[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao atualizar locação.' });
    }
});

// PATCH /api/locacoes/:id/encerrar
router.patch('/:id/encerrar', requireProfiles('admin', 'locador'), async (req, res) => {
    const { km_saida, data_encerramento } = req.body;
    const hoje = data_encerramento || new Date().toISOString().split('T')[0];

    try {
        if (req.usuario?.perfil === 'locador') {
            const locadorId = await getLocadorIdForUser(req.usuario);
            if (!locadorId) {
                return res.status(403).json({ erro: 'Não foi encontrado cadastro de locador vinculado a este usuário.' });
            }

            const [ownership] = await pool.query(
                `SELECT lc.id
                 FROM locacoes lc
                 INNER JOIN veiculos v ON lc.veiculo_id = v.id
                 WHERE lc.id = ? AND v.locador_id = ?
                 LIMIT 1`,
                [req.params.id, locadorId]
            );
            if (ownership.length === 0) {
                return res.status(403).json({ erro: 'Você só pode encerrar locações dos seus veículos.' });
            }
        }

        const [result] = await pool.query(
            `UPDATE locacoes SET status='encerrada', data_encerramento=?, km_saida=? WHERE id=? AND status='ativa'`,
            [hoje, km_saida || null, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Locação não encontrada ou já encerrada.' });
        res.json({ mensagem: 'Locação encerrada com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao encerrar locação.' });
    }
});

// DELETE /api/locacoes/:id
router.delete('/:id', requireProfiles('admin'), async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM locacoes WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Locação não encontrada.' });
        res.json({ mensagem: 'Locação removida com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao remover locação.' });
    }
});

module.exports = router;
