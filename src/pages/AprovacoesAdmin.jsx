import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { CheckCircle, XCircle, FileText, User, Clock, RefreshCw } from 'lucide-react';

const PERFIL_LABEL = { locador: 'Locador', locatario: 'Locatário' };
const STATUS_LABEL = { pendente: 'Pendente', aprovado: 'Aprovado', rejeitado: 'Rejeitado' };
const STATUS_COLOR = { pendente: '#f59e0b', aprovado: '#16a34a', rejeitado: '#dc2626' };

function DocPreview({ label, base64 }) {
  if (!base64) return <span style={{ color: 'var(--gray-400)', fontSize: 12 }}>Não enviado</span>;
  const isPdf = base64.startsWith('data:application/pdf');
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>{label}</span>
      {isPdf ? (
        <a href={base64} download={`${label}.pdf`} target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--primary)', textDecoration: 'none', padding: '4px 8px', border: '1px solid var(--gray-200)', borderRadius: 6 }}>
          <FileText size={14} /> Baixar PDF
        </a>
      ) : (
        <a href={base64} target="_blank" rel="noreferrer">
          <img src={base64} alt={label} style={{ height: 64, width: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--gray-200)', cursor: 'pointer' }} title="Clique para ampliar" />
        </a>
      )}
    </div>
  );
}

function ModalRejeitar({ nome, onConfirmar, onCancelar }) {
  const [motivo, setMotivo] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <h3 style={{ marginBottom: 8, fontSize: 16 }}>Rejeitar cadastro</h3>
        <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 16 }}>
          Informe o motivo da rejeição para <strong>{nome}</strong> (opcional).
        </p>
        <textarea
          rows={3}
          placeholder="Motivo da rejeição..."
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          maxLength={500}
          style={{ width: '100%', resize: 'vertical', padding: 10, borderRadius: 8, border: '1px solid var(--gray-300)', fontSize: 13, fontFamily: 'inherit' }}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onCancelar} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--gray-300)', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
          <button onClick={() => onConfirmar(motivo)} style={{ padding: '8px 18px', borderRadius: 8, background: 'var(--danger, #dc2626)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Rejeitar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AprovacoesAdmin() {
  const [lista, setLista] = useState([]);
  const [filtro, setFiltro] = useState('pendente');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [modalRejeitar, setModalRejeitar] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const dados = await api.get(`/aprovacoes?status=${filtro}`);
      setLista(Array.isArray(dados) ? dados : []);
    } catch (e) {
      setErro(e.message || 'Erro ao carregar aprovações.');
    } finally {
      setCarregando(false);
    }
  }, [filtro]);

  useEffect(() => { carregar(); }, [carregar]);

  async function aprovar(id, nome) {
    try {
      await api.patch(`/aprovacoes/${id}/aprovar`);
      setSucesso(`${nome} aprovado com sucesso.`);
      setTimeout(() => setSucesso(''), 4000);
      carregar();
    } catch (e) {
      setErro(e.message || 'Erro ao aprovar.');
    }
  }

  async function rejeitar(id, motivo) {
    try {
      await api.patch(`/aprovacoes/${id}/rejeitar`, { motivo });
      setModalRejeitar(null);
      setSucesso('Cadastro rejeitado.');
      setTimeout(() => setSucesso(''), 4000);
      carregar();
    } catch (e) {
      setErro(e.message || 'Erro ao rejeitar.');
    }
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Aprovações de Cadastro</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--gray-500)' }}>
            Revise os dados e documentos enviados por locadores e locatários antes de liberar o acesso.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={filtro} onChange={e => setFiltro(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gray-300)', fontSize: 13 }}>
            <option value="pendente">Pendentes</option>
            <option value="aprovado">Aprovados</option>
            <option value="rejeitado">Rejeitados</option>
          </select>
          <button onClick={carregar} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--gray-300)', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
      </div>

      {erro && <div className="alert alert-error" style={{ marginBottom: 16 }}>{erro}</div>}
      {sucesso && <div className="alert alert-success" style={{ marginBottom: 16 }}>{sucesso}</div>}

      {carregando && <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>Carregando...</p>}

      {!carregando && lista.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--gray-400)' }}>
          <Clock size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontSize: 15 }}>Nenhum cadastro {STATUS_LABEL[filtro]?.toLowerCase()} no momento.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {lista.map(u => (
          <div key={u.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--gray-200)', padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={20} color="var(--gray-500)" />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{u.nome}</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-500)' }}>{u.email}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${STATUS_COLOR[u.status_aprovacao]}20`, color: STATUS_COLOR[u.status_aprovacao] }}>
                  {STATUS_LABEL[u.status_aprovacao]}
                </span>
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'var(--gray-100)', color: 'var(--gray-600)' }}>
                  {PERFIL_LABEL[u.perfil] || u.perfil}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16, fontSize: 13, color: 'var(--gray-700)' }}>
              <div><span style={{ color: 'var(--gray-400)', fontSize: 11 }}>Documento</span><br />{u.tipo_documento?.toUpperCase()}: {u.documento}</div>
              <div><span style={{ color: 'var(--gray-400)', fontSize: 11 }}>Cadastrado em</span><br />{new Date(u.criado_em).toLocaleString('pt-BR')}</div>
              {u.motivo_rejeicao && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ color: 'var(--gray-400)', fontSize: 11 }}>Motivo da rejeição</span><br />
                  <span style={{ color: '#dc2626' }}>{u.motivo_rejeicao}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: u.status_aprovacao === 'pendente' ? 16 : 0 }}>
              <DocPreview label="RG" base64={u.doc_rg} />
              <DocPreview label="CPF / CNPJ" base64={u.doc_cpf} />
              <DocPreview label="Comprovante" base64={u.doc_comprovante} />
            </div>

            {u.status_aprovacao === 'pendente' && (
              <div style={{ display: 'flex', gap: 10, paddingTop: 16, borderTop: '1px solid var(--gray-100)' }}>
                <button
                  onClick={() => aprovar(u.id, u.nome)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 8, background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                >
                  <CheckCircle size={15} /> Aprovar
                </button>
                <button
                  onClick={() => setModalRejeitar(u)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 8, background: '#fff', color: '#dc2626', border: '1.5px solid #dc2626', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                >
                  <XCircle size={15} /> Rejeitar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {modalRejeitar && (
        <ModalRejeitar
          nome={modalRejeitar.nome}
          onConfirmar={motivo => rejeitar(modalRejeitar.id, motivo)}
          onCancelar={() => setModalRejeitar(null)}
        />
      )}
    </div>
  );
}
