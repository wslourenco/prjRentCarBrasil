const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function contarDisponiveis(conn) {
    const [rows] = await conn.query(
        `SELECT COUNT(*) AS qtd
         FROM veiculos v
         LEFT JOIN locacoes l
           ON l.veiculo_id = v.id
          AND l.status = 'ativa'
          AND l.data_encerramento IS NULL
          AND (l.data_previsao_fim IS NULL OR l.data_previsao_fim >= CURDATE())
         WHERE l.id IS NULL`
    );
    return Number(rows?.[0]?.qtd || 0);
}

async function main() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'sislove',
    });

    try {
        const antes = await contarDisponiveis(conn);
        console.log(`Disponíveis antes: ${antes}`);

        // 1) Encerra locações ativas de usuários de teste criados automaticamente na sessão.
        const [testes] = await conn.query(
            `UPDATE locacoes lc
             INNER JOIN locatarios lt ON lt.id = lc.locatario_id
             SET lc.status = 'encerrada', lc.data_encerramento = CURDATE()
             WHERE lc.status = 'ativa'
               AND lt.email LIKE '%@sislove.local'`
        );
        console.log(`Locações de teste encerradas: ${Number(testes?.affectedRows || 0)}`);

        let disponiveis = await contarDisponiveis(conn);

        // 2) Se ainda não houver veículos, libera as 5 locações ativas mais antigas.
        if (disponiveis === 0) {
            const [ativas] = await conn.query(
                `SELECT id
                 FROM locacoes
                 WHERE status = 'ativa'
                   AND data_encerramento IS NULL
                   AND (data_previsao_fim IS NULL OR data_previsao_fim >= CURDATE())
                 ORDER BY data_inicio ASC, id ASC
                 LIMIT 5`
            );

            if (Array.isArray(ativas) && ativas.length > 0) {
                const ids = ativas.map(row => Number(row.id)).filter(Boolean);
                if (ids.length > 0) {
                    const placeholders = ids.map(() => '?').join(',');
                    const [fallback] = await conn.query(
                        `UPDATE locacoes
                         SET status = 'encerrada', data_encerramento = CURDATE()
                         WHERE id IN (${placeholders})`,
                        ids
                    );
                    console.log(`Locações ativas antigas encerradas (fallback): ${Number(fallback?.affectedRows || 0)}`);
                }
            }
            disponiveis = await contarDisponiveis(conn);
        }

        console.log(`Disponíveis depois: ${disponiveis}`);
    } finally {
        await conn.end();
    }
}

main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});
