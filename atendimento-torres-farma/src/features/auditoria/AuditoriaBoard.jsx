import React, { useEffect } from 'react';
import { useAuditoria } from '../../core/hooks/useAuditoria';
import { Card } from '../../shared/components/cards/Card';

export default function AuditoriaBoard() {
  const { registros, loading, listarRegistros } = useAuditoria();

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

  const getAcaoStyle = (acao) => {
    switch (acao) {
      case 'CRIOU': return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'EDITOU': return { backgroundColor: '#e0f2fe', color: '#0369a1' };
      case 'EXCLUIU': return { backgroundColor: '#fee2e2', color: '#991b1b' };
      default: return { backgroundColor: '#f1f5f9', color: '#475569' };
    }
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

      <Card style={{ overflowX: 'auto', padding: '0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-background-alt)', borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ padding: '16px' }}>Data e Hora</th>
              <th style={{ padding: '16px' }}>Usuário</th>
              <th style={{ padding: '16px' }}>Ação</th>
              <th style={{ padding: '16px' }}>Produto</th>
              <th style={{ padding: '16px' }}>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center' }}>Carregando histórico...</td></tr>
            ) : registros.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Nenhum registro encontrado.</td></tr>
            ) : (
              registros.map((reg) => (
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