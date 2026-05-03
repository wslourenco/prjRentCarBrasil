import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Mail, Eye, EyeOff, Zap } from 'lucide-react';

const ABA_SMTP = 'smtp';
const ABA_BREVO = 'brevo';

export default function ConfigSmtp() {
  const { usuarioLogado } = useApp();
  const [aba, setAba] = useState(ABA_SMTP);

  // SMTP
  const [smtpForm, setSmtpForm] = useState({ host: 'smtp.gmail.com', port: 587, secure: false, user: '', pass: '', mailFrom: '' });
  const [showPass, setShowPass] = useState(false);
  const [senhaConfigurada, setSenhaConfigurada] = useState(false);
  const [salvandoSmtp, setSalvandoSmtp] = useState(false);
  const [foiSalvo, setFoiSalvo] = useState(false);

  // Brevo
  const [brevoForm, setBrevoForm] = useState({ apiKey: '', senderEmail: '', senderName: 'RentCarBrasil' });
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyConfigurada, setApiKeyConfigurada] = useState(false);
  const [salvandoBrevo, setSalvandoBrevo] = useState(false);
  const [foiSalvoBrevo, setFoiSalvoBrevo] = useState(false);

  // Shared
  const [smtpStatus, setSmtpStatus] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [testando, setTestando] = useState(false);

  useEffect(() => {
    api.get('/configuracoes/smtp/status').then(status => {
      setSmtpStatus(status);
      const provider = status?.provider || 'smtp';
      setAba(provider === 'brevo' ? ABA_BREVO : ABA_SMTP);
      setSmtpForm(prev => ({
        ...prev,
        host: status?.smtp?.smtp_host || prev.host,
        port: Number(status?.smtp?.smtp_port || prev.port),
        secure: String(status?.smtp?.smtp_secure || 'false').toLowerCase() === 'true',
        user: status?.smtp?.smtp_user || prev.user,
        mailFrom: status?.smtp?.mail_from || prev.mailFrom,
      }));
      if (status?.smtp?.smtp_pass_configurado) setSenhaConfigurada(true);
      setBrevoForm(prev => ({
        ...prev,
        senderEmail: status?.brevo?.sender_email || prev.senderEmail,
        senderName: status?.brevo?.sender_name || prev.senderName,
      }));
      if (status?.brevo?.api_key_configurado) setApiKeyConfigurada(true);
    }).catch(e => setErro(e.message));
  }, []);

  async function salvarSmtp(e) {
    e.preventDefault();
    setMensagem(''); setErro('');
    setSalvandoSmtp(true);
    try {
      await api.put('/configuracoes/smtp', {
        provider: 'smtp',
        host: smtpForm.host, port: Number(smtpForm.port || 587),
        secure: smtpForm.secure, user: smtpForm.user,
        pass: smtpForm.pass, mailFrom: smtpForm.mailFrom,
      });
      setMensagem('Configuração SMTP salva. Agora clique em Testar Envio.');
      setFoiSalvo(true); setSenhaConfigurada(true);
      setSmtpForm(prev => ({ ...prev, pass: '' }));
      const status = await api.get('/configuracoes/smtp/status');
      setSmtpStatus(status);
    } catch (e) { setErro(e.message); } finally { setSalvandoSmtp(false); }
  }

  async function salvarBrevo(e) {
    e.preventDefault();
    setMensagem(''); setErro('');
    setSalvandoBrevo(true);
    try {
      await api.put('/configuracoes/smtp', {
        provider: 'brevo',
        brevo_api_key: brevoForm.apiKey,
        brevo_sender_email: brevoForm.senderEmail,
        brevo_sender_name: brevoForm.senderName,
      });
      setMensagem('Configuração Brevo salva. Agora clique em Testar Envio.');
      setFoiSalvoBrevo(true); setApiKeyConfigurada(true);
      setBrevoForm(prev => ({ ...prev, apiKey: '' }));
      const status = await api.get('/configuracoes/smtp/status');
      setSmtpStatus(status);
    } catch (e) { setErro(e.message); } finally { setSalvandoBrevo(false); }
  }

  async function testar() {
    const podeTestar = aba === ABA_BREVO ? (foiSalvoBrevo || smtpStatus?.provider === 'brevo') : (foiSalvo || smtpStatus?.configurado);
    if (!podeTestar) { setErro('Salve as configurações antes de testar.'); return; }
    setMensagem(''); setErro(''); setTestando(true);
    const timeoutId = setTimeout(() => { setTestando(false); setErro('Tempo esgotado. Verifique as configurações e tente novamente.'); }, 32000);
    try {
      const resp = await api.put('/configuracoes/smtp/testar', {});
      setMensagem(resp?.mensagem || 'E-mail de teste enviado com sucesso!');
    } catch (e) { setErro(e.message); } finally { clearTimeout(timeoutId); setTestando(false); }
  }

  if (!usuarioLogado) return null;

  const styleAba = active => ({
    padding: '8px 20px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: 13,
    background: active ? '#fff' : 'var(--gray-100)',
    color: active ? 'var(--primary)' : 'var(--gray-500)',
    borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
  });

  return (
    <div className="page-content">
      <div className="flex-between mb-24">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>Configuração de E-mail</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>Escolha o provedor de envio de e-mails do sistema.</p>
        </div>
        <span className={`badge ${smtpStatus?.configurado ? 'badge-green' : 'badge-orange'}`}>
          {smtpStatus?.configurado ? `Configurado (${smtpStatus.provider === 'brevo' ? 'Brevo' : 'SMTP'})` : 'Incompleto'}
        </span>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 0, borderBottom: '1px solid var(--gray-200)' }}>
        <button style={styleAba(aba === ABA_SMTP)} onClick={() => { setAba(ABA_SMTP); setMensagem(''); setErro(''); }}>
          <Mail size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />SMTP (Gmail, Outlook...)
        </button>
        <button style={styleAba(aba === ABA_BREVO)} onClick={() => { setAba(ABA_BREVO); setMensagem(''); setErro(''); }}>
          <Zap size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Brevo API (recomendado)
        </button>
      </div>

      <div className="card" style={{ borderRadius: '0 8px 8px 8px' }}>
        {erro && <div className="alert alert-error" style={{ margin: '16px 16px 0' }}>{erro}</div>}
        {mensagem && <div className="alert alert-success" style={{ margin: '16px 16px 0' }}>{mensagem}</div>}

        {/* Aba SMTP */}
        {aba === ABA_SMTP && (
          <form onSubmit={salvarSmtp}>
            <div className="form-grid" style={{ padding: 16 }}>
              <div className="form-group form-full">
                <label>Host SMTP *</label>
                <input required value={smtpForm.host} onChange={e => setSmtpForm(p => ({ ...p, host: e.target.value }))} placeholder="smtp.gmail.com" />
              </div>
              <div className="form-group">
                <label>Porta *</label>
                <input required type="number" min="1" max="65535" value={smtpForm.port} onChange={e => setSmtpForm(p => ({ ...p, port: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Seguro (SSL/TLS)</label>
                <select value={smtpForm.secure ? 'true' : 'false'} onChange={e => setSmtpForm(p => ({ ...p, secure: e.target.value === 'true' }))}>
                  <option value="false">Não (porta 587)</option>
                  <option value="true">Sim (porta 465)</option>
                </select>
              </div>
              <div className="form-group form-full">
                <label>Usuário SMTP *</label>
                <input required type="email" value={smtpForm.user} onChange={e => setSmtpForm(p => ({ ...p, user: e.target.value }))} placeholder="usuario@gmail.com" />
              </div>
              <div className="form-group form-full">
                <label>Senha / App Password{senhaConfigurada && !smtpForm.pass ? '' : ' *'}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    required={!senhaConfigurada}
                    type={showPass ? 'text' : 'password'}
                    value={smtpForm.pass}
                    onChange={e => setSmtpForm(p => ({ ...p, pass: e.target.value }))}
                    placeholder={senhaConfigurada && !smtpForm.pass ? '••••••••  (configurada — deixe em branco para manter)' : 'Senha de app do Gmail'}
                    style={{ width: '100%', paddingRight: 40 }}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 0 }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {senhaConfigurada && !smtpForm.pass && <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>Senha mantida. Digite uma nova para alterar.</span>}
              </div>
              <div className="form-group form-full">
                <label>E-mail remetente (mail_from)</label>
                <input type="email" value={smtpForm.mailFrom} onChange={e => setSmtpForm(p => ({ ...p, mailFrom: e.target.value }))} placeholder="noreply@rentcarbrasil.com.br" />
              </div>
            </div>
            <div style={{ padding: '0 16px 12px', fontSize: 12, color: 'var(--gray-400)', background: 'var(--gray-50)', borderTop: '1px solid var(--gray-100)' }}>
              <strong>Gmail:</strong> ative a verificação em 2 etapas e gere uma <em>Senha de App</em> em myaccount.google.com/apppasswords. Se der timeout, tente porta 465 + SSL=Sim.
            </div>
            {smtpStatus?.faltantes?.length > 0 && smtpStatus.provider !== 'brevo' && (
              <div className="alert alert-info" style={{ margin: '0 16px 12px' }}>Campos faltantes: {smtpStatus.faltantes.join(', ')}</div>
            )}
            <div className="form-actions" style={{ padding: '12px 16px 16px' }}>
              <button type="button" className="btn btn-outline" onClick={testar} disabled={testando || salvandoSmtp}>
                {testando ? 'Enviando teste...' : 'Testar Envio'}
              </button>
              <button type="submit" className="btn btn-primary" disabled={salvandoSmtp || testando}>
                {salvandoSmtp ? 'Salvando...' : 'Salvar SMTP'}
              </button>
            </div>
          </form>
        )}

        {/* Aba Brevo */}
        {aba === ABA_BREVO && (
          <form onSubmit={salvarBrevo}>
            <div style={{ padding: '16px 16px 0', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', margin: '16px 16px 0', borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>
                <strong>Brevo</strong> (brevo.com) envia e-mails via HTTPS — nunca bloqueado por firewalls de servidores cloud.
                Plano gratuito: <strong>300 e-mails/dia</strong>. Configure em 3 passos:<br />
                1. Crie conta em <strong>brevo.com</strong> &nbsp;·&nbsp;
                2. Vá em <em>SMTP &amp; API → API Keys</em> e gere uma chave &nbsp;·&nbsp;
                3. Cole abaixo e salve.
              </p>
              <p style={{ margin: '8px 0 12px', fontSize: 12, color: '#3b82f6' }}>
                Importante: o e-mail remetente deve ser um domínio verificado no Brevo (ou use o e-mail da sua conta Brevo).
              </p>
            </div>
            <div className="form-grid" style={{ padding: 16 }}>
              <div className="form-group form-full">
                <label>API Key do Brevo *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    required={!apiKeyConfigurada}
                    type={showApiKey ? 'text' : 'password'}
                    value={brevoForm.apiKey}
                    onChange={e => setBrevoForm(p => ({ ...p, apiKey: e.target.value }))}
                    placeholder={apiKeyConfigurada && !brevoForm.apiKey ? '••••••••  (configurada — deixe em branco para manter)' : 'xkeysib-...'}
                    style={{ width: '100%', paddingRight: 40 }}
                  />
                  <button type="button" onClick={() => setShowApiKey(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 0 }}>
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {apiKeyConfigurada && !brevoForm.apiKey && <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>Chave mantida. Digite uma nova para alterar.</span>}
              </div>
              <div className="form-group form-full">
                <label>E-mail remetente *</label>
                <input required type="email" value={brevoForm.senderEmail} onChange={e => setBrevoForm(p => ({ ...p, senderEmail: e.target.value }))} placeholder="noreply@seudominio.com.br" />
              </div>
              <div className="form-group form-full">
                <label>Nome do remetente</label>
                <input value={brevoForm.senderName} onChange={e => setBrevoForm(p => ({ ...p, senderName: e.target.value }))} placeholder="RentCarBrasil" />
              </div>
            </div>
            <div className="form-actions" style={{ padding: '0 16px 16px' }}>
              <button type="button" className="btn btn-outline" onClick={testar} disabled={testando || salvandoBrevo}>
                {testando ? 'Enviando teste...' : 'Testar Envio'}
              </button>
              <button type="submit" className="btn btn-primary" disabled={salvandoBrevo || testando}>
                {salvandoBrevo ? 'Salvando...' : 'Salvar Brevo'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
