const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeProfile, normalizeDocumento, requiresRg } = require('../utils/auth-utils');

test('sanitizeProfile aceita perfis válidos e normaliza', () => {
    assert.equal(sanitizeProfile(' Locatario '), 'locatario');
    assert.equal(sanitizeProfile('LOCADOR'), 'locador');
});

test('sanitizeProfile rejeita perfil inválido', () => {
    assert.equal(sanitizeProfile('admin'), '');
    assert.equal(sanitizeProfile(''), '');
});

test('normalizeDocumento remove caracteres não numéricos', () => {
    assert.equal(normalizeDocumento('333.444.555-66'), '33344455566');
    assert.equal(normalizeDocumento('12.345.678/0001-99'), '12345678000199');
});

test('requiresRg deve exigir RG apenas para CPF', () => {
    assert.equal(requiresRg('cpf'), true);
    assert.equal(requiresRg('cnpj'), false);
    assert.equal(requiresRg('CPF'), true);
});
