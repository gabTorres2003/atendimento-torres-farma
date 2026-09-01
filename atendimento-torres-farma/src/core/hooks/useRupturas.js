import { useCallback, useState } from 'react';
import { RupturasRepository } from '../../infrastructure/supabase/repositories/RupturasRepository';

export const useRupturas = () => {
  const [loading, setLoading] = useState(false);
  const [rupturas, setRupturas] = useState([]);

  const listarRupturas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await RupturasRepository.listarTodos();
      setRupturas(data);
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao buscar rupturas:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, []);

  const salvarRuptura = async (rupturaData) => {
    setLoading(true);
    try {
      const data = await RupturasRepository.criar(rupturaData);
      await listarRupturas();
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao salvar ruptura:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  return { rupturas, loading, listarRupturas, salvarRuptura };
};
