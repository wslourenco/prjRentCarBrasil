import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Edit2, Trash2, X, Car, Check } from 'lucide-react';

const COMBUSTIVEIS = ['Flex','Gasolina','Etanol','Diesel','GNV','Elétrico','Híbrido'];
const TRANSMISSOES = ['Manual','Automático','Semi-automático','CVT'];
const MONTADORAS = [
  'Fiat', 'Chevrolet', 'Volkswagen', 'Toyota', 'Honda', 'Hyundai', 'Renault', 'Nissan',
  'Jeep', 'Ford', 'Peugeot', 'Citroën', 'Mitsubishi', 'Kia', 'BMW', 'Mercedes-Benz',
  'Audi', 'Volvo', 'BYD', 'Chery', 'Ram', 'Land Rover', 'Porsche', 'Subaru', 'Suzuki'
];
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const EMPTY_VEICULO = {
  placa: '', renavam: '', chassi: '', marca: '', modelo: '', anoFabricacao: '', anoModelo: '', cor: '',
  combustivel: 'Flex', transmissao: 'Manual', nrPortas: '4', capacidade: '5',
  kmAtual: '', kmCompra: '',
  kmTrocaOleo: '', kmTrocaCorreia: '', kmTrocaPneu: '',
  dataCompra: '', valorCompra: '', valorFipe: '',
  seguradora: '', nrApolice: '', vencimentoSeguro: '',
  dataLicenciamento: '', dataVistoria: '',
  bloqueador: '', nrBloqueador: '',
  locadorId: '',
  observacoes: '',
  foto: '',
};

