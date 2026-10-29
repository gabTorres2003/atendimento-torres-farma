import {
  forwardRef,
  useCallback,
  useId,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Barcode,
  Check,
  CheckCircle2,
  Database,
  Loader2,
  PackageSearch,
  Pill,
  Plus,
  Search,
  ShieldAlert,
  X
} from 'lucide-react';
import { useAuth } from '../../../core/hooks/useAuth';
import { DnaProdutosRepository } from '../../../infrastructure/integrations/dna/DnaProdutosRepository';
import './ConsultaProdutoDna.css';

/**
 * Consulta somente leitura do produto no DNA.
 *
 * Um único campo alterna entre as quatro formas de localização usadas no
 * balcão: EAN, código interno do DNA, nome/descrição e princípio ativo.
 * A consulta continua sendo manual e nenhum produto é aplicado ao formulário
 * sem uma ação explícita do atendente.
 */

const MODOS = [
  {
    id: 'codigo',
    rotulo: 'Código / EAN',
    icone: Barcode,
    label: 'Código de barras ou código DNA',
    placeholder: 'Leia o código ou digite EAN/código DNA',
    ajuda: 'Aceita o código de barras (EAN) ou o código interno do DNA. Pressione Enter para consultar.',
    maxLength: 20
  },
  {
    id: 'nome',
    rotulo: 'Nome',
    icone: PackageSearch,
    label: 'Nome ou descrição do produto',
    placeholder: 'Ex.: dipirona 500mg',
    ajuda: 'Pesquisa a descrição no DNA. Digite ao menos 2 caracteres.',
    maxLength: 40
  },
  {
    id: 'principio',
    rotulo: 'Princípio ativo',
    icone: Pill,
    label: 'Princípio ativo',
    placeholder: 'Ex.: dipirona sódica',
    ajuda: 'Pesquisa o princípio ativo no DNA. Digite ao menos 2 caracteres.',
    maxLength: 40
  }
];

const CONTEXTOS = {
  ruptura: {
    eyebrow: 'Ruptura · DNA',
    titulo: 'Localizar produto',
    descricao: 'Busque o produto solicitado pelo cliente e selecione-o para aplicar ao registro.',
    dicaInicial: 'Busque por código, nome ou princípio ativo para localizar o produto solicitado.',
    Icone: AlertTriangle
  },
  urgencia: {
    eyebrow: 'Urgência · DNA',
    titulo: 'Localizar produto',
    descricao: 'Busque o item prioritário da próxima compra e selecione-o para aplicar ao registro.',
    dicaInicial: 'Busque por código, nome ou princípio ativo para localizar o item prioritário.',
    Icone: ShieldAlert
  }
};

const CONTEXTO_PADRAO = {
  eyebrow: 'Consulta ao DNA',
  titulo: 'Buscar produto',
  descricao: 'Encontre o produto por código, nome ou princípio ativo e selecione-o para aplicar ao registro.',
  dicaInicial: 'Busque por código, nome ou princípio ativo.',
  Icone: Search
};

const mesmoProduto = (primeiro, segundo) => (
  Boolean(primeiro && segundo)
  && primeiro.codigo !== null
  && primeiro.codigo !== undefined
  && segundo.codigo !== null
  && segundo.codigo !== undefined
  && String(primeiro.codigo) === String(segundo.codigo)
);

