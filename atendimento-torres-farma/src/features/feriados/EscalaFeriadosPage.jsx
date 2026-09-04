import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight, Users, AlertTriangle,
  Clock3, Plus, Minus, Save, Trash2, History, RefreshCw,
  X, Check, ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../../core/hooks/useAuth';
import { Card } from '../../shared/components/cards/Card';
import { Button } from '../../shared/components/buttons/Button';
import { useFeriados } from '../../core/hooks/useFeriados';
import { useEscala } from '../../core/hooks/useEscala';
import { FeriadosRepository } from '../../infrastructure/supabase/repositories/FeriadosRepository';
import { CaixaMotoboysRepository } from '../../infrastructure/supabase/repositories/CaixaMotoboysRepository';

const normalizeName = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toUpperCase();

const normalizeMember = (member, equipe) => {
  const pessoaId = member.balconista_id || member.motoboy_id;
  const pessoa = equipe.find((item) => item.id === pessoaId);
  return {
    id: pessoaId,
    nome: pessoa?.nome || 'Funcionário não identificado',
    tipo_funcionario: member.tipo_funcionario,
    situacao: member.situacao
  };
};

function formatISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

const EMPTY_FORM = {
  data: '',
  nome: '',
  abrangencia: 'MUNICIPAL',
  natureza: 'FERIADO',
  observacao: '',
  ativo: true
};

const EMPTY_DRAFT = {
  trabalhando: [],
  folgando: [],
  horarioInicio: '07:00',
  horarioFim: '18:00'
};

