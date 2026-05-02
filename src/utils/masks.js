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
    const raw = String(v || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 14);
    if (!raw) return '';

    // Máscara progressiva XX.XXX.XXX-D para RGs numéricos (padrão da maioria dos estados)
    if (/^[0-9]{1,8}[0-9X]?$/.test(raw)) {
        if (raw.length <= 2) return raw;
        if (raw.length <= 5) return `${raw.slice(0, 2)}.${raw.slice(2)}`;
        if (raw.length <= 8) return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`;
        return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}-${raw.slice(8)}`;
    }

    // Estados com letras no RG (ex: MG, ES): sem máscara, apenas limpo
    return raw;
}

export function isValidRG(v) {
    const cleaned = String(v || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
    return cleaned.length >= 5 && cleaned.length <= 14;
}

export function maskPlaca(v) {
    const c = v.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 7);
    if (c.length > 3) return c.slice(0, 3) + '-' + c.slice(3);
    return c;
}

export function maskRenavam(v) {
    return v.replace(/\D/g, '').slice(0, 11);
}

export function maskMoeda(v) {
    const digits = String(v || '').replace(/\D/g, '');
    if (!digits) return '';

    const centavos = Number(digits);
    return (centavos / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
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
    valorDiario: maskMoeda,
};

export function applyMask(field, value) {
    const fn = FIELD_MASKS[field];
    return fn ? fn(value) : value;
}
