import { useState } from 'react';
import { supabase } from '../../infrastructure/supabase/supabaseClient';

export const useEncomendas = () => {
  const [loading, setLoading] = useState(false);
  const [encomendas, setEncomendas] = useState([]);

  const listarEncomendas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('encomendas')
        .select('*')
        .order('data_encomenda', { ascending: false });

      if (error) throw error;
      setEncomendas(data);
    } catch (error) {
      console.error('Erro ao buscar encomendas:', error);
    } finally {
      setLoading(false);
    }
  };

  const salvarEncomenda = async (encomendaData) => {
    setLoading(true);
    try {
      let response;
      if (encomendaData.id) {
        // Atualizar existente
        response = await supabase
          .from('encomendas')
          .update(encomendaData)
          .eq('id', encomendaData.id);
      } else {
        // Criar nova
        response = await supabase
          .from('encomendas')
          .insert([encomendaData]);
      }

      if (response.error) throw response.error;
      await listarEncomendas(); // Atualiza a lista após salvar
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
      const { error } = await supabase.from('encomendas').delete().eq('id', id);
      if (error) throw error;
      await listarEncomendas();
      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar encomenda:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  return { 
    encomendas, 
    loading, 
    listarEncomendas, 
    salvarEncomenda,
    deletarEncomenda 
  };
};