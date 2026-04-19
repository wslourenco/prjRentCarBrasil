import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Edit2, Trash2, X, Check, TrendingUp, TrendingDown, Download, FileSpreadsheet } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';

const CATEGORIAS_DESPESA = [
  'Proteção','Regularização','Patrocinador (Taxa)','Documentos','Infrações',
  'Manutenções Corretivas','Manutenções Preventivas','Manutenções por Desgaste',
  'Manutenção Pneus','Manutenção Estética','Despesas Variadas','Despesas Administrativas',
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
  periodoInicioSemanal: '',
  periodoFimSemanal: '',
  descricao: '',
  veiculoId: '',
  locatarioId: '',
  colaboradorId: '',
  formaPagamento: 'pix',
  comprovante: '',
  observacoes: '',
};

const CORES_DASHBOARD = ['#0e7490', '#4f46e5', '#dc2626', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#4338ca', '#be123c', '#15803d'];

function formatarMoedaBR(valor) {
  return `R$ ${Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function abreviarTexto(texto, limite = 24) {
  const valor = String(texto || '');
  return valor.length > limite ? `${valor.slice(0, limite - 1)}…` : valor;
}

function tokenArquivoSeguro(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'todos';
}

function normalizarMontadora(valor) {
  return String(valor || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizarTextoMojibake(valor) {
  if (typeof valor !== 'string') return valor;
  if (!/[ÃÂâ�├]/.test(valor)) return valor;

  const corrigidoSequencias = valor
    .replace(/├º/g, 'ç')
    .replace(/├ú/g, 'ã')
    .replace(/├®/g, 'é')
    .replace(/├¡/g, 'á')
    .replace(/├ó/g, 'ó')
    .replace(/├ô/g, 'õ')
    .replace(/├ê/g, 'ê')
    .replace(/├í/g, 'í')
    .replace(/├ç/g, 'Ç')
    .replace(/Manuten[cç][aã]oEst[ée]tica/gi, 'Manutenção Estética');

  try {
    const bytes = Uint8Array.from(corrigidoSequencias, (char) => char.charCodeAt(0) & 0xff);
    const convertido = new TextDecoder('utf-8').decode(bytes);
    return convertido || corrigidoSequencias;
  } catch {
    return corrigidoSequencias;
  }
}

function chaveComparacaoCategoria(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function distanciaLevenshtein(a, b) {
  const s = String(a || '');
  const t = String(b || '');
  const linhas = s.length + 1;
  const colunas = t.length + 1;
  const dp = Array.from({ length: linhas }, () => Array(colunas).fill(0));

  for (let i = 0; i < linhas; i += 1) dp[i][0] = i;
  for (let j = 0; j < colunas; j += 1) dp[0][j] = j;

  for (let i = 1; i < linhas; i += 1) {
    for (let j = 1; j < colunas; j += 1) {
      const custo = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + custo
      );
    }
  }

  return dp[s.length][t.length];
}

function normalizarCategoriaDespesa(valor) {
  const original = String(valor || '').trim();
  if (!original) return 'Sem categoria';

  const aposMojibake = normalizarTextoMojibake(original);
  const chaveOrigem = chaveComparacaoCategoria(aposMojibake);

  const exata = CATEGORIAS_DESPESA.find((categoria) => chaveComparacaoCategoria(categoria) === chaveOrigem);
  if (exata) return exata;

  const candidatos = CATEGORIAS_DESPESA.map((categoria) => ({
    categoria,
    chave: chaveComparacaoCategoria(categoria),
  }));

  let melhor = null;
  for (const candidato of candidatos) {
    const dist = distanciaLevenshtein(chaveOrigem, candidato.chave);
    const base = Math.max(candidato.chave.length, chaveOrigem.length) || 1;
    const score = 1 - (dist / base);
    if (!melhor || score > melhor.score) {
      melhor = { categoria: candidato.categoria, score };
    }
  }

  if (melhor && melhor.score >= 0.72) {
    return melhor.categoria;
  }

  return aposMojibake || original;
}

function categoriaLancamento(item) {
  if (!item) return 'Sem categoria';
  if (item.tipo === 'despesa') return normalizarCategoriaDespesa(item.categoria || 'Sem categoria');

  const valor = String(item.categoria || '').trim();
  return valor || 'Sem categoria';
}

function sanitizarObservacoesSemPeriodo(observacoes) {
  return String(observacoes || '')
    .replace(/(?:^|\n)Per[ií]odo semanal:\s*\d{4}-\d{2}-\d{2}\s*a\s*\d{4}-\d{2}-\d{2}(?=\n|$)/gi, '')
    .replace(/^\n+|\n+$/g, '');
}

function extrairPeriodoSemanalDeObservacoes(observacoes) {
  const texto = String(observacoes || '');
  const match = texto.match(/Per[ií]odo semanal:\s*(\d{4}-\d{2}-\d{2})\s*a\s*(\d{4}-\d{2}-\d{2})/i);
  return {
    inicio: match?.[1] || '',
    fim: match?.[2] || '',
    observacoesSemPeriodo: sanitizarObservacoesSemPeriodo(texto),
  };
}

function montarObservacoesComPeriodoSemanal(observacoes, categoria, inicio, fim) {
  const base = sanitizarObservacoesSemPeriodo(observacoes);
  const ehAluguelSemanal = String(categoria || '') === 'Aluguel Semanal';

  if (!ehAluguelSemanal || !inicio || !fim) return base;

  const linhaPeriodo = `Período semanal: ${inicio} a ${fim}`;
  return base ? `${base}\n${linhaPeriodo}` : linhaPeriodo;
}

export default function Financeiro() {
  const { despesasReceitas, addDespesaReceita, updateDespesaReceita, removeDespesaReceita, veiculos, locatarios, colaboradores, locacoes, usuarioLogado, carregarDados } = useApp();
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroVeiculo, setFiltroVeiculo] = useState('');
  const [filtroMontadora, setFiltroMontadora] = useState('');
  const [erroCrud, setErroCrud] = useState('');
  const [graficoInicio, setGraficoInicio] = useState('');
  const [graficoFim, setGraficoFim] = useState('');
  const [graficoStatus, setGraficoStatus] = useState('');
  const [graficoVeiculo, setGraficoVeiculo] = useState('');
  const [graficoMontadora, setGraficoMontadora] = useState('');
  const [paginaGrafico, setPaginaGrafico] = useState(1);
  const [itensPorPaginaGrafico, setItensPorPaginaGrafico] = useState('6');
  const [exportandoXlsx, setExportandoXlsx] = useState(false);
  const [ordenacao, setOrdenacao] = useState({ campo: 'data', direcao: 'desc' });
  const [atualizandoPesquisa, setAtualizandoPesquisa] = useState(false);
  const primeiroRefreshFiltro = useRef(true);

  function atualizarFiltroMontadora(valor) {
    setFiltroMontadora(valor);
    setGraficoMontadora(valor);
  }

  function abrirNovo(tipoInicial = 'receita') {
    setForm({ ...EMPTY, tipo: tipoInicial, categoria: tipoInicial === 'receita' ? CATEGORIAS_RECEITA[0] : CATEGORIAS_DESPESA[0] });
    setEditId(null); setModal(true); setErroCrud('');
  }
  function abrirEditar(d) {
    const periodo = extrairPeriodoSemanalDeObservacoes(d.observacoes || '');
    setForm({
      ...EMPTY,
      ...d,
      observacoes: periodo.observacoesSemPeriodo,
      periodoInicioSemanal: periodo.inicio,
      periodoFimSemanal: periodo.fim,
    });
    setEditId(d.id);
    setModal(true);
    setErroCrud('');
  }
  function fecharModal() { setModal(false); setEditId(null); setErroCrud(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    setErroCrud('');

    const precisaPeriodoSemanal = form.tipo === 'receita' && form.categoria === 'Aluguel Semanal';
    if (precisaPeriodoSemanal && (!form.periodoInicioSemanal || !form.periodoFimSemanal)) {
      setErroCrud('Para Aluguel Semanal, informe data de início e data final.');
      return;
    }

    const payload = {
      ...form,
      observacoes: montarObservacoesComPeriodoSemanal(
        form.observacoes,
        form.categoria,
        form.periodoInicioSemanal,
        form.periodoFimSemanal
      ),
    };

    delete payload.periodoInicioSemanal;
    delete payload.periodoFimSemanal;

    try {
      if (editId) await updateDespesaReceita(editId, payload);
      else await addDespesaReceita(payload);
      fecharModal();
    } catch (err) {
      setErroCrud(err.message || 'Erro ao salvar. Tente novamente.');
    }
  }

  function f(field) {
    return { value: form[field] || '', onChange: e => setForm({ ...form, [field]: e.target.value }) };
  }

  function alternarOrdenacao(campo) {
    setOrdenacao(prev => {
      if (prev.campo === campo) {
        return { campo, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' };
      }
      const direcaoPadrao = campo === 'data' || campo === 'valor' ? 'desc' : 'asc';
      return { campo, direcao: direcaoPadrao };
    });
  }

  function indicadorOrdenacao(campo) {
    if (ordenacao.campo !== campo) return ' -';
    return ordenacao.direcao === 'asc' ? ' ^' : ' v';
  }

  const veiculosCatalogo = useMemo(() => {
    const mapa = new Map();

    const upsert = (id, dados) => {
      const chave = String(id || '').trim();
      if (!chave) return;

      const atual = mapa.get(chave) || { id: chave, marca: '', modelo: '', placa: '', nome: '' };
      const proximo = {
        ...atual,
        marca: String(dados?.marca || '').trim() || atual.marca,
        modelo: String(dados?.modelo || '').trim() || atual.modelo,
        placa: String(dados?.placa || '').trim() || atual.placa,
        nome: String(dados?.nome || '').trim() || atual.nome,
      };
      mapa.set(chave, proximo);
    };

    veiculos.forEach((v) => {
      upsert(v.id, {
        marca: v.marca,
        modelo: v.modelo,
        placa: v.placa,
        nome: `${v.marca || ''} ${v.modelo || ''}`.trim(),
      });
    });

    locacoes.forEach((loc) => {
      const nome = String(loc.nomeVeiculo || '').trim();
      const partes = nome.split(' ').filter(Boolean);
      upsert(loc.veiculoId, {
        marca: partes[0] || '',
        modelo: partes.slice(1).join(' '),
        placa: loc.placa,
        nome,
      });
    });

    despesasReceitas.forEach((item) => {
      const nome = String(item.nomeVeiculo || '').trim();
      const partes = nome.split(' ').filter(Boolean);
      upsert(item.veiculoId, {
        marca: item.marcaVeiculo || partes[0] || '',
        modelo: partes.slice(1).join(' '),
        placa: item.placaVeiculo,
        nome,
      });
    });

    return Array.from(mapa.values()).sort((a, b) => {
      const nomeA = `${a.marca || ''} ${a.modelo || ''} ${a.placa || ''}`.trim();
      const nomeB = `${b.marca || ''} ${b.modelo || ''} ${b.placa || ''}`.trim();
      return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
    });
  }, [veiculos, locacoes, despesasReceitas]);

  const veiculosCatalogoPorId = useMemo(
    () => new Map(veiculosCatalogo.map(v => [String(v.id), v])),
    [veiculosCatalogo]
  );

  const marcaPorVeiculoId = useMemo(() => {
    return new Map(veiculosCatalogo.map(v => [String(v.id), String(v.marca || '').trim()]));
  }, [veiculosCatalogo]);

  const nomeVeiculo = useCallback((id) => {
    const v = veiculosCatalogoPorId.get(String(id));
    if (!v) return '-';
    const prefixo = `${v.marca || ''} ${v.modelo || ''}`.trim() || v.nome || 'Veículo';
    return v.placa ? `${prefixo} – ${v.placa}` : prefixo;
  }, [veiculosCatalogoPorId]);

  const montadorasDisponiveis = useMemo(() => {
    // Para locatário, mostrar apenas montadoras dos veículos que ele tem locados
    if (usuarioLogado?.perfil === 'locatario') {
      // Veículos que o locatário já locou (ativos ou históricos)
      const veiculosLocados = locacoesEscopo
        .filter(loc => String(loc.locatarioId) === String(usuarioLogado.id))
        .map(loc => String(loc.veiculoId));
      const setVeiculosLocados = new Set(veiculosLocados);
      const montadoras = veiculosCatalogo
        .filter(v => setVeiculosLocados.has(String(v.id)))
        .map(v => String(v.marca || '').trim())
        .filter(Boolean);
      return Array.from(new Set(montadoras)).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    }
    // Para outros perfis, mantém comportamento anterior
    const montadorasVeiculos = veiculosCatalogo
      .map(v => String(v.marca || '').trim())
      .filter(Boolean);
    const montadorasFinanceiro = despesasReceitas
      .map(d => String(d.marcaVeiculo || '').trim())
      .filter(Boolean);
    const montadoras = [...montadorasVeiculos, ...montadorasFinanceiro];
    return Array.from(new Set(montadoras)).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }, [veiculosCatalogo, despesasReceitas, locacoesEscopo, usuarioLogado]);

  const idsVeiculosEscopoLocador = useMemo(
    () => new Set(veiculos.map(v => String(v.id))),
    [veiculos]
  );

  const despesasReceitasEscopo = useMemo(() => {
    if (usuarioLogado?.perfil !== 'locador') return despesasReceitas;
    return despesasReceitas.filter(d => idsVeiculosEscopoLocador.has(String(d.veiculoId || '')));
  }, [despesasReceitas, idsVeiculosEscopoLocador, usuarioLogado?.perfil]);

  const locacoesEscopo = useMemo(() => {
    if (usuarioLogado?.perfil !== 'locador') return locacoes;
    return locacoes.filter(loc => idsVeiculosEscopoLocador.has(String(loc.veiculoId || '')));
  }, [locacoes, idsVeiculosEscopoLocador, usuarioLogado?.perfil]);

  const idsVeiculosLocatarioAtivos = useMemo(() => {
    if (usuarioLogado?.perfil !== 'locatario') return null;

    return new Set(
      locacoesEscopo
        .filter((loc) => String(loc.status || '').toLowerCase() === 'ativa')
        .map((loc) => String(loc.veiculoId || ''))
        .filter(Boolean)
    );
  }, [locacoesEscopo, usuarioLogado?.perfil]);

  const veiculosCombo = useMemo(() => {
    if (usuarioLogado?.perfil !== 'locatario') return veiculosCatalogo;
    const ativos = idsVeiculosLocatarioAtivos || new Set();
    return veiculosCatalogo.filter((v) => ativos.has(String(v.id || '')));
  }, [veiculosCatalogo, usuarioLogado?.perfil, idsVeiculosLocatarioAtivos]);

  const lista = useMemo(() => {
    const valorOrdenacao = (item, campo) => {
      if (campo === 'data') {
        const ms = new Date(`${item.data || ''}T12:00:00`).getTime();
        return Number.isNaN(ms) ? 0 : ms;
      }
      if (campo === 'tipo') return String(item.tipo || '').toLowerCase();
      if (campo === 'categoria') return String(item.categoria || '').toLowerCase();
      if (campo === 'descricao') return String(item.descricao || '').toLowerCase();
      if (campo === 'veiculo') return String(nomeVeiculo(item.veiculoId) || '').toLowerCase();
      if (campo === 'formaPagamento') return String(item.formaPagamento || '').toLowerCase();
      if (campo === 'valor') return Number(item.valor || 0);
      return '';
    };

    const filtrada = despesasReceitasEscopo.filter(d => {
      if (filtroTipo && d.tipo !== filtroTipo) return false;
      if (filtroVeiculo && String(d.veiculoId) !== String(filtroVeiculo)) return false;
      if (filtroMontadora) {
        const montadora = marcaPorVeiculoId.get(String(d.veiculoId || '')) || String(d.marcaVeiculo || '').trim();
        if (normalizarMontadora(montadora) !== normalizarMontadora(filtroMontadora)) return false;
      }
      return true;
    });

    const fator = ordenacao.direcao === 'asc' ? 1 : -1;
    const ordenada = [...filtrada].sort((a, b) => {
      const valorA = valorOrdenacao(a, ordenacao.campo);
      const valorB = valorOrdenacao(b, ordenacao.campo);

      if (typeof valorA === 'number' && typeof valorB === 'number') {
        if (valorA !== valorB) return (valorA - valorB) * fator;
      } else {
        const comparacao = String(valorA).localeCompare(String(valorB), 'pt-BR', { sensitivity: 'base' });
        if (comparacao !== 0) return comparacao * fator;
      }

      return Number(b.id || 0) - Number(a.id || 0);
    });

    return ordenada;
  }, [despesasReceitasEscopo, filtroTipo, filtroVeiculo, filtroMontadora, ordenacao, marcaPorVeiculoId, nomeVeiculo]);

  const totalReceitas = lista.filter(d => d.tipo === 'receita').reduce((s, d) => s + Number(d.valor || 0), 0);
  const totalDespesas = lista.filter(d => d.tipo === 'despesa').reduce((s, d) => s + Number(d.valor || 0), 0);
  const saldo = totalReceitas - totalDespesas;

  const resumoPorLocacao = useMemo(() => {
    const dataInicioMs = graficoInicio ? new Date(`${graficoInicio}T00:00:00`).getTime() : null;
    const dataFimMs = graficoFim ? new Date(`${graficoFim}T23:59:59`).getTime() : null;

    const withinPeriodo = (dataStr) => {
      if (!dataStr) return true;
      const ms = new Date(`${dataStr}T12:00:00`).getTime();
      if (Number.isNaN(ms)) return true;
      if (dataInicioMs && ms < dataInicioMs) return false;
      if (dataFimMs && ms > dataFimMs) return false;
      return true;
    };

    const locacoesFiltradas = locacoesEscopo.filter(loc => {
      if (graficoStatus && loc.status !== graficoStatus) return false;
      if (graficoVeiculo && String(loc.veiculoId) !== String(graficoVeiculo)) return false;
      if (graficoMontadora) {
        const montadora = marcaPorVeiculoId.get(String(loc.veiculoId || '')) || '';
        if (normalizarMontadora(montadora) !== normalizarMontadora(graficoMontadora)) return false;
      }
      return withinPeriodo(loc.dataInicio);
    });

    const movimentosFiltrados = despesasReceitasEscopo
      .filter(d => withinPeriodo(d.data))
      .filter(d => {
        if (!graficoMontadora) return true;
        const montadora = marcaPorVeiculoId.get(String(d.veiculoId || '')) || String(d.marcaVeiculo || '').trim();
        return normalizarMontadora(montadora) === normalizarMontadora(graficoMontadora);
      });

    const resumoBase = locacoesFiltradas.map(loc => {
      const receitas = movimentosFiltrados
        .filter(d => d.tipo === 'receita' && String(d.veiculoId) === String(loc.veiculoId) && String(d.locatarioId || '') === String(loc.locatarioId || ''))
        .reduce((acc, d) => acc + Number(d.valor || 0), 0);

      const despesas = movimentosFiltrados
        .filter(d => d.tipo === 'despesa' && String(d.veiculoId || '') === String(loc.veiculoId || ''))
        .reduce((acc, d) => acc + Number(d.valor || 0), 0);

      return {
        id: loc.id,
        veiculoId: loc.veiculoId,
        titulo: `${loc.nomeVeiculo || loc.placa || `Locação #${loc.id}`}`,
        receita: receitas,
        despesa: despesas,
        lucro: receitas - despesas,
      };
    });

    const chavesComLocacao = new Set(
      locacoesFiltradas.map(loc => `${String(loc.veiculoId || '')}::${String(loc.locatarioId || '')}`)
    );

    const resumoFallback = movimentosFiltrados
      .filter((mov) => {
        if (!mov?.veiculoId) return false;
        if (graficoVeiculo && String(mov.veiculoId) !== String(graficoVeiculo)) return false;

        const chave = `${String(mov.veiculoId || '')}::${String(mov.locatarioId || '')}`;
        return !chavesComLocacao.has(chave);
      })
      .reduce((acc, mov) => {
        const chave = `${String(mov.veiculoId || '')}::${String(mov.locatarioId || '')}`;
        if (!acc[chave]) {
          acc[chave] = {
            id: `veiculo-${String(mov.veiculoId || '')}-${String(mov.locatarioId || '0')}`,
            veiculoId: mov.veiculoId,
            titulo: nomeVeiculo(mov.veiculoId),
            receita: 0,
            despesa: 0,
            lucro: 0,
          };
        }

        if (mov.tipo === 'receita') acc[chave].receita += Number(mov.valor || 0);
        if (mov.tipo === 'despesa') acc[chave].despesa += Number(mov.valor || 0);
        acc[chave].lucro = acc[chave].receita - acc[chave].despesa;
        return acc;
      }, {});

    const resumoConsolidadoPorVeiculo = [...resumoBase, ...Object.values(resumoFallback)]
      .reduce((acc, item) => {
        const chave = String(item.veiculoId || item.id || '');
        if (!chave) return acc;

        if (!acc[chave]) {
          acc[chave] = {
            id: `veiculo-${chave}`,
            veiculoId: item.veiculoId,
            titulo: item.titulo,
            receita: 0,
            despesa: 0,
            lucro: 0,
          };
        }

        acc[chave].receita += Number(item.receita || 0);
        acc[chave].despesa = Math.max(Number(acc[chave].despesa || 0), Number(item.despesa || 0));
        acc[chave].lucro = acc[chave].receita - acc[chave].despesa;
        return acc;
      }, {});

    return Object.values(resumoConsolidadoPorVeiculo)
      .filter(item => item.receita > 0 || item.despesa > 0)
      .sort((a, b) => b.lucro - a.lucro);
  }, [despesasReceitasEscopo, locacoesEscopo, graficoInicio, graficoFim, graficoStatus, graficoVeiculo, graficoMontadora, marcaPorVeiculoId, nomeVeiculo]);

  const despesasDetalhadasCategoria = useMemo(() => {
    const dataInicioMs = graficoInicio ? new Date(`${graficoInicio}T00:00:00`).getTime() : null;
    const dataFimMs = graficoFim ? new Date(`${graficoFim}T23:59:59`).getTime() : null;

    const withinPeriodo = (dataStr) => {
      if (!dataStr) return true;
      const ms = new Date(`${dataStr}T12:00:00`).getTime();
      if (Number.isNaN(ms)) return true;
      if (dataInicioMs && ms < dataInicioMs) return false;
      if (dataFimMs && ms > dataFimMs) return false;
      return true;
    };

    const locacoesFiltradasPorStatus = locacoesEscopo.filter(loc => {
      if (!graficoStatus) return false;
      if (loc.status !== graficoStatus) return false;
      if (graficoVeiculo && String(loc.veiculoId) !== String(graficoVeiculo)) return false;
      if (graficoMontadora) {
        const montadora = marcaPorVeiculoId.get(String(loc.veiculoId || '')) || '';
        if (normalizarMontadora(montadora) !== normalizarMontadora(graficoMontadora)) return false;
      }
      return withinPeriodo(loc.dataInicio);
    });

    const veiculosComStatus = new Set(locacoesFiltradasPorStatus.map(loc => String(loc.veiculoId)));

    const acumulado = despesasReceitasEscopo
      .filter(d => d.tipo === 'despesa' && withinPeriodo(d.data))
      .filter(d => {
        if (graficoVeiculo && String(d.veiculoId || '') !== String(graficoVeiculo)) return false;
        if (graficoMontadora) {
          const montadora = marcaPorVeiculoId.get(String(d.veiculoId || '')) || String(d.marcaVeiculo || '').trim();
          if (normalizarMontadora(montadora) !== normalizarMontadora(graficoMontadora)) return false;
        }
        if (graficoStatus && !veiculosComStatus.has(String(d.veiculoId || ''))) return false;
        return true;
      })
      .reduce((acc, d) => {
        const categoria = categoriaLancamento(d);
        if (!acc[categoria]) {
          acc[categoria] = { categoria, valor: 0, quantidade: 0 };
        }
        acc[categoria].valor += Number(d.valor || 0);
        acc[categoria].quantidade += 1;
        return acc;
      }, {});

    return Object.values(acumulado)
      .map((item) => ({
        ...item,
        categoriaCurta: abreviarTexto(item.categoria, 26),
        ticketMedio: item.quantidade > 0 ? item.valor / item.quantidade : 0,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [despesasReceitasEscopo, locacoesEscopo, graficoInicio, graficoFim, graficoStatus, graficoVeiculo, graficoMontadora, marcaPorVeiculoId]);

  const lucrosDetalhados = useMemo(() => {
    return resumoPorLocacao
      .map((item) => {
        const margem = item.receita > 0 ? ((item.lucro / item.receita) * 100) : null;
        return {
          ...item,
          tituloCurto: abreviarTexto(item.titulo, 28),
          margem,
        };
      })
      .sort((a, b) => b.lucro - a.lucro);
  }, [resumoPorLocacao]);

  const lucrosDetalhadosGrafico = useMemo(() => lucrosDetalhados.slice(0, 12), [lucrosDetalhados]);

  const locacaoById = useMemo(() => {
    return new Map(locacoesEscopo.map(loc => [String(loc.id), loc]));
  }, [locacoesEscopo]);

  const sufixoExportacao = useMemo(() => {
    const periodoInicio = graficoInicio || 'inicio-aberto';
    const periodoFim = graficoFim || 'fim-aberto';
    const status = graficoStatus || 'todos';
    const montadora = graficoMontadora || 'todas';
    const veiculoSelecionado = veiculosCatalogo.find((v) => String(v.id) === String(graficoVeiculo));
    const veiculo = veiculoSelecionado?.placa || 'todos';

    return [
      `de-${tokenArquivoSeguro(periodoInicio)}`,
      `ate-${tokenArquivoSeguro(periodoFim)}`,
      `status-${tokenArquivoSeguro(status)}`,
      `montadora-${tokenArquivoSeguro(montadora)}`,
      `veiculo-${tokenArquivoSeguro(veiculo)}`,
    ].join('__');
  }, [graficoInicio, graficoFim, graficoStatus, graficoMontadora, graficoVeiculo, veiculosCatalogo]);

  function exportarGraficosCsv() {
    if (resumoPorLocacao.length === 0 && despesasDetalhadasCategoria.length === 0 && lucrosDetalhados.length === 0) {
      alert('Não há dados filtrados para exportar.');
      return;
    }

    const secoes = [];

    const linhasLocacoes = [
      [
        'SECAO: RESUMO POR LOCACAO',
      ].join(';'),
      [
        'Locacao ID',
        'Veiculo',
        'Status',
        'Data Inicio',
        'Data Previsao Fim',
        'Receita',
        'Despesa',
        'Lucro',
      ].join(';')
    ];

    resumoPorLocacao.forEach(item => {
      const loc = locacaoById.get(String(item.id));
      linhasLocacoes.push([
        item.id,
        csvEscape(item.titulo),
        csvEscape(loc?.status || ''),
        csvEscape(loc?.dataInicio || ''),
        csvEscape(loc?.dataPrevisaoFim || ''),
        Number(item.receita || 0).toFixed(2),
        Number(item.despesa || 0).toFixed(2),
        Number(item.lucro || 0).toFixed(2),
      ].join(';'));
    });

    const linhasDespesasCategoria = [
      ['SECAO: DESPESAS DETALHADAS POR CATEGORIA'].join(';'),
      ['Categoria', 'Quantidade', 'Ticket Medio', 'Total'].join(';')
    ];

    despesasDetalhadasCategoria.forEach(item => {
      linhasDespesasCategoria.push([
        csvEscape(item.categoria),
        item.quantidade,
        Number(item.ticketMedio || 0).toFixed(2),
        Number(item.valor || 0).toFixed(2),
      ].join(';'));
    });

    const linhasLucrosDetalhados = [
      ['SECAO: LUCROS DETALHADOS POR LOCACAO'].join(';'),
      ['Locacao ID', 'Veiculo', 'Receita', 'Despesa', 'Lucro', 'Margem (%)'].join(';')
    ];

    lucrosDetalhados.forEach(item => {
      linhasLucrosDetalhados.push([
        item.id,
        csvEscape(item.titulo),
        Number(item.receita || 0).toFixed(2),
        Number(item.despesa || 0).toFixed(2),
        Number(item.lucro || 0).toFixed(2),
        item.margem == null ? '' : Number(item.margem).toFixed(2),
      ].join(';'));
    });

    secoes.push(linhasLocacoes.join('\n'));
    secoes.push(linhasDespesasCategoria.join('\n'));
    secoes.push(linhasLucrosDetalhados.join('\n'));

    const csvContent = `\uFEFF${secoes.join('\n\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `graficos-locacoes-${new Date().toISOString().slice(0, 10)}--${sufixoExportacao}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function exportarGraficosXlsx() {
    if (resumoPorLocacao.length === 0 && despesasDetalhadasCategoria.length === 0 && lucrosDetalhados.length === 0) {
      alert('Não há dados filtrados para exportar.');
      return;
    }

    setExportandoXlsx(true);
    try {
      const XLSX = await import('xlsx-js-style');
      const agora = new Date();

      const detalhes = resumoPorLocacao.map(item => {
        const loc = locacaoById.get(String(item.id));
        return {
          'Locação ID': item.id,
          'Veículo': item.titulo,
          'Status': loc?.status || '',
          'Data Início': loc?.dataInicio || '',
          'Data Previsão Fim': loc?.dataPrevisaoFim || '',
          'Receita': Number(item.receita || 0),
          'Despesa': Number(item.despesa || 0),
          'Lucro': Number(item.lucro || 0),
        };
      });

      const despesasCategoria = despesasDetalhadasCategoria.map((item) => ({
        'Categoria': item.categoria,
        'Quantidade': Number(item.quantidade || 0),
        'Ticket Médio': Number(item.ticketMedio || 0),
        'Total Despesa': Number(item.valor || 0),
      }));

      const lucrosLocacao = lucrosDetalhados.map((item) => ({
        'Locação ID': item.id,
        'Veículo': item.titulo,
        'Receita': Number(item.receita || 0),
        'Despesa': Number(item.despesa || 0),
        'Lucro': Number(item.lucro || 0),
        'Margem (%)': item.margem == null ? null : Number(item.margem),
      }));

      const totalReceitasResumo = resumoPorLocacao.reduce((acc, row) => acc + Number(row.receita || 0), 0);
      const totalDespesasResumo = resumoPorLocacao.reduce((acc, row) => acc + Number(row.despesa || 0), 0);
      const totalLucroResumo = resumoPorLocacao.reduce((acc, row) => acc + Number(row.lucro || 0), 0);

      const resumo = [
        { Campo: 'Gerado em', Valor: agora.toLocaleString('pt-BR') },
        { Campo: 'Total de locações no relatório', Valor: resumoPorLocacao.length },
        { Campo: 'Filtro de início', Valor: graficoInicio || 'Não aplicado' },
        { Campo: 'Filtro de fim', Valor: graficoFim || 'Não aplicado' },
        { Campo: 'Filtro de status', Valor: graficoStatus || 'Não aplicado' },
        { Campo: 'Filtro de montadora', Valor: graficoMontadora || 'Não aplicado' },
        { Campo: 'Filtro de veículo', Valor: graficoVeiculo ? (nomeVeiculo(graficoVeiculo) || graficoVeiculo) : 'Não aplicado' },
        { Campo: 'Total de receitas', Valor: totalReceitasResumo },
        { Campo: 'Total de despesas', Valor: totalDespesasResumo },
        { Campo: 'Lucro total', Valor: totalLucroResumo },
      ];

      const wb = XLSX.utils.book_new();
      const wsDetalhes = XLSX.utils.json_to_sheet(detalhes);
      const wsResumo = XLSX.utils.json_to_sheet(resumo);
      const wsDespesasCategoria = XLSX.utils.json_to_sheet(despesasCategoria);
      const wsLucrosLocacao = XLSX.utils.json_to_sheet(lucrosLocacao);

      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4B5563' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      ['A','B','C','D','E','F','G','H'].forEach(coluna => {
        const ref = `${coluna}1`;
        if (wsDetalhes[ref]) wsDetalhes[ref].s = headerStyle;
      });

      ['A','B'].forEach(coluna => {
        const ref = `${coluna}1`;
        if (wsResumo[ref]) wsResumo[ref].s = headerStyle;
      });

      ['A','B','C','D'].forEach(coluna => {
        const ref = `${coluna}1`;
        if (wsDespesasCategoria[ref]) wsDespesasCategoria[ref].s = headerStyle;
      });

      ['A','B','C','D','E','F'].forEach(coluna => {
        const ref = `${coluna}1`;
        if (wsLucrosLocacao[ref]) wsLucrosLocacao[ref].s = headerStyle;
      });

      const moedaFmt = '"R$" #,##0.00';

      // Formata Receita, Despesa e Lucro na aba Detalhes (F, G, H)
      for (let linha = 2; linha <= detalhes.length + 1; linha += 1) {
        ['F', 'G', 'H'].forEach(coluna => {
          const ref = `${coluna}${linha}`;
          if (wsDetalhes[ref] && typeof wsDetalhes[ref].v === 'number') {
            wsDetalhes[ref].z = moedaFmt;
          }
        });
      }

      // Formata totais monetários na aba Resumo (coluna B)
      for (let linha = 2; linha <= resumo.length + 1; linha += 1) {
        const ref = `B${linha}`;
        if (wsResumo[ref] && typeof wsResumo[ref].v === 'number') {
          wsResumo[ref].z = moedaFmt;
        }
      }

      // Formata ticket médio e total na aba Despesas por Categoria (C, D)
      for (let linha = 2; linha <= despesasCategoria.length + 1; linha += 1) {
        ['C', 'D'].forEach(coluna => {
          const ref = `${coluna}${linha}`;
          if (wsDespesasCategoria[ref] && typeof wsDespesasCategoria[ref].v === 'number') {
            wsDespesasCategoria[ref].z = moedaFmt;
          }
        });
      }

      // Formata receita, despesa e lucro na aba Lucros por Locação (C, D, E)
      for (let linha = 2; linha <= lucrosLocacao.length + 1; linha += 1) {
        ['C', 'D', 'E'].forEach(coluna => {
          const ref = `${coluna}${linha}`;
          if (wsLucrosLocacao[ref] && typeof wsLucrosLocacao[ref].v === 'number') {
            wsLucrosLocacao[ref].z = moedaFmt;
          }
        });

        const margemRef = `F${linha}`;
        if (wsLucrosLocacao[margemRef] && typeof wsLucrosLocacao[margemRef].v === 'number') {
          wsLucrosLocacao[margemRef].z = '0.00';
        }
      }

      wsDetalhes['!cols'] = [
        { wch: 12 },
        { wch: 38 },
        { wch: 14 },
        { wch: 14 },
        { wch: 18 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
      ];

      // Congela a primeira linha (cabeçalho) e habilita autofiltro na aba Detalhes
      wsDetalhes['!freeze'] = { xSplit: 0, ySplit: 1 };
      wsDetalhes['!autofilter'] = { ref: `A1:H${Math.max(detalhes.length + 1, 2)}` };

      wsResumo['!cols'] = [
        { wch: 32 },
        { wch: 26 },
      ];

      wsDespesasCategoria['!cols'] = [
        { wch: 34 },
        { wch: 12 },
        { wch: 16 },
        { wch: 18 },
      ];

      wsLucrosLocacao['!cols'] = [
        { wch: 12 },
        { wch: 40 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
      ];

      wsDespesasCategoria['!freeze'] = { xSplit: 0, ySplit: 1 };
      wsDespesasCategoria['!autofilter'] = { ref: `A1:D${Math.max(despesasCategoria.length + 1, 2)}` };

      wsLucrosLocacao['!freeze'] = { xSplit: 0, ySplit: 1 };
      wsLucrosLocacao['!autofilter'] = { ref: `A1:F${Math.max(lucrosLocacao.length + 1, 2)}` };

      XLSX.utils.book_append_sheet(wb, wsDetalhes, 'Detalhes');
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
      XLSX.utils.book_append_sheet(wb, wsDespesasCategoria, 'Despesas Categoria');
      XLSX.utils.book_append_sheet(wb, wsLucrosLocacao, 'Lucros Locação');

      const dataArquivo = agora.toISOString().slice(0, 10);
      XLSX.writeFile(wb, `graficos-locacoes-${dataArquivo}--${sufixoExportacao}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Não foi possível exportar o XLSX.');
    } finally {
      setExportandoXlsx(false);
    }
  }

  useEffect(() => {
    setPaginaGrafico(1);
  }, [graficoInicio, graficoFim, graficoStatus, graficoMontadora, graficoVeiculo, itensPorPaginaGrafico]);

  useEffect(() => {
    setFiltroVeiculo(graficoVeiculo);
  }, [graficoVeiculo]);

  useEffect(() => {
    const idsCombo = new Set(veiculosCombo.map((v) => String(v.id || '')));

    if (filtroVeiculo && !idsCombo.has(String(filtroVeiculo))) {
      setFiltroVeiculo('');
    }

    if (graficoVeiculo && !idsCombo.has(String(graficoVeiculo))) {
      setGraficoVeiculo('');
    }

    if (form.veiculoId && !idsCombo.has(String(form.veiculoId))) {
      setForm((prev) => ({ ...prev, veiculoId: '' }));
    }
  }, [veiculosCombo, filtroVeiculo, graficoVeiculo, form.veiculoId]);

  useEffect(() => {
    if (primeiroRefreshFiltro.current) {
      primeiroRefreshFiltro.current = false;
      return;
    }

    let ativo = true;
    const timer = setTimeout(async () => {
      try {
        if (ativo) setAtualizandoPesquisa(true);
        await carregarDados();
      } finally {
        if (ativo) setAtualizandoPesquisa(false);
      }
    }, 250);

    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [filtroTipo, filtroVeiculo, filtroMontadora, graficoInicio, graficoFim, graficoStatus, graficoMontadora, graficoVeiculo, carregarDados]);

  const itensPorPaginaAtual = Number(itensPorPaginaGrafico) || 6;
  const totalPaginasGrafico = Math.max(1, Math.ceil(resumoPorLocacao.length / itensPorPaginaAtual));
  const paginaAtualGrafico = Math.min(paginaGrafico, totalPaginasGrafico);
  const resumoPaginado = resumoPorLocacao.slice(
    (paginaAtualGrafico - 1) * itensPorPaginaAtual,
    paginaAtualGrafico * itensPorPaginaAtual
  );

  return (
    <div className="page-content">
      <div className="flex-between mb-24">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>Despesas & Receitas</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>Controle financeiro de locações e manutenções</p>
          {atualizandoPesquisa && <p style={{ color: 'var(--gray-500)', fontSize: 12, marginTop: 6 }}>Atualizando pesquisa...</p>}
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

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Gráficos de Pizza 3D por Locação</span>
          <div className="flex" style={{ gap: 8 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={exportarGraficosXlsx} disabled={exportandoXlsx}>
              <FileSpreadsheet size={14} /> {exportandoXlsx ? 'Exportando XLSX...' : 'Exportar XLSX'}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={exportarGraficosCsv}>
              <Download size={14} /> Exportar CSV
            </button>
            <span className="badge badge-blue">{resumoPorLocacao.length} locação(ões)</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: 150 }}>
            <label>Início</label>
            <input type="date" value={graficoInicio} onChange={e => setGraficoInicio(e.target.value)} />
          </div>
          <div className="form-group" style={{ minWidth: 150 }}>
            <label>Fim</label>
            <input type="date" value={graficoFim} onChange={e => setGraficoFim(e.target.value)} />
          </div>
          <div className="form-group" style={{ minWidth: 160 }}>
            <label>Status da locação</label>
            <select value={graficoStatus} onChange={e => setGraficoStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="ativa">Ativa</option>
              <option value="encerrada">Encerrada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div className="form-group" style={{ minWidth: 220, flex: 1 }}>
            <label>Montadora</label>
            <select value={graficoMontadora} onChange={e => atualizarFiltroMontadora(e.target.value)}>
              <option value="">Todas as montadoras</option>
              {montadorasDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ minWidth: 220, flex: 1 }}>
            <label>Veículo</label>
            <select value={graficoVeiculo} onChange={e => setGraficoVeiculo(e.target.value)}>
              <option value="">Todos os veículos</option>
              {veiculosCombo.map(v => <option key={v.id} value={v.id}>{nomeVeiculo(v.id)}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ minWidth: 140 }}>
            <label>Itens por página</label>
            <select value={itensPorPaginaGrafico} onChange={e => setItensPorPaginaGrafico(e.target.value)}>
              <option value="3">3</option>
              <option value="6">6</option>
              <option value="9">9</option>
              <option value="12">12</option>
            </select>
          </div>
        </div>

        {resumoPorLocacao.length === 0 ? (
          <div className="empty-state"><TrendingUp size={32} /><p>Sem dados suficientes para gerar gráficos por locação.</p></div>
        ) : (
          <>
            <div className="locacao-pies-grid">
              {resumoPaginado.map(item => (
                <LocacaoPizza3D key={item.id} item={item} />
              ))}
            </div>
            <div className="grafico-pagination">
              <button className="btn btn-outline btn-sm" type="button" disabled={paginaAtualGrafico <= 1} onClick={() => setPaginaGrafico(p => Math.max(1, p - 1))}>
                Anterior
              </button>
              <span>Página {paginaAtualGrafico} de {totalPaginasGrafico}</span>
              <button className="btn btn-outline btn-sm" type="button" disabled={paginaAtualGrafico >= totalPaginasGrafico} onClick={() => setPaginaGrafico(p => Math.min(totalPaginasGrafico, p + 1))}>
                Próxima
              </button>
            </div>
          </>
        )}
      </div>

      <div className="grafico-detalhes-grid" style={{ marginBottom: 16 }}>
        <div className="card grafico-detalhe-card">
          <div className="card-header">
            <span className="card-title">Despesas Detalhadas por Categoria</span>
            <span className="badge badge-red">{despesasDetalhadasCategoria.length} categorias</span>
          </div>

          {despesasDetalhadasCategoria.length === 0 ? (
            <div className="empty-state"><TrendingDown size={30} /><p>Sem despesas no período para detalhar.</p></div>
          ) : (
            <div className="grafico-detalhe-layout">
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={despesasDetalhadasCategoria.slice(0, 12)} layout="vertical" margin={{ top: 6, right: 16, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(valor) => `R$ ${Number(valor || 0).toLocaleString('pt-BR')}`} />
                    <YAxis type="category" dataKey="categoriaCurta" width={148} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(valor) => formatarMoedaBR(valor)}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.categoria || label}
                    />
                    <Bar dataKey="valor" radius={[0, 7, 7, 0]}>
                      {despesasDetalhadasCategoria.slice(0, 12).map((item, idx) => (
                        <Cell key={`${item.categoria}-${idx}`} fill={CORES_DASHBOARD[idx % CORES_DASHBOARD.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="detalhe-lista">
                {despesasDetalhadasCategoria.slice(0, 8).map((item, idx) => (
                  <div className="detalhe-item" key={`${item.categoria}-${idx}`}>
                    <div>
                      <div className="detalhe-item-title">{item.categoria}</div>
                      <div className="detalhe-item-sub">{item.quantidade} lançamento(s) • Ticket médio: {formatarMoedaBR(item.ticketMedio)}</div>
                    </div>
                    <div className="detalhe-item-value">{formatarMoedaBR(item.valor)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card grafico-detalhe-card">
          <div className="card-header">
            <span className="card-title">Lucros Detalhados por Locação</span>
            <span className="badge badge-blue">{lucrosDetalhados.length} locação(ões)</span>
          </div>

          {lucrosDetalhados.length === 0 ? (
            <div className="empty-state"><TrendingUp size={30} /><p>Sem dados de lucro para o recorte selecionado.</p></div>
          ) : (
            <>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={lucrosDetalhadosGrafico} layout="vertical" margin={{ top: 6, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(valor) => `R$ ${Number(valor || 0).toLocaleString('pt-BR')}`} />
                    <YAxis type="category" dataKey="tituloCurto" width={166} tick={{ fontSize: 11 }} />
                    <ReferenceLine x={0} stroke="#9ca3af" />
                    <Tooltip
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.titulo || label}
                      formatter={(valor, name, itemTooltip) => {
                        if (name === 'lucro') return [formatarMoedaBR(valor), 'Lucro'];
                        if (name === 'receita') return [formatarMoedaBR(itemTooltip?.payload?.receita), 'Receita'];
                        if (name === 'despesa') return [formatarMoedaBR(itemTooltip?.payload?.despesa), 'Despesa'];
                        return [valor, name];
                      }}
                    />
                    <Bar dataKey="lucro" name="lucro" radius={[0, 7, 7, 0]}>
                      {lucrosDetalhadosGrafico.map((item) => (
                        <Cell key={`lucro-${item.id}`} fill={item.lucro >= 0 ? '#16a34a' : '#dc2626'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="detalhe-table-wrapper">
                <table className="detalhe-table">
                  <thead>
                    <tr>
                      <th>Locação</th>
                      <th className="text-right">Receita</th>
                      <th className="text-right">Despesa</th>
                      <th className="text-right">Lucro</th>
                      <th className="text-right">Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lucrosDetalhados.slice(0, 8).map((item) => (
                      <tr key={`detalhe-${item.id}`}>
                        <td>{item.titulo}</td>
                        <td className="text-right">{formatarMoedaBR(item.receita)}</td>
                        <td className="text-right">{formatarMoedaBR(item.despesa)}</td>
                        <td className={`text-right fw-600 ${item.lucro >= 0 ? 'text-success' : 'text-danger'}`}>{formatarMoedaBR(item.lucro)}</td>
                        <td className="text-right">{item.margem == null ? '-' : `${item.margem.toFixed(1)}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
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
            {veiculosCombo.map(v => <option key={v.id} value={v.id}>{nomeVeiculo(v.id)}</option>)}
          </select>
          <select value={filtroMontadora} onChange={e => atualizarFiltroMontadora(e.target.value)} style={{ padding: '7px 12px', border: '1.5px solid var(--gray-300)', borderRadius: 'var(--radius)', fontSize: 13, flex: 1, maxWidth: 260 }}>
            <option value="">Todas as montadoras</option>
            {montadorasDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {lista.length === 0 ? (
          <div className="empty-state"><Plus size={32} /><p>Nenhum lançamento encontrado.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th className="th-sort">
                    <button type="button" className="table-sort-btn" onClick={() => alternarOrdenacao('data')}>
                      Data<span>{indicadorOrdenacao('data')}</span>
                    </button>
                  </th>
                  <th className="th-sort">
                    <button type="button" className="table-sort-btn" onClick={() => alternarOrdenacao('tipo')}>
                      Tipo<span>{indicadorOrdenacao('tipo')}</span>
                    </button>
                  </th>
                  <th className="th-sort">
                    <button type="button" className="table-sort-btn" onClick={() => alternarOrdenacao('categoria')}>
                      Categoria<span>{indicadorOrdenacao('categoria')}</span>
                    </button>
                  </th>
                  <th className="th-sort">
                    <button type="button" className="table-sort-btn" onClick={() => alternarOrdenacao('descricao')}>
                      Descrição<span>{indicadorOrdenacao('descricao')}</span>
                    </button>
                  </th>
                  <th className="th-sort">
                    <button type="button" className="table-sort-btn" onClick={() => alternarOrdenacao('veiculo')}>
                      Veículo<span>{indicadorOrdenacao('veiculo')}</span>
                    </button>
                  </th>
                  <th className="th-sort">
                    <button type="button" className="table-sort-btn" onClick={() => alternarOrdenacao('formaPagamento')}>
                      Forma Pgto<span>{indicadorOrdenacao('formaPagamento')}</span>
                    </button>
                  </th>
                  <th className="text-right th-sort">
                    <button type="button" className="table-sort-btn table-sort-btn-right" onClick={() => alternarOrdenacao('valor')}>
                      Valor<span>{indicadorOrdenacao('valor')}</span>
                    </button>
                  </th>
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
                    {form.tipo === 'receita' && form.categoria === 'Aluguel Semanal' && (
                      <>
                        <div className="form-group"><label>Data de início *</label><input required type="date" {...f('periodoInicioSemanal')} /></div>
                        <div className="form-group"><label>Data final *</label><input required type="date" {...f('periodoFimSemanal')} /></div>
                      </>
                    )}
                    <div className="form-group"><label>Forma de Pagamento</label>
                      <select {...f('formaPagamento')}>
                        {['pix','dinheiro','transferência','débito','crédito','boleto','cheque'].map(f2 => <option key={f2} value={f2} style={{ textTransform: 'capitalize' }}>{f2}</option>)}
                      </select>
                    </div>
                    <div className="form-group form-full"><label>Descrição</label><input {...f('descricao')} /></div>
                    <div className="form-group form-full"><label>Veículo</label>
                      <select {...f('veiculoId')} required={usuarioLogado?.perfil === 'locador'}>
                        <option value="">Selecione {usuarioLogado?.perfil === 'locador' ? '(obrigatório para locador)' : '(opcional)'}</option>
                        {veiculosCombo.map(v => <option key={v.id} value={v.id}>{nomeVeiculo(v.id)}</option>)}
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

function csvEscape(value) {
  const str = String(value ?? '');
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function LocacaoPizza3D({ item }) {
  const data = [
    { name: 'Receitas', value: Number(item.receita || 0), color: '#0e9f6e', depth: '#057a55' },
    { name: 'Despesas', value: Number(item.despesa || 0), color: '#e02424', depth: '#b91c1c' },
  ].filter(x => x.value > 0);

  return (
    <div className="locacao-pie-card">
      <div style={{ fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>{item.titulo}</div>
      <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>
        Lucro: <strong style={{ color: item.lucro >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
          {formatarMoedaBR(item.lucro)}
        </strong>
      </div>

      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" cx="50%" cy="56%" innerRadius={42} outerRadius={78} startAngle={240} endAngle={-120} legendType="none">
              {data.map((entry, idx) => (
                <Cell key={`depth-${idx}`} fill={entry.depth} />
              ))}
            </Pie>
            <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={42} outerRadius={78} startAngle={240} endAngle={-120}>
              {data.map((entry, idx) => (
                <Cell key={`top-${idx}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={value => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
            <Legend
              verticalAlign="bottom"
              height={20}
              formatter={(value) => {
                if (value === 'Receitas') {
                  return `Receitas: ${formatarMoedaBR(item.receita)}`;
                }
                if (value === 'Despesas') {
                  return `Despesas: ${formatarMoedaBR(item.despesa)}`;
                }
                return value;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
