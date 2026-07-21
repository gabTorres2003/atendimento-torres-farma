import { supabase } from '../supabaseClient';

export const DiversosRepository = {
  async buscarTodos(termo = '') {
    let query = supabase
      .from('medicamentos_diversos')
      .select('*')
      .order('produto', { ascending: true });
    
    if (termo) {
      query = query.ilike('produto', `%${termo}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async verificarDuplicidade(produto, id) {
    let query = supabase
      .from('medicamentos_diversos')
      .select('id')
      .ilike('produto', produto);
      
    if (id) {
      query = query.neq('id', id);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    
    return !!data;
  },

  async criar(medicamentoData) {
    if (medicamentoData.codigo_diversos) {
      const { data: existente } = await supabase
        .from('medicamentos_diversos')
        .select('id')
        .eq('codigo_diversos', medicamentoData.codigo_diversos)
        .maybeSingle();

      if (existente) {
        throw new Error(`Atenção: A gaveta DIVERSOS ${medicamentoData.codigo_diversos} já está em uso!`);
      }
    } else {
      medicamentoData.codigo_diversos = await this.getNextCodigoLivre();
    }

    const { data, error } = await supabase
      .from('medicamentos_diversos')
      .insert([medicamentoData])
      .select();

    if (error) throw error;
    return data;
  },

  async getNextCodigoLivre() {
    const { data, error } = await supabase
      .from('medicamentos_diversos')
      .select('codigo_diversos')
      .not('codigo_diversos', 'is', null);

    if (error) throw error;
    
    const codigos = data
      .map(item => parseInt(item.codigo_diversos, 10))
      .filter(num => !isNaN(num));
      
    const codigosEmUso = new Set(codigos);
    let proximoCodigo = 1;
    
    while (codigosEmUso.has(proximoCodigo)) {
      proximoCodigo++;
    }
    
    return proximoCodigo.toString();
  },

  async atualizar(id, medicamentoData) {
    if (medicamentoData.codigo_diversos) {
      const { data: existente } = await supabase
        .from('medicamentos_diversos')
        .select('id')
        .eq('codigo_diversos', medicamentoData.codigo_diversos)
        .neq('id', id)
        .maybeSingle();

      if (existente) {
        throw new Error(`Atenção: A gaveta DIVERSOS ${medicamentoData.codigo_diversos} já está em uso!`);
      }
    }

    const { data, error } = await supabase
      .from('medicamentos_diversos')
      .update(medicamentoData)
      .eq('id', id)
      .select();
      
    if (error) throw error;
    return data;
  },

  async deletar(id) {
    const { error } = await supabase
      .from('medicamentos_diversos')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};