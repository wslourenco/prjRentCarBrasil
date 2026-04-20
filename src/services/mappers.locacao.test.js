import test from 'node:test';
import assert from 'node:assert/strict';
import { locacaoToApi, locacaoFromApi } from './mappers.js';

test('locacaoToApi deve mapear payload de contrato corretamente', () => {
    const payload = locacaoToApi({
        veiculoId: 50,
        locatarioId: 7,
        dataInicio: '2026-04-19',
        periodicidade: 'semanal',
        quantidadePeriodos: 2,
        contratoEnvio: 'download',
        contrato: {
            nome: 'Locatario Demo',
            email: 'locatario@sislove.com',
            cpf: '33344455566',
            rg: '112223334',
            telefone: '11911112222',
            endereco: 'Rua Teste 100',
        },
    });

    assert.equal(payload.veiculo_id, 50);
    assert.equal(payload.contrato_envio, 'download');
    assert.equal(payload.contrato.rg, '112223334');
});

test('locacaoFromApi deve expor status e dados de contrato', () => {
    const mapped = locacaoFromApi({
        id: 99,
        veiculo_id: 12,
        locatario_id: 8,
        data_inicio: '2026-04-19',
        status: 'ativa',
        contrato_envio: 'email',
        contrato_email_status: 'enviado',
        contrato_email_mensagem: 'OK',
    });

    assert.equal(mapped.id, 99);
    assert.equal(mapped.contratoEnvio, 'email');
    assert.equal(mapped.contratoEmailStatus, 'enviado');
});
