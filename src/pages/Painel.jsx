import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Car, User, Phone, Mail, DollarSign, Wrench, X, Plus, CheckCircle,
  ChevronRight, MessageCircle, Bell, Check, CalendarDays, Star
} from 'lucide-react';

const AVALIACAO_QUESTOES = [
  'Pontualidade na devolução do veículo',
  'Cuidado com o estado geral do veículo',
  'Cumprimento das condições do contrato',
  'Comunicação durante o período da locação',
  'Organização com documentação solicitada',
  'Responsabilidade com quilometragem e uso',
  'Zelo com limpeza e conservação interna',
  'Transparência em ocorrências e imprevistos',
  'Agilidade para resolver pendências',
  'Confiabilidade geral do locatário',
];

function renderStarIcons(nota, size = 13) {
  const safeNota = Number.isFinite(Number(nota)) ? Math.max(0, Math.min(5, Number(nota))) : 0;

  return Array.from({ length: 5 }).map((_, i) => {
    const preenchimento = Math.max(0, Math.min(1, safeNota - i));
    const clipId = `star-fill-${size}-${i}-${Math.round(safeNota * 10)}`;

    return (
      <span key={clipId} style={{ position: 'relative', width: size, height: size, display: 'inline-flex' }}>
        <Star size={size} fill="none" style={{ color: '#d1d5db', position: 'absolute', inset: 0 }} />
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
          <defs>
            <clipPath id={clipId}>
              <rect x="0" y="0" width={size * preenchimento} height={size} />
            </clipPath>
          </defs>
        </svg>
        <Star
          size={size}
          fill="currentColor"
          style={{
            color: '#f59e0b',
            position: 'absolute',
            inset: 0,
            clipPath: `url(#${clipId})`,
          }}
        />
      </span>
    );
  });
}

const EMPTY_LOCACAO = {
  veiculoId: '', locatarioId: '',
  dataInicio: new Date().toISOString().split('T')[0],
  dataPrevisaoFim: '',
  valorSemanal: '',
  caucao: '',
  condicoes: '',
  kmEntrada: '',
  periodicidade: 'semana',
  quantidadePeriodos: '1',
};

