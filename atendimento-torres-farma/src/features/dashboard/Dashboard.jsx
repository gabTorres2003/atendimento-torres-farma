import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Users, ClipboardList } from 'lucide-react';
import { useAuth } from '../../core/hooks/useAuth';
import { Card } from '../../shared/components/cards/Card';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary)', marginBottom: '8px', fontWeight: 'bold' }}>
        Olá, {user?.nome}!
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '32px' }}>
        Selecione o módulo que deseja acessar:
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
        
        {/* Módulo Diversos */}
        <Card 
          style={{ cursor: 'pointer', textAlign: 'center', padding: '40px 20px', transition: 'transform 0.2s' }}
          onClick={() => navigate('/diversos')}
        >
          <Search size={48} color="var(--color-primary)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' }}>Diversos</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Pesquisa de Antibióticos e Controlados
          </p>
        </Card>

        {/* Módulo Encomendas */}
        <Card 
          style={{ cursor: 'pointer', textAlign: 'center', padding: '40px 20px', transition: 'transform 0.2s' }}
          onClick={() => navigate('/encomendas')}
        >
          <Package size={48} color="var(--color-primary)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' }}>Encomendas</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Gestão de pedidos e faltas
          </p>
        </Card>

        {/* Módulo Admin (Apenas para Gerentes/Admins) */}
        {user?.role === 'admin' && (
          <>
            <Card 
              style={{ cursor: 'pointer', textAlign: 'center', padding: '40px 20px', transition: 'transform 0.2s', border: '2px dashed var(--color-primary)' }}
              onClick={() => navigate('/usuarios')}
            >
              <Users size={48} color="var(--color-primary)" style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' }}>Equipe</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                Gestão de acessos e PINs
              </p>
            </Card>

            <Card 
              style={{ cursor: 'pointer', textAlign: 'center', padding: '40px 20px', transition: 'transform 0.2s', border: '2px dashed var(--color-primary)' }}
              onClick={() => navigate('/auditoria')}
            >
              <ClipboardList size={48} color="var(--color-primary)" style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' }}>Auditoria</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                Histórico de ações do sistema
              </p>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}