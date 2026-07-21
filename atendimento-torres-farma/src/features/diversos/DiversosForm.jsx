import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, X } from 'lucide-react';
import { DiversosRepository } from '../../infrastructure/supabase/repositories/DiversosRepository';
import { AuditoriaRepository } from '../../infrastructure/supabase/repositories/AuditoriaRepository';
import { useAuth } from '../../core/hooks/useAuth';

import { Card } from '../../shared/components/cards/Card';
import { FormInput } from '../../shared/components/forms/FormInput';
import { FormError } from '../../shared/components/forms/FormError';
import { Button } from '../../shared/components/buttons/Button';

export default function DiversosForm({ medicamento, onClose, onSaved }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  const isEditing = !!medicamento;

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      produto: '',
      categoria: 'Antibiótico',
      classificacao: 'Genérico',
      codigo_diversos: ''
    }
  });

  useEffect(() => {
    if (isEditing) {
      setValue('produto', medicamento.produto);
      setValue('categoria', medicamento.categoria);
      setValue('classificacao', medicamento.classificacao || 'Genérico');
      setValue('codigo_diversos', medicamento.codigo_diversos || '');
    } else {
      const preencherProximoCodigo = async () => {
        try {
          const proximo = await DiversosRepository.getNextCodigoLivre();
          setValue('codigo_diversos', proximo);
        } catch (error) {
          console.error('Erro ao buscar o próximo código:', error);
        }
      };
      
      preencherProximoCodigo();
    }
  }, [medicamento, isEditing, setValue]);

  const onSubmit = async (data) => {
    setFormError('');
    setLoading(true);
    
    try {
      const usuarioLogado = user?.nome || 'Balcão';
      
      const payload = {
        produto: data.produto,
        categoria: data.categoria,
        classificacao: data.classificacao,
      };

      if (data.codigo_diversos && data.codigo_diversos.trim() !== '') {
        payload.codigo_diversos = data.codigo_diversos.trim();
      }

      if (isEditing) {
        await DiversosRepository.atualizar(medicamento.id, payload);
        await AuditoriaRepository.registrarAcesso(usuarioLogado, 'EDITOU', `Diversos: ${payload.produto}`);
      } else {
        await DiversosRepository.criar(payload);
        await AuditoriaRepository.registrarAcesso(usuarioLogado, 'CRIOU', `Diversos: ${payload.produto}`);
      }
      
      if (onSaved) onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      setFormError(error.message || 'Erro ao salvar medicamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <Card style={{ width: '100%', maxWidth: '500px' }}>
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
          
          <FormInput 
            label="Código / Gaveta (Opcional)" 
            id="codigo_diversos" 
            type="number" 
            placeholder="Carregando..." 
            register={register('codigo_diversos')} 
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-main)' }}>Categoria</label>
              <select style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', outline: 'none' }} {...register('categoria')}>
                <option value="Antibiótico">Antibiótico</option>
                <option value="Controlado">Controlado</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-main)' }}>Classificação</label>
              <select style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', outline: 'none' }} {...register('classificacao')}>
                <option value="Genérico">Genérico</option>
                <option value="Ético">Ético</option>
                <option value="Similar">Similar</option>
              </select>
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            * O sistema encontra e preenche automaticamente o menor código/gaveta disponível, mas você pode alterá-lo.
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