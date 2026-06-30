import { useState, useCallback } from 'react';
import { supabase } from '../../infrastructure/supabase/supabaseClient';

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('users').select('*').order('nome', { ascending: true });
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveUser = async (userData) => {
    setLoading(true);
    try {
      const payload = {
        nome: userData.nome,
        login: userData.login.toLowerCase().trim(), 
        pin: userData.pin,
        role: userData.role,
        ativo: userData.ativo,
      };

      let response;
      if (userData.id) {
        response = await supabase.from('users').update(payload).eq('id', userData.id);
      } else {
        response = await supabase.from('users').insert([payload]);
      }

      if (response.error) throw response.error;
      await fetchUsers();
      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      if (error.code === '23505') {
        return { success: false, error: 'Este PIN já está sendo utilizado.' };
      }
      return { success: false, error: 'Erro ao salvar os dados.' };
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      await fetchUsers();
      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      return { success: false, error: 'Erro ao deletar o usuário.' };
    } finally {
      setLoading(false);
    }
  };

  return { users, loading, fetchUsers, saveUser, deleteUser };
};