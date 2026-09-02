import { useState, useCallback } from 'react';
import { FeriadosRepository } from '../../infrastructure/supabase/repositories/FeriadosRepository';

export function useFeriados() {
  const [feriados, setFeriados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const carregarFeriados = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await FeriadosRepository.listarTodos();
      setFeriados(data);
      return data;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const criarFeriado = useCallback(async (payload, credentials) => {
    setLoading(true);
    setError(null);
    try {
      const existente = await FeriadosRepository.buscarPorData(payload.data);
      if (existente) {
        throw new Error('Já existe um feriado cadastrado para esta data.');
      }
      const novo = await FeriadosRepository.criar(payload, credentials);
      setFeriados((prev) => [...prev, novo].sort((a, b) => a.data.localeCompare(b.data)));
      return { success: true, data: novo };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const atualizarFeriado = useCallback(async (id, payload, credentials) => {
    setLoading(true);
    setError(null);
    try {
      const atualizado = await FeriadosRepository.atualizar(id, payload, credentials);
      setFeriados((prev) => prev.map((f) => (f.id === id ? atualizado : f)));
      return { success: true, data: atualizado };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const deletarFeriado = useCallback(async (id, credentials) => {
    setLoading(true);
    setError(null);
    try {
      await FeriadosRepository.deletar(id, credentials);
      setFeriados((prev) => prev.filter((f) => f.id !== id));
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const buscarFeriadoPorData = useCallback((data) => {
    return feriados.find((f) => f.data === data) || null;
  }, [feriados]);

  return {
    feriados,
    loading,
    error,
    carregarFeriados,
    criarFeriado,
    atualizarFeriado,
    deletarFeriado,
    buscarFeriadoPorData
  };
}
