import { forwardRef, useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

export const Input = forwardRef(({
  label,
  id,
  type = 'text',
  error,
  placeholder,
  copyValue,
  hint,
  ...props
}, ref) => {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return undefined;
    const timeout = setTimeout(() => setCopiado(false), 1500);
    return () => clearTimeout(timeout);
  }, [copiado]);

  const podeCopiar = !!copyValue;

  const handleCopy = async () => {
    if (!podeCopiar) return;
    try {
      await navigator.clipboard.writeText(copyValue);
    } catch {
      const area = document.createElement('textarea');
      area.value = copyValue;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    setCopiado(true);
  };

  return (
    <div className="input-wrapper">
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={ref}
          id={id}
          type={type}
          placeholder={placeholder}
          className={`input-field ${error ? 'error' : ''}`}
          style={{ width: '100%', paddingRight: '44px' }}
          {...props}
        />
        <button
          type="button"
          onClick={handleCopy}
          disabled={!podeCopiar}
          title={copiado ? 'Copiado!' : podeCopiar ? 'Copiar' : 'Preencha o campo para copiar'}
          aria-label={copiado ? 'Copiado!' : 'Copiar campo'}
          style={{
            position: 'absolute',
            right: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: copiado ? '#166534' : 'var(--color-text-muted)',
            cursor: podeCopiar ? 'pointer' : 'not-allowed',
            opacity: podeCopiar ? 1 : 0.35
          }}
        >
          {copiado ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      {hint && !error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{hint}</span>
      )}
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';
