import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Save, X } from 'lucide-react';
import { useEncomendas } from '../../core/hooks/useEncomendas';
import { useAuth } from '../../core/hooks/useAuth';

import { Card } from '../../shared/components/cards/Card';
import { FormInput } from '../../shared/components/forms/FormInput';
import { Button } from '../../shared/components/buttons/Button';

export default function EncomendaForm({ encomenda, onClose }) {
  const { salvarEncomenda, loading } = useEncomendas();
  const { user } = useAuth(); // Pega o usuário logado para salvar como "Vendedor"
  
  const isEditing = !!encomenda;

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      status: 'Pendente'
    }
  });

  // Preenche o formulário se estiver editando
  useEffect(() => {
    if (isEditing) {
      setValue('cliente', encomenda.cliente);
      setValue('telefone', encomenda.telefone);
      setValue('produto', encomenda.produto);
      setValue('data_encomenda', encomenda.data_encomenda);
      setValue('status', encomenda.status);
      setValue('fornecedor', encomenda.fornecedor);
    } else {
      // Se for nova encomenda, define a data de hoje por padrão
      setValue('data_encomenda', new Date().toISOString().split('T')[0]);
    }
  }, [encomenda, isEditing, setValue]);

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      vendedor: isEditing ? encomenda.vendedor : user.nome,
    };

    if (isEditing) {
      payload.id = encomenda.id;
    }

    const result = await salvarEncomenda(payload);
    if (result.success) {
      onClose();
    } else {
      console.error(result.error);
      alert('Erro ao salvar encomenda. Verifique o console.');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px'
    }}>
      <Card style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
            {isEditing ? 'Editar Encomenda' : 'Nova Encomenda'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color="var(--color-text-muted)" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormInput
              label="Nome do Cliente *"
              id="cliente"
              type="text"
              register={register('cliente', { required: 'O cliente é obrigatório' })}
              error={errors.cliente}
            />
            <FormInput
              label="Telefone / WhatsApp"
              id="telefone"
              type="text"
              placeholder="(22) 99999-9999"
              register={register('telefone')}
            />
          </div>

          <FormInput
            label="Produto Desejado *"
            id="produto"
            type="text"
            register={register('produto', { required: 'O produto é obrigatório' })}
            error={errors.produto}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormInput
              label="Data da Encomenda *"
              id="data_encomenda"
              type="date"
              register={register('data_encomenda', { required: 'A data é obrigatória' })}
              error={errors.data_encomenda}
            />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-main)' }}>Status</label>
              <select
                style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', outline: 'none' }}
                {...register('status')}
              >
                <option value="Pendente">Pendente</option>
                <option value="Recebido">Recebido (no estoque)</option>
                <option value="Entregue">Entregue ao cliente</option>
              </select>
            </div>
          </div>

          <FormInput
            label="Fornecedor (Opcional)"
            id="fornecedor"
            type="text"
            placeholder="Ex: Profarma, SantaCruz, etc"
            register={register('fornecedor')}
          />

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <Button type="button" onClick={onClose} variant="secondary">
              Cancelar
            </Button>
            <Button type="submit" isLoading={loading} icon={Save}>
              Salvar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}