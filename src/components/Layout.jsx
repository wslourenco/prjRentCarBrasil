import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useApp } from '../context/AppContext';

export default function Layout() {
  const { usuarioLogado } = useApp();
  if (!usuarioLogado) return <Navigate to="/login" replace />;
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}
