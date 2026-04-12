import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Edit2, Trash2, X, Check, Shield } from 'lucide-react';

const PERFIS = [
  { value: 'admin', label: 'Administrador', desc: 'Acesso total ao sistema' },
  { value: 'locador', label: 'Locador', desc: 'Gerencia seus veículos e locações' },
  { value: 'locatario', label: 'Locatário', desc: 'Visualiza apenas suas locações' },
];

const EMPTY = { nome: '', email: '', senha: '', perfil: 'locador' };

export default function Admin() {
  const { usuarios, addUsuario, updateUsuario, removeUsuario, usuarioLogado, carregarUsuarios } = useApp();
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  const [erroCrud, setErroCrud] = useState('');

  useEffect(() => { carregarUsuarios(); }, []);

  function abrirNovo() { setForm(EMPTY); setEditId(null); setModal(true); setErroCrud(''); }
  function abrirEditar(u) { setForm({ ...EMPTY, ...u, senha: '' }); setEditId(u.id); setModal(true); setErroCrud(''); }
  function fecharModal() { setModal(false); setEditId(null); setErroCrud(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    setErroCrud('');
    const dados = { ...form };
    if (editId && !dados.senha) delete dados.senha;
    try {
      if (editId) await updateUsuario(editId, dados);
      else await addUsuario(dados);
      fecharModal();
    } catch (err) {
      setErroCrud(err.message || 'Erro ao salvar. Tente novamente.');
    }
  }

  function f(field) {
    return { value: form[field] || '', onChange: e => setForm({ ...form, [field]: e.target.value }) };
  }

  const badgePerfil = { admin: 'badge-red', locador: 'badge-blue', locatario: 'badge-green' };

  return (
    <div className="page-content">
      <div className="flex-between mb-24">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>Administração de Usuários</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>Gerencie os níveis de acesso do sistema</p>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}><Plus size={16} /> Novo Usuário</button>
      </div>

      {/* Cards de nível de acesso */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
        {PERFIS.map(p => {
          const qtd = usuarios.filter(u => u.perfil === p.value).length;
          return (
            <div key={p.value} style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Shield size={18} color="var(--primary)" />
                <strong style={{ fontSize: 14 }}>{p.label}</strong>
              </div>
              <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>{p.desc}</p>
              <span className={`badge ${badgePerfil[p.value]}`}>{qtd} usuário(s)</span>
            </div>
          );
        })}
      </div>

      <div className="card">
        {usuarios.length === 0 ? (
          <div className="empty-state"><Shield size={32} /><p>Nenhum usuário cadastrado.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil de Acesso</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td className="fw-600">
                      {u.id === usuarioLogado?.id && <span className="badge badge-green" style={{ marginRight: 8 }}>Você</span>}
                      {u.nome}
                    </td>
                    <td>{u.email}</td>
                    <td><span className={`badge ${badgePerfil[u.perfil] || 'badge-gray'}`}>{PERFIS.find(p => p.value === u.perfil)?.label || u.perfil}</span></td>
                    <td><span className="badge badge-green">Ativo</span></td>
                    <td>
                      <div className="flex" style={{ gap: 6 }}>
                        <button className="btn-icon" onClick={() => abrirEditar(u)}><Edit2 size={14} /></button>
                        <button
                          className="btn-icon"
                          style={{ borderColor: 'var(--danger-light)', color: 'var(--danger)' }}
                          onClick={() => setConfirmarExclusao(u.id)}
                          disabled={u.id === usuarioLogado?.id}
                          title={u.id === usuarioLogado?.id ? 'Não é possível excluir o próprio usuário' : ''}
                        >
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

      {confirmarExclusao && (
        <div className="modal-overlay" onClick={() => setConfirmarExclusao(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">Confirmar exclusão</span></div>
            <div className="modal-body">
              <p style={{ marginBottom: 20 }}>Tem certeza que deseja excluir este usuário? Esta ação não poderá ser desfeita.</p>
              <div className="flex" style={{ gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setConfirmarExclusao(null)}>Cancelar</button>
                <button className="btn btn-danger" onClick={() => { removeUsuario(confirmarExclusao); setConfirmarExclusao(null); }}>
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editId ? 'Editar Usuário' : 'Novo Usuário'}</span>
              <button className="btn-icon" onClick={fecharModal}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group form-full"><label>Nome Completo *</label><input required autoFocus {...f('nome')} /></div>
                  <div className="form-group form-full"><label>E-mail *</label><input required type="email" {...f('email')} /></div>
                  <div className="form-group form-full">
                    <label>{editId ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}</label>
                    <input type="password" {...f('senha')} {...(!editId && { required: true })} minLength={editId ? 0 : 6} />
                  </div>
                  <div className="form-group form-full">
                    <label>Perfil de Acesso *</label>
                    <select required {...f('perfil')}>
                      {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label} – {p.desc}</option>)}
                    </select>
                  </div>
                </div>

                {form.perfil && (
                  <div className="alert alert-info" style={{ marginTop: 12 }}>
                    <strong>{PERFIS.find(p => p.value === form.perfil)?.label}:</strong> {PERFIS.find(p => p.value === form.perfil)?.desc}
                  </div>
                )}

                {erroCrud && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{erroCrud}</p>}
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={fecharModal}><X size={14} /> Cancelar</button>
                  <button type="submit" className="btn btn-primary"><Check size={14} /> {editId ? 'Salvar' : 'Criar Usuário'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
