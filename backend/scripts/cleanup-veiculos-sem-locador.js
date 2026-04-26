const pool = require('../db');

async function main() {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [alvos] = await conn.query(
            `SELECT v.id, v.placa, v.marca, v.modelo, v.locador_id
             FROM veiculos v
             LEFT JOIN locadores l ON l.id = v.locador_id
             WHERE v.locador_id IS NULL OR l.id IS NULL
             ORDER BY v.id ASC`
        );

        if (!alvos.length) {
            await conn.rollback();
            console.log('Nenhum veículo órfão encontrado. Nada para excluir.');
            return;
        }

        const ids = alvos.map((v) => v.id);
        const placeholders = ids.map(() => '?').join(',');

        const [locacoesResult] = await conn.query(
            `DELETE FROM locacoes WHERE veiculo_id IN (${placeholders})`,
            ids
        );

        const [result] = await conn.query(
            `DELETE FROM veiculos WHERE id IN (${placeholders})`,
            ids
        );

        await conn.commit();

        console.log('Veículos excluídos com sucesso.');
        console.log('Locações removidas antes da exclusão:', locacoesResult.affectedRows);
        console.log('Quantidade:', result.affectedRows);
        console.log('IDs:', ids.join(', '));
        console.log('Detalhes:', JSON.stringify(alvos, null, 2));
    } catch (err) {
        try {
            await conn.rollback();
        } catch (rollbackErr) {
            console.error('Falha ao fazer rollback:', rollbackErr.message || rollbackErr);
        }
        console.error('ERRO:', err.message || err);
        process.exitCode = 1;
    } finally {
        conn.release();
        await pool.end();
    }
}

main();
