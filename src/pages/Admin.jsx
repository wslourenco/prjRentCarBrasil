import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Edit2, Trash2, X, Check, Shield } from 'lucide-react';

const PERFIS = [
  { value: 'admin', label: 'Administrador', desc: 'Acesso total ao sistema' },
  { value: 'locador', label: 'Locador', desc: 'Gerencia seus veículos e locações' },
  { value: 'locatario', label: 'Locatário', desc: 'Visualiza apenas suas locações' },
  { value: 'auxiliar', label: 'Auxiliar Administrativo', desc: 'Lança despesas e receitas, sem acesso à lucratividade' },
];

const EMPTY = { nome: '', email: '', senha: '', perfil: 'locador', tipoDocumento: 'cpf', documento: '' };

function maskDoc(value, tipo) {
  let v = value.replace(/\D/g, '');
  if (tipo === 'cpf') {
    v = v.slice(0, 11);
    return v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (m, a, b, c, d) => d ? `${a}.${b}.${c}-${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a);
  } else {
    v = v.slice(0, 14);
    return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (m, a, b, c, d, e) => e ? `${a}.${b}.${c}/${d}-${e}` : d ? `${a}.${b}.${c}/${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a);
  }
}
function isValidCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^([0-9])\1+$/.test(cpf)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i-1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i-1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  return rest === parseInt(cpf.substring(10, 11));
}
function isValidCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14) return false;
  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  let digits = cnpj.substring(size);
  let sum = 0, pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(0))) return false;
  size++;
  numbers = cnpj.substring(0, size);
  sum = 0; pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  return result === parseInt(digits.charAt(1));
}

export default function Admin() {
  const { usuarios, addUsuario, updateUsuario, removeUsuario, usuarioLogado, carregarUsuarios } = useApp();
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  const [erroCrud, setErroCrud] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState('');

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  function abrirNovo() { setForm(EMPTY); setEditId(null); setModal(true); setErroCrud(''); }
  function abrirEditar(u) { setForm({ ...EMPTY, ...u, senha: '', tipoDocumento: u.tipoDocumento || 'cpf', documento: u.documento || '' }); setEditId(u.id); setModal(true); setErroCrud(''); }
  function fecharModal() { setModal(false); setEditId(null); setErroCrud(''); }

  const usuariosFiltrados = filtroPerfil ? usuarios.filter(u => u.perfil === filtroPerfil) : usuarios;

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
        <div
          role="button"
          tabIndex={0}
          onClick={() => setFiltroPerfil('')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setFiltroPerfil(''); }}
          style={{
            background: !filtroPerfil ? 'var(--blue-10)' : 'var(--white)',
            border: !filtroPerfil ? '2px solid var(--primary)' : '1px solid var(--gray-200)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow)',
            padding: 16,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Shield size={18} color="var(--primary)" />
            <strong style={{ fontSize: 14 }}>Todos</strong>
          </div>
          <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>Exibe todos os usuários cadastrados</p>
          <span className={`badge ${badgePerfil.admin}`}>{usuarios.length} usuário(s)</span>
        </div>
        {PERFIS.map(p => {
          const qtd = usuarios.filter(u => u.perfil === p.value).length;
          const ativo = filtroPerfil === p.value;
          return (
            <div
              key={p.value}
              role="button"
              tabIndex={0}
              onClick={() => setFiltroPerfil(prev => prev === p.value ? '' : p.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setFiltroPerfil(prev => prev === p.value ? '' : p.value); }}
              style={{
                background: ativo ? 'var(--blue-10)' : 'var(--white)',
                border: ativo ? '2px solid var(--primary)' : '1px solid var(--gray-200)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow)',
                padding: 16,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
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
      {filtroPerfil && (
        <div style={{ marginBottom: 16 }}>
          <span className="badge badge-blue" style={{ padding: '8px 12px', cursor: 'pointer' }} onClick={() => setFiltroPerfil('')}>
            Filtrando por {PERFIS.find(p => p.value === filtroPerfil)?.label || filtroPerfil} - clicar para limpar filtro
          </span>
        </div>
      )}

      <div className="card">
        {usuariosFiltrados.length === 0 ? (
          <div className="empty-state"><Shield size={32} /><p>Nenhum usuário encontrado para este filtro.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Documento</th>
                  <th>Perfil de Acesso</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map(u => (
                  <tr key={u.id}>
                    <td className="fw-600">
                      {u.id === usuarioLogado?.id && <span className="badge badge-green" style={{ marginRight: 8 }}>Você</span>}
                      {u.nome}
                    </td>
                    <td>{u.email}</td>
                    <td>{u.tipoDocumento === 'cnpj' ? 'CNPJ' : 'CPF'}<br /><span style={{ fontFamily: 'monospace', fontSize: 13 }}>{u.documento}</span></td>
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
                    <label>Tipo de documento *</label>
                    <select required {...f('tipoDocumento')}>
                      <option value="cpf">CPF</option>
                      <option value="cnpj">CNPJ</option>
                    </select>
                  </div>
                  <div className="form-group form-full">
                    <label>{form.tipoDocumento === 'cpf' ? 'CPF' : 'CNPJ'} *</label>
                    <input required type="text" maxLength={form.tipoDocumento === 'cpf' ? 14 : 18} placeholder={form.tipoDocumento === 'cpf' ? 'Digite o CPF' : 'Digite o CNPJ'}
                      value={maskDoc(form.documento, form.tipoDocumento)}
                      onChange={e => setForm({ ...form, documento: e.target.value })}
                      pattern={form.tipoDocumento === 'cpf' ? '\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}' : '\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}'}
                      title={form.tipoDocumento === 'cpf' ? 'Digite um CPF válido' : 'Digite um CNPJ válido'}
                    />
                    {form.documento && (
                      <span style={{ color: (form.tipoDocumento === 'cpf' ? isValidCPF(form.documento) : isValidCNPJ(form.documento)) ? 'green' : 'red', fontSize: 12 }}>
                        {form.tipoDocumento === 'cpf'
                          ? (isValidCPF(form.documento) ? 'CPF válido' : 'CPF inválido')
                          : (isValidCNPJ(form.documento) ? 'CNPJ válido' : 'CNPJ inválido')}
                      </span>
                    )}
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
