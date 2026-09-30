import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { filtrarBairros } from '../../../core/utils/cadastroPadrao';

// Pesquisa na base oficial de bairros: filtra a lista existente e o usuario
// seleciona um nome ja existente (sem campo livre de variacao).
export default function BairroAutocomplete({
  bairros = [],
  value = '',
  onSelect,
  error,
  label = 'Bairro *',
  id = 'campo_bairro_id',
  disabled = false
}) {
  const [termo, setTermo] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const containerRef = useRef(null);

  const selecionado = useMemo(
    () => bairros.find((bairro) => bairro.id === value) || null,
    [bairros, value]
  );

  // termo null = campo intocado (exibe a selecao atual); string = digitacao do usuario
  const exibido = termo === null ? (selecionado?.nome_oficial || '') : termo;

  const opcoes = useMemo(
    () => filtrarBairros(bairros, termo || ''),
    [bairros, termo]
  );

  useEffect(() => {
    const clicarFora = (evento) => {
      if (containerRef.current && !containerRef.current.contains(evento.target)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', clicarFora);
    return () => document.removeEventListener('mousedown', clicarFora);
  }, []);

  useEffect(() => {
    if (!copiado) return undefined;
    const timeout = setTimeout(() => setCopiado(false), 1500);
    return () => clearTimeout(timeout);
  }, [copiado]);

  const copiarBairro = async () => {
    if (!selecionado) return;
    try {
      await navigator.clipboard.writeText(selecionado.nome_oficial);
    } catch {
      const area = document.createElement('textarea');
      area.value = selecionado.nome_oficial;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    setCopiado(true);
  };

  const selecionar = (bairro) => {
    if (onSelect) onSelect(bairro);
    setTermo(bairro.nome_oficial);
    setAberto(false);
  };

  const aoTeclar = (evento) => {
    if (!aberto) {
      if (evento.key === 'ArrowDown') setAberto(true);
      return;
    }
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setDestaque((atual) => Math.min(atual + 1, opcoes.length - 1));
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setDestaque((atual) => Math.max(atual - 1, 0));
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      if (opcoes[destaque]) selecionar(opcoes[destaque]);
    } else if (evento.key === 'Escape') {
      setAberto(false);
    }
  };

  return (
    <div className="input-wrapper" ref={containerRef} style={{ position: 'relative' }}>
      <label htmlFor={id} className="input-label">{label}</label>
      <input
        id={id}
        type="text"
        className={`input-field ${error ? 'error' : ''}`}
        style={{ textTransform: 'uppercase', paddingRight: '44px' }}
        placeholder="Pesquise o bairro..."
        autoComplete="off"
        disabled={disabled}
        value={exibido}
        onChange={(evento) => {
          setTermo(evento.target.value);
          setAberto(true);
          setDestaque(0);
        }}
        onFocus={() => setAberto(true)}
        onKeyDown={aoTeclar}
      />
      <button
        type="button"
        onClick={copiarBairro}
        disabled={!selecionado}
        title={copiado ? 'Copiado!' : selecionado ? 'Copiar' : 'Selecione um bairro para copiar'}
        aria-label={copiado ? 'Copiado!' : 'Copiar bairro'}
        style={{
          position: 'absolute',
          right: '8px',
          bottom: error ? '30px' : '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          border: 'none',
          borderRadius: '6px',
          backgroundColor: 'transparent',
          color: copiado ? '#166534' : 'var(--color-text-muted)',
          cursor: selecionado ? 'pointer' : 'not-allowed',
          opacity: selecionado ? 1 : 0.35,
          zIndex: 5
        }}
      >
        {copiado ? <Check size={16} /> : <Copy size={16} />}
      </button>
      {error && <span className="input-error-text">{error}</span>}

      {aberto && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            maxHeight: '220px',
            overflowY: 'auto',
            backgroundColor: '#fff',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
            zIndex: 30,
            listStyle: 'none',
            padding: '4px 0',
            margin: '4px 0 0 0'
          }}
        >
          {opcoes.length === 0 && (
            <li style={{ padding: '10px 14px', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              {bairros.length === 0
                ? 'Base de bairros vazia. Execute supabase/bairros.sql no Supabase.'
                : 'Nenhum bairro encontrado para esta pesquisa.'}
            </li>
          )}
          {opcoes.map((bairro, indice) => (
            <li key={bairro.id}>
              <button
                type="button"
                onMouseDown={(evento) => evento.preventDefault()}
                onClick={() => selecionar(bairro)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: indice === destaque ? '#eff6ff' : 'transparent',
                  fontWeight: bairro.id === value ? 'bold' : 'normal'
                }}
              >
                {bairro.nome_oficial}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
