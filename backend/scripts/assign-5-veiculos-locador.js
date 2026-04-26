const mysql = require('mysql2/promise');

async function main() {
    const conn = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'sislove',
    });

    const [locadores] = await conn.query(
        "SELECT id, email FROM locadores WHERE LOWER(email)=LOWER(?) LIMIT 1",
        ['locador@sislove.com']
    );

    const locador = locadores[0];
    if (!locador) {
        throw new Error('Locador locador@sislove.com não encontrado em locadores.');
    }

    const locadorId = Number(locador.id);

    const [beforeRows] = await conn.query(
        'SELECT COUNT(*) AS total FROM veiculos WHERE locador_id = ?',
        [locadorId]
    );
    const totalAntes = beforeRows[0].total;

    const [candidatos] = await conn.query(
        `SELECT id, placa, marca, modelo, locador_id
     FROM veiculos
     WHERE locador_id <> ? OR locador_id IS NULL
     ORDER BY id
     LIMIT 5`,
        [locadorId]
    );

    if (candidatos.length < 5) {
        throw new Error(`Não há veículos suficientes para atribuir 5. Disponíveis: ${candidatos.length}`);
    }

    const ids = candidatos.map((v) => v.id);
    await conn.query('UPDATE veiculos SET locador_id = ? WHERE id IN (?)', [locadorId, ids]);

    const [afterRows] = await conn.query(
        'SELECT COUNT(*) AS total FROM veiculos WHERE locador_id = ?',
        [locadorId]
    );
    const totalDepois = afterRows[0].total;

    const [atualizados] = await conn.query(
        `SELECT id, placa, marca, modelo, locador_id
     FROM veiculos
     WHERE id IN (?)
     ORDER BY id`,
        [ids]
    );

    console.log('Locador alvo:', locador.email, '(id=', locadorId, ')');
    console.log('Total antes:', totalAntes);
    console.log('Total depois:', totalDepois);
    console.log('Veículos atribuídos agora:');
    for (const v of atualizados) {
        console.log(`- id=${v.id} | ${v.placa} | ${v.marca} ${v.modelo} | locador_id=${v.locador_id}`);
    }

    await conn.end();
}

main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});
