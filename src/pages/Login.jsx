import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Car, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', senha: '' });
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const usuario = await login(form.email, form.senha);
      if (usuario.senhaDeveTrocar) {
        navigate('/trocar-senha', { replace: true });
      } else if (usuario.perfil === 'locatario') {
        navigate('/painel');
      } else if (usuario.perfil === 'auxiliar') {
        navigate('/veiculos');
      } else {
        navigate('/dashboard');
      }
    } catch (e) {
      setErro(e.message || 'E-mail ou senha inválidos.');
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
            <h1>RentCarBrasil</h1>
          </div>
          <p>Sistema de Locação de Veículos</p>
        </div>

        <h2>Entrar na conta</h2>

        {erro && <div className="alert alert-error">{erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>E-mail</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
              autoFocus
            />
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
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: 14, background: 'var(--gray-50)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--gray-500)' }}>
          <strong>Contas de demonstração:</strong><br />
          admin@rentcarbrasil.com.br / admin123<br />
          locador@rentcarbrasil.com.br / locador123<br />
          locatario@rentcarbrasil.com.br / locatario123
        </div>

        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13, color: 'var(--gray-600)' }}>
          Não tem conta? <Link to="/register">Cadastre-se aqui</Link>
        </div>
      </div>
    </div>
  );
}
