import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Search as SearchIcon } from 'lucide-react';
import { useAuth } from '../../core/hooks/useAuth';
import { AuditoriaRepository } from '../../infrastructure/supabase/repositories/AuditoriaRepository';
import { DiversosRepository } from '../../infrastructure/supabase/repositories/DiversosRepository';
import DiversosForm from './DiversosForm';
import { Card } from '../../shared/components/cards/Card';
import { Button } from '../../shared/components/buttons/Button';

export default function DiversosSearch() {
  const { user } = useAuth();
  const [medicamentos, setMedicamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroClassificacao, setFiltroClassificacao] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [medicamentoEdit, setMedicamentoEdit] = useState(null);

  const fetchMedicamentos = async (termo = '') => {
    setLoading(true);
    try {
      const data = await DiversosRepository.buscarTodos(termo);
      setMedicamentos(data || []);
    } catch (error) {
      console.error('Erro ao buscar medicamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicamentos();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    
    if (termoBusca.trim() !== '') {
      const usuarioLogado = user?.nome || 'Balcão';
      AuditoriaRepository.registrarAcesso(usuarioLogado, 'PESQUISA', `Buscou por: "${termoBusca}" no módulo Diversos`);
    }

    fetchMedicamentos(termoBusca);
  };

  const handleOpenModal = (medicamento = null) => {
    setMedicamentoEdit(medicamento);
    setIsModalOpen(true);
  };

  const handleDelete = async (id, produto) => {
    if (window.confirm(`Tem certeza que deseja excluir permanentemente ${produto}?`)) {
      try {
        await DiversosRepository.deletar(id);
        fetchMedicamentos(termoBusca);
      } catch (error) {
        console.error('Erro ao deletar:', error);
        alert('Erro ao excluir medicamento.');
      }
    }
  };

  const medicamentosFiltrados = medicamentos.filter((med) => {
    const passouCategoria = filtroCategoria ? med.categoria === filtroCategoria : true;
    const passouClassificacao = filtroClassificacao ? med.classificacao === filtroClassificacao : true;
    return passouCategoria && passouClassificacao;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ color: 'var(--color-primary)', fontSize: '1.5rem', fontWeight: 'bold' }}>
          Pesquisa de Diversos
        </h2>
        
        {user?.role === 'admin' && (
          <Button onClick={() => handleOpenModal()} icon={Plus} style={{ width: 'auto' }}>
            Novo Medicamento
          </Button>
        )}
      </div>

      <Card>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <SearchIcon size={20} color="var(--color-text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar por nome do medicamento ou número do diversos..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              style={{ width: '100%', padding: '12px 16px 12px 48px', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none', fontSize: '1rem' }}
            />
          </div>
          <Button type="submit" style={{ width: 'auto', padding: '0 32px' }}>
            Buscar
          </Button>
        </form>

        <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap', padding: '12px', backgroundColor: 'var(--color-background-alt)', borderRadius: '8px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Filtrar por Categoria:</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['', 'Antibiótico', 'Controlado'].map(cat => (
                <button
                  key={`cat-${cat}`}
                  type="button"
                  onClick={() => setFiltroCategoria(cat)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '20px',
                    border: filtroCategoria === cat ? 'none' : '1px solid var(--color-border)',
                    backgroundColor: filtroCategoria === cat ? 'var(--color-primary)' : '#fff',
                    color: filtroCategoria === cat ? '#fff' : 'var(--color-text-main)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: filtroCategoria === cat ? 'bold' : 'normal',
                    transition: 'all 0.2s'
                  }}
                >
                  {cat === '' ? 'Todas' : cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Filtrar por Classificação:</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {/* Opção "Similar" Removida Aqui */}
              {['', 'Genérico', 'Ético'].map(clas => (
                <button
                  key={`clas-${clas}`}
                  type="button"
                  onClick={() => setFiltroClassificacao(clas)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '20px',
                    border: filtroClassificacao === clas ? 'none' : '1px solid var(--color-border)',
                    backgroundColor: filtroClassificacao === clas ? 'var(--color-primary)' : '#fff',
                    color: filtroClassificacao === clas ? '#fff' : 'var(--color-text-main)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: filtroClassificacao === clas ? 'bold' : 'normal',
                    transition: 'all 0.2s'
                  }}
                >
                  {clas === '' ? 'Todas' : clas}
                </button>
              ))}
            </div>
          </div>

        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px', width: '120px' }}>Código</th>
                <th style={{ padding: '12px 16px' }}>Produto</th>
                <th style={{ padding: '12px 16px' }}>Categoria</th>
                <th style={{ padding: '12px 16px' }}>Classificação</th>
                {user?.role === 'admin' && <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ações (Admin)</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={user?.role === 'admin' ? 5 : 4} style={{ padding: '16px', textAlign: 'center' }}>Carregando...</td></tr>
              ) : medicamentosFiltrados.length === 0 ? (
                <tr><td colSpan={user?.role === 'admin' ? 5 : 4} style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Nenhum medicamento encontrado para este filtro.</td></tr>
              ) : (
                medicamentosFiltrados.map((med) => (
                  <tr key={med.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                      {med.codigo_diversos ? med.codigo_diversos : '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{med.produto}</td>
                    
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold',
                        backgroundColor: med.categoria === 'Controlado' ? '#fef3c7' : '#fef9c3',
                        color: med.categoria === 'Controlado' ? '#b45309' : '#854d0e'
                      }}>
                        {med.categoria}
                      </span>
                    </td>
                    
                    <td style={{ padding: '12px 16px' }}>
                      {med.classificacao || '-'}
                    </td>
                    
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