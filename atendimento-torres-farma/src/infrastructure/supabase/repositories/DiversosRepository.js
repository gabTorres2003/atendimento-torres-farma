import { supabase } from '../supabaseClient';

export const DiversosRepository = {
  async buscarTodos(termo = '') {
    let query = supabase.from('medicamentos_diversos').select('*');
    if (termo) {
      query = query.or(`produto.ilike.%${termo}%,codigo_diversos.ilike.%${termo}%`);
    }
    const { data, error } = await query.order('produto', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async verificarDuplicidade(produto, idIgnorado = null) {
    let query = supabase.from('medicamentos_diversos').select('id').ilike('produto', produto);
    if (idIgnorado) {
      query = query.neq('id', idIgnorado);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data && data.length > 0;
  },

  async obterMaiorCodigo() {
    const { data, error } = await supabase.from('medicamentos_diversos').select('codigo_diversos');
    if (error) throw error;
    
    let maxCodigo = 0;
    if (data) {
      const numeros = data.map(c => parseInt(c.codigo_diversos, 10)).filter(n => !isNaN(n));
      if (numeros.length > 0) {
        maxCodigo = Math.max(...numeros);
      }
    }
    return maxCodigo;
  },

  async criar(payload) {
    if (!payload.id) {
      payload.id = crypto.randomUUID();
    }
    const { data, error } = await supabase.from('medicamentos_diversos').insert([payload]);
    if (error) throw error;
    return data;
  },

  async atualizar(id, payload) {
    const { data, error } = await supabase.from('medicamentos_diversos').update(payload).eq('id', id);
    if (error) throw error;
    return data;
  },

  async deletar(id) {
    const { error } = await supabase.from('medicamentos_diversos').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};