export function maskCpf(v) {
    return v.replace(/\D/g, '').slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCnpj(v) {
    return v.replace(/\D/g, '').slice(0, 14)
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function maskCep(v) {
    return v.replace(/\D/g, '').slice(0, 8)
        .replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

export function maskTelefone(v) {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 10) {
        return d
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
    }
    return d
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

export function maskRg(v) {
    // Aceita dígitos e X (dígito verificador)
    return v.replace(/[^0-9Xx]/g, '').slice(0, 9)
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})([0-9Xx]{1})$/, '$1-$2');
}

export function maskPlaca(v) {
    const c = v.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 7);
    if (c.length > 3) return c.slice(0, 3) + '-' + c.slice(3);
    return c;
}

export function maskRenavam(v) {
    return v.replace(/\D/g, '').slice(0, 11);
}

const FIELD_MASKS = {
    cpf: maskCpf,
    cnpj: maskCnpj,
    cep: maskCep,
    telefone: maskTelefone,
    celular: maskTelefone,
    whatsapp: maskTelefone,
    contatoTelefone: maskTelefone,
    refTelefone1: maskTelefone,
    refTelefone2: maskTelefone,
    rg: maskRg,
    placa: maskPlaca,
    renavam: maskRenavam,
};

export function applyMask(field, value) {
    const fn = FIELD_MASKS[field];
    return fn ? fn(value) : value;
}
