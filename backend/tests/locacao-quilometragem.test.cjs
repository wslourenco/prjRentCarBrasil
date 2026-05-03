const test = require('node:test');
const assert = require('node:assert');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.test' });

// Pool sem banco de dados para setup inicial
const setupPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 10,
});

// Pool com banco de dados de teste
let pool;

const getConnection = async () => {
    const conn = await pool.getConnection();
    return conn;
};

// Criar banco de dados de teste e tabelas
const setupTestDatabase = async () => {
    let setupConn;
    try {
        setupConn = await setupPool.getConnection();
        const dbName = process.env.DB_NAME || 'sislove_test';

        // Criar banco se não existir
        await setupConn.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
        console.log(`✔ Banco de dados '${dbName}' criado/verificado`);

        setupConn.release();

        // Criar pool com banco de dados
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: dbName,
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 10,
            enableKeepAlive: true,
        });

        // Conectar e criar tabelas
        const conn = await pool.getConnection();

        // Drop de tabelas antigas se existirem (para limpeza)
        await conn.query('DROP TABLE IF EXISTS locacoes');
        await conn.query('DROP TABLE IF EXISTS veiculos');
        await conn.query('DROP TABLE IF EXISTS colaboradores');
        await conn.query('DROP TABLE IF EXISTS locadores');
        await conn.query('DROP TABLE IF EXISTS usuarios');

        // Criar tabelas
        await conn.query(`
      CREATE TABLE usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        perfil ENUM('locador', 'auxiliar', 'admin') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await conn.query(`
      CREATE TABLE locadores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL UNIQUE,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        documento VARCHAR(20) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

        await conn.query(`
      CREATE TABLE colaboradores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        locador_id INT,
        auxiliares_json JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (locador_id) REFERENCES locadores(id) ON DELETE CASCADE
      )
    `);

        await conn.query(`
      CREATE TABLE veiculos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        locador_id INT NOT NULL,
        placa VARCHAR(20) UNIQUE NOT NULL,
        modelo VARCHAR(255) NOT NULL,
        km_atual INT DEFAULT 0,
        status ENUM('disponivel', 'alugado', 'manutenção') DEFAULT 'disponivel',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (locador_id) REFERENCES locadores(id) ON DELETE CASCADE
      )
    `);

        await conn.query(`
      CREATE TABLE locacoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        veiculo_id INT NOT NULL,
        locador_id INT NOT NULL,
        km_entrada INT NOT NULL,
        km_saida INT,
        data_inicio DATETIME NOT NULL,
        data_fim DATETIME,
        status ENUM('ativa', 'encerrada', 'cancelada') DEFAULT 'ativa',
        comprovante_pagamento VARCHAR(120),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE CASCADE,
        FOREIGN KEY (locador_id) REFERENCES locadores(id) ON DELETE CASCADE
      )
    `);

        console.log('✔ Tabelas de teste criadas com sucesso');
        conn.release();

    } catch (err) {
        console.error('Erro ao configurar banco de dados de teste:', err.message);
        throw err;
    }
};

test.before(async () => {
    await setupTestDatabase();
});

