import { supabase } from '../supabaseClient';

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

  async criar(payload) {
    const { data, error } = await supabase
      .from('escalas_feriados')
      .insert([{
        feriado_id: payload.feriado_id,
        horario_inicio: payload.horario_inicio || null,
        horario_fim: payload.horario_fim || null,
        status: payload.status || 'RASCUNHO',
        criada_por: payload.criada_por || null,
        confirmada_por: null,
        criada_em: new Date().toISOString()
      }])
      .select(escalaSelect)
      .single();

    if (error) throw error;
    return data;
  },

  async atualizar(id, payload) {
    const { data, error } = await supabase
      .from('escalas_feriados')
      .update({
        horario_inicio: payload.horario_inicio,
        horario_fim: payload.horario_fim,
        status: payload.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(escalaSelect)
      .single();

    if (error) throw error;
    return data;
  },

  async confirmar(id, confirmadaPor) {
    const { data, error } = await supabase
      .from('escalas_feriados')
      .update({
        status: 'CONFIRMADA',
        confirmada_por: confirmadaPor,
        confirmada_em: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(escalaSelect)
      .single();

    if (error) throw error;
    return data;
  },

  async deletar(id) {
    const escala = await this.buscarPorId(id);
    if (escala.status === 'CONFIRMADA') {
      throw new Error('Escalas confirmadas fazem parte do histórico e não podem ser excluídas automaticamente.');
    }

    const { error: membrosError } = await supabase
      .from('escala_feriados_membros')
      .delete()
      .eq('escala_id', id);

    if (membrosError) throw membrosError;

    const { error } = await supabase
      .from('escalas_feriados')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
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

  async salvarMembros(escalaId, membros) {
    const { error: deleteError } = await supabase
      .from('escala_feriados_membros')
      .delete()
      .eq('escala_id', escalaId);

    if (deleteError) throw deleteError;
    if (!membros || membros.length === 0) return;

    const inserts = membros.map((membro) => ({
      escala_id: escalaId,
      tipo_funcionario: membro.tipo_funcionario,
      balconista_id: membro.tipo_funcionario === 'BALCONISTA' ? membro.balconista_id : null,
      motoboy_id: membro.tipo_funcionario === 'MOTOBOY' ? membro.motoboy_id : null,
      situacao: membro.situacao,
      horario_inicio: membro.horario_inicio || null,
      horario_fim: membro.horario_fim || null
    }));

    const { error } = await supabase
      .from('escala_feriados_membros')
      .insert(inserts);

    if (error) throw error;
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
