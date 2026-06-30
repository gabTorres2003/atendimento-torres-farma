import { useState } from 'react';
import { supabase } from '../../infrastructure/supabase/supabaseClient';

export const useDiversos = () => {
  const [loading, setLoading] = useState(false);
  const [medicamentos, setMedicamentos] = useState([]);

  // Função para buscar no Supabase
  const buscarMedicamentos = async (termo = '') => {
    setLoading(true);
    try {
      let query = supabase.from('medicamentos_diversos').select('*');

      // Se o usuário digitou algo, filtra por nome OU pelo código da gaveta
      if (termo) {
        query = query.or(`produto.ilike.%${termo}%,codigo_diversos.ilike.%${termo}%`);
      }

      // Requisito Trello: Busca por ordem alfabética
      const { data, error } = await query.order('produto', { ascending: true });

      if (error) throw error;
      setMedicamentos(data);
      return data;
    } catch (error) {
      console.error('Erro ao buscar medicamentos:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { medicamentos, buscarMedicamentos, loading };
};