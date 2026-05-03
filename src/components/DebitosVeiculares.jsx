import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { AlertTriangle, RefreshCw, CheckCircle, XCircle, Loader, Clock } from 'lucide-react';

const STATUS_COR = {
  pendente: '#dc2626', vencido: '#dc2626', pago: '#059669', disponivel: '#2563eb',
};

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 24; // 2 minutos

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
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState('');
  const [expandido, setExpandido] = useState(false);
  const pollRef = useRef(null);
  const pollAttempts = useRef(0);

  useEffect(() => {
    if (expandido && !dados) buscar();
    return () => pararPolling();
  }, [expandido]);

  function pararPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function iniciarPolling() {
    pararPolling();
    pollAttempts.current = 0;
    pollRef.current = setInterval(async () => {
      pollAttempts.current += 1;
      if (pollAttempts.current >= MAX_POLL_ATTEMPTS) {
        pararPolling();
        setProcessando(false);
        setCarregando(false);
        setErro('Tempo limite excedido. A Celcoin não retornou os dados. Tente novamente.');
        return;
      }
      try {
        const res = await api.get(`/debitos/${veiculoId}`);
        if (res.status !== 'processando') {
          pararPolling();
          setProcessando(false);
          setCarregando(false);
          setDados(res);
        }
      } catch (e) {
        pararPolling();
        setProcessando(false);
        setCarregando(false);
        setErro(e.message || 'Erro ao consultar débitos.');
      }
    }, POLL_INTERVAL_MS);
  }

  async function buscar(forcar = false) {
    pararPolling();
    setCarregando(true);
    setProcessando(false);
    setErro('');
    if (forcar) setDados(null);

    try {
      const res = await api.get(`/debitos/${veiculoId}${forcar ? '?forcar=1' : ''}`);
      if (res.status === 'processando') {
        setProcessando(true);
        setCarregando(false);
        iniciarPolling();
      } else {
        setDados(res);
        setCarregando(false);
      }
    } catch (e) {
      setErro(e.message || 'Erro ao consultar débitos.');
      setCarregando(false);
    }
  }

  const multas = dados?.multas || dados?.fines || [];
  const ipva = dados?.ipva || dados?.IPVA || null;
  const licenciamento = dados?.licenciamento || dados?.licensing || null;
  const totalDebitos = multas.length + (ipva ? 1 : 0) + (licenciamento ? 1 : 0);
  const semDebitos = dados?.status === 'sem_debitos' || (dados && !dados.erro && totalDebitos === 0);
  const naoEncontrado = dados?.status === 'nao_encontrado';
  const comErro = dados?.status === 'erro';

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
          {processando && <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '1px 7px', borderRadius: 10 }}>Consultando...</span>}
          {dados && !processando && totalDebitos > 0 && <span style={{ fontSize: 11, background: '#fee2e2', color: '#dc2626', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>{totalDebitos}</span>}
          {dados && !processando && semDebitos && <span style={{ fontSize: 11, background: '#d1fae5', color: '#059669', padding: '1px 7px', borderRadius: 10 }}>Sem débitos</span>}
        </span>
        <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{expandido ? '▲' : '▼'}</span>
      </button>

      {expandido && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--gray-200)' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <button type="button" onClick={() => buscar(true)} disabled={carregando || processando} className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={13} style={(carregando || processando) ? { animation: 'spin 1s linear infinite' } : {}} />
              {(carregando || processando) ? 'Consultando...' : 'Atualizar'}
            </button>
          </div>

          {(carregando || processando) && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Loader size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
              <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 8 }}>
                {processando ? 'Aguardando resposta da Celcoin...' : 'Iniciando consulta...'}
              </p>
              {processando && (
                <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>
                  <Clock size={11} style={{ marginRight: 4 }} />
                  Verificando a cada {POLL_INTERVAL_MS / 1000}s · tentativa {pollAttempts.current}/{MAX_POLL_ATTEMPTS}
                </p>
              )}
            </div>
          )}

          {erro && (
            <div style={{ padding: 12, background: '#fee2e2', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
              <XCircle size={14} style={{ marginRight: 6 }} />
              {erro}
            </div>
          )}

          {dados && !carregando && !processando && (
            <>
              {naoEncontrado && (
                <div style={{ padding: 12, background: '#fef3c7', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
                  Veículo não encontrado no DETRAN para o estado informado.
                </div>
              )}

              {comErro && (
                <div style={{ padding: 12, background: '#fee2e2', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
                  {dados.erro || 'Serviço temporariamente indisponível. Tente novamente.'}
                </div>
              )}

              {!naoEncontrado && !comErro && (
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
                                {(m.location || m.local) && <p style={{ fontSize: 11, color: 'var(--gray-500)' }}>Local: {m.location || m.local}</p>}
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
                </>
              )}

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
