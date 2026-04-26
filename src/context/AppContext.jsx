import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import {
    locadorToApi, locadorFromApi,
    locatarioToApi, locatarioFromApi,
    colaboradorToApi, colaboradorFromApi,
    veiculoToApi, veiculoFromApi,
    financeiroToApi, financeiroFromApi,
    locacaoToApi, locacaoFromApi,
    usuarioFromApi,
} from '../services/mappers';

const AppContext = createContext(null);

function getSettledValue(result, mapper) {
    if (result?.status !== 'fulfilled') return [];
    const value = Array.isArray(result.value) ? result.value : [];
    return mapper ? value.map(mapper) : value;
}

function getSettledError(...results) {
    const rejected = results.find(result => result?.status === 'rejected');
    return rejected?.reason?.message || null;
}

export function AppProvider({ children }) {
    const [usuarioLogado, setUsuarioLogado] = useState(() => {
        try {
            const u = localStorage.getItem('sislove_usuario');
            return u ? JSON.parse(u) : null;
        } catch {
            return null;
        }
    });

    const [locadores,        setLocadores]        = useState([]);
    const [locatarios,       setLocatarios]        = useState([]);
    const [colaboradores,    setColaboradores]     = useState([]);
    const [veiculos,         setVeiculos]          = useState([]);
    const [despesasReceitas, setDespesasReceitas]  = useState([]);
    const [locacoes,         setLocacoes]          = useState([]);
    const [usuarios,         setUsuarios]          = useState([]);
    const [carregando,       setCarregando]        = useState(false);
    const [erro,             setErro]              = useState(null);

    const sincronizarUsuarioAtual = useCallback(async () => {
        const me = await api.get('/auth/me');
        const usuarioNormalizado = usuarioFromApi({
            ...me,
            locatario: me.locatario || null,
            locador_vinculado: me.locador_vinculado || null,
            locador_proprio: me.locador_proprio || null,
        });
        localStorage.setItem('sislove_usuario', JSON.stringify(usuarioNormalizado));
        setUsuarioLogado(usuarioNormalizado);
        return usuarioNormalizado;
    }, []);

    const carregarDados = useCallback(async () => {
        if (!localStorage.getItem('sislove_token')) return;
        setCarregando(true);
        setErro(null);
        try {
            const perfil = usuarioLogado?.perfil;

            if (perfil === 'admin') {
                const [l, lt, col, v, fin, loc] = await Promise.allSettled([
                    api.get('/locadores'),
                    api.get('/locatarios'),
                    api.get('/colaboradores'),
                    api.get('/veiculos'),
                    api.get('/financeiro'),
                    api.get('/locacoes'),
                ]);
                setLocadores(getSettledValue(l, locadorFromApi));
                setLocatarios(getSettledValue(lt, locatarioFromApi));
                setColaboradores(getSettledValue(col, colaboradorFromApi));
                setVeiculos(getSettledValue(v, veiculoFromApi));
                setDespesasReceitas(getSettledValue(fin, financeiroFromApi));
                setLocacoes(getSettledValue(loc, locacaoFromApi));
                setErro(getSettledError(l, lt, col, v, fin, loc));
                return;
            }

            if (perfil === 'locador') {
                const [col, v, fin, loc] = await Promise.allSettled([
                    api.get('/colaboradores'),
                    api.get('/veiculos'),
                    api.get('/financeiro'),
                    api.get('/locacoes'),
                ]);
                setLocadores([]);
                setLocatarios([]);
                setColaboradores(getSettledValue(col, colaboradorFromApi));
                setVeiculos(getSettledValue(v, veiculoFromApi));
                setDespesasReceitas(getSettledValue(fin, financeiroFromApi));
                setLocacoes(getSettledValue(loc, locacaoFromApi));
                setErro(getSettledError(col, v, fin, loc));
                return;
            }

            if (perfil === 'locatario') {
                const [v, loc, fin] = await Promise.allSettled([
                    api.get('/veiculos'),
                    api.get('/locacoes'),
                    api.get('/financeiro'),
                ]);
                setLocadores([]);
                setLocatarios([]);
                setColaboradores([]);
                setDespesasReceitas(getSettledValue(fin, financeiroFromApi));
                setVeiculos(getSettledValue(v, veiculoFromApi));
                setLocacoes(getSettledValue(loc, locacaoFromApi));
                setErro(getSettledError(v, loc, fin));
                return;
            }

            if (perfil === 'auxiliar') {
                const [lt, v, fin, loc] = await Promise.allSettled([
                    api.get('/locatarios'),
                    api.get('/veiculos'),
                    api.get('/financeiro'),
                    api.get('/locacoes'),
                ]);
                setLocadores([]);
                setLocatarios(getSettledValue(lt, locatarioFromApi));
                setColaboradores([]);
                setVeiculos(getSettledValue(v, veiculoFromApi));
                setDespesasReceitas(getSettledValue(fin, financeiroFromApi));
                setLocacoes(getSettledValue(loc, locacaoFromApi));
                setErro(getSettledError(lt, v, fin, loc));
                return;
            }

            setLocadores([]);
            setLocatarios([]);
            setColaboradores([]);
            setVeiculos([]);
            setDespesasReceitas([]);
            setLocacoes([]);
        } catch (e) {
            setErro(e.message);
        } finally {
            setCarregando(false);
        }
    }, [usuarioLogado?.perfil]);

    useEffect(() => {
        if (usuarioLogado) carregarDados();
    }, [usuarioLogado, carregarDados]);

    useEffect(() => {
        if (!usuarioLogado || !localStorage.getItem('sislove_token')) return;

        let ativo = true;
        (async () => {
            try {
                const me = await api.get('/auth/me');
                const usuarioNormalizado = usuarioFromApi({
                    ...me,
                    locatario: me.locatario || null,
                    locador_vinculado: me.locador_vinculado || null,
                    locador_proprio: me.locador_proprio || null,
                });

                if (!ativo) return;
                const atualStr = JSON.stringify(usuarioLogado || {});
                const novoStr = JSON.stringify(usuarioNormalizado || {});
                if (atualStr !== novoStr) {
                    localStorage.setItem('sislove_usuario', novoStr);
                    setUsuarioLogado(usuarioNormalizado);
                }
            } catch {
                // Se falhar, mantém os dados locais de sessão.
            }
        })();

        return () => {
            ativo = false;
        };
    }, [usuarioLogado]);

    // ── Auth ──────────────────────────────────────────────
    async function login(email, senha) {
        const dados = await api.post('/auth/login', { email, senha });
        const usuarioBase = usuarioFromApi({
            ...(dados.usuario || {}),
            locatario: dados.locatario || null,
            senha_deve_trocar: dados.usuario?.senha_deve_trocar,
        });
        localStorage.setItem('sislove_token', dados.token);
        localStorage.setItem('sislove_usuario', JSON.stringify(usuarioBase));
        setUsuarioLogado(usuarioBase);

        try {
            return await sincronizarUsuarioAtual();
        } catch {
            return usuarioBase;
        }
    }

    async function trocarSenha(novaSenha) {
        await api.put('/auth/trocar-senha', { novaSenha });
        const atualizado = { ...usuarioLogado, senhaDeveTrocar: false };
        localStorage.setItem('sislove_usuario', JSON.stringify(atualizado));
        setUsuarioLogado(atualizado);
    }

    async function register(nome, email, senha, perfil, tipoDocumento, documento, rg) {
        const dados = await api.post('/auth/register', { nome, email, senha, perfil, tipoDocumento, documento, rg });
        const usuarioBase = usuarioFromApi({ ...(dados.usuario || {}), locatario: dados.locatario || null });
        localStorage.setItem('sislove_token', dados.token);
        localStorage.setItem('sislove_usuario', JSON.stringify(usuarioBase));
        setUsuarioLogado(usuarioBase);

        try {
            return await sincronizarUsuarioAtual();
        } catch {
            return usuarioBase;
        }
    }

    function logout() {
        localStorage.removeItem('sislove_token');
        localStorage.removeItem('sislove_usuario');
        setUsuarioLogado(null);
        setLocadores([]);
        setLocatarios([]);
        setColaboradores([]);
        setVeiculos([]);
        setDespesasReceitas([]);
        setLocacoes([]);
        setUsuarios([]);
    }

    // ── Locadores ─────────────────────────────────────────
    async function addLocador(dados) {
        const novo = await api.post('/locadores', locadorToApi(dados));
        setLocadores(prev => [...prev, locadorFromApi(novo)]);
        return locadorFromApi(novo);
    }
    async function updateLocador(id, dados) {
        const atualizado = await api.put(`/locadores/${id}`, locadorToApi(dados));
        setLocadores(prev => prev.map(l => l.id === id ? locadorFromApi(atualizado) : l));
        return locadorFromApi(atualizado);
    }
    async function removeLocador(id) {
        await api.delete(`/locadores/${id}`);
        setLocadores(prev => prev.filter(l => l.id !== id));
    }

    // ── Locatários ────────────────────────────────────────
    async function addLocatario(dados) {
        const novo = await api.post('/locatarios', locatarioToApi(dados));
        setLocatarios(prev => [...prev, locatarioFromApi(novo)]);
        return locatarioFromApi(novo);
    }
    async function updateLocatario(id, dados) {
        const atualizado = await api.put(`/locatarios/${id}`, locatarioToApi(dados));
        setLocatarios(prev => prev.map(l => l.id === id ? locatarioFromApi(atualizado) : l));
        return locatarioFromApi(atualizado);
    }
    async function removeLocatario(id) {
        await api.delete(`/locatarios/${id}`);
        setLocatarios(prev => prev.filter(l => l.id !== id));
    }

    // ── Colaboradores ─────────────────────────────────────
    async function addColaborador(dados) {
        const novo = await api.post('/colaboradores', colaboradorToApi(dados));
        setColaboradores(prev => [...prev, colaboradorFromApi(novo)]);
        return colaboradorFromApi(novo);
    }
    async function updateColaborador(id, dados) {
        const atualizado = await api.put(`/colaboradores/${id}`, colaboradorToApi(dados));
        setColaboradores(prev => prev.map(c => c.id === id ? colaboradorFromApi(atualizado) : c));
        return colaboradorFromApi(atualizado);
    }
    async function removeColaborador(id) {
        await api.delete(`/colaboradores/${id}`);
        setColaboradores(prev => prev.filter(c => c.id !== id));
    }

    // ── Veículos ──────────────────────────────────────────
    async function addVeiculo(dados) {
        const novo = await api.post('/veiculos', veiculoToApi(dados));
        setVeiculos(prev => [...prev, veiculoFromApi(novo)]);
        return veiculoFromApi(novo);
    }
    async function updateVeiculo(id, dados) {
        const atualizado = await api.put(`/veiculos/${id}`, veiculoToApi(dados));
        setVeiculos(prev => prev.map(v => v.id === id ? veiculoFromApi(atualizado) : v));
        return veiculoFromApi(atualizado);
    }
    async function removeVeiculo(id) {
        await api.delete(`/veiculos/${id}`);
        setVeiculos(prev => prev.filter(v => v.id !== id));
    }

    // ── Despesas / Receitas ───────────────────────────────
    async function addDespesaReceita(dados) {
        const novo = await api.post('/financeiro', financeiroToApi(dados));
        setDespesasReceitas(prev => [...prev, financeiroFromApi(novo)]);
        return financeiroFromApi(novo);
    }
    async function updateDespesaReceita(id, dados) {
        const atualizado = await api.put(`/financeiro/${id}`, financeiroToApi(dados));
        setDespesasReceitas(prev => prev.map(d => d.id === id ? financeiroFromApi(atualizado) : d));
        return financeiroFromApi(atualizado);
    }
    async function removeDespesaReceita(id) {
        await api.delete(`/financeiro/${id}`);
        setDespesasReceitas(prev => prev.filter(d => d.id !== id));
    }

    // ── Locações ──────────────────────────────────────────
    async function addLocacao(dados) {
        const nova = await api.post('/locacoes', locacaoToApi(dados));
        setLocacoes(prev => [...prev, locacaoFromApi(nova)]);
        // Recarrega veículos para refletir disponibilidade atual após nova locação.
        const listaVeiculosAtualizada = await api.get('/veiculos');
        setVeiculos(listaVeiculosAtualizada.map(veiculoFromApi));
        const fin = await api.get('/financeiro');
        setDespesasReceitas(fin.map(financeiroFromApi));
        return locacaoFromApi(nova);
    }
    async function updateLocacao(id, dados) {
        const atualizada = await api.put(`/locacoes/${id}`, locacaoToApi(dados));
        setLocacoes(prev => prev.map(l => l.id === id ? locacaoFromApi(atualizada) : l));
        return locacaoFromApi(atualizada);
    }
    async function encerrarLocacao(id, dados) {
        const arquivoComprovante = dados?.comprovanteArquivo || null;

        const payload = {
            ...(dados || {}),
            km_saida: dados?.kmSaida ?? dados?.km_saida ?? null,
            avaliacao_likert: Array.isArray(dados?.avaliacaoLikert) ? dados.avaliacaoLikert : null,
            comprovante_arquivo: arquivoComprovante
                ? {
                    nome: arquivoComprovante.nome || '',
                    tipo: arquivoComprovante.tipo || '',
                    conteudo_base64: arquivoComprovante.conteudoBase64 || '',
                }
                : null,
        };

        const resposta = await api.patch(`/locacoes/${id}/encerrar`, payload);
        const locacaoEncerrada = resposta?.locacao ? locacaoFromApi(resposta.locacao) : null;

        setLocacoes(prev => prev.map(l =>
            l.id === id
                ? (locacaoEncerrada || {
                    ...l,
                    status: 'encerrada',
                    kmSaida: payload.km_saida,
                    comprovantePagamento: payload.comprovante_arquivo?.nome || '',
                })
                : l
        ));

        const listaVeiculosAtualizada = await api.get('/veiculos');
        setVeiculos(listaVeiculosAtualizada.map(veiculoFromApi));
    }
    async function removeLocacao(id) {
        await api.delete(`/locacoes/${id}`);
        setLocacoes(prev => prev.filter(l => l.id !== id));
    }

    // ── Usuários (admin) ──────────────────────────────────
    async function carregarUsuarios() {
        const lista = await api.get('/usuarios');
        const normalizada = lista.map(usuarioFromApi);
        setUsuarios(normalizada);
        return normalizada;
    }
    async function addUsuario(dados) {
        const novo = await api.post('/usuarios', dados);
        const normalizado = usuarioFromApi(novo);
        setUsuarios(prev => [...prev, normalizado]);
        return normalizado;
    }
    async function updateUsuario(id, dados) {
        const atualizado = await api.put(`/usuarios/${id}`, dados);
        const normalizado = usuarioFromApi(atualizado);
        setUsuarios(prev => prev.map(u => u.id === id ? normalizado : u));
        return normalizado;
    }
    async function removeUsuario(id) {
        await api.delete(`/usuarios/${id}`);
        setUsuarios(prev => prev.filter(u => u.id !== id));
    }

    return (
        <AppContext.Provider value={{
            usuarioLogado, login, register, logout, trocarSenha,
            locadores,        addLocador,        updateLocador,        removeLocador,
            locatarios,       addLocatario,       updateLocatario,       removeLocatario,
            colaboradores,    addColaborador,    updateColaborador,    removeColaborador,
            veiculos,         addVeiculo,         updateVeiculo,         removeVeiculo,
            despesasReceitas, addDespesaReceita, updateDespesaReceita, removeDespesaReceita,
            locacoes,         addLocacao,         updateLocacao,         encerrarLocacao, removeLocacao,
            usuarios,         carregarUsuarios,   addUsuario,           updateUsuario,   removeUsuario,
            carregando, erro, carregarDados,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider');
    return ctx;
}
