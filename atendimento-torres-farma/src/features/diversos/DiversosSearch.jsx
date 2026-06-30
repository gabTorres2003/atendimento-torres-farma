import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useDiversos } from '../../core/hooks/useDiversos';
import DiversosList from './DiversosList';

export default function DiversosSearch() {
  const { medicamentos, buscarMedicamentos, loading } = useDiversos();
  const [searchTerm, setSearchTerm] = useState('');

  // Busca inicial (vazia = traz todos os registros em ordem alfabética)
  useEffect(() => {
    buscarMedicamentos('');
  }, [buscarMedicamentos]);

  // Função para lidar com a digitação na busca
  const handleSearch = (e) => {
    e.preventDefault();
    buscarMedicamentos(searchTerm);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary)', marginBottom: '24px', fontWeight: 'bold' }}>
        Pesquisa de Diversos (Controlados / Antibióticos)
      </h1>

      {/* Barra de Pesquisa */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={20} color="var(--color-text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Buscar por nome do medicamento ou código (gaveta)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '16px 16px 16px 48px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              fontSize: '1rem',
              outline: 'none'
            }}
          />
        </div>
        <button 
          type="submit" 
          style={{
            padding: '0 24px', backgroundColor: 'var(--color-primary)', color: '#fff', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer'
          }}
        >
          Buscar
        </button>
      </form>

      {/* Tabela de Resultados */}
      <DiversosList medicamentos={medicamentos} loading={loading} />
    </div>
  );
}