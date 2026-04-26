
// Token de teste (será obtido do login)
const BASE_URL = 'http://localhost:3001/api';

async function testConfigurações() {
    console.log('🧪 Testando Endpoints de Configurações SMTP\n');
    console.log('═'.repeat(60) + '\n');

    // Step 1: Login como admin
    console.log('Step 1: Fazendo login como admin...');
    const loginRes = await fetch(`http://localhost:3001/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'admin@sislove.com',
            senha: 'admin123'
        })
    });

    if (!loginRes.ok) {
        console.log('❌ Falha no login. Usando credenciais de teste como locatário...\n');
        const loginRes2 = await fetch(`http://localhost:3001/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'locatario@sislove.com',
                senha: '123456'
            })
        });

        const loginData = await loginRes2.json();
        if (!loginData.token) {
            console.error('❌ Erro ao fazer login:', loginData);
            process.exit(1);
        }
        token = loginData.token;
        console.log('✓ Login bem-sucedido como locatário\n');
    } else {
        const loginData = await loginRes.json();
        token = loginData.token;
        console.log('✓ Login bem-sucedido como admin\n');
    }

    let token = null;
    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.token) {
        console.error('❌ Erro ao fazer login:', loginData);
        process.exit(1);
    }
    token = loginData.token;
    console.log('✓ Login bem-sucedido\n');

    // Step 2: Verificar status do SMTP
    console.log('Step 2: Verificando status do SMTP...');
    const statusRes = await fetch(`${BASE_URL}/configuracoes/smtp/status`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const statusData = await statusRes.json();
    console.log('Status SMTP:', JSON.stringify(statusData, null, 2));
    console.log();

    // Step 3: Verificar configuração específica
    console.log('Step 3: Obtendo configuração específica (smtp_host)...');
    const configRes = await fetch(`${BASE_URL}/configuracoes/smtp_host`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const configData = await configRes.json();
    console.log('Configuração:', JSON.stringify(configData, null, 2));
    console.log();

    // Step 4: Atualizar SMTP (admin only)
    console.log('Step 4: Atualizando configurações SMTP (admin only)...');
    const updateRes = await fetch(`${BASE_URL}/configuracoes/smtp`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            smtp_host: 'smtp.test.com',
            smtp_port: 587,
            smtp_user: 'test@test.com',
            smtp_pass: 'test123',
            smtp_secure: false,
            mail_from: 'noreply@test.com'
        })
    });

    if (updateRes.status === 403) {
        console.log('⚠️  Permissão negada (usuário não é admin, esperado)\n');
    } else {
        const updateData = await updateRes.json();
        console.log('Resultado:', JSON.stringify(updateData, null, 2));
        console.log();

        // Step 5: Testar conexão SMTP
        console.log('Step 5: Testando conexão SMTP...');
        const testRes = await fetch(`${BASE_URL}/configuracoes/smtp/testar`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const testData = await testRes.json();
        console.log('Resultado do teste:', JSON.stringify(testData, null, 2));
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Testes concluídos!');
}

testConfigurações().catch(console.error);
