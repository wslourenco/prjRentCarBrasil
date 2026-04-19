const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { authMiddleware, requireProfiles } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.use(requireProfiles('admin', 'locador', 'locatario'));

function parseBoolean(value) {
    return String(value || '').trim().toLowerCase() === 'true';
}

function getSmtpStatus() {
    const host = String(process.env.SMTP_HOST || '').trim();
    const port = String(process.env.SMTP_PORT || '').trim() || '587';
    const secure = String(process.env.SMTP_SECURE || '').trim() || 'false';
    const user = String(process.env.SMTP_USER || '').trim();
    const pass = String(process.env.SMTP_PASS || '').trim();
    const mailFrom = String(process.env.MAIL_FROM || '').trim();

    const faltantes = [];
    if (!host) faltantes.push('SMTP_HOST');
    if (!port) faltantes.push('SMTP_PORT');
    if (!user) faltantes.push('SMTP_USER');
    if (!pass) faltantes.push('SMTP_PASS');

    return {
        configurado: faltantes.length === 0,
        faltantes,
        smtp: {
            host,
            port,
            secure,
            user,
            hasPass: !!pass,
            mailFrom,
        },
    };
}

function upsertEnv(content, key, value) {
    const escapedValue = String(value ?? '').replace(/\r?\n/g, '').trim();
    const quoted = `"${escapedValue.replace(/"/g, '\\"')}"`;
    const regex = new RegExp(`^${key}=.*$`, 'm');

    if (regex.test(content)) {
        return content.replace(regex, `${key}=${quoted}`);
    }

    const suffix = content.endsWith('\n') || content.length === 0 ? '' : '\n';
    return `${content}${suffix}${key}=${quoted}\n`;
}

async function persistSmtpConfig({ host, port, secure, user, pass, mailFrom }) {
    const envPath = path.join(__dirname, '..', '.env.local');
    let content = '';

    try {
        content = await fs.readFile(envPath, 'utf8');
    } catch (err) {
        if (err?.code !== 'ENOENT') throw err;
    }

    content = upsertEnv(content, 'SMTP_HOST', host);
    content = upsertEnv(content, 'SMTP_PORT', String(port));
    content = upsertEnv(content, 'SMTP_SECURE', String(secure));
    content = upsertEnv(content, 'SMTP_USER', user);
    content = upsertEnv(content, 'SMTP_PASS', pass);

    if (mailFrom) {
        content = upsertEnv(content, 'MAIL_FROM', mailFrom);
    }

    await fs.writeFile(envPath, content, 'utf8');

    process.env.SMTP_HOST = String(host);
    process.env.SMTP_PORT = String(port);
    process.env.SMTP_SECURE = String(secure);
    process.env.SMTP_USER = String(user);
    process.env.SMTP_PASS = String(pass);
    if (mailFrom) process.env.MAIL_FROM = String(mailFrom);
}

router.get('/smtp/status', (_req, res) => {
    const status = getSmtpStatus();
    res.json(status);
});

router.put('/smtp', async (req, res) => {
    try {
        const host = String(req.body?.host || '').trim();
        const port = Number(req.body?.port || 587);
        const secure = parseBoolean(req.body?.secure) || port === 465;
        const user = String(req.body?.user || '').trim();
        const pass = String(req.body?.pass || '').trim();
        const mailFrom = String(req.body?.mailFrom || '').trim();

        if (!host || !port || !user || !pass) {
            return res.status(400).json({ erro: 'Preencha SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS.' });
        }

        await persistSmtpConfig({
            host,
            port,
            secure: secure ? 'true' : 'false',
            user,
            pass,
            mailFrom,
        });

        const status = getSmtpStatus();
        return res.json({
            mensagem: 'Configuração SMTP salva com sucesso.',
            ...status,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ erro: 'Erro ao salvar configuração SMTP.' });
    }
});

module.exports = router;
