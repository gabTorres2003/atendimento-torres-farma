import { useState, useCallback } from 'react';
import { supabase } from '../../infrastructure/supabase/supabaseClient';

export const useDiversos = () => {
  const [loading, setLoading] = useState(false);
  const [medicamentos, setMedicamentos] = useState([]);

  // Busca os medicamentos
  const buscarMedicamentos = useCallback(async (termo = '') => {
    setLoading(true);
    try {
      let query = supabase.from('medicamentos_diversos').select('*');

      if (termo) {
        query = query.or(`produto.ilike.%${termo}%,codigo_diversos.ilike.%${termo}%`);
      }

      const { data, error } = await query.order('produto', { ascending: true });

      if (error) throw error;
      setMedicamentos(data || []);
      return data;
    } catch (error) {
      console.error('Erro ao buscar medicamentos:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Cria ou Atualiza um medicamento (Com validação e geração de código)
  const salvarMedicamento = async (medicamentoData) => {
    setLoading(true);
    try {
      // 1. Validação: Verifica se já existe medicamento com este exato nome
      let checkQuery = supabase
        .from('medicamentos_diversos')
        .select('id')
        .ilike('produto', medicamentoData.produto); // ilike ignora maiúsculas/minúsculas

      // Se for edição, ignora o próprio ID na busca
      if (medicamentoData.id) {
        checkQuery = checkQuery.neq('id', medicamentoData.id);
      }

      const { data: existentes, error: checkError } = await checkQuery;
      
      if (checkError) throw checkError;
      if (existentes && existentes.length > 0) {
        return { success: false, error: 'Já existe um medicamento cadastrado com este exato nome.' };
      }

      let payload = { ...medicamentoData };

      // 2. Geração de Código: Apenas para NOVOS registros que não possuem código
      if (!payload.id && !payload.codigo_diversos) {
        const { data: codigosData } = await supabase.from('medicamentos_diversos').select('codigo_diversos');
        
        let maxCodigo = 0;
        if (codigosData) {
          // Converte todos os códigos para números, ignorando os que não são numéricos
          const numeros = codigosData
            .map(c => parseInt(c.codigo_diversos, 10))
            .filter(n => !isNaN(n));
            
          if (numeros.length > 0) {
            maxCodigo = Math.max(...numeros); // Encontra o maior número
          }
        }
        // Gera o próximo número disponível
        payload.codigo_diversos = (maxCodigo + 1).toString();
      }

      // 3. Salva no banco de dados
      let response;
      if (payload.id) {
        response = await supabase.from('medicamentos_diversos').update(payload).eq('id', payload.id);
      } else {
        response = await supabase.from('medicamentos_diversos').insert([payload]);
      }

      if (response.error) throw response.error;
      
      return { success: true, codigoGerado: payload.codigo_diversos };
    } catch (error) {
      console.error('Erro ao salvar medicamento:', error);
      return { success: false, error: 'Erro ao salvar dados no servidor.' };
    } finally {
      setLoading(false);
    }
  };

  // Deleta um medicamento
  const deletarMedicamento = async (id) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('medicamentos_diversos').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar medicamento:', error);
      return { success: false, error: 'Erro ao deletar o medicamento.' };
    } finally {
      setLoading(false);
    }
  };

  return { 
    medicamentos, 
    buscarMedicamentos, 
    salvarMedicamento, 
    deletarMedicamento, 
    loading 
  };
};