import React, { useEffect, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { useAuditoria } from '../../core/hooks/useAuditoria';
import { Card } from '../../shared/components/cards/Card';

export default function AuditoriaBoard() {
  const { registros, loading, listarRegistros } = useAuditoria();

  // Estados dos filtros
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroAcao, setFiltroAcao] = useState('');
  const [filtroData, setFiltroData] = useState('');

  useEffect(() => {
    listarRegistros();
  }, [listarRegistros]);

  const formatarDataHora = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Pega apenas a parte da Data (YYYY-MM-DD) da data do banco para comparar com o input
  const getDateString = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getAcaoStyle = (acao) => {
    switch (acao) {
      case 'CRIOU': return { backgroundColor: '#dcfce7', color: '#166534' }; // Verde
      case 'EDITOU': return { backgroundColor: '#e0f2fe', color: '#0369a1' }; // Azul
      case 'EXCLUIU': return { backgroundColor: '#fee2e2', color: '#991b1b' }; // Vermelho
      case 'LOGIN': 
      case 'LOGOUT': return { backgroundColor: '#fef9c3', color: '#854d0e' }; // Amarelo
      case 'ACESSO': return { backgroundColor: '#f3f4f6', color: '#374151' }; // Cinza
      default: return { backgroundColor: '#f1f5f9', color: '#475569' };
    }
  };

  // Lê a lista e descobre quais são os usuários e ações únicas para preencher os <select> sozinhos
  const usuariosUnicos = [...new Set(registros.map(r => r.vendedor))].sort();
  const acoesUnicas = [...new Set(registros.map(r => r.acao))].sort();

  // Aplica os filtros matematicamente
  const registrosFiltrados = registros.filter(reg => {
    const passouUsuario = filtroUsuario ? reg.vendedor === filtroUsuario : true;
    const passouAcao = filtroAcao ? reg.acao === filtroAcao : true;
    const passouData = filtroData ? getDateString(reg.data_hora) === filtroData : true;
    
    return passouUsuario && passouAcao && passouData;
  });

  const limparFiltros = () => {
    setFiltroUsuario('');
    setFiltroAcao('');
    setFiltroData('');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
          Auditoria do Sistema
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Histórico completo de alterações realizadas na plataforma.
        </p>
      </div>

      {/* PAINEL DE FILTROS */}
      <Card style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Filter size={20} color="var(--color-primary)" />
          <span style={{ fontWeight: 'bold', color: 'var(--color-text-main)', fontSize: '1.1rem' }}>Filtros de Pesquisa</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1', minWidth: '200px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Usuário</label>
            <select 
              value={filtroUsuario} 
              onChange={(e) => setFiltroUsuario(e.target.value)} 
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', outline: 'none' }}
            >
              <option value="">Todos os usuários</option>
              {usuariosUnicos.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1', minWidth: '200px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Tipo de Ação</label>
            <select 
              value={filtroAcao} 
              onChange={(e) => setFiltroAcao(e.target.value)} 
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', outline: 'none' }}
            >
              <option value="">Todas as ações</option>
              {acoesUnicas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1', minWidth: '200px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Data Específica</label>
            <input 
              type="date" 
              value={filtroData} 
              onChange={(e) => setFiltroData(e.target.value)} 
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', outline: 'none', fontFamily: 'inherit' }} 
            />
          </div>

          {(filtroUsuario || filtroAcao || filtroData) && (
            <button 
              onClick={limparFiltros} 
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', height: 'fit-content' }}
            >
              <X size={18} /> Limpar
            </button>
          )}
        </div>
      </Card>

      <Card style={{ overflowX: 'auto', padding: '0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-background-alt)', borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ padding: '16px' }}>Data e Hora</th>
              <th style={{ padding: '16px' }}>Usuário</th>
              <th style={{ padding: '16px' }}>Ação</th>
              <th style={{ padding: '16px' }}>Produto / Módulo</th>
              <th style={{ padding: '16px' }}>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center' }}>Carregando histórico...</td></tr>
            ) : registrosFiltrados.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Nenhum registro encontrado para estes filtros.</td></tr>
            ) : (
              registrosFiltrados.map((reg) => (
                <tr key={reg.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>{formatarDataHora(reg.data_hora)}</td>
                  <td style={{ padding: '16px', fontWeight: 'bold' }}>{reg.vendedor}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', ...getAcaoStyle(reg.acao) }}>
                      {reg.acao}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontWeight: '500' }}>{reg.produto || '-'}</td>
                  <td style={{ padding: '16px', color: 'var(--color-text-muted)', fontSize: '0.9rem', maxWidth: '400px', lineHeight: '1.4' }}>{reg.detalhes || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}