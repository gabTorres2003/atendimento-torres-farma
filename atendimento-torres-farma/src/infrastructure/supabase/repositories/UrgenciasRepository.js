import { supabase } from '../supabaseClient';

const tabela = 'urgencias';
const tabelaAusente = (error) => (
  error?.code === '42P01'
  || error?.code === 'PGRST205'
  || /does not exist|could not find the table/i.test(error?.message || '')
);

export const UrgenciasRepository = {
  normalizarNomeProduto(nome = '') {
    return String(nome || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  },

  async listarTodos() {
    const { data, error } = await supabase
      .from(tabela)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (tabelaAusente(error)) {
        return [];
      }
      throw error;
    }

    return (data || []).map((item) => ({
      ...item,
      nome_produto: this.normalizarNomeProduto(item.nome_produto || ''),
      falta_dna: Boolean(item.falta_dna),
      usuario_registro: item.usuario_registro || 'Balcão'
    }));
  },

  async listarSugestoes(termo = '') {
    const busca = this.normalizarNomeProduto(termo).trim();
    if (!busca || busca.length < 2) {
      return [];
    }

    const { data, error } = await supabase
      .from(tabela)
      .select('nome_produto')
      .ilike('nome_produto', `${busca}%`)
      .order('nome_produto', { ascending: true })
      .limit(8);

    if (error) {
      if (tabelaAusente(error)) {
        return [];
      }
      throw error;
    }

    const nomes = [];
    for (const item of data || []) {
      const nome = this.normalizarNomeProduto(item.nome_produto || '');
      if (nome && !nomes.includes(nome)) {
        nomes.push(nome);
      }
    }

    return nomes;
  },

  async criar(payload) {
    const produtoNormalizado = this.normalizarNomeProduto(payload.nome_produto || '');
    if (!produtoNormalizado) {
      throw new Error('O nome do produto é obrigatório.');
    }

    const registro = {
      nome_produto: produtoNormalizado,
      ean_dna: payload.ean_dna ? String(payload.ean_dna).trim().toUpperCase() : null,
      quantidade: payload.quantidade,
      falta_dna: Boolean(payload.falta_dna),
      usuario_registro: payload.usuario_registro || 'Balcão',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(tabela)
      .insert([registro])
      .select();

    if (error) {
      if (tabelaAusente(error)) {
        throw new Error('A tabela de urgências ainda não foi criada no banco.');
      }
      throw error;
    }

    return data?.[0] || null;
  },

  async deletar(id) {
    const usuarioSalvo = JSON.parse(localStorage.getItem('@AtendimentoTorres:user') || '{}');
    if (usuarioSalvo.role !== 'admin') {
      throw new Error('Acesso negado. Apenas administradores podem excluir urgências.');
    }

    const { error } = await supabase
      .from(tabela)
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  }
};
