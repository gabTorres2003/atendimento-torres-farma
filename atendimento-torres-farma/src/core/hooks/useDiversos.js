import { useState, useCallback } from 'react';
import { DiversosRepository } from '../../infrastructure/supabase/repositories/DiversosRepository';

export const useDiversos = () => {
  const [loading, setLoading] = useState(false);
  const [medicamentos, setMedicamentos] = useState([]);

  const buscarMedicamentos = useCallback(async (termo = '') => {
    setLoading(true);
    try {
      const data = await DiversosRepository.buscarTodos(termo);
      setMedicamentos(data);
      return data;
    } catch (error) {
      console.error('Erro ao buscar medicamentos:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const salvarMedicamento = async (medicamentoData) => {
    setLoading(true);
    try {
      const existeDuplicidade = await DiversosRepository.verificarDuplicidade(medicamentoData.produto, medicamentoData.id);
      
      if (existeDuplicidade) {
        return { success: false, error: 'Já existe um medicamento cadastrado com este exato nome.' };
      }

      let payload = { ...medicamentoData };

      // Gera código apenas para novos
      if (!payload.id && !payload.codigo_diversos) {
        const maiorCodigo = await DiversosRepository.obterMaiorCodigo();
        payload.codigo_diversos = (maiorCodigo + 1).toString();
      }

      if (payload.id) {
        await DiversosRepository.atualizar(payload.id, payload);
      } else {
        await DiversosRepository.criar(payload);
      }

      return { success: true, codigoGerado: payload.codigo_diversos };
    } catch (error) {
      console.error('Erro ao salvar medicamento:', error);
      return { success: false, error: 'Erro ao salvar dados no servidor.' };
    } finally {
      setLoading(false);
    }
  };

  const deletarMedicamento = async (id) => {
    setLoading(true);
    try {
      await DiversosRepository.deletar(id);
      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar medicamento:', error);
      return { success: false, error: 'Erro ao deletar o medicamento.' };
    } finally {
      setLoading(false);
    }
  };

  return { medicamentos, buscarMedicamentos, salvarMedicamento, deletarMedicamento, loading };
};