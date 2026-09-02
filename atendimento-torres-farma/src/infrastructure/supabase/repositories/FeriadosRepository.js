import { supabase } from '../supabaseClient';

export const FeriadosRepository = {
  async listarTodos() {
    const { data, error } = await supabase
      .from('feriados')
      .select('*')
      .order('data', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async listarAtivos() {
    const { data, error } = await supabase
      .from('feriados')
      .select('*')
      .eq('ativo', true)
      .order('data', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async buscarPorData(data) {
    const { data: result, error } = await supabase
      .from('feriados')
      .select('*')
      .eq('data', data)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return result || null;
  },

  async buscarPorId(id) {
    const { data, error } = await supabase
      .from('feriados')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async criar(payload) {
    const { data, error } = await supabase
      .from('feriados')
      .insert([{
        data: payload.data,
        nome: payload.nome,
        abrangencia: payload.abrangencia,
        natureza: payload.natureza,
        observacao: payload.observacao || null,
        ativo: payload.ativo !== undefined ? payload.ativo : true,
        created_by: payload.created_by || null
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async atualizar(id, payload) {
    const { data, error } = await supabase
      .from('feriados')
      .update({
        data: payload.data,
        nome: payload.nome,
        abrangencia: payload.abrangencia,
        natureza: payload.natureza,
        observacao: payload.observacao || null,
        ativo: payload.ativo
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletar(id) {
    const { error } = await supabase
      .from('feriados')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async listarBalconistas() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'balconista')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async listarUsuarios() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;
    return data || [];
  }
};
