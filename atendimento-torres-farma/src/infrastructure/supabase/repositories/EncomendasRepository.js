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
    if (!payload.id) {
      payload.id = crypto.randomUUID();
    }
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
  },

  async registrarAuditoria(vendedor, acao, produto, detalhes) {
    const { error } = await supabase.from('auditoria_encomendas').insert([{
      vendedor,
      acao,
      produto,
      detalhes
    }]);
    if (error) console.error('Erro na auditoria:', error);
  }
};