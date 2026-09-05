import { supabase } from '../supabaseClient';

export async function executarAcaoAdministrativa(action, payload, user) {
  if (!user?.id) {
    throw new Error('Usuário não identificado. Faça login novamente para continuar.');
  }

  const { data, error } = await supabase.functions.invoke('admin-feriados', {
    body: { action, payload, actor: { id: user.id } }
  });

  if (error) {
    if (error.name === 'FunctionsHttpError' && error.context instanceof Response) {
      let responseBody = null;
      try {
        responseBody = await error.context.clone().json();
      } catch {
        responseBody = null;
      }
      throw new Error(responseBody?.error || error.message);
    }
    throw error;
  }
  if (!data?.success) throw new Error(data?.error || 'Não foi possível concluir a operação administrativa.');
  return data.data;
}
