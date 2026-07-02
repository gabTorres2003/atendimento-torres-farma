import React, { useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, Home, Search, Package, Users, ClipboardList } from 'lucide-react';
import { useAuth } from '../../../core/hooks/useAuth';
import { AuditoriaRepository } from '../../../infrastructure/supabase/repositories/AuditoriaRepository';

export default function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Rastreador Automático de Navegação
  useEffect(() => {
    if (user?.nome && location.pathname) {
      let modulo = '';
      switch (location.pathname) {
        case '/': modulo = 'Início (Dashboard)'; break;
        case '/diversos': modulo = 'Módulo Diversos'; break;
        case '/encomendas': modulo = 'Módulo Encomendas'; break;
        case '/usuarios': modulo = 'Módulo de Equipe'; break;
        case '/auditoria': modulo = 'Módulo de Auditoria'; break;
        default: modulo = location.pathname;
      }
      
      AuditoriaRepository.registrarAcesso(
        user.nome, 
        'ACESSO', 
        `Navegou para: ${modulo}`
      );
    }
  }, [location.pathname, user?.nome]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Início', icon: Home },
    { path: '/diversos', label: 'Diversos', icon: Search },
    { path: '/encomendas', label: 'Encomendas', icon: Package },
  ];

  if (user?.role === 'admin') {
    navItems.push({ path: '/usuarios', label: 'Equipe', icon: Users });
    navItems.push({ path: '/auditoria', label: 'Auditoria', icon: ClipboardList });
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-background-alt)' }}>
      <aside style={{ width: '250px', backgroundColor: '#fff', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--color-border)', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
            <img src="/logo-torres.png" alt="Logo Torres" style={{ height: '36px', objectFit: 'contain' }} />
            <h2 style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '1.25rem', margin: 0 }}>Torres Farma</h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>Hub de Atendimento</p>
        </div>
        
        <nav style={{ flex: 1, padding: '16px 0' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', 
                  textDecoration: 'none', color: isActive ? 'var(--color-primary)' : 'var(--color-text-main)',
                  backgroundColor: isActive ? '#f0f9ff' : 'transparent',
                  borderRight: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                  fontWeight: isActive ? 'bold' : 'normal'
                }}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--color-text-main)' }}>
            Logado como: <strong style={{ textTransform: 'capitalize' }}>{user?.nome}</strong>
          </div>
          <button 
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '10px', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <LogOut size={18} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {children || <Outlet />}
      </main>
    </div>
  );
}