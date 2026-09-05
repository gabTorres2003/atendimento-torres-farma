import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AlertTriangle, PackageSearch, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { useAuth } from '../../core/hooks/useAuth';
import { useRupturas } from '../../core/hooks/useRupturas';
import { useUrgencias } from '../../core/hooks/useUrgencias';
import { RupturasRepository } from '../../infrastructure/supabase/repositories/RupturasRepository';
import { UrgenciasRepository } from '../../infrastructure/supabase/repositories/UrgenciasRepository';
import { AuditoriaRepository } from '../../infrastructure/supabase/repositories/AuditoriaRepository';
import { Card } from '../../shared/components/cards/Card';
import { Button } from '../../shared/components/buttons/Button';
import { FormInput } from '../../shared/components/forms/FormInput';

const canaisDisponiveis = ['BALCÃO', 'WHATSAPP', 'TELEFONE', 'OUTROS'];
const faltaDnaOptions = ['SIM', 'NÃO'];

const formatarData = (valor) => {
  if (!valor) return '-';

  try {
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return valor;

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(data);
  } catch {
    return valor;
  }
};

export default function FaltasRupturasPage() {
  const { user } = useAuth();
  const { rupturas, loading: loadingRupturas, listarRupturas, salvarRuptura, excluirRuptura } = useRupturas();
  const { urgencias, loading: loadingUrgencias, listarUrgencias, salvarUrgencia, excluirUrgencia } = useUrgencias();
  const [rupturaSugestoes, setRupturaSugestoes] = useState([]);
  const [urgenciaSugestoes, setUrgenciaSugestoes] = useState([]);
  const [rupturaError, setRupturaError] = useState('');
  const [urgenciaError, setUrgenciaError] = useState('');
  const [registroSelecionado, setRegistroSelecionado] = useState(null);

  const rupturaForm = useForm({
    defaultValues: {
      nome_produto: '',
      ean_dna: '',
      canal_procura: 'BALCÃO',
      nome_cliente: '',
      quantidade_solicitada: '1',
      telefone_cliente: ''
    }
  });

  const urgenciaForm = useForm({
    defaultValues: {
      nome_produto: '',
      ean_dna: '',
      quantidade: '1',
      falta_dna: 'SIM'
    }
  });

  const rupturaProdutoDigitado = rupturaForm.watch('nome_produto');
  const urgenciaProdutoDigitado = urgenciaForm.watch('nome_produto');
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    listarRupturas();
    listarUrgencias();
  }, [listarRupturas, listarUrgencias]);

  useEffect(() => {
    const termo = String(rupturaProdutoDigitado || '').trim();
    if (termo.length < 2) {
      setRupturaSugestoes([]);
      return undefined;
    }

    const timeout = setTimeout(async () => {
      try {
        setRupturaSugestoes(await RupturasRepository.listarSugestoes(termo));
      } catch (error) {
        console.error('Erro ao buscar sugestões de ruptura:', error);
        setRupturaSugestoes([]);
      }
    }, 180);

    return () => clearTimeout(timeout);
  }, [rupturaProdutoDigitado]);

  useEffect(() => {
    const termo = String(urgenciaProdutoDigitado || '').trim();
    if (termo.length < 2) {
      setUrgenciaSugestoes([]);
      return undefined;
    }

    const timeout = setTimeout(async () => {
      try {
        setUrgenciaSugestoes(await UrgenciasRepository.listarSugestoes(termo));
      } catch (error) {
        console.error('Erro ao buscar sugestões de urgência:', error);
        setUrgenciaSugestoes([]);
      }
    }, 180);

    return () => clearTimeout(timeout);
  }, [urgenciaProdutoDigitado]);

  const resumoProdutos = useMemo(() => {
    const mapa = new Map();

    for (const item of rupturas) {
      const nomeProduto = RupturasRepository.normalizarNomeProduto(item.nome_produto || '');
      const registro = mapa.get(nomeProduto) || {
        nome: nomeProduto,
        vezes: 0,
        ultimoCanal: '-',
        ultimoRegistro: null,
        registros: []
      };

      registro.vezes += 1;
      registro.ultimoCanal = item.canal_procura || registro.ultimoCanal;
      registro.ultimoRegistro = item.created_at || registro.ultimoRegistro;
      registro.registros.push(item);
      mapa.set(nomeProduto, registro);
    }

    return [...mapa.values()]
      .map((item) => ({
        ...item,
        registros: [...item.registros].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      }))
      .sort((a, b) => b.vezes - a.vezes);
  }, [rupturas]);

  const handleRupturaSubmit = async (data) => {
    setRupturaError('');
    const quantidade = Number(data.quantidade_solicitada);
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      setRupturaError('A quantidade solicitada deve ser maior que zero.');
      return;
    }

    const nomeProduto = RupturasRepository.normalizarNomeProduto(data.nome_produto || '');
    if (!nomeProduto) {
      setRupturaError('O nome do produto é obrigatório.');
      return;
    }

    const payload = {
      nome_produto: nomeProduto,
      ean_dna: data.ean_dna ? String(data.ean_dna).trim().toUpperCase() : null,
      canal_procura: (data.canal_procura || 'BALCÃO').toUpperCase(),
      nome_cliente: String(data.nome_cliente || '').trim(),
      quantidade_solicitada: quantidade,
      telefone_cliente: data.telefone_cliente ? String(data.telefone_cliente).trim() : null,
      usuario_registro: user?.nome || 'Balcão'
    };

    const result = await salvarRuptura(payload);
    if (result.success) {
      rupturaForm.reset({
        nome_produto: '',
        ean_dna: '',
        canal_procura: 'BALCÃO',
        nome_cliente: '',
        quantidade_solicitada: '1',
        telefone_cliente: ''
      });
      AuditoriaRepository.registrarAcesso(user?.nome || 'Balcão', 'RUPTURA', `Registrou ruptura do produto ${nomeProduto}.`);
      return;
    }

    setRupturaError(result.error?.message || 'Não foi possível registrar a ruptura.');
  };

  const handleUrgenciaSubmit = async (data) => {
    setUrgenciaError('');

    const nomeProduto = UrgenciasRepository.normalizarNomeProduto(data.nome_produto || '');
    if (!nomeProduto) {
      setUrgenciaError('O nome do produto é obrigatório.');
      return;
    }
    const quantidade = Number(data.quantidade);
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      setUrgenciaError('A quantidade deve ser um número inteiro maior que zero.');
      return;
    }

    const result = await salvarUrgencia({
      nome_produto: nomeProduto,
      ean_dna: data.ean_dna ? String(data.ean_dna).trim().toUpperCase() : null,
      quantidade,
      falta_dna: data.falta_dna === 'SIM',
      usuario_registro: user?.nome || 'Balcão'
    });

    if (result.success) {
      urgenciaForm.reset({
        nome_produto: '',
        ean_dna: '',
        quantidade: '1',
        falta_dna: 'SIM'
      });
      AuditoriaRepository.registrarAcesso(user?.nome || 'Balcão', 'URGENCIA', `Registrou urgência do produto ${nomeProduto}.`);
      return;
    }

    setUrgenciaError(result.error?.message || 'Não foi possível registrar a urgência.');
  };

  const handleExcluirRuptura = async (id, nome) => {
    if (!isAdmin) {
      alert('Acesso negado. Apenas administradores podem excluir rupturas.');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir a ruptura de ${nome}?`)) {
      return;
    }

    const result = await excluirRuptura(id);
    if (!result.success) {
      alert(result.error?.message || 'Erro ao excluir ruptura.');
    }
  };

  const handleExcluirUrgencia = async (id, nome) => {
    if (!isAdmin) {
      alert('Acesso negado. Apenas administradores podem excluir urgências.');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir a urgência de ${nome}?`)) {
      return;
    }

    const result = await excluirUrgencia(id);
    if (!result.success) {
      alert(result.error?.message || 'Erro ao excluir urgência.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <h2 style={{ color: 'var(--color-primary)', fontSize: '1.6rem', fontWeight: 'bold' }}>
          Faltas e Rupturas
        </h2>
      </div>

      <Card>
        <div style={{ display: 'grid', gap: '12px', fontSize: '0.95rem', color: 'var(--color-text-main)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-primary)', fontWeight: 'bold' }}>
            <AlertTriangle size={18} />
            <span>Ruptura</span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
            Registro de uma solicitação do cliente, realizada no balcão ou por outros canais, de um produto que não temos disponível em estoque.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#b45309', fontWeight: 'bold' }}>
            <ShieldAlert size={18} />
            <span>Urgência</span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
            Produto de alto giro e procura que já está na falta/lista de pedidos da drogaria e que deve receber maior atenção no momento da compra, podendo ser comprado em maior quantidade.
          </p>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))', gap: '24px', width: '100%', alignItems: 'stretch' }}>
        <Card title="Registrar ruptura" icon={PackageSearch}>
          <form onSubmit={rupturaForm.handleSubmit(handleRupturaSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '100%' }}>
            {rupturaError && <div className="form-alert-error">{rupturaError}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '16px', width: '100%' }}>
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', minWidth: 0 }}>
                <label htmlFor="ruptura_nome_produto" style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-main)', lineHeight: '1.4' }}>
                  Nome do produto *
                </label>
                <input
                  id="ruptura_nome_produto"
                  type="text"
                  placeholder="Ex: DIPIRONA 500MG 10 COMPRIMIDOS"
                  {...rupturaForm.register('nome_produto', { required: 'O nome do produto é obrigatório.' })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: rupturaForm.formState.errors.nome_produto ? '1px solid var(--color-error)' : '1px solid var(--color-border)',
                    fontSize: '1rem',
                    outline: 'none',
                    minWidth: 0,
                    boxSizing: 'border-box'
                  }}
                />

                {rupturaForm.formState.errors.nome_produto && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>{rupturaForm.formState.errors.nome_produto.message}</span>
                )}

                {rupturaSugestoes.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', background: '#fff', border: '1px solid var(--color-border)', borderRadius: '8px', boxShadow: '0 8px 18px rgba(15,23,42,0.12)', zIndex: 5, overflow: 'hidden' }}>
                    {rupturaSugestoes.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          rupturaForm.setValue('nome_produto', item, { shouldValidate: true });
                          setRupturaSugestoes([]);
                        }}
                        style={{ display: 'block', width: '100%', padding: '10px 12px', textAlign: 'left', border: 'none', background: '#fff', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--color-text-main)' }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <FormInput
                label="EAN ou código do DNA"
                id="ruptura_ean_dna"
                placeholder="Opcional"
                register={rupturaForm.register('ean_dna')}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', minWidth: 0 }}>
                <label htmlFor="ruptura_canal_procura" style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-main)', lineHeight: '1.4' }}>
                  Canal de procura *
                </label>
                <select
                  id="ruptura_canal_procura"
                  {...rupturaForm.register('canal_procura', { required: 'Selecione o canal de procura.' })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: rupturaForm.formState.errors.canal_procura ? '1px solid var(--color-error)' : '1px solid var(--color-border)',
                    fontSize: '1rem',
                    outline: 'none',
                    minWidth: 0,
                    boxSizing: 'border-box'
                  }}
                >
                  {canaisDisponiveis.map((canal) => (
                    <option key={canal} value={canal}>{canal}</option>
                  ))}
                </select>
                {rupturaForm.formState.errors.canal_procura && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>{rupturaForm.formState.errors.canal_procura.message}</span>
                )}
              </div>

              <div style={{ width: '100%', minWidth: 0 }}>
                <FormInput
                  label="Nome do cliente *"
                  id="ruptura_nome_cliente"
                  placeholder="Ex: João da Silva"
                  register={rupturaForm.register('nome_cliente', { required: 'O nome do cliente é obrigatório.' })}
                  error={rupturaForm.formState.errors.nome_cliente}
                />
              </div>

              <div style={{ width: '100%', minWidth: 0 }}>
                <FormInput
                  label="Quantidade solicitada *"
                  id="ruptura_quantidade_solicitada"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  register={rupturaForm.register('quantidade_solicitada', {
                    required: 'A quantidade é obrigatória.',
                    validate: (value) => Number(value) > 0 || 'Informe uma quantidade maior que zero.'
                  })}
                  error={rupturaForm.formState.errors.quantidade_solicitada}
                />
              </div>
            </div>

            <div style={{ width: '100%', maxWidth: '430px', minWidth: 0 }}>
              <FormInput
                label="Telefone do cliente"
                id="ruptura_telefone_cliente"
                type="tel"
                placeholder="Opcional"
                register={rupturaForm.register('telefone_cliente')}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button type="submit" icon={Search} isLoading={loadingRupturas}>
                Registrar ruptura
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Registrar urgência" icon={ShieldAlert}>
          <form onSubmit={urgenciaForm.handleSubmit(handleUrgenciaSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '100%' }}>
            {urgenciaError && <div className="form-alert-error">{urgenciaError}</div>}

            <div style={{ padding: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', color: '#92400e', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Registre produtos que precisam de atenção prioritária na próxima compra.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '7px', width: '100%', minWidth: 0 }}>
                <label htmlFor="urgencia_nome_produto" style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-main)', lineHeight: '1.4' }}>
                  Produto *
                </label>
                <input
                  id="urgencia_nome_produto"
                  type="text"
                  placeholder="Ex: FRALDA HUGGIES G XG"
                  {...urgenciaForm.register('nome_produto', { required: 'O nome do produto é obrigatório.' })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: urgenciaForm.formState.errors.nome_produto ? '1px solid var(--color-error)' : '1px solid var(--color-border)',
                    fontSize: '1rem',
                    outline: 'none',
                    minWidth: 0,
                    boxSizing: 'border-box'
                  }}
                />

                {urgenciaForm.formState.errors.nome_produto && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>{urgenciaForm.formState.errors.nome_produto.message}</span>
                )}

                {urgenciaSugestoes.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', background: '#fff', border: '1px solid var(--color-border)', borderRadius: '8px', boxShadow: '0 8px 18px rgba(15,23,42,0.12)', zIndex: 5, overflow: 'hidden' }}>
                    {urgenciaSugestoes.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          urgenciaForm.setValue('nome_produto', item, { shouldValidate: true });
                          setUrgenciaSugestoes([]);
                        }}
                        style={{ display: 'block', width: '100%', padding: '10px 12px', textAlign: 'left', border: 'none', background: '#fff', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--color-text-main)' }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '16px', alignItems: 'start' }}>
                <FormInput
                  label="EAN ou código DNA"
                  id="urgencia_ean_dna"
                  placeholder="Opcional"
                  register={urgenciaForm.register('ean_dna')}
                />
                <FormInput
                  label="Quantidade *"
                  id="urgencia_quantidade"
                  type="number"
                  min="1"
                  step="1"
                  register={urgenciaForm.register('quantidade', {
                    required: 'A quantidade é obrigatória.',
                    min: { value: 1, message: 'Informe uma quantidade maior que zero.' },
                    validate: (value) => Number.isInteger(Number(value)) || 'Informe um número inteiro.'
                  })}
                  error={urgenciaForm.formState.errors.quantidade}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', width: '100%', minWidth: 0 }}>
                  <label htmlFor="urgencia_falta_dna" style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-main)', lineHeight: '1.4' }}>
                    Falta no DNA? *
                  </label>
                  <select
                    id="urgencia_falta_dna"
                    {...urgenciaForm.register('falta_dna', { required: 'Selecione uma opção.' })}
                    style={{ width: '100%', minHeight: '46px', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: '#fff', color: 'var(--color-text-main)', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                  >
                    {faltaDnaOptions.map((opcao) => (
                      <option key={opcao} value={opcao}>{opcao}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px', borderTop: '1px solid var(--color-border)' }}>
              <Button type="submit" icon={ShieldAlert} isLoading={loadingUrgencias} style={{ width: 'auto', minWidth: '190px' }}>
                Registrar urgência
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Card title="Resumo das rupturas" icon={AlertTriangle}>
        {loadingRupturas && rupturas.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Carregando registros...</p>
        ) : resumoProdutos.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Nenhuma ruptura registrada até o momento.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '760px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px' }}>Produto</th>
                  <th style={{ padding: '12px 16px' }}>Quantidade de ocorrências</th>
                  <th style={{ padding: '12px 16px' }}>Último canal</th>
                  <th style={{ padding: '12px 16px' }}>Último registro</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {resumoProdutos.map((produto) => (
                  <tr key={produto.nome} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--color-primary)' }}>{produto.nome}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '600' }}>{produto.vezes}</td>
                    <td style={{ padding: '12px 16px' }}>{produto.ultimoCanal}</td>
                    <td style={{ padding: '12px 16px' }}>{formatarData(produto.ultimoRegistro)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => {
                            rupturaForm.setValue('nome_produto', produto.nome);
                            setRupturaSugestoes([]);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          style={{ background: 'none', border: '1px solid var(--color-primary)', borderRadius: '8px', color: 'var(--color-primary)', fontWeight: '700', padding: '8px 12px', cursor: 'pointer' }}
                        >
                          Registrar ruptura
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleExcluirRuptura(produto.registros[0]?.id, produto.nome)}
                            style={{ background: 'none', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', fontWeight: '700', padding: '8px 12px', cursor: 'pointer' }}
                            title="Excluir todos os registros desta ruptura"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Lista de urgências" icon={ShieldAlert}>
        {loadingUrgencias && urgencias.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Carregando urgências...</p>
        ) : urgencias.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Nenhuma urgência registrada.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px' }}>Produto</th>
                  <th style={{ padding: '12px 16px' }}>Quantidade</th>
                  <th style={{ padding: '12px 16px' }}>Falta no DNA</th>
                  <th style={{ padding: '12px 16px' }}>Usuário</th>
                  <th style={{ padding: '12px 16px' }}>Data/hora</th>
                  {isAdmin && <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ação</th>}
                </tr>
              </thead>
              <tbody>
                {urgencias.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#b45309' }}>{item.nome_produto}</td>
                    <td style={{ padding: '12px 16px' }}>{item.quantidade}</td>
                    <td style={{ padding: '12px 16px' }}>{item.falta_dna ? 'SIM' : 'NÃO'}</td>
                    <td style={{ padding: '12px 16px' }}>{item.usuario_registro || 'Balcão'}</td>
                    <td style={{ padding: '12px 16px' }}>{formatarData(item.created_at)}</td>
                    {isAdmin && (
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleExcluirUrgencia(item.id, item.nome_produto)}
                          style={{ background: 'none', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', fontWeight: '700', padding: '8px 12px', cursor: 'pointer' }}
                        >
                          Excluir
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {registroSelecionado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 20 }}>
          <Card style={{ width: '100%', maxWidth: '720px', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setRegistroSelecionado(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              aria-label="Fechar detalhes"
            >
              ×
            </button>
            <h3 style={{ color: 'var(--color-primary)', fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '20px' }}>
              {registroSelecionado.nome}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {registroSelecionado.registros.map((item) => (
                <div key={`${item.id}-${item.created_at}`} style={{ border: '1px solid var(--color-border)', borderRadius: '10px', padding: '12px 14px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <strong>{item.nome_cliente}</strong>
                    <span style={{ color: 'var(--color-text-muted)' }}>{formatarData(item.created_at)}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '0.9rem' }}>
                    <span><strong>Canal:</strong> {item.canal_procura}</span>
                    <span><strong>Quantidade:</strong> {item.quantidade_solicitada}</span>
                    <span><strong>Registrado por:</strong> {item.usuario_registro || 'Balcão'}</span>
                    <span><strong>Telefone:</strong> {item.telefone_cliente || '-'}</span>
                    {item.ean_dna && <span><strong>EAN/DNA:</strong> {item.ean_dna}</span>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
