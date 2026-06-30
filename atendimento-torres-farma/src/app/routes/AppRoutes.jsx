import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../core/hooks/useAuth';

// Layouts
import MainLayout from '../../shared/components/layouts/MainLayout';
import AuthLayout from '../../shared/components/layouts/AuthLayout';

// Páginas (Features)
import Login from '../../features/auth/Login';
import Dashboard from '../../features/dashboard/Dashboard';
import DiversosSearch from '../../features/diversos/DiversosSearch';
import EncomendasBoard from '../../features/encomendas/EncomendasBoard';

// Wrapper para rotas privadas
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <MainLayout>{children}</MainLayout>;
};

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Pública (Login) */}
        <Route 
          path="/login" 
          element={
            <AuthLayout>
              <Login />
            </AuthLayout>
          } 
        />

        {/* Rotas Privadas (Protegidas) */}
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/diversos" 
          element={
            <PrivateRoute>
              <DiversosSearch />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/encomendas" 
          element={
            <PrivateRoute>
              <EncomendasBoard />
            </PrivateRoute>
          } 
        />

        {/* Rota Fallback (Página não encontrada) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};