function ProdutoResultado({ produto, ativo, desabilitado, onSelecionar }) {
  const inativo = String(produto?.inativo || '').toUpperCase() === 'S';
  const descricao = produto?.descricao || 'Produto sem descrição';
  const metadados = [
    { rotulo: 'Princípio ativo', valor: produto?.principioAtivo },
    { rotulo: 'Apresentação', valor: produto?.apresentacao },
    { rotulo: 'Fabricante', valor: produto?.fabricante }
  ].filter((item) => item.valor);

  return (
    <article className={`dna-result${ativo ? ' dna-result--selecionado' : ''}`}>
      <div className="dna-result__top">
        <h4 className="dna-result__name">{descricao}</h4>
        {inativo && <span className="dna-chip dna-chip--inativo">Inativo no DNA</span>}
      </div>

      {metadados.length > 0 && (
        <dl className="dna-result__meta">
          {metadados.map(({ rotulo, valor }) => (
            <div key={rotulo} className="dna-result__meta-item">
              <dt>{rotulo}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="dna-result__bottom">
        <div className="dna-result__codes" aria-label="Códigos do produto">
          <span className="dna-code">
            <span>DNA</span>
            <strong>{produto?.codigo ?? '—'}</strong>
          </span>
          <span className="dna-code">
            <span>EAN</span>
            <strong>{produto?.codbarras || '—'}</strong>
          </span>
        </div>

        <button
          type="button"
          className={`dna-result__select${ativo ? ' is-selected' : ''}`}
          onClick={() => onSelecionar(produto)}
          disabled={desabilitado}
          aria-pressed={Boolean(ativo)}
          aria-label={ativo ? `${descricao} selecionado` : `Selecionar ${descricao}`}
        >
          {ativo ? <Check size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
          {ativo ? 'Selecionado' : 'Selecionar'}
        </button>
      </div>

      {inativo && (
        <p className="dna-result__warning">
          Produto inativo no DNA. Confirme antes de registrar.
        </p>
      )}
    </article>
  );
}

const ConsultaProdutoDna = forwardRef(function ConsultaProdutoDna(
  { codigo, onCodigoChange, onSelecionar, desabilitado = false, contexto },
  ref
) {
  const { user } = useAuth();
  const uid = useId().replace(/[:]/g, '');
  const tituloId = `dna-titulo-${uid}`;
  const campoId = `dna-campo-${uid}`;
  const ajudaId = `dna-ajuda-${uid}`;
  const erroId = `dna-erro-${uid}`;
  const encontradoId = `dna-encontrado-${uid}`;
  const resultadosId = `dna-resultados-${uid}`;

  const [modoBusca, setModoBusca] = useState('codigo');
  const [termoTexto, setTermoTexto] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [produtoCodigo, setProdutoCodigo] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [truncado, setTruncado] = useState(false);
  const [pesquisou, setPesquisou] = useState(false);
  const [naoEncontrado, setNaoEncontrado] = useState('');
  const [selecionado, setSelecionado] = useState(null);

  const emAndamentoRef = useRef(false);
  const requisicaoRef = useRef(0);

  const modoAtual = MODOS.find((item) => item.id === modoBusca) || MODOS[0];
  const contextoAtual = CONTEXTOS[contexto] || CONTEXTO_PADRAO;
  const IconeContexto = contextoAtual.Icone;
  const termoAtual = modoBusca === 'codigo' ? String(codigo || '') : termoTexto;

  const definirErro = (mensagem, titulo = 'Não foi possível concluir a busca') => {
    setErro({ titulo, mensagem });
  };

  const limparEstadoResultados = () => {
    setErro(null);
    setProdutoCodigo(null);
    setResultados([]);
    setTruncado(false);
    setPesquisou(false);
    setNaoEncontrado('');
    setSelecionado(null);
  };

  const consultarCodigo = useCallback(async (valorDigitado) => {
    const valor = String(valorDigitado ?? codigo ?? '').trim();

    setErro(null);
    setProdutoCodigo(null);
    setResultados([]);
    setTruncado(false);
    setPesquisou(false);
    setNaoEncontrado('');
    setSelecionado(null);

    if (!valor) {
      definirErro('Informe o EAN ou o código DNA antes de consultar.', 'Revise a busca');
      return;
    }

    if (emAndamentoRef.current) return;

    const requisicao = requisicaoRef.current + 1;
    requisicaoRef.current = requisicao;
    emAndamentoRef.current = true;
    setCarregando(true);

    try {
      const encontrado = await DnaProdutosRepository.buscarProduto({
        termo: valor,
        usuarioId: user?.id
      });

      if (requisicao !== requisicaoRef.current) return;

      if (!encontrado) {
        setNaoEncontrado(valor);
        setPesquisou(true);
        return;
      }

      setProdutoCodigo(encontrado);
      setPesquisou(true);
    } catch (error) {
      if (requisicao !== requisicaoRef.current) return;
      definirErro(
        error?.message || 'Não foi possível consultar o DNA agora.',
        'Não foi possível consultar o DNA'
      );
    } finally {
      if (requisicao === requisicaoRef.current) {
        emAndamentoRef.current = false;
        setCarregando(false);
      }
    }
  }, [codigo, user?.id]);

  useImperativeHandle(ref, () => ({ consultar: consultarCodigo }), [consultarCodigo]);

  const pesquisarTexto = async () => {
    const texto = termoTexto.trim();

    setErro(null);
    setResultados([]);
    setTruncado(false);
    setPesquisou(false);
    setNaoEncontrado('');
    setSelecionado(null);

    if (texto.length < 2) {
      definirErro('Digite pelo menos 2 caracteres para pesquisar.', 'Revise a busca');
      return;
    }

    if (emAndamentoRef.current) return;

    const requisicao = requisicaoRef.current + 1;
    requisicaoRef.current = requisicao;
    emAndamentoRef.current = true;
    setCarregando(true);

    try {
      const resposta = await DnaProdutosRepository.pesquisarProdutos({
        termo: texto,
        tipo: modoBusca === 'principio' ? 'principio' : 'descricao',
        usuarioId: user?.id
      });

      if (requisicao !== requisicaoRef.current) return;

      setResultados(resposta.resultados);
      setTruncado(resposta.truncado);
      setPesquisou(true);
    } catch (error) {
      if (requisicao !== requisicaoRef.current) return;
      definirErro(
        error?.message || 'Não foi possível pesquisar no DNA agora.',
        'Não foi possível consultar o DNA'
      );
    } finally {
      if (requisicao === requisicaoRef.current) {
        emAndamentoRef.current = false;
        setCarregando(false);
      }
    }
  };

  const executarBusca = () => {
    if (desabilitado || carregando) return;

    if (modoBusca === 'codigo') {
      consultarCodigo(codigo);
      return;
    }

    pesquisarTexto();
  };

  const definirTermo = (valor) => {
    if (emAndamentoRef.current) {
      requisicaoRef.current += 1;
      emAndamentoRef.current = false;
      setCarregando(false);
    }

    setErro(null);
    setNaoEncontrado('');

    if (modoBusca === 'codigo') {
      onCodigoChange?.(valor);
      return;
    }

    setTermoTexto(valor);
  };

  const trocarModo = (novoModo) => {
    if (novoModo === modoBusca) return;

    requisicaoRef.current += 1;
    emAndamentoRef.current = false;
    setCarregando(false);
    setModoBusca(novoModo);
    limparEstadoResultados();
  };

  const selecionar = (produto) => {
    if (!produto || desabilitado) return;
    setSelecionado(produto);
    onSelecionar?.(produto);
  };

  const limparResultadoCodigo = () => {
    setProdutoCodigo(null);
    setSelecionado(null);
    setPesquisou(false);
    setNaoEncontrado('');
    setErro(null);
  };

  const semResultadoCodigo = modoBusca === 'codigo' && Boolean(naoEncontrado);
  const semResultadoTexto = modoBusca !== 'codigo' && pesquisou && resultados.length === 0;
  const semResultados = !carregando && !erro && (semResultadoCodigo || semResultadoTexto);
  const mostrarInicial = !carregando && !erro && !pesquisou
    && !naoEncontrado && !produtoCodigo && resultados.length === 0;

  let statusAnuncio = '';
  if (carregando) {
    statusAnuncio = 'Consultando produtos no DNA.';
  } else if (erro) {
    statusAnuncio = 'A busca retornou um erro.';
  } else if (semResultados) {
    statusAnuncio = 'Nenhum produto encontrado.';
  } else if (modoBusca === 'codigo' && produtoCodigo) {
    statusAnuncio = 'Produto encontrado no DNA.';
  } else if (modoBusca !== 'codigo' && resultados.length > 0) {
    statusAnuncio = `${resultados.length} produtos encontrados.`;
  }

  return (
    <section
      className="dna-search"
      data-contexto={contexto || 'padrao'}
      aria-labelledby={tituloId}
    >
      <header className="dna-search__header">
        <div className="dna-search__identity">
          <span className="dna-search__icon" aria-hidden="true">
            <Search size={20} />
          </span>
          <div>
            <span className="dna-search__eyebrow">
              <IconeContexto size={13} aria-hidden="true" />
              {contextoAtual.eyebrow}
            </span>
            <h3 id={tituloId} className="dna-search__title">{contextoAtual.titulo}</h3>
            <p className="dna-search__subtitle">{contextoAtual.descricao}</p>
          </div>
        </div>

        <span className="dna-search__badge">
          <Database size={13} aria-hidden="true" />
          Somente leitura
        </span>
      </header>

      <div className="dna-search__modes" role="group" aria-label="Tipo de busca no DNA">
        {MODOS.map(({ id, rotulo, icone: Icone }) => (
          <button
            key={id}
            type="button"
            className="dna-search__mode"
            aria-pressed={modoBusca === id}
            onClick={() => trocarModo(id)}
            disabled={desabilitado}
          >
            <Icone size={15} aria-hidden="true" />
            {rotulo}
          </button>
        ))}
      </div>

      <div className="dna-search__field-block">
        <label htmlFor={campoId} className="dna-search__label">
          {modoAtual.label}
        </label>

        <div className={`dna-search__field${erro ? ' has-error' : ''}`}>
          <Search className="dna-search__field-icon" size={19} aria-hidden="true" />
          <input
            id={campoId}
            className="dna-search__input"
            type="text"
            value={termoAtual}
            onChange={(evento) => definirTermo(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') {
                evento.preventDefault();
                executarBusca();
              }
            }}
            placeholder={modoAtual.placeholder}
            maxLength={modoAtual.maxLength}
            disabled={desabilitado}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-describedby={`${ajudaId}${erro ? ` ${erroId}` : ''}`}
            aria-invalid={Boolean(erro)}
          />

          {termoAtual && !desabilitado && (
            <button
              type="button"
              className="dna-search__clear"
              onClick={() => definirTermo('')}
              aria-label="Limpar campo de busca"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            className="dna-search__submit"
            onClick={executarBusca}
            disabled={desabilitado || carregando || !termoAtual.trim()}
          >
            {carregando
              ? <Loader2 className="dna-search__spin" size={17} aria-hidden="true" />
              : <Search size={17} aria-hidden="true" />}
            {carregando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        <p id={ajudaId} className="dna-search__hint">{modoAtual.ajuda}</p>
      </div>

      <div className="dna-search__body" aria-busy={carregando}>
        <p className="dna-search__sr-only" role="status" aria-live="polite">
          {statusAnuncio}
        </p>

        {carregando && (
          <div className="dna-search__loading">
            <div className="dna-search__loading-head">
              <Loader2 className="dna-search__spin" size={18} aria-hidden="true" />
              <div>
                <strong>Consultando o DNA...</strong>
                <span>Aguarde enquanto localizamos os produtos.</span>
              </div>
            </div>
            <div className="dna-search__skeleton" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        {!carregando && erro && (
          <div id={erroId} className="dna-search__alert" role="alert">
            <span className="dna-search__state-icon" aria-hidden="true">
              <AlertCircle size={18} />
            </span>
            <div>
              <strong>{erro.titulo}</strong>
              <span>{erro.mensagem}</span>
            </div>
          </div>
        )}

        {!carregando && !erro && mostrarInicial && (
          <div className="dna-search__initial">
            <span className="dna-search__state-icon" aria-hidden="true">
              <Search size={17} />
            </span>
            <div>
              <strong>Pronto para buscar</strong>
              <span>{contextoAtual.dicaInicial}</span>
            </div>
          </div>
        )}

        {!carregando && !erro && selecionado && (
          <div className="dna-search__success" role="status">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>
              <strong>{selecionado.descricao || 'Produto selecionado'}</strong>
              {' '}foi aplicado ao formulário.
            </span>
          </div>
        )}

        {!carregando && !erro && modoBusca === 'codigo' && produtoCodigo && (
          <section className="dna-search__found" aria-labelledby={encontradoId}>
            <div className="dna-search__found-head">
              <span id={encontradoId} className="dna-search__found-label">
                <Database size={14} aria-hidden="true" />
                Produto encontrado no DNA
              </span>
              <button
                type="button"
                className="dna-search__link-button"
                onClick={limparResultadoCodigo}
              >
                <X size={14} aria-hidden="true" />
                Limpar resultado
              </button>
            </div>

            <ProdutoResultado
              produto={produtoCodigo}
              ativo={mesmoProduto(selecionado, produtoCodigo)}
              desabilitado={desabilitado}
              onSelecionar={selecionar}
            />
          </section>
        )}

        {!carregando && !erro && semResultados && (
          <div className="dna-search__state">
            <span className="dna-search__state-icon" aria-hidden="true">
              <PackageSearch size={18} />
            </span>
            <div>
              <strong>
                {modoBusca === 'codigo'
                  ? 'Nenhum produto encontrado'
                  : 'Nenhum produto corresponde à busca'}
              </strong>
              <span>
                {modoBusca === 'codigo'
                  ? `Não localizamos “${naoEncontrado}”. Confira o código digitado ou tente buscar pelo nome.`
                  : 'Tente outro termo, verifique a grafia ou pesquise pelo princípio ativo.'}
              </span>
            </div>
          </div>
        )}

        {!carregando && !erro && modoBusca !== 'codigo' && resultados.length > 0 && (
          <section className="dna-search__results" aria-labelledby={resultadosId}>
            <div className="dna-search__results-head">
              <h4 id={resultadosId} className="dna-search__results-title">
                <strong>{resultados.length}</strong>
                {' '}
                {resultados.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
              </h4>
              {truncado && <span className="dna-search__results-note">Lista parcial</span>}
            </div>

            <ul className="dna-search__list" aria-label="Produtos encontrados no DNA">
              {resultados.map((item, indice) => (
                <li key={`${item.codigo ?? 'produto'}-${item.codbarras || ''}-${indice}`}>
                  <ProdutoResultado
                    produto={item}
                    ativo={mesmoProduto(selecionado, item)}
                    desabilitado={desabilitado}
                    onSelecionar={selecionar}
                  />
                </li>
              ))}
            </ul>

            {truncado && (
              <p className="dna-search__notice">
                Existem mais resultados do que os exibidos. Refine o termo para encontrar o produto certo.
              </p>
            )}
          </section>
        )}
      </div>
    </section>
  );
});

export default ConsultaProdutoDna;
