import React from 'react';
import { Plus, Edit, Trash2, MessageCircle, Search as SearchIcon } from 'lucide-react';
import { useEncomendasBoard } from './useEncomendasBoard';
import EncomendaForm from './EncomendaForm';
import { Card } from '../../shared/components/cards/Card';
import { Button } from '../../shared/components/buttons/Button';

export default function EncomendasBoard() {
  const {
    loading, abaAtiva, setAbaAtiva, termoBuscaHistorico, setTermoBuscaHistorico,
    encomendasVisiveis, isModalOpen, encomendaEdit, handleOpenModal, handleCloseModal,
    handleDelete, handleCheckboxChange, compraModal, setCompraModal,
    compraData, setCompraData, compraFornecedor, setCompraFornecedor,
    confirmarCompra, enviarWhatsApp, formatData, getStatusInfo, listarEncomendas
  } = useEncomendasBoard();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--color-primary)', fontSize: '1.5rem', fontWeight: 'bold' }}>Gestão de Encomendas</h2>
        <Button onClick={() => handleOpenModal()} icon={Plus} style={{ width: 'auto' }}>
          Nova Encomenda
        </Button>
      </div>

      <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid var(--color-border)', paddingBottom: '16px' }}>
        <button 
          onClick={() => setAbaAtiva('pendentes')}
          style={{ 
            padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
            backgroundColor: abaAtiva === 'pendentes' ? 'var(--color-primary)' : '#e2e8f0', 
            color: abaAtiva === 'pendentes' ? '#fff' : 'var(--color-text-main)' 
          }}
        >
          Em Andamento
        </button>
        <button 
          onClick={() => setAbaAtiva('historico')}
          style={{ 
            padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
            backgroundColor: abaAtiva === 'historico' ? '#166534' : '#e2e8f0', 
            color: abaAtiva === 'historico' ? '#fff' : 'var(--color-text-main)' 
          }}
        >
          Histórico (Concluídas)
        </button>
      </div>

      <Card>
        {abaAtiva === 'historico' && (
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <SearchIcon size={20} color="var(--color-text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar no histórico por cliente, produto, número, data, fornecedor ou vendedor..."
              value={termoBuscaHistorico}
              onChange={(e) => setTermoBuscaHistorico(e.target.value)}
              style={{ width: '100%', padding: '12px 16px 12px 48px', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none', fontSize: '1rem', backgroundColor: '#f8fafc' }}
            />
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Datas (Enc/Prev)</th>
                <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Cliente</th>
                <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Produto</th>
                <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Qtd</th>
                <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Fornecedor</th>
                <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Pagamento</th>
                <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Acompanhamento</th>
                <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && encomendasVisiveis.length === 0 ? (
                <tr><td colSpan="9" style={{ padding: '16px', textAlign: 'center' }}>Carregando...</td></tr>
              ) : encomendasVisiveis.length === 0 ? (
                <tr><td colSpan="9" style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  {abaAtiva === 'pendentes' ? 'Nenhuma encomenda pendente no momento!' : 'Nenhuma encomenda concluída encontrada na busca.'}
                </td></tr>
              ) : (
                encomendasVisiveis.map((enc) => {
                  const statusInfo = getStatusInfo(enc);
                  return (
                    <tr key={enc.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      
                      {/* Datas agrupadas para não quebrar layout */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '500' }}>{formatData(enc.data_encomenda)}</div>
                        {enc.data_prevista && (
                          <div style={{ fontSize: '0.8rem', color: '#ea580c', fontWeight: 'bold', marginTop: '2px' }}>
                            Prev: {formatData(enc.data_prevista)}
                          </div>
                        )}
                      </td>
                      
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 'bold' }}>{enc.cliente}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {enc.telefone || '-'}
                          {enc.telefone && (
                            <button onClick={() => enviarWhatsApp(enc)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', padding: 0, display: 'flex' }} title="Avisar pelo WhatsApp">
                              <MessageCircle size={15} />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Produto com minWidth para impedir quebra feia */}
                      <td style={{ padding: '12px 16px', minWidth: '220px' }}>
                        <div style={{ fontWeight: 'bold', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' }}>{enc.produto}</div>
                        {enc.codigo_produto && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-primary)', marginTop: '4px', fontWeight: '500' }}>
                            Cód: {enc.codigo_produto}
                          </div>
                        )}
                      </td>
                      
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{enc.quantidade || '1'}</td>
                      
                      {/* Fornecedores agrupados */}
                      <td style={{ padding: '12px 16px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: enc.fornecedor ? 'bold' : 'normal', color: enc.fornecedor ? 'inherit' : 'var(--color-text-muted)' }}>
                          {enc.fornecedor || 'Sem Compra'}
                        </div>
                        {enc.data_compra && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>{formatData(enc.data_compra)}</div>
                        )}
                        {enc.fornecedor_sugerido && !enc.fornecedor && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            Sug: {enc.fornecedor_sugerido}
                          </div>
                        )}
                      </td>
                      
                      <td style={{ padding: '12px 16px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{enc.pagamento || '-'}</td>
                      
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={enc.comprado || false} onChange={(e) => handleCheckboxChange(enc, 'comprado', e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                            <span style={{ fontSize: '0.85rem', color: enc.comprado ? 'var(--color-primary)' : 'inherit', fontWeight: enc.comprado ? 'bold' : 'normal' }}>
                              Comprado
                            </span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={enc.entregue || false} onChange={(e) => handleCheckboxChange(enc, 'entregue', e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                            <span style={{ fontSize: '0.85rem', color: enc.entregue ? '#166534' : 'inherit', fontWeight: enc.entregue ? 'bold' : 'normal' }}>
                              Confirmar Entrega
                            </span>
                          </label>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', ...statusInfo.cor }}>
                          {statusInfo.texto}
                        </span>
                      </td>
                      
                      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
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

      {compraModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <Card style={{ width: '100%', maxWidth: '400px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: '16px' }}>Confirmar Compra</h3>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
                    Informe os detalhes da compra de <strong>{compraModal.encomenda.produto}</strong>.
                </p>
                <form onSubmit={confirmarCompra} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-main)' }}>Data da Compra *</label>
                        <input type="date" value={compraData} onChange={(e) => setCompraData(e.target.value)} style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', outline: 'none', fontFamily: 'inherit' }} required />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-main)' }}>Fornecedor Solicitado *</label>
                        <select value={compraFornecedor} onChange={(e) => setCompraFornecedor(e.target.value)} style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', outline: 'none' }} required >
                            <option value="">Selecione...</option>
                            <option value="Panpharma">Panpharma</option>
                            <option value="Profarma">Profarma</option>
                            <option value="SantaCruz">SantaCruz</option>
                            <option value="Outro">Outro</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                        <Button type="button" onClick={() => setCompraModal({ isOpen: false, encomenda: null })} variant="secondary">Cancelar</Button>
                        <Button type="submit" isLoading={loading}>Confirmar Compra</Button>
                    </div>
                </form>
            </Card>
        </div>
      )}

      {isModalOpen && (
        <EncomendaForm
          encomenda={encomendaEdit}
          onClose={handleCloseModal}
          onSaved={listarEncomendas}
        />
      )}
    </div>
  );
}