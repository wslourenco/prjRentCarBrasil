import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Locadores from './pages/Locadores';
import Locatarios from './pages/Locatarios';
import Colaboradores from './pages/Colaboradores';
import Veiculos from './pages/Veiculos';
import Financeiro from './pages/Financeiro';
import Painel from './pages/Painel';
import Admin from './pages/Admin';
import './styles/global.css';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="painel" element={<Painel />} />
            <Route path="locadores" element={<Locadores />} />
            <Route path="locatarios" element={<Locatarios />} />
            <Route path="colaboradores" element={<Colaboradores />} />
            <Route path="veiculos" element={<Veiculos />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
