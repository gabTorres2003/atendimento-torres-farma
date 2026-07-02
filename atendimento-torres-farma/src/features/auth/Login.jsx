import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/hooks/useAuth';

import { Card } from '../../shared/components/cards/Card';
import { FormInput } from '../../shared/components/forms/FormInput';
import { FormError } from '../../shared/components/forms/FormError';
import { Button } from '../../shared/components/buttons/Button';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    setAuthError('');

    try {
      // Passando os dois parâmetros para a função do AuthProvider
      const result = await login(data.usuario, data.pin);
      
      if (result.success) {
        navigate('/', { replace: true });
      } else {
        setAuthError(result.error || 'Usuário ou PIN incorretos.');
      }
    } catch (error) {
      console.error(error);
      setAuthError('Erro ao conectar com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--color-background-alt)' }}>
      <Card style={{ width: '100%', maxWidth: '420px', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/logo-torres.png" alt="Logo Torres Farma" style={{ height: '60px', marginBottom: '16px' }} />
          <h2 style={{ color: 'var(--color-primary)', fontSize: '1.75rem', fontWeight: 'bold' }}>
            Torres Farma
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Hub de Atendimento (Balcão)
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <FormError message={authError} />

          <FormInput
            label="Usuário de Acesso"
            id="usuario"
            type="text"
            placeholder="Ex: gabriel"
            autoComplete="username"
            register={register('usuario', {
              required: 'O usuário é obrigatório',
            })}
            error={errors.usuario}
          />

          <FormInput
            label="PIN de Acesso"
            id="pin"
            type="password"
            maxLength={4}
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="••••"
            autoComplete="current-password"
            register={register('pin', {
              required: 'O PIN é obrigatório',
              minLength: { value: 4, message: 'O PIN deve ter exatos 4 números' },
              maxLength: { value: 4, message: 'O PIN deve ter exatos 4 números' },
            })}
            error={errors.pin}
          />

          <div style={{ marginTop: '8px' }}>
            <Button type="submit" isLoading={isLoading} icon={LogIn}>
              Acessar Sistema
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}