export default function Painel() {
  const { locacoes, veiculos, locatarios, despesasReceitas, addLocacao, updateLocacao, removeLocacao, aprovarLocacao, encerrarLocacao, usuarioLogado } = useApp();
  const [veiculoSelecionado, setVeiculoSelecionado] = useState(null);
  const [abaDetalhe, setAbaDetalhe] = useState('info');
  const [modalNovaLocacao, setModalNovaLocacao] = useState(false);
  const [formLocacao, setFormLocacao] = useState(EMPTY_LOCACAO);
  const [locacaoEditandoId, setLocacaoEditandoId] = useState(null);
  const [confirmarEncerrar, setConfirmarEncerrar] = useState(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(null);
  const [filtroCategoriaVeiculo, setFiltroCategoriaVeiculo] = useState('');
  const [aprovandoId, setAprovandoId] = useState(null);
  const podeEditarExcluir = usuarioLogado?.perfil === 'admin' || usuarioLogado?.perfil === 'auxiliar';

  const locacoesAtivas = locacoes.filter(l => l.status === 'ativa');
  const solicitacoesPendentes = locacoes.filter(l => l.status === 'pendente_aprovacao');

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

  async function handleAprovarLocacao(item) {
    if (!item?.locacao?.id) return;
    setAprovandoId(item.locacao.id);
    try {
      await aprovarLocacao(item.locacao.id);
    } catch (err) {
      alert(err.message || 'Não foi possível aprovar a solicitação.');
    } finally {
      setAprovandoId(null);
    }
  }

  function computeEndDate(dataInicio, periodicidade, quantidade) {
    if (!dataInicio || !periodicidade || !quantidade) return '';
    
    const base = new Date(`${dataInicio}T00:00:00`);
    if (Number.isNaN(base.getTime())) return '';

    const total = Number(quantidade || 0);
    if (!total || total <= 0) return '';

    if (periodicidade === 'dia') {
      base.setDate(base.getDate() + total);
    } else if (periodicidade === 'semana') {
      base.setDate(base.getDate() + (total * 7));
    } else if (periodicidade === 'quinzenal') {
      base.setDate(base.getDate() + (total * 14));
    } else if (periodicidade === 'mensal') {
      base.setMonth(base.getMonth() + total);
    } else {
      return '';
    }

    return base.toISOString().split('T')[0];
  }

  // Atualizar data final automaticamente quando periodicidade, quantidade ou data de início mudam
  useEffect(() => {
    if (modalNovaLocacao && formLocacao.dataInicio && formLocacao.periodicidade && formLocacao.quantidadePeriodos) {
      const novaDataFim = computeEndDate(formLocacao.dataInicio, formLocacao.periodicidade, formLocacao.quantidadePeriodos);
      if (novaDataFim && novaDataFim !== formLocacao.dataPrevisaoFim) {
        setFormLocacao(prev => ({ ...prev, dataPrevisaoFim: novaDataFim }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalNovaLocacao, formLocacao.dataInicio, formLocacao.periodicidade, formLocacao.quantidadePeriodos]);

  // Auto-preencher valor total e caução com base no valor diário do veículo selecionado
  useEffect(() => {
    if (!modalNovaLocacao) return;
    const veiculo = veiculos.find(v => String(v.id) === String(formLocacao.veiculoId));
    const valorDiario = Number(veiculo?.valorDiario || 0);
    if (!valorDiario) {
      setFormLocacao(prev => ({ ...prev, caucao: '' }));
      return;
    }
    const qtd = Number(formLocacao.quantidadePeriodos || 1);
    const per = formLocacao.periodicidade;
    let diasTotal = qtd;
    if (per === 'semana') diasTotal = qtd * 7;
    else if (per === 'quinzenal') diasTotal = qtd * 14;
    else if (per === 'mensal') diasTotal = qtd * 30;
    const valorCalculado = (valorDiario * diasTotal).toFixed(2);
    const caucaoCalculada = valorDiario.toFixed(2);
    setFormLocacao(prev => ({ ...prev, valorSemanal: valorCalculado, caucao: caucaoCalculada }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalNovaLocacao, formLocacao.veiculoId, formLocacao.periodicidade, formLocacao.quantidadePeriodos]);

  // Regra de negócio: caução deve sempre ser igual ao valor da locação.
  useEffect(() => {
    if (!modalNovaLocacao) return;

    const valorLocacao = String(formLocacao.valorSemanal || '').trim();
    if (formLocacao.caucao === valorLocacao) return;

    setFormLocacao(prev => ({ ...prev, caucao: valorLocacao }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalNovaLocacao, formLocacao.valorSemanal]);

  function abrirModalNovaLocacao() {
    setLocacaoEditandoId(null);
    setFormLocacao(EMPTY_LOCACAO);
    setModalNovaLocacao(true);
  }

  function abrirModalEditarLocacao(item) {
    setLocacaoEditandoId(item.locacao.id);
    setFormLocacao({
      veiculoId: String(item.locacao.veiculoId || ''),
      locatarioId: String(item.locacao.locatarioId || ''),
      dataInicio: item.locacao.dataInicio || new Date().toISOString().split('T')[0],
      dataPrevisaoFim: item.locacao.dataPrevisaoFim || '',
      valorSemanal: item.locacao.valorSemanal || '',
      caucao: item.locacao.caucao || '',
      condicoes: item.locacao.condicoes || '',
      kmEntrada: item.locacao.kmEntrada || '',
      periodicidade: item.locacao.periodicidade || 'semana',
      quantidadePeriodos: item.locacao.quantidadePeriodos ? String(item.locacao.quantidadePeriodos) : '1',
      dataEncerramento: item.locacao.dataEncerramento || null,
      kmSaida: item.locacao.kmSaida || null,
      status: item.locacao.status || 'ativa',
    });
    setModalNovaLocacao(true);
  }

  function fecharModalLocacao() {
    setModalNovaLocacao(false);
    setLocacaoEditandoId(null);
    setFormLocacao(EMPTY_LOCACAO);
  }

  async function handleNovaLocacao(e) {
    e.preventDefault();
    try {
      const payloadLocacao = {
        ...formLocacao,
        kmEntrada: kmAtualVeiculoSelecionado,
      };

      if (locacaoEditandoId) {
        await updateLocacao(locacaoEditandoId, {
          ...payloadLocacao,
          status: formLocacao.status || 'ativa',
        });
      } else {
        await addLocacao(payloadLocacao);
      }

      if (veiculoSelecionado?.locacao?.id && locacaoEditandoId === veiculoSelecionado.locacao.id) {
        const locacaoAtualizada = locacoes.find(l => String(l.id) === String(locacaoEditandoId));
        const locacaoFinal = locacaoAtualizada || { ...veiculoSelecionado.locacao, ...payloadLocacao, id: locacaoEditandoId };
        const veiculoFinal = veiculos.find(v => String(v.id) === String(formLocacao.veiculoId)) || veiculoSelecionado.veiculo;
        const locatarioFinal = locatarios.find(l => String(l.id) === String(formLocacao.locatarioId)) || veiculoSelecionado.locatario;
        setVeiculoSelecionado({ locacao: locacaoFinal, veiculo: veiculoFinal, locatario: locatarioFinal });
      }
      fecharModalLocacao();
    } catch (err) {
      alert(err.message || 'Erro ao salvar locação.');
    }
  }

  async function fileToBase64DataUrl(file) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo de comprovante.'));
      reader.readAsDataURL(file);
    });
  }

  async function handleEncerrar() {
    if (!confirmarEncerrar?.id) return;

    const kmSaidaNumero = Number(confirmarEncerrar.kmSaida);
    if (!Number.isFinite(kmSaidaNumero) || kmSaidaNumero <= 0) {
      alert('Informe a quilometragem final válida para encerrar a locação.');
      return;
    }

    const arquivo = confirmarEncerrar.comprovanteArquivo || null;
    if (!arquivo) {
      alert('Anexe o comprovante do pagamento (PDF ou imagem).');
      return;
    }

    const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const tipoArquivo = String(arquivo.type || '').toLowerCase();
    if (!tiposPermitidos.includes(tipoArquivo)) {
      alert('O comprovante deve ser um arquivo PDF ou imagem (JPG, PNG, WEBP ou GIF).');
      return;
    }

    if (arquivo.size > 8 * 1024 * 1024) {
      alert('O arquivo de comprovante deve ter no máximo 8MB.');
      return;
    }

    const respostasLikert = Array.isArray(confirmarEncerrar.avaliacaoLikert)
      ? confirmarEncerrar.avaliacaoLikert.map(v => Number(v))
      : [];
    const respostasInvalidas = respostasLikert.length !== 10 || respostasLikert.some(v => !Number.isInteger(v) || v < 1 || v > 5);
    if (respostasInvalidas) {
      alert('Preencha as 10 perguntas da avaliação do locatário com notas de 1 a 5.');
      return;
    }

    try {
      const comprovanteBase64 = await fileToBase64DataUrl(arquivo);

      await encerrarLocacao(confirmarEncerrar.id, {
        kmSaida: kmSaidaNumero,
        avaliacaoLikert: respostasLikert,
        comprovanteArquivo: {
          nome: arquivo.name || 'comprovante',
          tipo: arquivo.type || '',
          conteudoBase64: comprovanteBase64,
        },
      });
      setVeiculoSelecionado(null);
      setConfirmarEncerrar(null);
    } catch (err) {
      alert(err.message || 'Erro ao encerrar locação.');
    }
  }

  async function handleExcluir(locacaoId) {
    try {
      await removeLocacao(locacaoId);
      if (String(veiculoSelecionado?.locacao?.id) === String(locacaoId)) {
        setVeiculoSelecionado(null);
      }
      setConfirmarExcluir(null);
    } catch (err) {
      alert(err.message || 'Erro ao excluir locação.');
    }
  }

  function fLocacao(field) {
    return { value: formLocacao[field] || '', onChange: e => setFormLocacao({ ...formLocacao, [field]: e.target.value }) };
  }

  const veiculosDisponiveis = veiculos
    .filter(v => {
      const estaLocado = locacoesAtivas.find(l => String(l.veiculoId) === String(v.id));
      if (!estaLocado) return true;
      return locacaoEditandoId && String(estaLocado.id) === String(locacaoEditandoId);
    })
    .filter(v => {
      if (!filtroCategoriaVeiculo) return true;
      return (String(v.marca || '').trim() || 'Sem categoria') === filtroCategoriaVeiculo;
    });

  const veiculoSelecionadoForm = veiculos.find(v => String(v.id) === String(formLocacao.veiculoId));
  const kmAtualVeiculoSelecionado = veiculoSelecionadoForm?.kmAtual ?? '';

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
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>
            {usuarioLogado?.perfil === 'auxiliar' ? 'Painel de Locações' : 'Painel de Controle'}
          </h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>
            {locacoesAtivas.length} locação(ões) ativa(s) • {solicitacoesPendentes.length} solicitação(ões) pendente(s)
          </p>
        </div>
        <div className="flex" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select aria-label="Categoria do Veículo" value={filtroCategoriaVeiculo} onChange={e => setFiltroCategoriaVeiculo(e.target.value)} style={{ padding: '7px 12px', border: '1.5px solid var(--gray-300)', borderRadius: 'var(--radius)', fontSize: 13, width: '100%', maxWidth: 320 }}>
            <option value="">Todas as montadoras</option>
            {categoriasVeiculo.map(categoria => <option key={categoria} value={categoria}>{categoria}</option>)}
          </select>
          <button className="btn btn-primary" onClick={abrirModalNovaLocacao}><Plus size={16} /> Nova Locação</button>
        </div>
      </div>

      {solicitacoesPendentes.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Solicitações Pendentes de Aprovação</span>
            <span className="badge badge-orange">{solicitacoesPendentes.length}</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Veículo</th>
                  <th>Locatário</th>
                  <th>Início</th>
                  <th>Período</th>
                  <th>Antecedentes</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {solicitacoesPendentes.map(loc => {
                  const veiculo = veiculos.find(v => String(v.id) === String(loc.veiculoId));
                  const antecedenteUrl = loc.antecedenteCriminalArquivo
                    ? (/^https?:\/\//i.test(String(loc.antecedenteCriminalArquivo || ''))
                      ? String(loc.antecedenteCriminalArquivo || '')
                      : `${window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3001' : window.location.origin}/${String(loc.antecedenteCriminalArquivo || '').replace(/^\//, '')}`)
                    : '';

                  return (
                    <tr key={loc.id}>
                      <td>{loc.nomeVeiculo || (veiculo ? `${veiculo.marca} ${veiculo.modelo}` : '-') || loc.placa || '-'}</td>
                      <td>{loc.nomeLocatario || '-'}</td>
                      <td>{loc.dataInicio || '-'}</td>
                      <td>{loc.periodicidade || '-'} / {loc.quantidadePeriodos || 1}</td>
                      <td>
                        {antecedenteUrl ? (
                          <a href={antecedenteUrl} target="_blank" rel="noopener noreferrer">Ver arquivo</a>
                        ) : '-'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAprovarLocacao({ locacao: loc })}
                          disabled={aprovandoId === loc.id}
                        >
                          {aprovandoId === loc.id ? 'Aprovando...' : 'Aprovar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                {!!veiculoSelecionado.locatario && (
                  <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--gray-600)' }}>
                    <span style={{ display: 'inline-flex', gap: 2, color: '#f59e0b' }}>
                      {renderStarIcons(Number(veiculoSelecionado.locatario?.pontuacaoMedia || 0), 13)}
                    </span>
                    <span>
                      {Number(veiculoSelecionado.locatario?.totalAvaliacoes || 0) > 0
                        ? `${Number(veiculoSelecionado.locatario?.pontuacaoMedia || 0).toFixed(1)} (${Number(veiculoSelecionado.locatario?.totalAvaliacoes || 0)})`
                        : 'Sem avaliação'}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex" style={{ gap: 8 }}>
                {podeEditarExcluir && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => abrirModalEditarLocacao(veiculoSelecionado)}
                  >
                    <CalendarDays size={14} /> Editar Locação
                  </button>
                )}
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => setConfirmarEncerrar({
                    id: veiculoSelecionado.locacao.id,
                    kmSaida: veiculoSelecionado.veiculo?.kmAtual || '',
                    comprovanteArquivo: null,
                    avaliacaoLikert: Array.from({ length: 10 }, () => ''),
                  })}
                >
                  <CheckCircle size={14} /> Encerrar Locação
                </button>
                {podeEditarExcluir && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setConfirmarExcluir(veiculoSelecionado.locacao.id)}
                  >
                    <X size={14} /> Excluir
                  </button>
                )}
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
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">Encerrar Locação</span></div>
            <div className="modal-body">
              <p style={{ marginBottom: 12 }}>Para encerrar a locação, informe os dados obrigatórios abaixo.</p>
              <div className="form-grid" style={{ marginBottom: 16 }}>
                <div className="form-group form-full">
                  <label>Quilometragem Final *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={confirmarEncerrar.kmSaida}
                    onChange={(e) => setConfirmarEncerrar((prev) => ({ ...prev, kmSaida: e.target.value }))}
                  />
                </div>
                <div className="form-group form-full">
                  <label>Comprovante do Pagamento *</label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    required
                    onChange={(e) => {
                      const arquivo = e.target.files?.[0] || null;
                      setConfirmarEncerrar((prev) => ({ ...prev, comprovanteArquivo: arquivo }));
                    }}
                  />
                  <small style={{ color: 'var(--gray-500)' }}>
                    Formatos aceitos: PDF, JPG, PNG, WEBP ou GIF (máx. 8MB).
                  </small>
                </div>
                <div className="form-group form-full">
                  <label>Avaliação do Locatário (Escala Likert 1 a 5) *</label>
                  <div style={{ display: 'grid', gap: 8, maxHeight: 260, overflowY: 'auto', padding: 8, border: '1px solid var(--gray-200)', borderRadius: 8 }}>
                    {AVALIACAO_QUESTOES.map((pergunta, index) => {
                      const respostaAtual = confirmarEncerrar.avaliacaoLikert?.[index] || '';
                      return (
                        <div key={pergunta} style={{ display: 'grid', gap: 6, paddingBottom: 8, borderBottom: '1px solid var(--gray-100)' }}>
                          <div style={{ fontSize: 13, color: 'var(--gray-700)' }}>{index + 1}. {pergunta}</div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            {[1, 2, 3, 4, 5].map(nota => (
                              <label key={`${pergunta}-${nota}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--gray-600)' }}>
                                <input
                                  type="radio"
                                  name={`avaliacao-${index}`}
                                  checked={Number(respostaAtual) === nota}
                                  onChange={() => {
                                    setConfirmarEncerrar(prev => {
                                      const respostas = Array.isArray(prev.avaliacaoLikert) ? [...prev.avaliacaoLikert] : Array.from({ length: 10 }, () => '');
                                      respostas[index] = String(nota);
                                      return { ...prev, avaliacaoLikert: respostas };
                                    });
                                  }}
                                />
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                  {Array.from({ length: nota }).map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <small style={{ color: 'var(--gray-500)' }}>1 = Muito ruim, 5 = Excelente.</small>
                </div>
              </div>
              <div className="flex" style={{ gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setConfirmarEncerrar(null)}>Cancelar</button>
                <button className="btn btn-danger" onClick={handleEncerrar}>
                  <CheckCircle size={14} /> Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {confirmarExcluir && (
        <div className="modal-overlay" onClick={() => setConfirmarExcluir(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">Excluir Locação</span></div>
            <div className="modal-body">
              <p style={{ marginBottom: 20 }}>Confirma a exclusão da locação? Esta ação não pode ser desfeita.</p>
              <div className="flex" style={{ gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setConfirmarExcluir(null)}>Cancelar</button>
                <button className="btn btn-danger" onClick={() => handleExcluir(confirmarExcluir)}>
                  <X size={14} /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Locação */}
      {modalNovaLocacao && (
        <div className="modal-overlay" onClick={fecharModalLocacao}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{locacaoEditandoId ? 'Editar Locação' : 'Nova Locação'}</span>
              <button className="btn-icon" onClick={fecharModalLocacao}><X size={16} /></button>
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
                    <div className="form-group">
                      <label>Periodicidade *</label>
                      <select required value={formLocacao.periodicidade} onChange={e => setFormLocacao({ ...formLocacao, periodicidade: e.target.value })}>
                        <option value="dia">Dia</option>
                        <option value="semana">Semana</option>
                        <option value="quinzenal">Quinzenal</option>
                        <option value="mensal">Mensal</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Quantidade de {formLocacao.periodicidade === 'dia' ? 'Dias' : formLocacao.periodicidade === 'semana' ? 'Semanas' : formLocacao.periodicidade === 'quinzenal' ? 'Quinzenas' : 'Meses'} *</label>
                      <input required type="number" min="1" max="365" {...fLocacao('quantidadePeriodos')} />
                    </div>
                    <div className="form-group"><label>Valor Total da Locação (R$) *</label><input required type="number" step="0.01" {...fLocacao('valorSemanal')} /></div>
                    <div className="form-group"><label>Caução (R$) (automática)</label><input type="number" step="0.01" {...fLocacao('caucao')} readOnly /></div>
                    <div className="form-group">
                      <label>KM Atual do Veículo (automático)</label>
                      <input
                        type="number"
                        value={kmAtualVeiculoSelecionado}
                        readOnly
                        disabled
                      />
                    </div>
                    <div className="form-group form-full"><label>Condições / Observações</label><textarea {...fLocacao('condicoes')} /></div>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn btn-outline" onClick={fecharModalLocacao}><X size={14} /> Cancelar</button>
                    <button type="submit" className="btn btn-primary"><Check size={14} /> {locacaoEditandoId ? 'Salvar Alterações' : 'Iniciar Locação'}</button>
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
    periodicidade: 'semana',
    quantidadePeriodos: '1',
    condicoes: '',
  });
  const [dataFimCalculada, setDataFimCalculada] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  function getStatusLabel(status) {
    if (status === 'pendente_aprovacao') return 'Pendente de aprovação';
    if (status === 'ativa') return 'Ativa';
    if (status === 'encerrada') return 'Encerrada';
    if (status === 'cancelada') return 'Cancelada';
    return status || '-';
  }

  function getStatusBadgeClass(status) {
    if (status === 'pendente_aprovacao') return 'badge-orange';
    if (status === 'ativa') return 'badge-green';
    return 'badge-gray';
  }

  const apiBase = String(import.meta.env.VITE_API_URL ?? '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\/$/, '')
    || (['localhost', '127.0.0.1'].includes(window.location.hostname)
      ? 'http://localhost:3001'
      : window.location.origin);

  const locacoesAtivas = locacoes.filter(l => l.status === 'ativa');
  const locacoesPendentes = locacoes.filter(l => l.status === 'pendente_aprovacao');
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

  // Calcular data final automaticamente quando dataInicio, periodicidade ou quantidadePeriodos mudam
  useEffect(() => {
    if (form.dataInicio && form.periodicidade && form.quantidadePeriodos) {
      const base = new Date(`${form.dataInicio}T00:00:00`);
      if (!Number.isNaN(base.getTime())) {
        const total = Number(form.quantidadePeriodos || 0);
        if (total > 0) {
          if (form.periodicidade === 'dia') {
            base.setDate(base.getDate() + total);
          } else if (form.periodicidade === 'semana') {
            base.setDate(base.getDate() + (total * 7));
          } else if (form.periodicidade === 'quinzenal') {
            base.setDate(base.getDate() + (total * 14));
          } else if (form.periodicidade === 'mensal') {
            base.setMonth(base.getMonth() + total);
          }
          setDataFimCalculada(base.toISOString().split('T')[0]);
        }
      }
    }
  }, [form.dataInicio, form.periodicidade, form.quantidadePeriodos]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setSucesso('');
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
        periodicidade: 'semana',
        quantidadePeriodos: '1',
        condicoes: '',
      });
      setSucesso('Solicitação enviada com sucesso. A locação está pendente de aprovação do locador.');
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
          Defina o período da locação e envie a solicitação para aprovação do locador.
        </p>
        {locacoesPendentes.length > 0 && (
          <div className="alert alert-info" style={{ marginTop: 10 }}>
            Você possui {locacoesPendentes.length} locação(ões) pendente(s) de aprovação pelo locador.
          </div>
        )}
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
                    <option value="dia">Dia</option>
                    <option value="semana">Semanal</option>
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
                <label>Data de término estimada</label>
                <input
                  type="date"
                  disabled
                  readOnly
                  value={dataFimCalculada}
                />
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Observações</label>
                <textarea value={form.condicoes} onChange={e => setForm({ ...form, condicoes: e.target.value })} />
              </div>

              {erro && <div className="alert alert-error" style={{ marginTop: 12 }}>{erro}</div>}
              {sucesso && <div className="alert alert-success" style={{ marginTop: 12 }}>{sucesso}</div>}

              <button type="submit" className="btn btn-primary" style={{ marginTop: 12 }} disabled={salvando || !form.veiculoId}>
                <CalendarDays size={16} /> {salvando ? 'Enviando...' : 'Solicitar Locação'}
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
                    <th>Antecedentes</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {locacoes.map(loc => (
                    <tr key={loc.id}>
                      <td>{loc.nomeVeiculo || loc.placa || loc.veiculoId}</td>
                      <td>{loc.dataInicio}</td>
                      <td>{loc.dataPrevisaoFim || '-'}</td>
                      <td>
                        {loc.antecedenteCriminalArquivo ? (
                          <a
                            href={/^https?:\/\//i.test(String(loc.antecedenteCriminalArquivo || ''))
                              ? String(loc.antecedenteCriminalArquivo || '')
                              : `${apiBase}/${String(loc.antecedenteCriminalArquivo || '').replace(/^\//, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Ver arquivo
                          </a>
                        ) : '-'}
                      </td>
                      <td><span className={`badge ${getStatusBadgeClass(loc.status)}`}>{getStatusLabel(loc.status)}</span></td>
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

  const apiBase = String(import.meta.env.VITE_API_URL ?? '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\/$/, '')
    || (['localhost', '127.0.0.1'].includes(window.location.hostname)
      ? 'http://localhost:3001'
      : window.location.origin);

  const comprovantePagamento = String(locacao.comprovantePagamento || '').trim();
  const antecedenteCriminalArquivo = String(locacao.antecedenteCriminalArquivo || '').trim();
  const comprovanteUrl = (() => {
    if (!comprovantePagamento) return '';
    if (/^https?:\/\//i.test(comprovantePagamento)) return comprovantePagamento;
    const caminho = comprovantePagamento.replace(/^\//, '');
    return `${apiBase}/${caminho}`;
  })();
  const antecedenteUrl = (() => {
    if (!antecedenteCriminalArquivo) return '';
    if (/^https?:\/\//i.test(antecedenteCriminalArquivo)) return antecedenteCriminalArquivo;
    const caminho = antecedenteCriminalArquivo.replace(/^\//, '');
    return `${apiBase}/${caminho}`;
  })();

  const renderEstrelasLocatario = () => {
    if (!locatario) return '-';
    const nota = Number(locatario.pontuacaoMedia || 0);
    const total = Number(locatario.totalAvaliacoes || 0);
    if (total <= 0) return 'Sem avaliação';

    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
        <span style={{ display: 'inline-flex', gap: 2, color: '#f59e0b' }}>
          {renderStarIcons(nota, 13)}
        </span>
        <span>{`${nota.toFixed(1)} (${total})`}</span>
      </span>
    );
  };

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
              <InfoRow label="Avaliação" value={renderEstrelasLocatario()} />
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
          <InfoRow label="Valor da Locação" value={locacao.valorSemanal ? `R$ ${Number(locacao.valorSemanal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'} />
          <InfoRow label="Caução" value={locacao.caucao ? `R$ ${Number(locacao.caucao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'} />
          <InfoRow label="KM Entrada" value={locacao.kmEntrada ? Number(locacao.kmEntrada).toLocaleString() : '-'} />
        </div>
        <InfoRow label="KM Final" value={locacao.kmSaida ? Number(locacao.kmSaida).toLocaleString() : '-'} />
        <InfoRow label="Comprovante" value={locacao.comprovantePagamento || '-'} />
        {comprovanteUrl && (
          <div style={{ marginTop: 10 }}>
            <a
              href={comprovanteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm"
            >
              Abrir Comprovante
            </a>
          </div>
        )}
        <InfoRow label="Antecedentes" value={locacao.antecedenteCriminalArquivo || '-'} />
        {antecedenteUrl && (
          <div style={{ marginTop: 10 }}>
            <a
              href={antecedenteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm"
            >
              Abrir Antecedentes
            </a>
          </div>
        )}
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


