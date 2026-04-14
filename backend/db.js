const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

function env(name, fallback = '') {
    const value = process.env[name];
    if (typeof value !== 'string') return fallback;

    const cleaned = value.trim().replace(/^['"]|['"]$/g, '');
    return cleaned || fallback;
}

const pool = mysql.createPool({
    host: env('DB_HOST', 'localhost'),
    port: Number(env('DB_PORT', '3306')) || 3306,
    user: env('DB_USER', 'root'),
    password: env('DB_PASSWORD', ''),
    database: env('DB_NAME', 'sislove'),
    waitForConnections: true,
    connectionLimit: 10,
    timezone: '-03:00',
});

const demoUsers = [
    {
        id: 1,
        nome: 'Administrador',
        email: 'admin@sislove.com',
        senha_hash: '$2b$10$JoAN9u6AzGI4vD7ikmTsJuGyDQ1oZkhIyo7RkWUoPLWZbhwuUyWa6',
        perfil: 'admin',
        ativo: 1,
    },
    {
        id: 2,
        nome: 'Locador Demo',
        email: 'locador@sislove.com',
        senha_hash: '$2b$10$qZUFMmLRPJvplePl5Rmo6urlxA7ck0cxs4TyN0oQG3OCTZ6GgrhfO',
        perfil: 'locador',
        ativo: 1,
    },
    {
        id: 3,
        nome: 'Locatário Demo',
        email: 'locatario@sislove.com',
        senha_hash: '$2b$10$ch1Fi5BwQHKSQrn5LRQHC.1Xhq5Wvja4r7k0n115e8VuRMr45WEgu',
        perfil: 'locatario',
        ativo: 1,
    }
];

const demoLocadores = [
    { id: 1, tipo: 'fisica', nome: 'Carlos Eduardo Mendes', cpf: '321.654.987-01', rg: '12.345.678-9', data_nascimento: '1975-03-14', razao_social: null, cnpj: null, insc_estadual: null, email: 'carlos.mendes@email.com', telefone: '(11)3245-6789', celular: '(11)98745-1234', cep: '01310-100', endereco: 'Av. Paulista', numero: '1500', complemento: '', bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP', banco: 'Bradesco', agencia: '0023', conta: '12345-6', tipo_conta: 'corrente', pix_chave: '321.654.987-01', observacoes: 'Cadastro demo' },
    { id: 2, tipo: 'fisica', nome: 'Ana Paula Ferreira', cpf: '456.789.123-02', rg: '23.456.789-0', data_nascimento: '1982-07-22', razao_social: null, cnpj: null, insc_estadual: null, email: 'ana.ferreira@email.com', telefone: '(21)3567-8901', celular: '(21)99123-4567', cep: '20040-020', endereco: 'Rua da Assembleia', numero: '120', complemento: '', bairro: 'Centro', cidade: 'Rio de Janeiro', estado: 'RJ', banco: 'Itaú', agencia: '0741', conta: '98765-4', tipo_conta: 'corrente', pix_chave: 'ana.ferreira@email.com', observacoes: 'Cadastro demo' },
    { id: 3, tipo: 'fisica', nome: 'Roberto Silva Santos', cpf: '789.012.345-03', rg: '34.567.890-1', data_nascimento: '1969-11-05', razao_social: null, cnpj: null, insc_estadual: null, email: 'roberto.santos@email.com', telefone: '(31)3678-9012', celular: '(31)98234-5678', cep: '30130-010', endereco: 'Av. Afonso Pena', numero: '800', complemento: '', bairro: 'Centro', cidade: 'Belo Horizonte', estado: 'MG', banco: 'Caixa', agencia: '0162', conta: '56789-0', tipo_conta: 'poupanca', pix_chave: '(31)98234-5678', observacoes: 'Cadastro demo' },
    { id: 4, tipo: 'fisica', nome: 'Mariana Costa Lima', cpf: '012.345.678-04', rg: '45.678.901-2', data_nascimento: '1990-04-18', razao_social: null, cnpj: null, insc_estadual: null, email: 'mariana.lima@email.com', telefone: '(41)3789-0123', celular: '(41)97345-6789', cep: '80010-010', endereco: 'Rua XV de Novembro', numero: '250', complemento: '', bairro: 'Centro', cidade: 'Curitiba', estado: 'PR', banco: 'Nubank', agencia: '', conta: '12345678-9', tipo_conta: 'corrente', pix_chave: '012.345.678-04', observacoes: 'Cadastro demo' },
    { id: 5, tipo: 'fisica', nome: 'Fernando Oliveira Cruz', cpf: '135.246.357-05', rg: '56.789.012-3', data_nascimento: '1978-09-30', razao_social: null, cnpj: null, insc_estadual: null, email: 'fernando.cruz@email.com', telefone: '(51)3890-1234', celular: '(51)96456-7890', cep: '90010-000', endereco: 'Av. Borges de Medeiros', numero: '400', complemento: '', bairro: 'Centro Histórico', cidade: 'Porto Alegre', estado: 'RS', banco: 'Santander', agencia: '0033', conta: '23456-7', tipo_conta: 'corrente', pix_chave: '(51)96456-7890', observacoes: 'Cadastro demo' },
    { id: 6, tipo: 'fisica', nome: 'Luciana Araújo Dias', cpf: '246.357.468-06', rg: '67.890.123-4', data_nascimento: '1985-01-12', razao_social: null, cnpj: null, insc_estadual: null, email: 'luciana.dias@email.com', telefone: '(85)3901-2345', celular: '(85)99567-8901', cep: '60110-001', endereco: 'Av. Monsenhor Tabosa', numero: '789', complemento: '', bairro: 'Meireles', cidade: 'Fortaleza', estado: 'CE', banco: 'Bradesco', agencia: '0156', conta: '34567-8', tipo_conta: 'corrente', pix_chave: 'luciana.dias@email.com', observacoes: 'Cadastro demo' },
    { id: 7, tipo: 'fisica', nome: 'Marcelo Rodrigues Pinto', cpf: '357.468.579-07', rg: '78.901.234-5', data_nascimento: '1972-06-25', razao_social: null, cnpj: null, insc_estadual: null, email: 'marcelo.pinto@email.com', telefone: '(71)4012-3456', celular: '(71)98678-9012', cep: '40020-020', endereco: 'Av. Sete de Setembro', numero: '1200', complemento: '', bairro: 'Comércio', cidade: 'Salvador', estado: 'BA', banco: 'Banco do Brasil', agencia: '0027', conta: '45678-9', tipo_conta: 'corrente', pix_chave: '357.468.579-07', observacoes: 'Cadastro demo' },
    { id: 8, tipo: 'fisica', nome: 'Patrícia Gomes Nunes', cpf: '468.579.680-08', rg: '89.012.345-6', data_nascimento: '1988-12-03', razao_social: null, cnpj: null, insc_estadual: null, email: 'patricia.nunes@email.com', telefone: '(62)4123-4567', celular: '(62)97789-0123', cep: '74005-010', endereco: 'Av. Goiás', numero: '500', complemento: '', bairro: 'Centro', cidade: 'Goiânia', estado: 'GO', banco: 'Inter', agencia: '', conta: '87654321-0', tipo_conta: 'corrente', pix_chave: '(62)97789-0123', observacoes: 'Cadastro demo' },
    { id: 9, tipo: 'fisica', nome: 'Thiago Martins Souza', cpf: '579.680.791-09', rg: '90.123.456-7', data_nascimento: '1980-08-17', razao_social: null, cnpj: null, insc_estadual: null, email: 'thiago.souza@email.com', telefone: '(92)4234-5678', celular: '(92)96890-1234', cep: '69010-010', endereco: 'Av. Eduardo Ribeiro', numero: '850', complemento: '', bairro: 'Centro', cidade: 'Manaus', estado: 'AM', banco: 'Sicredi', agencia: '0155', conta: '56789-0', tipo_conta: 'corrente', pix_chave: 'thiago.souza@email.com', observacoes: 'Cadastro demo' },
    { id: 10, tipo: 'fisica', nome: 'Juliana Nascimento Alves', cpf: '680.791.802-10', rg: '01.234.567-8', data_nascimento: '1993-02-28', razao_social: null, cnpj: null, insc_estadual: null, email: 'juliana.alves@email.com', telefone: '(81)4345-6789', celular: '(81)99901-2345', cep: '50010-010', endereco: 'Rua do Sol', numero: '300', complemento: '', bairro: 'Santo Antônio', cidade: 'Recife', estado: 'PE', banco: 'C6 Bank', agencia: '', conta: '11223344-5', tipo_conta: 'corrente', pix_chave: '(81)99901-2345', observacoes: 'Cadastro demo' }
];

function isDbConnectionError(err) {
    const code = err?.code || '';
    const message = String(err?.message || '').toLowerCase();

    return [
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
        'EAI_AGAIN',
        'PROTOCOL_CONNECTION_LOST',
        'ER_ACCESS_DENIED_ERROR',
        'ER_BAD_DB_ERROR',
        'ER_BAD_FIELD_ERROR',
        'ER_CON_COUNT_ERROR',
        'ER_NOT_SUPPORTED_AUTH_MODE'
    ].includes(code) || code.startsWith('ER_') || message.includes('connect') || message.includes('access denied');
}

function getFallbackRows(sql, params = []) {
    if (typeof sql !== 'string') return null;

    const normalized = sql.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!normalized.startsWith('select')) return null;

    if (normalized.includes('from usuarios')) {
        const includeHash = normalized.includes('select *') || normalized.includes('senha_hash');
        let rows = demoUsers.map(usuario => {
            if (includeHash) return { ...usuario };
            return {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                perfil: usuario.perfil,
                ativo: usuario.ativo,
            };
        });

        if (normalized.includes('where email = ?')) {
            rows = rows.filter(usuario => usuario.email === params?.[0] && usuario.ativo === 1);
        }

        if (normalized.includes('where id = ?')) {
            rows = rows.filter(usuario => String(usuario.id) === String(params?.[0]) && usuario.ativo === 1);
        }

        return [rows, []];
    }

    if (normalized.includes('from locadores')) {
        let rows = demoLocadores.map(locador => ({ ...locador }));

        if (normalized.includes('where id = ?')) {
            rows = rows.filter(locador => String(locador.id) === String(params?.[0]));
        }

        rows.sort((a, b) => (a.razao_social || a.nome || '').localeCompare(b.razao_social || b.nome || ''));
        return [rows, []];
    }
    if (normalized.includes('from locatarios')) return [[], []];
    if (normalized.includes('from colaboradores')) return [[], []];
    if (normalized.includes('from veiculos')) return [[], []];
    if (normalized.includes('from despesas_receitas')) return [[], []];
    if (normalized.includes('from locacoes')) return [[], []];

    return null;
}

const originalQuery = pool.query.bind(pool);
const allowDemoMode = env('DB_ALLOW_DEMO_MODE', 'true').toLowerCase() !== 'false';
let demoModeLogged = false;

function formatDbError(err) {
    return err?.code || err?.message || 'sem detalhes';
}

pool.query = async (sql, params) => {
    try {
        return await originalQuery(sql, params);
    } catch (err) {
        if (!isDbConnectionError(err) || !allowDemoMode) throw err;

        const fallback = getFallbackRows(sql, params);
        if (fallback) {
            if (!demoModeLogged) {
                console.warn(`⚠️ MySQL indisponível (${formatDbError(err)}); usando modo demonstração.`);
                demoModeLogged = true;
            }
            return fallback;
        }

        throw err;
    }
};

// Testa conexão na inicialização
pool.getConnection()
    .then(conn => {
        console.log('✅ MySQL conectado com sucesso');
        conn.release();
    })
    .catch(err => {
        const message = `⚠️ MySQL indisponível (${formatDbError(err)}).`;
        if (allowDemoMode) {
            console.warn(`${message} Sistema seguirá em modo demonstração.`);
            return;
        }

        console.error(message);
    });

module.exports = pool;
