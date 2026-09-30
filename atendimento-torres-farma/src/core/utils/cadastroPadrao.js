export const CIDADE_NOME = 'CAMPOS DOS GOYTACAZES';
export const CIDADE_CODIGO_DNA = '3190';

// Converte para maiusculas mantendo espacos durante a digitacao
export const paraMaiusculas = (valor = '') => String(valor || '').toUpperCase();

// Versao "pronta para copiar": maiusculas, espacos colapsados e sem pontas
export const paraMaiusculasFinal = (valor = '') =>
  String(valor || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

export const normalizarBusca = (texto = '') =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

// Aceita 9 (sem DDD), 11 (com DDD) ou 13 (55 + DDD) digitos.
// Completa o que faltar: DDD 22 e codigo do pais 55.
export const normalizarTelefone = (valor = '') => {
  const digitos = String(valor || '').replace(/\D/g, '');
  if (digitos.length === 13) {
    return digitos.startsWith('55') ? digitos : null;
  }
  if (digitos.length === 11) {
    return `55${digitos}`;
  }
  if (digitos.length === 9) {
    return `5522${digitos}`;
  }
  return null;
};

// Exibicao: +55 (22) 99205-2215
export const formatarTelefone = (valor = '') => {
  const digitos = String(valor || '').replace(/\D/g, '');
  if (digitos.length !== 13) return digitos || '';
  return `+55 (${digitos.slice(2, 4)}) ${digitos.slice(4, 9)}-${digitos.slice(9)}`;
};

export const filtrarBairros = (bairros = [], termo = '') => {
  const ativos = bairros.filter((bairro) => bairro.ativo !== false);
  const busca = normalizarBusca(termo);
  if (!busca) return ativos;
  return ativos.filter((bairro) => normalizarBusca(bairro.nome_oficial || '').includes(busca));
};

// --- Progresso de preenchimento -------------------------------------------
// Obrigatorios pesam mais; opcionais completam ate 100%.
export const CAMPOS_CADASTRO = [
  { id: 'nome', rotulo: 'Nome completo', obrigatorio: true, peso: 16 },
  { id: 'telefone', rotulo: 'Telefone', obrigatorio: true, peso: 16 },
  { id: 'rua', rotulo: 'Rua', obrigatorio: true, peso: 16 },
  { id: 'numero', rotulo: 'Número', obrigatorio: true, peso: 16 },
  { id: 'bairro_id', rotulo: 'Bairro', obrigatorio: true, peso: 16 },
  { id: 'referencia', rotulo: 'Referência', obrigatorio: false, peso: 10 },
  { id: 'data_nascimento', rotulo: 'Data de nascimento', obrigatorio: false, peso: 10 }
];

export const campoPreenchido = (campo, valor) => {
  if (campo === 'telefone') return !!normalizarTelefone(valor);
  if (campo === 'bairro_id') return !!valor;
  return String(valor || '').trim().length > 0;
};

export const calcularProgresso = (dados = {}) => {
  const campos = CAMPOS_CADASTRO.map((campo) => ({
    ...campo,
    preenchido: campoPreenchido(campo.id, dados[campo.id])
  }));

  const percentual = campos.reduce(
    (total, campo) => total + (campo.preenchido ? campo.peso : 0),
    0
  );

  return {
    percentual,
    campos,
    faltantes: campos.filter((campo) => !campo.preenchido),
    faltantesObrigatorios: campos.filter((campo) => !campo.preenchido && campo.obrigatorio),
    completos: campos.filter((campo) => campo.preenchido).length,
    total: campos.length
  };
};
