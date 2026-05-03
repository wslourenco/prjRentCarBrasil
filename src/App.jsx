import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Locadores from './pages/Locadores';
import Locatarios from './pages/Locatarios';
import Colaboradores from './pages/Colaboradores';
import Veiculos from './pages/Veiculos';
import Financeiro from './pages/Financeiro';
import Aquisicoes from './pages/Aquisicoes';
import Painel from './pages/Painel';
import Admin from './pages/Admin';
import AprovacoesAdmin from './pages/AprovacoesAdmin';
import ConfigSmtp from './pages/ConfigSmtp';
import TrocarSenha from './pages/TrocarSenha';
import MeuCadastro from './pages/MeuCadastro';
import './styles/global.css';

function RoleRoute({ allowed, element }) {
  const { usuarioLogado } = useApp();
  if (!usuarioLogado) return <Navigate to="/login" replace />;
  if (!allowed.includes(usuarioLogado.perfil)) {
    if (usuarioLogado.perfil === 'locatario') return <Navigate to="/veiculos" replace />;
    if (usuarioLogado.perfil === 'auxiliar') return <Navigate to="/veiculos" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return element;
}

function HomeRedirect() {
  const { usuarioLogado } = useApp();
  if (!usuarioLogado) return <Navigate to="/login" replace />;
  if (usuarioLogado.perfil === 'locatario') return <Navigate to="/veiculos" replace />;
  if (usuarioLogado.perfil === 'auxiliar') return <Navigate to="/veiculos" replace />;
  return <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/trocar-senha" element={<TrocarSenha />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<HomeRedirect />} />
            <Route path="dashboard" element={<RoleRoute allowed={['admin', 'locador']} element={<Dashboard />} />} />
            <Route path="painel" element={<RoleRoute allowed={['admin', 'auxiliar']} element={<Painel />} />} />
            <Route path="locadores" element={<RoleRoute allowed={['admin']} element={<Locadores />} />} />
            <Route path="locatarios" element={<RoleRoute allowed={['admin']} element={<Locatarios />} />} />
            <Route path="colaboradores" element={<RoleRoute allowed={['admin', 'locador']} element={<Colaboradores />} />} />
            <Route path="veiculos" element={<RoleRoute allowed={['admin', 'locador', 'locatario', 'auxiliar']} element={<Veiculos />} />} />
            <Route path="configuracao-smtp" element={<RoleRoute allowed={['locador', 'locatario', 'auxiliar']} element={<ConfigSmtp />} />} />
            <Route path="financeiro" element={<RoleRoute allowed={['admin', 'locador', 'locatario', 'auxiliar']} element={<Financeiro />} />} />
            <Route path="aquisicoes" element={<RoleRoute allowed={['admin', 'locador']} element={<Aquisicoes />} />} />
            <Route path="admin" element={<RoleRoute allowed={['admin']} element={<Admin />} />} />
            <Route path="aprovacoes" element={<RoleRoute allowed={['admin']} element={<AprovacoesAdmin />} />} />
            <Route path="meu-cadastro" element={<MeuCadastro />} />
          </Route>
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