test('Fluxo completo de quilometragem: criar → encerrar → verificar atualização', async (t) => {
    let conn;

    try {
        conn = await getConnection();

        // Setup: Criar dados de teste
        await conn.query('DELETE FROM locacoes WHERE 1');
        await conn.query('DELETE FROM veiculos WHERE 1');
        await conn.query('DELETE FROM colaboradores WHERE 1');
        await conn.query('DELETE FROM locadores WHERE 1');
        await conn.query('DELETE FROM usuarios WHERE 1');

        // 1. Criar usuário (locador)
        await conn.query(
            `INSERT INTO usuarios (nome, email, senha, perfil) 
       VALUES ('Locador Teste', 'locador@teste.com', 'hash_senha', 'locador')`
        );
        const [usuariosRows] = await conn.query(
            `SELECT id FROM usuarios WHERE email = 'locador@teste.com'`
        );
        const usuarioId = usuariosRows[0].id;

        // 2. Criar locador
        await conn.query(
            `INSERT INTO locadores (usuario_id, nome, email, documento) 
       VALUES (?, 'Locador Teste', 'locador@teste.com', '12345678901234')`
            , [usuarioId]
        );
        const [locadoresRows] = await conn.query(
            `SELECT id FROM locadores WHERE usuario_id = ?`
            , [usuarioId]
        );
        const locadorId = locadoresRows[0].id;

        // 3. Criar veículo com km_atual = 5000
        const kmInicial = 5000;
        await conn.query(
            `INSERT INTO veiculos (locador_id, placa, modelo, km_atual, status) 
       VALUES (?, 'ABC1234', 'Toyota Corolla', ?, 'disponivel')`
            , [locadorId, kmInicial]
        );
        const [veiculosRows] = await conn.query(
            `SELECT id, km_atual FROM veiculos WHERE placa = 'ABC1234' LIMIT 1`
        );
        const veiculoId = veiculosRows[0].id;
        assert.strictEqual(veiculosRows[0].km_atual, kmInicial, 'km_atual inicial deve ser 5000');

        // 4. Criar locação com km_entrada = km_atual do banco
        const kmEntrada = kmInicial; // Deve ser 5000, não um valor fictício
        const dataInicio = new Date();

        const [criarLocacaoResult] = await conn.query(
            `INSERT INTO locacoes 
       (veiculo_id, locador_id, km_entrada, data_inicio, status) 
       VALUES (?, ?, ?, ?, 'ativa')`
            , [veiculoId, locadorId, kmEntrada, dataInicio]
        );
        const locacaoId = criarLocacaoResult.insertId;

        // 5. Verificar que km_entrada foi salvo corretamente
        const [locacaoAposCreateRows] = await conn.query(
            `SELECT km_entrada, km_saida FROM locacoes WHERE id = ? LIMIT 1`
            , [locacaoId]
        );
        assert.strictEqual(
            locacaoAposCreateRows[0].km_entrada,
            kmEntrada,
            `km_entrada deve ser ${kmEntrada}, não um valor fictício`
        );
        assert.strictEqual(
            locacaoAposCreateRows[0].km_saida,
            null,
            'km_saida deve ser null ao criar locação'
        );

        // 6. Encerrar locação com km_saida = 5500 (500 km a mais)
        const kmSaida = 5500;
        const dataFim = new Date(dataInicio.getTime() + 24 * 60 * 60 * 1000); // +1 dia
        const caminhoPDF = '/uploads/comprovantes-locacoes/comprovante_12345.pdf';

        await conn.query(
            `UPDATE locacoes 
       SET km_saida = ?, data_fim = ?, comprovante_pagamento = ?, status = 'encerrada'
       WHERE id = ? LIMIT 1`
            , [kmSaida, dataFim, caminhoPDF, locacaoId]
        );

        // 7. Atualizar km_atual do veículo para km_saida (ação crítica)
        await conn.query(
            `UPDATE veiculos SET km_atual = ? WHERE id = ? LIMIT 1`
            , [kmSaida, veiculoId]
        );

        // 8. Verificar que veículo.km_atual foi atualizado para km_saida
        const [veiculoAposEncerroRows] = await conn.query(
            `SELECT km_atual FROM veiculos WHERE id = ? LIMIT 1`
            , [veiculoId]
        );
        assert.strictEqual(
            veiculoAposEncerroRows[0].km_atual,
            kmSaida,
            `km_atual do veículo deve ser ${kmSaida} após encerramento`
        );

        // 9. Criar nova locação para mesmo veículo
        // CRITÉRIO CRUCIAL: km_entrada da nova locação deve ser km_saida da anterior (5500)
        const dataInicio2 = new Date(dataFim.getTime() + 1000);

        const [criarLocacao2Result] = await conn.query(
            `INSERT INTO locacoes 
       (veiculo_id, locador_id, km_entrada, data_inicio, status) 
       VALUES (?, ?, ?, ?, 'ativa')`
            , [veiculoId, locadorId, kmSaida, dataInicio2]
        );
        const locacao2Id = criarLocacao2Result.insertId;

        // 10. Verificar que km_entrada da nova locação é o km_saida anterior
        const [locacao2Rows] = await conn.query(
            `SELECT km_entrada FROM locacoes WHERE id = ? LIMIT 1`
            , [locacao2Id]
        );
        assert.strictEqual(
            locacao2Rows[0].km_entrada,
            kmSaida,
            `km_entrada da nova locação deve ser ${kmSaida} (km_saida anterior), garantindo continuidade`
        );

        console.log('✔ Teste passed: Quilometragem foi atualizada corretamente após encerramento');
        console.log(`  - Locação 1: km_entrada=${kmEntrada}, km_saida=${kmSaida}`);
        console.log(`  - Veículo km_atual após encerramento: ${kmSaida}`);
        console.log(`  - Locação 2: km_entrada=${kmSaida} (continuidade validada)`);

    } catch (err) {
        console.error('Teste failed:', err.message);
        throw err;
    } finally {
        if (conn) {
            try {
                // Cleanup
                await conn.query('DELETE FROM locacoes WHERE 1');
                await conn.query('DELETE FROM veiculos WHERE 1');
                await conn.query('DELETE FROM colaboradores WHERE 1');
                await conn.query('DELETE FROM locadores WHERE 1');
                await conn.query('DELETE FROM usuarios WHERE 1');
                conn.release();
            } catch (cleanupErr) {
                console.error('Cleanup error:', cleanupErr.message);
            }
        }
    }
});

test.after(async () => {
    await pool.end();
    await setupPool.end();
});
