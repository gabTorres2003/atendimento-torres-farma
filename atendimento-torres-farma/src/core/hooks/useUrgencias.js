import { useCallback, useState } from 'react';
import { UrgenciasRepository } from '../../infrastructure/supabase/repositories/UrgenciasRepository';

export const useUrgencias = () => {
  const [loading, setLoading] = useState(false);
  const [urgencias, setUrgencias] = useState([]);

  const listarUrgencias = useCallback(async () => {
    setLoading(true);
    try {
      const data = await UrgenciasRepository.listarTodos();
      setUrgencias(data);
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao buscar urgências:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, []);

  const salvarUrgencia = async (urgenciaData) => {
    setLoading(true);
    try {
      const data = await UrgenciasRepository.criar(urgenciaData);
      await listarUrgencias();
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao salvar urgência:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const excluirUrgencia = async (id) => {
    setLoading(true);
    try {
      await UrgenciasRepository.deletar(id);
      await listarUrgencias();
      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir urgência:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  return { urgencias, loading, listarUrgencias, salvarUrgencia, excluirUrgencia };
};
