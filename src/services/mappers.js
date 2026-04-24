function normalizarTextoMojibake(valor) {
    if (typeof valor !== 'string') return valor;
    if (!/[ÃÂâ�├]/.test(valor)) return valor;

    const corrigidoSequencias = valor
        .replace(/├º/g, 'ç')
        .replace(/├ú/g, 'ã')
        .replace(/├®/g, 'é')
        .replace(/├¡/g, 'á')
        .replace(/├ó/g, 'ó')
        .replace(/├ô/g, 'õ')
        .replace(/├ê/g, 'ê')
        .replace(/├í/g, 'í')
        .replace(/├ç/g, 'Ç')
        .replace(/Manuten[cç][aã]oEst[ée]tica/gi, 'Manutenção Estética');

    try {
        // Corrige textos que vieram como latin1, mas deveriam ser utf-8.
        const bytes = Uint8Array.from(corrigidoSequencias, (char) => char.charCodeAt(0) & 0xff);
        const convertido = new TextDecoder('utf-8').decode(bytes);
        return convertido || corrigidoSequencias;
    } catch {
        return corrigidoSequencias;
    }
}

function normalizarStringsObjeto(obj) {
    return Object.fromEntries(
        Object.entries(obj).map(([chave, valor]) => [chave, typeof valor === 'string' ? normalizarTextoMojibake(valor) : valor])
    );
}

// ── Locadores ──────────────────────────────────────────────────────────────────
export function locadorToApi(f) {
    return {
        tipo: f.tipo,
        nome: f.tipo === 'juridica' ? null : (f.nome || ''),
        cpf: f.tipo === 'juridica' ? null : (f.cpf || ''),
        rg: f.tipo === 'juridica' ? null : (f.rg || ''),
        data_nascimento: f.tipo === 'fisica' ? (f.dataNascimento || null) : null,
        razao_social: f.tipo === 'juridica' ? (f.razaoSocial || '') : null,
        cnpj: f.tipo === 'juridica' ? (f.cnpj || '') : null,
        insc_estadual: f.tipo === 'juridica' ? (f.inscEstadual || '') : null,
        email: f.email, telefone: f.telefone, celular: f.celular,
        cep: f.cep, endereco: f.endereco, numero: f.numero,
        complemento: f.complemento, bairro: f.bairro, cidade: f.cidade, estado: f.estado,
        banco: f.banco, agencia: f.agencia, conta: f.conta,
        tipo_conta: f.tipoConta, pix_chave: f.pixChave, observacoes: f.observacoes,
    };
}

export function locadorFromApi(r) {
    return normalizarStringsObjeto({
        id: r.id,
        tipo: r.tipo || 'fisica',
        nome: r.nome || '',
        cpf: r.cpf || '',
        rg: r.rg || '',
        dataNascimento: r.data_nascimento,
        razaoSocial: r.razao_social || '',
        cnpj: r.cnpj || '',
        inscEstadual: r.insc_estadual || '',
        email: r.email || '', telefone: r.telefone || '', celular: r.celular || '',
        cep: r.cep || '', endereco: r.endereco || '', numero: r.numero || '',
        complemento: r.complemento || '', bairro: r.bairro || '',
        cidade: r.cidade || '', estado: r.estado || '',
        banco: r.banco || '', agencia: r.agencia || '', conta: r.conta || '',
        tipoConta: r.tipo_conta || 'corrente', pixChave: r.pix_chave || '',
        observacoes: r.observacoes || '',
        // campo calculado para exibição
        nomeExibido: r.tipo === 'juridica' ? (r.razao_social || '') : (r.nome || ''),
    });
}

