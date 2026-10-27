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
};
