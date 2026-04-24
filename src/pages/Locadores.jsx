import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { applyMask } from '../utils/masks';

const EMPTY = {
  tipo: 'fisica',
  // Pessoa física
  nome: '', cpf: '', rg: '', dataNascimento: '',
  // Pessoa jurídica
  razaoSocial: '', cnpj: '', inscEstadual: '',
  // Comum
  email: '', telefone: '', celular: '',
  cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  banco: '', agencia: '', conta: '', tipoConta: 'corrente', pixChave: '',
  observacoes: '',
};

export default function Locadores() {
  const { locadores, addLocador, updateLocador, removeLocador } = useApp();
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);

  const [erroCrud, setErroCrud] = useState('');

  function abrirNovo() { setForm(EMPTY); setEditId(null); setModal(true); setErroCrud(''); }
  function abrirEditar(loc) { setForm({ ...EMPTY, ...loc }); setEditId(loc.id); setModal(true); setErroCrud(''); }
  function fecharModal() { setModal(false); setEditId(null); setErroCrud(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    setErroCrud('');
    try {
      if (editId) await updateLocador(editId, form);
      else await addLocador(form);
      fecharModal();
    } catch (err) {
      setErroCrud(err.message || 'Erro ao salvar. Tente novamente.');
    }
  }

  function f(field) {
    return { value: form[field] || '', onChange: e => setForm({ ...form, [field]: applyMask(field, e.target.value) }) };
  }

  const nomeExibido = l => l.tipo === 'juridica' ? l.razaoSocial : l.nome;
  const docExibido = l => l.tipo === 'juridica' ? `CNPJ: ${l.cnpj}` : `CPF: ${l.cpf}`;

  return (
    <div className="page-content">
      <div className="flex-between mb-24">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>Locadores</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>Proprietários de veículos cadastrados</p>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}><Plus size={16} /> Novo Locador</button>
      </div>

      <div className="card">
        {locadores.length === 0 ? (
          <div className="empty-state"><Plus size={32} /><p>Nenhum locador cadastrado. Clique em "Novo Locador" para começar.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome / Razão Social</th>
                  <th>Tipo</th>
                  <th>CPF / CNPJ</th>
                  <th>Telefone</th>
                  <th>E-mail</th>
                  <th>Cidade/UF</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {locadores.map(l => (
                  <tr key={l.id}>
                    <td className="fw-600">{nomeExibido(l)}</td>
                    <td><span className={`badge ${l.tipo === 'juridica' ? 'badge-purple' : 'badge-blue'}`}>{l.tipo === 'juridica' ? 'Jurídica' : 'Física'}</span></td>
                    <td>{docExibido(l)}</td>
                    <td>{l.celular || l.telefone}</td>
                    <td>{l.email}</td>
                    <td>{l.cidade}{l.estado ? `/${l.estado}` : ''}</td>
                    <td>
                      <div className="flex" style={{ gap: 6 }}>
                        <button className="btn-icon" onClick={() => abrirEditar(l)}><Edit2 size={14} /></button>
                        <button className="btn-icon" style={{ borderColor: 'var(--danger-light)', color: 'var(--danger)' }} onClick={() => setConfirmarExclusao(l.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Confirmar Exclusão */}
      {confirmarExclusao && (
        <div className="modal-overlay" onClick={() => setConfirmarExclusao(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">Confirmar exclusão</span></div>
            <div className="modal-body">
              <p style={{ marginBottom: 20 }}>Tem certeza que deseja excluir este locador?</p>
              <div className="flex" style={{ gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setConfirmarExclusao(null)}>Cancelar</button>
                <button className="btn btn-danger" onClick={() => { removeLocador(confirmarExclusao); setConfirmarExclusao(null); }}>
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Formulário */}
      {modal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editId ? 'Editar Locador' : 'Novo Locador'}</span>
              <button className="btn-icon" onClick={fecharModal}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                {/* Tipo */}
                <div className="form-section">
                  <div className="form-section-title">Tipo de Pessoa</div>
                  <div className="form-group">
                    <label>Tipo</label>
                    <div className="toggle-group" style={{ maxWidth: 260 }}>
                      <button type="button" className={form.tipo === 'fisica' ? 'active' : ''} onClick={() => setForm({ ...form, tipo: 'fisica' })}>Pessoa Física</button>
                      <button type="button" className={form.tipo === 'juridica' ? 'active' : ''} onClick={() => setForm({ ...form, tipo: 'juridica' })}>Pessoa Jurídica</button>
                    </div>
                  </div>
                </div>

                {/* Dados Pessoais / Empresariais */}
                <div className="form-section">
                  <div className="form-section-title">{form.tipo === 'fisica' ? 'Dados Pessoais' : 'Dados Empresariais'}</div>
                  {form.tipo === 'fisica' ? (
                    <div className="form-grid">
                      <div className="form-group form-full"><label>Nome Completo *</label><input required {...f('nome')} /></div>
                      <div className="form-group"><label>CPF *</label><input required placeholder="000.000.000-00" {...f('cpf')} /></div>
                      <div className="form-group"><label>RG</label><input {...f('rg')} /></div>
                      <div className="form-group"><label>Data de Nascimento</label><input type="date" {...f('dataNascimento')} /></div>
                    </div>
                  ) : (
                    <div className="form-grid">
                      <div className="form-group form-full"><label>Razão Social *</label><input required {...f('razaoSocial')} /></div>
                      <div className="form-group"><label>CNPJ *</label><input required placeholder="00.000.000/0000-00" {...f('cnpj')} /></div>
                      <div className="form-group"><label>Inscrição Estadual</label><input {...f('inscEstadual')} /></div>
                    </div>
                  )}
                </div>

                {/* Contato */}
                <div className="form-section">
                  <div className="form-section-title">Contato</div>
                  <div className="form-grid">
                    <div className="form-group"><label>E-mail *</label><input required type="email" {...f('email')} /></div>
                    <div className="form-group"><label>Telefone</label><input {...f('telefone')} /></div>
                    <div className="form-group"><label>Celular</label><input {...f('celular')} /></div>
                  </div>
                </div>

                {/* Endereço */}
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
                        {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dados Bancários */}
                <div className="form-section">
                  <div className="form-section-title">Dados Bancários</div>
                  <div className="form-grid">
                    <div className="form-group"><label>Banco</label><input {...f('banco')} /></div>
                    <div className="form-group"><label>Agência</label><input {...f('agencia')} /></div>
                    <div className="form-group"><label>Conta</label><input {...f('conta')} /></div>
                    <div className="form-group"><label>Tipo de Conta</label>
                      <select {...f('tipoConta')}>
                        <option value="corrente">Corrente</option>
                        <option value="poupanca">Poupança</option>
                      </select>
                    </div>
                    <div className="form-group"><label>Chave PIX</label><input {...f('pixChave')} /></div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-title">Observações</div>
                  <div className="form-group"><label>Observações</label><textarea {...f('observacoes')} /></div>
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
