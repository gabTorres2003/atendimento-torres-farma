import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, X } from 'lucide-react';
import { useDiversos } from '../../core/hooks/useDiversos';

import { Card } from '../../shared/components/cards/Card';
import { FormInput } from '../../shared/components/forms/FormInput';
import { FormError } from '../../shared/components/forms/FormError';
import { Button } from '../../shared/components/buttons/Button';

export default function DiversosForm({ medicamento, onClose, onSaved }) {
  const { salvarMedicamento, loading } = useDiversos();
  const [formError, setFormError] = useState('');
  
  const isEditing = !!medicamento;

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      categoria: 'Antibiótico',
      classificacao: 'Genérico'
    }
  });

  useEffect(() => {
    if (isEditing) {
      setValue('produto', medicamento.produto);
      setValue('categoria', medicamento.categoria);
      setValue('classificacao', medicamento.classificacao || '');
      setValue('codigo_diversos', medicamento.codigo_diversos || '');
    }
  }, [medicamento, isEditing, setValue]);

  const onSubmit = async (data) => {
    setFormError('');

    const payload = {
      ...data,
      preco: null // O preço foi descontinuado
    };

    if (isEditing) {
      payload.id = medicamento.id;
    }

    const result = await salvarMedicamento(payload);
    
    if (result.success) {
      if (!isEditing) {
        alert(`Medicamento salvo com sucesso!\nO código/gaveta gerado foi: ${result.codigoGerado}`);
      }
      onSaved();
      onClose();
    } else {
      setFormError(result.error);
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
            {isEditing ? 'Editar Medicamento' : 'Novo Medicamento'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color="var(--color-text-muted)" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormError message={formError} />

          <FormInput
            label="Nome do Produto *"
            id="produto"
            type="text"
            placeholder="Ex: AMOXICILINA 500 MG"
            register={register('produto', { required: 'O nome do produto é obrigatório' })}
            error={errors.produto}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-main)' }}>Categoria</label>
              <select style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} {...register('categoria')}>
                <option value="Antibiótico">Antibiótico</option>
                <option value="Controlado">Controlado</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-main)' }}>Classificação</label>
              <select style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} {...register('classificacao')}>
                <option value="Genérico">Genérico</option>
                <option value="Ético">Ético</option>
                <option value="Similar">Similar</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            {isEditing && (
              <FormInput
                label="Código / Gaveta"
                id="codigo_diversos"
                type="text"
                readOnly
                register={register('codigo_diversos')}
              />
            )}
            {!isEditing && (
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem', padding: '8px' }}>
                * O Código / Gaveta será gerado automaticamente.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <Button type="button" onClick={onClose} variant="secondary">Cancelar</Button>
            <Button type="submit" isLoading={loading} icon={Save}>Salvar Medicamento</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}