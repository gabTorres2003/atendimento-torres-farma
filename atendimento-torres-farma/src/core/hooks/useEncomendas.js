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
           if (encomendaAntiga.fornecedor !== encomendaData.fornecedor) detalhes += `Fornecedor: ${encomendaAntiga.fornecedor || 'N/A'} -> ${encomendaData.fornecedor || 'N/A'}. `;
           if (encomendaAntiga.produto !== encomendaData.produto) detalhes += `Produto: ${encomendaAntiga.produto} -> ${encomendaData.produto}. `;
           if (encomendaAntiga.data_encomenda !== encomendaData.data_encomenda) detalhes += `Data: ${encomendaAntiga.data_encomenda} -> ${encomendaData.data_encomenda}. `;
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