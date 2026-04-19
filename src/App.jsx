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
import './styles/global.css';

function RoleRoute({ allowed, element }) {
  const { usuarioLogado } = useApp();
  if (!usuarioLogado) return <Navigate to="/login" replace />;
  if (!allowed.includes(usuarioLogado.perfil)) {
    const fallback = usuarioLogado.perfil === 'locatario' ? '/veiculos' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }
  return element;
}

function HomeRedirect() {
  const { usuarioLogado } = useApp();
  if (!usuarioLogado) return <Navigate to="/login" replace />;
  const target = usuarioLogado.perfil === 'locatario' ? '/veiculos' : '/dashboard';
  return <Navigate to={target} replace />;
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<HomeRedirect />} />
            <Route path="dashboard" element={<RoleRoute allowed={['admin', 'locador']} element={<Dashboard />} />} />
            <Route path="painel" element={<RoleRoute allowed={['admin']} element={<Painel />} />} />
            <Route path="locadores" element={<RoleRoute allowed={['admin']} element={<Locadores />} />} />
            <Route path="locatarios" element={<RoleRoute allowed={['admin']} element={<Locatarios />} />} />
            <Route path="colaboradores" element={<RoleRoute allowed={['admin']} element={<Colaboradores />} />} />
            <Route path="veiculos" element={<RoleRoute allowed={['admin', 'locador', 'locatario']} element={<Veiculos />} />} />
            <Route path="financeiro" element={<RoleRoute allowed={['admin', 'locador', 'locatario']} element={<Financeiro />} />} />
            <Route path="aquisicoes" element={<RoleRoute allowed={['admin', 'locador']} element={<Aquisicoes />} />} />
            <Route path="admin" element={<RoleRoute allowed={['admin']} element={<Admin />} />} />
          </Route>
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