// ── Locatários ─────────────────────────────────────────────────────────────────
export function locatarioToApi(f) {
    return {
        tipo: f.tipo,
        nome: f.nome,
        cpf: f.cpf, rg: f.rg,
        data_nascimento: f.dataNascimento || null,
        razao_social: f.razaoSocial || null,
        cnpj: f.cnpj || null,
        insc_estadual: f.inscEstadual || null,
        email: f.email, telefone: f.telefone, celular: f.celular, whatsapp: f.whatsapp,
        cep: f.cep, endereco: f.endereco, numero: f.numero,
        complemento: f.complemento, bairro: f.bairro, cidade: f.cidade, estado: f.estado,
        cnh: f.cnh, categoria_cnh: f.categoriaCnh, validade_cnh: f.validadeCnh || null,
        orgao_emissor_cnh: f.orgaoEmissorCnh, estado_cnh: f.estadoCnh,
        motorist_app: f.motoristApp ? 1 : 0,
        plataformas_app: f.plataformasApp, avaliacao_app: f.avaliacaoApp,
        profissao: f.profissao, renda_mensal: f.rendaMensal || null,
        ref_nome1: f.refNome1, ref_telefone1: f.refTelefone1,
        ref_nome2: f.refNome2, ref_telefone2: f.refTelefone2,
        observacoes: f.observacoes,
    };
}

export function locatarioFromApi(r) {
    return normalizarStringsObjeto({
        id: r.id,
        tipo: r.tipo || 'fisica',
        nome: r.nome || '',
        cpf: r.cpf || '', rg: r.rg || '',
        dataNascimento: r.data_nascimento,
        razaoSocial: r.razao_social || '', cnpj: r.cnpj || '', inscEstadual: r.insc_estadual || '',
        email: r.email || '', telefone: r.telefone || '',
        celular: r.celular || '', whatsapp: r.whatsapp || '',
        cep: r.cep || '', endereco: r.endereco || '', numero: r.numero || '',
        complemento: r.complemento || '', bairro: r.bairro || '',
        cidade: r.cidade || '', estado: r.estado || '',
        cnh: r.cnh || '', categoriaCnh: r.categoria_cnh || 'B', validadeCnh: r.validade_cnh,
        orgaoEmissorCnh: r.orgao_emissor_cnh || '', estadoCnh: r.estado_cnh || '',
        motoristApp: !!r.motorist_app,
        plataformasApp: r.plataformas_app || '', avaliacaoApp: r.avaliacao_app || '',
        profissao: r.profissao || '', rendaMensal: r.renda_mensal || '',
        refNome1: r.ref_nome1 || '', refTelefone1: r.ref_telefone1 || '',
        refNome2: r.ref_nome2 || '', refTelefone2: r.ref_telefone2 || '',
        observacoes: r.observacoes || '',
    });
}

// ── Colaboradores ──────────────────────────────────────────────────────────────
export function colaboradorToApi(f) {
    // Para Auxiliar Administrativo, os dados do usuário ficam no formulário principal
    let auxiliares = Array.isArray(f.auxiliares) ? f.auxiliares : [];
    if (f.categoria === 'Auxiliar Administrativo' && auxiliares.length === 0 && (f.usuario || f.email)) {
        auxiliares = [{
            nome: f.nome || '',
            cargo: '',
            usuario: f.usuario || f.email || '',
            email: f.usuario || f.email || '',
            telefone: f.telefone || f.celular || '',
            senha: f.senha || '',
        }];
    }

    return {
        tipo: f.tipo,
        categoria: f.categoria,
        nome: f.tipo === 'fisica' ? (f.nome || '') : null,
        cpf: f.tipo === 'fisica' ? (f.cpf || '') : null,
        razao_social: f.tipo === 'juridica' ? (f.razaoSocial || '') : null,
        cnpj: f.tipo === 'juridica' ? (f.cnpj || '') : null,
        insc_estadual: f.tipo === 'juridica' ? (f.inscEstadual || '') : null,
        email: f.email, telefone: f.telefone, celular: f.celular,
        whatsapp: f.whatsapp, site: f.site,
        contato_nome: f.contatoNome, contato_cargo: f.contatoCargo, contato_telefone: f.contatoTelefone,
        cep: f.cep, endereco: f.endereco, numero: f.numero,
        complemento: f.complemento, bairro: f.bairro, cidade: f.cidade, estado: f.estado,
        banco: f.banco, agencia: f.agencia, conta: f.conta, pix_chave: f.pixChave,
        contrato: f.contrato, valor_contrato: f.valorContrato || null,
        vencimento_contrato: f.vencimentoContrato || null,
        observacoes: f.observacoes,
        auxiliares,
    };
}

