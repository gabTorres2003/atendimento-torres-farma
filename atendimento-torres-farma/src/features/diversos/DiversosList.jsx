import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../core/hooks/useAuth';
import { formatCurrency } from '../../core/utils/formatters';
import { Card } from '../../shared/components/cards/Card';

export default function DiversosList({ medicamentos, loading }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Carregando medicamentos...</div>;
  }

  if (!medicamentos || medicamentos.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Nenhum medicamento encontrado para esta busca.</p>
      </Card>
    );
  }

  return (
    <Card style={{ overflowX: 'auto', padding: '0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--color-background-alt)', borderBottom: '2px solid var(--color-border)' }}>
            <th style={{ padding: '16px', fontWeight: 'bold' }}>Código / Gaveta</th>
            <th style={{ padding: '16px', fontWeight: 'bold' }}>Produto</th>
            <th style={{ padding: '16px', fontWeight: 'bold' }}>Categoria</th>
            <th style={{ padding: '16px', fontWeight: 'bold' }}>Classificação</th>
            <th style={{ padding: '16px', fontWeight: 'bold' }}>Preço</th>
            {isAdmin && <th style={{ padding: '16px', fontWeight: 'bold', textAlign: 'right' }}>Ações (Admin)</th>}
          </tr>
        </thead>
        <tbody>
          {medicamentos.map((med) => (
            <tr key={med.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                {med.codigo_diversos || '-'}
              </td>
              <td style={{ padding: '16px' }}>{med.produto}</td>
              <td style={{ padding: '16px' }}>
                <span style={{ 
                  backgroundColor: med.categoria?.toLowerCase() === 'antibiótico' ? '#dbeafe' : '#fef3c7',
                  color: med.categoria?.toLowerCase() === 'antibiótico' ? '#1e40af' : '#92400e',
                  padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '600' 
                }}>
                  {med.categoria}
                </span>
              </td>
              <td style={{ padding: '16px' }}>{med.classificacao || '-'}</td>
              <td style={{ padding: '16px' }}>{formatCurrency(med.preco)}</td>
              
              {/* Visão de ADM */}
              {isAdmin && (
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <button style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', marginRight: '12px' }} title="Editar">
                    <Edit size={18} />
                  </button>
                  <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Excluir">
                    <Trash2 size={18} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}