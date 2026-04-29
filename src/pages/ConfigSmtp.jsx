import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Mail, Check } from 'lucide-react';

export default function ConfigSmtp() {
  const { usuarioLogado } = useApp();
  const [smtpForm, setSmtpForm] = useState({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    mailFrom: '',
  });
  const [smtpStatus, setSmtpStatus] = useState(null);
  const [smtpMensagem, setSmtpMensagem] = useState('');
  const [smtpErro, setSmtpErro] = useState('');
  const [salvandoSmtp, setSalvandoSmtp] = useState(false);
  const [testandoSmtp, setTestandoSmtp] = useState(false);

  useEffect(() => {
    async function carregarStatusSmtp() {
      try {
        const status = await api.get('/configuracoes/smtp/status');
        setSmtpStatus(status);
        setSmtpForm(prev => ({
          ...prev,
          host: String(status?.smtp?.smtp_host || status?.smtp?.host || prev.host),
          port: Number(status?.smtp?.smtp_port || status?.smtp?.port || prev.port),
          secure: String(status?.smtp?.smtp_secure || status?.smtp?.secure || 'false').toLowerCase() === 'true',
          user: String(status?.smtp?.smtp_user || status?.smtp?.user || prev.user),
          mailFrom: String(status?.smtp?.mail_from || status?.smtp?.mailFrom || prev.mailFrom),
        }));
      } catch (err) {
        setSmtpErro(err.message || 'Não foi possível carregar o status SMTP.');
      }
    }

    carregarStatusSmtp();
  }, []);

  async function salvarSmtp(e) {
    e.preventDefault();
    setSmtpMensagem('');
    setSmtpErro('');
    setSalvandoSmtp(true);

    try {
      await api.put('/configuracoes/smtp', {
        host: smtpForm.host,
        port: Number(smtpForm.port || 587),
        secure: smtpForm.secure,
        user: smtpForm.user,
        pass: smtpForm.pass,
        mailFrom: smtpForm.mailFrom,
      });
      setSmtpMensagem('Configuração SMTP salva com sucesso.');
      setSmtpForm(prev => ({ ...prev, pass: '' }));
      const status = await api.get('/configuracoes/smtp/status');
      setSmtpStatus(status);
    } catch (err) {
      setSmtpErro(err.message || 'Erro ao salvar as configurações SMTP.');
    } finally {
      setSalvandoSmtp(false);
    }
  }

  async function testarSmtp() {
    setSmtpMensagem('');
    setSmtpErro('');
    setTestandoSmtp(true);
    try {
      const resp = await api.put('/configuracoes/smtp/testar', {});
      setSmtpMensagem(resp?.mensagem || 'Conexão SMTP testada com sucesso.');
    } catch (err) {
      setSmtpErro(err.message || 'Falha ao testar SMTP.');
    } finally {
      setTestandoSmtp(false);
    }
  }

  if (!usuarioLogado) return null;

  return (
    <div className="page-content">
      <div className="flex-between mb-24">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>Configuração SMTP</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>Atualize os dados de envio de e-mail para locações e contratos.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title"><Mail size={18} style={{ marginRight: 8 }} /> Configuração SMTP</span>
          <span className={`badge ${smtpStatus?.configurado ? 'badge-green' : 'badge-orange'}`}>
            {smtpStatus?.configurado ? 'Configurado' : 'Incompleto'}
          </span>
        </div>

        <form onSubmit={salvarSmtp}>
          <div className="form-grid" style={{ padding: 16 }}>
            <div className="form-group form-full">
              <label>Host SMTP *</label>
              <input
                required
                value={smtpForm.host}
                onChange={e => setSmtpForm(prev => ({ ...prev, host: e.target.value }))}
                placeholder="smtp.gmail.com"
              />
            </div>

            <div className="form-group">
              <label>Porta *</label>
              <input
                required
                type="number"
                min="1"
                max="65535"
                value={smtpForm.port}
                onChange={e => setSmtpForm(prev => ({ ...prev, port: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Seguro (SSL/TLS)</label>
              <select
                value={smtpForm.secure ? 'true' : 'false'}
                onChange={e => setSmtpForm(prev => ({ ...prev, secure: e.target.value === 'true' }))}
              >
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </select>
            </div>

            <div className="form-group form-full">
              <label>Usuário SMTP *</label>
              <input
                required
                type="email"
                value={smtpForm.user}
                onChange={e => setSmtpForm(prev => ({ ...prev, user: e.target.value }))}
                placeholder="usuario@provedor.com"
              />
            </div>

            <div className="form-group form-full">
              <label>Senha SMTP *</label>
              <input
                required
                type="password"
                value={smtpForm.pass}
                onChange={e => setSmtpForm(prev => ({ ...prev, pass: e.target.value }))}
                placeholder="Senha de app ou token SMTP"
              />
            </div>

            <div className="form-group form-full">
              <label>E-mail remetente (mail_from)</label>
              <input
                type="email"
                value={smtpForm.mailFrom}
                onChange={e => setSmtpForm(prev => ({ ...prev, mailFrom: e.target.value }))}
                placeholder="noreply@rentcarbrasil.com.br"
              />
            </div>
          </div>

          {smtpStatus?.faltantes?.length > 0 && (
            <div className="alert alert-info" style={{ margin: '0 16px 12px 16px' }}>
              Campos faltantes: {smtpStatus.faltantes.join(', ')}
            </div>
          )}

          {smtpErro && <div className="alert alert-error" style={{ margin: '0 16px 12px 16px' }}>{smtpErro}</div>}
          {smtpMensagem && <div className="alert alert-success" style={{ margin: '0 16px 12px 16px' }}>{smtpMensagem}</div>}

          <div className="form-actions" style={{ padding: '0 16px 16px 16px' }}>
            <button type="button" className="btn btn-outline" onClick={testarSmtp} disabled={testandoSmtp || salvandoSmtp}>
              {testandoSmtp ? 'Testando...' : 'Testar Conexão'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={salvandoSmtp || testandoSmtp}>
              {salvandoSmtp ? 'Salvando...' : 'Salvar SMTP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
