import { supabase } from '../supabaseClient';

export async function executarAcaoAdministrativa(action, payload, credentials) {
  if (!credentials?.login || !credentials?.pin) {
    throw new Error('Sessão administrativa expirada. Faça login novamente para continuar.');
  }

  const { data, error } = await supabase.functions.invoke('admin-feriados', {
    body: { action, payload, credentials }
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
