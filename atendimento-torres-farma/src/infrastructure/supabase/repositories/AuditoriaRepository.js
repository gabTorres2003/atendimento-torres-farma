import { supabase } from '../supabaseClient';

export const AuditoriaRepository = {
  async listarTodos() {
    const { data, error } = await supabase
      .from('auditoria_encomendas')
      .select('*')
      .order('data_hora', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async registrarAcesso(vendedor, acao, detalhes = '') {
    const { error } = await supabase.from('auditoria_encomendas').insert([{
      vendedor,
      acao,
      produto: 'SISTEMA',
      detalhes
    }]);
    if (error) console.error('Erro na auditoria de acesso:', error);
  }
};