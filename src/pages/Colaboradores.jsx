import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { applyMask } from '../utils/masks';

const CATEGORIAS = ['Seguradora', 'Bloqueador/Rastreador', 'Oficina Mecânica', 'Elétrica Automotiva', 'Borracharia', 'Funilaria/Pintura', 'Despachante', 'Financeira', 'Auxiliar Administrativo', 'Outro'];
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const EMPTY_AUXILIAR = { nome: '', cargo: '', usuario: '', email: '', telefone: '', senha: '' };

const EMPTY = {
  tipo: 'juridica',
  nome: '', cpf: '',
  razaoSocial: '', cnpj: '', inscEstadual: '',
  categoria: 'Seguradora',
  email: '', telefone: '', celular: '', whatsapp: '', site: '',
  cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  contatoNome: '', contatoCargo: '', contatoTelefone: '',
  banco: '', agencia: '', conta: '', pixChave: '',
  contrato: '', valorContrato: '', vencimentoContrato: '',
  observacoes: '',
  usuario: '', senha: '',
  auxiliares: [],
};

export default function Colaboradores() {
  const { colaboradores, addColaborador, updateColaborador, removeColaborador } = useApp();
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const [erroCrud, setErroCrud] = useState('');
  const isAuxiliarCategoria = form.categoria === 'Auxiliar Administrativo';

  function normalizarAuxiliar(data) {
    if (data.categoria !== 'Auxiliar Administrativo') return data;
    return {
      ...data,
      tipo: 'fisica',
      razaoSocial: '',
      cnpj: '',
      inscEstadual: '',
    };
  }

  function abrirNovo() {
    setForm(normalizarAuxiliar({ ...EMPTY, categoria: filtroCategoria || EMPTY.categoria }));
    setEditId(null);
    setModal(true);
    setErroCrud('');
  }
  function abrirEditar(col) { setForm(normalizarAuxiliar({ ...EMPTY, ...col })); setEditId(col.id); setModal(true); setErroCrud(''); }
  function fecharModal() { setModal(false); setEditId(null); setErroCrud(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    setErroCrud('');
    try {
      const payload = normalizarAuxiliar(form);
      if (editId) await updateColaborador(editId, payload);
      else await addColaborador(payload);
      fecharModal();
    } catch (err) {
      setErroCrud(err.message || 'Erro ao salvar. Tente novamente.');
    }
  }

  function f(field) {
    return { value: form[field] || '', onChange: e => setForm({ ...form, [field]: applyMask(field, e.target.value) }) };
  }

  function updateAuxiliar(index, field, value) {
    const lista = [...(form.auxiliares || [])];
    lista[index] = { ...lista[index], [field]: value };
    setForm({ ...form, auxiliares: lista });
  }

  const listaFiltrada = filtroCategoria ? colaboradores.filter(c => c.categoria === filtroCategoria) : colaboradores;
  const nomeExibido = c => c.tipo === 'fisica' ? c.nome : c.razaoSocial;

  return (
    <div className="page-content">
      <div className="flex-between mb-24">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>Colaboradores</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>Seguradoras, bloqueadores, oficinas e demais parceiros</p>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}><Plus size={16} /> Novo Colaborador</button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={{ padding: '7px 12px', border: '1.5px solid var(--gray-300)', borderRadius: 'var(--radius)', fontSize: 13 }}>
            <option value="">Todas categorias</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span style={{ color: 'var(--gray-500)', fontSize: 13 }}>{listaFiltrada.length} registro(s)</span>
        </div>

        {listaFiltrada.length === 0 ? (
          <div className="empty-state"><Plus size={32} /><p>Nenhum colaborador cadastrado.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome / Razão Social</th>
                  <th>Categoria</th>
                  <th>Tipo</th>
                  <th>CNPJ / CPF</th>
                  <th>Telefone</th>
                  <th>E-mail</th>
                  <th>Cidade/UF</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.map(c => (
                  <tr key={c.id}>
                    <td className="fw-600">{nomeExibido(c)}</td>
                    <td><span className="badge badge-purple">{c.categoria}</span></td>
                    <td><span className={`badge ${c.tipo === 'fisica' ? 'badge-blue' : 'badge-green'}`}>{c.tipo === 'fisica' ? 'Física' : 'Jurídica'}</span></td>
                    <td>{c.tipo === 'fisica' ? c.cpf : c.cnpj}</td>
                    <td>{c.categoria === 'Auxiliar Administrativo' ? `${(c.auxiliares || []).length} auxiliar(es)` : (c.celular || c.telefone)}</td>
                    <td>{c.email}</td>
                    <td>{c.cidade}{c.estado ? `/${c.estado}` : ''}</td>
                    <td>
                      <div className="flex" style={{ gap: 6 }}>
                        <button className="btn-icon" onClick={() => abrirEditar(c)}><Edit2 size={14} /></button>
                        <button className="btn-icon" style={{ borderColor: 'var(--danger-light)', color: 'var(--danger)' }} onClick={() => setConfirmarExclusao(c.id)}><Trash2 size={14} /></button>
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
              <p style={{ marginBottom: 20 }}>Tem certeza que deseja excluir este colaborador?</p>
              <div className="flex" style={{ gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setConfirmarExclusao(null)}>Cancelar</button>
                <button className="btn btn-danger" onClick={() => { removeColaborador(confirmarExclusao); setConfirmarExclusao(null); }}>
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editId ? 'Editar Colaborador' : 'Novo Colaborador'}</span>
              <button className="btn-icon" onClick={fecharModal}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-section">
                  <div className="form-section-title">Tipo e Categoria</div>
                  <div className="form-grid">
                    {!isAuxiliarCategoria && (
                      <div className="form-group">
                        <label>Tipo de Pessoa</label>
                        <div className="toggle-group">
                          <button type="button" className={form.tipo === 'fisica' ? 'active' : ''} onClick={() => setForm({ ...form, tipo: 'fisica' })}>Pessoa Física</button>
                          <button type="button" className={form.tipo === 'juridica' ? 'active' : ''} onClick={() => setForm({ ...form, tipo: 'juridica' })}>Pessoa Jurídica</button>
                        </div>
                      </div>
                    )}
                    <div className="form-group"><label>Categoria *</label>
                      <select
                        required
                        value={form.categoria}
                        onChange={e => {
                          const categoria = e.target.value;
                          setForm({
                            ...form,
                            categoria,
                            tipo: categoria === 'Auxiliar Administrativo' ? 'fisica' : form.tipo,
                            razaoSocial: categoria === 'Auxiliar Administrativo' ? '' : form.razaoSocial,
                            cnpj: categoria === 'Auxiliar Administrativo' ? '' : form.cnpj,
                            inscEstadual: categoria === 'Auxiliar Administrativo' ? '' : form.inscEstadual,
                          });
                        }}
                      >
                        {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-title">{(form.tipo === 'fisica' || isAuxiliarCategoria) ? 'Dados Pessoais' : 'Dados Empresariais'}</div>
                  {(form.tipo === 'fisica' || isAuxiliarCategoria) ? (
                    <div className="form-grid">
                      <div className="form-group form-full"><label>Nome *</label><input required {...f('nome')} /></div>
                      <div className="form-group"><label>CPF</label><input {...f('cpf')} /></div>
                      {isAuxiliarCategoria && (form.auxiliares || []).length === 0 && (
                        <>
                          <div className="form-group">
                            <label>E-mail / Usuário (login) *</label>
                            <input
                              required
                              type="email"
                              placeholder="ex: auxiliar@sislove.com"
                              autoComplete="username"
                              {...f('usuario')}
                            />
                          </div>
                          <div className="form-group">
                            <label>Senha de acesso {!editId ? '*' : '(deixe em branco para manter)'}</label>
                            <input
                              type="password"
                              required={!editId}
                              autoComplete="new-password"
                              placeholder={editId ? 'Deixe em branco para manter a atual' : ''}
                              {...f('senha')}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="form-grid">
                      <div className="form-group form-full"><label>Razão Social *</label><input required {...f('razaoSocial')} /></div>
                      <div className="form-group"><label>CNPJ</label><input placeholder="00.000.000/0000-00" {...f('cnpj')} /></div>
                      <div className="form-group"><label>Inscrição Estadual</label><input {...f('inscEstadual')} /></div>
                    </div>
                  )}
                </div>

                {form.categoria !== 'Auxiliar Administrativo' && (
                  <div className="form-section">
                    <div className="form-section-title">Contato Principal</div>
                    <div className="form-grid">
                      <div className="form-group form-full"><label>Nome do Contato</label><input {...f('contatoNome')} /></div>
                      <div className="form-group"><label>Telefone do Contato</label><input {...f('contatoTelefone')} /></div>
                      <div className="form-group"><label>E-mail *</label><input required type="email" {...f('email')} /></div>
                      <div className="form-group"><label>Telefone</label><input {...f('telefone')} /></div>
                      <div className="form-group"><label>Celular / WhatsApp</label><input {...f('whatsapp')} /></div>
                      <div className="form-group"><label>Site</label><input type="url" {...f('site')} /></div>
                    </div>
                  </div>
                )}

                {form.categoria === 'Auxiliar Administrativo' && (
                  <div className="form-section">
                    {(form.auxiliares || []).length === 0 && null}
                    {(form.auxiliares || []).map((aux, index) => (
                      <div key={index} style={{ border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 12, position: 'relative' }}>
                        <div className="form-grid">
                          <div className="form-group form-full">
                            <label>Nome *</label>
                            <input required value={aux.nome} onChange={e => updateAuxiliar(index, 'nome', e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label>Usuário (login) *</label>
                            <input
                              type="email"
                              required
                              value={aux.usuario || aux.email || ''}
                              onChange={e => {
                                const valor = e.target.value;
                                updateAuxiliar(index, 'usuario', valor);
                                updateAuxiliar(index, 'email', valor);
                              }}
                              placeholder="ex: auxiliar@sislove.com"
                              autoComplete="username"
                            />
                          </div>
                          <div className="form-group">
                            <label>Telefone / Celular</label>
                            <input value={aux.telefone} onChange={e => updateAuxiliar(index, 'telefone', e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label>Senha de acesso {!editId ? '*' : '(deixe em branco para manter)'}</label>
                            <input
                              type="password"
                              value={aux.senha}
                              onChange={e => updateAuxiliar(index, 'senha', e.target.value)}
                              required={!editId}
                              autoComplete="new-password"
                              placeholder={editId ? 'Deixe em branco para manter a atual' : ''}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="form-section">
                  <div className="form-section-title">Endereço</div>
                  <div className="form-grid">
                    <div className="form-group"><label>CEP</label><input {...f('cep')} /></div>
                    <div className="form-group form-full"><label>Logradouro</label><input {...f('endereco')} /></div>
                    <div className="form-group"><label>Número</label><input {...f('numero')} /></div>
                    <div className="form-group"><label>Complemento</label><input {...f('complemento')} /></div>
                    <div className="form-group"><label>Bairro</label><input {...f('bairro')} /></div>
                    <div className="form-group"><label>Cidade</label><input {...f('cidade')} /></div>
                    <div className="form-group"><label>Estado</label>
                      <select {...f('estado')}>
                        <option value="">Selecione</option>
                        {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {!isAuxiliarCategoria && (
                  <div className="form-section">
                    <div className="form-section-title">Contrato / Dados Financeiros</div>
                    <div className="form-grid">
                      <div className="form-group"><label>Nº Contrato / Apólice</label><input {...f('contrato')} /></div>
                      <div className="form-group"><label>Valor (R$)</label><input type="number" step="0.01" {...f('valorContrato')} /></div>
                      <div className="form-group"><label>Vencimento</label><input type="date" {...f('vencimentoContrato')} /></div>
                      <div className="form-group"><label>Banco</label><input {...f('banco')} /></div>
                      <div className="form-group"><label>Agência</label><input {...f('agencia')} /></div>
                      <div className="form-group"><label>Conta</label><input {...f('conta')} /></div>
                      <div className="form-group"><label>Chave PIX</label><input {...f('pixChave')} /></div>
                    </div>
                  </div>
                )}

                <div className="form-section">
                  <div className="form-section-title">Observações</div>
                  <div className="form-group"><textarea {...f('observacoes')} /></div>
                </div>

                {erroCrud && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{erroCrud}</p>}
                <div className="form-actions">
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
