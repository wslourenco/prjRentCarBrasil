const express = require('express');
const nodemailer = require('nodemailer');
const pool = require('../db');
const { authMiddleware, requireProfiles } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

async function dbQuery(sql, params = []) {
    const result = pool.query(sql, params);
    if (result && typeof result.then === 'function') {
        return await result;
    }

    if (typeof pool.promise === 'function') {
        return await pool.promise().query(sql, params);
    }

    throw new Error('Pool de banco sem suporte a Promise para query.');
}

async function dbGetConnection() {
    const result = pool.getConnection();
    if (result && typeof result.then === 'function') {
        return await result;
    }

    if (typeof pool.promise === 'function') {
        return await pool.promise().getConnection();
    }

    throw new Error('Pool de banco sem suporte a Promise para conexão.');
}

// Cache em memória
let configCache = {};
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Função auxiliar: Buscar configuração com cache
async function obterConfiguracao(chave) {
    const agora = Date.now();
    if (configCache[chave] && (agora - cacheTimestamp) < CACHE_TTL) {
        return configCache[chave];
    }

    try {
        const [rows] = await dbQuery(`SELECT valor, tipo FROM configuracoes WHERE chave = ? LIMIT 1`, [chave]);
        if (rows.length === 0) return null;

        const { valor, tipo } = rows[0];
        let valorFinal = valor;

        if (tipo === 'numero') valorFinal = Number(valor);
        else if (tipo === 'booleano') valorFinal = String(valor).toLowerCase() === 'true';
        else if (tipo === 'json') valorFinal = JSON.parse(valor || '{}');

        configCache[chave] = valorFinal;
        cacheTimestamp = agora;
        return valorFinal;
    } catch (err) {
        console.error(`Erro ao buscar configuração ${chave}:`, err);
        return null;
    }
}

// Exportar função para uso em outros módulos
router.obterConfiguracao = obterConfiguracao;
router.limparCache = () => { configCache = {}; cacheTimestamp = 0; };

// GET /api/configuracoes/smtp/status - Status do SMTP
router.get('/smtp/status', async (req, res) => {
    try {
        const [rows] = await dbQuery(`
            SELECT chave, valor FROM configuracoes 
            WHERE chave LIKE 'smtp_%' OR chave = 'mail_from'
        `);

        const config = {};
        rows.forEach(row => { config[row.chave] = row.valor; });

        const faltantes = [];
        if (!config.smtp_host) faltantes.push('smtp_host');
        if (!config.smtp_port) faltantes.push('smtp_port');
        if (!config.smtp_user) faltantes.push('smtp_user');
        if (!config.smtp_pass) faltantes.push('smtp_pass');

        res.json({
            configurado: faltantes.length === 0,
            faltantes,
            smtp: {
                smtp_host: config.smtp_host || '',
                smtp_port: config.smtp_port || '587',
                smtp_secure: config.smtp_secure || 'false',
                smtp_user: config.smtp_user || '',
                smtp_pass_configurado: !!config.smtp_pass,
                mail_from: config.mail_from || '',
            },
        });
    } catch (err) {
        console.error('Erro ao buscar status SMTP:', err);
        res.status(500).json({ erro: 'Erro ao buscar status SMTP.' });
    }
});

// GET /api/configuracoes/:chave - Obter configuração específica
router.get('/:chave', async (req, res) => {
    try {
        const { chave } = req.params;
        const [rows] = await dbQuery(`
            SELECT id, chave, valor, tipo, descricao FROM configuracoes WHERE chave = ? LIMIT 1
        `, [chave]);

        if (rows.length === 0) {
            return res.status(404).json({ erro: 'Configuração não encontrada.' });
        }

        const config = rows[0];
        if (config.tipo === 'json') config.valor = JSON.parse(config.valor || '{}');
        res.json(config);
    } catch (err) {
        console.error('Erro ao buscar configuração:', err);
        res.status(500).json({ erro: 'Erro ao buscar configuração.' });
    }
});