export function colaboradorFromApi(r) {
    let auxiliares = [];
    if (r.auxiliares_json) {
        try { auxiliares = JSON.parse(r.auxiliares_json); } catch { auxiliares = []; }
    }
    return normalizarStringsObjeto({
        id: r.id,
        tipo: r.tipo || 'juridica',
        categoria: r.categoria || '',
        nome: r.nome || '',
        cpf: r.cpf || '',
        razaoSocial: r.razao_social || '',
        cnpj: r.cnpj || '',
        inscEstadual: r.insc_estadual || '',
        email: r.email || '', telefone: r.telefone || '', celular: r.celular || '',
        whatsapp: r.whatsapp || '', site: r.site || '',
        contatoNome: r.contato_nome || '', contatoCargo: r.contato_cargo || '',
        contatoTelefone: r.contato_telefone || '',
        cep: r.cep || '', endereco: r.endereco || '', numero: r.numero || '',
        complemento: r.complemento || '', bairro: r.bairro || '',
        cidade: r.cidade || '', estado: r.estado || '',
        banco: r.banco || '', agencia: r.agencia || '', conta: r.conta || '',
        pixChave: r.pix_chave || '',
        contrato: r.contrato || '', valorContrato: r.valor_contrato || '',
        vencimentoContrato: r.vencimento_contrato,
        observacoes: r.observacoes || '',
        auxiliares,
        nomeExibido: r.tipo === 'juridica' ? (r.razao_social || '') : (r.nome || ''),
    });
}

// ── Veículos ───────────────────────────────────────────────────────────────────
export function veiculoToApi(f) {
    return {
        placa: f.placa, renavam: f.renavam, chassi: f.chassi,
        marca: f.marca, modelo: f.modelo,
        ano_fabricacao: f.anoFabricacao || null, ano_modelo: f.anoModelo || null,
        cor: f.cor, combustivel: f.combustivel,
        transmissao: f.transmissao, nr_portas: f.nrPortas || null, capacidade: f.capacidade || null,
        km_atual: f.kmAtual || 0, km_compra: f.kmCompra || 0,
        km_troca_oleo: f.kmTrocaOleo || null,
        km_troca_correia: f.kmTrocaCorreia || null,
        km_troca_pneu: f.kmTrocaPneu || null,
        data_compra: f.dataCompra || null, valor_compra: f.valorCompra || null,
        valor_fipe: f.valorFipe || null,
        seguradora: f.seguradora, nr_apolice: f.nrApolice, vencimento_seguro: f.vencimentoSeguro || null,
        data_licenciamento: f.dataLicenciamento || null, data_vistoria: f.dataVistoria || null,
        bloqueador: f.bloqueador, nr_bloqueador: f.nrBloqueador,
        locador_id: f.locadorId || null, foto: f.foto, observacoes: f.observacoes,
    };
}

export function veiculoFromApi(r) {
    return normalizarStringsObjeto({
        id: r.id,
        placa: r.placa || '', renavam: r.renavam || '', chassi: r.chassi || '',
        marca: r.marca || '', modelo: r.modelo || '',
        anoFabricacao: r.ano_fabricacao, anoModelo: r.ano_modelo,
        cor: r.cor || '', combustivel: r.combustivel || 'Flex',
        transmissao: r.transmissao || 'Manual', nrPortas: r.nr_portas || '4', capacidade: r.capacidade || '5',
        kmAtual: r.km_atual ?? 0, kmCompra: r.km_compra ?? 0,
        kmTrocaOleo: r.km_troca_oleo, kmTrocaCorreia: r.km_troca_correia, kmTrocaPneu: r.km_troca_pneu,
        dataCompra: r.data_compra, valorCompra: r.valor_compra, valorFipe: r.valor_fipe,
        seguradora: r.seguradora || '', nrApolice: r.nr_apolice || '',
        vencimentoSeguro: r.vencimento_seguro,
        dataLicenciamento: r.data_licenciamento, dataVistoria: r.data_vistoria,
        bloqueador: r.bloqueador || '', nrBloqueador: r.nr_bloqueador || '',
        locadorId: r.locador_id, nomeLocador: r.nome_locador || '',
        foto: r.foto || '', observacoes: r.observacoes || '',
    });
}

