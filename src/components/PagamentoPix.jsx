import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { X, Copy, Check, Loader } from 'lucide-react';

export default function PagamentoPix({ valor, descricao, emailPagador, locacaoId, onPago, onFechar }) {
  const [estado, setEstado] = useState('criando'); // criando | aguardando | pago | erro
  const [pagamento, setPagamento] = useState(null);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);
  const pollingRef = useRef(null);

  useEffect(() => {
    criarPix();
    return () => clearInterval(pollingRef.current);
  }, []);

  async function criarPix() {
    try {
      setEstado('criando');
      const dados = await api.post('/pagamentos/pix', { valor, descricao, emailPagador, locacaoId });
      setPagamento(dados);
      setEstado('aguardando');
      pollingRef.current = setInterval(() => verificarStatus(dados.pagamentoId), 5000);
    } catch (e) {
      setErro(e.message || 'Erro ao gerar PIX.');
      setEstado('erro');
    }
  }

  async function verificarStatus(pagamentoId) {
    try {
      const dados = await api.get(`/pagamentos/${pagamentoId}/status`);
      if (dados.status === 'aprovado') {
        clearInterval(pollingRef.current);
        setEstado('pago');
        setTimeout(() => onPago?.(), 1500);
      } else if (['cancelado', 'rejeitado'].includes(dados.status)) {
        clearInterval(pollingRef.current);
        setErro('Pagamento cancelado ou rejeitado.');
        setEstado('erro');
      }
    } catch { /* ignora */ }
  }

  function copiarPix() {
    navigator.clipboard.writeText(pagamento?.pixCopiaCola || '');
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 420, width: '100%', position: 'relative' }}>
        <button onClick={onFechar} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>
          <X size={20} />
        </button>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Pagamento via PIX</h2>
        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 20 }}>{descricao}</p>

        {estado === 'criando' && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
            <p style={{ marginTop: 12, color: 'var(--gray-500)' }}>Gerando QR Code...</p>
          </div>
        )}

        {estado === 'aguardando' && pagamento && (
          <>
            <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: 16, textAlign: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>
                {Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              {pagamento.qrCodeBase64 ? (
                <img src={`data:image/png;base64,${pagamento.qrCodeBase64}`} alt="QR Code PIX" style={{ width: 200, height: 200, margin: '0 auto', display: 'block' }} />
              ) : (
                <div style={{ width: 200, height: 200, background: 'var(--gray-200)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                  <p style={{ fontSize: 12, color: 'var(--gray-500)' }}>QR Code indisponível</p>
                </div>
              )}
            </div>

            {pagamento.pixCopiaCola && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 6 }}>Ou copie o código PIX:</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input readOnly value={pagamento.pixCopiaCola} style={{ flex: 1, fontSize: 11, padding: '6px 10px', border: '1px solid var(--gray-300)', borderRadius: 6, background: 'var(--gray-50)' }} />
                  <button onClick={copiarPix} className="btn btn-outline" style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}>
                    {copiado ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fff8e1', borderRadius: 8, border: '1px solid #ffe082' }}>
              <Loader size={14} style={{ animation: 'spin 1s linear infinite', color: '#f59e0b', flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: '#92400e' }}>Aguardando confirmação do pagamento...</p>
            </div>
          </>
        )}

        {estado === 'pago' && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={28} color="#059669" />
            </div>
            <h3 style={{ color: '#059669', fontWeight: 700 }}>Pagamento confirmado!</h3>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 8 }}>Sua locação foi ativada com sucesso.</p>
          </div>
        )}

        {estado === 'erro' && (
          <div style={{ padding: 16, background: '#fee2e2', borderRadius: 8, marginTop: 8 }}>
            <p style={{ color: '#dc2626', fontSize: 13 }}>{erro}</p>
            <button onClick={criarPix} className="btn btn-primary" style={{ marginTop: 12, width: '100%' }}>Tentar novamente</button>
          </div>
        )}
      </div>
    </div>
  );
}
