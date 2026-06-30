import { useState, useCallback } from 'react';
import { supabase } from '../../infrastructure/supabase/supabaseClient';

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Lê todos os usuários do banco
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cria ou Atualiza um usuário
  const saveUser = async (userData) => {
    setLoading(true);
    try {
      let response;
      if (userData.id) {
        // Modo Edição
        response = await supabase
          .from('users')
          .update({
            nome: userData.nome,
            pin: userData.pin,
            role: userData.role,
            ativo: userData.ativo,
          })
          .eq('id', userData.id);
      } else {
        // Modo Criação
        response = await supabase
          .from('users')
          .insert([{
            nome: userData.nome,
            pin: userData.pin,
            role: userData.role,
            ativo: userData.ativo,
          }]);
      }

      if (response.error) throw response.error;
      
      await fetchUsers(); // Recarrega a lista
      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      // Tratamento amigável caso o PIN já exista (Erro 23505 no Postgres)
      if (error.code === '23505') {
        return { success: false, error: 'Este PIN já está sendo utilizado por outro usuário.' };
      }
      return { success: false, error: 'Erro ao salvar os dados. Tente novamente.' };
    } finally {
      setLoading(false);
    }
  };

  // Deleta um usuário
  const deleteUser = async (id) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      
      await fetchUsers(); // Recarrega a lista
      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      return { success: false, error: 'Erro ao deletar o usuário.' };
    } finally {
      setLoading(false);
    }
  };

  return { 
    users, 
    loading, 
    fetchUsers, 
    saveUser, 
    deleteUser 
  };
};