// PUT /api/configuracoes/smtp - Atualizar SMTP
router.put('/smtp', async (req, res) => {
    try {
        const host = String(req.body?.smtp_host || req.body?.host || '').trim();
        const port = Number(req.body?.smtp_port || req.body?.port || 587);
        const secure = String(req.body?.smtp_secure || req.body?.secure || '').toLowerCase() === 'true' || port === 465;
        const user = String(req.body?.smtp_user || req.body?.user || '').trim();
        const pass = String(req.body?.smtp_pass || req.body?.pass || '').trim().replace(/\s+/g, '');
        const mailFrom = String(req.body?.mail_from || req.body?.mailFrom || '').trim();

        if (!host || !port || !user || !pass) {
            return res.status(400).json({ erro: 'Preencha smtp_host, smtp_port, smtp_user e smtp_pass.' });
        }

        const conn = await dbGetConnection();
        try {
            await conn.beginTransaction();

            const configs = [
                { chave: 'smtp_host', valor: host, tipo: 'texto' },
                { chave: 'smtp_port', valor: String(port), tipo: 'numero' },
                { chave: 'smtp_secure', valor: secure ? 'true' : 'false', tipo: 'booleano' },
                { chave: 'smtp_user', valor: user, tipo: 'texto' },
                { chave: 'smtp_pass', valor: pass, tipo: 'texto' },
            ];

            if (mailFrom) {
                configs.push({ chave: 'mail_from', valor: mailFrom, tipo: 'texto' });
            }

            for (const cfg of configs) {
                await conn.query(`
                    INSERT INTO configuracoes (chave, valor, tipo, descricao)
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    valor = VALUES(valor), tipo = VALUES(tipo), atualizado_em = CURRENT_TIMESTAMP
                `, [cfg.chave, cfg.valor, cfg.tipo, `Configuração de ${cfg.chave}`]);
            }

            await conn.commit();
            router.limparCache();

            res.json({
                mensagem: 'Configuração SMTP salva com sucesso.',
                configurado: true,
                faltantes: [],
                smtp: { smtp_host: host, smtp_port: port, smtp_secure: secure, smtp_user: user, mail_from: mailFrom }
            });
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    } catch (err) {
        console.error('Erro ao salvar SMTP:', err);
        res.status(500).json({ erro: 'Erro ao salvar configuração SMTP.' });
    }
});

// PUT /api/configuracoes/smtp/testar - Testar conexão SMTP
router.put('/smtp/testar', async (req, res) => {
    try {
        const [rows] = await dbQuery(`
            SELECT chave, valor FROM configuracoes WHERE chave LIKE 'smtp_%' OR chave = 'mail_from'
        `);

        const config = {};
        rows.forEach(row => { config[row.chave] = row.valor; });

        const host = String(config.smtp_host || '').trim();
        const user = String(config.smtp_user || '').trim();
        const pass = String(config.smtp_pass || '').trim().replace(/\s+/g, '');
        const port = Number(config.smtp_port || 587);
        const secure = String(config.smtp_secure || 'false').toLowerCase() === 'true' || port === 465;

        if (!host || !user || !pass) {
            return res.status(400).json({ erro: 'Configure smtp_host, smtp_user e smtp_pass primeiro.' });
        }

        const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
        await transporter.verify();

        res.json({ sucesso: true, mensagem: 'Conexão SMTP testada com sucesso!' });
    } catch (err) {
        console.error('Erro ao testar SMTP:', err);
        res.status(400).json({ erro: `Erro na conexão SMTP: ${err.message}` });
    }
});

// PUT /api/configuracoes/:chave - Atualizar configuração
router.put('/:chave', requireProfiles('admin'), async (req, res) => {
    try {
        const { chave } = req.params;
        const { valor, tipo = 'texto' } = req.body;

        if (!valor) {
            return res.status(400).json({ erro: 'Valor é obrigatório.' });
        }

        const valorArmazenado = tipo === 'json' ? JSON.stringify(valor) : String(valor);

        const [result] = await dbQuery(`
            UPDATE configuracoes SET valor = ?, tipo = ? WHERE chave = ?
        `, [valorArmazenado, tipo, chave]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: 'Configuração não encontrada.' });
        }

        router.limparCache();
        res.json({ chave, valor: tipo === 'json' ? valor : valorArmazenado, tipo });
    } catch (err) {
        console.error('Erro ao atualizar configuração:', err);
        res.status(500).json({ erro: 'Erro ao atualizar configuração.' });
    }
});

module.exports = router;
