import { supabase } from '../supabaseClient';

export const AuditoriaRepository = {
  async listarTodos() {
    const { data, error } = await supabase
      .from('auditoria_encomendas')
      .select('*')
      .order('data_hora', { ascending: false });
    if (error) throw error;
    return data || [];
  }
};