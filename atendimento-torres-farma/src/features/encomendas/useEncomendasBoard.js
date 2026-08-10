import { useState, useEffect } from 'react';
import { useEncomendas } from '../../core/hooks/useEncomendas';

export const useEncomendasBoard = () => {
  const { encomendas, loading, listarEncomendas, deletarEncomenda, salvarEncomenda } = useEncomendas();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [encomendaEdit, setEncomendaEdit] = useState(null);

  const [abaAtiva, setAbaAtiva] = useState('pendentes');
  const [termoBuscaHistorico, setTermoBuscaHistorico] = useState('');

  const [compraModal, setCompraModal] = useState({ isOpen: false, encomenda: null });
  const [compraData, setCompraData] = useState('');
  const [compraFornecedor, setCompraFornecedor] = useState('');

  useEffect(() => {
    listarEncomendas();
  }, [listarEncomendas]);

  const handleOpenModal = (encomenda = null) => {
    setEncomendaEdit(encomenda);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleDelete = async (id, produto) => {
    if (window.confirm(`Tem certeza que deseja excluir a encomenda de ${produto}?`)) {
      await deletarEncomenda(id, produto);
    }
  };

  const handleCheckboxChange = async (encomenda, campo, valor) => {
    if (campo === 'entregue' && valor === true) {
      const confirmacao = window.confirm(`Tem certeza que deseja confirmar a entrega de ${encomenda.produto} para o cliente ${encomenda.cliente}?\nA encomenda ficará oculta e irá para o Histórico.`);
      if (!confirmacao) return;
    }

    if (campo === 'comprado' && valor === true) {
      setCompraData(new Date().toISOString().split('T')[0]);
      setCompraFornecedor(encomenda.fornecedor || '');
      setCompraModal({ isOpen: true, encomenda });
      return; 
    }

    const payload = { ...encomenda, [campo]: valor };
    
    if (campo === 'comprado' && valor === false) {
      payload.data_compra = null;
      payload.fornecedor = null;
    }
    
    const result = await salvarEncomenda(payload, encomenda);
    if (!result.success) {
      alert('Erro ao atualizar a encomenda.');
    }
  };

  const confirmarCompra = async (e) => {
    e.preventDefault();
    if (!compraFornecedor) {
      alert('Selecione um fornecedor.');
      return;
    }
    if (!compraData) {
      alert('Informe a data da compra.');
      return;
    }

    const payload = { 
      ...compraModal.encomenda, 
      comprado: true, 
      data_compra: compraData,
      fornecedor: compraFornecedor 
    };

    const result = await salvarEncomenda(payload, compraModal.encomenda);
    if (result.success) {
      setCompraModal({ isOpen: false, encomenda: null });
    } else {
      alert('Erro ao confirmar compra.');
    }
  };

  const enviarWhatsApp = (encomenda) => {
    if (!encomenda.telefone) {
      alert('Esta encomenda não possui telefone cadastrado.');
      return;
    }

    // Limpa a string do telefone, garantindo que vá apenas os números para a URL
    const telefoneLimpo = encomenda.telefone.replace(/\D/g, '');
    let mensagem = '';

    // Verifica se o produto já foi comprado (chegou na loja) mas ainda não foi entregue
    if (encomenda.comprado && !encomenda.entregue) {
      mensagem = `Olá, ${encomenda.cliente}! Tudo bem? 😃\n\nA sua encomenda de *${encomenda.produto}* já chegou aqui na Drogaria Torres Farma!\n\nVocê gostaria que a gente entregasse na sua casa ou prefere vir buscar aqui na loja?`;
    } 
    // Mensagem padrão caso a encomenda ainda esteja pendente (não comprada)
    else if (!encomenda.comprado) {
      mensagem = `Olá, ${encomenda.cliente}! Tudo bem? 😃\n\nAqui é da Drogaria Torres Farma. Passando para avisar que a sua encomenda de *${encomenda.produto}* já foi anotada e avisaremos assim que chegar!`;
    } 
    // Mensagem de agradecimento (opcional, caso cliquem no ícone no Histórico)
    else if (encomenda.entregue) {
      mensagem = `Olá, ${encomenda.cliente}! Tudo bem? 😃\n\nAqui é da Drogaria Torres Farma. Muito obrigado por comprar com a gente! Qualquer dúvida sobre o uso do *${encomenda.produto}*, estamos à disposição.`;
    }

    // Gera o link da API do WhatsApp com o texto já formatado para URL
    const url = `https://wa.me/55${telefoneLimpo}?text=${encodeURIComponent(mensagem)}`;
    
    // Abre o WhatsApp em uma nova aba
    window.open(url, '_blank');
  };

  const formatData = (dataIso) => {
    if (!dataIso) return '-';
    const partes = dataIso.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataIso;
  };

  const getStatusInfo = (enc) => {
    if (enc.entregue) return { texto: 'Concluída', cor: { backgroundColor: '#dcfce7', color: '#166534' } };
    if (enc.comprado) return { texto: 'Pendente de Entrega', cor: { backgroundColor: '#e0f2fe', color: '#0369a1' } };
    return { texto: 'Pendente de Compra', cor: { backgroundColor: '#fef3c7', color: '#b45309' } };
  };

  const encomendasVisiveis = encomendas.filter((enc) => {
    if (abaAtiva === 'pendentes') {
      return !enc.entregue; 
    } else {
      if (!enc.entregue) return false; 
      if (!termoBuscaHistorico) return true; 

      const stringPesquisa = `
        ${enc.telefone || ''} 
        ${enc.cliente || ''} 
        ${enc.produto || ''} 
        ${formatData(enc.data_compra)} 
        ${enc.vendedor || ''} 
        ${enc.fornecedor || ''}
      `.toLowerCase();

      return stringPesquisa.includes(termoBuscaHistorico.toLowerCase());
    }
  }).sort((a, b) => {
    const dataA = new Date(a.data_encomenda || 0);
    const dataB = new Date(b.data_encomenda || 0);
    return dataB - dataA;
  });

  return {
    loading,
    abaAtiva,
    setAbaAtiva,
    termoBuscaHistorico,
    setTermoBuscaHistorico,
    encomendasVisiveis,
    isModalOpen,
    encomendaEdit,
    handleOpenModal,
    handleCloseModal,
    handleDelete,
    handleCheckboxChange,
    compraModal,
    setCompraModal,
    compraData,
    setCompraData,
    compraFornecedor,
    setCompraFornecedor,
    confirmarCompra,
    enviarWhatsApp,
    formatData,
    getStatusInfo,
    listarEncomendas
  };
};