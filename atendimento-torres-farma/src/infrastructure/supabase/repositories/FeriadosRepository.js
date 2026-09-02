import { supabase } from '../supabaseClient';
import { executarAcaoAdministrativa } from './AdminFunctionsRepository';

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
      .maybeSingle();

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

  async criar(payload, credentials) {
    return executarAcaoAdministrativa('CRIAR_FERIADO', {
      data: payload.data,
      nome: payload.nome,
      abrangencia: payload.abrangencia,
      natureza: payload.natureza,
      observacao: payload.observacao || null,
      ativo: payload.ativo !== undefined ? payload.ativo : true,
      created_by: payload.created_by || null
    }, credentials);
  },

  async atualizar(id, payload, credentials) {
    return executarAcaoAdministrativa('ATUALIZAR_FERIADO', {
      id,
      data: payload.data,
      nome: payload.nome,
      abrangencia: payload.abrangencia,
      natureza: payload.natureza,
      observacao: payload.observacao || null,
      ativo: payload.ativo
    }, credentials);
  },

  async deletar(id, credentials) {
    return executarAcaoAdministrativa('DELETAR_FERIADO', { id }, credentials);
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
