import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Search as SearchIcon } from 'lucide-react';
import { useDiversos } from '../../core/hooks/useDiversos';
import { useAuth } from '../../core/hooks/useAuth';
import DiversosForm from './DiversosForm';
import { Card } from '../../shared/components/cards/Card';
import { Button } from '../../shared/components/buttons/Button';

export default function DiversosSearch() {
  const { buscarTodos, deletarMedicamento } = useDiversos();
  const { user } = useAuth(); // Identifica se é Admin ou Balconista
  const [medicamentos, setMedicamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [medicamentoEdit, setMedicamentoEdit] = useState(null);

  const fetchMedicamentos = async (termo = '') => {
    setLoading(true);
    try {
      const data = await buscarTodos(termo);
      setMedicamentos(data || []);
    } catch (error) {
      console.error('Erro ao buscar medicamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carrega tudo ao abrir a tela
  useEffect(() => {
    fetchMedicamentos();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchMedicamentos(termoBusca);
  };

  const handleOpenModal = (medicamento = null) => {
    setMedicamentoEdit(medicamento);
    setIsModalOpen(true);
  };

  const handleDelete = async (id, produto) => {
    if (window.confirm(`Tem certeza que deseja excluir permanentemente ${produto}?`)) {
      await deletarMedicamento(id);
      fetchMedicamentos(termoBusca);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ color: 'var(--color-primary)', fontSize: '1.5rem', fontWeight: 'bold' }}>
          Pesquisa de Diversos
        </h2>
        
        {/* BOTÃO OCULTO PARA BALCONISTAS: Apenas ADM pode adicionar */}
        {user?.role === 'admin' && (
          <Button onClick={() => handleOpenModal()} icon={Plus} style={{ width: 'auto' }}>
            Novo Medicamento
          </Button>
        )}
      </div>

      <Card>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <input
            type="text"
            placeholder="Buscar por nome ou código..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none', fontSize: '1rem' }}
          />
          <Button type="submit" icon={SearchIcon} style={{ width: 'auto', padding: '0 24px' }}>
            Buscar
          </Button>
        </form>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px', width: '80px' }}>Código</th>
                <th style={{ padding: '12px 16px' }}>Produto</th>
                <th style={{ padding: '12px 16px' }}>Categoria</th>
                <th style={{ padding: '12px 16px' }}>Classificação</th>
                <th style={{ padding: '12px 16px' }}>Preço</th>
                
                {/* CABEÇALHO OCULTO PARA BALCONISTAS */}
                {user?.role === 'admin' && <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={user?.role === 'admin' ? 6 : 5} style={{ padding: '16px', textAlign: 'center' }}>Carregando...</td></tr>
              ) : medicamentos.length === 0 ? (
                <tr><td colSpan={user?.role === 'admin' ? 6 : 5} style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Nenhum medicamento encontrado.</td></tr>
              ) : (
                medicamentos.map((med) => (
                  <tr key={med.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                      {med.codigo_diversos ? String(med.codigo_diversos).padStart(3, '0') : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{med.produto}</td>
                    
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold',
                        backgroundColor: med.categoria === 'Controlado' ? '#fee2e2' : '#e0f2fe',
                        color: med.categoria === 'Controlado' ? '#991b1b' : '#0369a1'
                      }}>
                        {med.categoria}
                      </span>
                    </td>
                    
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold',
                        backgroundColor: '#f1f5f9', color: '#475569'
                      }}>
                        {med.classificacao || '-'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      {med.preco ? `R$ ${Number(med.preco).toFixed(2).replace('.', ',')}` : '-'}
                    </td>
                    
                    {/* AÇÕES OCULTAS PARA BALCONISTAS: Apenas ADM pode editar/excluir */}
                    {user?.role === 'admin' && (
                      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => handleOpenModal(med)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', marginRight: '16px' }}>
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDelete(med.id, med.produto)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                          <Trash2 size={18} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isModalOpen && (
        <DiversosForm
          medicamento={medicamentoEdit}
          onClose={() => setIsModalOpen(false)}
          onSaved={() => fetchMedicamentos(termoBusca)}
        />
      )}
    </div>
  );
}