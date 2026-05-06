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

// CPF — módulo 11 crescente (multiplicadores 2..10 da direita para a esquerda)
export function isValidCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf[8 - i]) * (i + 2);
    let rest = (sum * 10) % 11;
    if (rest >= 10) rest = 0;
    if (rest !== parseInt(cpf[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf[9 - i]) * (i + 2);
    rest = (sum * 10) % 11;
    if (rest >= 10) rest = 0;
    return rest === parseInt(cpf[10]);
}

export function isValidCNPJ(cnpj) {
    cnpj = cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
    const calc = (n) => {
        let sum = 0, pos = n - 7;
        for (let i = n; i >= 1; i--) { sum += cnpj.charAt(n - i) * pos--; if (pos < 2) pos = 9; }
        const r = sum % 11;
        return r < 2 ? 0 : 11 - r;
    };
    return calc(12) === parseInt(cnpj[12]) && calc(13) === parseInt(cnpj[13]);
}

// RG — regex + regras por UF (opcional). Sem UF: valida formato genérico brasileiro.
const RG_RULES = {
    SP: { re: /^[0-9]{7,8}[0-9X]$/i, label: 'SP (7-8 dígitos + dígito verificador, ex: 12.345.678-9)' },
    MG: { re: /^[MG0-9][0-9A-Z]{4,12}$/i, label: 'MG (5-13 caracteres alfanuméricos)' },
    RJ: { re: /^[0-9]{6,8}$/,           label: 'RJ (6-8 dígitos)' },
    RS: { re: /^[0-9]{10}$/,            label: 'RS (10 dígitos)' },
    PR: { re: /^[0-9]{7,9}[0-9X]?$/i,  label: 'PR (7-10 caracteres)' },
    SC: { re: /^[0-9]{7,9}[0-9X]?$/i,  label: 'SC (7-10 caracteres)' },
    BA: { re: /^[0-9]{6,9}$/,           label: 'BA (6-9 dígitos)' },
    ES: { re: /^[0-9A-Z]{5,14}$/i,      label: 'ES (5-14 alfanumérico)' },
};
const RG_GENERIC = /^[0-9A-Z]{5,14}$/i;

export function isValidRG(v, uf) {
    const cleaned = String(v || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
    if (!cleaned) return false;
    if (/^(.)\1+$/.test(cleaned)) return false; // todos iguais
    if (uf && RG_RULES[uf]) return RG_RULES[uf].re.test(cleaned);
    return RG_GENERIC.test(cleaned);
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
