const envBase = String(import.meta.env.VITE_API_URL ?? '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\/$/, '');

const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const isRailwayHost = window.location.hostname.endsWith('.railway.app');
const sameOriginBase = window.location.origin;
const defaultProdBase = isRailwayHost
    ? 'https://backend-api-production-3d96.up.railway.app'
    : sameOriginBase;
const resolvedBase = envBase || (isLocalhost ? 'http://localhost:3001' : defaultProdBase);

const BASE = `${resolvedBase}/api`;
const FALLBACK_BASE = `${sameOriginBase}/api`;

function getToken() {
    return localStorage.getItem('sislove_token');
}

async function parseResponse(res) {
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
        localStorage.removeItem('sislove_token');
        localStorage.removeItem('sislove_usuario');
        window.location.href = '/login';
        return undefined;
    }

    if (!res.ok) {
        throw new Error(data.erro || `Erro ${res.status}`);
    }

    return data;
}

async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const options = {
        method,
        headers,
        cache: 'no-store',
        body: body !== undefined ? JSON.stringify(body) : undefined
    };

    const candidates = [BASE];
    if (!isLocalhost && !isRailwayHost && BASE !== FALLBACK_BASE) {
        candidates.push(FALLBACK_BASE);
    }

    for (let i = 0; i < candidates.length; i += 1) {
        const apiBase = candidates[i];
        try {
            const res = await fetch(`${apiBase}${path}`, options);
            return await parseResponse(res);
        } catch (error) {
            const isLast = i === candidates.length - 1;
            if (isLast) throw error;
        }
    }
}

export const api = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    patch: (path, body) => request('PATCH', path, body),
    delete: (path) => request('DELETE', path)
};
