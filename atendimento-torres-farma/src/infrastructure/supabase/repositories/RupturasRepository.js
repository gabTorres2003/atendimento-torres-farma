import { supabase } from '../supabaseClient';

const tabela = 'rupturas';

export const RupturasRepository = {
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
      if (error.code === '42P01' || /does not exist/i.test(error.message || '')) {
        return [];
      }
      throw error;
    }

    return (data || []).map((item) => ({
      ...item,
      nome_produto: this.normalizarNomeProduto(item.nome_produto || ''),
      canal_procura: (item.canal_procura || 'BALCÃO').toUpperCase(),
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
      if (error.code === '42P01' || /does not exist/i.test(error.message || '')) {
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
      canal_procura: (payload.canal_procura || 'BALCÃO').toUpperCase(),
      nome_cliente: String(payload.nome_cliente || '').trim(),
      quantidade_solicitada: Number(payload.quantidade_solicitada),
      telefone_cliente: payload.telefone_cliente ? String(payload.telefone_cliente).trim() : null,
      usuario_registro: payload.usuario_registro || 'Balcão',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(tabela)
      .insert([registro])
      .select();

    if (error) {
      if (error.code === '42P01' || /does not exist/i.test(error.message || '')) {
        throw new Error('A tabela de rupturas ainda não foi criada no banco.');
      }
      throw error;
    }

    return data?.[0] || null;
  },
};
