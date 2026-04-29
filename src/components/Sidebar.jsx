import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Car, Users, UserCheck, Briefcase,
  DollarSign, Settings, Mail, LogOut, ChevronRight, CreditCard
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const PERFIL_LABEL = { admin: 'Administrador', locador: 'Locador', locatario: 'Locatário', auxiliar: 'Auxiliar Administrativo' };

export default function Sidebar() {
  const { usuarioLogado, logout } = useApp();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const avatarLetters = usuarioLogado?.nome?.slice(0, 2).toUpperCase() || '??';
  const isAdmin = usuarioLogado?.perfil === 'admin';
  const isLocador = usuarioLogado?.perfil === 'locador';
  const isLocatario = usuarioLogado?.perfil === 'locatario';
  const isAuxiliar = usuarioLogado?.perfil === 'auxiliar';
  const locadorVinculado = usuarioLogado?.locadorVinculado || null;
  const locadorProprio = usuarioLogado?.locadorProprio || null;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>RentCarBrasil</h1>
        <span>Plataforma de locação de veículos</span>
      </div>

      <nav className="sidebar-nav">
        <span className="sidebar-section-title">Principal</span>
        {!isLocatario && !isAuxiliar && (
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>
        )}
        {(isAdmin || isAuxiliar) && (
          <NavLink to="/painel" className={({ isActive }) => isActive ? 'active' : ''}>
            <ChevronRight size={16} /> {isAuxiliar ? 'Painel de Locações' : 'Painel de Controle'}
          </NavLink>
        )}

        <span className="sidebar-section-title">Cadastros</span>
        {(isAdmin || isLocador || isLocatario || isAuxiliar) && (
          <>
            <NavLink to="/veiculos" className={({ isActive }) => isActive ? 'active' : ''}>
              <Car size={16} /> Veículos
            </NavLink>
            {(isLocador || isLocatario || isAuxiliar) && (
              <NavLink to="/configuracao-smtp" className={({ isActive }) => isActive ? 'active' : ''}>
                <Mail size={16} /> Configuração SMTP
              </NavLink>
            )}
          </>
        )}
        {isAdmin && (
          <>
            <NavLink to="/locadores" className={({ isActive }) => isActive ? 'active' : ''}>
              <UserCheck size={16} /> Locadores
            </NavLink>
            <NavLink to="/locatarios" className={({ isActive }) => isActive ? 'active' : ''}>
              <Users size={16} /> Locatários
            </NavLink>
          </>
        )}
        {(isAdmin || isLocador) && (
          <NavLink to="/colaboradores" className={({ isActive }) => isActive ? 'active' : ''}>
            <Briefcase size={16} /> Colaboradores
          </NavLink>
        )}

        {(isAdmin || isLocador || isLocatario || isAuxiliar) && (
          <>
            <span className="sidebar-section-title">Financeiro</span>
            <NavLink to="/financeiro" className={({ isActive }) => isActive ? 'active' : ''}>
              <DollarSign size={16} /> Despesas, Lucros e Gráficos
            </NavLink>
            {(isAdmin || isLocador) && (
              <NavLink to="/aquisicoes" className={({ isActive }) => isActive ? 'active' : ''}>
                <CreditCard size={16} /> Aquisição de Veículos
              </NavLink>
            )}
          </>
        )}

        {isAdmin && (
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
            {isAuxiliar && (
              <span className="meta" title={locadorVinculado ? `Locador #${locadorVinculado.id} - ${locadorVinculado.nome}` : 'Locador não identificado'}>
                {locadorVinculado
                  ? `Locador: #${locadorVinculado.id} ${locadorVinculado.nome}`
                  : 'Locador: não identificado'}
              </span>
            )}
            {isLocador && locadorProprio && (
              <span className="meta" title={`Seu cadastro de locador #${locadorProprio.id}`}>
                {`Cadastro de locador: #${locadorProprio.id}`}
              </span>
            )}
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          <LogOut size={14} /> Sair
        </button>
      </div>
    </aside>
  );
}
