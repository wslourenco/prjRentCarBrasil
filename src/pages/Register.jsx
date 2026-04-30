import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Car, Eye, EyeOff, UserPlus } from 'lucide-react';

export default function Register() {
  const { register } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'locatario', tipoDocumento: 'cpf', documento: '', rg: '' });
  function maskDoc(value, tipo) {
    let v = value.replace(/\D/g, '');
    if (tipo === 'cpf') {
      v = v.slice(0, 11);
      return v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (m, a, b, c, d) => d ? `${a}.${b}.${c}-${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a);
    } else {
      v = v.slice(0, 14);
      return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (m, a, b, c, d, e) => e ? `${a}.${b}.${c}/${d}-${e}` : d ? `${a}.${b}.${c}/${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a);
    }
  }
  function isValidCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /^([0-9])\1+$/.test(cpf)) return false;
    let sum = 0, rest;
    for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i-1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(cpf.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i-1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    return rest === parseInt(cpf.substring(10, 11));
  }
  function isValidCNPJ(cnpj) {
    cnpj = cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14) return false;
    let size = cnpj.length - 2;
    let numbers = cnpj.substring(0, size);
    let digits = cnpj.substring(size);
    let sum = 0, pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += numbers.charAt(size - i) * pos--;
      if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(0))) return false;
    size++;
    numbers = cnpj.substring(0, size);
    sum = 0; pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += numbers.charAt(size - i) * pos--;
      if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    return result === parseInt(digits.charAt(1));
  }
  function maskRg(value) {
    return value.replace(/[^0-9Xx]/g, '').slice(0, 9)
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})([0-9Xx])$/, '$1-$2');
  }
  function isValidRG(value) {
    return /^[0-9]{2}\.[0-9]{3}\.[0-9]{3}-[0-9Xx]$/.test(maskRg(value));
  }
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    if (form.tipoDocumento === 'cpf' && !isValidRG(form.rg)) {
      setErro('RG inválido. Use o formato 00.000.000-0 ou 00.000.000-X.');
      return;
    }
    setCarregando(true);
    try {
      const usuario = await register(form.nome, form.email, form.senha, form.perfil, form.tipoDocumento, form.documento, form.rg);
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
            <h1>RentCarBrasil</h1>
          </div>
          <p>Novo cadastro de usuário</p>
        </div>

        <h2>Criar conta</h2>

        {erro && <div className="alert alert-error">{erro}</div>}

        <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: 14 }}>
                      <label>Tipo de documento</label>
                      <select value={form.tipoDocumento} onChange={e => setForm({ ...form, tipoDocumento: e.target.value })}>
                        <option value="cpf">CPF</option>
                        <option value="cnpj">CNPJ</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 14 }}>
                      <label>{form.tipoDocumento === 'cpf' ? 'CPF' : 'CNPJ'}</label>
                      <input
                        type="text"
                        placeholder={form.tipoDocumento === 'cpf' ? 'Digite o CPF' : 'Digite o CNPJ'}
                        value={maskDoc(form.documento, form.tipoDocumento)}
                        onChange={e => setForm({ ...form, documento: e.target.value })}
                        required
                        maxLength={form.tipoDocumento === 'cpf' ? 14 : 18}
                        pattern={form.tipoDocumento === 'cpf' ? '\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}' : '\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}'}
                        title={form.tipoDocumento === 'cpf' ? 'Digite um CPF válido' : 'Digite um CNPJ válido'}
                      />
                      {form.documento && (
                        <span style={{ color: (form.tipoDocumento === 'cpf' ? isValidCPF(form.documento) : isValidCNPJ(form.documento)) ? 'green' : 'red', fontSize: 12 }}>
                          {form.tipoDocumento === 'cpf'
                            ? (isValidCPF(form.documento) ? 'CPF válido' : 'CPF inválido')
                            : (isValidCNPJ(form.documento) ? 'CNPJ válido' : 'CNPJ inválido')}
                        </span>
                      )}
                    </div>

                    {form.tipoDocumento === 'cpf' && (
                      <div className="form-group" style={{ marginBottom: 14 }}>
                        <label>RG</label>
                        <input
                          type="text"
                          placeholder="Digite o RG"
                          value={maskRg(form.rg)}
                          onChange={e => setForm({ ...form, rg: e.target.value })}
                          required
                          maxLength={12}
                          pattern="\\d{2}\\.\\d{3}\\.\\d{3}-[0-9Xx]"
                          title="Digite um RG no formato 00.000.000-0 ou 00.000.000-X"
                        />
                        {form.rg && (
                          <span style={{ color: isValidRG(form.rg) ? 'green' : 'red', fontSize: 12 }}>
                            {isValidRG(form.rg) ? 'RG válido' : 'RG inválido'}
                          </span>
                        )}
                      </div>
                    )}
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
