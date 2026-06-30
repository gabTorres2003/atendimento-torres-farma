import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { UserPlus, Save, X, Edit, Trash2 } from 'lucide-react';
import { useUsers } from '../../core/hooks/useUsers';

import { Card } from '../../shared/components/cards/Card';
import { FormInput } from '../../shared/components/forms/FormInput';
import { FormError } from '../../shared/components/forms/FormError';
import { Button } from '../../shared/components/buttons/Button';

export const UserManagement = () => {
  const { users, loading, fetchUsers, saveUser, deleteUser } = useUsers();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: { role: 'balconista', ativo: 'true' }
  });

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onSubmit = async (data) => {
    setFormError('');
    const payload = { ...data, ativo: data.ativo === 'true', id: editingId };
    const result = await saveUser(payload);

    if (result.success) {
      cancelEdit();
    } else {
      setFormError(result.error);
    }
  };

  const handleEdit = (user) => {
    setFormError('');
    setIsEditing(true);
    setEditingId(user.id);
    
    setValue('nome', user.nome);
    setValue('login', user.login || '');
    setValue('pin', user.pin);
    setValue('role', user.role);
    setValue('ativo', user.ativo ? 'true' : 'false');
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormError('');
    reset({ role: 'balconista', ativo: 'true', nome: '', login: '', pin: '' });
  };

  const handleDelete = async (id, nome) => {
    if (window.confirm(`Tem certeza que deseja excluir o usuário ${nome}?`)) {
      await deleteUser(id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--color-primary)', fontSize: '1.5rem', fontWeight: 'bold' }}>Gestão de Equipe</h2>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} icon={UserPlus} style={{ width: 'auto' }}>Novo Usuário</Button>
        )}
      </div>

      {isEditing && (
        <Card style={{ border: '2px solid var(--color-primary)' }}>
          <h3 style={{ marginBottom: '16px', fontWeight: 'bold' }}>{editingId ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}</h3>
          
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <FormError message={formError} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <FormInput
                label="Nome Completo (Para Relatórios)"
                id="nome"
                type="text"
                placeholder="Ex: Caio Torres"
                register={register('nome', { required: 'O nome é obrigatório' })}
                error={errors.nome}
              />

              <FormInput
                label="Login de Acesso (Curto)"
                id="login"
                type="text"
                placeholder="Ex: caio"
                register={register('login', { required: 'O login é obrigatório' })}
                error={errors.login}
              />

              <FormInput
                label="PIN de Acesso (4 dígitos)"
                id="pin"
                type="password"
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="••••"
                register={register('pin', {
                  required: 'O PIN é obrigatório',
                  minLength: { value: 4, message: 'Deve ter 4 números' },
                  maxLength: { value: 4, message: 'Deve ter 4 números' },
                })}
                error={errors.pin}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-main)' }}>Nível de Acesso</label>
                <select style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', outline: 'none' }} {...register('role')}>
                  <option value="balconista">Balconista</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-main)' }}>Status do Usuário</label>
                <select style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', outline: 'none' }} {...register('ativo')}>
                  <option value="true">Ativo</option>
                  <option value="false">Inativo / Bloqueado</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <Button type="button" onClick={cancelEdit} icon={X} variant="secondary">Cancelar</Button>
              <Button type="submit" isLoading={loading} icon={Save}>Salvar Usuário</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '12px 8px' }}>Nome (Login)</th>
              <th style={{ padding: '12px 8px' }}>Acesso</th>
              <th style={{ padding: '12px 8px' }}>Status</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && users.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '16px', textAlign: 'center' }}>Carregando...</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '12px 8px' }}>
                  <div style={{ fontWeight: 'bold' }}>{u.nome}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>@{u.login || '-'}</div>
                </td>
                <td style={{ padding: '12px 8px', textTransform: 'capitalize' }}>{u.role}</td>
                <td style={{ padding: '12px 8px' }}>
                  <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: u.ativo ? '#dcfce7' : '#fee2e2', color: u.ativo ? '#166534' : '#991b1b' }}>
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                  <button onClick={() => handleEdit(u)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', marginRight: '16px' }}>
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDelete(u.id, u.nome)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};