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
import Painel from './pages/Painel';
import Admin from './pages/Admin';
import './styles/global.css';

function RoleRoute({ allowed, element }) {
  const { usuarioLogado } = useApp();
  if (!usuarioLogado) return <Navigate to="/login" replace />;
  if (!allowed.includes(usuarioLogado.perfil)) return <Navigate to="/dashboard" replace />;
  return element;
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="painel" element={<RoleRoute allowed={['admin', 'locatario']} element={<Painel />} />} />
            <Route path="locadores" element={<RoleRoute allowed={['admin']} element={<Locadores />} />} />
            <Route path="locatarios" element={<RoleRoute allowed={['admin']} element={<Locatarios />} />} />
            <Route path="colaboradores" element={<RoleRoute allowed={['admin']} element={<Colaboradores />} />} />
            <Route path="veiculos" element={<RoleRoute allowed={['admin', 'locador', 'locatario']} element={<Veiculos />} />} />
            <Route path="financeiro" element={<RoleRoute allowed={['admin', 'locador']} element={<Financeiro />} />} />
            <Route path="admin" element={<RoleRoute allowed={['admin']} element={<Admin />} />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
