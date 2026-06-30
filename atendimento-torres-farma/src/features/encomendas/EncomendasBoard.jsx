import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useEncomendas } from '../../core/hooks/useEncomendas';
import { formatDate, formatPhone } from '../../core/utils/formatters';
import { Card } from '../../shared/components/cards/Card';
import { Button } from '../../shared/components/buttons/Button';
import EncomendaForm from './EncomendaForm';

export default function EncomendasBoard() {
  const { encomendas, loading, listarEncomendas, deletarEncomenda } = useEncomendas();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [encomendaSelecionada, setEncomendaSelecionada] = useState(null);

  useEffect(() => {
    listarEncomendas();
  }, [listarEncomendas]);

  const handleNovaEncomenda = () => {
    setEncomendaSelecionada(null);
    setIsModalOpen(true);
  };

  const handleEditar = (encomenda) => {
    setEncomendaSelecionada(encomenda);
    setIsModalOpen(true);
  };

  const handleExcluir = async (id, produto) => {
    if (window.confirm(`Tem certeza que deseja excluir a encomenda de "${produto}"?`)) {
      await deletarEncomenda(id);
    }
  };

  // Renderiza a cor do status
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'recebido': return { bg: '#dcfce7', text: '#166534' }; // Verde
      case 'entregue': return { bg: '#f3f4f6', text: '#374151' }; // Cinza
      default: return { bg: '#fef9c3', text: '#854d0e' }; // Amarelo (Pendente)
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
          Gestão de Encomendas
        </h1>
        <Button onClick={handleNovaEncomenda} icon={Plus} style={{ width: 'auto' }}>
          Nova Encomenda
        </Button>
      </div>

      <Card style={{ overflowX: 'auto', padding: '0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-background-alt)', borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ padding: '16px' }}>Data</th>
              <th style={{ padding: '16px' }}>Cliente</th>
              <th style={{ padding: '16px' }}>Telefone</th>
              <th style={{ padding: '16px' }}>Produto</th>
              <th style={{ padding: '16px' }}>Status</th>
              <th style={{ padding: '16px' }}>Fornecedor</th>
              <th style={{ padding: '16px', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center' }}>Carregando encomendas...</td></tr>
            ) : encomendas.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center' }}>Nenhuma encomenda registrada.</td></tr>
            ) : (
              encomendas.map((enc) => {
                const colors = getStatusColor(enc.status);
                return (
                  <tr key={enc.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px' }}>{formatDate(enc.data_encomenda)}</td>
                    <td style={{ padding: '16px', fontWeight: 'bold' }}>{enc.cliente}</td>
                    <td style={{ padding: '16px' }}>{formatPhone(enc.telefone)}</td>
                    <td style={{ padding: '16px' }}>{enc.produto}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ backgroundColor: colors.bg, color: colors.text, padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {enc.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>{enc.fornecedor || '-'}</td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button onClick={() => handleEditar(enc)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', marginRight: '12px' }}>
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleExcluir(enc.id, enc.produto)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      {isModalOpen && (
        <EncomendaForm 
          encomenda={encomendaSelecionada} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
}