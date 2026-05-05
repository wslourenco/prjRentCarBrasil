const express = require('express');
const router = express.Router();
const pool = require('../db');
const { enviarEmail } = require('../utils/mailer');
const { authMiddleware } = require('../middleware/auth');

const PERFIL_LABEL = {
    locador: 'Locador',
    locatario: 'Locatário',
    auxiliar: 'Auxiliar Administrativo',
};

router.post('/', authMiddleware, async (req, res) => {
    const { assunto, mensagem } = req.body;
    const usuario = req.usuario;

    if (!assunto?.trim() || !mensagem?.trim()) {
        return res.status(400).json({ erro: 'Assunto e mensagem são obrigatórios.' });
    }

    try {
        const [admins] = await pool.query(
            "SELECT email, nome FROM usuarios WHERE perfil = 'admin' ORDER BY id ASC LIMIT 1"
        );
        if (!admins.length) {
            return res.status(500).json({ erro: 'Administrador não encontrado. Tente novamente mais tarde.' });
        }

        const perfilLabel = PERFIL_LABEL[usuario.perfil] || usuario.perfil;
        const mensagemHtml = String(mensagem).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');

        await enviarEmail({
            para: admins[0].email,
            assunto: `[Fale Conosco] ${assunto.trim()}`,
            html: `
                <h2 style="color:#1e40af">Mensagem via Fale Conosco</h2>
                <table style="font-size:14px;border-collapse:collapse">
                    <tr><td style="padding:4px 12px 4px 0;font-weight:600">De:</td><td>${usuario.nome} &lt;${usuario.email}&gt;</td></tr>
                    <tr><td style="padding:4px 12px 4px 0;font-weight:600">Perfil:</td><td>${perfilLabel}</td></tr>
                    <tr><td style="padding:4px 12px 4px 0;font-weight:600">Assunto:</td><td>${assunto.trim()}</td></tr>
                </table>
                <hr style="margin:16px 0">
                <p style="font-size:14px;line-height:1.7">${mensagemHtml}</p>
            `,
            texto: `De: ${usuario.nome} (${usuario.email})\nPerfil: ${perfilLabel}\nAssunto: ${assunto.trim()}\n\n${mensagem.trim()}`,
        });

        res.json({ ok: true });
    } catch (err) {
        console.error('[Fale Conosco] erro:', err.message);
        res.status(500).json({ erro: 'Erro ao enviar mensagem. Verifique a configuração de e-mail.' });
    }
});

module.exports = router;
