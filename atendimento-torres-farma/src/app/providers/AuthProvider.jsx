import { createContext, useState, useEffect } from 'react';
import { supabase } from '../../infrastructure/supabase/supabaseClient';

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('@AtendimentoTorres:user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (usuario, pin) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('nome', usuario.trim())
        .eq('pin', pin)
        .eq('ativo', true)
        .single();

      if (error || !data) {
        return { success: false, error: 'Usuário ou PIN incorretos.' };
      }

      const userData = { id: data.id, nome: data.nome, role: data.role };
      setUser(userData);
      localStorage.setItem('@AtendimentoTorres:user', JSON.stringify(userData));
      
      return { success: true };
    } catch (error) {
      console.error('Erro na autenticação:', error);
      return { success: false, error: 'Erro ao conectar com o banco de dados.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('@AtendimentoTorres:user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};