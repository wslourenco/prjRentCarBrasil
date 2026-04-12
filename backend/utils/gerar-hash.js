// Utilitário para gerar o hash bcrypt das senhas iniciais
// Execute: node backend/utils/gerar-hash.js
const bcrypt = require('bcryptjs');

const senhas = [
    { email: 'admin@sislove.com', senha: 'admin123' },
    { email: 'locador@sislove.com', senha: 'locador123' },
    { email: 'locatario@sislove.com', senha: 'locatario123' },
];

(async () => {
    for (const { email, senha } of senhas) {
        const hash = await bcrypt.hash(senha, 10);
        console.log(`-- ${email}`);
        console.log(`UPDATE usuarios SET senha_hash='${hash}' WHERE email='${email}';`);
    }
})();
