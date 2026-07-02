import { useState, useCallback } from 'react';
import { AuditoriaRepository } from '../../infrastructure/supabase/repositories/AuditoriaRepository';

export const useAuditoria = () => {
  const [loading, setLoading] = useState(false);
  const [registros, setRegistros] = useState([]);

  const listarRegistros = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AuditoriaRepository.listarTodos();
      setRegistros(data);
    } catch (error) {
      console.error('Erro ao buscar auditoria:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return { registros, loading, listarRegistros };
};