// ── Financeiro ─────────────────────────────────────────────────────────────────
export function financeiroToApi(f) {
    return {
        tipo: f.tipo,
        data: f.data,
        valor: f.valor,
        categoria: f.categoria,
        descricao: f.descricao,
        forma_pagamento: f.formaPagamento,
        comprovante: f.comprovante,
        veiculo_id: f.veiculoId || null,
        locatario_id: f.locatarioId || null,
        colaborador_id: f.colaboradorId || null,
        observacoes: f.observacoes,
    };
}

export function financeiroFromApi(r) {
    return normalizarStringsObjeto({
        id: r.id,
        tipo: r.tipo,
        data: r.data,
        valor: r.valor,
        categoria: r.categoria || '',
        descricao: r.descricao || '',
        formaPagamento: r.forma_pagamento || 'pix',
        comprovante: r.comprovante || '',
        veiculoId: r.veiculo_id,
        locatarioId: r.locatario_id,
        colaboradorId: r.colaborador_id,
        observacoes: r.observacoes || '',
        placaVeiculo: r.placa_veiculo,
        marcaVeiculo: r.marca_veiculo || '',
        nomeVeiculo: r.nome_veiculo,
        nomeLocatario: r.nome_locatario,
        nomeColaborador: r.nome_colaborador,
    });
}

// ── Locações ───────────────────────────────────────────────────────────────────
export function locacaoToApi(f) {
    return {
        veiculo_id: f.veiculoId,
        locatario_id: f.locatarioId,
        data_inicio: f.dataInicio,
        data_previsao_fim: f.dataPrevisaoFim || null,
        valor_semanal: f.valorSemanal,
        caucao: f.caucao || 0,
        km_entrada: f.kmEntrada || 0,
        condicoes: f.condicoes || f.observacoes,
        periodicidade: f.periodicidade || null,
        quantidade_periodos: f.quantidadePeriodos || null,
        contrato: f.contrato || null,
        contrato_envio: f.contratoEnvio || 'email',
    };
}

export function locacaoFromApi(r) {
    return normalizarStringsObjeto({
        id: r.id,
        veiculoId: r.veiculo_id,
        locatarioId: r.locatario_id,
        dataInicio: r.data_inicio,
        dataPrevisaoFim: r.data_previsao_fim,
        dataEncerramento: r.data_encerramento,
        valorSemanal: r.valor_semanal,
        caucao: r.caucao,
        kmEntrada: r.km_entrada,
        kmSaida: r.km_saida,
        status: r.status,
        condicoes: r.condicoes || '',
        nomeVeiculo: r.nome_veiculo,
        placa: r.placa,
        nomeLocatario: r.nome_locatario,
        celularLocatario: r.celular_locatario,
        contratoEmailStatus: r.contrato_email_status || null,
        contratoEmailMensagem: r.contrato_email_mensagem || null,
        contratoPdfBase64: r.contrato_pdf_base64 || null,
        contratoPdfNomeArquivo: r.contrato_pdf_nome_arquivo || null,
        contratoPdfMimeType: r.contrato_pdf_mime_type || null,
        contratoEnvio: r.contrato_envio || null,
    });
}

// ── Usuários ───────────────────────────────────────────────────────────────────
export function usuarioFromApi(r) {
    return normalizarStringsObjeto({
        id: r.id,
        nome: r.nome || '',
        email: r.email || '',
        perfil: r.perfil || 'locador',
        tipoDocumento: r.tipo_documento || 'cpf',
        documento: r.documento || '',
        rg: r.rg || '',
        senhaDeveTrocar: r.senha_deve_trocar ? true : false,
        locatario: r.locatario
            ? {
                id: r.locatario.id || null,
                nome: r.locatario.nome || '',
                email: r.locatario.email || '',
                cpf: r.locatario.cpf || '',
                rg: r.locatario.rg || '',
                telefone: r.locatario.telefone || '',
                celular: r.locatario.celular || '',
                endereco: r.locatario.endereco || '',
                numero: r.locatario.numero || '',
                complemento: r.locatario.complemento || '',
                bairro: r.locatario.bairro || '',
                cidade: r.locatario.cidade || '',
                estado: r.locatario.estado || '',
                cep: r.locatario.cep || '',
            }
            : null,
        ativo: r.ativo ?? 1,
    });
}