export default function Veiculos() {
  const { veiculos, addVeiculo, updateVeiculo, removeVeiculo, locadores, locacoes, usuarioLogado, addLocacao } = useApp();
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_VEICULO);
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  const [view, setView] = useState('cards'); // 'cards' | 'table'
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [veiculoSelecionadoLocacao, setVeiculoSelecionadoLocacao] = useState('');
  const [locandoVeiculo, setLocandoVeiculo] = useState(false);
  const [erroLocacaoRapida, setErroLocacaoRapida] = useState('');
  const [sucessoLocacaoRapida, setSucessoLocacaoRapida] = useState('');

  const podeGerenciar = usuarioLogado?.perfil === 'admin' || usuarioLogado?.perfil === 'locador';
  const listaVeiculos = veiculos;

  const categoriasVeiculo = useMemo(() => {
    const categorias = listaVeiculos
      .map(v => String(v.marca || '').trim() || 'Sem categoria')
      .filter(Boolean);

    return Array.from(new Set(categorias)).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }, [listaVeiculos]);

  const montadorasFormulario = useMemo(() => {
    const existentes = veiculos
      .map(v => String(v.marca || '').trim())
      .filter(Boolean);

    const atual = String(form.marca || '').trim();
    const todas = [...MONTADORAS, ...existentes, ...(atual ? [atual] : [])];
    return Array.from(new Set(todas)).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }, [veiculos, form.marca]);

  const listaVeiculosFiltrada = useMemo(() => {
    if (!filtroCategoria) return listaVeiculos;
    return listaVeiculos.filter(v => (String(v.marca || '').trim() || 'Sem categoria') === filtroCategoria);
  }, [listaVeiculos, filtroCategoria]);

  const [erroCrud, setErroCrud] = useState('');

  function abrirNovo() { setForm(EMPTY_VEICULO); setEditId(null); setModal(true); setErroCrud(''); }
  function abrirEditar(v) { setForm({ ...EMPTY_VEICULO, ...v }); setEditId(v.id); setModal(true); setErroCrud(''); }
  function fecharModal() { setModal(false); setEditId(null); setErroCrud(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    setErroCrud('');
    try {
      if (editId) await updateVeiculo(editId, form);
      else await addVeiculo(form);
      fecharModal();
    } catch (err) {
      setErroCrud(err.message || 'Erro ao salvar. Tente novamente.');
    }
  }

  function f(field) {
    return { value: form[field] || '', onChange: e => setForm({ ...form, [field]: e.target.value }) };
  }

  function nomeLocador(id) {
    const l = locadores.find(l => String(l.id) === String(id));
    return l ? (l.tipo === 'juridica' ? l.razaoSocial : l.nome) : '-';
  }

  async function handleLocacaoRapida() {
    if (!veiculoSelecionadoLocacao) {
      setErroLocacaoRapida('Selecione um veículo para locar.');
      return;
    }

    setErroLocacaoRapida('');
    setSucessoLocacaoRapida('');
    setLocandoVeiculo(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      await addLocacao({
        veiculoId: veiculoSelecionadoLocacao,
        dataInicio: hoje,
        periodicidade: 'semanal',
        quantidadePeriodos: 1,
        condicoes: 'Locação iniciada pela tela Veículos',
      });
      setVeiculoSelecionadoLocacao('');
      setSucessoLocacaoRapida('Veículo locado com sucesso.');
    } catch (err) {
      setErroLocacaoRapida(err.message || 'Não foi possível locar o veículo selecionado.');
    } finally {
      setLocandoVeiculo(false);
    }
  }

  return (
    <div className="page-content">
      <div className="flex-between mb-24">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>Veículos</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>
            {listaVeiculosFiltrada.length} veículo(s) {usuarioLogado?.perfil === 'locatario' ? 'disponível(is) para locação' : 'cadastrado(s)'}
          </p>
          {usuarioLogado?.perfil === 'locatario' && erroLocacaoRapida && (
            <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{erroLocacaoRapida}</p>
          )}
          {usuarioLogado?.perfil === 'locatario' && sucessoLocacaoRapida && (
            <p style={{ color: 'var(--success)', fontSize: 12, marginTop: 6 }}>{sucessoLocacaoRapida}</p>
          )}
        </div>
        <div className="flex" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select aria-label="Categoria do Veículo" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={{ padding: '7px 12px', border: '1.5px solid var(--gray-300)', borderRadius: 'var(--radius)', fontSize: 13, width: '100%', maxWidth: 320 }}>
            <option value="">Todas as montadoras</option>
            {categoriasVeiculo.map(categoria => <option key={categoria} value={categoria}>{categoria}</option>)}
          </select>
          <div className="toggle-group">
            <button type="button" className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')}>Cards</button>
            <button type="button" className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>Tabela</button>
          </div>
          {usuarioLogado?.perfil === 'locatario' && (
            <button
              className="btn btn-primary"
              disabled={!veiculoSelecionadoLocacao || locandoVeiculo}
              onClick={handleLocacaoRapida}
            >
              <Check size={16} /> {locandoVeiculo ? 'Locando...' : 'Locar Veículo'}
            </button>
          )}
          {podeGerenciar && (
            <button className="btn btn-primary" onClick={abrirNovo}><Plus size={16} /> Novo Veículo</button>
          )}
        </div>
      </div>

      {listaVeiculosFiltrada.length === 0 ? (
        <div className="card"><div className="empty-state"><Car size={40} /><p>Nenhum veículo cadastrado.</p></div></div>
      ) : view === 'cards' ? (
        <div className="veiculo-cards">
          {listaVeiculosFiltrada.map(v => (
            <div key={v.id} className="veiculo-card">
              <div className="veiculo-card-img">
                {v.foto ? <img src={v.foto} alt={`${v.marca} ${v.modelo}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Car size={48} />}
              </div>
              <div className="veiculo-card-body">
                <div className="veiculo-card-title">{v.marca} {v.modelo}</div>
                <div className="veiculo-card-sub">{v.placa} • {v.anoFabricacao}/{v.anoModelo}</div>
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="badge badge-blue">{v.combustivel}</span>
                  <span className="badge badge-gray">{v.transmissao}</span>
                  <span className="badge badge-green">{v.cor}</span>
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--gray-500)' }}>
                  <div>KM Atual: <strong>{Number(v.kmAtual || 0).toLocaleString()}</strong></div>
                  <div>Próx. troca óleo: {v.kmTrocaOleo ? Number(v.kmTrocaOleo).toLocaleString() : '-'}</div>
                  <div>Locador: {nomeLocador(v.locadorId)}</div>
                </div>
              </div>
              <div className="veiculo-card-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {usuarioLogado?.perfil === 'locatario' && (
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--gray-600)' }}>
                      <input
                        type="checkbox"
                        checked={String(veiculoSelecionadoLocacao) === String(v.id)}
                        onChange={e => setVeiculoSelecionadoLocacao(e.target.checked ? String(v.id) : '')}
                      />
                      Selecionar
                    </label>
                  )}
                </div>
                {podeGerenciar && (
                  <div className="flex" style={{ gap: 6 }}>
                    <button className="btn-icon" onClick={() => abrirEditar(v)}><Edit2 size={14} /></button>
                    <button className="btn-icon" style={{ borderColor: 'var(--danger-light)', color: 'var(--danger)' }} onClick={() => setConfirmarExclusao(v.id)}><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {usuarioLogado?.perfil === 'locatario' && <th>Selecionar</th>}
                  <th>Placa</th>
                  <th>Marca/Modelo</th>
                  <th>Ano</th>
                  <th>KM Atual</th>
                  <th>Prx. Óleo</th>
                  <th>Combustível</th>
                  <th>Cor</th>
                  <th>Locador</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {listaVeiculosFiltrada.map(v => (
                  <tr key={v.id}>
                    {usuarioLogado?.perfil === 'locatario' && (
                      <td>
                        <input
                          type="checkbox"
                          checked={String(veiculoSelecionadoLocacao) === String(v.id)}
                          onChange={e => setVeiculoSelecionadoLocacao(e.target.checked ? String(v.id) : '')}
                        />
                      </td>
                    )}
                    <td className="fw-600">{v.placa}</td>
                    <td>{v.marca} {v.modelo}</td>
                    <td>{v.anoFabricacao}/{v.anoModelo}</td>
                    <td>{Number(v.kmAtual || 0).toLocaleString()}</td>
                    <td>{v.kmTrocaOleo ? Number(v.kmTrocaOleo).toLocaleString() : '-'}</td>
                    <td>{v.combustivel}</td>
                    <td>{v.cor}</td>
                    <td>{nomeLocador(v.locadorId)}</td>
                    <td>
                      {podeGerenciar && (
                        <div className="flex" style={{ gap: 6 }}>
                          <button className="btn-icon" onClick={() => abrirEditar(v)}><Edit2 size={14} /></button>
                          <button className="btn-icon" style={{ borderColor: 'var(--danger-light)', color: 'var(--danger)' }} onClick={() => setConfirmarExclusao(v.id)}><Trash2 size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {podeGerenciar && confirmarExclusao && (
        <div className="modal-overlay" onClick={() => setConfirmarExclusao(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">Confirmar exclusão</span></div>
            <div className="modal-body">
              <p style={{ marginBottom: 20 }}>Tem certeza que deseja excluir este veículo?</p>
              <div className="flex" style={{ gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setConfirmarExclusao(null)}>Cancelar</button>
                <button className="btn btn-danger" onClick={() => { removeVeiculo(confirmarExclusao); setConfirmarExclusao(null); }}>
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {podeGerenciar && modal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editId ? 'Editar Veículo' : 'Novo Veículo'}</span>
              <button className="btn-icon" onClick={fecharModal}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-section">
                  <div className="form-section-title">Identificação</div>
                  <div className="form-grid">
                    <div className="form-group"><label>Placa *</label><input required {...f('placa')} /></div>
                    <div className="form-group"><label>RENAVAM</label><input {...f('renavam')} /></div>
                    <div className="form-group"><label>Chassi</label><input {...f('chassi')} /></div>
                    <div className="form-group"><label>Montadora *</label>
                      <select required {...f('marca')}>
                        <option value="">Selecione a montadora</option>
                        {montadorasFormulario.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label>Modelo *</label><input required {...f('modelo')} /></div>
                    <div className="form-group"><label>Ano Fabricação</label><input type="number" min="1990" max="2030" {...f('anoFabricacao')} /></div>
                    <div className="form-group"><label>Ano Modelo</label><input type="number" min="1990" max="2030" {...f('anoModelo')} /></div>
                    <div className="form-group"><label>Cor</label><input {...f('cor')} /></div>
                    <div className="form-group"><label>Combustível</label>
                      <select {...f('combustivel')}>{COMBUSTIVEIS.map(c => <option key={c} value={c}>{c}</option>)}</select>
                    </div>
                    <div className="form-group"><label>Transmissão</label>
                      <select {...f('transmissao')}>{TRANSMISSOES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                    </div>
                    <div className="form-group"><label>Portas</label>
                      <select {...f('nrPortas')}><option value="2">2</option><option value="4">4</option></select>
                    </div>
                    <div className="form-group"><label>Capacidade (pessoas)</label>
                      <select {...f('capacidade')}>{['2','4','5','7','9','15'].map(n => <option key={n} value={n}>{n}</option>)}</select>
                    </div>
                    <div className="form-group"><label>Locador (proprietário)</label>
                      <select {...f('locadorId')}>
                        <option value="">Selecione</option>
                        {locadores.map(l => <option key={l.id} value={l.id}>{l.tipo === 'juridica' ? l.razaoSocial : l.nome}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label>URL da foto</label><input type="url" {...f('foto')} /></div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-title">Quilometragem e Manutenção</div>
                  <div className="form-grid">
                    <div className="form-group"><label>KM Atual *</label><input required type="number" {...f('kmAtual')} /></div>
                    <div className="form-group"><label>KM na Compra</label><input type="number" {...f('kmCompra')} /></div>
                    <div className="form-group"><label>KM Próx. Troca de Óleo</label><input type="number" {...f('kmTrocaOleo')} /></div>
                    <div className="form-group"><label>KM Próx. Correia Dentada</label><input type="number" {...f('kmTrocaCorreia')} /></div>
                    <div className="form-group"><label>KM Próx. Pneus</label><input type="number" {...f('kmTrocaPneu')} /></div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-title">Dados de Compra e Valor</div>
                  <div className="form-grid">
                    <div className="form-group"><label>Data de Compra</label><input type="date" {...f('dataCompra')} /></div>
                    <div className="form-group"><label>Valor Pago (R$)</label><input type="number" step="0.01" {...f('valorCompra')} /></div>
                    <div className="form-group"><label>Valor Tabela FIPE (R$)</label><input type="number" step="0.01" {...f('valorFipe')} /></div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-title">Seguro e Documentação</div>
                  <div className="form-grid">
                    <div className="form-group"><label>Seguradora</label><input {...f('seguradora')} /></div>
                    <div className="form-group"><label>Nº Apólice</label><input {...f('nrApolice')} /></div>
                    <div className="form-group"><label>Vencimento Seguro</label><input type="date" {...f('vencimentoSeguro')} /></div>
                    <div className="form-group"><label>Data Licenciamento</label><input type="date" {...f('dataLicenciamento')} /></div>
                    <div className="form-group"><label>Data Vistoria</label><input type="date" {...f('dataVistoria')} /></div>
                    <div className="form-group"><label>Empresa Bloqueador</label><input {...f('bloqueador')} /></div>
                    <div className="form-group"><label>Nº Bloqueador/Rastreador</label><input {...f('nrBloqueador')} /></div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-title">Observações</div>
                  <div className="form-group"><label>Observações</label><textarea {...f('observacoes')} /></div>
                </div>

                {erroCrud && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{erroCrud}</p>}
                <div className="form-actions">
                  {podeGerenciar && editId && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => {
                        setConfirmarExclusao(editId);
                        fecharModal();
                      }}
                    >
                      <Trash2 size={14} /> Excluir veículo
                    </button>
                  )}
                  <button type="button" className="btn btn-outline" onClick={fecharModal}><X size={14} /> Cancelar</button>
                  <button type="submit" className="btn btn-primary"><Check size={14} /> {editId ? 'Salvar' : 'Cadastrar'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
