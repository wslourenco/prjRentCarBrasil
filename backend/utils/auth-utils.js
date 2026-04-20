function sanitizeProfile(profile) {
    const normalized = String(profile || '').trim().toLowerCase();
    return ['locador', 'locatario'].includes(normalized) ? normalized : '';
}

function normalizeDocumento(documento) {
    return String(documento || '').replace(/\D/g, '');
}

function requiresRg(tipoDocumento) {
    return String(tipoDocumento || '').toLowerCase() === 'cpf';
}

module.exports = {
    sanitizeProfile,
    normalizeDocumento,
    requiresRg,
};
