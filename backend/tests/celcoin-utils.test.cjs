const test = require('node:test');
const assert = require('node:assert/strict');

// Funções puras copiadas de routes/debitos.js para teste isolado
function normalizarDebitos(payload) {
    const debts = payload.debts || [];

    const multas = debts.filter(d => {
        const t = (d.type || d.tipo || '').toUpperCase();
        return t === 'MULTA' || t === 'RENAINF' || t.includes('MULTA');
    }).map(d => ({
        description: d.description || d.descricao || 'Multa de trânsito',
        amount: d.amount || d.valor || 0,
        date: d.date || d.data || null,
        location: d.location || d.local || null,
        status: d.status || 'pendente',
        type: d.type || d.tipo,
        id: d.id,
    }));

    const ipva = debts.find(d => (d.type || d.tipo || '').toUpperCase() === 'IPVA');
    const licenciamento = debts.find(d => {
        const t = (d.type || d.tipo || '').toUpperCase();
        return t === 'LICENCIAMENTO' || t.includes('LICEN');
    });

    return {
        transactionId: payload.transactionId,
        debts,
        multas,
        ipva: ipva ? {
            description: ipva.description || ipva.descricao || 'IPVA',
            amount: ipva.amount || ipva.valor || 0,
            year: ipva.year || ipva.ano,
            status: ipva.status || 'pendente',
            id: ipva.id,
        } : null,
        licenciamento: licenciamento ? {
            description: licenciamento.description || licenciamento.descricao || 'Licenciamento anual',
            amount: licenciamento.amount || licenciamento.valor || 0,
            status: licenciamento.status || 'pendente',
            id: licenciamento.id,
        } : null,
    };
}

function classificarEventoWebhook(eventType, payload) {
    if (eventType === 'VehicleWithoutDebts') return 'sem_debitos';
    if (eventType === 'VehicleNotFound') return 'nao_encontrado';
    if (eventType === 'search-error-event') return 'erro';
    return 'disponivel';
}

// ── Normalização de débitos ────────────────────────────────────────────────────

test('normalizarDebitos separa multas, IPVA e licenciamento corretamente', () => {
    const payload = {
        transactionId: 'tx-123',
        debts: [
            { id: 1, type: 'IPVA', description: 'IPVA 2025', amount: 1200.00, status: 'pendente' },
            { id: 2, type: 'LICENCIAMENTO', description: 'Licenciamento 2025', amount: 150.00, status: 'pendente' },
            { id: 3, type: 'MULTA', description: 'Infração de trânsito', amount: 293.47, status: 'pendente' },
            { id: 4, type: 'RENAINF', description: 'Multa RENAINF', amount: 195.23, status: 'pendente' },
        ],
    };

    const result = normalizarDebitos(payload);

    assert.equal(result.transactionId, 'tx-123');
    assert.equal(result.multas.length, 2);
    assert.equal(result.ipva.amount, 1200.00);
    assert.equal(result.licenciamento.amount, 150.00);
    assert.equal(result.ipva.status, 'pendente');
});

test('normalizarDebitos retorna null para IPVA e licenciamento quando ausentes', () => {
    const result = normalizarDebitos({ debts: [] });

    assert.equal(result.ipva, null);
    assert.equal(result.licenciamento, null);
    assert.equal(result.multas.length, 0);
});

test('normalizarDebitos aceita campos em português (tipo/valor/descricao)', () => {
    const payload = {
        debts: [
            { tipo: 'multa', descricao: 'Excesso de velocidade', valor: 293.47, status: 'vencido' },
            { tipo: 'ipva', descricao: 'IPVA 2024', valor: 980.00, status: 'pendente' },
        ],
    };

    const result = normalizarDebitos(payload);

    assert.equal(result.multas.length, 1);
    assert.equal(result.multas[0].description, 'Excesso de velocidade');
    assert.equal(result.multas[0].amount, 293.47);
    assert.equal(result.ipva.amount, 980.00);
});

test('normalizarDebitos usa defaults quando descrição e valor estão ausentes', () => {
    const payload = {
        debts: [{ type: 'MULTA' }],
    };

    const result = normalizarDebitos(payload);

    assert.equal(result.multas[0].description, 'Multa de trânsito');
    assert.equal(result.multas[0].amount, 0);
    assert.equal(result.multas[0].status, 'pendente');
});

test('normalizarDebitos preserva todos os débitos no campo debts', () => {
    const debts = [
        { type: 'IPVA', amount: 500 },
        { type: 'MULTA', amount: 200 },
        { type: 'TAXASERVICO', amount: 30 },
    ];
    const result = normalizarDebitos({ debts });

    assert.equal(result.debts.length, 3);
});

// ── Classificação de eventos webhook ──────────────────────────────────────────

test('classificarEventoWebhook mapeia VehicleWithoutDebts → sem_debitos', () => {
    assert.equal(classificarEventoWebhook('VehicleWithoutDebts', {}), 'sem_debitos');
});

test('classificarEventoWebhook mapeia VehicleNotFound → nao_encontrado', () => {
    assert.equal(classificarEventoWebhook('VehicleNotFound', {}), 'nao_encontrado');
});

test('classificarEventoWebhook mapeia search-error-event → erro', () => {
    assert.equal(classificarEventoWebhook('search-error-event', {}), 'erro');
});

test('classificarEventoWebhook mapeia debts e qualquer outro → disponivel', () => {
    assert.equal(classificarEventoWebhook('debts', {}), 'disponivel');
    assert.equal(classificarEventoWebhook('receipt', {}), 'disponivel');
    assert.equal(classificarEventoWebhook(undefined, {}), 'disponivel');
});

// ── Limpeza de placa ───────────────────────────────────────────────────────────

test('normalização de placa remove traços e converte para maiúsculo', () => {
    const normalizarPlaca = (p) => p.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    assert.equal(normalizarPlaca('abc-1234'), 'ABC1234');
    assert.equal(normalizarPlaca('ABC1D23'), 'ABC1D23');
    assert.equal(normalizarPlaca('xyz 5e78'), 'XYZ5E78');
});
