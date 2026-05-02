import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AlertTriangle, RefreshCw, CheckCircle, XCircle, Loader } from 'lucide-react';

const STATUS_COR = {
  pendente: '#dc2626', vencido: '#dc2626', pago: '#059669', disponivel: '#2563eb',
};

function BadgeStatus({ status }) {
  const cor = STATUS_COR[status?.toLowerCase()] || '#6b7280';
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: cor, background: cor + '18', padding: '2px 8px', borderRadius: 12, textTransform: 'capitalize' }}>
      {status || 'Desconhecido'}
    </span>
  );
}

function formatarValor(v) {
  if (!v && v !== 0) return '-';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function DebitosVeiculares({ veiculoId, placa }) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    if (expandido && !dados) buscar();
  }, [expandido]);

  async function buscar(forcar = false) {
    setCarregando(true); setErro('');
    try {
      const res = await api.get(`/debitos/${veiculoId}${forcar ? '?forcar=1' : ''}`);
      setDados(res);
    } catch (e) {
      setErro(e.message || 'Erro ao consultar débitos.');
    } finally {
      setCarregando(false);
    }
  }

  const multas = dados?.fines || dados?.multas || [];
  const ipva = dados?.ipva || dados?.IPVA || null;
  const licenciamento = dados?.licensing || dados?.licenciamento || null;
  const totalDebitos = multas.length + (ipva ? 1 : 0) + (licenciamento ? 1 : 0);

  return (
    <div style={{ marginTop: 8, border: '1px solid var(--gray-200)', borderRadius: 8, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setExpandido(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: expandido ? 'var(--gray-50)' : '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={15} color={totalDebitos > 0 ? '#dc2626' : '#6b7280'} />
          Débitos Veiculares {placa ? `· ${placa}` : ''}
          {dados && totalDebitos > 0 && <span style={{ fontSize: 11, background: '#fee2e2', color: '#dc2626', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>{totalDebitos}</span>}
          {dados && totalDebitos === 0 && <span style={{ fontSize: 11, background: '#d1fae5', color: '#059669', padding: '1px 7px', borderRadius: 10 }}>Sem débitos</span>}
        </span>
        <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{expandido ? '▲' : '▼'}</span>
      </button>

      {expandido && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--gray-200)' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <button type="button" onClick={() => buscar(true)} disabled={carregando} className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={13} style={carregando ? { animation: 'spin 1s linear infinite' } : {}} />
              {carregando ? 'Consultando...' : 'Atualizar'}
            </button>
          </div>

          {carregando && !dados && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Loader size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
              <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 8 }}>Consultando Celcoin...</p>
            </div>
          )}

          {erro && (
            <div style={{ padding: 12, background: '#fee2e2', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
              <XCircle size={14} style={{ marginRight: 6 }} />
              {erro}
            </div>
          )}

          {dados && !carregando && (
            <>
              {/* IPVA */}
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>IPVA</p>
                {ipva ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 6 }}>
                    <span style={{ fontSize: 13 }}>{ipva.description || ipva.descricao || `IPVA ${ipva.year || ipva.ano || ''}`}</span>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{formatarValor(ipva.amount || ipva.valor)}</span>
                      <BadgeStatus status={ipva.status} />
                    </div>
                  </div>
                ) : <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>Sem informações de IPVA</p>}
              </div>

              {/* Licenciamento */}
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Licenciamento</p>
                {licenciamento ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 6 }}>
                    <span style={{ fontSize: 13 }}>{licenciamento.description || licenciamento.descricao || 'Licenciamento anual'}</span>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{formatarValor(licenciamento.amount || licenciamento.valor)}</span>
                      <BadgeStatus status={licenciamento.status} />
                    </div>
                  </div>
                ) : <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>Sem informações de licenciamento</p>}
              </div>

              {/* Multas */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Multas {multas.length > 0 && <span style={{ color: '#dc2626' }}>({multas.length})</span>}
                </p>
                {multas.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#059669' }}>
                    <CheckCircle size={14} /> Nenhuma multa pendente
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {multas.map((m, i) => (
                      <div key={i} style={{ padding: '8px 12px', background: '#fff5f5', border: '1px solid #fee2e2', borderRadius: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>{m.description || m.descricao || 'Multa de trânsito'}</p>
                            {(m.date || m.data) && <p style={{ fontSize: 11, color: 'var(--gray-500)' }}>Data: {m.date || m.data}</p>}
                            {(m.local || m.location) && <p style={{ fontSize: 11, color: 'var(--gray-500)' }}>Local: {m.local || m.location}</p>}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>{formatarValor(m.amount || m.valor)}</p>
                            <BadgeStatus status={m.status} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {dados.consultado_em && (
                <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 10, textAlign: 'right' }}>
                  {dados.cache ? '📋 Cache · ' : '🔄 '}
                  Consultado em: {new Date(dados.consultado_em).toLocaleString('pt-BR')}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
