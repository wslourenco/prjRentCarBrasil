import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Edit2, Trash2, X, Check, TrendingUp, TrendingDown } from 'lucide-react';

const CATEGORIAS_DESPESA = [
  'Manutenção Preventiva','Troca de Óleo','Troca de Correia','Troca de Pneu','Funilaria/Pintura',
  'Elétrica','Motor','Suspensão','Freios','Ar Condicionado','Seguro','IPVA','Licenciamento',
  'Bloqueador/Rastreador','Combustível','Limpeza','Multa','Reboque','Outros'
];
const CATEGORIAS_RECEITA = ['Aluguel Semanal','Aluguel Mensal','Caução/Depósito','Devolução Caução','Outros'];

const EMPTY = {
  tipo: 'receita',
  data: new Date().toISOString().split('T')[0],
  valor: '',
  categoria: '',
  descricao: '',
  veiculoId: '',
  locatarioId: '',
  colaboradorId: '',
  formaPagamento: 'pix',
  comprovante: '',
  observacoes: '',
};

export default function Financeiro() {
  const { despesasReceitas, addDespesaReceita, updateDespesaReceita, removeDespesaReceita, veiculos, locatarios, colaboradores } = useApp();
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroVeiculo, setFiltroVeiculo] = useState('');
  const [erroCrud, setErroCrud] = useState('');

  function abrirNovo(tipoInicial = 'receita') {
    setForm({ ...EMPTY, tipo: tipoInicial, categoria: tipoInicial === 'receita' ? CATEGORIAS_RECEITA[0] : CATEGORIAS_DESPESA[0] });
    setEditId(null); setModal(true); setErroCrud('');
  }
  function abrirEditar(d) { setForm({ ...EMPTY, ...d }); setEditId(d.id); setModal(true); setErroCrud(''); }
  function fecharModal() { setModal(false); setEditId(null); setErroCrud(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    setErroCrud('');
    try {
      if (editId) await updateDespesaReceita(editId, form);
      else await addDespesaReceita(form);
      fecharModal();
    } catch (err) {
      setErroCrud(err.message || 'Erro ao salvar. Tente novamente.');
    }
  }

  function f(field) {
    return { value: form[field] || '', onChange: e => setForm({ ...form, [field]: e.target.value }) };
  }

  const lista = despesasReceitas.filter(d => {
    if (filtroTipo && d.tipo !== filtroTipo) return false;
    if (filtroVeiculo && String(d.veiculoId) !== String(filtroVeiculo)) return false;
    return true;
  }).sort((a, b) => b.data > a.data ? 1 : -1);

  const totalReceitas = lista.filter(d => d.tipo === 'receita').reduce((s, d) => s + Number(d.valor || 0), 0);
  const totalDespesas = lista.filter(d => d.tipo === 'despesa').reduce((s, d) => s + Number(d.valor || 0), 0);
  const saldo = totalReceitas - totalDespesas;

  function nomeVeiculo(id) {
    const v = veiculos.find(v => String(v.id) === String(id));
    return v ? `${v.marca} ${v.modelo} – ${v.placa}` : '-';
  }

  return (
    <div className="page-content">
      <div className="flex-between mb-24">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>Despesas & Receitas</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>Controle financeiro de locações e manutenções</p>
        </div>
        <div className="flex" style={{ gap: 8 }}>
          <button className="btn btn-outline" onClick={() => abrirNovo('despesa')}><TrendingDown size={15} /> Nova Despesa</button>
          <button className="btn btn-primary" onClick={() => abrirNovo('receita')}><TrendingUp size={15} /> Nova Receita</button>
        </div>
      </div>

      {/* Resumo */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon green"><TrendingUp size={20} /></div>
          <div>
            <div className="stat-label">Receitas (filtro)</div>
            <div className="stat-value" style={{ fontSize: 18, color: 'var(--secondary)' }}>R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><TrendingDown size={20} /></div>
          <div>
            <div className="stat-label">Despesas (filtro)</div>
            <div className="stat-value" style={{ fontSize: 18, color: 'var(--danger)' }}>R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className={`stat-icon ${saldo >= 0 ? 'green' : 'red'}`}><Check size={20} /></div>
          <div>
            <div className="stat-label">Saldo (filtro)</div>
            <div className="stat-value" style={{ fontSize: 18, color: saldo >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
              R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        {/* Filtros */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ padding: '7px 12px', border: '1.5px solid var(--gray-300)', borderRadius: 'var(--radius)', fontSize: 13 }}>
            <option value="">Todos os tipos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>
          <select value={filtroVeiculo} onChange={e => setFiltroVeiculo(e.target.value)} style={{ padding: '7px 12px', border: '1.5px solid var(--gray-300)', borderRadius: 'var(--radius)', fontSize: 13, flex: 1, maxWidth: 280 }}>
            <option value="">Todos os veículos</option>
            {veiculos.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} – {v.placa}</option>)}
          </select>
        </div>

        {lista.length === 0 ? (
          <div className="empty-state"><Plus size={32} /><p>Nenhum lançamento encontrado.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Categoria</th>
                  <th>Descrição</th>
                  <th>Veículo</th>
                  <th>Forma Pgto</th>
                  <th className="text-right">Valor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.map(d => (
                  <tr key={d.id}>
                    <td>{d.data}</td>
                    <td>
                      <span className={`badge ${d.tipo === 'receita' ? 'badge-green' : 'badge-red'}`}>
                        {d.tipo === 'receita' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td>{d.categoria}</td>
                    <td>{d.descricao}</td>
                    <td style={{ fontSize: 12 }}>{d.veiculoId ? nomeVeiculo(d.veiculoId) : '-'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{d.formaPagamento}</td>
                    <td className="text-right fw-600" style={{ color: d.tipo === 'receita' ? 'var(--secondary)' : 'var(--danger)' }}>
                      {d.tipo === 'receita' ? '+' : '-'} R$ {Number(d.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <div className="flex" style={{ gap: 6 }}>
                        <button className="btn-icon" onClick={() => abrirEditar(d)}><Edit2 size={14} /></button>
                        <button className="btn-icon" style={{ borderColor: 'var(--danger-light)', color: 'var(--danger)' }} onClick={() => setConfirmarExclusao(d.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmarExclusao && (
        <div className="modal-overlay" onClick={() => setConfirmarExclusao(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">Confirmar exclusão</span></div>
            <div className="modal-body">
              <p style={{ marginBottom: 20 }}>Tem certeza que deseja excluir este lançamento?</p>
              <div className="flex" style={{ gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setConfirmarExclusao(null)}>Cancelar</button>
                <button className="btn btn-danger" onClick={() => { removeDespesaReceita(confirmarExclusao); setConfirmarExclusao(null); }}>
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editId ? 'Editar Lançamento' : 'Novo Lançamento'}</span>
              <button className="btn-icon" onClick={fecharModal}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-section">
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label>Tipo</label>
                    <div className="toggle-group">
                      <button type="button" className={form.tipo === 'receita' ? 'active' : ''} onClick={() => setForm({ ...form, tipo: 'receita', categoria: CATEGORIAS_RECEITA[0] })}>
                        <TrendingUp size={14} style={{ marginRight: 6 }} /> Receita
                      </button>
                      <button type="button" className={form.tipo === 'despesa' ? 'active' : ''} onClick={() => setForm({ ...form, tipo: 'despesa', categoria: CATEGORIAS_DESPESA[0] })}>
                        <TrendingDown size={14} style={{ marginRight: 6 }} /> Despesa
                      </button>
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="form-group"><label>Data *</label><input required type="date" {...f('data')} /></div>
                    <div className="form-group"><label>Valor (R$) *</label><input required type="number" step="0.01" min="0" {...f('valor')} /></div>
                    <div className="form-group"><label>Categoria *</label>
                      <select required {...f('categoria')}>
                        {(form.tipo === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label>Forma de Pagamento</label>
                      <select {...f('formaPagamento')}>
                        {['pix','dinheiro','transferência','débito','crédito','boleto','cheque'].map(f2 => <option key={f2} value={f2} style={{ textTransform: 'capitalize' }}>{f2}</option>)}
                      </select>
                    </div>
                    <div className="form-group form-full"><label>Descrição</label><input {...f('descricao')} /></div>
                    <div className="form-group form-full"><label>Veículo</label>
                      <select {...f('veiculoId')}>
                        <option value="">Selecione (opcional)</option>
                        {veiculos.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} – {v.placa}</option>)}
                      </select>
                    </div>
                    {form.tipo === 'receita' && (
                      <div className="form-group form-full"><label>Locatário</label>
                        <select {...f('locatarioId')}>
                          <option value="">Selecione (opcional)</option>
                          {locatarios.map(l => <option key={l.id} value={l.id}>{l.tipo === 'juridica' ? l.razaoSocial : l.nome}</option>)}
                        </select>
                      </div>
                    )}
                    {form.tipo === 'despesa' && (
                      <div className="form-group form-full"><label>Prestador / Colaborador</label>
                        <select {...f('colaboradorId')}>
                          <option value="">Selecione (opcional)</option>
                          {colaboradores.map(c => <option key={c.id} value={c.id}>{c.tipo === 'fisica' ? c.nome : c.razaoSocial}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="form-group form-full"><label>Nº Comprovante / NF</label><input {...f('comprovante')} /></div>
                    <div className="form-group form-full"><label>Observações</label><textarea {...f('observacoes')} /></div>
                  </div>
                </div>

                {erroCrud && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{erroCrud}</p>}
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={fecharModal}><X size={14} /> Cancelar</button>
                  <button type="submit" className="btn btn-primary"><Check size={14} /> {editId ? 'Salvar' : 'Lançar'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
