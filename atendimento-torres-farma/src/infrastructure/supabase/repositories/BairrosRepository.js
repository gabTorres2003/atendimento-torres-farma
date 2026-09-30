import { supabase } from '../supabaseClient';
import { normalizarBusca } from '../../../core/utils/cadastroPadrao';

const tabela = 'bairros';

const tabelaAusente = (error) =>
  error?.code === '42P01' || /does not exist/i.test(error?.message || '');

const exigirAdmin = () => {
  const usuario = JSON.parse(localStorage.getItem('@AtendimentoTorres:user') || '{}');
  if (usuario.role !== 'admin') {
    throw new Error('Acesso negado. Apenas administradores podem alterar a base de bairros.');
  }
  return usuario;
};

export const BairrosRepository = {
  async listarTodos({ incluirInativos = false } = {}) {
    let query = supabase
      .from(tabela)
      .select('*')
      .order('nome_oficial', { ascending: true });

    if (!incluirInativos) {
      query = query.eq('ativo', true);
    }

    const { data, error } = await query;

    if (error) {
      if (tabelaAusente(error)) return [];
      throw error;
    }

    return data || [];
  },

  async criar(nome) {
    exigirAdmin();

    const nomeOficial = String(nome || '').replace(/\s+/g, ' ').trim();
    if (nomeOficial.length < 3) {
      throw new Error('Informe o nome do bairro (minimo 3 letras).');
    }

    const existentes = await this.listarTodos({ incluirInativos: true });
    const normalizado = normalizarBusca(nomeOficial);
    if (existentes.some((bairro) => normalizarBusca(bairro.nome_oficial) === normalizado)) {
      throw new Error('Este bairro ja existe na base oficial.');
    }

    const { data, error } = await supabase
      .from(tabela)
      .insert([{ nome_oficial: nomeOficial, ativo: true }])
      .select();

    if (error) {
      if (tabelaAusente(error)) {
        throw new Error('A tabela de bairros ainda nao foi criada no banco.');
      }
      if (error.code === '23505') {
        throw new Error('Este bairro ja existe na base oficial.');
      }
      throw error;
    }

    return data?.[0] || null;
  },

  async atualizarNome(id, nome) {
    exigirAdmin();

    const nomeOficial = String(nome || '').replace(/\s+/g, ' ').trim();
    if (nomeOficial.length < 3) {
      throw new Error('Informe o nome do bairro (minimo 3 letras).');
    }

    const { error } = await supabase
      .from(tabela)
      .update({ nome_oficial: nomeOficial })
      .eq('id', id);

    if (error) {
      if (error.code === '23505') {
        throw new Error('Este bairro ja existe na base oficial.');
      }
      throw error;
    }
  },

  async definirAtivo(id, ativo) {
    exigirAdmin();

    const { error } = await supabase
      .from(tabela)
      .update({ ativo })
      .eq('id', id);

    if (error) throw error;
  },

  async deletar(id) {
    exigirAdmin();

    const { count, error: countError } = await supabase
      .from('clientes')
      .select('id', { count: 'exact', head: true })
      .eq('bairro_id', id);

    if (countError && !tabelaAusente(countError)) {
      throw countError;
    }

    if (count > 0) {
      throw new Error(
        `Este bairro possui ${count} cliente(s) vinculado(s) e não pode ser excluído. Desative-o ao invés de excluir.`
      );
    }

    const { error } = await supabase
      .from(tabela)
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        throw new Error('Este bairro possui clientes vinculados e não pode ser excluído. Desative-o ao invés de excluir.');
      }
      throw error;
    }
  }
};
