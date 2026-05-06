import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Check, Eye, EyeOff, ImagePlus, X } from 'lucide-react';
import { applyMask } from '../utils/masks';

export default function MeuCadastro() {
  const { usuarioLogado, sincronizarUsuarioAtual } = useApp();
  const perfil = usuarioLogado?.perfil;
  const isLocador = perfil === 'locador';
  const isLocatario = perfil === 'locatario';

  // ── Dados de acesso ───────────────────────────────────────
  const [acesso, setAcesso] = useState({
    nome: usuarioLogado?.nome || '',
    email: usuarioLogado?.email || '',
  });
  const [salvandoAcesso, setSalvandoAcesso] = useState(false);
  const [msgAcesso, setMsgAcesso] = useState('');
  const [erroAcesso, setErroAcesso] = useState('');

  async function salvarAcesso(e) {
    e.preventDefault();
    setSalvandoAcesso(true); setMsgAcesso(''); setErroAcesso('');
    try {
      await api.put(`/usuarios/${usuarioLogado.id}`, {
        nome: acesso.nome,
        email: acesso.email,
        perfil: usuarioLogado.perfil,
        ativo: true,
        tipoDocumento: usuarioLogado.tipoDocumento || 'cpf',
        documento: usuarioLogado.documento || '',
      });
      await sincronizarUsuarioAtual();
      setMsgAcesso('Dados atualizados com sucesso!');
    } catch (err) {
      setErroAcesso(err.message || 'Erro ao salvar.');
    } finally {
      setSalvandoAcesso(false);
    }
  }

  // ── Alterar senha ─────────────────────────────────────────
  const [senhaForm, setSenhaForm] = useState({ nova: '', confirmar: '' });
  const [showNova, setShowNova] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [msgSenha, setMsgSenha] = useState('');
  const [erroSenha, setErroSenha] = useState('');

  async function salvarSenha(e) {
    e.preventDefault();
    if (senhaForm.nova.length < 6) { setErroSenha('A senha deve ter no mínimo 6 caracteres.'); return; }
    if (senhaForm.nova !== senhaForm.confirmar) { setErroSenha('As senhas não coincidem.'); return; }
    setSalvandoSenha(true); setMsgSenha(''); setErroSenha('');
    try {
      await api.put('/auth/trocar-senha', { novaSenha: senhaForm.nova });
      setSenhaForm({ nova: '', confirmar: '' });
      setMsgSenha('Senha alterada com sucesso!');
    } catch (err) {
      setErroSenha(err.message || 'Erro ao alterar senha.');
    } finally {
      setSalvandoSenha(false);
    }
  }

  // ── Dados do perfil (locador / locatário) ─────────────────
  const locadorProprio = usuarioLogado?.locadorProprio || null;
  const locatarioProprio = usuarioLogado?.locatario || null;

  const camposContato = r => ({
    telefone: r.telefone || '',
    celular: r.celular || '',
    cep: r.cep || '',
    endereco: r.endereco || '',
    numero: r.numero || '',
    complemento: r.complemento || '',
    bairro: r.bairro || '',
    cidade: r.cidade || '',
    estado: r.estado || '',
  });

  const [perfData, setPerfData] = useState({});
  const [carregandoPerf, setCarregandoPerf] = useState(false);

  useEffect(() => {
    async function carregarPerfil() {
      setCarregandoPerf(true);
      try {
        if (isLocador && locadorProprio?.id) {
          const dados = await api.get(`/locadores/${locadorProprio.id}`);
          setPerfData(camposContato(dados));
        } else if (isLocatario && locatarioProprio?.id) {
          const dados = await api.get(`/locatarios/${locatarioProprio.id}`);
          setPerfData(camposContato(dados));
        }
      } catch {
        // silencioso — campos ficam vazios
      } finally {
        setCarregandoPerf(false);
      }
    }
    carregarPerfil();
  }, []);
  const [logo, setLogo] = useState(locadorProprio?.logo || null);
  const [erroLogo, setErroLogo] = useState('');

  function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErroLogo('Selecione uma imagem (JPG, PNG, WebP).'); return; }
    if (file.size > 500 * 1024) { setErroLogo('Imagem deve ter no máximo 500KB.'); return; }
    setErroLogo('');
    const reader = new FileReader();
    reader.onload = ev => setLogo(ev.target.result);
    reader.readAsDataURL(file);
  }

  const [salvandoPerf, setSalvandoPerf] = useState(false);
  const [msgPerf, setMsgPerf] = useState('');
  const [erroPerf, setErroPerf] = useState('');

  async function salvarPerfil(e) {
    e.preventDefault();
    setSalvandoPerf(true); setMsgPerf(''); setErroPerf('');
    try {
      const id = isLocador ? locadorProprio?.id : locatarioProprio?.id;
      const endpoint = isLocador ? `/locadores/${id}` : `/locatarios/${id}`;
      if (!id) throw new Error('Cadastro não encontrado.');

      if (isLocador) {
        const payload = { ...locadorProprio, ...perfData,
          tipo: locadorProprio.tipo, nome: locadorProprio.nome,
          razao_social: locadorProprio.razaoSocial, cnpj: locadorProprio.cnpj,
          cpf: locadorProprio.cpf, email: locadorProprio.email,
          tipo_conta: locadorProprio.tipoConta, pix_chave: locadorProprio.pixChave,
          insc_estadual: locadorProprio.inscEstadual, data_nascimento: locadorProprio.dataNascimento,
          logo: logo,
        };
        await api.put(endpoint, payload);
      } else {
        const payload = { ...locatarioProprio, ...perfData,
          tipo: locatarioProprio.tipo || 'fisica',
          cpf: locatarioProprio.cpf, email: locatarioProprio.email,
          categoria_cnh: locatarioProprio.categoriaCnh,
          validade_cnh: locatarioProprio.validadeCnh,
          motorist_app: locatarioProprio.motoristApp || false,
        };
        await api.put(endpoint, payload);
      }

      await sincronizarUsuarioAtual();
      setMsgPerf('Dados atualizados com sucesso!');
    } catch (err) {
      setErroPerf(err.message || 'Erro ao salvar.');
    } finally {
      setSalvandoPerf(false);
    }
  }

  const f = (field, mask) => ({
    value: perfData[field] || '',
    onChange: e => setPerfData(prev => ({ ...prev, [field]: mask ? applyMask(mask, e.target.value) : e.target.value })),
  });

  const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Meu Cadastro</h1>
          <p className="page-subtitle">Gerencie suas informações pessoais e de acesso</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: (isLocador || isLocatario) ? '1fr 1fr' : '1fr', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Dados de Acesso */}
        <div className="card">
          <div className="card-header"><h2 style={{ fontSize: 15, fontWeight: 600 }}>Dados de Acesso</h2></div>
          <form onSubmit={salvarAcesso} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-group">
                <label>Nome *</label>
                <input required value={acesso.nome} onChange={e => setAcesso(p => ({ ...p, nome: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>E-mail *</label>
                <input required type="email" value={acesso.email} onChange={e => setAcesso(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            {erroAcesso && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{erroAcesso}</p>}
            {msgAcesso && <p style={{ color: 'green', fontSize: 13 }}>{msgAcesso}</p>}
            <div><button type="submit" className="btn btn-primary" disabled={salvandoAcesso}><Check size={14} /> {salvandoAcesso ? 'Salvando...' : 'Salvar dados de acesso'}</button></div>
          </form>
        </div>

        {/* Alterar Senha */}
        <div className="card">
          <div className="card-header"><h2 style={{ fontSize: 15, fontWeight: 600 }}>Alterar Senha</h2></div>
          <form onSubmit={salvarSenha} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-group">
                <label>Nova Senha *</label>
                <div style={{ position: 'relative' }}>
                  <input required type={showNova ? 'text' : 'password'} value={senhaForm.nova} onChange={e => setSenhaForm(p => ({ ...p, nova: e.target.value }))} style={{ width: '100%', paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowNova(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 0 }}>
                    {showNova ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Confirmar Nova Senha *</label>
                <div style={{ position: 'relative' }}>
                  <input required type={showConfirmar ? 'text' : 'password'} value={senhaForm.confirmar} onChange={e => setSenhaForm(p => ({ ...p, confirmar: e.target.value }))} style={{ width: '100%', paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowConfirmar(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 0 }}>
                    {showConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
            {erroSenha && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{erroSenha}</p>}
            {msgSenha && <p style={{ color: 'green', fontSize: 13 }}>{msgSenha}</p>}
            <div><button type="submit" className="btn btn-primary" disabled={salvandoSenha}><Check size={14} /> {salvandoSenha ? 'Salvando...' : 'Alterar senha'}</button></div>
          </form>
        </div>
        </div>{/* fim coluna esquerda */}

        {/* Dados do Perfil - Locador ou Locatário (coluna direita) */}
        {(isLocador || isLocatario) && (locadorProprio || locatarioProprio) && (
          <div className="card">
            <div className="card-header"><h2 style={{ fontSize: 15, fontWeight: 600 }}>Dados de Contato e Endereço</h2></div>
            <form onSubmit={salvarPerfil} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {carregandoPerf && <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>Carregando dados...</p>}
              <div className="form-grid">
                <div className="form-group"><label>Telefone</label><input {...f('telefone', 'telefone')} /></div>
                <div className="form-group"><label>Celular</label><input {...f('celular', 'celular')} /></div>
                <div className="form-group"><label>CEP</label><input {...f('cep', 'cep')} /></div>
                <div className="form-group form-full"><label>Logradouro</label><input {...f('endereco')} /></div>
                <div className="form-group"><label>Número</label><input {...f('numero')} /></div>
                <div className="form-group"><label>Complemento</label><input {...f('complemento')} /></div>
                <div className="form-group"><label>Bairro</label><input {...f('bairro')} /></div>
                <div className="form-group"><label>Cidade</label><input {...f('cidade')} /></div>
                <div className="form-group"><label>Estado</label>
                  <select {...f('estado')}>
                    <option value="">Selecione</option>
                    {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>
              {isLocador && (
                <div className="form-group form-full">
                  <label>Logotipo da Empresa</label>
                  {logo ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img src={logo} alt="Logo" style={{ maxHeight: 64, maxWidth: 180, objectFit: 'contain', border: '1px solid var(--gray-200)', borderRadius: 8, padding: 4, background: '#fff' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--primary)' }}>
                          <ImagePlus size={14} /> Trocar logo
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
                        </label>
                        <button type="button" onClick={() => setLogo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--danger)', textAlign: 'left', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <X size={13} /> Remover logo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 16px', border: '1.5px dashed var(--gray-300)', borderRadius: 8, fontSize: 13, color: 'var(--gray-500)' }}>
                      <ImagePlus size={16} /> Clique para anexar o logotipo
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
                    </label>
                  )}
                  {erroLogo && <p style={{ color: 'var(--danger)', fontSize: 12, margin: '4px 0 0' }}>{erroLogo}</p>}
                  <p style={{ fontSize: 11, color: 'var(--gray-400)', margin: '4px 0 0' }}>JPG, PNG ou WebP · máx. 500KB</p>
                </div>
              )}
              {erroPerf && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{erroPerf}</p>}
              {msgPerf && <p style={{ color: 'green', fontSize: 13 }}>{msgPerf}</p>}
              <div><button type="submit" className="btn btn-primary" disabled={salvandoPerf}><Check size={14} /> {salvandoPerf ? 'Salvando...' : 'Salvar dados de contato'}</button></div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
