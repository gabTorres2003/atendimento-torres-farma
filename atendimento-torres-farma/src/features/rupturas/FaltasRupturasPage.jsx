import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AlertTriangle, PackageSearch, Search, X } from 'lucide-react';
import { useAuth } from '../../core/hooks/useAuth';
import { useRupturas } from '../../core/hooks/useRupturas';
import { RupturasRepository } from '../../infrastructure/supabase/repositories/RupturasRepository';
import { AuditoriaRepository } from '../../infrastructure/supabase/repositories/AuditoriaRepository';
import { Card } from '../../shared/components/cards/Card';
import { Button } from '../../shared/components/buttons/Button';
import { FormInput } from '../../shared/components/forms/FormInput';

const canaisDisponiveis = ['BALCÃO', 'WHATSAPP', 'TELEFONE', 'OUTROS'];

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
  const { rupturas, loading, listarRupturas, salvarRuptura } = useRupturas();
  const [sugestoes, setSugestoes] = useState([]);
  const [formError, setFormError] = useState('');
  const [registroSelecionado, setRegistroSelecionado] = useState(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      nome_produto: '',
      ean_dna: '',
      canal_procura: 'BALCÃO',
      nome_cliente: '',
      quantidade_solicitada: '1',
      telefone_cliente: ''
    }
  });

  const nomeProdutoDigitado = watch('nome_produto');

  useEffect(() => {
    listarRupturas();
  }, [listarRupturas]);

  useEffect(() => {
    const termo = String(nomeProdutoDigitado || '').trim();
    if (termo.length < 2) {
      setSugestoes([]);
      return undefined;
    }

    const timeout = setTimeout(async () => {
      try {
        const resultado = await RupturasRepository.listarSugestoes(termo);
        setSugestoes(resultado);
      } catch (error) {
        console.error('Erro ao buscar sugestões:', error);
        setSugestoes([]);
      }
    }, 180);

    return () => clearTimeout(timeout);
  }, [nomeProdutoDigitado]);

  const resumoProdutos = useMemo(() => {
    const mapa = new Map();

    for (const item of rupturas) {
      const nomeProduto = RupturasRepository.normalizarNomeProduto(item.nome_produto || '');
      const registro = mapa.get(nomeProduto) || {
        nome: nomeProduto,
        vezes: 0,
        totalSolicitado: 0,
        ultimoCanal: '-',
        ultimoUsuario: '-',
        ultimoRegistro: null,
        registros: []
      };

      registro.vezes += 1;
      registro.totalSolicitado += Number(item.quantidade_solicitada || 0);
      registro.ultimoCanal = item.canal_procura || registro.ultimoCanal;
      registro.ultimoUsuario = item.usuario_registro || registro.ultimoUsuario;
      registro.ultimoRegistro = item.created_at || registro.ultimoRegistro;
      registro.registros.push(item);
      mapa.set(nomeProduto, registro);
    }

    return [...mapa.values()]
      .map((item) => ({
        ...item,
        urgente: item.vezes >= 2 || item.totalSolicitado >= 4,
        registros: [...item.registros].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      }))
      .sort((a, b) => b.vezes - a.vezes || b.totalSolicitado - a.totalSolicitado);
  }, [rupturas]);

  const onSubmit = async (data) => {
    setFormError('');

    const quantidade = Number(data.quantidade_solicitada);
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      setFormError('A quantidade solicitada deve ser maior que zero.');
      return;
    }

    const nomeProduto = RupturasRepository.normalizarNomeProduto(data.nome_produto || '');
    if (!nomeProduto) {
      setFormError('O nome do produto é obrigatório.');
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

    const resultado = await salvarRuptura(payload);

    if (resultado.success) {
      reset({
        nome_produto: '',
        ean_dna: '',
        canal_procura: 'BALCÃO',
        nome_cliente: '',
        quantidade_solicitada: '1',
        telefone_cliente: ''
      });

      const usuarioLogado = user?.nome || 'Balcão';
      AuditoriaRepository.registrarAcesso(
        usuarioLogado,
        'RUPTURA',
        `Registrou ruptura do produto ${nomeProduto}.`
      );

      await listarRupturas();
      setSugestoes([]);
      return;
    }

    setFormError(resultado.error?.message || 'Não foi possível registrar a ruptura.');
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
            Registro de uma solicitação do cliente — em loja ou por outros canais — de um produto que não temos disponível em estoque.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#b45309', fontWeight: 'bold' }}>
            <PackageSearch size={18} />
            <span>Urgência</span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
            Produto com alto giro e procura que não temos em estoque ou está próximo de acabar e que já está na falta do DNA. Esse produto terá maior atenção na compra e será comprado em maior quantidade.
          </p>
        </div>
      </Card>

      <Card title="Registrar ruptura" icon={PackageSearch}>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {formError && (
            <div className="form-alert-error">{formError}</div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="nome_produto" style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-main)' }}>
                Nome do produto *
              </label>
              <input
                id="nome_produto"
                type="text"
                placeholder="Ex: Dipirona 500mg 10 comprimidos"
                {...register('nome_produto', { required: 'O nome do produto é obrigatório.' })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: errors.nome_produto ? '1px solid var(--color-error)' : '1px solid var(--color-border)',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />

              {errors.nome_produto && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>{errors.nome_produto.message}</span>
              )}

              {sugestoes.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', background: '#fff', border: '1px solid var(--color-border)', borderRadius: '8px', boxShadow: '0 8px 18px rgba(15,23,42,0.12)', zIndex: 5, overflow: 'hidden' }}>
                  {sugestoes.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setValue('nome_produto', item, { shouldValidate: true });
                        setSugestoes([]);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 12px',
                        textAlign: 'left',
                        border: 'none',
                        background: '#fff',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        color: 'var(--color-text-main)'
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <FormInput
              label="EAN ou código do DNA"
              id="ean_dna"
              placeholder="Opcional"
              register={register('ean_dna')}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="canal_procura" style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-main)' }}>
                Canal de procura *
              </label>
              <select
                id="canal_procura"
                {...register('canal_procura', { required: 'Selecione o canal de procura.' })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: errors.canal_procura ? '1px solid var(--color-error)' : '1px solid var(--color-border)',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              >
                {canaisDisponiveis.map((canal) => (
                  <option key={canal} value={canal}>{canal}</option>
                ))}
              </select>
              {errors.canal_procura && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>{errors.canal_procura.message}</span>
              )}
            </div>

            <FormInput
              label="Nome do cliente *"
              id="nome_cliente"
              placeholder="Ex: João da Silva"
              register={register('nome_cliente', { required: 'O nome do cliente é obrigatório.' })}
              error={errors.nome_cliente}
            />

            <FormInput
              label="Quantidade solicitada *"
              id="quantidade_solicitada"
              type="number"
              min="1"
              step="1"
              placeholder="1"
              register={register('quantidade_solicitada', {
                required: 'A quantidade é obrigatória.',
                validate: (value) => Number(value) > 0 || 'Informe uma quantidade maior que zero.'
              })}
              error={errors.quantidade_solicitada}
            />
          </div>

          <div style={{ maxWidth: '430px' }}>
            <FormInput
              label="Telefone do cliente"
              id="telefone_cliente"
              type="tel"
              placeholder="Opcional"
              register={register('telefone_cliente')}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Button type="submit" icon={Search} isLoading={loading}>
              Registrar ruptura
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Resumo das rupturas" icon={AlertTriangle}>
        {loading && rupturas.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Carregando registros...</p>
        ) : resumoProdutos.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Nenhuma ruptura registrada até o momento.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px' }}>Produto</th>
                  <th style={{ padding: '12px 16px' }}>Vezes procurado</th>
                  <th style={{ padding: '12px 16px' }}>Último canal</th>
                  <th style={{ padding: '12px 16px' }}>Último registro</th>
                  <th style={{ padding: '12px 16px' }}>Urgência</th>
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
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '6px 10px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          background: produto.urgente ? '#fef3c7' : '#e2e8f0',
                          color: produto.urgente ? '#b45309' : '#334155'
                        }}
                      >
                        {produto.urgente ? 'Urgente' : 'Normal'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setRegistroSelecionado(produto)}
                        style={{
                          background: 'none',
                          border: '1px solid var(--color-primary)',
                          borderRadius: '8px',
                          color: 'var(--color-primary)',
                          fontWeight: '700',
                          padding: '8px 12px',
                          cursor: 'pointer'
                        }}
                      >
                        Detalhes
                      </button>
                    </td>
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
              <X size={22} />
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
