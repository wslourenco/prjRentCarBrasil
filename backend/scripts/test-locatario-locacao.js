/*
 * Teste de integração simples para validar login e criação de locação por locatário.
 * Uso:
 *   npm run test:locatario-locacao
 * Variáveis opcionais:
 *   API_BASE (padrão: http://localhost:3001/api)
 *   TEST_EMAIL (padrão: locatario@rentcarbrasil.com.br)
 *   TEST_SENHA (padrão: locatario123)
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3001/api';
const TEST_EMAIL = process.env.TEST_EMAIL || 'locatario@rentcarbrasil.com.br';
const TEST_SENHA = process.env.TEST_SENHA || 'locatario123';

function hojeIso() {
    return new Date().toISOString().split('T')[0];
}

async function request(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
}

async function loginLocatario() {
    const { ok, status, data } = await request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, senha: TEST_SENHA }),
    });

    if (!ok || !data?.token) {
        throw new Error(`Falha no login (${status}): ${data?.erro || 'sem detalhes'}`);
    }

    return data.token;
}

async function listarVeiculos(token) {
    const { ok, status, data } = await request('/veiculos', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!ok || !Array.isArray(data)) {
        throw new Error(`Falha ao listar veículos (${status}): ${data?.erro || 'sem detalhes'}`);
    }

    return data;
}

async function tentarCriarLocacao(token, veiculoId) {
    return request('/locacoes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            veiculo_id: veiculoId,
            data_inicio: hojeIso(),
            periodicidade: 'semanal',
            quantidade_periodos: 1,
            condicoes: 'Teste automatizado de integracao',
        }),
    });
}

async function run() {
    console.log('Iniciando teste: login + locacao do locatario...');
    console.log(`API_BASE: ${API_BASE}`);

    const token = await loginLocatario();
    console.log('Login OK');

    const veiculos = await listarVeiculos(token);
    if (veiculos.length === 0) {
        throw new Error('Nenhum veículo retornado para o locatário.');
    }

    console.log(`Veículos disponíveis para tentativa: ${veiculos.length}`);

    let ultimaFalha = null;

    for (const veiculo of veiculos) {
        const veiculoId = veiculo?.id;
        if (!veiculoId) continue;

        const tentativa = await tentarCriarLocacao(token, veiculoId);

        if (tentativa.ok && tentativa.status === 201) {
            console.log(`Locação criada com sucesso. veiculo_id=${veiculoId}, locacao_id=${tentativa.data?.id || 'n/a'}`);
            if (tentativa.data?.contrato_email_status) {
                console.log(`Status contrato e-mail: ${tentativa.data.contrato_email_status}`);
            }
            process.exit(0);
        }

        // Veículo em uso: tenta próximo.
        if (tentativa.status === 409) {
            console.log(`Veículo ${veiculoId} já possui locação ativa. Tentando próximo...`);
            ultimaFalha = tentativa;
            continue;
        }

        // Falha funcional relevante: encerra imediatamente.
        if (tentativa.status === 403 && String(tentativa.data?.erro || '').includes('locatário vinculado')) {
            throw new Error(`Erro de vínculo persistente (${tentativa.status}): ${tentativa.data?.erro || 'sem detalhes'}`);
        }

        ultimaFalha = tentativa;
        console.log(`Tentativa com veículo ${veiculoId} falhou (${tentativa.status}): ${tentativa.data?.erro || 'sem detalhes'}`);
    }

    throw new Error(
        `Nenhuma locação pôde ser criada. Última falha: ${ultimaFalha?.status || 'n/a'} - ${ultimaFalha?.data?.erro || 'sem detalhes'}`
    );
}

run().catch(err => {
    console.error('TESTE FALHOU:', err.message);
    process.exit(1);
});
