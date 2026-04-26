import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { usuarioFromApi } from '../services/mappers';
import { Plus, Edit2, Trash2, X, Car, Check } from 'lucide-react';
import { applyMask } from '../utils/masks';

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
  valorDiario: '',
  observacoes: '',
  foto: '',
};

const EMPTY_CONTRATO = {
  nome: '',
  email: '',
  cpf: '',
  rg: '',
  telefone: '',
  endereco: '',
  observacoesContrato: '',
};

function montarEnderecoLocatario(locatario = {}) {
  const partesRua = [locatario.endereco, locatario.numero]
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .join(', ');

  const partesComplemento = [locatario.complemento, locatario.bairro]
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .join(' - ');

  const partesCidade = [locatario.cidade, locatario.estado]
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .join('/');

  const partes = [partesRua, partesComplemento, partesCidade, String(locatario.cep || '').trim()].filter(Boolean);
  return partes.join(' | ');
}

export default function Veiculos() {
  const { veiculos, addVeiculo, updateVeiculo, removeVeiculo, locadores, usuarioLogado, addLocacao, carregando, erro, locacoes } = useApp();
    const [fipeAtualizada, setFipeAtualizada] = useState(false);
    // Detecta atualização automática dos valores FIPE
    React.useEffect(() => {
      if (veiculos && veiculos.length > 0) {
        setFipeAtualizada(true);
        const timer = setTimeout(() => setFipeAtualizada(false), 3500);
        return () => clearTimeout(timer);
      }
    }, [veiculos]);
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
  const [modalContrato, setModalContrato] = useState(false);
  const [contratoForm, setContratoForm] = useState(EMPTY_CONTRATO);
  const [contratoEnvio, setContratoEnvio] = useState('email');
  const [antecedenteArquivo, setAntecedenteArquivo] = useState(null);
  const [carregandoDadosContrato, setCarregandoDadosContrato] = useState(false);
  const [modalSmtp, setModalSmtp] = useState(false);
  const [salvandoSmtp, setSalvandoSmtp] = useState(false);
  const [erroSmtp, setErroSmtp] = useState('');
  const [smtpForm, setSmtpForm] = useState({
    host: 'smtp.gmail.com',
    port: '587',
    secure: 'false',
    user: '',
    pass: '',
    mailFrom: '',
  });
  // Novos estados para combos do locatário
  const [dataInicioLocacao, setDataInicioLocacao] = useState(() => {
    const hoje = new Date().toISOString().split('T')[0];
    return hoje;
  });
  const [periodicidadeLocacao, setPeriodicidadeLocacao] = useState('semana');
  const [quantidadePeriodosLocacao, setQuantidadePeriodosLocacao] = useState(1);

  const podeGerenciar = usuarioLogado?.perfil === 'admin' || usuarioLogado?.perfil === 'locador';
  const podeCadastrar = podeGerenciar || usuarioLogado?.perfil === 'auxiliar';
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
    // Primeiro, filtra por categoria
    let resultado = listaVeiculos;
    if (filtroCategoria) {
      resultado = resultado.filter(v => (String(v.marca || '').trim() || 'Sem categoria') === filtroCategoria);
    }

    // Se o usuário é locatário, remove veículos que têm locação pendente de aprovação
    if (usuarioLogado?.perfil === 'locatario' && locacoes && locacoes.length > 0) {
      const idsVeiculosPendentes = locacoes
        .filter(l => l.status === 'pendente_aprovacao')
        .map(l => l.veiculoId);

      resultado = resultado.filter(v => !idsVeiculosPendentes.includes(v.id));
    }

    return resultado;
  }, [listaVeiculos, filtroCategoria, usuarioLogado, locacoes]);

  const contratoInvalido = useMemo(() => {
    const nome = String(contratoForm.nome || '').trim();
    const email = String(contratoForm.email || '').trim();
    const cpf = String(contratoForm.cpf || '').trim();
    const telefone = String(contratoForm.telefone || '').trim();
    const endereco = String(contratoForm.endereco || '').trim();

    if (!nome || !cpf || !telefone || !endereco) return true;
    if (contratoEnvio === 'email' && !email) return true;
    if (!antecedenteArquivo) return true;
    return false;
  }, [contratoForm, contratoEnvio, antecedenteArquivo]);

  const camposPendentesContrato = useMemo(() => {
    const pendentes = [];
    if (!String(contratoForm.nome || '').trim()) pendentes.push('Nome completo');
    if (contratoEnvio === 'email' && !String(contratoForm.email || '').trim()) pendentes.push('E-mail');
    if (!String(contratoForm.cpf || '').trim()) pendentes.push('CPF');
    if (!String(contratoForm.telefone || '').trim()) pendentes.push('Telefone');
    if (!String(contratoForm.endereco || '').trim()) pendentes.push('Endereço completo');
    if (!antecedenteArquivo) pendentes.push('Antecedentes criminais (arquivo)');
    return pendentes;
  }, [contratoForm, contratoEnvio, antecedenteArquivo]);

  const dataTerminoLocacao = useMemo(() => {
    const inicio = String(dataInicioLocacao || '').trim();
    const quantidade = Number(quantidadePeriodosLocacao || 0);
    if (!inicio || quantidade <= 0) return '';

    const data = new Date(`${inicio}T00:00:00`);
    if (Number.isNaN(data.getTime())) return '';

    if (periodicidadeLocacao === 'dia') data.setDate(data.getDate() + quantidade);
    else if (periodicidadeLocacao === 'semana') data.setDate(data.getDate() + (quantidade * 7));
    else if (periodicidadeLocacao === 'quinzenal') data.setDate(data.getDate() + (quantidade * 14));
    else if (periodicidadeLocacao === 'mensal') data.setMonth(data.getMonth() + quantidade);
    else return '';

    return data.toISOString().split('T')[0];
  }, [dataInicioLocacao, periodicidadeLocacao, quantidadePeriodosLocacao]);

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
    return { value: form[field] || '', onChange: e => setForm({ ...form, [field]: applyMask(field, e.target.value) }) };
  }

  function nomeLocador(id) {
    const l = locadores.find(l => String(l.id) === String(id));
    return l ? (l.tipo === 'juridica' ? l.razaoSocial : l.nome) : '-';
  }

  function nomeLocadorVeiculo(veiculo) {
    const nomeViaApi = String(veiculo?.nomeLocador || '').trim();
    if (nomeViaApi) return nomeViaApi;
    return nomeLocador(veiculo?.locadorId);
  }

  function preencherContratoComUsuario(usuario, manterObservacoes = true) {
    const dadosLocatario = usuario?.locatario || null;

    setContratoForm(prev => ({
      ...EMPTY_CONTRATO,
      observacoesContrato: manterObservacoes ? (prev.observacoesContrato || '') : '',
      nome: String(dadosLocatario?.nome || usuario?.nome || prev.nome || '').trim(),
      email: String(dadosLocatario?.email || usuario?.email || prev.email || '').trim(),
      cpf: applyMask('cpf', String(
        dadosLocatario?.cpf
        || ((usuario?.tipoDocumento || usuario?.tipo_documento) === 'cpf' ? usuario?.documento : '')
        || prev.cpf
        || ''
      ).trim()),
      rg: applyMask('rg', String(dadosLocatario?.rg || usuario?.rg || prev.rg || '').trim()),
      telefone: applyMask('telefone', String(dadosLocatario?.celular || dadosLocatario?.telefone || prev.telefone || '').trim()),
      endereco: montarEnderecoLocatario(dadosLocatario || {}) || prev.endereco || '',
    }));
  }

  function abrirModalContratoLocacao() {
    if (!veiculoSelecionadoLocacao) {
      setErroLocacaoRapida('Selecione um veículo para locar.');
      return;
    }

    setErroLocacaoRapida('');
    setSucessoLocacaoRapida('');
    preencherContratoComUsuario(usuarioLogado, true);
    setModalContrato(true);
  }

  React.useEffect(() => {
    if (!modalContrato || usuarioLogado?.perfil !== 'locatario') return;

    let cancelado = false;
    setCarregandoDadosContrato(true);

    (async () => {
      try {
        const me = await api.get('/auth/me');
        if (cancelado) return;

        const usuarioNormalizado = usuarioFromApi({
          ...me,
          locatario: me?.locatario || null,
          locador_vinculado: me?.locador_vinculado || null,
          locador_proprio: me?.locador_proprio || null,
        });

        preencherContratoComUsuario(usuarioNormalizado, true);
      } catch {
        // Mantém os dados já preenchidos localmente caso a atualização remota falhe.
      } finally {
        if (!cancelado) setCarregandoDadosContrato(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [modalContrato, usuarioLogado?.perfil]);

  function fecharModalContratoLocacao() {
    setModalContrato(false);
    setCarregandoDadosContrato(false);
    setAntecedenteArquivo(null);
    setContratoForm(EMPTY_CONTRATO);
    setContratoEnvio('email');
  }

  async function fileToBase64DataUrl(file) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo de antecedentes.'));
      reader.readAsDataURL(file);
    });
  }

  async function validarSmtpParaEnvioEmail() {
    try {
      const status = await api.get('/configuracoes/smtp/status');
      if (status?.configurado) return true;

      setSmtpForm(prev => ({
        ...prev,
        host: status?.smtp?.host || prev.host,
        port: status?.smtp?.port || prev.port,
        secure: status?.smtp?.secure || prev.secure,
        user: status?.smtp?.user || prev.user,
        mailFrom: status?.smtp?.mailFrom || prev.mailFrom,
        pass: '',
      }));
      setErroSmtp('');
      setModalSmtp(true);
      return false;
    } catch (err) {
      setErroLocacaoRapida(err.message || 'Não foi possível validar configuração de e-mail.');
      return false;
    }
  }

  async function salvarConfiguracaoSmtp(e) {
    e.preventDefault();
    setErroSmtp('');
    setSalvandoSmtp(true);
    try {
      await api.put('/configuracoes/smtp', {
        host: smtpForm.host,
        port: Number(smtpForm.port || 587),
        secure: smtpForm.secure,
        user: smtpForm.user,
        pass: smtpForm.pass,
        mailFrom: smtpForm.mailFrom,
      });

      setModalSmtp(false);
      setSucessoLocacaoRapida('Configuração de e-mail salva. Clique novamente em "Gerar Contrato e Locar".');
    } catch (err) {
      setErroSmtp(err.message || 'Não foi possível salvar as configurações SMTP.');
    } finally {
      setSalvandoSmtp(false);
    }
  }

  function baixarContratoPdf(base64, nomeArquivo = 'contrato-locacao.pdf', mimeType = 'application/pdf') {
    try {
      if (!base64) {
        console.warn('baixarContratoPdf: base64 está vazio');
        return;
      }

      // Limpa o base64 se contiver prefixo data URI
      let base64Puro = base64;
      if (base64.startsWith('data:')) {
        base64Puro = base64.split(',')[1] || base64;
      }

      const binary = atob(base64Puro);
      const length = binary.length;
      const bytes = new Uint8Array(length);

      for (let i = 0; i < length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar contrato PDF:', error);
      setErroLocacaoRapida('Erro ao processar o download do contrato. Tente novamente.');
    }
  }

  async function handleEnviarContratoLocacao(e) {
    e.preventDefault();
    if (!veiculoSelecionadoLocacao) {
      setErroLocacaoRapida('Selecione um veículo para locar.');
      return;
    }

    if (contratoEnvio === 'email') {
      const smtpOk = await validarSmtpParaEnvioEmail();
      if (!smtpOk) return;
    }

    if (!antecedenteArquivo) {
      setErroLocacaoRapida('Anexe o arquivo de antecedentes criminais para continuar.');
      return;
    }

    const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const tipoArquivo = String(antecedenteArquivo.type || '').toLowerCase();
    if (!tiposPermitidos.includes(tipoArquivo)) {
      setErroLocacaoRapida('O arquivo de antecedentes deve ser PDF ou imagem (JPG, PNG, WEBP ou GIF).');
      return;
    }

    if (antecedenteArquivo.size > 8 * 1024 * 1024) {
      setErroLocacaoRapida('O arquivo de antecedentes deve ter no máximo 8MB.');
      return;
    }

    setErroLocacaoRapida('');
    setSucessoLocacaoRapida('');
    setLocandoVeiculo(true);
    try {
      const antecedenteBase64 = await fileToBase64DataUrl(antecedenteArquivo);

      const resposta = await addLocacao({
        veiculoId: veiculoSelecionadoLocacao,
        dataInicio: dataInicioLocacao,
        periodicidade: periodicidadeLocacao,
        quantidadePeriodos: quantidadePeriodosLocacao,
        contratoEnvio,
        antecedenteArquivo: {
          nome: antecedenteArquivo.name || 'antecedentes',
          tipo: antecedenteArquivo.type || '',
          conteudoBase64: antecedenteBase64,
        },
        condicoes: `Locação iniciada pela tela Veículos. ${contratoForm.observacoesContrato || ''}`.trim(),
        contrato: {
          nome: contratoForm.nome,
          email: contratoForm.email,
          cpf: contratoForm.cpf,
          rg: contratoForm.rg,
          telefone: contratoForm.telefone,
          endereco: contratoForm.endereco,
        },
      });

      // DEBUG: Log para verificar a resposta
      console.log('Resposta da locação:', { contratoEnvio: resposta?.contratoEnvio, contratoEmailStatus: resposta?.contratoEmailStatus, temBase64: !!resposta?.contratoPdfBase64 });

      // Processa download ANTES de fechar a modal
      if (resposta?.contratoEnvio === 'download' && resposta?.contratoPdfBase64) {
        console.log('Iniciando download do contrato...');
        baixarContratoPdf(
          resposta.contratoPdfBase64,
          resposta.contratoPdfNomeArquivo || `contrato-locacao-${resposta.id}.pdf`,
          resposta.contratoPdfMimeType || 'application/pdf'
        );
        setSucessoLocacaoRapida('Solicitação enviada com sucesso! O contrato em PDF foi baixado e também foi enviado por e-mail para você e para o locador. A locação está pendente de aprovação.');
      } else {
        // Log de debug se não entrou na condição de download
        if (resposta?.contratoEnvio !== 'download') {
          console.log(`contratoEnvio não é "download", é: "${resposta?.contratoEnvio}"`);
        }
        if (!resposta?.contratoPdfBase64) {
          console.log('contratoPdfBase64 está vazio/undefined');
        }
      }

      setVeiculoSelecionadoLocacao('');
      fecharModalContratoLocacao();

      if (resposta?.contratoEnvio === 'download' && resposta?.contratoPdfBase64) {
        return;
      }

      if (resposta?.contratoEmailStatus === 'enviado') {
        setSucessoLocacaoRapida('Contrato enviado por e-mail em PDF para assinatura via gov.br. Uma cópia também foi enviada para o locador. A locação está pendente de aprovação do locador.');
      } else if (resposta?.contratoEmailStatus === 'download') {
        setSucessoLocacaoRapida('Solicitação enviada com sucesso. O contrato foi gerado para download e a locação está pendente de aprovação.');
      } else if (resposta?.contratoEmailStatus === 'download_e_enviado') {
        setSucessoLocacaoRapida('Solicitação enviada com sucesso! O contrato em PDF foi baixado e também foi enviado por e-mail para você e para o locador. A locação está pendente de aprovação.');
      } else if (resposta?.contratoEmailStatus === 'nao_configurado') {
        setSucessoLocacaoRapida('Solicitação enviada com sucesso. O envio automático do contrato por e-mail está desativado (SMTP não configurado) e a locação está pendente de aprovação.');
      } else if (resposta?.contratoEmailStatus === 'falhou') {
        setSucessoLocacaoRapida('Solicitação criada, porém houve falha no envio do e-mail do contrato. A locação segue pendente de aprovação.');
        setErroLocacaoRapida(resposta?.contratoEmailMensagem || 'Não foi possível enviar o contrato por e-mail.');
      } else {
        setSucessoLocacaoRapida('Solicitação de locação enviada com sucesso. Aguarde a aprovação do locador.');
      }
    } catch (err) {
      setErroLocacaoRapida(err.message || 'Não foi possível gerar o contrato e locar o veículo selecionado.');
    } finally {
      setLocandoVeiculo(false);
    }
  }

  return (
    <div className="page-content">
      {carregando && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="empty-state"><p>Carregando veículos...</p></div>
        </div>
      )}
      {erro && (
        <div className="alert-error" style={{ marginBottom: 16 }}>
          {erro}
        </div>
      )}
      {fipeAtualizada && (
        <div style={{
          background: 'var(--success-light)',
          color: 'var(--success-dark)',
          padding: '10px 18px',
          borderRadius: 8,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontWeight: 500,
          fontSize: 15,
          boxShadow: '0 2px 8px #0001'
        }}>
          <Check size={18} /> Valores FIPE atualizados automaticamente!
        </div>
      )}
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
          {/* Combos extras para locatário */}
          {usuarioLogado?.perfil === 'locatario' && (
            <>
              <input
                type="date"
                aria-label="Início da locação"
                value={dataInicioLocacao}
                onChange={e => setDataInicioLocacao(e.target.value)}
                style={{ padding: '7px 12px', border: '1.5px solid var(--gray-300)', borderRadius: 'var(--radius)', fontSize: 13 }}
              />
              <select
                aria-label="Periodicidade"
                value={periodicidadeLocacao}
                onChange={e => setPeriodicidadeLocacao(e.target.value)}
                style={{ padding: '7px 12px', border: '1.5px solid var(--gray-300)', borderRadius: 'var(--radius)', fontSize: 13 }}
              >
                <option value="dia">Diária</option>
                <option value="semana">Semanal</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="mensal">Mensal</option>
              </select>
              <select
                aria-label="Quantidade de períodos"
                value={quantidadePeriodosLocacao}
                onChange={e => setQuantidadePeriodosLocacao(Number(e.target.value))}
                style={{ padding: '7px 12px', border: '1.5px solid var(--gray-300)', borderRadius: 'var(--radius)', fontSize: 13 }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n} {periodicidadeLocacao === 'dia' ? 'dia(s)' : periodicidadeLocacao === 'semana' ? 'semana(s)' : periodicidadeLocacao === 'quinzenal' ? 'quinzena(s)' : 'mês(es)'}</option>
                ))}
              </select>
            </>
          )}
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
              onClick={abrirModalContratoLocacao}
            >
              <Check size={16} /> {locandoVeiculo ? 'Processando...' : 'Locar Veículo'}
            </button>
          )}
          {usuarioLogado?.perfil === 'locatario' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--gray-600)', fontWeight: 600 }}>
                Contrato:
              </label>
              <select
                value={contratoEnvio}
                onChange={e => setContratoEnvio(e.target.value)}
                style={{
                  padding: '7px 12px',
                  border: '1.5px solid var(--gray-300)',
                  borderRadius: 'var(--radius)',
                  fontSize: 13,
                  minWidth: 190,
                }}
              >
                <option value="email">Enviar por e-mail</option>
                <option value="download">Baixar PDF</option>
              </select>
            </div>
          )}
          {podeCadastrar && (
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
                  <div>Valor FIPE: <strong>{v.valorFipe != null ? Number(v.valorFipe).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</strong></div>
                  <div>Locação diária: <strong>{v.valorDiario != null ? Number(v.valorDiario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</strong></div>
                  <div>Locador: {nomeLocadorVeiculo(v)}</div>
                </div>
              </div>
              <div className="veiculo-card-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {usuarioLogado?.perfil === 'locatario' && (
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--gray-600)', marginLeft: 10 }}>
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
        <div className="veiculo-table-wrapper">
          <table className="veiculo-table">
            <thead>
              <tr>
                <th>Placa</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Ano</th>
                <th>Cor</th>
                <th>Combustível</th>
                <th>Transmissão</th>
                <th>KM Atual</th>
                <th>Valor FIPE</th>
                <th>Locação Diária</th>
                <th>Locador</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listaVeiculosFiltrada.map(v => (
                <tr key={v.id}>
                  <td>{v.placa}</td>
                  <td>{v.marca}</td>
                  <td>{v.modelo}</td>
                  <td>{v.anoFabricacao}/{v.anoModelo}</td>
                  <td>{v.cor}</td>
                  <td>{v.combustivel}</td>
                  <td>{v.transmissao}</td>
                  <td>{Number(v.kmAtual || 0).toLocaleString()}</td>
                  <td>{v.valorFipe != null ? Number(v.valorFipe).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
                  <td>{v.valorDiario != null ? Number(v.valorDiario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
                  <td>{nomeLocadorVeiculo(v)}</td>
                  <td>
                    {podeGerenciar && (
                      <>
                        <button className="btn btn-sm btn-outline" onClick={() => abrirEditar(v)}><Edit2 size={14} /></button>
                        <button className="btn btn-sm btn-danger" onClick={() => setConfirmarExclusao(v.id)}><Trash2 size={14} /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {usuarioLogado?.perfil === 'locatario' && modalContrato && (
        <div className="modal-overlay" onClick={fecharModalContratoLocacao}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Contrato de Locação</span>
              <button className="btn-icon" onClick={fecharModalContratoLocacao}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleEnviarContratoLocacao}>
                <div className="form-section">
                  <div className="form-section-title">Dados do Locatário</div>
                  <div className="form-grid">
                    <div className="form-group"><label>Nome completo *</label><input required value={contratoForm.nome} onChange={e => setContratoForm(prev => ({ ...prev, nome: e.target.value }))} /></div>
                    <div className="form-group"><label>E-mail {contratoEnvio === 'email' ? '*' : ''}</label><input required={contratoEnvio === 'email'} type="email" value={contratoForm.email} onChange={e => setContratoForm(prev => ({ ...prev, email: e.target.value }))} /></div>
                    <div className="form-group"><label>CPF *</label><input required value={contratoForm.cpf} onChange={e => setContratoForm(prev => ({ ...prev, cpf: applyMask('cpf', e.target.value) }))} /></div>
                    <div className="form-group"><label>RG</label><input value={contratoForm.rg} onChange={e => setContratoForm(prev => ({ ...prev, rg: applyMask('rg', e.target.value) }))} /></div>
                    <div className="form-group"><label>Telefone *</label><input required value={contratoForm.telefone} onChange={e => setContratoForm(prev => ({ ...prev, telefone: applyMask('telefone', e.target.value) }))} /></div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Endereço completo *</label><input required value={contratoForm.endereco} onChange={e => setContratoForm(prev => ({ ...prev, endereco: e.target.value }))} /></div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-title">Dados da Locação</div>
                  <div className="form-grid">
                    <div className="form-group"><label>Data de início</label><input type="date" value={dataInicioLocacao} onChange={e => setDataInicioLocacao(e.target.value)} /></div>
                    <div className="form-group"><label>Periodicidade</label>
                      <select value={periodicidadeLocacao} onChange={e => setPeriodicidadeLocacao(e.target.value)}>
                        <option value="dia">Diária</option>
                        <option value="semana">Semanal</option>
                        <option value="quinzenal">Quinzenal</option>
                        <option value="mensal">Mensal</option>
                      </select>
                    </div>
                    <div className="form-group"><label>Quantidade de períodos</label>
                      <select value={quantidadePeriodosLocacao} onChange={e => setQuantidadePeriodosLocacao(Number(e.target.value))}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label>Data de término prevista</label><input type="date" value={dataTerminoLocacao} readOnly /></div>
                    <div className="form-group"><label>Recebimento do contrato</label>
                      <select value={contratoEnvio} onChange={e => setContratoEnvio(e.target.value)}>
                        <option value="email">Enviar por e-mail</option>
                        <option value="download">Baixar PDF agora</option>
                      </select>
                    </div>
                    <div className="form-group"><label>Antecedentes criminais *</label>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        required
                        onChange={e => setAntecedenteArquivo(e.target.files?.[0] || null)}
                      />
                      <small style={{ color: 'var(--gray-500)' }}>
                        Formatos aceitos: PDF, JPG, PNG, WEBP ou GIF (máx. 8MB).
                      </small>
                      {antecedenteArquivo?.name && (
                        <div style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 4 }}>
                          Arquivo selecionado: {antecedenteArquivo.name}
                        </div>
                      )}
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Observações do contrato</label>
                      <textarea value={contratoForm.observacoesContrato} onChange={e => setContratoForm(prev => ({ ...prev, observacoesContrato: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 10 }}>
                  {contratoEnvio === 'email'
                    ? 'Após confirmar, um PDF será enviado para seu e-mail com orientação de assinatura digital via portal gov.br.'
                    : 'Após confirmar, o PDF será baixado automaticamente para assinatura digital via portal gov.br.'}
                </p>

                {carregandoDadosContrato && (
                  <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 10 }}>
                    Carregando dados do locatário logado...
                  </p>
                )}

                {!carregandoDadosContrato && contratoInvalido && camposPendentesContrato.length > 0 && (
                  <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 10 }}>
                    Preencha os campos obrigatórios para continuar: {camposPendentesContrato.join(', ')}.
                  </p>
                )}

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={fecharModalContratoLocacao}><X size={14} /> Cancelar</button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={locandoVeiculo || carregandoDadosContrato || contratoInvalido}
                    title={!carregandoDadosContrato && contratoInvalido && camposPendentesContrato.length > 0
                      ? `Campos pendentes: ${camposPendentesContrato.join(', ')}`
                      : undefined}
                  >
                    <Check size={14} /> {locandoVeiculo ? 'Enviando...' : 'Gerar Contrato e Locar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {usuarioLogado?.perfil === 'locatario' && modalSmtp && (
        <div className="modal-overlay" onClick={() => setModalSmtp(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Configurar envio por e-mail (SMTP)</span>
              <button className="btn-icon" onClick={() => setModalSmtp(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 12 }}>
                Para enviar o contrato por e-mail, preencha os parâmetros SMTP abaixo.
              </p>

              <form onSubmit={salvarConfiguracaoSmtp}>
                <div className="form-grid">
                  <div className="form-group"><label>SMTP_HOST *</label><input required value={smtpForm.host} onChange={e => setSmtpForm(prev => ({ ...prev, host: e.target.value }))} /></div>
                  <div className="form-group"><label>SMTP_PORT *</label><input required type="number" value={smtpForm.port} onChange={e => setSmtpForm(prev => ({ ...prev, port: e.target.value }))} /></div>
                  <div className="form-group"><label>SMTP_SECURE</label>
                    <select value={smtpForm.secure} onChange={e => setSmtpForm(prev => ({ ...prev, secure: e.target.value }))}>
                      <option value="false">false</option>
                      <option value="true">true</option>
                    </select>
                  </div>
                  <div className="form-group"><label>SMTP_USER *</label><input required type="email" value={smtpForm.user} onChange={e => setSmtpForm(prev => ({ ...prev, user: e.target.value }))} /></div>
                  <div className="form-group"><label>SMTP_PASS *</label><input required type="password" value={smtpForm.pass} onChange={e => setSmtpForm(prev => ({ ...prev, pass: e.target.value }))} /></div>
                  <div className="form-group"><label>MAIL_FROM (opcional)</label><input value={smtpForm.mailFrom} onChange={e => setSmtpForm(prev => ({ ...prev, mailFrom: e.target.value }))} /></div>
                </div>

                {erroSmtp && <p style={{ color: 'var(--danger)', fontSize: 12 }}>{erroSmtp}</p>}

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModalSmtp(false)}><X size={14} /> Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={salvandoSmtp}><Check size={14} /> {salvandoSmtp ? 'Salvando...' : 'Salvar Configuração'}</button>
                </div>
              </form>
            </div>
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

      {podeCadastrar && modal && (
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
                    <div className="form-group"><label>Valor Locação Diária (R$)</label><input type="text" inputMode="decimal" placeholder="0,00" {...f('valorDiario')} /></div>
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
