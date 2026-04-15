import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import {
    locadorToApi, locadorFromApi,
    locatarioToApi, locatarioFromApi,
    colaboradorToApi, colaboradorFromApi,
    veiculoToApi, veiculoFromApi,
    financeiroToApi, financeiroFromApi,
    locacaoToApi, locacaoFromApi,
} from '../services/mappers';

const AppContext = createContext(null);

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

    const carregarDados = useCallback(async () => {
        if (!localStorage.getItem('sislove_token')) return;
        setCarregando(true);
        setErro(null);
        try {
            const perfil = usuarioLogado?.perfil;

            if (perfil === 'admin') {
                const [l, lt, col, v, fin, loc] = await Promise.all([
                    api.get('/locadores'),
                    api.get('/locatarios'),
                    api.get('/colaboradores'),
                    api.get('/veiculos'),
                    api.get('/financeiro'),
                    api.get('/locacoes'),
                ]);
                setLocadores(l.map(locadorFromApi));
                setLocatarios(lt.map(locatarioFromApi));
                setColaboradores(col.map(colaboradorFromApi));
                setVeiculos(v.map(veiculoFromApi));
                setDespesasReceitas(fin.map(financeiroFromApi));
                setLocacoes(loc.map(locacaoFromApi));
                return;
            }

            if (perfil === 'locador') {
                const [v, fin, loc] = await Promise.all([
                    api.get('/veiculos'),
                    api.get('/financeiro'),
                    api.get('/locacoes'),
                ]);
                setLocadores([]);
                setLocatarios([]);
                setColaboradores([]);
                setVeiculos(v.map(veiculoFromApi));
                setDespesasReceitas(fin.map(financeiroFromApi));
                setLocacoes(loc.map(locacaoFromApi));
                return;
            }

            if (perfil === 'locatario') {
                const [v, loc] = await Promise.all([
                    api.get('/veiculos'),
                    api.get('/locacoes'),
                ]);
                setLocadores([]);
                setLocatarios([]);
                setColaboradores([]);
                setDespesasReceitas([]);
                setVeiculos(v.map(veiculoFromApi));
                setLocacoes(loc.map(locacaoFromApi));
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

    // ── Auth ──────────────────────────────────────────────
    async function login(email, senha) {
        const dados = await api.post('/auth/login', { email, senha });
        localStorage.setItem('sislove_token', dados.token);
        localStorage.setItem('sislove_usuario', JSON.stringify(dados.usuario));
        setUsuarioLogado(dados.usuario);
        return dados.usuario;
    }

    async function register(nome, email, senha, perfil) {
        const dados = await api.post('/auth/register', { nome, email, senha, perfil });
        localStorage.setItem('sislove_token', dados.token);
        localStorage.setItem('sislove_usuario', JSON.stringify(dados.usuario));
        setUsuarioLogado(dados.usuario);
        return dados.usuario;
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
        await api.patch(`/locacoes/${id}/encerrar`, dados || {});
        setLocacoes(prev => prev.map(l =>
            l.id === id ? { ...l, status: 'encerrada', ...(dados || {}) } : l
        ));
    }
    async function removeLocacao(id) {
        await api.delete(`/locacoes/${id}`);
        setLocacoes(prev => prev.filter(l => l.id !== id));
    }

    // ── Usuários (admin) ──────────────────────────────────
    async function carregarUsuarios() {
        const lista = await api.get('/usuarios');
        setUsuarios(lista);
        return lista;
    }
    async function addUsuario(dados) {
        const novo = await api.post('/usuarios', dados);
        setUsuarios(prev => [...prev, novo]);
        return novo;
    }
    async function updateUsuario(id, dados) {
        const atualizado = await api.put(`/usuarios/${id}`, dados);
        setUsuarios(prev => prev.map(u => u.id === id ? atualizado : u));
        return atualizado;
    }
    async function removeUsuario(id) {
        await api.delete(`/usuarios/${id}`);
        setUsuarios(prev => prev.filter(u => u.id !== id));
    }

    return (
        <AppContext.Provider value={{
            usuarioLogado, login, register, logout,
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
