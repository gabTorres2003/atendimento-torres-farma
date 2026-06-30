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

  const salvarEncomenda = async (encomendaData) => {
    setLoading(true);
    try {
      if (encomendaData.id) {
        await EncomendasRepository.atualizar(encomendaData.id, encomendaData);
      } else {
        await EncomendasRepository.criar(encomendaData);
      }
      await listarEncomendas(); // Recarrega a lista
      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar encomenda:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const deletarEncomenda = async (id) => {
    setLoading(true);
    try {
      await EncomendasRepository.deletar(id);
      await listarEncomendas(); // Recarrega a lista
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