import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Car, Eye, EyeOff, UserPlus, ImagePlus, X } from 'lucide-react';
import { maskRg, isValidRG } from '../utils/masks';

export default function Register() {
  const { register } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'locatario', tipoDocumento: 'cpf', documento: '', rg: '' });
  const [logo, setLogo] = useState(null);
  const [erroLogo, setErroLogo] = useState('');
  const [docs, setDocs] = useState({ rg: null, cpf: null, comprovante: null, cnh: null });
  const [erroDocs, setErroDocs] = useState({});

  function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErroLogo('Selecione um arquivo de imagem (JPG, PNG, WebP).'); return; }
    if (file.size > 500 * 1024) { setErroLogo('A imagem deve ter no máximo 500KB.'); return; }
    setErroLogo('');
    const reader = new FileReader();
    reader.onload = e => setLogo(e.target.result);
    reader.readAsDataURL(file);
  }

  function handleDocChange(campo, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validos = ['image/jpeg','image/png','image/webp','application/pdf'];
    if (!validos.includes(file.type)) {
      setErroDocs(p => ({ ...p, [campo]: 'Selecione uma imagem (JPG, PNG, WebP) ou PDF.' }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErroDocs(p => ({ ...p, [campo]: 'Arquivo deve ter no máximo 2MB.' }));
      return;
    }
    setErroDocs(p => ({ ...p, [campo]: '' }));
    const reader = new FileReader();
    reader.onload = ev => setDocs(p => ({ ...p, [campo]: ev.target.result }));
    reader.readAsDataURL(file);
  }

  function DocUpload({ campo, label, obrigatorio }) {
    const arquivo = docs[campo];
    return (
      <div className="form-group" style={{ marginBottom: 14 }}>
        <label>{label}{obrigatorio ? ' *' : ''}</label>
        {arquivo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'green' }}>✓ {arquivo.startsWith('data:application/pdf') ? 'PDF anexado' : 'Imagem anexada'}</span>
            <label style={{ fontSize: 12, color: 'var(--primary)', cursor: 'pointer' }}>
              Trocar <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={ev => handleDocChange(campo, ev)} />
            </label>
            <button type="button" onClick={() => setDocs(p => ({ ...p, [campo]: null }))} style={{ fontSize: 12, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Remover</button>
          </div>
        ) : (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 14px', border: '1.5px dashed var(--gray-300)', borderRadius: 8, fontSize: 13, color: 'var(--gray-500)', width: '100%' }}>
            <ImagePlus size={15} /> Clique para anexar
            <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={ev => handleDocChange(campo, ev)} />
          </label>
        )}
        {erroDocs[campo] && <span style={{ color: 'red', fontSize: 12 }}>{erroDocs[campo]}</span>}
        <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>JPG, PNG, WebP ou PDF · máx. 2MB</span>
      </div>
    );
  }
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

  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [cadastroEnviado, setCadastroEnviado] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    if (form.tipoDocumento === 'cpf' && !isValidRG(form.rg)) {
      setErro('RG inválido. Digite o RG conforme seu documento (mínimo 5 caracteres).');
      return;
    }
    setCarregando(true);
    try {
      const resultado = await register(form.nome, form.email, form.senha, form.perfil, form.tipoDocumento, form.documento, form.rg, logo, docs.rg, docs.cpf, docs.comprovante, docs.cnh);
      if (resultado?.pendente) {
        setCadastroEnviado(true);
      } else {
        navigate(resultado.perfil === 'locatario' ? '/painel' : '/dashboard');
      }
    } catch (e) {
      setErro(e.message || 'Não foi possível criar sua conta.');
    } finally {
      setCarregando(false);
    }
  }

  if (cadastroEnviado) {
    return (
      <div className="login-page">
        <div className="login-box" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
            <Car size={32} color="var(--primary)" />
            <h1>RentCarBrasil</h1>
          </div>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h2 style={{ marginBottom: 8 }}>Cadastro enviado!</h2>
          <p style={{ color: 'var(--gray-600)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            Seus dados e documentos foram recebidos com sucesso.<br />
            O administrador irá analisar seu cadastro e você receberá o acesso assim que for aprovado.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex', justifyContent: 'center', padding: '10px 24px' }}>
            Voltar ao login
          </Link>
        </div>
      </div>
    );
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
                          value={form.rg}
                          onChange={e => setForm({ ...form, rg: maskRg(e.target.value) })}
                          required
                          maxLength={15}
                        />
                        {form.rg && (
                          <span style={{ color: isValidRG(form.rg) ? 'green' : 'red', fontSize: 12 }}>
                            {isValidRG(form.rg) ? 'RG válido' : 'RG inválido'}
                          </span>
                        )}
                      </div>
                    )}

                    {form.tipoDocumento === 'cnpj' && (
                      <div className="form-group" style={{ marginBottom: 14 }}>
                        <label>Logotipo da Empresa</label>
                        {logo ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <img src={logo} alt="Logo" style={{ height: 64, maxWidth: 160, objectFit: 'contain', border: '1px solid var(--gray-200)', borderRadius: 8, padding: 4, background: '#fff' }} />
                            <button type="button" onClick={() => setLogo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                              <X size={14} /> Remover
                            </button>
                          </div>
                        ) : (
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 16px', border: '1.5px dashed var(--gray-300)', borderRadius: 8, fontSize: 13, color: 'var(--gray-500)', width: '100%', justifyContent: 'center' }}>
                            <ImagePlus size={16} /> Clique para anexar o logotipo
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
                          </label>
                        )}
                        {erroLogo && <span style={{ color: 'red', fontSize: 12 }}>{erroLogo}</span>}
                        <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>JPG, PNG ou WebP · máximo 500KB</span>
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

          <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 14, marginTop: 4 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--gray-700)' }}>Documentos</p>
            {form.tipoDocumento === 'cpf' && <DocUpload campo="rg" label="Foto/Scan do RG" />}
            <DocUpload campo="cpf" label={form.tipoDocumento === 'cpf' ? 'Foto/Scan do CPF' : 'Foto/Scan do CNPJ'} />
            <DocUpload campo="comprovante" label="Comprovante de Residência" />
            {form.perfil === 'locatario' && <DocUpload campo="cnh" label="CNH (Carteira Nacional de Habilitação)" obrigatorio />}
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
