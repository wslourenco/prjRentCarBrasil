const jwt = require('jsonwebtoken');

function normalizeUserPayload(payload) {
    const source = payload?.usuario && typeof payload.usuario === 'object'
        ? payload.usuario
        : payload;

    return {
        id: source?.id ?? payload?.id ?? null,
        nome: source?.nome ?? payload?.nome ?? '',
        email: source?.email ?? payload?.email ?? '',
        perfil: source?.perfil ?? payload?.perfil ?? '',
    };
}

function authMiddleware(req, res, next) {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ erro: 'Token não fornecido.' });

    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    const jwtSecret = String(process.env.JWT_SECRET || '').trim().replace(/^['"]|['"]$/g, '');

    if (!jwtSecret) {
        return res.status(500).json({ erro: 'Configuração de autenticação ausente.' });
    }

    try {
        const payload = jwt.verify(token, jwtSecret);
        req.usuario = normalizeUserPayload(payload);
        next();
    } catch {
        return res.status(401).json({ erro: 'Token inválido ou expirado.' });
    }
}

function adminOnly(req, res, next) {
    if (req.usuario?.perfil !== 'admin') {
        return res.status(403).json({ erro: 'Acesso restrito a administradores.' });
    }
    next();
}

function requireProfiles(...allowedProfiles) {
    return (req, res, next) => {
        const perfil = req.usuario?.perfil;
        if (!allowedProfiles.includes(perfil)) {
            return res.status(403).json({ erro: 'Acesso não permitido para este perfil.' });
        }
        next();
    };
}

module.exports = { authMiddleware, adminOnly, requireProfiles };
