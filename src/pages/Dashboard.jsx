import { useApp } from '../context/AppContext';
import { Car, Users, DollarSign, TrendingUp, UserCheck, Briefcase, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const { veiculos, locatarios, locadores, locacoes, despesasReceitas } = useApp();

  const locacoesAtivas = locacoes.filter(l => l.status === 'ativa');
  const totalReceitas = despesasReceitas.filter(d => d.tipo === 'receita').reduce((s, d) => s + Number(d.valor || 0), 0);
  const totalDespesas = despesasReceitas.filter(d => d.tipo === 'despesa').reduce((s, d) => s + Number(d.valor || 0), 0);
  const saldo = totalReceitas - totalDespesas;

  const ocupacao = veiculos.length > 0 ? Math.round((locacoesAtivas.length / veiculos.length) * 100) : 0;

  // Agrupar veículos por marca para o gráfico de categoria
  const porMarca = veiculos.reduce((acc, v) => {
    acc[v.marca || 'Sem marca'] = (acc[v.marca || 'Sem marca'] || 0) + 1;
    return acc;
  }, {});

  // Alertas de manutenção
  const alertas = veiculos.filter(v => {
    const kmAtual = Number(v.kmAtual || 0);
    const kmTrocaOleo = Number(v.kmTrocaOleo || 0);
    return kmTrocaOleo > 0 && kmAtual >= kmTrocaOleo;
  });

  return (
    <div className="page-content">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>Dashboard</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>Visão geral do sistema de locação</p>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><Car size={20} /></div>
          <div>
            <div className="stat-label">Veículos Cadastrados</div>
            <div className="stat-value">{veiculos.length}</div>
            <div className="stat-sub">{locacoesAtivas.length} locados atualmente</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><UserCheck size={20} /></div>
          <div>
            <div className="stat-label">Locadores</div>
            <div className="stat-value">{locadores.length}</div>
            <div className="stat-sub">Proprietários cadastrados</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><Users size={20} /></div>
          <div>
            <div className="stat-label">Locatários</div>
            <div className="stat-value">{locatarios.length}</div>
            <div className="stat-sub">Clientes cadastrados</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><TrendingUp size={20} /></div>
          <div>
            <div className="stat-label">Receitas</div>
            <div className="stat-value" style={{ fontSize: 18 }}>R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div className="stat-sub">Total registrado</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><DollarSign size={20} /></div>
          <div>
            <div className="stat-label">Despesas</div>
            <div className="stat-value" style={{ fontSize: 18 }}>R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div className="stat-sub">Total registrado</div>
          </div>
        </div>
        <div className="stat-card">
          <div className={`stat-icon ${saldo >= 0 ? 'green' : 'red'}`}><Briefcase size={20} /></div>
          <div>
            <div className="stat-label">Saldo</div>
            <div className="stat-value" style={{ fontSize: 18, color: saldo >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
              R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="stat-sub">Receitas – Despesas</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Taxa de Ocupação */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Taxa de Ocupação</span>
            <span className="badge badge-blue">{ocupacao}%</span>
          </div>
          <div className="progress-bar" style={{ marginBottom: 12 }}>
            <div className="progress-fill" style={{ width: `${ocupacao}%`, background: 'var(--primary)' }} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--gray-500)' }}>
            {locacoesAtivas.length} de {veiculos.length} veículos locados
          </p>

          <div style={{ marginTop: 20 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Por Categoria/Marca</div>
            {Object.keys(porMarca).length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}>Nenhum veículo cadastrado</div>
            ) : (
              Object.entries(porMarca).map(([marca, qtd]) => {
                const pct = Math.round((qtd / veiculos.length) * 100);
                return (
                  <div key={marca} style={{ marginBottom: 10 }}>
                    <div className="flex-between mb-4">
                      <span style={{ fontSize: 13 }}>{marca}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{qtd} ({pct}%)</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--secondary)' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Alertas de Manutenção */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Alertas de Manutenção</span>
            {alertas.length > 0 && <span className="badge badge-red">{alertas.length} alerta{alertas.length > 1 ? 's' : ''}</span>}
          </div>
          {alertas.length === 0 ? (
            <div className="empty-state">
              <AlertCircle size={32} />
              <p>Nenhum alerta de manutenção</p>
            </div>
          ) : (
            <div>
              {alertas.map(v => (
                <div key={v.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ width: 36, height: 36, background: 'var(--warning-light)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AlertCircle size={18} color="var(--warning)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{v.marca} {v.modelo} – {v.placa}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                      KM atual: {Number(v.kmAtual || 0).toLocaleString()} | Troca óleo: {Number(v.kmTrocaOleo || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Locações Recentes</div>
            {locacoes.length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}>Nenhuma locação registrada</div>
            ) : (
              locacoes.slice(-5).reverse().map(loc => (
                <div key={loc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gray-100)', fontSize: 13 }}>
                  <span>{loc.placa || loc.veiculoId}</span>
                  <span className={`badge ${loc.status === 'ativa' ? 'badge-green' : 'badge-gray'}`}>{loc.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
