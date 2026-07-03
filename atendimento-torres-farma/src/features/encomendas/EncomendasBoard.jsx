import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, MessageCircle } from 'lucide-react';
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

  const handleCheckboxChange = async (encomenda, campo, valor) => {
    const payload = { ...encomenda, [campo]: valor };
    if (campo === 'comprado' && valor && !payload.data_compra) {
      payload.data_compra = new Date().toISOString().split('T')[0];
    }
    const result = await salvarEncomenda(payload, encomenda);
    if (!result.success) {
      alert('Erro ao atualizar a encomenda.');
    }
  };

  const enviarWhatsApp = (enc) => {
    if (!enc.telefone) {
      alert('Esta encomenda não possui um telefone cadastrado.');
      return;
    }

    // Remove qualquer traço, espaço ou parênteses do número
    const numeroLimpo = enc.telefone.replace(/\D/g, '');
    
    // Mensagem dinâmica baseada no status
    let mensagem = '';
    if (enc.entregue) {
      mensagem = `Olá, ${enc.cliente}! Aqui é da Torres Farma. Passando para confirmar que a entrega da sua encomenda de ${enc.quantidade || '1'}x ${enc.produto} foi concluída. Muito obrigado pela preferência!`;
    } else if (enc.comprado) {
      mensagem = `Olá, ${enc.cliente}! Aqui é da Torres Farma. Boas notícias: sua encomenda de ${enc.quantidade || '1'}x ${enc.produto} já chegou e está separada para você! Podemos agendar a entrega ou você prefere passar para retirar?`;
    } else {
      mensagem = `Olá, ${enc.cliente}! Aqui é da Torres Farma. Referente à sua encomenda de ${enc.quantidade || '1'}x ${enc.produto}...`;
    }

    // Abre a API oficial do WhatsApp já com texto pronto
    const url = `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  const formatData = (dataIso) => {
    if (!dataIso) return '-';
    const partes = dataIso.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataIso;
  };

  const getStatusInfo = (enc) => {
    if (enc.entregue) return { texto: 'Concluída', cor: { backgroundColor: '#dcfce7', color: '#166534' } };
    if (enc.comprado) return { texto: 'Pendente de Entrega', cor: { backgroundColor: '#e0f2fe', color: '#0369a1' } };
    return { texto: 'Pendente de Compra', cor: { backgroundColor: '#fef3c7', color: '#b45309' } };
  };

  const encomendasOrdenadas = [...encomendas].sort((a, b) => {
    const aPendente = !a.entregue;
    const bPendente = !b.entregue;
    if (aPendente && !bPendente) return -1;
    if (!aPendente && bPendente) return 1;
    const dataA = new Date(a.data_encomenda || 0);
    const dataB = new Date(b.data_encomenda || 0);
    return dataB - dataA;
  });

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
                <th style={{ padding: '12px 16px' }}>Produto</th>
                <th style={{ padding: '12px 16px' }}>Qtd</th>
                <th style={{ padding: '12px 16px' }}>Pagamento</th>
                <th style={{ padding: '12px 16px' }}>Acompanhamento</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && encomendasOrdenadas.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: '16px', textAlign: 'center' }}>Carregando...</td></tr>
              ) : encomendasOrdenadas.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Nenhuma encomenda encontrada.</td></tr>
              ) : (
                encomendasOrdenadas.map((enc) => {
                  const statusInfo = getStatusInfo(enc);
                  return (
                    <tr key={enc.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px' }}>{formatData(enc.data_encomenda)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 'bold' }}>{enc.cliente}</div>
                        
                        {/* Botão do WhatsApp Inserido Aqui */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {enc.telefone || '-'}
                          {enc.telefone && (
                            <button 
                              onClick={() => enviarWhatsApp(enc)} 
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', padding: 0, display: 'flex' }} 
                              title="Avisar pelo WhatsApp"
                            >
                              <MessageCircle size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{enc.produto}</td>
                      <td style={{ padding: '12px 16px' }}>{enc.quantidade || '1'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.9rem' }}>{enc.pagamento || '-'}</td>
                      
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={enc.comprado || false} 
                              onChange={(e) => handleCheckboxChange(enc, 'comprado', e.target.checked)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.85rem', color: enc.comprado ? 'var(--color-primary)' : 'inherit', fontWeight: enc.comprado ? 'bold' : 'normal' }}>
                              Comprado
                            </span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={enc.entregue || false} 
                              onChange={(e) => handleCheckboxChange(enc, 'entregue', e.target.checked)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.85rem', color: enc.entregue ? '#166534' : 'inherit', fontWeight: enc.entregue ? 'bold' : 'normal' }}>
                              Confirmar Entrega
                            </span>
                          </label>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', ...statusInfo.cor }}>
                          {statusInfo.texto}
                        </span>
                      </td>
                      
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button onClick={() => handleOpenModal(enc)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', marginRight: '16px' }}>
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDelete(enc.id, enc.produto)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
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