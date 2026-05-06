const test = require('node:test');
const assert = require('node:assert/strict');
const { CLAUSULAS_OBRIGATORIAS_CONTRATO, buildContractClauses } = require('../utils/contract-clauses');

test('cláusulas obrigatórias devem sempre existir', () => {
    assert.ok(Array.isArray(CLAUSULAS_OBRIGATORIAS_CONTRATO));
    assert.ok(CLAUSULAS_OBRIGATORIAS_CONTRATO.length > 20);
    assert.equal(CLAUSULAS_OBRIGATORIAS_CONTRATO[0], 'CLAUSULA 1 - DO OBJETO');
});

test('buildContractClauses sem complemento retorna apenas obrigatórias', () => {
    const result = buildContractClauses();
    assert.deepEqual(result, CLAUSULAS_OBRIGATORIAS_CONTRATO);
});

test('buildContractClauses com complementares inclui seção adicional', () => {
    const result = buildContractClauses(['Cláusula extra 1', 'Cláusula extra 2']);
    const markerIndex = result.indexOf('CLAUSULAS COMPLEMENTARES (DOCUMENTO BASE):');

    assert.ok(markerIndex > 0);
    assert.equal(result[markerIndex + 1], 'Cláusula extra 1');
    assert.equal(result[markerIndex + 2], 'Cláusula extra 2');
});
