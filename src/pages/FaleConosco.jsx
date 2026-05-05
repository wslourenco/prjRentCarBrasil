import { useState } from 'react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { Send, CheckCircle } from 'lucide-react';

const ASSUNTOS = [
  'Dúvida sobre locação',
  'Problema com veículo',
  'Dúvida financeira',
  'Solicitação de suporte técnico',
  'Reclamação',
  'Sugestão de melhoria',
  'Outro',
];

export default function FaleConosco() {
  const { usuarioLogado } = useApp();
  const [form, setForm] = useState({ assunto: '', mensagem: '' });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await api.post('/contato', { assunto: form.assunto, mensagem: form.mensagem });
      setEnviado(true);
      setForm({ assunto: '', mensagem: '' });
    } catch (e) {
      setErro(e.message || 'Erro ao enviar mensagem.');
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="page-container" style={{ maxWidth: 560 }}>
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <CheckCircle size={52} color="#059669" style={{ marginBottom: 16 }} />
          <h2 style={{ marginBottom: 8 }}>Mensagem enviada!</h2>
          <p style={{ color: 'var(--gray-600)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            Sua mensagem foi encaminhada ao administrador. Retornaremos pelo e-mail cadastrado em breve.
          </p>
          <button className="btn btn-outline" onClick={() => setEnviado(false)}>
            Enviar outra mensagem
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 560 }}>
      <div className="mb-24">
        <h2>Fale Conosco</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: 14, marginTop: 4 }}>
          Envie sua dúvida, sugestão ou reclamação diretamente ao administrador.
        </p>
      </div>

      <div className="card" style={{ padding: '24px 28px' }}>
        <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--gray-50)', borderRadius: 8, fontSize: 13, color: 'var(--gray-600)' }}>
          <strong>De:</strong> {usuarioLogado?.nome} &lt;{usuarioLogado?.email}&gt;
        </div>

        {erro && <div className="alert alert-error" style={{ marginBottom: 16 }}>{erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Assunto *</label>
            <select
              required
              value={form.assunto}
              onChange={e => setForm({ ...form, assunto: e.target.value })}
            >
              <option value="">Selecione um assunto...</option>
              {ASSUNTOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Mensagem *</label>
            <textarea
              required
              rows={6}
              placeholder="Descreva detalhadamente sua dúvida ou solicitação..."
              value={form.mensagem}
              onChange={e => setForm({ ...form, mensagem: e.target.value })}
              style={{ resize: 'vertical', minHeight: 120 }}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={enviando} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Send size={15} />
            {enviando ? 'Enviando...' : 'Enviar mensagem'}
          </button>
        </form>
      </div>
    </div>
  );
}
