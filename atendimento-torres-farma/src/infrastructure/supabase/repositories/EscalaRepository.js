import { supabase } from '../supabaseClient';
import { executarAcaoAdministrativa } from './AdminFunctionsRepository';

const escalaSelect = '*, feriados(*)';

export const EscalaRepository = {
  async listarTodas() {
    const { data, error } = await supabase
      .from('escalas_feriados')
      .select(escalaSelect)
      .order('criada_em', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async listarConfirmadas() {
    const { data, error } = await supabase
      .from('escalas_feriados')
      .select(escalaSelect)
      .eq('status', 'CONFIRMADA')
      .order('confirmada_em', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async buscarPorFeriadoId(feriadoId) {
    const { data, error } = await supabase
      .from('escalas_feriados')
      .select(escalaSelect)
      .eq('feriado_id', feriadoId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  },

  async buscarPorId(id) {
    const { data, error } = await supabase
      .from('escalas_feriados')
      .select(escalaSelect)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async criar(payload, credentials) {
    return executarAcaoAdministrativa('SALVAR_ESCALA', { ...payload, membros: [] }, credentials);
  },

  async salvarEscala(payload, credentials) {
    return executarAcaoAdministrativa('SALVAR_ESCALA', payload, credentials);
  },

  async atualizar(id, payload, credentials) {
    return executarAcaoAdministrativa('ATUALIZAR_ESCALA', { id, ...payload }, credentials);
  },

  async confirmar(id, confirmadaPor, credentials) {
    return executarAcaoAdministrativa('CONFIRMAR_ESCALA', {
      id,
      confirmada_por: confirmadaPor
    }, credentials);
  },

  async deletar(id, credentials) {
    return executarAcaoAdministrativa('DELETAR_ESCALA', { id }, credentials);
  },

  async listarMembros(escalaId) {
    const { data, error } = await supabase
      .from('escala_feriados_membros')
      .select('*')
      .eq('escala_id', escalaId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async salvarMembros(escalaId, membros, credentials) {
    return executarAcaoAdministrativa('SALVAR_MEMBROS', { escala_id: escalaId, membros }, credentials);
  },

  async buscarEscalaCompleta(feriadoId) {
    const escala = await this.buscarPorFeriadoId(feriadoId);
    if (!escala) return null;

    const membros = await this.listarMembros(escala.id);
    return { ...escala, membros };
  },

  async listarHistorico() {
    return this.listarConfirmadas();
  },

  async buscarUltimaConfirmada() {
    const { data, error } = await supabase
      .from('escalas_feriados')
      .select(escalaSelect)
      .eq('status', 'CONFIRMADA')
      .order('confirmada_em', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }
};
