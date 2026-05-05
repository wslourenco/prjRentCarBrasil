import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AlertTriangle, RefreshCw, CheckCircle, XCircle, Loader } from 'lucide-react';

function formatarValor(v) {
  if (!v && v !== 0) return '-';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function DebitosVeiculares({ veiculoId, placa }) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [expandido, setExpandido] = useState(true);

  useEffect(() => {
    buscar();
  }, []);

  async function buscar(forcar = false) {
    setCarregando(true);
    setErro('');
    if (forcar) setDados(null);
    try {
      const res = await api.get(`/debitos/${veiculoId}${forcar ? '?forcar=1' : ''}`);
      setDados(res);
    } catch (e) {
      setErro({ msg: e.message || 'Erro ao consultar multas.', detalhe: e.detalhe || null });
    } finally {
      setCarregando(false);
    }
  }

  const multas = dados?.multas || [];
  const semMultas = dados && !dados.erro && multas.length === 0;

  return (
    <div style={{ marginTop: 8, border: '1px solid var(--gray-200)', borderRadius: 8, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setExpandido(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: expandido ? 'var(--gray-50)' : '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={15} color={multas.length > 0 ? '#dc2626' : '#6b7280'} />
          Multas Veiculares {placa ? `· ${placa}` : ''}
          {dados && !carregando && multas.length > 0 && (
            <span style={{ fontSize: 11, background: '#fee2e2', color: '#dc2626', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>{multas.length}</span>
          )}
          {dados && !carregando && semMultas && (
            <span style={{ fontSize: 11, background: '#d1fae5', color: '#059669', padding: '1px 7px', borderRadius: 10 }}>Sem multas</span>
          )}
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

          {carregando && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Loader size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
              <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 8 }}>Consultando multas...</p>
            </div>
          )}

          {erro && (
            <div style={{ padding: 12, background: '#fee2e2', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <XCircle size={14} />
                {erro.msg || erro}
              </div>
              {erro.detalhe && (
                <div style={{ fontSize: 11, color: '#991b1b', marginTop: 4, paddingLeft: 22 }}>{erro.detalhe}</div>
              )}
            </div>
          )}

          {dados && !carregando && !erro && (
            <>
              {semMultas ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: '#f0fdf4', borderRadius: 8, fontSize: 13, color: '#059669' }}>
                  <CheckCircle size={16} /> Nenhuma multa encontrada para este veículo.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {multas.map((m, i) => (
                    <div key={i} style={{ padding: '10px 12px', background: '#fff5f5', border: '1px solid #fee2e2', borderRadius: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 2 }}>
                            {m.descricao || m.description || 'Multa de trânsito'}
                          </p>
                          {(m.local || m.location) && (
                            <p style={{ fontSize: 11, color: 'var(--gray-500)' }}>Local: {m.local || m.location}</p>
                          )}
                          {(m.processo || m.process) && (
                            <p style={{ fontSize: 11, color: 'var(--gray-400)' }}>Processo: {m.processo || m.process}</p>
                          )}
                        </div>
                        {(m.valor || m.value) != null && (
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', whiteSpace: 'nowrap' }}>
                            {formatarValor(m.valor ?? m.value)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {dados.consultado_em && (
                <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 10, textAlign: 'right' }}>
                  {dados.cache ? '📋 Cache · ' : ''}
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
