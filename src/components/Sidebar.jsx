import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Car, Users, UserCheck, Briefcase,
  DollarSign, Settings, LogOut, ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const PERFIL_LABEL = { admin: 'Administrador', locador: 'Locador', locatario: 'Locatário' };

export default function Sidebar() {
  const { usuarioLogado, logout } = useApp();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const avatarLetters = usuarioLogado?.nome?.slice(0, 2).toUpperCase() || '??';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>SisLoVe</h1>
        <span>Sistema de Locação de Veículos</span>
      </div>

      <nav className="sidebar-nav">
        <span className="sidebar-section-title">Principal</span>
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
          <LayoutDashboard size={16} /> Dashboard
        </NavLink>
        <NavLink to="/painel" className={({ isActive }) => isActive ? 'active' : ''}>
          <ChevronRight size={16} /> Painel de Controle
        </NavLink>

        <span className="sidebar-section-title">Cadastros</span>
        {(usuarioLogado?.perfil === 'admin' || usuarioLogado?.perfil === 'locador') && (
          <>
            <NavLink to="/locadores" className={({ isActive }) => isActive ? 'active' : ''}>
              <UserCheck size={16} /> Locadores
            </NavLink>
            <NavLink to="/veiculos" className={({ isActive }) => isActive ? 'active' : ''}>
              <Car size={16} /> Veículos
            </NavLink>
          </>
        )}
        <NavLink to="/locatarios" className={({ isActive }) => isActive ? 'active' : ''}>
          <Users size={16} /> Locatários
        </NavLink>
        <NavLink to="/colaboradores" className={({ isActive }) => isActive ? 'active' : ''}>
          <Briefcase size={16} /> Colaboradores
        </NavLink>

        <span className="sidebar-section-title">Financeiro</span>
        <NavLink to="/financeiro" className={({ isActive }) => isActive ? 'active' : ''}>
          <DollarSign size={16} /> Despesas & Receitas
        </NavLink>

        {usuarioLogado?.perfil === 'admin' && (
          <>
            <span className="sidebar-section-title">Administração</span>
            <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
              <Settings size={16} /> Usuários
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{avatarLetters}</div>
          <div className="sidebar-user-info">
            <span className="name">{usuarioLogado?.nome}</span>
            <span className="role">{PERFIL_LABEL[usuarioLogado?.perfil]}</span>
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          <LogOut size={14} /> Sair
        </button>
      </div>
    </aside>
  );
}
