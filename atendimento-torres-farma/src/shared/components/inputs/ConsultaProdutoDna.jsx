import { useState } from 'react';
import { CloudDownload, Database, X } from 'lucide-react';
import { useAuth } from '../../../core/hooks/useAuth';
import { DnaProdutosRepository } from '../../../infrastructure/integrations/dna/DnaProdutosRepository';
import { Button } from '../buttons/Button';

/**
 * Consulta pontual do produto no DNA a partir do código/EAN já digitado.
 * A consulta só acontece por ação explícita do atendente; o resultado não
 * sobrescreve campos até que ele clique em "Usar descrição".
 */
export default function ConsultaProdutoDna({ codigo, onSelecionar, desabilitado = false }) {
  const { user } = useAuth();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [produto, setProduto] = useState(null);
  const [termoConsultado, setTermoConsultado] = useState('');

  const termo = String(codigo || '').trim();

  const consultar = async () => {
    setErro('');
    setProduto(null);
    setTermoConsultado(termo);

    if (!termo) {
      setErro('Digite o EAN ou o código do DNA antes de consultar.');
      return;
    }

    setCarregando(true);
    try {
      const encontrado = await DnaProdutosRepository.buscarProduto({
        termo,
        usuarioId: user?.id,
      });

      if (!encontrado) {
        setErro(`Nenhum produto encontrado no DNA para "${termo}".`);
        return;
      }

      setProduto(encontrado);
    } catch (error) {
      setErro(error?.message || 'Não foi possível consultar o DNA agora.');
    } finally {
      setCarregando(false);
    }
  };

  const inativo = produto?.inativo === 'S';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <Button
          type="button"
          variant="secondary"
          icon={CloudDownload}
          isLoading={carregando}
          disabled={desabilitado}
          onClick={consultar}
          style={{ width: 'auto', padding: '8px 14px', fontSize: '0.85rem' }}
        >
          Consultar no DNA
        </Button>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Consulta somente leitura
        </span>
      </div>

      {erro && (
        <div style={{ fontSize: '0.8rem', color: 'var(--color-error)', lineHeight: '1.4' }}>
          {erro}
        </div>
      )}

      {produto && (
        <div
          style={{
            border: '1px solid var(--color-border)',
            borderLeft: '4px solid var(--color-primary)',
            borderRadius: '8px',
            padding: '12px',
            backgroundColor: 'var(--color-background-alt)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
            <Database size={14} />
            <span>DNA — resultado para {termoConsultado}</span>
          </div>

          <strong style={{ fontSize: '0.9rem', color: 'var(--color-text-main)', lineHeight: '1.4' }}>
            {produto.descricao}
          </strong>

          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Código DNA: {produto.codigo ?? '-'} | EAN: {produto.codbarras || '-'} | Situação:{' '}
            {inativo ? 'inativo no DNA' : 'ativo'}
          </span>

          {inativo && (
            <span style={{ fontSize: '0.8rem', color: '#b45309' }}>
              Produto inativo no DNA. Confirme antes de registrar.
            </span>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
            <Button
              type="button"
              icon={CloudDownload}
              onClick={() => onSelecionar?.(produto)}
              style={{ width: 'auto', padding: '8px 14px', fontSize: '0.85rem' }}
            >
              Usar descrição
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={X}
              onClick={() => setProduto(null)}
              style={{ width: 'auto', padding: '8px 14px', fontSize: '0.85rem' }}
            >
              Dispensar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
