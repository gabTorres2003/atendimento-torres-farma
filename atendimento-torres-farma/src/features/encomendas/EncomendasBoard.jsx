import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useEncomendas } from '../../core/hooks/useEncomendas';
import EncomendaForm from './EncomendaForm';
import { Card } from '../../shared/components/cards/Card';
import { Button } from '../../shared/components/buttons/Button';

export default function EncomendasBoard() {
  const { encomendas, loading, listarEncomendas, deletarEncomenda, salvarEncomenda } = useEncomendas();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [encomendaEdit, setEncomendaEdit] = useState(null);

  useEffect(() => {
    listarEncomendas();
  }, [listarEncomendas]);

  const handleOpenModal = (encomenda = null) => {
    setEncomendaEdit(encomenda);
    setIsModalOpen(true);
  };

  const handleDelete = async (id, produto) => {
    if (window.confirm(`Tem certeza que deseja excluir a encomenda de ${produto}?`)) {
      await deletarEncomenda(id, produto);
    }
  };

  const handleStatusChange = async (encomenda, novoStatus) => {
    const payload = { ...encomenda, status: novoStatus };
    const result = await salvarEncomenda(payload, encomenda);
    if (!result.success) {
      alert('Erro ao atualizar o status da encomenda.');
    }
  };

  const formatData = (dataIso) => {
    if (!dataIso) return '-';
    const partes = dataIso.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataIso;
  };

  // Cores dinâmicas baseadas no checklist
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Pendente de Compra': return { backgroundColor: '#fef3c7', color: '#b45309' }; // Amarelo
      case 'Comprado': return { backgroundColor: '#e0f2fe', color: '#0369a1' }; // Azul
      case 'Pendente de Entrega': return { backgroundColor: '#fae8ff', color: '#86198f' }; // Roxo
      case 'Concluída': return { backgroundColor: '#dcfce7', color: '#166534' }; // Verde
      default: return { backgroundColor: '#f1f5f9', color: '#475569' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--color-primary)', fontSize: '1.5rem', fontWeight: 'bold' }}>Gestão de Encomendas</h2>
        <Button onClick={() => handleOpenModal()} icon={Plus} style={{ width: 'auto' }}>
          Nova Encomenda
        </Button>
      </div>

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px' }}>Data</th>
                <th style={{ padding: '12px 16px' }}>Cliente</th>
                <th style={{ padding: '12px 16px' }}>Telefone</th>
                <th style={{ padding: '12px 16px' }}>Produto</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Fornecedor</th>
                <th style={{ padding: '12px 16px' }}>Vendedor</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && encomendas.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: '16px', textAlign: 'center' }}>Carregando...</td></tr>
              ) : encomendas.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Nenhuma encomenda encontrada.</td></tr>
              ) : (
                encomendas.map((enc) => (
                  <tr key={enc.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px' }}>{formatData(enc.data_encomenda)}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{enc.cliente}</td>
                    <td style={{ padding: '12px 16px' }}>{enc.telefone || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>{enc.produto}</td>
                    
                    {/* Select mapeado com as opções do checklist */}
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={enc.status}
                        onChange={(e) => handleStatusChange(enc, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          border: '1px solid transparent',
                          cursor: 'pointer',
                          outline: 'none',
                          ...getStatusStyle(enc.status)
                        }}
                      >
                        <option value="Pendente de Compra" style={{backgroundColor: '#fff', color: '#000'}}>Pendente de Compra</option>
                        <option value="Comprado" style={{backgroundColor: '#fff', color: '#000'}}>Comprado</option>
                        <option value="Pendente de Entrega" style={{backgroundColor: '#fff', color: '#000'}}>Pendente de Entrega</option>
                        <option value="Concluída" style={{backgroundColor: '#fff', color: '#000'}}>Concluída</option>
                      </select>
                    </td>

                    <td style={{ padding: '12px 16px' }}>{enc.fornecedor || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>{enc.vendedor || '-'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button onClick={() => handleOpenModal(enc)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', marginRight: '16px' }}>
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDelete(enc.id, enc.produto)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isModalOpen && (
        <EncomendaForm
          encomenda={encomendaEdit}
          onClose={() => setIsModalOpen(false)}
          onSaved={listarEncomendas}
        />
      )}
    </div>
  );
}