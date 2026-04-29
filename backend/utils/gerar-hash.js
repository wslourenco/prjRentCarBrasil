// Utilitário para gerar o hash bcrypt das senhas iniciais
// Execute: node backend/utils/gerar-hash.js
const bcrypt = require('bcryptjs');

const senhas = [
    { email: 'admin@rentcarbrasil.com.br', senha: 'admin123' },
    { email: 'locador@rentcarbrasil.com.br', senha: 'locador123' },
    { email: 'locatario@rentcarbrasil.com.br', senha: 'locatario123' },
];

(async () => {
    for (const { email, senha } of senhas) {
        const hash = await bcrypt.hash(senha, 10);
        console.log(`-- ${email}`);
        console.log(`UPDATE usuarios SET senha_hash='${hash}' WHERE email='${email}';`);
    }
})();
