const mysql = require('mysql2/promise');

async function main() {
    const conn = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'sislove',
    });

    const [u] = await conn.query("SHOW COLUMNS FROM usuarios LIKE 'senha_deve_trocar'");
    const [c] = await conn.query("SHOW COLUMNS FROM colaboradores LIKE 'auxiliares_json'");

    console.log('usuarios.senha_deve_trocar:', u.length ? 'OK' : 'FALTANDO');
    console.log('colaboradores.auxiliares_json:', c.length ? 'OK' : 'FALTANDO');

    await conn.end();
}

main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});
