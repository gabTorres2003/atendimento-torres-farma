import { supabase } from '../../supabase/supabaseClient';

/**
 * Consulta de leitura de produtos no DNA, via gateway `consulta-dna`
 * (Supabase Edge Function) que fala com o backend do Cotação.
 *
 * O navegador não conhece a URL interna do backend, nem credenciais do
 * Cotação/DNA. Nenhum dado é gravado no Supabase do Balcão.
 */

const FUNCAO = 'consulta-dna';
const TERMO_VALIDO = /^[0-9A-Za-z]{1,20}$/;
const TIPOS_TEXTO = new Set(['descricao', 'principio']);
const TEXTO_VALIDO = /^[\p{L}\p{N}][\p{L}\p{N}\s.,'ºª+\-/()]{1,39}$/u;
const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map();

const lerMensagemDoErro = async (error) => {
  try {
    const corpo = await error?.context?.json();
    if (corpo?.error) return corpo.error;
  } catch {
    // resposta sem corpo JSON: usa mensagem padrão
  }
  return 'Consulta ao DNA indisponível. Tente novamente em instantes.';
};

const normalizarTermo = (valor) => String(valor || '').trim().replace(/\s+/g, ' ');

export const DnaProdutosRepository = {
  async buscarProduto({ termo, usuarioId }) {
    const codigo = String(termo || '').trim();

    if (!codigo) {
      throw new Error('Informe o código do produto ou o código de barras.');
    }

    if (!TERMO_VALIDO.test(codigo)) {
      throw new Error('Use apenas letras ou números, com até 20 caracteres.');
    }

    if (!usuarioId) {
      throw new Error('Usuário não identificado. Faça login novamente.');
    }

    const emCache = cache.get(codigo);
    if (emCache && Date.now() - emCache.em < CACHE_TTL_MS) {
      return emCache.produto;
    }

    const { data, error } = await supabase.functions.invoke(FUNCAO, {
      body: { termo: codigo, actor: { id: usuarioId } },
    });

    if (error) {
      throw new Error(await lerMensagemDoErro(error));
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Não foi possível consultar o produto.');
    }

    const produto = data.encontrado ? data.produto : null;
    cache.set(codigo, { produto, em: Date.now() });
    return produto;
  },

  /**
   * Pesquisa no DNA por descrição ou princípio ativo. O backend limita a
   * lista e informa `truncado` quando há mais resultados do que o exibido.
   */
  async pesquisarProdutos({ termo, tipo = 'descricao', usuarioId }) {
    const texto = normalizarTermo(termo);
    const tipoNormalizado = String(tipo || 'descricao').trim().toLowerCase();

    if (!TIPOS_TEXTO.has(tipoNormalizado)) {
      throw new Error('Escolha descrição ou princípio ativo.');
    }

    if (texto.length < 2) {
      throw new Error('Informe pelo menos 2 caracteres para pesquisar.');
    }

    if (texto.length > 40) {
      throw new Error('O termo de pesquisa deve ter no máximo 40 caracteres.');
    }

    if (!TEXTO_VALIDO.test(texto)) {
      throw new Error('Use apenas letras, números e espaços.');
    }

    if (!usuarioId) {
      throw new Error('Usuário não identificado. Faça login novamente.');
    }

    const chave = `texto:${tipoNormalizado}:${texto.toLowerCase()}`;
    const emCache = cache.get(chave);
    if (emCache && Date.now() - emCache.em < CACHE_TTL_MS) {
      return emCache.resultado;
    }

    const { data, error } = await supabase.functions.invoke(FUNCAO, {
      body: { termo: texto, tipo: tipoNormalizado, actor: { id: usuarioId } },
    });

    if (error) {
      throw new Error(await lerMensagemDoErro(error));
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Não foi possível pesquisar os produtos.');
    }

    const resultado = {
      resultados: Array.isArray(data.resultados) ? data.resultados : [],
      truncado: Boolean(data.truncado),
    };

    cache.set(chave, { resultado, em: Date.now() });
    return resultado;
  },
};
