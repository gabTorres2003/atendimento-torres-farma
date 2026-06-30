// Formata para Real brasileiro (R$ 0,00)
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Formata Data padrão Brasileiro (DD/MM/AAAA)
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  // O uso do fuso horário UTC previne que o dia volte 1 dia para trás em datas salvas sem hora
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC'
  }).format(date);
};

// Formata Telefones (XX) XXXXX-XXXX
export const formatPhone = (phone) => {
  if (!phone) return '';
  const cleaned = ('' + phone).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{2})(\d{4,5})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone; // retorna original se não der match com o padrão BR
};