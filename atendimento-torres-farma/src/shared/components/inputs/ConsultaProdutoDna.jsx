import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Barcode, CheckCircle2, CloudDownload, Database, PackageSearch, Pill, Search, X } from 'lucide-react';
import { useAuth } from '../../../core/hooks/useAuth';
import { DnaProdutosRepository } from '../../../infrastructure/integrations/dna/DnaProdutosRepository';
import { Button } from '../buttons/Button';

/**
 * Consulta somente leitura do produto no DNA.
 *
 * O bloco de código preserva o fluxo original (EAN/código interno e botão de
 * consulta) e agora também aceita Enter. O bloco de texto é uma pesquisa
 * adicional por descrição ou princípio ativo: a lista vem limitada pelo
 * backend e nenhum item é escolhido sem ação explícita do atendente.
 */

const TIPOS_BUSCA = [
  { id: 'descricao', rotulo: 'Descrição', icone: Search },
  { id: 'principio', rotulo: 'Princípio ativo', icone: Pill },
];

const estiloPainel = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '12px',
  backgroundColor: 'var(--color-surface)',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  minWidth: 0
};

const estiloTitulo = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '0.9rem',
  color: 'var(--color-primary)',
  lineHeight: 1.3
};

const estiloRotulo = {
  fontSize: '0.8rem',
  fontWeight: '700',
  color: 'var(--color-text-main)'
};

const estiloAjuda = {
  fontSize: '0.72rem',
  color: 'var(--color-text-muted)',
  lineHeight: 1.4
};

const estiloCampoCodigo = {
  flex: '1 1 190px',
  minWidth: 0,
  padding: '11px 12px',
  borderRadius: 'var(--radius-md)',
  border: '2px solid var(--color-primary)',
  fontSize: '1rem',
  fontWeight: '600',
  color: 'var(--color-text-main)',
  backgroundColor: 'var(--color-surface)'
};

const estiloCampoTexto = {
  ...estiloCampoCodigo,
  border: '1px solid var(--color-border)',
  fontWeight: '500'
};

const estiloAba = (ativa) => ({
  padding: '8px 12px',
  border: `1px solid ${ativa ? 'var(--color-primary)' : 'var(--color-border)'}`,
  borderRadius: '999px',
  backgroundColor: ativa ? '#eff6ff' : 'var(--color-surface)',
  color: ativa ? 'var(--color-primary)' : 'var(--color-text-muted)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  fontSize: '0.8rem',
  fontWeight: '700',
  minHeight: '36px'
});

const estiloErro = {
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #fecaca',
  backgroundColor: '#fef2f2',
  color: '#991b1b',
  fontSize: '0.78rem',
  lineHeight: 1.4
};

const estiloAviso = {
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #fde68a',
  backgroundColor: '#fffbeb',
  color: '#92400e',
  fontSize: '0.78rem',
  lineHeight: 1.4
};

const estiloSucesso = {
  fontSize: '0.75rem',
  fontWeight: '600',
  color: '#047857'
};

const textoSecundario = (item) =>
  [item.principioAtivo, item.apresentacao, item.fabricante].filter(Boolean).join(' · ') ||
  'Sem informações complementares';

