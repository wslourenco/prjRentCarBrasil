import { useApp } from '../context/AppContext';
import { Car, Users, DollarSign, TrendingUp, UserCheck, Briefcase, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function Dashboard() {
  const { veiculos, locatarios, locadores, locacoes, despesasReceitas, usuarioLogado } = useApp();

  const perfil = usuarioLogado?.perfil;

  if (perfil === 'locatario') {
    return <DashboardLocatario veiculos={veiculos} locacoes={locacoes} />;
  }

  if (perfil === 'locador') {
    return <DashboardLocador veiculos={veiculos} locacoes={locacoes} despesasReceitas={despesasReceitas} />;
  }

  return <DashboardAdmin veiculos={veiculos} locatarios={locatarios} locadores={locadores} locacoes={locacoes} despesasReceitas={despesasReceitas} />;
}

function DashboardAdmin({ veiculos, locatarios, locadores, locacoes, despesasReceitas }) {

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

  const dadosMarca = Object.entries(porMarca).map(([marca, qtd], idx) => ({
    name: marca,
    value: qtd,
    color: PALETA_MARCA[idx % PALETA_MARCA.length].top,
    depth: PALETA_MARCA[idx % PALETA_MARCA.length].depth,
  }));

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
            {dadosMarca.length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}>Nenhum veículo cadastrado</div>
            ) : (
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={dadosMarca} dataKey="value" cx="50%" cy="56%" innerRadius={48} outerRadius={86} legendType="none">
                      {dadosMarca.map((entry, idx) => (
                        <Cell key={`marca-depth-${idx}`} fill={entry.depth} />
                      ))}
                    </Pie>
                    <Pie data={dadosMarca} dataKey="value" cx="50%" cy="50%" innerRadius={48} outerRadius={86}>
                      {dadosMarca.map((entry, idx) => (
                        <Cell key={`marca-top-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={value => `${Number(value)} veículo(s)`} />
                    <Legend verticalAlign="bottom" height={28} formatter={(value, entry) => `${value}: ${Number(entry?.payload?.value || 0)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
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

const PALETA_MARCA = [
  { top: '#3b82f6', depth: '#1d4ed8' },
  { top: '#10b981', depth: '#047857' },
  { top: '#f59e0b', depth: '#b45309' },
  { top: '#ef4444', depth: '#b91c1c' },
  { top: '#8b5cf6', depth: '#6d28d9' },
  { top: '#14b8a6', depth: '#0f766e' },
  { top: '#f97316', depth: '#c2410c' },
  { top: '#6366f1', depth: '#4338ca' },
];

function DashboardLocador({ veiculos, locacoes, despesasReceitas }) {
  const locacoesAtivas = locacoes.filter(l => l.status === 'ativa');
  const totalReceitas = despesasReceitas.filter(d => d.tipo === 'receita').reduce((s, d) => s + Number(d.valor || 0), 0);
  const totalDespesas = despesasReceitas.filter(d => d.tipo === 'despesa').reduce((s, d) => s + Number(d.valor || 0), 0);
  const lucro = totalReceitas - totalDespesas;
  const ocupacao = veiculos.length > 0 ? Math.round((locacoesAtivas.length / veiculos.length) * 100) : 0;

  const lucroPorVeiculo = veiculos.map(v => {
    const receitas = despesasReceitas
      .filter(d => d.tipo === 'receita' && String(d.veiculoId || '') === String(v.id))
      .reduce((acc, d) => acc + Number(d.valor || 0), 0);

    const despesas = despesasReceitas
      .filter(d => d.tipo === 'despesa' && String(d.veiculoId || '') === String(v.id))
      .reduce((acc, d) => acc + Number(d.valor || 0), 0);

    return {
      id: v.id,
      nome: `${v.marca} ${v.modelo} - ${v.placa}`,
      lucro: receitas - despesas,
    };
  }).sort((a, b) => b.lucro - a.lucro);

  return (
    <div className="page-content">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>Dashboard do Locador</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>Visão dos seus veículos, locações e desempenho financeiro</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><Car size={20} /></div>
          <div>
            <div className="stat-label">Meus Veículos</div>
            <div className="stat-value">{veiculos.length}</div>
            <div className="stat-sub">{locacoesAtivas.length} com locação ativa</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><TrendingUp size={20} /></div>
          <div>
            <div className="stat-label">Receitas</div>
            <div className="stat-value" style={{ fontSize: 18 }}>R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><DollarSign size={20} /></div>
          <div>
            <div className="stat-label">Despesas</div>
            <div className="stat-value" style={{ fontSize: 18 }}>R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className={`stat-icon ${lucro >= 0 ? 'green' : 'red'}`}><Briefcase size={20} /></div>
          <div>
            <div className="stat-label">Lucro</div>
            <div className="stat-value" style={{ fontSize: 18, color: lucro >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
              R$ {lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Taxa de Ocupação da Frota</span>
            <span className="badge badge-blue">{ocupacao}%</span>
          </div>
          <div className="progress-bar" style={{ marginBottom: 10 }}>
            <div className="progress-fill" style={{ width: `${ocupacao}%`, background: 'var(--primary)' }} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--gray-500)' }}>{locacoesAtivas.length} de {veiculos.length} veículos em locação ativa</p>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Top Lucro por Veículo</span>
          </div>
          {lucroPorVeiculo.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>Sem dados financeiros para exibir.</div>
          ) : (
            lucroPorVeiculo.slice(0, 5).map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gray-100)', fontSize: 13 }}>
                <span>{item.nome}</span>
                <strong style={{ color: item.lucro >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
                  R$ {item.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardLocatario({ veiculos, locacoes }) {
  const locacoesAtivas = locacoes.filter(l => l.status === 'ativa');
  const locacoesEncerradas = locacoes.filter(l => l.status === 'encerrada');
  const locacoesCanceladas = locacoes.filter(l => l.status === 'cancelada');
  const veiculosDisponiveis = Math.max(veiculos.length - locacoesAtivas.length, 0);

  return (
    <div className="page-content">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>Dashboard do Locatário</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>Acompanhe suas locações e disponibilidade de veículos</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><Car size={20} /></div>
          <div>
            <div className="stat-label">Veículos Disponíveis</div>
            <div className="stat-value">{veiculosDisponiveis}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Briefcase size={20} /></div>
          <div>
            <div className="stat-label">Minhas Locações Ativas</div>
            <div className="stat-value">{locacoesAtivas.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><Users size={20} /></div>
          <div>
            <div className="stat-label">Encerradas</div>
            <div className="stat-value">{locacoesEncerradas.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><AlertCircle size={20} /></div>
          <div>
            <div className="stat-label">Canceladas</div>
            <div className="stat-value">{locacoesCanceladas.length}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Últimas Locações</span>
        </div>
        {locacoes.length === 0 ? (
          <div className="empty-state" style={{ padding: 20 }}>Nenhuma locação registrada.</div>
        ) : (
          locacoes.slice(0, 8).map(loc => (
            <div key={loc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gray-100)', fontSize: 13 }}>
              <span>{loc.nomeVeiculo || loc.placa || `Veículo ${loc.veiculoId}`}</span>
              <span className={`badge ${loc.status === 'ativa' ? 'badge-green' : 'badge-gray'}`}>{loc.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
