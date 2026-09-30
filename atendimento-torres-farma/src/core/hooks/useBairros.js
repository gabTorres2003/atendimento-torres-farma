import { useCallback, useState } from 'react';
import { BairrosRepository } from '../../infrastructure/supabase/repositories/BairrosRepository';

export const useBairros = () => {
  const [bairros, setBairros] = useState([]);
  const [loading, setLoading] = useState(false);

  const listarBairros = useCallback(async (opcoes = {}) => {
    setLoading(true);
    try {
      const data = await BairrosRepository.listarTodos(opcoes);
      setBairros(data);
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao buscar bairros:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, []);

  const adicionarBairro = useCallback(async (nome) => {
    setLoading(true);
    try {
      const data = await BairrosRepository.criar(nome);
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao adicionar bairro:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, []);

  const renomearBairro = useCallback(async (id, nome) => {
    setLoading(true);
    try {
      await BairrosRepository.atualizarNome(id, nome);
      return { success: true };
    } catch (error) {
      console.error('Erro ao renomear bairro:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, []);

  const alternarAtivoBairro = useCallback(async (id, ativo) => {
    setLoading(true);
    try {
      await BairrosRepository.definirAtivo(id, ativo);
      return { success: true };
    } catch (error) {
      console.error('Erro ao alterar situacao do bairro:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, []);

  const excluirBairro = useCallback(async (id) => {
    setLoading(true);
    try {
      await BairrosRepository.deletar(id);
      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir bairro:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    bairros,
    loading,
    listarBairros,
    adicionarBairro,
    renomearBairro,
    alternarAtivoBairro,
    excluirBairro
  };
};