export default function EscalaFeriadosPage() {
  const { user, adminCredentials } = useAuth();
  const isAdmin = user?.role === 'admin';

  const {
    feriados, loading: loadingFeriados, carregarFeriados,
    criarFeriado, atualizarFeriado, deletarFeriado
  } = useFeriados();

  const {
    escalas,
    carregarEscalas, carregarHistorico, buscarEscalaCompleta, criarOuAtualizarEscala,
    confirmarEscala, deletarEscala, gerarSugestao
  } = useEscala();

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState('');

  const [equipeCompleta, setEquipeCompleta] = useState([]);

  const [draft, setDraft] = useState({ ...EMPTY_DRAFT });
  const [statusEscala, setStatusEscala] = useState('PENDENTE');

  const [showFeriadoModal, setShowFeriadoModal] = useState(false);
  const [feriadoForm, setFeriadoForm] = useState({ ...EMPTY_FORM });
  const [editingFeriadoId, setEditingFeriadoId] = useState(null);
  const [feriadoFormError, setFeriadoFormError] = useState('');

  const [showHistorico, setShowHistorico] = useState(false);
  const [historico, setHistorico] = useState([]);

  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapOrigem, setSwapOrigem] = useState(null);
  const [swapDestino, setSwapDestino] = useState(null);

  const [isLoading, setIsLoading] = useState(false);

  const carregarEquipe = useCallback(async () => {
    try {
      const usuarios = await FeriadosRepository.listarUsuarios();
      let motoboys = [];
      try {
        motoboys = await CaixaMotoboysRepository.listarAtivos();
      } catch (motoboyError) {
        console.error('Erro ao carregar motoboys do Caixa:', motoboyError);
      }
      const balconistasAtivos = (usuarios || [])
        .filter((u) => String(u.role || '').trim().toLowerCase() === 'balconista' && u.ativo === true)
        .map((u) => ({ id: u.id, nome: u.nome, role: 'balconista', tipo_funcionario: 'BALCONISTA' }));
      const caixasAtivos = (usuarios || [])
        .filter((u) => String(u.role || '').trim().toLowerCase() === 'caixa' && u.ativo === true)
        .map((u) => ({ id: u.id, nome: u.nome, role: 'caixa', tipo_funcionario: 'CAIXA' }));

      setEquipeCompleta([...balconistasAtivos, ...caixasAtivos, ...(motoboys || [])]);
    } catch (err) {
      console.error('Erro ao carregar equipe:', err);
    }
  }, []);

  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        carregarFeriados(),
        carregarEscalas(),
        carregarEquipe()
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [carregarFeriados, carregarEscalas, carregarEquipe]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const feriadosMap = useMemo(() => {
    const map = new Map();
    feriados.forEach((f) => map.set(f.data, f));
    return map;
  }, [feriados]);

  const escalasMap = useMemo(() => {
    const map = new Map();
    escalas.forEach((e) => {
      if (e.feriados) {
        map.set(e.feriados.data, e);
      }
    });
    return map;
  }, [escalas]);

  const rows = useMemo(() => {
    const monthDate = new Date(selectedYear, selectedMonth, 1);
    const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const firstWeekDay = firstDay.getDay();
    const totalCells = Math.ceil((firstWeekDay + lastDay.getDate()) / 7) * 7;
    const cells = [];
    for (let index = 0; index < totalCells; index += 1) {
      cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), index - firstWeekDay + 1));
    }
    return cells;
  }, [selectedMonth, selectedYear]);

  const selectedFeriado = useMemo(() => {
    if (!selectedDate) return null;
    return feriadosMap.get(selectedDate) || null;
  }, [selectedDate, feriadosMap]);

  useEffect(() => {
    if (!selectedDate) return;
    const carregarEscala = async () => {
      const escala = await buscarEscalaCompleta(selectedFeriado?.id);
      if (escala) {
        setStatusEscala(escala.status);
        setDraft({
          trabalhando: escala.membros?.filter((m) => m.situacao === 'TRABALHA').map((m) => normalizeMember(m, equipeCompleta)) || [],
          folgando: escala.membros?.filter((m) => m.situacao === 'FOLGA').map((m) => normalizeMember(m, equipeCompleta)) || [],
          horarioInicio: escala.horario_inicio || '07:00',
          horarioFim: escala.horario_fim || '18:00'
        });
      } else {
        setStatusEscala('PENDENTE');
        setDraft({ ...EMPTY_DRAFT });
      }
    };
    if (selectedFeriado) {
      carregarEscala();
    }
  }, [selectedDate, selectedFeriado, buscarEscalaCompleta, equipeCompleta]);

  const resolucaoData = useCallback((dateKey) => {
    const feriado = feriadosMap.get(dateKey);
    if (!feriado) return 'normal';
    const escala = escalasMap.get(dateKey);
    if (!escala) return 'feriado';
    return escala.status === 'CONFIRMADA' ? 'pronta' : 'pendente';
  }, [feriadosMap, escalasMap]);

  const handleDiaClick = useCallback((dateKey) => {
    const feriado = feriadosMap.get(dateKey);
    if (feriado) {
      setSelectedDate(dateKey);
    } else {
      setFeriadoForm({ ...EMPTY_FORM, data: dateKey });
      setEditingFeriadoId(null);
      setFeriadoFormError('');
      setShowFeriadoModal(true);
    }
  }, [feriadosMap]);

  const handleEditarFeriado = useCallback((feriado) => {
    setFeriadoForm({
      data: feriado.data,
      nome: feriado.nome,
      abrangencia: feriado.abrangencia,
      natureza: feriado.natureza,
      observacao: feriado.observacao || '',
      ativo: feriado.ativo
    });
    setEditingFeriadoId(feriado.id);
    setFeriadoFormError('');
    setShowFeriadoModal(true);
  }, []);

  const handleSalvarFeriado = async () => {
    if (!feriadoForm.data || !feriadoForm.nome) {
      setFeriadoFormError('Data e nome são obrigatórios.');
      return;
    }

    let result;
    if (editingFeriadoId) {
      result = await atualizarFeriado(editingFeriadoId, feriadoForm, adminCredentials);
    } else {
      result = await criarFeriado({ ...feriadoForm, created_by: user?.id || null }, adminCredentials);
    }

    if (result.success) {
      setShowFeriadoModal(false);
      setFeriadoForm({ ...EMPTY_FORM });
      setEditingFeriadoId(null);
    } else {
      setFeriadoFormError(result.error);
    }
  };

  const handleExcluirFeriado = async () => {
    if (!editingFeriadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este feriado? A escala associada também será removida.')) return;

    const result = await deletarFeriado(editingFeriadoId, adminCredentials);
    if (result.success) {
      setShowFeriadoModal(false);
      setFeriadoForm({ ...EMPTY_FORM });
      setEditingFeriadoId(null);
      if (selectedDate === feriadoForm.data) {
        setSelectedDate('');
      }
    }
  };

  const handleGerarSugestao = async () => {
    if (equipeCompleta.length === 0) {
      alert('Nenhum participante ativo foi encontrado para montar a sugestão.');
      return;
    }
    const sugestao = await gerarSugestao(equipeCompleta);
    if (sugestao) {
      setDraft({
        trabalhando: sugestao.trabalhando || [],
        folgando: sugestao.folgando || [],
        horarioInicio: sugestao.horarioInicio || '07:00',
        horarioFim: sugestao.horarioFim || '18:00'
      });
    }
  };

  const handleSalvarRascunho = async () => {
    if (!selectedFeriado) return;

    const duplicados = [];
    draft.trabalhando.forEach((m) => {
      if (draft.folgando.some((f) => f.id === m.id)) {
        duplicados.push(m.nome);
      }
    });
    if (duplicados.length > 0) {
      alert(`Pessoa duplicada na escala: ${duplicados.join(', ')}`);
      return;
    }

    const todosMembros = [...draft.trabalhando, ...draft.folgando].map((membro) => ({
    tipo_funcionario: membro.tipo_funcionario,
    balconista_id: membro.tipo_funcionario === 'MOTOBOY' ? null : membro.id,
    motoboy_id: membro.tipo_funcionario === 'MOTOBOY' ? membro.id : null,
    situacao: membro.situacao,
    horario_inicio: draft.horarioInicio,
    horario_fim: draft.horarioFim
    }));
    const result = await criarOuAtualizarEscala(
    selectedFeriado.id,
    todosMembros,
    draft.horarioInicio,
    draft.horarioFim,
    user?.id,
    adminCredentials
    );

    if (result.success) {
      setStatusEscala('PENDENTE');
    }
  };

  const validarComposicao = () => {
    const trabalhando = draft.trabalhando;
    const quantidade = (tipo) => trabalhando.filter((membro) => membro.tipo_funcionario === tipo).length;
    const erros = [];
    if (quantidade('MOTOBOY') !== 2) erros.push('2 motoboys');
    if (quantidade('CAIXA') !== 1) erros.push('1 caixa');
    if (quantidade('BALCONISTA') !== 2) erros.push('2 balconistas');
    if (erros.length > 0) {
      alert(`A escala precisa ter exatamente: ${erros.join(', ')} trabalhando.`);
      return false;
    }
    return true;
  };

  const handleConfirmarEscala = async () => {
    if (!isAdmin) {
      alert('Apenas administradores podem confirmar escalas.');
      return;
    }

    if (!selectedFeriado) return;

    if (!validarComposicao()) return;

    const result = await confirmarEscala(selectedFeriado.id, user?.id, adminCredentials);
    if (result.success) {
      setStatusEscala('CONFIRMADA');
    }
  };

  const handleExcluirEscala = async () => {
    if (!isAdmin) return;
    if (!selectedFeriado) return;
    if (!window.confirm('Tem certeza que deseja excluir esta escala?')) return;

    const result = await deletarEscala(selectedFeriado.id, adminCredentials);
    if (result.success) {
      setDraft({ ...EMPTY_DRAFT });
      setStatusEscala('PENDENTE');
    }
  };

  const toggleMembro = (pessoa, funcao) => {
    setDraft((prev) => {
      const listaAtual = funcao === 'TRABALHA' ? 'trabalhando' : 'folgando';
      const oposto = listaAtual === 'trabalhando' ? 'folgando' : 'trabalhando';
      const jaNoOposto = prev[oposto].some(
        (m) => m.id === pessoa.id
      );
      if (jaNoOposto) {
        alert(`${pessoa.nome} já está na lista de ${oposto === 'trabalhando' ? 'trabalho' : 'folga'}.`);
        return prev;
      }

      const jaNestaLista = prev[listaAtual].some(
        (m) => m.id === pessoa.id
      );

      if (jaNestaLista) {
        return {
          ...prev,
          [listaAtual]: prev[listaAtual].filter(
            (m) => m.id !== pessoa.id
          )
        };
      }

      return {
        ...prev,
        [listaAtual]: [...prev[listaAtual], {
          id: pessoa.id,
          nome: pessoa.nome,
          tipo_funcionario: pessoa.tipo_funcionario || 'BALCONISTA',
          situacao: funcao
        }]
      };
    });
  };

  const handleSwap = (pessoa) => {
    setSwapOrigem(pessoa);
    setSwapDestino(null);
    setShowSwapModal(true);
  };

  const confirmarSwap = () => {
    if (!swapOrigem || !swapDestino) return;

    const origemFuncao = draft.trabalhando.some(
      (m) => m.id === swapOrigem.id
    ) ? 'trabalhando' : 'folgando';
    const destinoFuncao = origemFuncao === 'trabalhando' ? 'folgando' : 'trabalhando';

    const destinoJaNoOposto = (origemFuncao === 'trabalhando' ? draft.folgando : draft.trabalhando).some(
      (m) => m.id === swapDestino.id
    );
    if (destinoJaNoOposto) {
      alert(`${swapDestino.nome} já está na lista de ${destinoFuncao === 'trabalhando' ? 'trabalho' : 'folga'}.`);
      return;
    }

    const novaListaOrigem = (origemFuncao === 'trabalhando' ? draft.trabalhando : draft.folgando).filter(
      (m) => m.id !== swapOrigem.id
    );
    const novaListaDestino = [...(destinoFuncao === 'trabalhando' ? draft.trabalhando : draft.folgando), {
      id: swapDestino.id,
      nome: swapDestino.nome,
      tipo_funcionario: swapDestino.tipo_funcionario || 'BALCONISTA',
      situacao: destinoFuncao === 'trabalhando' ? 'TRABALHA' : 'FOLGA'
    }];

    if (origemFuncao === 'trabalhando') {
      setDraft((prev) => ({ ...prev, trabalhando: novaListaOrigem, folgando: novaListaDestino }));
    } else {
      setDraft((prev) => ({ ...prev, folgando: novaListaOrigem, trabalhando: novaListaDestino }));
    }

    setShowSwapModal(false);
    setSwapOrigem(null);
    setSwapDestino(null);
  };

  const abrirHistorico = async () => {
    const data = await carregarHistorico();
    setHistorico(data.filter((e) => e.status === 'CONFIRMADA'));
    setShowHistorico(true);
  };

  const listaDisponivel = useMemo(() => {
    const nomesNoDraft = new Set([
      ...draft.trabalhando.map((m) => m.id),
      ...draft.folgando.map((m) => m.id)
    ]);
    return equipeCompleta.filter((p) => !nomesNoDraft.has(p.id));
  }, [equipeCompleta, draft]);

  const adicionarPessoa = (pessoa, situacao) => {
    toggleMembro(pessoa, situacao);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ color: 'var(--color-primary)', fontSize: '1.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CalendarDays size={28} />
          Escala de Feriados
        </h2>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Button onClick={abrirHistorico} icon={History} variant="secondary">Histórico</Button>
          </div>
        )}
      </div>

      {/* CALENDÁRIO */}
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button type="button" onClick={() => setSelectedMonth((prev) => (prev === 0 ? 11 : prev - 1))} style={{ background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={18} />
            </button>
            <strong style={{ fontSize: '1.1rem' }}>
              {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(selectedYear, selectedMonth, 1))}
            </strong>
            <button type="button" onClick={() => setSelectedMonth((prev) => (prev === 11 ? 0 : prev + 1))} style={{ background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={18} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ef4444', display: 'inline-block' }} /> Feriado</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#facc15', display: 'inline-block' }} /> Pendente</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#22c55e', display: 'inline-block' }} /> Confirmada</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '6px' }}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
            <div key={dia} style={{ textAlign: 'center', fontWeight: '700', color: 'var(--color-text-muted)', padding: '6px 0', fontSize: '0.85rem' }}>{dia}</div>
          ))}

          {rows.map((date) => {
            const dateKey = formatISODate(date);
            const status = resolucaoData(dateKey);
            const isCurrentMonth = date.getMonth() === selectedMonth;
            const isSelected = selectedDate === dateKey;
            const isToday = dateKey === formatISODate(new Date());

            let bgColor = '#f8fafc';
            let txtColor = '#475569';
            let borderColor = 'var(--color-border)';

            if (status === 'feriado') { bgColor = '#ef4444'; txtColor = '#fff'; }
            else if (status === 'pendente') { bgColor = '#facc15'; txtColor = '#fff'; }
            else if (status === 'pronta') { bgColor = '#22c55e'; txtColor = '#fff'; }

            if (isSelected) borderColor = 'var(--color-primary)';
            if (isToday && status === 'normal') borderColor = '#94a3b8';

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => handleDiaClick(dateKey)}
                style={{
                  minHeight: '72px',
                  border: `2px solid ${borderColor}`,
                  borderRadius: '8px',
                  background: bgColor,
                  color: txtColor,
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: isCurrentMonth ? 1 : 0.4,
                  cursor: 'pointer',
                  transition: 'transform 0.1s'
                }}
              >
                <span style={{ fontWeight: '700', textAlign: 'left', fontSize: '0.85rem' }}>{date.getDate()}</span>
                {status !== 'normal' && (
                  <span style={{ fontSize: '0.6rem', textAlign: 'left', lineHeight: '1.1' }}>
                    {feriadosMap.get(dateKey)?.name || feriadosMap.get(dateKey)?.nome || ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* SEÇÃO DE ESCALA */}
      {selectedFeriado && (
        <Card title={selectedFeriado.nome} icon={AlertTriangle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>

            {/* COLUNA ESQUERDA: Info + Horário + Ações */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <strong style={{ fontSize: '1rem' }}>{formatDisplayDate(selectedDate)}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {selectedFeriado.abrangencia} · {selectedFeriado.natureza === 'FERIADO' ? 'Feriado' : 'Ponto Facultativo'}
                  </div>
                </div>
                <span style={{
                  background: statusEscala === 'CONFIRMADA' ? '#dcfce7' : '#fef3c7',
                  color: statusEscala === 'CONFIRMADA' ? '#166534' : '#92400e',
                  borderRadius: '999px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: '700'
                }}>
                  {statusEscala}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: '600', fontSize: '0.875rem' }}>Horário</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="time"
                    value={draft.horarioInicio}
                    onChange={(e) => setDraft((prev) => ({ ...prev, horarioInicio: e.target.value }))}
                    style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.95rem' }}
                    disabled={!isAdmin}
                  />
                  <input
                    type="time"
                    value={draft.horarioFim}
                    onChange={(e) => setDraft((prev) => ({ ...prev, horarioFim: e.target.value }))}
                    style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.95rem' }}
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              {selectedFeriado.observacao && (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px' }}>
                  {selectedFeriado.observacao}
                </div>
              )}

              {isAdmin && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <Button onClick={handleGerarSugestao} icon={RefreshCw} variant="secondary" style={{ width: 'auto', padding: '8px 14px', fontSize: '0.85rem' }}>Sugestão</Button>
                  <Button onClick={handleSalvarRascunho} icon={Save} variant="secondary" style={{ width: 'auto', padding: '8px 14px', fontSize: '0.85rem' }}>Salvar</Button>
                  <Button onClick={handleConfirmarEscala} icon={Check} style={{ width: 'auto', padding: '8px 14px', fontSize: '0.85rem' }}>Confirmar</Button>
                  <Button onClick={handleExcluirEscala} icon={Trash2} variant="secondary" style={{ width: 'auto', padding: '8px 14px', fontSize: '0.85rem', color: '#ef4444', borderColor: '#ef4444' }}>Excluir</Button>
                </div>
              )}

              {isAdmin && (
                <div style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleEditarFeriado(selectedFeriado)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline', padding: 0 }}
                  >
                    Editar feriado
                  </button>
                </div>
              )}
            </div>

            {/* COLUNA DIREITA: Listas de trabalho e folga */}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* TRABALHAM */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', color: 'var(--color-primary)', fontWeight: '700', fontSize: '0.9rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={15} />
                      Trabalham ({draft.trabalhando.length})
                    </span>
                    {isAdmin && listaDisponivel.length > 0 && (
                      <button type="button" onClick={() => adicionarPessoa(listaDisponivel[0], 'TRABALHA')} title="Adicionar em Trabalham" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', border: '1px solid #93c5fd', borderRadius: '6px', background: '#eff6ff', color: 'var(--color-primary)', cursor: 'pointer', padding: '3px 7px', fontSize: '0.72rem' }}>
                        <Plus size={12} /> Adicionar
                      </button>
                    )}
                  </div>
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: '10px', padding: '10px', minHeight: '140px', background: '#f0f9ff' }}>
                    {draft.trabalhando.length === 0 ? (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Nenhuma pessoa</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {draft.trabalhando.map((m) => (
                          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '6px 8px', fontSize: '0.85rem' }}>
                            <div>
                              <span>{m.nome}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginLeft: '6px' }}>{m.tipo_funcionario}</span>
                            </div>
                            {isAdmin && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button type="button" onClick={() => handleSwap(m)} title="Trocar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#2563eb', padding: '2px' }}>
                                  <ArrowRightLeft size={13} />
                                </button>
                                <button type="button" onClick={() => toggleMembro({ id: m.id, nome: m.nome }, 'TRABALHA')} title="Remover" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}>
                                  <Minus size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* FOLGAM */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', color: '#b45309', fontWeight: '700', fontSize: '0.9rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock3 size={15} />
                      Folgam ({draft.folgando.length})
                    </span>
                    {isAdmin && listaDisponivel.length > 0 && (
                      <button type="button" onClick={() => adicionarPessoa(listaDisponivel[0], 'FOLGA')} title="Adicionar em Folgam" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', border: '1px solid #fcd34d', borderRadius: '6px', background: '#fffbeb', color: '#92400e', cursor: 'pointer', padding: '3px 7px', fontSize: '0.72rem' }}>
                        <Plus size={12} /> Adicionar
                      </button>
                    )}
                  </div>
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: '10px', padding: '10px', minHeight: '140px', background: '#fffbeb' }}>
                    {draft.folgando.length === 0 ? (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Nenhuma pessoa</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {draft.folgando.map((m) => (
                          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '6px 8px', fontSize: '0.85rem' }}>
                            <div>
                              <span>{m.nome}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginLeft: '6px' }}>{m.tipo_funcionario}</span>
                            </div>
                            {isAdmin && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button type="button" onClick={() => handleSwap(m)} title="Trocar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#2563eb', padding: '2px' }}>
                                  <ArrowRightLeft size={13} />
                                </button>
                                <button type="button" onClick={() => toggleMembro({ id: m.id, nome: m.nome }, 'FOLGA')} title="Remover" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}>
                                  <Minus size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ADICIONAR PESSOA */}
              {isAdmin && listaDisponivel.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontWeight: '700', marginBottom: '8px', fontSize: '0.9rem' }}>Adicionar à escala</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {listaDisponivel.map((pessoa) => (
                      <div key={pessoa.id || pessoa.nome} style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => adicionarPessoa(pessoa, 'TRABALHA')}
                          style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: '999px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Plus size={12} />
                          {pessoa.nome} · Trabalha
                        </button>
                        <button
                          type="button"
                          onClick={() => adicionarPessoa(pessoa, 'FOLGA')}
                          style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '999px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', color: '#92400e' }}
                        >
                          <Plus size={12} />
                          Folga
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* SEM FERIADO SELECIONADO */}
      {!selectedFeriado && !isLoading && (
        <Card>
          <p style={{ color: 'var(--color-text-muted)' }}>
            {feriados.length === 0
              ? 'Nenhum feriado cadastrado. Clique em uma data no calendário para cadastrar.'
              : 'Selecione um feriado no calendário para gerenciar a escala.'}
          </p>
        </Card>
      )}

      {/* LOADING */}
      {isLoading && (
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px' }}>Carregando dados...</p>
      )}

      {/* MODAL: Cadastrar/Editar Feriado */}
      {showFeriadoModal && (
        <div className="modal-overlay" onClick={() => setShowFeriadoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <button className="modal-close-btn" onClick={() => setShowFeriadoModal(false)}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '16px', fontWeight: 'bold', fontSize: '1.1rem' }}>
              {editingFeriadoId ? 'Editar Feriado' : 'Cadastrar Feriado'}
            </h3>

            {feriadoFormError && (
              <div className="form-alert-error">{feriadoFormError}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="input-wrapper">
                <label className="input-label">Data</label>
                <input
                  type="date"
                  className="input-field"
                  value={feriadoForm.data}
                  onChange={(e) => setFeriadoForm((prev) => ({ ...prev, data: e.target.value }))}
                />
              </div>

              <div className="input-wrapper">
                <label className="input-label">Nome do Feriado</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Ano Novo"
                  value={feriadoForm.nome}
                  onChange={(e) => setFeriadoForm((prev) => ({ ...prev, nome: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-wrapper">
                  <label className="input-label">Abrangência</label>
                  <select
                    className="input-field"
                    value={feriadoForm.abrangencia}
                    onChange={(e) => setFeriadoForm((prev) => ({ ...prev, abrangencia: e.target.value }))}
                  >
                    <option value="NACIONAL">Nacional</option>
                    <option value="ESTADUAL">Estadual</option>
                    <option value="MUNICIPAL">Municipal</option>
                  </select>
                </div>

                <div className="input-wrapper">
                  <label className="input-label">Natureza</label>
                  <select
                    className="input-field"
                    value={feriadoForm.natureza}
                    onChange={(e) => setFeriadoForm((prev) => ({ ...prev, natureza: e.target.value }))}
                  >
                    <option value="FERIADO">Feriado</option>
                    <option value="PONTO_FACULTATIVO">Ponto Facultativo</option>
                  </select>
                </div>
              </div>

              <div className="input-wrapper">
                <label className="input-label">Observação</label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Observação opcional"
                  value={feriadoForm.observacao}
                  onChange={(e) => setFeriadoForm((prev) => ({ ...prev, observacao: e.target.value }))}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                {editingFeriadoId && (
                  <Button onClick={handleExcluirFeriado} icon={Trash2} variant="secondary" style={{ width: 'auto', color: '#ef4444', borderColor: '#ef4444' }}>Excluir</Button>
                )}
                <Button onClick={() => setShowFeriadoModal(false)} icon={X} variant="secondary">Cancelar</Button>
                <Button onClick={handleSalvarFeriado} icon={Save} isLoading={loadingFeriados}>
                  {editingFeriadoId ? 'Salvar Alterações' : 'Cadastrar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Trocar Pessoa */}
      {showSwapModal && (
        <div className="modal-overlay" onClick={() => setShowSwapModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <button className="modal-close-btn" onClick={() => setShowSwapModal(false)}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '16px', fontWeight: 'bold', fontSize: '1.1rem' }}>Trocar Pessoa</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f0f9ff', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem' }}>
                <strong>Trocar:</strong> {swapOrigem?.nome}
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: '6px' }}>
                  ({swapOrigem?.tipo_funcionario})
                </span>
              </div>

              <div className="input-wrapper">
                <label className="input-label">Substituir por</label>
                <select
                  className="input-field"
                  value={swapDestino?.id || ''}
                  onChange={(e) => {
                    const found = equipeCompleta.find((p) => p.id === e.target.value);
                    setSwapDestino(found || null);
                  }}
                >
                  <option value="">Selecione...</option>
                  {equipeCompleta
                    .filter((p) => p.id !== swapOrigem?.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.nome} ({p.role})</option>
                    ))
                  }
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <Button onClick={() => setShowSwapModal(false)} icon={X} variant="secondary">Cancelar</Button>
                <Button onClick={confirmarSwap} icon={ArrowRightLeft} disabled={!swapDestino}>Confirmar Troca</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Histórico */}
      {showHistorico && (
        <div className="modal-overlay" onClick={() => setShowHistorico(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <button className="modal-close-btn" onClick={() => setShowHistorico(false)}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '16px', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={20} />
              Histórico de Escalas Confirmadas
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
              {historico.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px' }}>Nenhuma escala confirmada ainda.</p>
              ) : (
                historico.map((e) => (
                  <div key={e.id} style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{e.feriados?.nome || 'Feriado'}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: '8px' }}>{formatDisplayDate(e.feriados?.data)}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '600' }}>CONFIRMADA</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      Horário: {e.horario_inicio || '-'} - {e.horario_fim || '-'} · Confirmada por: {e.confirmada_por || '-'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
