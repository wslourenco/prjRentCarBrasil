const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, requireProfiles } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { buildContractClauses } = require('../utils/contract-clauses');

router.use(authMiddleware);

const DOCX_CANDIDATES = [
    path.resolve(__dirname, '../../contrato_frota_estruturado.docx'),
    path.resolve(__dirname, '../../SisLoVe.docx'),
    path.resolve(__dirname, '../templates/contrato_frota_estruturado.docx'),
];

let clausulasContratoCache = null;
let clausulasContratoCachePath = null;
let clausulasContratoCacheMtime = null;

function decodeXmlEntities(value) {
    return String(value || '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

function extractParagraphsFromDocx(docxPath) {
    const zip = new AdmZip(docxPath);
    const entry = zip.getEntry('word/document.xml');
    if (!entry) return [];

    const xml = entry.getData().toString('utf8');
    const paragraphs = Array.from(xml.matchAll(/<w:p[\s\S]*?<\/w:p>/g));

    return paragraphs
        .map(match => {
            const p = String(match[0] || '');
            const withBreaks = p
                .replace(/<w:tab\s*\/?>/g, '\t')
                .replace(/<w:br\s*\/?>/g, '\n')
                .replace(/<w:cr\s*\/?>/g, '\n');

            const raw = withBreaks
                .replace(/<[^>]+>/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            return decodeXmlEntities(raw);
        })
        .filter(Boolean);
}

function readContractClauses() {
    const existingPath = DOCX_CANDIDATES.find(filePath => fs.existsSync(filePath));
    if (!existingPath) return [];

    const stats = fs.statSync(existingPath);
    const changed =
        clausulasContratoCachePath !== existingPath ||
        clausulasContratoCacheMtime !== stats.mtimeMs;

    if (!changed && Array.isArray(clausulasContratoCache)) {
        return clausulasContratoCache;
    }

    const paragraphs = extractParagraphsFromDocx(existingPath);
    clausulasContratoCache = paragraphs;
    clausulasContratoCachePath = existingPath;
    clausulasContratoCacheMtime = stats.mtimeMs;
    return paragraphs;
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

async function getLocatarioIdByUserEmail(email, db = pool) {
    const emailNormalizado = String(email || '').trim();
    if (!emailNormalizado) return null;

    const [rows] = await db.query(
        'SELECT id FROM locatarios WHERE LOWER(TRIM(email)) = LOWER(?) ORDER BY id ASC LIMIT 1',
        [emailNormalizado]
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

    if (periodicidade === 'dia') base.setDate(base.getDate() + total);
    else if (periodicidade === 'semana') base.setDate(base.getDate() + (total * 7));
    else if (periodicidade === 'quinzenal') base.setDate(base.getDate() + (total * 14));
    else if (periodicidade === 'mensal') base.setMonth(base.getMonth() + total);
    else return null;

    return base.toISOString().split('T')[0];
}

function normalizePeriodicidade(value) {
    const normalized = String(value || '').trim().toLowerCase();

    if (['dia', 'diaria', 'diária'].includes(normalized)) return 'dia';
    if (['semana', 'semanal'].includes(normalized)) return 'semana';
    if (['quinzenal', 'mensal'].includes(normalized)) return normalized;
    return '';
}

function parseLikertAnswers(avaliacaoLikert) {
    if (!Array.isArray(avaliacaoLikert) || avaliacaoLikert.length !== 10) {
        return null;
    }

    const respostas = avaliacaoLikert.map(v => Number(v));
    const invalid = respostas.some(v => !Number.isInteger(v) || v < 1 || v > 5);
    if (invalid) return null;

    return respostas;
}

function estimateWeeklyValue(veiculo) {
    const fipe = Number(veiculo?.valor_fipe || 0);
    if (fipe > 0) {
        return Number((fipe * 0.01).toFixed(2));
    }
    return 900;
}

function estimateLocacaoValueForLocatario(veiculo, periodicidade, quantidade) {
    const qtd = Math.max(1, Number(quantidade || 1));
    const diaria = Number(veiculo?.valor_diario || 0);

    if (diaria > 0) {
        let diasTotal = qtd;
        if (periodicidade === 'semana') diasTotal = qtd * 7;
        else if (periodicidade === 'quinzenal') diasTotal = qtd * 14;
        else if (periodicidade === 'mensal') diasTotal = qtd * 30;

        return Number((diaria * diasTotal).toFixed(2));
    }

    const semanal = estimateWeeklyValue(veiculo);
    if (periodicidade === 'dia') return Number(((semanal / 7) * qtd).toFixed(2));
    if (periodicidade === 'semana') return Number((semanal * qtd).toFixed(2));
    if (periodicidade === 'quinzenal') return Number((semanal * 2 * qtd).toFixed(2));
    if (periodicidade === 'mensal') return Number((semanal * 4 * qtd).toFixed(2));

    return semanal;
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
        const clausulasComplementares = readContractClauses();
        const clausulas = buildContractClauses(clausulasComplementares);

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

        doc.text('Condicoes adicionais da locacao:', { underline: true });
        doc.moveDown(0.4);
        doc.text(dados.locacao.condicoes || 'Sem observacoes adicionais.');
        doc.moveDown();

        doc.text('Clausulas contratuais:', { underline: true });
        doc.moveDown(0.4);

        doc.fontSize(10);
        clausulas.forEach((linha, idx) => {
            if (!linha) {
                doc.moveDown(0.35);
                return;
            }

            const isCabecalho = /^CLAUSULA\s+\d+/i.test(linha);
            const isItem = /^\d+(\.\d+)?\s/.test(linha);
            const isBullet = /^-\s/.test(linha);

            if (isCabecalho) {
                doc.font('Helvetica-Bold');
                doc.text(linha, { align: 'left' });
                doc.font('Helvetica');
            } else if (isItem || isBullet) {
                doc.text(linha, { align: 'justify' });
            } else {
                const prefixo = `${idx + 1}. `;
                doc.text(`${prefixo}${linha}`, { align: 'justify' });
            }

            doc.moveDown(0.25);
        });
        doc.fontSize(12);
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

async function criarTransporter() {
    try {
        // Tenta buscar configurações do banco de dados primeiro
        const [rows] = await pool.query(`
            SELECT chave, valor FROM configuracoes 
            WHERE chave LIKE 'smtp_%' OR chave = 'mail_from'
        `);

        let config = {};
        rows.forEach(row => { config[row.chave] = row.valor; });

        // Se não encontrou no banco, tenta variáveis de ambiente
        const host = String(config.smtp_host || process.env.SMTP_HOST || '').trim();
        const user = String(config.smtp_user || process.env.SMTP_USER || '').trim();
        const pass = String(config.smtp_pass || process.env.SMTP_PASS || '').trim();
        const port = Number(config.smtp_port || process.env.SMTP_PORT || 587);
        const secure = String(config.smtp_secure || process.env.SMTP_SECURE || 'false').toLowerCase() === 'true' || port === 465;
        const testMode = String(process.env.TEST_MODE || '').toLowerCase() === 'true';

        if (!host || !user || !pass) return null;

        // Em modo de teste, retorna transporter simulado
        if (testMode) {
            return {
                sendMail: async (options) => {
                    console.log(`[TEST MODE] Email simulado enviado para: ${options.to}`);
                    console.log(`  Assunto: ${options.subject}`);
                    console.log(`  Anexo: ${options.attachments?.[0]?.filename || 'nenhum'}`);
                    return { messageId: `test-${Date.now()}@test.local` };
                }
            };
        }

        return nodemailer.createTransport({
            host, port, secure,
            auth: { user, pass },
        });
    } catch (err) {
        console.error('Erro ao criar transporter:', err);
        return null;
    }
}

function getComprovanteExtensionByMime(mimeType) {
    const mime = String(mimeType || '').trim().toLowerCase();
    if (mime === 'application/pdf') return 'pdf';
    if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    if (mime === 'image/gif') return 'gif';
    return null;
}

async function hasAntecedenteColumn(db = pool) {
    const [rows] = await db.query("SHOW COLUMNS FROM locacoes LIKE 'antecedente_criminal_arquivo'");
    return Array.isArray(rows) && rows.length > 0;
}

async function salvarAntecedenteCriminalArquivo({ locacaoId, arquivo }) {
    const nomeOriginal = String(arquivo?.nome || '').trim();
    const mimeType = String(arquivo?.tipo || '').trim().toLowerCase();
    const conteudoBase64 = String(arquivo?.conteudo_base64 || '').trim();
    const extensao = getComprovanteExtensionByMime(mimeType);

    if (!extensao) {
        const err = new Error('O arquivo de antecedentes deve ser PDF ou imagem (JPG, PNG, WEBP ou GIF).');
        err.status = 400;
        throw err;
    }

    if (!conteudoBase64) {
        const err = new Error('Arquivo de antecedentes inválido.');
        err.status = 400;
        throw err;
    }

    const conteudoLimpo = conteudoBase64.includes(',')
        ? conteudoBase64.split(',')[1]
        : conteudoBase64;

    const buffer = Buffer.from(conteudoLimpo, 'base64');
    if (!buffer || buffer.length === 0) {
        const err = new Error('Arquivo de antecedentes inválido.');
        err.status = 400;
        throw err;
    }

    const maxBytes = 8 * 1024 * 1024; // 8MB
    if (buffer.length > maxBytes) {
        const err = new Error('O arquivo de antecedentes deve ter no máximo 8MB.');
        err.status = 400;
        throw err;
    }

    const uploadDir = path.resolve(__dirname, '../public/uploads/antecedentes-locacoes');
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const fileName = `antecedente-locacao-${locacaoId}-${Date.now()}.${extensao}`;
    const filePath = path.join(uploadDir, fileName);
    await fs.promises.writeFile(filePath, buffer);

    return {
        caminho: `uploads/antecedentes-locacoes/${fileName}`,
        nomeOriginal,
        mimeType,
        tamanhoBytes: buffer.length,
    };
}

async function salvarComprovanteEncerramentoArquivo({ locacaoId, arquivo }) {
    const nomeOriginal = String(arquivo?.nome || '').trim();
    const mimeType = String(arquivo?.tipo || '').trim().toLowerCase();
    const conteudoBase64 = String(arquivo?.conteudo_base64 || '').trim();
    const extensao = getComprovanteExtensionByMime(mimeType);

    if (!extensao) {
        const err = new Error('O comprovante deve ser um arquivo PDF ou imagem (JPG, PNG, WEBP ou GIF).');
        err.status = 400;
        throw err;
    }

    if (!conteudoBase64) {
        const err = new Error('Arquivo de comprovante inválido.');
        err.status = 400;
        throw err;
    }

    const conteudoLimpo = conteudoBase64.includes(',')
        ? conteudoBase64.split(',')[1]
        : conteudoBase64;

    const buffer = Buffer.from(conteudoLimpo, 'base64');
    if (!buffer || buffer.length === 0) {
        const err = new Error('Arquivo de comprovante inválido.');
        err.status = 400;
        throw err;
    }

    const maxBytes = 8 * 1024 * 1024; // 8MB
    if (buffer.length > maxBytes) {
        const err = new Error('O arquivo de comprovante deve ter no máximo 8MB.');
        err.status = 400;
        throw err;
    }

    const uploadDir = path.resolve(__dirname, '../public/uploads/comprovantes-locacoes');
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const fileName = `locacao-${locacaoId}-${Date.now()}.${extensao}`;
    const filePath = path.join(uploadDir, fileName);
    await fs.promises.writeFile(filePath, buffer);

    return {
        caminho: `uploads/comprovantes-locacoes/${fileName}`,
        nomeOriginal,
        mimeType,
        tamanhoBytes: buffer.length,
    };
}

async function enviarContratoPorEmail({ para, nomeLocatario, pdfBuffer, nomeArquivo }) {
    const transporter = await criarTransporter();
    if (!transporter) {
        const err = new Error('SMTP nao configurado. Configure as credenciais SMTP em Configurações.');
        err.code = 'SMTP_NOT_CONFIGURED';
        throw err;
    }

    const from = process.env.MAIL_FROM || process.env.SMTP_USER;
    const info = await transporter.sendMail({
        from,
        to: para,
        subject: 'Contrato de locacao - assinatura digital gov.br',
        text: `Ola ${nomeLocatario},\n\nSegue em anexo o contrato em PDF para assinatura digital.\n\nAcesse o portal oficial para assinatura com conta gov.br:\nhttps://assinador.iti.br\n\nAtenciosamente,\nEquipe RentCarBrasil`,
        html: `<p>Ola ${nomeLocatario},</p><p>Segue em anexo o contrato em PDF para assinatura digital.</p><p>Acesse o portal oficial para assinatura com conta gov.br:<br/><a href="https://assinador.iti.br">https://assinador.iti.br</a></p><p>Atenciosamente,<br/>Equipe RentCarBrasil</p>`,
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
        } else if (req.usuario?.perfil === 'auxiliar') {
            const locadorId = await getAuxiliarLocadorIdForUser(req.usuario);
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

// GET /api/locacoes/:id/locatario — dados completos do locatário + documentos (acessível ao locador da viatura)
router.get('/:id/locatario', async (req, res) => {
    try {
        // Verifica se o locador tem acesso a essa locação
        let ownerSql = `SELECT lc.locatario_id, v.locador_id FROM locacoes lc LEFT JOIN veiculos v ON lc.veiculo_id = v.id WHERE lc.id = ?`;
        const [ownerRows] = await pool.query(ownerSql, [req.params.id]);
        if (ownerRows.length === 0) return res.status(404).json({ erro: 'Locação não encontrada.' });

        const { locatario_id: locatarioId, locador_id: locadorId } = ownerRows[0];

        if (req.usuario?.perfil === 'locador') {
            const myLocadorId = await getLocadorIdForUser(req.usuario);
            if (!myLocadorId || String(myLocadorId) !== String(locadorId)) {
                return res.status(403).json({ erro: 'Acesso não autorizado.' });
            }
        } else if (req.usuario?.perfil === 'auxiliar') {
            const myLocadorId = await getAuxiliarLocadorIdForUser(req.usuario);
            if (!myLocadorId || String(myLocadorId) !== String(locadorId)) {
                return res.status(403).json({ erro: 'Acesso não autorizado.' });
            }
        } else if (req.usuario?.perfil !== 'admin') {
            return res.status(403).json({ erro: 'Acesso não autorizado.' });
        }

        // Busca todos os campos do locatário + documentos do usuário vinculado
        const [rows] = await pool.query(
            `SELECT lt.*,
                    u.doc_rg, u.doc_cpf, u.doc_comprovante
             FROM locatarios lt
             LEFT JOIN usuarios u ON LOWER(TRIM(u.email)) = LOWER(TRIM(lt.email))
             WHERE lt.id = ?
             LIMIT 1`,
            [locatarioId]
        );
        if (rows.length === 0) return res.status(404).json({ erro: 'Locatário não encontrado.' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar dados do locatário.' });
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
        } else if (req.usuario?.perfil === 'auxiliar') {
            const locadorId = await getAuxiliarLocadorIdForUser(req.usuario);
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
router.post('/', requireProfiles('admin', 'locatario', 'auxiliar'), async (req, res) => {
    const {
        veiculo_id, locatario_id, data_inicio, data_previsao_fim,
        valor_semanal, caucao, condicoes,
        periodicidade, quantidade_periodos, contrato, contrato_envio,
        antecedente_arquivo
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
        let statusValue = 'ativa';

        const [veiculoRows] = await conn.query(
            'SELECT id, placa, marca, modelo, valor_fipe, valor_diario, km_atual FROM veiculos WHERE id = ? LIMIT 1',
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

            if (!antecedente_arquivo || typeof antecedente_arquivo !== 'object') {
                await conn.rollback();
                return res.status(400).json({ erro: 'Anexe o arquivo de antecedentes criminais para continuar.' });
            }

            locatarioIdValue = locatarioIdByEmail;

            const periodicidadeNormalizada = normalizePeriodicidade(periodicidade);
            const quantidade = Number(quantidade_periodos || 0);

            if (!['dia', 'semana', 'quinzenal', 'mensal'].includes(periodicidadeNormalizada) || quantidade <= 0) {
                await conn.rollback();
                return res.status(400).json({ erro: 'Periodicidade e quantidade de períodos são obrigatórias para locatário.' });
            }

            valorSemanalValue = estimateLocacaoValueForLocatario(veiculoRows[0], periodicidadeNormalizada, quantidade);
            statusValue = 'pendente_aprovacao';

            dataPrevisaoFimValue = computeEndDate(data_inicio, periodicidadeNormalizada, quantidade);
            condicoesValue = `${condicoesValue ? `${condicoesValue} | ` : ''}Periodicidade: ${periodicidadeNormalizada}; Quantidade: ${quantidade}`;
        } else if (req.usuario?.perfil === 'auxiliar') {
            const locadorId = await getAuxiliarLocadorIdForUser(req.usuario);
            if (!locadorId) {
                await conn.rollback();
                return res.status(403).json({ erro: 'Não foi possível identificar o locador responsável por este auxiliar.' });
            }

            const [ownVehicle] = await conn.query(
                'SELECT id FROM veiculos WHERE id = ? AND locador_id = ? LIMIT 1',
                [veiculo_id, locadorId]
            );
            if (ownVehicle.length === 0) {
                await conn.rollback();
                return res.status(403).json({ erro: 'Auxiliar só pode cadastrar locações para veículos do seu locador.' });
            }
        }

        if (!locatarioIdValue || !valorSemanalValue) {
            await conn.rollback();
            return res.status(400).json({ erro: 'Veículo, locatário, data de início e valor são obrigatórios.' });
        }

        // Verifica se veículo está disponível
        const [ativas] = await conn.query(
            `SELECT id
                         FROM locacoes
                         WHERE veiculo_id = ?
                             AND status = 'ativa'
                             AND data_encerramento IS NULL
                             AND (data_previsao_fim IS NULL OR data_previsao_fim >= CURDATE())`,
            [veiculo_id]
        );
        if (ativas.length > 0) {
            await conn.rollback();
            return res.status(409).json({ erro: 'Este veículo já possui uma locação ativa.' });
        }

        const kmEntradaAtual = Number(veiculoRows[0]?.km_atual || 0);
        const periodicidadeValue = normalizePeriodicidade(periodicidade) || 'semana';
        const quantidadePeridosValue = Number(quantidade_periodos || 1);

        const [result] = await conn.query(
            `INSERT INTO locacoes
            (veiculo_id, locatario_id, data_inicio, data_previsao_fim,
             valor_semanal, caucao, km_entrada, status, condicoes, periodicidade, quantidade_periodos)
            VALUES (?,?,?,?,?,?,?, ?,?,?,?)`,
            [veiculo_id, locatarioIdValue, data_inicio, dataPrevisaoFimValue,
                valorSemanalValue, caucao || 0, kmEntradaAtual, statusValue, condicoesValue, periodicidadeValue, quantidadePeridosValue]
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

        if (req.usuario?.perfil === 'locatario') {
            const antecedenteSalvo = await salvarAntecedenteCriminalArquivo({
                locacaoId: result.insertId,
                arquivo: antecedente_arquivo,
            });

            if (await hasAntecedenteColumn(conn)) {
                await conn.query(
                    'UPDATE locacoes SET antecedente_criminal_arquivo = ? WHERE id = ?',
                    [antecedenteSalvo.caminho, result.insertId]
                );
            } else {
                const condicoesComAnexo = `${condicoesValue ? `${condicoesValue} | ` : ''}Arquivo de antecedentes: ${antecedenteSalvo.caminho}`;
                await conn.query(
                    'UPDATE locacoes SET condicoes = ? WHERE id = ?',
                    [condicoesComAnexo, result.insertId]
                );
                condicoesValue = condicoesComAnexo;
            }
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
        let contratoPdfBase64 = null;
        let contratoPdfNomeArquivo = null;
        let contratoPdfMimeType = null;

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

                // Obter email do locador
                const [locadorRows] = await pool.query(
                    `SELECT id, nome, email FROM locadores WHERE id = ? LIMIT 1`,
                    [veiculo.locador_id]
                );
                const locador = locadorRows[0] || {};

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
                const emailLocador = locador.email || '';
                const pdfBuffer = await gerarContratoPdfBuffer(contratoPayload);
                const nomeArquivo = `contrato-locacao-${result.insertId}.pdf`;
                const contratoEnvio = String(contrato_envio || 'email').trim().toLowerCase();

                if (contratoEnvio === 'download') {
                    // Prepara o PDF para download
                    contratoPdfBase64 = pdfBuffer.toString('base64');
                    contratoPdfNomeArquivo = nomeArquivo;
                    contratoPdfMimeType = 'application/pdf';

                    // Envia email também para locatário e locador
                    if (emailDestino) {
                        await enviarContratoPorEmail({
                            para: emailDestino,
                            nomeLocatario: contratoPayload.locatario.nome || 'Locatario',
                            pdfBuffer,
                            nomeArquivo,
                        });
                    }

                    if (emailLocador) {
                        await enviarContratoPorEmail({
                            para: emailLocador,
                            nomeLocatario: `${contratoPayload.locatario.nome || 'Locatario'} (Cópia para locador)`,
                            pdfBuffer,
                            nomeArquivo,
                        });
                    }

                    emailStatus = 'download_e_enviado';
                } else {
                    if (!emailDestino) {
                        throw new Error('Locatario sem e-mail para envio do contrato.');
                    }

                    await enviarContratoPorEmail({
                        para: emailDestino,
                        nomeLocatario: contratoPayload.locatario.nome || 'Locatario',
                        pdfBuffer,
                        nomeArquivo,
                    });

                    // Envia cópia para locador se houver email
                    if (emailLocador) {
                        await enviarContratoPorEmail({
                            para: emailLocador,
                            nomeLocatario: `${contratoPayload.locatario.nome || 'Locatario'} (Cópia para locador)`,
                            pdfBuffer,
                            nomeArquivo,
                        });
                    }

                    emailStatus = 'enviado';
                }
            } catch (emailErr) {
                console.error('Falha ao enviar contrato por e-mail:', emailErr);
                if (emailErr?.code === 'SMTP_NOT_CONFIGURED') {
                    emailStatus = 'nao_configurado';
                    emailMensagem = 'E-mail do contrato não enviado porque o SMTP não está configurado.';
                } else {
                    emailStatus = 'falhou';
                    emailMensagem = emailErr?.message || 'Nao foi possivel enviar o e-mail do contrato.';
                }
            }
        }

        res.status(201).json({
            ...nova[0],
            contrato_email_status: emailStatus,
            contrato_email_mensagem: emailMensagem,
            contrato_pdf_base64: contratoPdfBase64,
            contrato_pdf_nome_arquivo: contratoPdfNomeArquivo,
            contrato_pdf_mime_type: contratoPdfMimeType,
            contrato_envio: String(contrato_envio || 'email').trim().toLowerCase(),
        });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar locação.' });
    } finally {
        conn.release();
    }
});

// PUT /api/locacoes/:id
router.put('/:id', requireProfiles('admin', 'auxiliar'), async (req, res) => {
    const {
        veiculo_id, locatario_id, data_inicio, data_previsao_fim, data_encerramento,
        valor_semanal, caucao, km_entrada, km_saida, status, condicoes, periodicidade, quantidade_periodos
    } = req.body;

    try {
        if (req.usuario?.perfil === 'auxiliar') {
            const locadorId = await getAuxiliarLocadorIdForUser(req.usuario);
            if (!locadorId) {
                return res.status(403).json({ erro: 'Não foi possível identificar o locador responsável por este auxiliar.' });
            }

            const [currentOwnership] = await pool.query(
                `SELECT lc.id
                 FROM locacoes lc
                 INNER JOIN veiculos v ON lc.veiculo_id = v.id
                 WHERE lc.id = ? AND v.locador_id = ?
                 LIMIT 1`,
                [req.params.id, locadorId]
            );
            if (currentOwnership.length === 0) {
                return res.status(403).json({ erro: 'Auxiliar só pode alterar locações de veículos do seu locador.' });
            }

            const [newVehicleOwnership] = await pool.query(
                'SELECT id FROM veiculos WHERE id = ? AND locador_id = ? LIMIT 1',
                [veiculo_id, locadorId]
            );
            if (newVehicleOwnership.length === 0) {
                return res.status(403).json({ erro: 'Auxiliar só pode vincular locações a veículos do seu locador.' });
            }
        }

        const periodicidadeValue = normalizePeriodicidade(periodicidade) || 'semana';
        const quantidadePeridosValue = Number(quantidade_periodos || 1);

        const [result] = await pool.query(
            `UPDATE locacoes SET
             veiculo_id=?, locatario_id=?, data_inicio=?, data_previsao_fim=?, data_encerramento=?,
             valor_semanal=?, caucao=?, km_entrada=?, km_saida=?, status=?, condicoes=?, periodicidade=?, quantidade_periodos=?
             WHERE id=?`,
            [veiculo_id, locatario_id, data_inicio, data_previsao_fim || null, data_encerramento || null,
                valor_semanal, caucao || 0, km_entrada || 0, km_saida || null, status, condicoes, periodicidadeValue, quantidadePeridosValue,
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

// PATCH /api/locacoes/:id/aprovar
router.patch('/:id/aprovar', requireProfiles('admin', 'locador', 'auxiliar'), async (req, res) => {
    const conn = await pool.getConnection();
    try {
        if (req.usuario?.perfil === 'locador') {
            const locadorId = await getLocadorIdForUser(req.usuario);
            if (!locadorId) {
                return res.status(403).json({ erro: 'Não foi encontrado cadastro de locador vinculado a este usuário.' });
            }

            const [ownership] = await conn.query(
                `SELECT lc.id
                 FROM locacoes lc
                 INNER JOIN veiculos v ON lc.veiculo_id = v.id
                 WHERE lc.id = ? AND v.locador_id = ?
                 LIMIT 1`,
                [req.params.id, locadorId]
            );
            if (ownership.length === 0) {
                return res.status(403).json({ erro: 'Você só pode aprovar solicitações dos seus veículos.' });
            }
        } else if (req.usuario?.perfil === 'auxiliar') {
            const locadorId = await getAuxiliarLocadorIdForUser(req.usuario);
            if (!locadorId) {
                return res.status(403).json({ erro: 'Não foi possível identificar o locador responsável por este auxiliar.' });
            }

            const [ownership] = await conn.query(
                `SELECT lc.id
                 FROM locacoes lc
                 INNER JOIN veiculos v ON lc.veiculo_id = v.id
                 WHERE lc.id = ? AND v.locador_id = ?
                 LIMIT 1`,
                [req.params.id, locadorId]
            );
            if (ownership.length === 0) {
                return res.status(403).json({ erro: 'Auxiliar só pode aprovar solicitações de veículos do seu locador.' });
            }
        }

        await conn.beginTransaction();

        const [locacaoRows] = await conn.query(
            `SELECT id, veiculo_id, status, data_previsao_fim
             FROM locacoes
             WHERE id = ?
             LIMIT 1`,
            [req.params.id]
        );

        if (locacaoRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ erro: 'Solicitação de locação não encontrada.' });
        }

        const locacao = locacaoRows[0];
        if (locacao.status !== 'pendente_aprovacao') {
            await conn.rollback();
            return res.status(400).json({ erro: 'Apenas solicitações pendentes podem ser aprovadas.' });
        }

        const [conflitos] = await conn.query(
            `SELECT id
             FROM locacoes
             WHERE veiculo_id = ?
               AND id <> ?
               AND status = 'ativa'
               AND data_encerramento IS NULL
               AND (data_previsao_fim IS NULL OR data_previsao_fim >= CURDATE())
             LIMIT 1`,
            [locacao.veiculo_id, locacao.id]
        );

        if (conflitos.length > 0) {
            await conn.rollback();
            return res.status(409).json({ erro: 'Não foi possível aprovar: o veículo já possui locação ativa.' });
        }

        await conn.query(
            `UPDATE locacoes
             SET status = 'ativa'
             WHERE id = ? AND status = 'pendente_aprovacao'`,
            [locacao.id]
        );

        await conn.commit();

        const [atualizada] = await pool.query(
            `SELECT lc.*, CONCAT(v.marca,' ',v.modelo) AS nome_veiculo, v.placa,
                    lt.nome AS nome_locatario, lt.celular AS celular_locatario
             FROM locacoes lc
             LEFT JOIN veiculos v ON lc.veiculo_id = v.id
             LEFT JOIN locatarios lt ON lc.locatario_id = lt.id
             WHERE lc.id = ?
             LIMIT 1`,
            [locacao.id]
        );

        return res.json({
            mensagem: 'Solicitação aprovada com sucesso.',
            locacao: atualizada[0] || null,
        });
    } catch (err) {
        try {
            await conn.rollback();
        } catch {
            // Sem ação: rollback só é necessário quando há transação aberta.
        }
        console.error(err);
        return res.status(500).json({ erro: 'Erro ao aprovar solicitação de locação.' });
    } finally {
        conn.release();
    }
});

// PATCH /api/locacoes/:id/encerrar
router.patch('/:id/encerrar', requireProfiles('admin', 'locador', 'auxiliar'), async (req, res) => {
    const {
        km_saida,
        data_encerramento,
        comprovante_arquivo,
        avaliacao_likert,
    } = req.body || {};
    const hoje = data_encerramento || new Date().toISOString().split('T')[0];
    const kmSaidaNumero = Number(km_saida);
    const respostasLikert = parseLikertAnswers(avaliacao_likert);

    if (!Number.isFinite(kmSaidaNumero) || kmSaidaNumero <= 0) {
        return res.status(400).json({ erro: 'Informe a quilometragem final válida para encerrar a locação.' });
    }

    if (!respostasLikert) {
        return res.status(400).json({ erro: 'Preencha as 10 perguntas da avaliação do locatário com notas de 1 a 5.' });
    }

    if (!comprovante_arquivo || typeof comprovante_arquivo !== 'object') {
        return res.status(400).json({ erro: 'Anexe o arquivo de comprovante do pagamento (PDF ou imagem).' });
    }

    const conn = await pool.getConnection();
    try {
        if (req.usuario?.perfil === 'locador') {
            const locadorId = await getLocadorIdForUser(req.usuario);
            if (!locadorId) {
                return res.status(403).json({ erro: 'Não foi encontrado cadastro de locador vinculado a este usuário.' });
            }

            const [ownership] = await conn.query(
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
        } else if (req.usuario?.perfil === 'auxiliar') {
            const locadorId = await getAuxiliarLocadorIdForUser(req.usuario);
            if (!locadorId) {
                return res.status(403).json({ erro: 'Não foi possível identificar o locador responsável por este auxiliar.' });
            }

            const [ownership] = await conn.query(
                `SELECT lc.id
                 FROM locacoes lc
                 INNER JOIN veiculos v ON lc.veiculo_id = v.id
                 WHERE lc.id = ? AND v.locador_id = ?
                 LIMIT 1`,
                [req.params.id, locadorId]
            );
            if (ownership.length === 0) {
                return res.status(403).json({ erro: 'Auxiliar só pode encerrar locações de veículos do seu locador.' });
            }
        }

        await conn.beginTransaction();

        const [locacaoRows] = await conn.query(
            `SELECT lc.id, lc.veiculo_id, lc.locatario_id, lc.km_entrada
             FROM locacoes lc
             WHERE lc.id = ? AND lc.status = 'ativa'
             LIMIT 1`,
            [req.params.id]
        );
        if (locacaoRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ erro: 'Locação não encontrada ou já encerrada.' });
        }

        const locacaoAtual = locacaoRows[0];
        const kmEntradaNumero = Number(locacaoAtual.km_entrada || 0);
        if (kmEntradaNumero > 0 && kmSaidaNumero < kmEntradaNumero) {
            await conn.rollback();
            return res.status(400).json({ erro: 'A quilometragem final não pode ser menor que a quilometragem inicial da locação.' });
        }

        const mediaGeral = Number((respostasLikert.reduce((acc, n) => acc + n, 0) / respostasLikert.length).toFixed(2));

        await conn.query(
            `INSERT INTO locatario_avaliacoes
            (locacao_id, locatario_id, avaliador_usuario_id,
             pergunta_1, pergunta_2, pergunta_3, pergunta_4, pergunta_5,
             pergunta_6, pergunta_7, pergunta_8, pergunta_9, pergunta_10,
             media_geral)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                locacaoAtual.id,
                locacaoAtual.locatario_id,
                req.usuario.id,
                respostasLikert[0],
                respostasLikert[1],
                respostasLikert[2],
                respostasLikert[3],
                respostasLikert[4],
                respostasLikert[5],
                respostasLikert[6],
                respostasLikert[7],
                respostasLikert[8],
                respostasLikert[9],
                mediaGeral,
            ]
        );

        const comprovanteSalvo = await salvarComprovanteEncerramentoArquivo({
            locacaoId: req.params.id,
            arquivo: comprovante_arquivo,
        });
        const comprovantePagamentoPath = comprovanteSalvo.caminho;

        const [comprovanteColumnRows] = await conn.query(
            "SHOW COLUMNS FROM locacoes LIKE 'comprovante_pagamento'"
        );
        const hasComprovanteColumn = Array.isArray(comprovanteColumnRows) && comprovanteColumnRows.length > 0;

        if (hasComprovanteColumn) {
            const [result] = await conn.query(
                `UPDATE locacoes
                 SET status='encerrada', data_encerramento=?, km_saida=?, comprovante_pagamento=?
                 WHERE id=? AND status='ativa'`,
                [hoje, kmSaidaNumero, comprovantePagamentoPath, req.params.id]
            );
            if (result.affectedRows === 0) {
                await conn.rollback();
                return res.status(404).json({ erro: 'Locação não encontrada ou já encerrada.' });
            }
        } else {
            const [result] = await conn.query(
                `UPDATE locacoes
                 SET status='encerrada', data_encerramento=?, km_saida=?,
                     condicoes = CONCAT(IFNULL(condicoes, ''),
                     CASE WHEN IFNULL(condicoes, '') = '' THEN '' ELSE ' | ' END,
                     'Comprovante Encerramento: ', ?)
                 WHERE id=? AND status='ativa'`,
                [hoje, kmSaidaNumero, comprovantePagamentoPath, req.params.id]
            );
            if (result.affectedRows === 0) {
                await conn.rollback();
                return res.status(404).json({ erro: 'Locação não encontrada ou já encerrada.' });
            }
        }

        const [veiculoAtualizado] = await conn.query(
            'UPDATE veiculos SET km_atual = ? WHERE id = ? LIMIT 1',
            [kmSaidaNumero, locacaoAtual.veiculo_id]
        );
        if (veiculoAtualizado.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ erro: 'Veículo da locação não encontrado para atualizar a quilometragem.' });
        }

        await conn.commit();

        const [encerrada] = await pool.query(
            `SELECT lc.*, CONCAT(v.marca,' ',v.modelo) AS nome_veiculo, v.placa,
                    lt.nome AS nome_locatario, lt.celular AS celular_locatario
             FROM locacoes lc
             LEFT JOIN veiculos v ON lc.veiculo_id = v.id
             LEFT JOIN locatarios lt ON lc.locatario_id = lt.id
             WHERE lc.id = ?
             LIMIT 1`,
            [req.params.id]
        );

        return res.json({
            mensagem: 'Locação encerrada com sucesso.',
            locacao: encerrada[0] || null,
        });
    } catch (err) {
        try {
            await conn.rollback();
        } catch {
            // Sem ação: rollback só é necessário quando há transação aberta.
        }
        console.error(err);
        return res.status(500).json({ erro: 'Erro ao encerrar locação.' });
    } finally {
        conn.release();
    }
});

// DELETE /api/locacoes/:id
router.delete('/:id', requireProfiles('admin', 'auxiliar'), async (req, res) => {
    try {
        if (req.usuario?.perfil === 'auxiliar') {
            const locadorId = await getAuxiliarLocadorIdForUser(req.usuario);
            if (!locadorId) {
                return res.status(403).json({ erro: 'Não foi possível identificar o locador responsável por este auxiliar.' });
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
                return res.status(403).json({ erro: 'Auxiliar só pode remover locações de veículos do seu locador.' });
            }
        }

        const [result] = await pool.query('DELETE FROM locacoes WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ erro: 'Locação não encontrada.' });
        res.json({ mensagem: 'Locação removida com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao remover locação.' });
    }
});

module.exports = router;
