import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Car, User, Phone, Mail, DollarSign, Wrench, X, Plus, CheckCircle,
  ChevronRight, MessageCircle, Bell, Check, CalendarDays
} from 'lucide-react';

const EMPTY_LOCACAO = {
  veiculoId: '', locatarioId: '',
  dataInicio: new Date().toISOString().split('T')[0],
  dataPrevisaoFim: '',
  valorSemanal: '',
  caucao: '',
  condicoes: '',
  kmEntrada: '',
  periodicidade: 'semanal',
  quantidadePeriodos: '1',
};

export default function Painel() {
  const { locacoes, veiculos, locatarios, despesasReceitas, addLocacao, encerrarLocacao, updateVeiculo, usuarioLogado } = useApp();
  const [veiculoSelecionado, setVeiculoSelecionado] = useState(null);
  const [abaDetalhe, setAbaDetalhe] = useState('info');
  const [modalNovaLocacao, setModalNovaLocacao] = useState(false);
  const [formLocacao, setFormLocacao] = useState(EMPTY_LOCACAO);
  const [confirmarEncerrar, setConfirmarEncerrar] = useState(null);
  const [filtroCategoriaVeiculo, setFiltroCategoriaVeiculo] = useState('');

  const locacoesAtivas = locacoes.filter(l => l.status === 'ativa');

  const categoriasVeiculo = Array.from(new Set(
    veiculos
      .map(v => String(v.marca || '').trim() || 'Sem categoria')
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

  const veiculosLocados = locacoesAtivas.map(loc => {
    const veiculo = veiculos.find(v => String(v.id) === String(loc.veiculoId));
    const locatario = locatarios.find(l => String(l.id) === String(loc.locatarioId));
    return { locacao: loc, veiculo, locatario };
  }).filter(item => item.veiculo)
    .filter(item => {
      if (!filtroCategoriaVeiculo) return true;
      return (String(item.veiculo.marca || '').trim() || 'Sem categoria') === filtroCategoriaVeiculo;
    });

  function selecionarVeiculo(item) {
    setVeiculoSelecionado(item);
    setAbaDetalhe('info');
  }

  function getDespesasVeiculo(veiculoId) {
    return despesasReceitas.filter(d => d.tipo === 'despesa' && String(d.veiculoId) === String(veiculoId));
  }

  function getReceitasLocatario(locatarioId) {
    return despesasReceitas.filter(d => d.tipo === 'receita' && String(d.locatarioId) === String(locatarioId));
  }

  async function handleNovaLocacao(e) {
    e.preventDefault();
    try {
      await addLocacao(formLocacao);
      if (formLocacao.kmEntrada && formLocacao.veiculoId) {
        await updateVeiculo(Number(formLocacao.veiculoId), { kmAtual: formLocacao.kmEntrada });
      }
      setModalNovaLocacao(false);
      setFormLocacao(EMPTY_LOCACAO);
    } catch (err) {
      alert(err.message || 'Erro ao registrar locação.');
    }
  }

  async function handleEncerrar(locacaoId) {
    try {
      await encerrarLocacao(locacaoId);
      setVeiculoSelecionado(null);
      setConfirmarEncerrar(null);
    } catch (err) {
      alert(err.message || 'Erro ao encerrar locação.');
    }
  }

  function fLocacao(field) {
    return { value: formLocacao[field] || '', onChange: e => setFormLocacao({ ...formLocacao, [field]: e.target.value }) };
  }

  const veiculosDisponiveis = veiculos
    .filter(v => !locacoesAtivas.find(l => String(l.veiculoId) === String(v.id)))
    .filter(v => {
      if (!filtroCategoriaVeiculo) return true;
      return (String(v.marca || '').trim() || 'Sem categoria') === filtroCategoriaVeiculo;
    });

  if (usuarioLogado?.perfil === 'locatario') {
    return (
      <PainelLocatario
        veiculos={veiculos}
        locacoes={locacoes}
        addLocacao={addLocacao}
      />
    );
  }

  return (
    <div className="page-content">
      <div className="flex-between mb-24">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>Painel de Controle</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>{locacoesAtivas.length} locação(ões) ativa(s)</p>
        </div>
        <div className="flex" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select aria-label="Categoria do Veículo" value={filtroCategoriaVeiculo} onChange={e => setFiltroCategoriaVeiculo(e.target.value)} style={{ padding: '7px 12px', border: '1.5px solid var(--gray-300)', borderRadius: 'var(--radius)', fontSize: 13, width: '100%', maxWidth: 320 }}>
            <option value="">Todas as montadoras</option>
            {categoriasVeiculo.map(categoria => <option key={categoria} value={categoria}>{categoria}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setModalNovaLocacao(true)}><Plus size={16} /> Nova Locação</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: veiculoSelecionado ? '320px 1fr' : '1fr', gap: 16 }}>

        {/* Lista de veículos locados */}
        <div>
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--gray-100)' }}>
              <span className="card-title">Veículos Alugados</span>
            </div>
            {veiculosLocados.length === 0 ? (
              <div className="empty-state"><Car size={32} /><p>Nenhuma locação ativa</p></div>
            ) : (
              veiculosLocados.map(item => {
                const isSelected = veiculoSelecionado?.veiculo?.id === item.veiculo?.id;
                return (
                  <div
                    key={item.locacao.id}
                    onClick={() => selecionarVeiculo(item)}
                    style={{
                      padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid var(--gray-100)',
                      background: isSelected ? 'var(--primary-light)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                      transition: 'background .15s'
                    }}
                  >
                    <div className="flex-between">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-800)' }}>
                          {item.veiculo.marca} {item.veiculo.modelo}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{item.veiculo.placa}</div>
                      </div>
                      <ChevronRight size={16} color="var(--gray-400)" />
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--gray-600)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <User size={12} />
                        {item.locatario ? (item.locatario.tipo === 'juridica' ? item.locatario.razaoSocial : item.locatario.nome) : 'Locatário não encontrado'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                        <Phone size={12} /> {item.locatario?.celular || '-'}
                      </div>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <span className="badge badge-green">Ativa desde {item.locacao.dataInicio}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detalhe do veículo/locação */}
        {veiculoSelecionado && (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{veiculoSelecionado.veiculo.marca} {veiculoSelecionado.veiculo.modelo} – {veiculoSelecionado.veiculo.placa}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                  Locatário: {veiculoSelecionado.locatario ? (veiculoSelecionado.locatario.tipo === 'juridica' ? veiculoSelecionado.locatario.razaoSocial : veiculoSelecionado.locatario.nome) : '-'}
                </div>
              </div>
              <div className="flex" style={{ gap: 8 }}>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => setConfirmarEncerrar(veiculoSelecionado.locacao.id)}
                >
                  <CheckCircle size={14} /> Encerrar Locação
                </button>
                <button className="btn-icon" onClick={() => setVeiculoSelecionado(null)}><X size={16} /></button>
              </div>
            </div>

            {/* Ações rápidas */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--gray-100)', display: 'flex', gap: 8 }}>
              {veiculoSelecionado.locatario?.celular && (
                <a
                  href={`https://wa.me/55${(veiculoSelecionado.locatario.whatsapp || veiculoSelecionado.locatario.celular).replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  <MessageCircle size={14} /> WhatsApp
                </a>
              )}
              {veiculoSelecionado.locatario?.email && (
                <a
                  href={`mailto:${veiculoSelecionado.locatario.email}?subject=Locação Veículo ${veiculoSelecionado.veiculo.placa}`}
                  className="btn btn-outline btn-sm"
                >
                  <Mail size={14} /> E-mail
                </a>
              )}
              <button className="btn btn-outline btn-sm" disabled title="Em desenvolvimento">
                <Bell size={14} /> Notificação
              </button>
            </div>

            {/* Tabs */}
            <div style={{ padding: '0 20px' }}>
              <div className="tabs">
                {[
                  { key: 'info', label: 'Informações' },
                  { key: 'pagamentos', label: 'Pagamentos' },
                  { key: 'despesas', label: 'Despesas do Veículo' },
                ].map(t => (
                  <button key={t.key} className={`tab-btn ${abaDetalhe === t.key ? 'active' : ''}`} onClick={() => setAbaDetalhe(t.key)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '0 20px 20px' }}>
              {abaDetalhe === 'info' && (
                <InfoLocacao item={veiculoSelecionado} />
              )}
              {abaDetalhe === 'pagamentos' && (
                <TabelaPagamentos receitas={getReceitasLocatario(veiculoSelecionado.locatario?.id)} />
              )}
              {abaDetalhe === 'despesas' && (
                <TabelaDespesas despesas={getDespesasVeiculo(veiculoSelecionado.veiculo?.id)} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Confirmar Encerramento */}
      {confirmarEncerrar && (
        <div className="modal-overlay" onClick={() => setConfirmarEncerrar(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">Encerrar Locação</span></div>
            <div className="modal-body">
              <p style={{ marginBottom: 20 }}>Confirma o encerramento da locação? Esta ação marcará o veículo como disponível.</p>
              <div className="flex" style={{ gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setConfirmarEncerrar(null)}>Cancelar</button>
                <button className="btn btn-danger" onClick={() => handleEncerrar(confirmarEncerrar)}>
                  <CheckCircle size={14} /> Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Locação */}
      {modalNovaLocacao && (
        <div className="modal-overlay" onClick={() => setModalNovaLocacao(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nova Locação</span>
              <button className="btn-icon" onClick={() => setModalNovaLocacao(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {veiculosDisponiveis.length === 0 ? (
                <div className="alert alert-info">Todos os veículos estão locados no momento.</div>
              ) : (
                <form onSubmit={handleNovaLocacao}>
                  <div className="form-grid">
                    <div className="form-group form-full">
                      <label>Veículo *</label>
                      <select required value={formLocacao.veiculoId} onChange={e => setFormLocacao({ ...formLocacao, veiculoId: e.target.value })}>
                        <option value="">Selecione o veículo</option>
                        {veiculosDisponiveis.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} – {v.placa}</option>)}
                      </select>
                    </div>
                    <div className="form-group form-full">
                      <label>Locatário *</label>
                      <select required value={formLocacao.locatarioId} onChange={e => setFormLocacao({ ...formLocacao, locatarioId: e.target.value })}>
                        <option value="">Selecione o locatário</option>
                        {locatarios.map(l => <option key={l.id} value={l.id}>{l.tipo === 'juridica' ? l.razaoSocial : l.nome}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label>Data de Início *</label><input required type="date" {...fLocacao('dataInicio')} /></div>
                    <div className="form-group"><label>Previsão de Fim</label><input type="date" {...fLocacao('dataPrevisaoFim')} /></div>
                    <div className="form-group"><label>Valor Semanal (R$) *</label><input required type="number" step="0.01" {...fLocacao('valorSemanal')} /></div>
                    <div className="form-group"><label>Caução (R$)</label><input type="number" step="0.01" {...fLocacao('caucao')} /></div>
                    <div className="form-group"><label>KM na Entrega</label><input type="number" {...fLocacao('kmEntrada')} /></div>
                    <div className="form-group form-full"><label>Condições / Observações</label><textarea {...fLocacao('condicoes')} /></div>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn btn-outline" onClick={() => setModalNovaLocacao(false)}><X size={14} /> Cancelar</button>
                    <button type="submit" className="btn btn-primary"><Check size={14} /> Iniciar Locação</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PainelLocatario({ veiculos, locacoes, addLocacao }) {
  const [filtroCategoriaVeiculo, setFiltroCategoriaVeiculo] = useState('');
  const [form, setForm] = useState({
    veiculoId: '',
    dataInicio: new Date().toISOString().split('T')[0],
    periodicidade: 'semanal',
    quantidadePeriodos: '1',
    condicoes: '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const locacoesAtivas = locacoes.filter(l => l.status === 'ativa');
  const categoriasVeiculo = Array.from(new Set(
    veiculos
      .map(v => String(v.marca || '').trim() || 'Sem categoria')
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

  const veiculosDisponiveis = veiculos
    .filter(v => !locacoesAtivas.some(l => String(l.veiculoId) === String(v.id)))
    .filter(v => {
      if (!filtroCategoriaVeiculo) return true;
      return (String(v.marca || '').trim() || 'Sem categoria') === filtroCategoriaVeiculo;
    });

  useEffect(() => {
    if (form.veiculoId && veiculosDisponiveis.some(v => String(v.id) === String(form.veiculoId))) {
      return;
    }

    setForm(prev => ({
      ...prev,
      veiculoId: veiculosDisponiveis[0] ? String(veiculosDisponiveis[0].id) : '',
    }));
  }, [veiculosDisponiveis, form.veiculoId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      await addLocacao({
        veiculoId: form.veiculoId,
        dataInicio: form.dataInicio,
        periodicidade: form.periodicidade,
        quantidadePeriodos: Number(form.quantidadePeriodos),
        condicoes: form.condicoes,
      });
      setForm({
        veiculoId: '',
        dataInicio: new Date().toISOString().split('T')[0],
        periodicidade: 'semanal',
        quantidadePeriodos: '1',
        condicoes: '',
      });
    } catch (err) {
      setErro(err.message || 'Não foi possível iniciar a locação.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="page-content">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>Solicitar Locação</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>
          Defina o período da locação (semanal, quinzenal ou mensal).
        </p>
        <div style={{ marginTop: 10, maxWidth: 280 }}>
          <select aria-label="Categoria do Veículo" value={filtroCategoriaVeiculo} onChange={e => setFiltroCategoriaVeiculo(e.target.value)} style={{ padding: '7px 12px', border: '1.5px solid var(--gray-300)', borderRadius: 'var(--radius)', fontSize: 13, width: '100%', maxWidth: 320 }}>
            <option value="">Todas as montadoras</option>
            {categoriasVeiculo.map(categoria => <option key={categoria} value={categoria}>{categoria}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 440px) 1fr', gap: 16 }}>
        <div className="card">
          {veiculosDisponiveis.length === 0 ? (
            <div className="empty-state"><Car size={32} /><p>Não há veículos disponíveis no momento.</p></div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Data de início *</label>
                  <input type="date" required value={form.dataInicio} onChange={e => setForm({ ...form, dataInicio: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Periodicidade *</label>
                  <select value={form.periodicidade} onChange={e => setForm({ ...form, periodicidade: e.target.value })}>
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Quantidade de períodos *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.quantidadePeriodos}
                  onChange={e => setForm({ ...form, quantidadePeriodos: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Observações</label>
                <textarea value={form.condicoes} onChange={e => setForm({ ...form, condicoes: e.target.value })} />
              </div>

              {erro && <div className="alert alert-error" style={{ marginTop: 12 }}>{erro}</div>}

              <button type="submit" className="btn btn-primary" style={{ marginTop: 12 }} disabled={salvando || !form.veiculoId}>
                <CalendarDays size={16} /> {salvando ? 'Enviando...' : 'Confirmar Locação'}
              </button>
            </form>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Minhas intenções de locação</span>
            <span className="badge badge-blue">{locacoes.length}</span>
          </div>
          {locacoes.length === 0 ? (
            <div className="empty-state"><CalendarDays size={32} /><p>Você ainda não possui locações.</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Veículo</th>
                    <th>Início</th>
                    <th>Previsão Fim</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {locacoes.map(loc => (
                    <tr key={loc.id}>
                      <td>{loc.nomeVeiculo || loc.placa || loc.veiculoId}</td>
                      <td>{loc.dataInicio}</td>
                      <td>{loc.dataPrevisaoFim || '-'}</td>
                      <td><span className={`badge ${loc.status === 'ativa' ? 'badge-green' : 'badge-gray'}`}>{loc.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoLocacao({ item }) {
  const { veiculo, locatario, locacao } = item;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <InfoSection title="Veículo">
          <InfoRow label="Marca/Modelo" value={`${veiculo.marca} ${veiculo.modelo}`} />
          <InfoRow label="Placa" value={veiculo.placa} />
          <InfoRow label="Ano" value={`${veiculo.anoFabricacao}/${veiculo.anoModelo}`} />
          <InfoRow label="Combustível" value={veiculo.combustivel} />
          <InfoRow label="Cor" value={veiculo.cor} />
          <InfoRow label="KM Atual" value={Number(veiculo.kmAtual || 0).toLocaleString()} />
          <InfoRow label="Próx. Troca Óleo" value={veiculo.kmTrocaOleo ? Number(veiculo.kmTrocaOleo).toLocaleString() : '-'} />
          <InfoRow label="Venc. Seguro" value={veiculo.vencimentoSeguro || '-'} />
        </InfoSection>

        <InfoSection title="Locatário">
          {locatario ? (
            <>
              <InfoRow label="Nome" value={locatario.tipo === 'juridica' ? locatario.razaoSocial : locatario.nome} />
              <InfoRow label="CPF/CNPJ" value={locatario.tipo === 'juridica' ? locatario.cnpj : locatario.cpf} />
              <InfoRow label="CNH" value={locatario.cnh || '-'} />
              <InfoRow label="Validade CNH" value={locatario.validadeCnh || '-'} />
              <InfoRow label="Telefone" value={locatario.celular || locatario.telefone || '-'} />
              <InfoRow label="E-mail" value={locatario.email || '-'} />
              <InfoRow label="Motorista App" value={locatario.motoristApp ? 'Sim' : 'Não'} />
              {locatario.motoristApp && <InfoRow label="Plataformas" value={locatario.plataformasApp || '-'} />}
            </>
          ) : <p style={{ color: 'var(--gray-400)' }}>Locatário não encontrado</p>}
        </InfoSection>
      </div>

      <InfoSection title="Contrato de Locação">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <InfoRow label="Início" value={locacao.dataInicio} />
          <InfoRow label="Previsão Fim" value={locacao.dataPrevisaoFim || 'Indeterminado'} />
          <InfoRow label="Valor Semanal" value={locacao.valorSemanal ? `R$ ${Number(locacao.valorSemanal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'} />
          <InfoRow label="Caução" value={locacao.caucao ? `R$ ${Number(locacao.caucao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'} />
          <InfoRow label="KM Entrada" value={locacao.kmEntrada ? Number(locacao.kmEntrada).toLocaleString() : '-'} />
        </div>
        {locacao.condicoes && <InfoRow label="Condições" value={locacao.condicoes} />}
      </InfoSection>
    </div>
  );
}

function InfoSection({ title, children }) {
  return (
    <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius)', padding: '14px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--gray-200)' }}>
      <span style={{ color: 'var(--gray-500)' }}>{label}</span>
      <span style={{ fontWeight: 500, color: 'var(--gray-800)', textAlign: 'right', maxWidth: '60%' }}>{value || '-'}</span>
    </div>
  );
}

function TabelaPagamentos({ receitas }) {
  const total = receitas.reduce((s, r) => s + Number(r.valor || 0), 0);
  return (
    <div>
      {receitas.length === 0 ? (
        <div className="empty-state"><DollarSign size={32} /><p>Nenhum pagamento registrado</p></div>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', borderBottom: '1px solid var(--gray-200)' }}>Data</th>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', borderBottom: '1px solid var(--gray-200)' }}>Categoria</th>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', borderBottom: '1px solid var(--gray-200)' }}>Pagamento</th>
                <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', borderBottom: '1px solid var(--gray-200)' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {receitas.map(r => (
                <tr key={r.id}>
                  <td style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>{r.data}</td>
                  <td style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>{r.categoria}</td>
                  <td style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-100)', textTransform: 'capitalize' }}>{r.formaPagamento}</td>
                  <td style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-100)', textAlign: 'right', fontWeight: 600, color: 'var(--secondary)' }}>
                    R$ {Number(r.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ padding: '10px 0 0', fontWeight: 700, fontSize: 13 }}>Total</td>
                <td style={{ padding: '10px 0 0', textAlign: 'right', fontWeight: 700, color: 'var(--secondary)', fontSize: 14 }}>
                  R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </div>
  );
}

function TabelaDespesas({ despesas }) {
  const total = despesas.reduce((s, d) => s + Number(d.valor || 0), 0);
  return (
    <div>
      {despesas.length === 0 ? (
        <div className="empty-state"><Wrench size={32} /><p>Nenhuma despesa registrada para este veículo</p></div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', borderBottom: '1px solid var(--gray-200)' }}>Data</th>
              <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', borderBottom: '1px solid var(--gray-200)' }}>Categoria</th>
              <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', borderBottom: '1px solid var(--gray-200)' }}>Descrição</th>
              <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', borderBottom: '1px solid var(--gray-200)' }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {despesas.map(d => (
              <tr key={d.id}>
                <td style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>{d.data}</td>
                <td style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>{d.categoria}</td>
                <td style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>{d.descricao || '-'}</td>
                <td style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-100)', textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>
                  R$ {Number(d.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} style={{ padding: '10px 0 0', fontWeight: 700, fontSize: 13 }}>Total</td>
              <td style={{ padding: '10px 0 0', textAlign: 'right', fontWeight: 700, color: 'var(--danger)', fontSize: 14 }}>
                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}


