import { supabase } from '../supabaseClient';

export const EncomendasRepository = {
  async listarTodos() {
    const { data, error } = await supabase
      .from('encomendas')
      .select('*')
      .order('data_encomenda', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async criar(payload) {
    const { data, error } = await supabase.from('encomendas').insert([payload]);
    if (error) throw error;
    return data;
  },

  async atualizar(id, payload) {
    const { data, error } = await supabase.from('encomendas').update(payload).eq('id', id);
    if (error) throw error;
    return data;
  },

  async deletar(id) {
    const { error } = await supabase.from('encomendas').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};