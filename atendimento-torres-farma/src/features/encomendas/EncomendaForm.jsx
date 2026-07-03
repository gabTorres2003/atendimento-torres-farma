import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, X } from 'lucide-react';
import { useEncomendas } from '../../core/hooks/useEncomendas';
import { useAuth } from '../../core/hooks/useAuth';

import { Card } from '../../shared/components/cards/Card';
import { FormInput } from '../../shared/components/forms/FormInput';
import { FormError } from '../../shared/components/forms/FormError';
import { Button } from '../../shared/components/buttons/Button';

export default function EncomendaForm({ encomenda, onClose, onSaved }) {
  const { salvarEncomenda, loading } = useEncomendas();
  const { user } = useAuth();
  const [formError, setFormError] = useState('');
  
  const isEditing = !!encomenda;

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: { 
      status: 'Pendente de Compra',
      fornecedor: '',
      quantidade: '1',
      pagamento: 'Receber na entrega',
      comprado: false,
      entregue: false,
      data_encomenda: new Date().toISOString().split('T')[0],
      data_compra: ''
    }
  });

  useEffect(() => {
    if (isEditing) {
      setValue('cliente', encomenda.cliente);
      setValue('telefone', encomenda.telefone || '');
      setValue('produto', encomenda.produto);
      setValue('quantidade', encomenda.quantidade || '1');
      setValue('data_encomenda', encomenda.data_encomenda ? encomenda.data_encomenda.split('T')[0] : '');
      setValue('fornecedor', encomenda.fornecedor || '');
      setValue('pagamento', encomenda.pagamento || 'Receber na entrega');
      setValue('comprado', encomenda.comprado || false);
      setValue('entregue', encomenda.entregue || false);
      setValue('data_compra', encomenda.data_compra ? encomenda.data_compra.split('T')[0] : '');
    }
  }, [encomenda, isEditing, setValue]);

  const onSubmit = async (data) => {
    setFormError('');
    
    const payload = {
      ...data,
      vendedor: isEditing ? encomenda.vendedor : (user?.nome || 'Balcão'),
    };

    if (isEditing) {
      payload.id = encomenda.id;
    }

    const result = await salvarEncomenda(payload, isEditing ? encomenda : null);
    
    if (result.success) {
      if (onSaved) onSaved(); 
      onClose(); 
    } else {
      setFormError(result.error?.message || 'Erro ao salvar encomenda.');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px'
    }}>
      <Card style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
            {isEditing ? 'Editar Encomenda' : 'Nova Encomenda'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color="var(--color-text-muted)" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormError message={formError} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormInput label="Nome do Cliente *" id="cliente" type="text" placeholder="Ex: João" register={register('cliente', { required: 'O nome é obrigatório' })} error={errors.cliente} />
            <FormInput label="Telefone / WhatsApp *" id="telefone" type="text" maxLength={11} inputMode="numeric" placeholder="Ex: 22999999999" register={register('telefone', { required: 'O telefone é obrigatório', pattern: { value: /^[0-9]{11}$/, message: 'Digite o DDD e o número (exatos 11 números)' } })} error={errors.telefone} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '16px' }}>
            <FormInput label="Produto Desejado *" id="produto" type="text" placeholder="Ex: Losartana" register={register('produto', { required: 'O produto é obrigatório' })} error={errors.produto} />
            <FormInput label="Qtd *" id="quantidade" type="number" register={register('quantidade', { required: 'A quantidade é obrigatória' })} error={errors.quantidade} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormInput label="Data da Encomenda *" id="data_encomenda" type="date" register={register('data_encomenda', { required: 'A data é obrigatória' })} error={errors.data_encomenda} />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-main)' }}>Pagamento</label>
              <select style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', outline: 'none' }} {...register('pagamento')}>
                <option value="Receber na entrega">Receber na entrega</option>
                <option value="Pago">Pago</option>
                <option value="Pagamento Parcial">Pagamento Parcial</option>
              </select>
            </div>
          </div>

          {/* Oculta os dados do comprador no momento do cadastro inicial */}
          {isEditing && (
            <>
              <div style={{ display: 'flex', gap: '24px', padding: '16px', backgroundColor: 'var(--color-background-alt)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--color-primary)' }}>
                  <input type="checkbox" {...register('comprado')} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  Comprado
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', color: '#166534' }}>
                  <input type="checkbox" {...register('entregue')} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  Confirmar Entrega
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FormInput label="Data da Compra" id="data_compra" type="date" register={register('data_compra')} />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-main)' }}>Fornecedor Solicitado</label>
                  <select style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', outline: 'none' }} {...register('fornecedor')}>
                    <option value="">Selecione um fornecedor...</option>
                    <option value="Panpharma">Panpharma</option>
                    <option value="Profarma">Profarma</option>
                    <option value="SantaCruz">SantaCruz</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <Button type="button" onClick={onClose} variant="secondary">Cancelar</Button>
            <Button type="submit" isLoading={loading} icon={Save}>Salvar Encomenda</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}