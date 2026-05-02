import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useApp } from '../context/AppContext';

export default function Layout() {
  const { usuarioLogado } = useApp();
  if (!usuarioLogado) return <Navigate to="/login" replace />;

  const logo = usuarioLogado?.locadorProprio?.logo
    || usuarioLogado?.locadorVinculado?.logo
    || null;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        {logo && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 100,
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
            padding: '8px 24px',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(6px)',
            borderBottom: '1px solid var(--gray-200)',
          }}>
            <img
              src={logo}
              alt="Logo da empresa"
              style={{ maxHeight: 44, maxWidth: 180, objectFit: 'contain' }}
            />
          </div>
        )}
        <Outlet />
      </div>
    </div>
  );
}
