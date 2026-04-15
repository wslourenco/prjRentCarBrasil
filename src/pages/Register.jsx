import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Car, Eye, EyeOff, UserPlus } from 'lucide-react';

export default function Register() {
  const { register } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'locatario' });
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const usuario = await register(form.nome, form.email, form.senha, form.perfil);
      navigate(usuario.perfil === 'locatario' ? '/painel' : '/dashboard');
    } catch (e) {
      setErro(e.message || 'Não foi possível criar sua conta.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <Car size={32} color="var(--primary)" />
            <h1>SisLoVe</h1>
          </div>
          <p>Novo cadastro de usuário</p>
        </div>

        <h2>Criar conta</h2>

        {erro && <div className="alert alert-error">{erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Nome</label>
            <input
              type="text"
              placeholder="Seu nome completo"
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>E-mail</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Perfil</label>
            <select value={form.perfil} onChange={e => setForm({ ...form, perfil: e.target.value })}>
              <option value="locatario">Locatário</option>
              <option value="locador">Locador</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showSenha ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.senha}
                onChange={e => setForm({ ...form, senha: e.target.value })}
                required
                minLength={6}
                style={{ width: '100%', paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowSenha(!showSenha)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}
              >
                {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }} disabled={carregando}>
            <UserPlus size={16} /> {carregando ? 'Criando conta...' : 'Cadastrar'}
          </button>
        </form>

        <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: 'var(--gray-600)' }}>
          Já possui conta? <Link to="/login">Entrar</Link>
        </div>
      </div>
    </div>
  );
}
