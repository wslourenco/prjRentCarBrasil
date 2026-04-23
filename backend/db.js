const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const shouldLoadEnvLocal =
    String(process.env.LOAD_ENV_LOCAL || '').toLowerCase() === 'true' ||
    String(process.env.VERCEL || '').toLowerCase() === '1' ||
    String(process.env.VERCEL || '').toLowerCase() === 'true';

if (shouldLoadEnvLocal) {
    dotenv.config({ path: path.join(__dirname, '.env.local') });
}

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
    charset: 'utf8mb4',
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
        tipo_documento: 'cpf',
        documento: '11122233344',
        ativo: 1,
    },
    {
        id: 2,
        nome: 'Locador Demo',
        email: 'locador@sislove.com',
        senha_hash: '$2b$10$qZUFMmLRPJvplePl5Rmo6urlxA7ck0cxs4TyN0oQG3OCTZ6GgrhfO',
        perfil: 'locador',
        tipo_documento: 'cpf',
        documento: '22233344455',
        ativo: 1,
    },
    {
        id: 3,
        nome: 'Locatário Demo',
        email: 'locatario@sislove.com',
        senha_hash: '$2b$10$ch1Fi5BwQHKSQrn5LRQHC.1Xhq5Wvja4r7k0n115e8VuRMr45WEgu',
        perfil: 'locatario',
        tipo_documento: 'cpf',
        documento: '33344455566',
        ativo: 1,
    }
];

