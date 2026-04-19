import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Edit2, Trash2, X, Check, CreditCard } from 'lucide-react';

const CATEGORIAS_AQUISICAO = [
  { value: 'Consórcio - Carta de Crédito', label: 'Consórcio (Carta de Crédito)' },
  { value: 'Financiamento - Parcela', label: 'Financiamento' },
  { value: 'Compra no Cartão', label: 'Compra no Cartão' },
];

const EMPTY = {
  categoria: 'Consórcio - Carta de Crédito',
  data: new Date().toISOString().split('T')[0],
  valor: '',
  veiculoId: '',
  formaPagamento: 'boleto',
  parcelaAtual: '',
  totalParcelas: '',
  descricao: '',
  observacoes: '',
};

function parseParcelaInfo(observacoes) {
  const texto = String(observacoes || '');
  const match = texto.match(/Parcela:\s*(\d+)\/(\d+)/i);
  return {
    atual: match?.[1] || '',
    total: match?.[2] || '',
    semParcela: texto.replace(/(?:^|\n)Parcela:\s*\d+\/\d+(?=\n|$)/gi, '').trim(),
  };
}

function buildObservacoes(observacoes, parcelaAtual, totalParcelas) {
  const base = String(observacoes || '').trim();
  if (!parcelaAtual || !totalParcelas) return base;
  const linha = `Parcela: ${parcelaAtual}/${totalParcelas}`;
  return base ? `${base}\n${linha}` : linha;
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Aquisicoes() {
  const {
    usuarioLogado,
    despesasReceitas,
    veiculos,
    addDespesaReceita,
    updateDespesaReceita,
    removeDespesaReceita,
  } = useApp();

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [erro, setErro] = useState('');
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);

  const podeGerenciar = usuarioLogado?.perfil === 'admin' || usuarioLogado?.perfil === 'locador';

  const aquisicoes = useMemo(() => {
    const categorias = new Set(CATEGORIAS_AQUISICAO.map(item => item.value));
    return (despesasReceitas || [])
      .filter(item => item.tipo === 'despesa' && categorias.has(String(item.categoria || '')))
      .sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
  }, [despesasReceitas]);

  const veiculosPorId = useMemo(
    () => new Map((veiculos || []).map(v => [String(v.id), v])),
    [veiculos]
  );

  function nomeVeiculo(id) {
    const v = veiculosPorId.get(String(id));
    if (!v) return '-';
    return `${v.marca || ''} ${v.modelo || ''} ${v.placa ? `- ${v.placa}` : ''}`.trim();
  }

  function abrirNovo() {
    setForm(EMPTY);
    setEditId(null);
    setErro('');
    setModal(true);
  }

  function abrirEditar(item) {
    const parcela = parseParcelaInfo(item.observacoes);
    setForm({
      categoria: item.categoria || EMPTY.categoria,
      data: item.data || EMPTY.data,
      valor: item.valor || '',
      veiculoId: item.veiculoId || '',
      formaPagamento: item.formaPagamento || 'boleto',
      parcelaAtual: parcela.atual,
      totalParcelas: parcela.total,
      descricao: item.descricao || '',
      observacoes: parcela.semParcela,
    });
    setEditId(item.id);
    setErro('');
    setModal(true);
  }

  function fecharModal() {
    setModal(false);
    setEditId(null);
    setErro('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');

    if (!form.veiculoId) {
      setErro('Selecione o veículo relacionado ao pagamento.');
      return;
    }

    if (!form.valor || Number(form.valor) <= 0) {
      setErro('Informe um valor válido.');
      return;
    }

    if ((form.parcelaAtual && !form.totalParcelas) || (!form.parcelaAtual && form.totalParcelas)) {
      setErro('Informe parcela atual e total de parcelas juntos.');
      return;
    }

    const payload = {
      tipo: 'despesa',
      data: form.data,
      valor: Number(form.valor),
      categoria: form.categoria,
      descricao: form.descricao || `Pagamento de ${form.categoria.toLowerCase()}`,
      veiculoId: form.veiculoId,
      formaPagamento: form.formaPagamento,
      comprovante: '',
      observacoes: buildObservacoes(form.observacoes, form.parcelaAtual, form.totalParcelas),
    };

    try {
      if (editId) await updateDespesaReceita(editId, payload);
      else await addDespesaReceita(payload);
      fecharModal();
    } catch (err) {
      setErro(err.message || 'Não foi possível salvar o lançamento.');
    }
  }

  return (
    <div className="page-content">
      <div className="flex-between mb-24">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>
            Controle de Aquisição de Veículos
          </h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>
            Gestão de pagamentos por consórcio, financiamento e compra no cartão.
          </p>
        </div>

        {podeGerenciar && (
          <button className="btn btn-primary" onClick={abrirNovo}>
            <Plus size={16} /> Novo Lançamento
          </button>
        )}
      </div>

      {aquisicoes.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <CreditCard size={40} />
            <p>Nenhum lançamento de aquisição cadastrado.</p>
          </div>
        </div>
      ) : (
        <div className="veiculo-table-wrapper">
          <table className="veiculo-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Modalidade</th>
                <th>Veículo</th>
                <th>Valor</th>
                <th>Forma Pgto.</th>
                <th>Descrição</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {aquisicoes.map(item => (
                <tr key={item.id}>
                  <td>{item.data}</td>
                  <td>{item.categoria}</td>
                  <td>{nomeVeiculo(item.veiculoId)}</td>
                  <td>{formatarMoeda(item.valor)}</td>
                  <td>{item.formaPagamento || '-'}</td>
                  <td>{item.descricao || '-'}</td>
                  <td>
                    {podeGerenciar && (
                      <div className="flex" style={{ gap: 6 }}>
                        <button className="btn btn-sm btn-outline" onClick={() => abrirEditar(item)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => setConfirmarExclusao(item.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editId ? 'Editar Lançamento de Aquisição' : 'Novo Lançamento de Aquisição'}</span>
              <button className="btn-icon" onClick={fecharModal}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Modalidade *</label>
                    <select value={form.categoria} onChange={e => setForm(prev => ({ ...prev, categoria: e.target.value }))}>
                      {CATEGORIAS_AQUISICAO.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Data *</label>
                    <input type="date" value={form.data} onChange={e => setForm(prev => ({ ...prev, data: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Valor (R$) *</label>
                    <input type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm(prev => ({ ...prev, valor: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Veículo *</label>
                    <select value={form.veiculoId} onChange={e => setForm(prev => ({ ...prev, veiculoId: e.target.value }))} required>
                      <option value="">Selecione</option>
                      {(veiculos || []).map(v => (
                        <option key={v.id} value={v.id}>{`${v.marca || ''} ${v.modelo || ''} ${v.placa ? `- ${v.placa}` : ''}`.trim()}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Forma de pagamento</label>
                    <select value={form.formaPagamento} onChange={e => setForm(prev => ({ ...prev, formaPagamento: e.target.value }))}>
                      <option value="boleto">Boleto</option>
                      <option value="pix">Pix</option>
                      <option value="debito">Débito</option>
                      <option value="credito">Crédito</option>
                      <option value="transferencia">Transferência</option>
                      <option value="dinheiro">Dinheiro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Parcela atual</label>
                    <input type="number" min="1" value={form.parcelaAtual} onChange={e => setForm(prev => ({ ...prev, parcelaAtual: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Total de parcelas</label>
                    <input type="number" min="1" value={form.totalParcelas} onChange={e => setForm(prev => ({ ...prev, totalParcelas: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Descrição</label>
                    <input value={form.descricao} onChange={e => setForm(prev => ({ ...prev, descricao: e.target.value }))} placeholder="Ex: Parcela mensal do financiamento do veículo" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Observações</label>
                    <textarea value={form.observacoes} onChange={e => setForm(prev => ({ ...prev, observacoes: e.target.value }))} />
                  </div>
                </div>

                {erro && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{erro}</p>}

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={fecharModal}><X size={14} /> Cancelar</button>
                  <button type="submit" className="btn btn-primary"><Check size={14} /> {editId ? 'Salvar' : 'Cadastrar'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {confirmarExclusao && (
        <div className="modal-overlay" onClick={() => setConfirmarExclusao(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">Confirmar exclusão</span></div>
            <div className="modal-body">
              <p style={{ marginBottom: 20 }}>Deseja excluir este lançamento de aquisição?</p>
              <div className="flex" style={{ gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setConfirmarExclusao(null)}>Cancelar</button>
                <button
                  className="btn btn-danger"
                  onClick={async () => {
                    await removeDespesaReceita(confirmarExclusao);
                    setConfirmarExclusao(null);
                  }}
                >
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
