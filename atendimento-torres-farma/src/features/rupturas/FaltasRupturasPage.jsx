import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  PackageSearch,
  Pencil,
  Phone,
  Search,
  Trash2,
  User
} from 'lucide-react';
import { useAuth } from '../../core/hooks/useAuth';
import { useRupturas } from '../../core/hooks/useRupturas';
import { RupturasRepository } from '../../infrastructure/supabase/repositories/RupturasRepository';
import { AuditoriaRepository } from '../../infrastructure/supabase/repositories/AuditoriaRepository';
import { Card } from '../../shared/components/cards/Card';
import { Button } from '../../shared/components/buttons/Button';
import { FormInput } from '../../shared/components/forms/FormInput';
import ConsultaProdutoDna from '../../shared/components/inputs/ConsultaProdutoDna';
import './FaltasRupturasPage.css';

const canaisDisponiveis = ['BALCÃO', 'WHATSAPP', 'TELEFONE', 'OUTROS'];

const valoresIniciais = {
  nome_produto: '',
  ean_dna: '',
  canal_procura: 'BALCÃO',
  nome_cliente: '',
  quantidade_solicitada: '1',
  telefone_cliente: ''
};

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

  // fluxo: null = só as duas opções; 'manual' ou 'dna' = etapa de preenchimento.
  const [fluxo, setFluxo] = useState(null);
  const [sugestoes, setSugestoes] = useState([]);
  const [formError, setFormError] = useState('');
  const [formSucesso, setFormSucesso] = useState('');
  // Incrementado a cada ruptura salva para reiniciar a busca do DNA.
  const [buscaGeracao, setBuscaGeracao] = useState(0);

  const rupturaForm = useForm({ defaultValues: valoresIniciais });

  const produtoDigitado = rupturaForm.watch('nome_produto');
  const eanDigitado = rupturaForm.watch('ean_dna');
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    listarRupturas();
  }, [listarRupturas]);

  // Sugestões locais: reaproveita nomes já registrados em rupturas.
  useEffect(() => {
    const termo = String(produtoDigitado || '').trim();
    if (fluxo !== 'manual' || termo.length < 2) {
      setSugestoes([]);
      return undefined;
    }

    const timeout = setTimeout(async () => {
      try {
        setSugestoes(await RupturasRepository.listarSugestoes(termo));
      } catch (error) {
        console.error('Erro ao buscar sugestões de ruptura:', error);
        setSugestoes([]);
      }
    }, 180);

    return () => clearTimeout(timeout);
  }, [produtoDigitado, fluxo]);

  // Aplica o produto do DNA somente por ação explícita do atendente.
  const aplicarProdutoDna = (produto) => {
    const descricao = String(produto?.descricao || '').trim();
    if (!descricao) return;

    rupturaForm.setValue('nome_produto', descricao, { shouldValidate: true, shouldDirty: true });

    const identificador = String(produto?.codbarras || produto?.codigo || '').trim();
    rupturaForm.setValue('ean_dna', identificador, { shouldValidate: true, shouldDirty: true });
  };

  const abrirFluxo = (novoFluxo) => {
    setFormError('');
    setFormSucesso('');
    setFluxo(novoFluxo);
  };

  const voltarParaOpcoes = () => {
    setFormError('');
    setFormSucesso('');
    setSugestoes([]);
    rupturaForm.reset(valoresIniciais);
    setFluxo(null);
  };

  const selecionarSugestao = (nome) => {
    rupturaForm.setValue('nome_produto', nome, { shouldValidate: true, shouldDirty: true });
    setSugestoes([]);
  };

  const handleSubmit = async (data) => {
    setFormError('');
    setFormSucesso('');

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

    const result = await salvarRuptura(payload);
    if (result.success) {
      rupturaForm.reset(valoresIniciais);
      setSugestoes([]);
      setFormSucesso(`Ruptura de “${nomeProduto}” registrada.`);
      setBuscaGeracao((valor) => valor + 1);
      AuditoriaRepository.registrarAcesso(
        user?.nome || 'Balcão',
        'RUPTURA',
        `Registrou ruptura do produto ${nomeProduto}.`
      );
      return;
    }

    setFormError(result.error?.message || 'Não foi possível registrar a ruptura.');
  };

  const handleExcluir = async (registro) => {
    if (!isAdmin) {
      alert('Acesso negado. Apenas administradores podem excluir rupturas.');
      return;
    }

    const cliente = String(registro?.nome_cliente || '').trim() || 'este cliente';
    if (!window.confirm(`Tem certeza que deseja excluir o registro de ${cliente}?`)) {
      return;
    }

    const result = await excluirRuptura(registro.id);
    if (!result.success) {
      alert(result.error?.message || 'Erro ao excluir ruptura.');
    }
  };

  // Agrupa por produto, preservando TODOS os clientes de cada ocorrência.
  const produtosAgrupados = useMemo(() => {
    const mapa = new Map();

    for (const item of rupturas) {
      const nomeProduto = RupturasRepository.normalizarNomeProduto(item.nome_produto || '');
      const registro = mapa.get(nomeProduto) || {
        nome: nomeProduto,
        ean: null,
        vezes: 0,
        registros: []
      };

      registro.vezes += 1;
      if (!registro.ean && item.ean_dna) registro.ean = item.ean_dna;
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

  return (
    <div className="faltas-page">
      <header className="faltas-page__header">
        <span className="faltas-page__eyebrow">Atendimento · Produtos</span>
        <h2 className="faltas-page__title">Faltas e Rupturas</h2>
        <p className="faltas-page__subtitle">
          Registre o produto que o cliente procurou e não encontrou em estoque.
        </p>
      </header>

      {!fluxo && (
        <div className="faltas-page__choices" role="group" aria-label="Como cadastrar a ruptura">
          <button
            type="button"
            className="choice-card"
            onClick={() => abrirFluxo('manual')}
          >
            <span className="choice-card__icon" aria-hidden="true">
              <Pencil size={22} />
            </span>
            <span className="choice-card__title">Escrever Manualmente</span>
            <span className="choice-card__text">
              Digite o nome do produto e informe os dados do cliente.
            </span>
          </button>

          <button
            type="button"
            className="choice-card"
            onClick={() => abrirFluxo('dna')}
          >
            <span className="choice-card__icon" aria-hidden="true">
              <Search size={22} />
            </span>
            <span className="choice-card__title">Pesquisar no DNA</span>
            <span className="choice-card__text">
              Encontre o produto pelo código, nome ou princípio ativo.
            </span>
          </button>
        </div>
      )}

      {fluxo && (
        <Card
          title={fluxo === 'manual' ? 'Escrever manualmente' : 'Pesquisar no DNA'}
          icon={fluxo === 'manual' ? Pencil : Search}
          className="faltas-page__form-card"
        >
          <button type="button" className="faltas-page__back" onClick={voltarParaOpcoes}>
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar
          </button>

          {fluxo === 'dna' && (
            <div className="faltas-page__dna">
              <ConsultaProdutoDna
                key={buscaGeracao}
                codigo={eanDigitado}
                onCodigoChange={(valor) => rupturaForm.setValue('ean_dna', valor, { shouldValidate: true, shouldDirty: true })}
                onSelecionar={aplicarProdutoDna}
              />
            </div>
          )}

          <form onSubmit={rupturaForm.handleSubmit(handleSubmit)} className="faltas-form">
            {formError && <div className="form-alert-error">{formError}</div>}
            {formSucesso && (
              <div className="faltas-form__sucesso" role="status">
                <CheckCircle2 size={17} aria-hidden="true" />
                {formSucesso}
              </div>
            )}

            <div className="product-field">
              <label htmlFor="ruptura_nome_produto" className="product-field__label">
                Produto *
              </label>
              <input
                id="ruptura_nome_produto"
                type="text"
                placeholder="Ex.: DIPIRONA 500MG 10 COMPRIMIDOS"
                {...rupturaForm.register('nome_produto', { required: 'O nome do produto é obrigatório.' })}
                className={`product-field__input${rupturaForm.formState.errors.nome_produto ? ' has-error' : ''}`}
              />
              <span className="product-field__hint">
                {fluxo === 'dna'
                  ? 'Preenchido pela seleção no DNA. Você pode ajustar se necessário.'
                  : 'Digite o nome do produto procurado pelo cliente.'}
              </span>

              {rupturaForm.formState.errors.nome_produto && (
                <span className="product-field__error">
                  {rupturaForm.formState.errors.nome_produto.message}
                </span>
              )}

              {fluxo === 'manual' && sugestoes.length > 0 && (
                <div className="product-suggestions" role="group" aria-label="Produtos já registrados em rupturas">
                  <div className="product-suggestions__label">Já registrados anteriormente</div>
                  <div className="product-suggestions__list">
                    {sugestoes.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="product-suggestions__item"
                        onClick={() => selecionarSugestao(item)}
                      >
                        <PackageSearch size={14} aria-hidden="true" />
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="faltas-form__grid">
              <div className="faltas-form__field">
                <label htmlFor="ruptura_canal_procura" className="product-field__label">
                  Canal de procura *
                </label>
                <select
                  id="ruptura_canal_procura"
                  {...rupturaForm.register('canal_procura', { required: 'Selecione o canal de procura.' })}
                  className={`product-field__input${rupturaForm.formState.errors.canal_procura ? ' has-error' : ''}`}
                >
                  {canaisDisponiveis.map((canal) => (
                    <option key={canal} value={canal}>{canal}</option>
                  ))}
                </select>
                {rupturaForm.formState.errors.canal_procura && (
                  <span className="product-field__error">
                    {rupturaForm.formState.errors.canal_procura.message}
                  </span>
                )}
              </div>

              <FormInput
                label="Nome do cliente *"
                id="ruptura_nome_cliente"
                placeholder="Ex: João da Silva"
                register={rupturaForm.register('nome_cliente', { required: 'O nome do cliente é obrigatório.' })}
                error={rupturaForm.formState.errors.nome_cliente}
              />

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

              <FormInput
                label="Telefone do cliente"
                id="ruptura_telefone_cliente"
                type="tel"
                placeholder="Opcional"
                register={rupturaForm.register('telefone_cliente')}
              />
            </div>

            <div className="faltas-form__actions">
              <Button type="submit" icon={Search} isLoading={loadingRupturas}>
                Registrar ruptura
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Rupturas registradas" icon={AlertTriangle}>
        {loadingRupturas && rupturas.length === 0 ? (
          <p className="faltas-lista__vazio">Carregando registros...</p>
        ) : produtosAgrupados.length === 0 ? (
          <p className="faltas-lista__vazio">Nenhuma ruptura registrada até o momento.</p>
        ) : (
          <div className="faltas-lista">
            {produtosAgrupados.map((produto) => (
              <section key={produto.nome} className="produto-grupo">
                <header className="produto-grupo__head">
                  <div className="produto-grupo__identidade">
                    <PackageSearch size={17} aria-hidden="true" />
                    <h4 className="produto-grupo__nome">{produto.nome}</h4>
                  </div>
                  <span className="produto-grupo__meta">
                    {produto.ean && <span className="produto-grupo__ean">EAN/DNA {produto.ean}</span>}
                    <span>
                      {produto.vezes === 1 ? '1 cliente' : `${produto.vezes} clientes`}
                    </span>
                  </span>
                </header>

                <ul className="produto-grupo__clientes">
                  {produto.registros.map((item) => (
                    <li key={item.id} className="cliente-linha">
                      <div className="cliente-linha__principal">
                        <span className="cliente-linha__nome">
                          <User size={14} aria-hidden="true" />
                          {item.nome_cliente || 'Cliente não informado'}
                        </span>
                        <span className="cliente-linha__telefone">
                          <Phone size={14} aria-hidden="true" />
                          {item.telefone_cliente || 'sem telefone'}
                        </span>
                      </div>

                      <div className="cliente-linha__detalhes">
                        <span>{formatarData(item.created_at)}</span>
                        <span>{item.canal_procura}</span>
                        <span>Qtd. {item.quantidade_solicitada}</span>
                        <span>{item.usuario_registro || 'Balcão'}</span>
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          className="cliente-linha__excluir"
                          onClick={() => handleExcluir(item)}
                          title={`Excluir o registro de ${item.nome_cliente || 'este cliente'}`}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                          Excluir
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
