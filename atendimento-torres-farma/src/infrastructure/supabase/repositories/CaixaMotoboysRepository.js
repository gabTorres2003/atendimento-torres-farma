import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_CAIXA_SUPABASE_URL || 'https://nulrzmhpmlngtxetneij.supabase.co';
const anonKey = import.meta.env.VITE_CAIXA_SUPABASE_ANON_KEY
  || import.meta.env.VITE_CAIXA_SUPABASE_PUBLISHABLE_KEY;
const caixaClient = url && anonKey ? createClient(url, anonKey) : null;

export const CaixaMotoboysRepository = {
  async listarAtivos() {
    if (!caixaClient) {
      console.warn('Integração com motoboys indisponível: configure VITE_CAIXA_SUPABASE_ANON_KEY ou VITE_CAIXA_SUPABASE_PUBLISHABLE_KEY no ambiente de build do frontend.');
      return [];
    }

    const { data, error } = await caixaClient
      .from('motoboys')
      .select('*');

    if (error) throw error;

    return (data || [])
      .filter((motoboy) => motoboy.ativo !== false)
      .map((motoboy) => ({
        id: motoboy.id,
        nome: motoboy.nome || motoboy.nome_completo || motoboy.name || 'Motoboy sem nome',
        role: 'motoboy',
        tipo_funcionario: 'MOTOBOY'
      }))
      .filter((motoboy) => motoboy.id && motoboy.nome);
  }
};
