const nodemailer = require('nodemailer');
const axios = require('axios');
const pool = require('../db');

async function getSmtpConfig() {
    const [rows] = await pool.query(
        "SELECT chave, valor FROM configuracoes WHERE chave LIKE 'smtp_%' OR chave IN ('mail_from','brevo_api_key','brevo_sender_email','brevo_sender_name','email_provider')"
    );
    const cfg = {};
    rows.forEach(r => { cfg[r.chave] = r.valor; });
    return cfg;
}

function withTimeout(promise, ms, msg) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
    ]);
}

async function criarTransporterSmtp(cfg) {
    const host = String(cfg.smtp_host || '').trim();
    const user = String(cfg.smtp_user || '').trim();
    const pass = String(cfg.smtp_pass || '').trim().replace(/\s+/g, '');
    if (!host || !user || !pass) return null;

    const port = Number(cfg.smtp_port || 587);
    const secure = String(cfg.smtp_secure || 'false').toLowerCase() === 'true' || port === 465;

    const opcoes = [
        { host, port, secure },
        // Tenta porta alternativa automaticamente para Gmail
        ...(host.includes('gmail') && port === 587 ? [{ host, port: 465, secure: true }] : []),
        ...(host.includes('gmail') && port === 465 ? [{ host, port: 587, secure: false }] : []),
    ];

    for (const op of opcoes) {
        try {
            const t = nodemailer.createTransport({
                host: op.host, port: op.port, secure: op.secure,
                auth: { user, pass },
                tls: { rejectUnauthorized: false },
                connectionTimeout: 8000,
                greetingTimeout: 8000,
                socketTimeout: 10000,
            });
            await withTimeout(t.verify(), 10000, `Timeout porta ${op.port}`);
            return t;
        } catch (err) {
            console.warn(`[mailer] SMTP porta ${op.port} falhou: ${err.message}`);
        }
    }
    return null;
}

async function enviarEmailBrevo({ apiKey, senderEmail, senderName, para, assunto, html, texto }) {
    const res = await withTimeout(
        axios.post(
            'https://api.brevo.com/v3/smtp/email',
            {
                sender: { name: senderName || 'RentCarBrasil', email: senderEmail },
                to: [{ email: para }],
                subject: assunto,
                htmlContent: html,
                textContent: texto,
            },
            {
                headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
                timeout: 15000,
            }
        ),
        18000,
        'Timeout ao chamar API Brevo.'
    );
    return res.data;
}

/**
 * Envia um e-mail usando o provedor configurado (Brevo API ou SMTP).
 * @param {{ para: string, assunto: string, html: string, texto?: string, anexoPdf?: { nome: string, buffer: Buffer } }} opcoes
 */
async function enviarEmail({ para, assunto, html, texto, anexoPdf }) {
    const cfg = await getSmtpConfig();
    const provider = String(cfg.email_provider || 'smtp').toLowerCase();

    if (provider === 'brevo') {
        const apiKey = String(cfg.brevo_api_key || '').trim();
        const senderEmail = String(cfg.brevo_sender_email || '').trim();
        if (!apiKey || !senderEmail) throw new Error('Brevo não configurado: salve a API Key e o e-mail remetente.');
        const payload = {
            sender: { name: String(cfg.brevo_sender_name || 'RentCarBrasil').trim(), email: senderEmail },
            to: [{ email: para }],
            subject: assunto,
            htmlContent: html,
            textContent: texto || '',
        };
        if (anexoPdf) {
            payload.attachment = [{ name: anexoPdf.nome, content: anexoPdf.buffer.toString('base64') }];
        }
        return withTimeout(
            axios.post('https://api.brevo.com/v3/smtp/email', payload, {
                headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
                timeout: 15000,
            }),
            18000, 'Timeout ao chamar API Brevo.'
        );
    }

    // Modo SMTP
    const transporter = await criarTransporterSmtp(cfg);
    if (!transporter) {
        const err = new Error('SMTP não configurado ou inacessível. Configure em Configuração SMTP.');
        err.code = 'SMTP_NOT_CONFIGURED';
        throw err;
    }
    const from = String(cfg.mail_from || cfg.smtp_user || '').trim();
    const mailOpts = { from, to: para, subject: assunto, html, text: texto || '' };
    if (anexoPdf) {
        mailOpts.attachments = [{ filename: anexoPdf.nome, content: anexoPdf.buffer, contentType: 'application/pdf' }];
    }
    return transporter.sendMail(mailOpts);
}

/**
 * Testa o provedor configurado enviando um e-mail para `destino`.
 */
async function testarEmail(destino) {
    const cfg = await getSmtpConfig();
    const provider = String(cfg.email_provider || 'smtp').toLowerCase();

    if (provider === 'brevo') {
        const apiKey = String(cfg.brevo_api_key || '').trim();
        const senderEmail = String(cfg.brevo_sender_email || '').trim();
        if (!apiKey || !senderEmail) throw new Error('Brevo não configurado: salve a API Key e o e-mail remetente.');
        const para = destino || senderEmail;
        await enviarEmailBrevo({
            apiKey, senderEmail,
            senderName: String(cfg.brevo_sender_name || 'RentCarBrasil').trim(),
            para,
            assunto: 'Teste de e-mail — RentCarBrasil',
            html: '<p>Teste enviado via <strong>Brevo API</strong> pelo sistema RentCarBrasil.</p>',
            texto: 'Teste enviado via Brevo API pelo sistema RentCarBrasil.',
        });
        return { provedor: 'brevo', para };
    }

    // SMTP
    const host = String(cfg.smtp_host || '').trim();
    const user = String(cfg.smtp_user || '').trim();
    const pass = String(cfg.smtp_pass || '').trim().replace(/\s+/g, '');
    if (!host || !user || !pass) throw new Error('Configure smtp_host, smtp_user e smtp_pass primeiro.');

    const transporter = await criarTransporterSmtp(cfg);
    if (!transporter) throw new Error('Não foi possível conectar ao servidor SMTP. Tente porta 465 com SSL=Sim, ou use o Brevo.');

    const from = String(cfg.mail_from || user).trim();
    const para = destino || from;
    const info = await withTimeout(
        transporter.sendMail({
            from, to: para,
            subject: 'Teste de e-mail — RentCarBrasil',
            html: '<p>Teste enviado via <strong>SMTP</strong> pelo sistema RentCarBrasil.</p>',
            text: 'Teste enviado via SMTP pelo sistema RentCarBrasil.',
        }),
        15000,
        'Timeout ao enviar e-mail. Conexão SMTP OK, mas o envio não completou.'
    );
    return { provedor: 'smtp', para, messageId: info.messageId };
}

module.exports = { enviarEmail, testarEmail, getSmtpConfig };
