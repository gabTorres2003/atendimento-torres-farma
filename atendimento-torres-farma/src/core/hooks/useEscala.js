import { useState, useCallback } from 'react';
import { EscalaRepository } from '../../infrastructure/supabase/repositories/EscalaRepository';

export function useEscala() {
  const [escalas, setEscalas] = useState([]);
  const [escalasHistorico, setEscalasHistorico] = useState([]);
  const [membrosAtuais, setMembrosAtuais] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const carregarEscalas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await EscalaRepository.listarTodas();
      setEscalas(data);
      return data;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarHistorico = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await EscalaRepository.listarHistorico();
      setEscalasHistorico(data);
      return data;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const buscarEscalaCompleta = useCallback(async (feriadoId) => {
    if (!feriadoId) return null;
    setLoading(true);
    setError(null);
    try {
      const escala = await EscalaRepository.buscarEscalaCompleta(feriadoId);
      setMembrosAtuais(escala?.membros || []);
      return escala;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const criarOuAtualizarEscala = useCallback(async (feriadoId, membros, horarioInicio, horarioFim, criadaPor, credentials) => {
    setLoading(true);
    setError(null);
    try {
      const escala = await EscalaRepository.salvarEscala({
        feriado_id: feriadoId,
        membros,
        horario_inicio: horarioInicio,
        horario_fim: horarioFim,
        criada_por: criadaPor
      }, credentials);
      setMembrosAtuais(membros);
      await carregarEscalas();
      return { success: true, escala };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [carregarEscalas]);

  const confirmarEscala = useCallback(async (feriadoId, confirmadaPor, credentials) => {
    setLoading(true);
    setError(null);
    try {
      const escala = await EscalaRepository.buscarPorFeriadoId(feriadoId);
      if (!escala) throw new Error('Salve a escala antes de confirmar.');
      await EscalaRepository.confirmar(escala.id, confirmadaPor, credentials);
      await carregarEscalas();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [carregarEscalas]);

  const deletarEscala = useCallback(async (feriadoId, credentials) => {
    setLoading(true);
    setError(null);
    try {
      const escala = await EscalaRepository.buscarPorFeriadoId(feriadoId);
      if (!escala) throw new Error('Escala não encontrada.');
      await EscalaRepository.deletar(escala.id, credentials);
      setMembrosAtuais([]);
      await carregarEscalas();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [carregarEscalas]);

  const gerarSugestao = useCallback(async (equipe) => {
    setLoading(true);
    setError(null);
    try {
      const escalasConfirmadas = await EscalaRepository.listarConfirmadas();
      const membrosPorEscala = await Promise.all(
        escalasConfirmadas.map((escala) => EscalaRepository.listarMembros(escala.id))
      );
      const historico = membrosPorEscala.flat();
      const membrosUltimaEscala = membrosPorEscala[0] || [];
      return calcularSugestao(equipe, historico, membrosUltimaEscala);
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    escalas, escalasHistorico, membrosAtuais, loading, error,
    carregarEscalas, carregarHistorico, buscarEscalaCompleta,
    criarOuAtualizarEscala, confirmarEscala, deletarEscala, gerarSugestao
  };
}

function calcularSugestao(
  equipe,
  membrosHistorico = [],
  membrosUltimaConfirmada = []
) {
  const idsQueTrabalharamNoUltimo = new Set(
    membrosUltimaConfirmada
      .filter((membro) => membro.situacao === 'TRABALHA')
      .map((membro) => membro.balconista_id || membro.motoboy_id)
  );
  const quantidadeTrabalhos = new Map();
  membrosHistorico
    .filter((membro) => membro.situacao === 'TRABALHA')
    .forEach((membro) => {
      const id = membro.balconista_id || membro.motoboy_id;
      if (id) {
        quantidadeTrabalhos.set(id, (quantidadeTrabalhos.get(id) || 0) + 1);
      }
    });

  const ordenada = [...(equipe || [])].sort((a, b) => {
    const aQuantidade = quantidadeTrabalhos.get(a.id) || 0;
    const bQuantidade = quantidadeTrabalhos.get(b.id) || 0;
    const aTrabalhouNoUltimo = idsQueTrabalharamNoUltimo.has(a.id) ? 1 : 0;
    const bTrabalhouNoUltimo = idsQueTrabalharamNoUltimo.has(b.id) ? 1 : 0;
    return aQuantidade - bQuantidade
      || aTrabalhouNoUltimo - bTrabalhouNoUltimo
      || a.nome.localeCompare(b.nome);
  });

  const toMember = (pessoa, situacao) => ({
    id: pessoa.id,
    nome: pessoa.nome,
    tipo_funcionario: pessoa.tipo_funcionario || 'BALCONISTA',
    situacao
  });

  const porTipo = (tipo) => ordenada.filter((pessoa) => pessoa.tipo_funcionario === tipo);
  const trabalhando = [
    ...porTipo('MOTOBOY').slice(0, 2),
    ...porTipo('CAIXA').slice(0, 1),
    ...porTipo('BALCONISTA').slice(0, 2)
  ];
  const idsTrabalhando = new Set(trabalhando.map((pessoa) => pessoa.id));

  return {
    trabalhando: trabalhando.map((pessoa) => toMember(pessoa, 'TRABALHA')),
    folgando: ordenada
      .filter((pessoa) => !idsTrabalhando.has(pessoa.id))
      .map((pessoa) => toMember(pessoa, 'FOLGA')),
    horarioInicio: '07:00',
    horarioFim: '18:00'
  };
}
