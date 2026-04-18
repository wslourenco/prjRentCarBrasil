const envBase = String(import.meta.env.VITE_API_URL ?? '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\/$/, '');

const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const isRailwayHost = window.location.hostname.endsWith('.railway.app');
const sameOriginBase = window.location.origin;
const railwayDirectBase = 'https://backend-api-production-3d96.up.railway.app';
const defaultProdBase = sameOriginBase;
const resolvedBase = envBase || (isLocalhost ? 'http://localhost:3001' : defaultProdBase);

const BASE = `${resolvedBase}/api`;
const FALLBACK_BASE = `${sameOriginBase}/api`;

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

    if (isRailwayHost && BASE === FALLBACK_BASE) {
        candidates.push(`${railwayDirectBase}/api`);
    }

    if (!isLocalhost && BASE !== FALLBACK_BASE) {
        candidates.push(FALLBACK_BASE);
    }

    const maxAttemptsPerBase = 3;
    const retryDelays = [0, 800, 1800];

    for (let i = 0; i < candidates.length; i += 1) {
        const apiBase = candidates[i];

        for (let attempt = 1; attempt <= maxAttemptsPerBase; attempt += 1) {
            const delay = retryDelays[attempt - 1] ?? 0;
            if (delay > 0) await wait(delay);

            try {
                const res = await fetch(`${apiBase}${path}`, options);
                return await parseResponse(res);
            } catch (error) {
                const isLastBase = i === candidates.length - 1;
                const isLastAttempt = attempt === maxAttemptsPerBase;

                if (!isLastAttempt) continue;

                if (!isLastBase) break;

                // Normaliza erro de rede do navegador (TypeError: Failed to fetch).
                if (error instanceof TypeError) {
                    throw new Error('Falha de conexao com o servidor. Tente novamente em alguns segundos.');
                }

                throw error;
            }
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
