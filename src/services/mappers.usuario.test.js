import test from 'node:test';
import assert from 'node:assert/strict';
import { usuarioFromApi } from './mappers.js';

test('usuarioFromApi deve mapear RG e dados do locatario', () => {
    const mapped = usuarioFromApi({
        id: 10,
        nome: 'Wilson',
        email: 'wilson.locatario@rentcarbrasil.com.br',
        perfil: 'locatario',
        tipo_documento: 'cpf',
        documento: '98765432100',
        rg: '12.345.678-9',
        locatario: {
            id: 10,
            nome: 'Wilson',
            email: 'wilson.locatario@rentcarbrasil.com.br',
            cpf: '98765432100',
            rg: '12.345.678-9',
            celular: '(11)98888-7777',
            endereco: 'Rua Teste',
            numero: '100',
            bairro: 'Centro',
            cidade: 'Campinas',
            estado: 'SP',
            cep: '13000-000',
        },
    });

    assert.equal(mapped.rg, '12.345.678-9');
    assert.equal(mapped.locatario.cpf, '98765432100');
    assert.equal(mapped.locatario.cidade, 'Campinas');
});

test('usuarioFromApi deve aplicar defaults quando campos não vierem', () => {
    const mapped = usuarioFromApi({ id: 1 });
    assert.equal(mapped.email, '');
    assert.equal(mapped.rg, '');
    assert.equal(mapped.locatario, null);
});