const demoLocadores = [
    // Locador Wilson para testes
    { id: 99, tipo: 'fisica', nome: 'Wilson da Silva', cpf: '123.456.789-00', rg: '12.345.678-9', data_nascimento: '1980-01-01', razao_social: null, cnpj: null, insc_estadual: null, email: 'wilson@email.com', telefone: '(11)99999-0000', celular: '(11)98888-0000', cep: '01000-000', endereco: 'Rua Teste', numero: '100', complemento: '', bairro: 'Centro', cidade: 'São Paulo', estado: 'SP', banco: 'Itaú', agencia: '1234', conta: '56789-0', tipo_conta: 'corrente', pix_chave: '123.456.789-00', observacoes: 'Locador Wilson para testes' },
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

const demoLocatarios = [
    { id: 1, tipo: 'fisica', nome: 'Diego Henrique Barbosa', cpf: '111.222.333-44', rg: '11.222.333-4', data_nascimento: '1992-05-10', razao_social: null, cnpj: null, insc_estadual: null, email: 'diego.barbosa@email.com', telefone: '(11)3111-2222', celular: '(11)91111-2222', whatsapp: '(11)91111-2222', cep: '02010-010', endereco: 'Rua Voluntários da Pátria', numero: '400', complemento: '', bairro: 'Santana', cidade: 'São Paulo', estado: 'SP', cnh: '12345678900', categoria_cnh: 'AB', validade_cnh: '2027-05-10', orgao_emissor_cnh: 'DETRAN', estado_cnh: 'SP', motorist_app: 0, plataformas_app: '', avaliacao_app: '', profissao: 'Motorista de Aplicativo', renda_mensal: 3800.00, ref_nome1: '', ref_telefone1: '', ref_nome2: '', ref_telefone2: '', observacoes: 'Cadastro demo' },
    { id: 2, tipo: 'fisica', nome: 'Fernanda Cristina Moura', cpf: '222.333.444-55', rg: '22.333.444-5', data_nascimento: '1989-09-20', razao_social: null, cnpj: null, insc_estadual: null, email: 'fernanda.moura@email.com', telefone: '(21)3222-3333', celular: '(21)92222-3333', whatsapp: '(21)92222-3333', cep: '22030-010', endereco: 'Rua Siqueira Campos', numero: '200', complemento: '', bairro: 'Copacabana', cidade: 'Rio de Janeiro', estado: 'RJ', cnh: '23456789011', categoria_cnh: 'B', validade_cnh: '2026-09-20', orgao_emissor_cnh: 'DETRAN', estado_cnh: 'RJ', motorist_app: 0, plataformas_app: '', avaliacao_app: '', profissao: 'Entregadora', renda_mensal: 2900.00, ref_nome1: '', ref_telefone1: '', ref_nome2: '', ref_telefone2: '', observacoes: 'Cadastro demo' },
    { id: 3, tipo: 'fisica', nome: 'Gabriel Augusto Pereira', cpf: '333.444.555-66', rg: '33.444.555-6', data_nascimento: '1995-12-01', razao_social: null, cnpj: null, insc_estadual: null, email: 'gabriel.pereira@email.com', telefone: '(31)3333-4444', celular: '(31)93333-4444', whatsapp: '(31)93333-4444', cep: '30110-010', endereco: 'Av. do Contorno', numero: '600', complemento: '', bairro: 'Savassi', cidade: 'Belo Horizonte', estado: 'MG', cnh: '34567890122', categoria_cnh: 'B', validade_cnh: '2028-12-01', orgao_emissor_cnh: 'DETRAN', estado_cnh: 'MG', motorist_app: 0, plataformas_app: '', avaliacao_app: '', profissao: 'Técnico de TI', renda_mensal: 4500.00, ref_nome1: '', ref_telefone1: '', ref_nome2: '', ref_telefone2: '', observacoes: 'Cadastro demo' },
    { id: 4, tipo: 'fisica', nome: 'Helena Beatriz Cardoso', cpf: '444.555.666-77', rg: '44.555.666-7', data_nascimento: '1987-03-15', razao_social: null, cnpj: null, insc_estadual: null, email: 'helena.cardoso@email.com', telefone: '(41)3444-5555', celular: '(41)94444-5555', whatsapp: '(41)94444-5555', cep: '80210-080', endereco: 'Rua Marechal Hermes', numero: '150', complemento: '', bairro: 'Água Verde', cidade: 'Curitiba', estado: 'PR', cnh: '45678901233', categoria_cnh: 'B', validade_cnh: '2025-03-15', orgao_emissor_cnh: 'DETRAN', estado_cnh: 'PR', motorist_app: 0, plataformas_app: '', avaliacao_app: '', profissao: 'Professora', renda_mensal: 3200.00, ref_nome1: '', ref_telefone1: '', ref_nome2: '', ref_telefone2: '', observacoes: 'Cadastro demo' },
    { id: 5, tipo: 'fisica', nome: 'Igor Luís Teixeira', cpf: '555.666.777-88', rg: '55.666.777-8', data_nascimento: '1998-07-07', razao_social: null, cnpj: null, insc_estadual: null, email: 'igor.teixeira@email.com', telefone: '(51)3555-6666', celular: '(51)95555-6666', whatsapp: '(51)95555-6666', cep: '91010-010', endereco: 'Av. Farrapos', numero: '900', complemento: '', bairro: 'Floresta', cidade: 'Porto Alegre', estado: 'RS', cnh: '56789012344', categoria_cnh: 'AB', validade_cnh: '2029-07-07', orgao_emissor_cnh: 'DETRAN', estado_cnh: 'RS', motorist_app: 0, plataformas_app: '', avaliacao_app: '', profissao: 'Motorista de Aplicativo', renda_mensal: 4100.00, ref_nome1: '', ref_telefone1: '', ref_nome2: '', ref_telefone2: '', observacoes: 'Cadastro demo' },
    { id: 6, tipo: 'fisica', nome: 'Joana Maria Ribeiro', cpf: '666.777.888-99', rg: '66.777.888-9', data_nascimento: '1991-10-25', razao_social: null, cnpj: null, insc_estadual: null, email: 'joana.ribeiro@email.com', telefone: '(85)3666-7777', celular: '(85)96666-7777', whatsapp: '(85)96666-7777', cep: '60175-047', endereco: 'Rua Tibúrcio Cavalcante', numero: '350', complemento: '', bairro: 'Aldeota', cidade: 'Fortaleza', estado: 'CE', cnh: '67890123455', categoria_cnh: 'B', validade_cnh: '2026-10-25', orgao_emissor_cnh: 'DETRAN', estado_cnh: 'CE', motorist_app: 0, plataformas_app: '', avaliacao_app: '', profissao: 'Enfermeira', renda_mensal: 4800.00, ref_nome1: '', ref_telefone1: '', ref_nome2: '', ref_telefone2: '', observacoes: 'Cadastro demo' },
    { id: 7, tipo: 'fisica', nome: 'Lucas André Vasconcelos', cpf: '777.888.999-00', rg: '77.888.999-0', data_nascimento: '1994-02-14', razao_social: null, cnpj: null, insc_estadual: null, email: 'lucas.vasconcelos@email.com', telefone: '(71)3777-8888', celular: '(71)97777-8888', whatsapp: '(71)97777-8888', cep: '40060-330', endereco: 'Av. Oceânica', numero: '1500', complemento: '', bairro: 'Ondina', cidade: 'Salvador', estado: 'BA', cnh: '78901234566', categoria_cnh: 'AB', validade_cnh: '2028-02-14', orgao_emissor_cnh: 'DETRAN', estado_cnh: 'BA', motorist_app: 0, plataformas_app: '', avaliacao_app: '', profissao: 'Motorista de Aplicativo', renda_mensal: 3600.00, ref_nome1: '', ref_telefone1: '', ref_nome2: '', ref_telefone2: '', observacoes: 'Cadastro demo' },
    { id: 8, tipo: 'fisica', nome: 'Natália Priscila Campos', cpf: '888.999.000-11', rg: '88.999.000-1', data_nascimento: '1986-06-30', razao_social: null, cnpj: null, insc_estadual: null, email: 'natalia.campos@email.com', telefone: '(62)3888-9999', celular: '(62)98888-9999', whatsapp: '(62)98888-9999', cep: '74823-010', endereco: 'Rua 9', numero: '780', complemento: '', bairro: 'Setor Marista', cidade: 'Goiânia', estado: 'GO', cnh: '89012345677', categoria_cnh: 'B', validade_cnh: '2025-06-30', orgao_emissor_cnh: 'DETRAN', estado_cnh: 'GO', motorist_app: 0, plataformas_app: '', avaliacao_app: '', profissao: 'Advogada', renda_mensal: 7500.00, ref_nome1: '', ref_telefone1: '', ref_nome2: '', ref_telefone2: '', observacoes: 'Cadastro demo' },
    { id: 9, tipo: 'fisica', nome: 'Otávio Renan Castro', cpf: '999.000.111-22', rg: '99.000.111-2', data_nascimento: '1997-11-11', razao_social: null, cnpj: null, insc_estadual: null, email: 'otavio.castro@email.com', telefone: '(92)3999-0000', celular: '(92)99999-0000', whatsapp: '(92)99999-0000', cep: '69040-010', endereco: 'Rua Monsenhor Coutinho', numero: '680', complemento: '', bairro: 'Centro', cidade: 'Manaus', estado: 'AM', cnh: '90123456788', categoria_cnh: 'AB', validade_cnh: '2030-11-11', orgao_emissor_cnh: 'DETRAN', estado_cnh: 'AM', motorist_app: 0, plataformas_app: '', avaliacao_app: '', profissao: 'Motorista de Aplicativo', renda_mensal: 3300.00, ref_nome1: '', ref_telefone1: '', ref_nome2: '', ref_telefone2: '', observacoes: 'Cadastro demo' },
    { id: 10, tipo: 'fisica', nome: 'Paula Renata Figueiredo', cpf: '000.111.222-33', rg: '00.111.222-3', data_nascimento: '1990-04-04', razao_social: null, cnpj: null, insc_estadual: null, email: 'paula.figueiredo@email.com', telefone: '(81)3000-1111', celular: '(81)90000-1111', whatsapp: '(81)90000-1111', cep: '52050-010', endereco: 'Av. Norte Miguel Arraes de Alencar', numero: '2200', complemento: '', bairro: 'Casa Amarela', cidade: 'Recife', estado: 'PE', cnh: '01234567899', categoria_cnh: 'B', validade_cnh: '2027-04-04', orgao_emissor_cnh: 'DETRAN', estado_cnh: 'PE', motorist_app: 0, plataformas_app: '', avaliacao_app: '', profissao: 'Contadora', renda_mensal: 5200.00, ref_nome1: '', ref_telefone1: '', ref_nome2: '', ref_telefone2: '', observacoes: 'Cadastro demo' }
];

const demoVeiculos = [
    // Veículos do locador Wilson (id: 99)
    { id: 101, placa: 'WIL1A23', renavam: '00999999999', chassi: '9BWZZZ999WT000001', marca: 'Fiat', modelo: 'Uno', ano_fabricacao: 2018, ano_modelo: 2019, cor: 'Prata', combustivel: 'Flex', transmissao: 'Manual', nr_portas: 4, capacidade: 5, km_atual: 50000, km_compra: 20000, km_troca_oleo: 48000, km_troca_correia: null, km_troca_pneu: null, data_compra: '2019-01-10', valor_compra: 25000.00, valor_fipe: 27000.00, seguradora: '', nr_apolice: '', vencimento_seguro: null, data_licenciamento: null, data_vistoria: null, bloqueador: '', nr_bloqueador: '', locador_id: 99, foto: '', observacoes: 'Demo Wilson' },
    { id: 102, placa: 'WIL2B34', renavam: '00999999998', chassi: '9BWZZZ999WT000002', marca: 'Volkswagen', modelo: 'Gol', ano_fabricacao: 2020, ano_modelo: 2021, cor: 'Branco', combustivel: 'Flex', transmissao: 'Manual', nr_portas: 4, capacidade: 5, km_atual: 30000, km_compra: 10000, km_troca_oleo: 28000, km_troca_correia: null, km_troca_pneu: null, data_compra: '2021-02-15', valor_compra: 35000.00, valor_fipe: 37000.00, seguradora: '', nr_apolice: '', vencimento_seguro: null, data_licenciamento: null, data_vistoria: null, bloqueador: '', nr_bloqueador: '', locador_id: 99, foto: '', observacoes: 'Demo Wilson' },
    { id: 103, placa: 'WIL3C45', renavam: '00999999997', chassi: '9BWZZZ999WT000003', marca: 'Chevrolet', modelo: 'Onix', ano_fabricacao: 2022, ano_modelo: 2022, cor: 'Preto', combustivel: 'Flex', transmissao: 'Automático', nr_portas: 4, capacidade: 5, km_atual: 15000, km_compra: 0, km_troca_oleo: 14000, km_troca_correia: null, km_troca_pneu: null, data_compra: '2022-08-20', valor_compra: 60000.00, valor_fipe: 62000.00, seguradora: '', nr_apolice: '', vencimento_seguro: null, data_licenciamento: null, data_vistoria: null, bloqueador: '', nr_bloqueador: '', locador_id: 99, foto: '', observacoes: 'Demo Wilson' },
    { id: 1, placa: 'ABC1D23', renavam: '00123456789', chassi: '9BWZZZ377VT004251', marca: 'Hyundai', modelo: 'HB20 Sense', ano_fabricacao: 2022, ano_modelo: 2023, cor: 'Branco', combustivel: 'Flex', transmissao: 'Manual', nr_portas: 4, capacidade: 5, km_atual: 41200, km_compra: 15000, km_troca_oleo: 40000, km_troca_correia: null, km_troca_pneu: null, data_compra: '2022-03-10', valor_compra: 62000.00, valor_fipe: 65000.00, seguradora: '', nr_apolice: '', vencimento_seguro: null, data_licenciamento: null, data_vistoria: null, bloqueador: '', nr_bloqueador: '', locador_id: 1, foto: '', observacoes: 'Cadastro demo' },
    { id: 2, placa: 'DEF2E34', renavam: '00234567891', chassi: '9BGKS48U0HG123456', marca: 'Chevrolet', modelo: 'Onix Plus LT', ano_fabricacao: 2021, ano_modelo: 2022, cor: 'Prata', combustivel: 'Flex', transmissao: 'Automático', nr_portas: 4, capacidade: 5, km_atual: 66300, km_compra: 42000, km_troca_oleo: 65000, km_troca_correia: null, km_troca_pneu: null, data_compra: '2021-06-15', valor_compra: 72000.00, valor_fipe: 75000.00, seguradora: '', nr_apolice: '', vencimento_seguro: null, data_licenciamento: null, data_vistoria: null, bloqueador: '', nr_bloqueador: '', locador_id: 2, foto: '', observacoes: 'Cadastro demo' },
    { id: 3, placa: 'GHI3F45', renavam: '00345678902', chassi: '9C2JC4110ER123789', marca: 'Fiat', modelo: 'Cronos Drive', ano_fabricacao: 2023, ano_modelo: 2023, cor: 'Preto', combustivel: 'Flex', transmissao: 'Manual', nr_portas: 4, capacidade: 5, km_atual: 18200, km_compra: 8000, km_troca_oleo: 30000, km_troca_correia: null, km_troca_pneu: null, data_compra: '2023-01-20', valor_compra: 82000.00, valor_fipe: 85000.00, seguradora: '', nr_apolice: '', vencimento_seguro: null, data_licenciamento: null, data_vistoria: null, bloqueador: '', nr_bloqueador: '', locador_id: 3, foto: '', observacoes: 'Cadastro demo' },
    { id: 4, placa: 'JKL4G56', renavam: '00456789013', chassi: '9BD17145P26543210', marca: 'Fiat', modelo: 'Mobi Like', ano_fabricacao: 2022, ano_modelo: 2022, cor: 'Vermelho', combustivel: 'Flex', transmissao: 'Manual', nr_portas: 4, capacidade: 5, km_atual: 44000, km_compra: 30000, km_troca_oleo: 50000, km_troca_correia: null, km_troca_pneu: null, data_compra: '2022-09-05', valor_compra: 48000.00, valor_fipe: 50000.00, seguradora: '', nr_apolice: '', vencimento_seguro: null, data_licenciamento: null, data_vistoria: null, bloqueador: '', nr_bloqueador: '', locador_id: 4, foto: '', observacoes: 'Cadastro demo' },
    { id: 5, placa: 'MNO5H67', renavam: '00567890124', chassi: '9BFZZZ335JB123987', marca: 'Volkswagen', modelo: 'Polo MPI', ano_fabricacao: 2020, ano_modelo: 2021, cor: 'Cinza', combustivel: 'Flex', transmissao: 'Manual', nr_portas: 4, capacidade: 5, km_atual: 71000, km_compra: 55000, km_troca_oleo: 80000, km_troca_correia: null, km_troca_pneu: null, data_compra: '2020-11-12', valor_compra: 58000.00, valor_fipe: 60000.00, seguradora: '', nr_apolice: '', vencimento_seguro: null, data_licenciamento: null, data_vistoria: null, bloqueador: '', nr_bloqueador: '', locador_id: 5, foto: '', observacoes: 'Cadastro demo' },
    { id: 6, placa: 'PQR6I78', renavam: '00678901235', chassi: '8A1FB3AF0NU123654', marca: 'Renault', modelo: 'Sandero Zen', ano_fabricacao: 2021, ano_modelo: 2022, cor: 'Azul', combustivel: 'Flex', transmissao: 'Manual', nr_portas: 4, capacidade: 5, km_atual: 61250, km_compra: 38000, km_troca_oleo: 60000, km_troca_correia: null, km_troca_pneu: null, data_compra: '2021-04-30', valor_compra: 52000.00, valor_fipe: 54000.00, seguradora: '', nr_apolice: '', vencimento_seguro: null, data_licenciamento: null, data_vistoria: null, bloqueador: '', nr_bloqueador: '', locador_id: 6, foto: '', observacoes: 'Cadastro demo' },
    { id: 7, placa: 'STU7J89', renavam: '00789012346', chassi: '9BWZZZ377GT123321', marca: 'Volkswagen', modelo: 'T-Cross 200 TSI', ano_fabricacao: 2023, ano_modelo: 2024, cor: 'Branco', combustivel: 'Flex', transmissao: 'Automático', nr_portas: 4, capacidade: 5, km_atual: 12000, km_compra: 0, km_troca_oleo: 20000, km_troca_correia: null, km_troca_pneu: null, data_compra: '2023-07-18', valor_compra: 128000.00, valor_fipe: 132000.00, seguradora: '', nr_apolice: '', vencimento_seguro: null, data_licenciamento: null, data_vistoria: null, bloqueador: '', nr_bloqueador: '', locador_id: 7, foto: '', observacoes: 'Cadastro demo' },
    { id: 8, placa: 'VWX8K90', renavam: '00890123457', chassi: '9BFZZZ335TB123159', marca: 'Chevrolet', modelo: 'Tracker Premier', ano_fabricacao: 2022, ano_modelo: 2023, cor: 'Preto', combustivel: 'Flex', transmissao: 'Automático', nr_portas: 4, capacidade: 5, km_atual: 27000, km_compra: 10000, km_troca_oleo: 35000, km_troca_correia: null, km_troca_pneu: null, data_compra: '2022-12-01', valor_compra: 105000.00, valor_fipe: 110000.00, seguradora: '', nr_apolice: '', vencimento_seguro: null, data_licenciamento: null, data_vistoria: null, bloqueador: '', nr_bloqueador: '', locador_id: 8, foto: '', observacoes: 'Cadastro demo' },
    { id: 9, placa: 'YZA9L01', renavam: '00901234568', chassi: '9BD17117L10123753', marca: 'Fiat', modelo: 'Argo Drive', ano_fabricacao: 2021, ano_modelo: 2021, cor: 'Verde', combustivel: 'Flex', transmissao: 'Manual', nr_portas: 4, capacidade: 5, km_atual: 63000, km_compra: 47000, km_troca_oleo: 70000, km_troca_correia: null, km_troca_pneu: null, data_compra: '2021-08-22', valor_compra: 55000.00, valor_fipe: 57000.00, seguradora: '', nr_apolice: '', vencimento_seguro: null, data_licenciamento: null, data_vistoria: null, bloqueador: '', nr_bloqueador: '', locador_id: 9, foto: '', observacoes: 'Cadastro demo' },
    { id: 10, placa: 'BCD0M12', renavam: '01012345679', chassi: '9BWZZZ377KT123486', marca: 'Ford', modelo: 'Ka SE Plus', ano_fabricacao: 2020, ano_modelo: 2020, cor: 'Prata', combustivel: 'Flex', transmissao: 'Manual', nr_portas: 4, capacidade: 5, km_atual: 88000, km_compra: 72000, km_troca_oleo: 95000, km_troca_correia: null, km_troca_pneu: null, data_compra: '2020-05-14', valor_compra: 42000.00, valor_fipe: 43000.00, seguradora: '', nr_apolice: '', vencimento_seguro: null, data_licenciamento: null, data_vistoria: null, bloqueador: '', nr_bloqueador: '', locador_id: 10, foto: '', observacoes: 'Cadastro demo' }
];

const demoLocacoes = [
    { id: 1, veiculo_id: 1, locatario_id: 1, data_inicio: '2026-03-03', data_previsao_fim: '2026-06-02', data_encerramento: null, valor_semanal: 1200.00, caucao: 2400.00, km_entrada: 30100, km_saida: null, status: 'ativa', condicoes: 'Motorista de app. Pagamento toda segunda-feira.' },
    { id: 2, veiculo_id: 2, locatario_id: 2, data_inicio: '2026-03-03', data_previsao_fim: '2026-06-02', data_encerramento: null, valor_semanal: 1350.00, caucao: 2700.00, km_entrada: 56500, km_saida: null, status: 'ativa', condicoes: 'Entregadora. Pagamento toda segunda-feira.' },
    { id: 3, veiculo_id: 3, locatario_id: 3, data_inicio: '2026-03-10', data_previsao_fim: '2026-06-09', data_encerramento: null, valor_semanal: 1400.00, caucao: 2800.00, km_entrada: 17000, km_saida: null, status: 'ativa', condicoes: 'Técnico de TI. Pagamento toda segunda-feira.' },
    { id: 4, veiculo_id: 4, locatario_id: 4, data_inicio: '2026-02-03', data_previsao_fim: '2026-05-05', data_encerramento: '2026-04-01', valor_semanal: 900.00, caucao: 1800.00, km_entrada: 41000, km_saida: 44000, status: 'encerrada', condicoes: 'Encerrada antecipadamente a pedido do locatário.' },
    { id: 5, veiculo_id: 5, locatario_id: 5, data_inicio: '2026-03-17', data_previsao_fim: '2026-06-16', data_encerramento: null, valor_semanal: 1250.00, caucao: 2500.00, km_entrada: 68500, km_saida: null, status: 'ativa', condicoes: 'Motorista de app. Pagamento toda segunda-feira.' },
    { id: 6, veiculo_id: 6, locatario_id: 6, data_inicio: '2026-02-17', data_previsao_fim: '2026-05-19', data_encerramento: '2026-03-31', valor_semanal: 1100.00, caucao: 2200.00, km_entrada: 49000, km_saida: 52000, status: 'encerrada', condicoes: 'Contrato encerrado no prazo.' },
    { id: 7, veiculo_id: 7, locatario_id: 7, data_inicio: '2026-03-24', data_previsao_fim: '2026-06-23', data_encerramento: null, valor_semanal: 1500.00, caucao: 3000.00, km_entrada: 10500, km_saida: null, status: 'ativa', condicoes: 'Motorista de app. T-Cross. Pagamento toda segunda-feira.' },
    { id: 8, veiculo_id: 8, locatario_id: 8, data_inicio: '2026-04-07', data_previsao_fim: '2026-07-07', data_encerramento: null, valor_semanal: 1450.00, caucao: 3000.00, km_entrada: 26500, km_saida: null, status: 'ativa', condicoes: 'Pagamento toda segunda-feira. Caução pago.' },
    { id: 9, veiculo_id: 9, locatario_id: 9, data_inicio: '2026-01-13', data_previsao_fim: '2026-04-14', data_encerramento: '2026-04-06', valor_semanal: 1100.00, caucao: 2200.00, km_entrada: 57000, km_saida: 63000, status: 'encerrada', condicoes: 'Contrato encerrado no prazo.' },
    { id: 10, veiculo_id: 10, locatario_id: 10, data_inicio: '2026-03-02', data_previsao_fim: null, data_encerramento: '2026-03-09', valor_semanal: 1000.00, caucao: 2000.00, km_entrada: 86000, km_saida: null, status: 'cancelada', condicoes: 'Cancelada: locatário desistiu antes de retirar o veículo.' }
];

const demoFinanceiro = [
    { id: 1, tipo: 'receita', data: '2026-03-07', valor: 1200.00, categoria: 'Aluguel Semanal', descricao: 'Semana 09/2026 – HB20 ABC1D23', forma_pagamento: 'pix', comprovante: '', veiculo_id: 1, locatario_id: 1, colaborador_id: null, observacoes: 'Receita demo', placa_veiculo: 'ABC1D23', nome_veiculo: 'Hyundai HB20 Sense', nome_locatario: 'Diego Henrique Barbosa', nome_colaborador: null },
    { id: 2, tipo: 'receita', data: '2026-03-07', valor: 1350.00, categoria: 'Aluguel Semanal', descricao: 'Semana 09/2026 – Onix DEF2E34', forma_pagamento: 'pix', comprovante: '', veiculo_id: 2, locatario_id: 2, colaborador_id: null, observacoes: 'Receita demo', placa_veiculo: 'DEF2E34', nome_veiculo: 'Chevrolet Onix Plus LT', nome_locatario: 'Fernanda Cristina Moura', nome_colaborador: null },
    { id: 3, tipo: 'receita', data: '2026-03-14', valor: 1400.00, categoria: 'Aluguel Semanal', descricao: 'Semana 10/2026 – Cronos GHI3F45', forma_pagamento: 'pix', comprovante: '', veiculo_id: 3, locatario_id: 3, colaborador_id: null, observacoes: 'Receita demo', placa_veiculo: 'GHI3F45', nome_veiculo: 'Fiat Cronos Drive', nome_locatario: 'Gabriel Augusto Pereira', nome_colaborador: null },
    { id: 4, tipo: 'receita', data: '2026-04-07', valor: 3000.00, categoria: 'Caução/Depósito', descricao: 'Caução locação Tracker VWX8K90', forma_pagamento: 'deposito', comprovante: '', veiculo_id: 8, locatario_id: 8, colaborador_id: null, observacoes: 'Receita demo', placa_veiculo: 'VWX8K90', nome_veiculo: 'Chevrolet Tracker Premier', nome_locatario: 'Natália Priscila Campos', nome_colaborador: null },
    { id: 5, tipo: 'despesa', data: '2026-03-05', valor: 280.00, categoria: 'Troca de Óleo', descricao: 'Troca de óleo e filtro – HB20 ABC1D23', forma_pagamento: 'pix', comprovante: '', veiculo_id: 1, locatario_id: null, colaborador_id: null, observacoes: 'Manutenção preventiva', placa_veiculo: 'ABC1D23', nome_veiculo: 'Hyundai HB20 Sense', nome_locatario: null, nome_colaborador: null },
    { id: 6, tipo: 'despesa', data: '2026-03-08', valor: 650.00, categoria: 'Freios', descricao: 'Revisão freios dianteiros – Onix DEF2E34', forma_pagamento: 'pix', comprovante: '', veiculo_id: 2, locatario_id: null, colaborador_id: null, observacoes: 'Troca de pastilhas', placa_veiculo: 'DEF2E34', nome_veiculo: 'Chevrolet Onix Plus LT', nome_locatario: null, nome_colaborador: null },
    { id: 7, tipo: 'despesa', data: '2026-03-15', valor: 320.00, categoria: 'Manutenção Preventiva', descricao: 'Alinhamento e balanceamento – Argo YZA9L01', forma_pagamento: 'pix', comprovante: '', veiculo_id: 9, locatario_id: null, colaborador_id: null, observacoes: 'Revisão de rotina', placa_veiculo: 'YZA9L01', nome_veiculo: 'Fiat Argo Drive', nome_locatario: null, nome_colaborador: null },
    { id: 8, tipo: 'despesa', data: '2026-03-18', valor: 890.00, categoria: 'Troca de Pneu', descricao: 'Troca de pneu dianteiro direito – Ka BCD0M12', forma_pagamento: 'dinheiro', comprovante: '', veiculo_id: 10, locatario_id: null, colaborador_id: null, observacoes: 'Pneu danificado', placa_veiculo: 'BCD0M12', nome_veiculo: 'Ford Ka SE Plus', nome_locatario: null, nome_colaborador: null },
    { id: 9, tipo: 'despesa', data: '2026-03-25', valor: 450.00, categoria: 'Troca de Correia', descricao: 'Troca de correia dentada – Sandero PQR6I78', forma_pagamento: 'pix', comprovante: '', veiculo_id: 6, locatario_id: null, colaborador_id: null, observacoes: 'Preventiva', placa_veiculo: 'PQR6I78', nome_veiculo: 'Renault Sandero Zen', nome_locatario: null, nome_colaborador: null }
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
                tipo_documento: usuario.tipo_documento,
                documento: usuario.documento,
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
    if (normalized.includes('from locatarios')) {
        let rows = demoLocatarios.map(locatario => ({ ...locatario }));

        if (normalized.includes('where id = ?')) {
            rows = rows.filter(locatario => String(locatario.id) === String(params?.[0]));
        }

        rows.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        return [rows, []];
    }

    if (normalized.includes('from colaboradores')) return [[], []];

    if (normalized.includes('from veiculos')) {
        let rows = demoVeiculos.map(veiculo => ({
            ...veiculo,
            nome_locador: demoLocadores.find(locador => locador.id === veiculo.locador_id)?.nome || ''
        }));

        if (normalized.includes('where v.id = ?') || normalized.includes('where id = ?')) {
            rows = rows.filter(veiculo => String(veiculo.id) === String(params?.[0]));
        }

        rows.sort((a, b) => (a.placa || '').localeCompare(b.placa || ''));
        return [rows, []];
    }

    if (normalized.includes('from despesas_receitas')) {
        let rows = demoFinanceiro.map(item => ({ ...item }));

        if (normalized.includes('where id = ?')) {
            rows = rows.filter(item => String(item.id) === String(params?.[0]));
        }

        rows.sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
        return [rows, []];
    }

    if (normalized.includes('from locacoes')) {
        let rows = demoLocacoes.map(locacao => {
            const veiculo = demoVeiculos.find(item => item.id === locacao.veiculo_id);
            const locatario = demoLocatarios.find(item => item.id === locacao.locatario_id);

            return {
                ...locacao,
                nome_veiculo: veiculo ? `${veiculo.marca} ${veiculo.modelo}` : '',
                placa: veiculo?.placa || '',
                nome_locatario: locatario?.nome || '',
                celular_locatario: locatario?.celular || ''
            };
        });

        if (normalized.includes('where lc.id = ?') || normalized.includes('where id = ?')) {
            rows = rows.filter(locacao => String(locacao.id) === String(params?.[0]));
        }

        rows.sort((a, b) => String(b.data_inicio || '').localeCompare(String(a.data_inicio || '')));
        return [rows, []];
    }

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
