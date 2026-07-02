import { createContext, useState, useEffect } from 'react';
import { supabase } from '../../infrastructure/supabase/supabaseClient';
import { AuditoriaRepository } from '../../infrastructure/supabase/repositories/AuditoriaRepository';

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

  // Recebe novamente o Usuário e o PIN
  const login = async (usuario, pin) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('login', usuario.trim()) // Busca cruzada pelo nome de login curto
        .eq('pin', pin)
        .eq('ativo', true)
        .single();

      if (error || !data) {
        return { success: false, error: 'Usuário ou PIN incorretos.' };
      }

      const userData = { id: data.id, nome: data.nome, role: data.role };
      setUser(userData);
      localStorage.setItem('@AtendimentoTorres:user', JSON.stringify(userData));
      
      // Registra o acesso na nova Auditoria
      await AuditoriaRepository.registrarAcesso(data.nome, 'LOGIN', 'Entrou no sistema.');
      
      return { success: true };
    } catch (error) {
      console.error('Erro na autenticação:', error);
      return { success: false, error: 'Erro ao conectar com o banco de dados.' };
    }
  };

  const logout = () => {
    if (user) {
      AuditoriaRepository.registrarAcesso(user.nome, 'LOGOUT', 'Saiu do sistema.');
    }
    setUser(null);
    localStorage.removeItem('@AtendimentoTorres:user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};