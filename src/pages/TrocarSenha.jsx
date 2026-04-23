import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function TrocarSenha() {
    const { usuarioLogado, trocarSenha } = useApp();
    const navigate = useNavigate();
    const [form, setForm] = useState({ novaSenha: '', confirmar: '' });
    const [erro, setErro] = useState('');
    const [carregando, setCarregando] = useState(false);

    const ehPrimeiroAcesso = usuarioLogado?.senhaDeveTrocar;
    if (!usuarioLogado) return <Navigate to="/login" replace />;


    async function handleSubmit(e) {
        e.preventDefault();
        setErro('');

        if (form.novaSenha.length < 6) {
            setErro('A nova senha deve ter no mínimo 6 caracteres.');
            return;
        }
        if (form.novaSenha !== form.confirmar) {
            setErro('As senhas não coincidem.');
            return;
        }

        setCarregando(true);
        try {
            await trocarSenha(form.novaSenha);
            const perfil = usuarioLogado?.perfil;
            if (perfil === 'auxiliar') navigate('/financeiro', { replace: true });
            else if (perfil === 'locatario') navigate('/painel', { replace: true });
            else navigate('/dashboard', { replace: true });
        } catch (err) {
            setErro(err?.response?.data?.erro || 'Erro ao alterar senha. Tente novamente.');
        } finally {
            setCarregando(false);
        }
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
            <div className="card" style={{ width: '100%', maxWidth: 420, padding: 32 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ display: 'inline-flex', background: 'var(--primary-light)', borderRadius: '50%', padding: 14, marginBottom: 12 }}>
                        <KeyRound size={28} color="var(--primary)" />
                    </div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                        {ehPrimeiroAcesso ? 'Defina sua senha' : 'Alterar senha'}
                    </h2>
                    {ehPrimeiroAcesso && (
                        <p style={{ color: 'var(--gray-500)', fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
                            Sua senha é temporária. Defina uma nova senha para continuar.
                        </p>
                    )}
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="form-group">
                        <label>Nova senha</label>
                        <input
                            type="password"
                            value={form.novaSenha}
                            onChange={e => setForm(f => ({ ...f, novaSenha: e.target.value }))}
                            autoComplete="new-password"
                            required
                            minLength={6}
                        />
                    </div>
                    <div className="form-group">
                        <label>Confirmar nova senha</label>
                        <input
                            type="password"
                            value={form.confirmar}
                            onChange={e => setForm(f => ({ ...f, confirmar: e.target.value }))}
                            autoComplete="new-password"
                            required
                        />
                    </div>

                    {erro && (
                        <div className="alert alert-danger" style={{ fontSize: 13, padding: '8px 12px' }}>
                            {erro}
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary" disabled={carregando} style={{ marginTop: 4 }}>
                        {carregando ? 'Salvando...' : 'Salvar nova senha'}
                    </button>
                </form>
            </div>
        </div>
    );
}