const ConsultaProdutoDna = forwardRef(function ConsultaProdutoDna(
  { codigo, onCodigoChange, onSelecionar, desabilitado = false },
  ref
) {
  const { user } = useAuth();

  const [carregandoCodigo, setCarregandoCodigo] = useState(false);
  const [erroCodigo, setErroCodigo] = useState('');
  const [produtoCodigo, setProdutoCodigo] = useState(null);
  const [selecionado, setSelecionado] = useState(null);

  const [tipoBusca, setTipoBusca] = useState('descricao');
  const [termoBusca, setTermoBusca] = useState('');
  const [carregandoTexto, setCarregandoTexto] = useState(false);
  const [erroTexto, setErroTexto] = useState('');
  const [resultados, setResultados] = useState([]);
  const [truncado, setTruncado] = useState(false);
  const [pesquisouTexto, setPesquisouTexto] = useState(false);

  const termo = String(codigo || '').trim();
  const emAndamentoRef = useRef({ codigo: false, texto: false });

  const consultarCodigo = useCallback(async (valorDigitado) => {
    const valor = String(valorDigitado ?? termo).trim();

    setErroCodigo('');
    setProdutoCodigo(null);
    setSelecionado(null);

    if (!valor) {
      setErroCodigo('Digite o EAN ou o código do DNA antes de consultar.');
      return;
    }

    // Enter repetido não dispara outra requisição enquanto a anterior roda.
    if (emAndamentoRef.current.codigo) return;
    emAndamentoRef.current.codigo = true;
    setCarregandoCodigo(true);
    try {
      const encontrado = await DnaProdutosRepository.buscarProduto({
        termo: valor,
        usuarioId: user?.id
      });

      if (!encontrado) {
        setErroCodigo(`Nenhum produto encontrado no DNA para "${valor}".`);
        return;
      }

      setProdutoCodigo(encontrado);
    } catch (error) {
      setErroCodigo(error?.message || 'Não foi possível consultar o DNA agora.');
    } finally {
      emAndamentoRef.current.codigo = false;
      setCarregandoCodigo(false);
    }
  }, [termo, user?.id]);

  useImperativeHandle(ref, () => ({ consultar: consultarCodigo }), [consultarCodigo]);

  const pesquisarTexto = async () => {
    const texto = termoBusca.trim();

    setErroTexto('');
    setResultados([]);
    setTruncado(false);
    setSelecionado(null);
    setPesquisouTexto(false);

    if (texto.length < 2) {
      setErroTexto('Digite pelo menos 2 caracteres para pesquisar.');
      return;
    }

    // Enter repetido não dispara outra requisição enquanto a anterior roda.
    if (emAndamentoRef.current.texto) return;
    emAndamentoRef.current.texto = true;
    setCarregandoTexto(true);
    try {
      const resposta = await DnaProdutosRepository.pesquisarProdutos({
        termo: texto,
        tipo: tipoBusca,
        usuarioId: user?.id
      });

      setResultados(resposta.resultados);
      setTruncado(resposta.truncado);
      setPesquisouTexto(true);
    } catch (error) {
      setErroTexto(error?.message || 'Não foi possível pesquisar no DNA agora.');
    } finally {
      emAndamentoRef.current.texto = false;
      setCarregandoTexto(false);
    }
  };

  const selecionar = (produto) => {
    if (!produto) return;
    setSelecionado(produto);
    onSelecionar?.(produto);
  };

  const inativo = produtoCodigo?.inativo === 'S';
  const aplicado =
    selecionado && produtoCodigo &&
    String(selecionado.codigo) === String(produtoCodigo.codigo);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', minWidth: 0 }}>
      <section style={estiloPainel} aria-labelledby="consulta-dna-codigo-titulo">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <Barcode size={16} color="var(--color-primary)" />
          <strong id="consulta-dna-codigo-titulo" style={estiloTitulo}>
            Busca por código
          </strong>
          <span
            style={{
              marginLeft: 'auto',
              padding: '2px 8px',
              borderRadius: '999px',
              border: '1px solid var(--color-border)',
              fontSize: '0.68rem',
              fontWeight: '700',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.4px'
            }}
          >
            EAN ou DNA
          </span>
        </div>

        <label htmlFor="consulta-dna-codigo" style={estiloRotulo}>
          EAN ou código interno do DNA
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            id="consulta-dna-codigo"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={codigo || ''}
            onChange={(evento) => onCodigoChange?.(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') {
                evento.preventDefault();
                consultarCodigo(evento.currentTarget.value);
              }
            }}
            placeholder="Digite ou leia o código"
            disabled={desabilitado}
            style={estiloCampoCodigo}
          />
          <Button
            type="button"
            icon={Search}
            isLoading={carregandoCodigo}
            disabled={desabilitado || !termo}
            onClick={() => consultarCodigo(termo)}
            style={{ width: 'auto', flex: '0 0 auto', padding: '10px 16px', fontSize: '0.9rem' }}
          >
            Consultar código
          </Button>
        </div>
        <span style={estiloAjuda}>
          Leia o código de barras ou digite o EAN/código do DNA e pressione Enter.
        </span>

        {erroCodigo && <div role="alert" style={estiloErro}>{erroCodigo}</div>}

        {produtoCodigo && (
          <div
            style={{
              border: '1px solid var(--color-border)',
              borderLeft: '4px solid var(--color-primary)',
              borderRadius: '8px',
              padding: '10px',
              backgroundColor: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Database size={14} color="var(--color-primary)" />
              <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                Produto encontrado no DNA
              </span>
            </div>
            <strong style={{ fontSize: '0.92rem', color: 'var(--color-text-main)', lineHeight: 1.4 }}>
              {produtoCodigo.descricao}
            </strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              Código DNA: {produtoCodigo.codigo ?? '-'} | EAN: {produtoCodigo.codbarras || '-'} |{' '}
              {inativo ? 'Inativo no DNA' : 'Ativo no DNA'}
            </span>
            {inativo && (
              <span style={{ fontSize: '0.78rem', color: '#92400e' }}>
                Produto inativo no DNA. Confirme antes de registrar.
              </span>
            )}
            {aplicado && <span style={estiloSucesso}>Descrição aplicada ao formulário.</span>}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
              <Button
                type="button"
                icon={CloudDownload}
                onClick={() => selecionar(produtoCodigo)}
                style={{ width: 'auto', padding: '8px 14px', fontSize: '0.85rem' }}
              >
                Usar descrição
              </Button>
              <Button
                type="button"
                variant="secondary"
                icon={X}
                onClick={() => setProdutoCodigo(null)}
                style={{ width: 'auto', padding: '8px 14px', fontSize: '0.85rem' }}
              >
                Dispensar
              </Button>
            </div>
          </div>
        )}
      </section>

      <section style={estiloPainel} aria-labelledby="consulta-dna-texto-titulo">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <PackageSearch size={16} color="var(--color-primary)" />
          <strong id="consulta-dna-texto-titulo" style={estiloTitulo}>
            Busca por descrição ou princípio ativo
          </strong>
        </div>

        <div role="group" aria-label="Tipo de pesquisa no DNA" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {TIPOS_BUSCA.map(({ id, rotulo, icone: Icone }) => (
            <button
              key={id}
              type="button"
              aria-pressed={tipoBusca === id}
              onClick={() => {
                setTipoBusca(id);
                setResultados([]);
                setTruncado(false);
                setErroTexto('');
                setSelecionado(null);
                setPesquisouTexto(false);
              }}
              style={estiloAba(tipoBusca === id)}
            >
              <Icone size={14} /> {rotulo}
            </button>
          ))}
        </div>

        <label htmlFor="consulta-dna-texto" style={estiloRotulo}>
          {tipoBusca === 'descricao' ? 'Descrição do produto' : 'Princípio ativo'}
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            id="consulta-dna-texto"
            type="text"
            autoComplete="off"
            value={termoBusca}
            onChange={(evento) => setTermoBusca(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') {
                evento.preventDefault();
                pesquisarTexto();
              }
            }}
            placeholder={
              tipoBusca === 'descricao'
                ? 'Ex.: dipirona 500mg'
                : 'Ex.: dipirona sódica'
            }
            maxLength={40}
            disabled={desabilitado}
            style={estiloCampoTexto}
          />
          <Button
            type="button"
            variant="secondary"
            icon={Search}
            isLoading={carregandoTexto}
            disabled={desabilitado || termoBusca.trim().length < 2}
            onClick={pesquisarTexto}
            style={{ width: 'auto', flex: '0 0 auto', padding: '10px 16px', fontSize: '0.9rem' }}
          >
            Buscar
          </Button>
        </div>
        <span style={estiloAjuda}>
          A pesquisa roda no DNA e retorna uma lista curta. Se houver muitos resultados, refine o termo.
        </span>

        {erroTexto && <div role="alert" style={estiloErro}>{erroTexto}</div>}

        {carregandoTexto && (
          <div role="status" aria-live="polite" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Pesquisando produtos no DNA...
          </div>
        )}

        {!carregandoTexto && !erroTexto && pesquisouTexto && resultados.length === 0 && (
          <div style={estiloAviso}>
            Nenhum produto encontrado. Tente outro termo ou use a busca por código.
          </div>
        )}

        {resultados.length > 0 && (
          <ul
            aria-label="Resultados da pesquisa no DNA"
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              maxHeight: '340px',
              overflowY: 'auto'
            }}
          >
            {resultados.map((item) => {
              const ativo = selecionado && String(selecionado.codigo) === String(item.codigo);
              return (
                <li key={`${item.codigo}-${item.codbarras || ''}`}>
                  <button
                    type="button"
                    onClick={() => selecionar(item)}
                    aria-pressed={Boolean(ativo)}
                    style={{
                      width: '100%',
                      minWidth: 0,
                      textAlign: 'left',
                      padding: '9px 10px',
                      border: `1px solid ${ativo ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderLeft: `4px solid ${ativo ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: '8px',
                      backgroundColor: ativo ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', lineHeight: 1.35 }}>
                        {item.descricao || 'Produto sem descrição'}
                      </strong>
                      {item.inativo === 'S' && (
                        <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#92400e', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '999px', padding: '1px 6px' }}>
                          Inativo
                        </span>
                      )}
                      {ativo && <CheckCircle2 size={14} color="var(--color-primary)" />}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.35 }}>
                      {textoSecundario(item)}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                      Código DNA: {item.codigo ?? '-'} | EAN: {item.codbarras || '-'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {truncado && (
          <div style={estiloAviso}>
            Existem mais resultados do que os exibidos. Refine a pesquisa para encontrar o produto certo.
          </div>
        )}
      </section>
    </div>
  );
});

export default ConsultaProdutoDna;
