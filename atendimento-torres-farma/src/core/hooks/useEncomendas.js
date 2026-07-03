import { useState, useCallback } from 'react';
import { EncomendasRepository } from '../../infrastructure/supabase/repositories/EncomendasRepository';

export const useEncomendas = () => {
  const [loading, setLoading] = useState(false);
  const [encomendas, setEncomendas] = useState([]);

  const listarEncomendas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await EncomendasRepository.listarTodos();
      setEncomendas(data);
    } catch (error) {
      console.error('Erro ao buscar encomendas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const salvarEncomenda = async (encomendaData, encomendaAntiga = null) => {
    setLoading(true);
    try {
      const usuarioLogado = JSON.parse(localStorage.getItem('@AtendimentoTorres:user'))?.nome || 'Balcão';

      if (encomendaData.id) {
        await EncomendasRepository.atualizar(encomendaData.id, encomendaData);
        
        let detalhes = '';
        if (encomendaAntiga) {
           if (encomendaAntiga.status !== encomendaData.status) detalhes += `Status: ${encomendaAntiga.status} -> ${encomendaData.status}. `;
           if (encomendaAntiga.fornecedor !== encomendaData.fornecedor) detalhes += `Fornecedor Compra: ${encomendaAntiga.fornecedor || 'N/A'} -> ${encomendaData.fornecedor || 'N/A'}. `;
           if (encomendaAntiga.produto !== encomendaData.produto) detalhes += `Produto: ${encomendaAntiga.produto} -> ${encomendaData.produto}. `;
           
           if (encomendaAntiga.comprado !== encomendaData.comprado) {
               detalhes += encomendaData.comprado ? 'Marcou a encomenda como Comprada. ' : 'Desmarcou a compra. ';
           }
           if (encomendaAntiga.entregue !== encomendaData.entregue) {
               detalhes += encomendaData.entregue ? 'Confirmou a Entrega ao cliente. ' : 'Desmarcou a Entrega. ';
           }
           if (encomendaAntiga.quantidade !== encomendaData.quantidade) {
               detalhes += `Quantidade: ${encomendaAntiga.quantidade || '1'} -> ${encomendaData.quantidade}. `;
           }
           if (encomendaAntiga.pagamento !== encomendaData.pagamento) {
               detalhes += `Pagamento: ${encomendaAntiga.pagamento || 'Receber na entrega'} -> ${encomendaData.pagamento}. `;
           }
           
           if (encomendaAntiga.codigo_produto !== encomendaData.codigo_produto) {
               detalhes += `Código Prod: ${encomendaAntiga.codigo_produto || '-'} -> ${encomendaData.codigo_produto || '-'}. `;
           }
           if (encomendaAntiga.data_prevista !== encomendaData.data_prevista) {
               detalhes += `Data Prevista: alterada. `;
           }
           if (encomendaAntiga.fornecedor_sugerido !== encomendaData.fornecedor_sugerido) {
               detalhes += `Forn. Sugerido: ${encomendaAntiga.fornecedor_sugerido || '-'} -> ${encomendaData.fornecedor_sugerido || '-'}. `;
           }
        }
        
        if (detalhes !== '') {
          await EncomendasRepository.registrarAuditoria(usuarioLogado, 'EDITOU', encomendaData.produto, detalhes);
        }
      } else {
        await EncomendasRepository.criar(encomendaData);
        await EncomendasRepository.registrarAuditoria(usuarioLogado, 'CRIOU', encomendaData.produto, `Cliente: ${encomendaData.cliente}`);
      }
      await listarEncomendas();
      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar encomenda:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const deletarEncomenda = async (id, produto) => {
    setLoading(true);
    try {
      const usuarioLogado = JSON.parse(localStorage.getItem('@AtendimentoTorres:user'))?.nome || 'Balcão';
      await EncomendasRepository.deletar(id);
      await EncomendasRepository.registrarAuditoria(usuarioLogado, 'EXCLUIU', produto, 'Registro apagado permanentemente.');
      await listarEncomendas();
      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar encomenda:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  return { encomendas, loading, listarEncomendas, salvarEncomenda, deletarEncomenda };
};