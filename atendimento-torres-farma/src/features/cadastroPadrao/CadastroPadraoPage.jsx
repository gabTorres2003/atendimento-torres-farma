import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ListChecks,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { useBairros } from '../../core/hooks/useBairros';
import { useAuth } from '../../core/hooks/useAuth';
import { AuditoriaRepository } from '../../infrastructure/supabase/repositories/AuditoriaRepository';

import { Card } from '../../shared/components/cards/Card';
import { Button } from '../../shared/components/buttons/Button';
import { Input } from '../../shared/components/inputs/Input';
import BairroAutocomplete from '../../shared/components/inputs/BairroAutocomplete';
import {
  CIDADE_CODIGO_DNA,
  CIDADE_NOME,
  calcularProgresso,
  completarTelefoneNoBlur,
  formatarTelefone,
  normalizarTelefone,
  paraMaiusculas,
  paraMaiusculasFinal
} from '../../core/utils/cadastroPadrao';

const VALORES_VAZIOS = {
  nome: '',
  sobrenome: '',
  telefone: '',
  rua: '',
  numero: '',
  bairro_id: '',
  referencia: '',
  data_nascimento: ''
};

export default function CadastroPadraoPage() {
  const { user } = useAuth();
  const { bairros, loading, listarBairros, adicionarBairro, renomearBairro, alternarAtivoBairro, excluirBairro } = useBairros();

  const [dados, setDados] = useState(VALORES_VAZIOS);
  const [erroAdmin, setErroAdmin] = useState('');
  const [edicaoId, setEdicaoId] = useState(null);
  const [edicaoNome, setEdicaoNome] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    listarBairros();
  }, [listarBairros]);

  const progresso = useMemo(() => calcularProgresso(dados), [dados]);

  const bairroNome = useMemo(
    () => bairros.find((bairro) => bairro.id === dados.bairro_id)?.nome_oficial || '',
    [bairros, dados.bairro_id]
  );

  const telefoneFinal = normalizarTelefone(dados.telefone);

  const alterar = (campo, valor) => {
    setDados((atual) => ({ ...atual, [campo]: paraMaiusculas(valor) }));
  };

  const focarCampo = (idCampo) => {
    const elemento = document.getElementById(idCampo);
    if (elemento) {
      elemento.focus();
      elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const copiaTexto = (valor) => paraMaiusculasFinal(valor);

  const limparTudo = () => {
    if (window.confirm('Limpar todos os campos preenchidos?')) {
      setDados(VALORES_VAZIOS);
    }
  };

  const registrar = (acao, detalhes) => {
    AuditoriaRepository.registrarAcesso(user?.nome || 'Balcão', acao, detalhes);
  };

  const handleAdicionar = async (evento) => {
    evento.preventDefault();
    setErroAdmin('');
    const result = await adicionarBairro(edicaoNome);
    if (result.success) {
      setEdicaoNome('');
      registrar('CADASTRO_PADRAO', `Adicionou bairro na base oficial: ${edicaoNome}`);
      await listarBairros();
    } else {
      setErroAdmin(result.error?.message || 'Erro ao adicionar bairro.');
    }
  };

  const handleSalvarEdicao = async (id) => {
    setErroAdmin('');
    const result = await renomearBairro(id, edicaoNome);
    if (result.success) {
      registrar('CADASTRO_PADRAO', `Renomeou bairro da base oficial para: ${edicaoNome}`);
      setEdicaoId(null);
      await listarBairros();
    } else {
      setErroAdmin(result.error?.message || 'Erro ao renomear bairro.');
    }
  };

  const handleAlternarAtivo = async (bairro) => {
    setErroAdmin('');
    const result = await alternarAtivoBairro(bairro.id, !bairro.ativo);
    if (result.success) {
      registrar(
        'CADASTRO_PADRAO',
        `${bairro.ativo ? 'Desativou' : 'Reativou'} bairro da base oficial: ${bairro.nome_oficial}`
      );
      await listarBairros();
    } else {
      setErroAdmin(result.error?.message || 'Erro ao alterar situação do bairro.');
    }
  };

  const handleExcluir = async (bairro) => {
    const confirmar = window.confirm(
      `Excluir definitivamente o bairro "${bairro.nome_oficial}" da base oficial?\n\nA exclusão é permitida apenas quando não existem clientes vinculados.`
    );
    if (!confirmar) return;

    setErroAdmin('');
    const result = await excluirBairro(bairro.id);
    if (result.success) {
      registrar('CADASTRO_PADRAO', `Excluiu bairro da base oficial: ${bairro.nome_oficial}`);
      await listarBairros();
    } else {
      setErroAdmin(result.error?.message || 'Erro ao excluir bairro.');
    }
  };

  const corProgresso =
    progresso.percentual === 100 ? '#16a34a' : progresso.percentual >= 50 ? '#d97706' : '#dc2626';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '980px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
            Cadastro Padrão de Clientes
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Preencha as informações, confira o progresso e use o ícone de copiar de cada campo para colar no DNA.
          </p>
        </div>
        <Button variant="secondary" onClick={limparTudo} icon={RotateCcw}>Limpar tudo</Button>
      </div>

      {/* --- PROGRESSO --- */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            flexShrink: 0
          }}>
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="30" fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle
                cx="36"
                cy="36"
                r="30"
                fill="none"
                stroke={corProgresso}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(progresso.percentual / 100) * 2 * Math.PI * 30} ${2 * Math.PI * 30}`}
                transform="rotate(-90 36 36)"
                style={{ transition: 'stroke-dasharray 0.4s ease, stroke 0.4s ease' }}
              />
            </svg>
            <span style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '0.95rem',
              color: corProgresso
            }}>
              {progresso.percentual}%
            </span>
          </div>

          <div style={{ flex: 1, minWidth: '240px' }}>
            <strong style={{ fontSize: '0.95rem' }}>
              {progresso.completos} de {progresso.total} campos preenchidos
            </strong>
            <div style={{ marginTop: '8px', height: '10px', backgroundColor: '#e5e7eb', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{
                width: `${progresso.percentual}%`,
                height: '100%',
                backgroundColor: corProgresso,
                borderRadius: '999px',
                transition: 'width 0.4s ease, background-color 0.4s ease'
              }} />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '6px' }}>
              {progresso.percentual === 100
                ? 'Cadastro completo! Todos os campos prontos para copiar.'
                : 'Clique em um campo abaixo para ir direto ao que falta.'}
            </p>
          </div>
        </div>

        {/* Chips interativos do que falta */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
          {progresso.campos.map((campo) => (
            <button
              key={campo.id}
              type="button"
              onClick={() => focarCampo(`campo_${campo.id}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: campo.preenchido ? '1px solid #bbf7d0' : '1px solid #fecaca',
                backgroundColor: campo.preenchido ? '#f0fdf4' : '#fef2f2',
                color: campo.preenchido ? '#166534' : '#991b1b'
              }}
              title={campo.obrigatorio ? 'Campo obrigatório' : 'Campo opcional'}
            >
              {campo.preenchido ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              {campo.rotulo}
              {!campo.obrigatorio && '(opcional)'}
            </button>
          ))}
        </div>
      </Card>

      {/* --- FORMULÁRIO --- */}
      <Card title="Preenchimento" icon={ListChecks}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Nome *"
              id="campo_nome"
              placeholder="Ex: MARIA"
              value={dados.nome}
              onChange={(evento) => alterar('nome', evento.target.value)}
              copyValue={copiaTexto(dados.nome)}
            />
            <Input
              label="Sobrenome *"
              id="campo_sobrenome"
              placeholder="Ex: DE SOUZA"
              value={dados.sobrenome}
              onChange={(evento) => alterar('sobrenome', evento.target.value)}
              copyValue={copiaTexto(dados.sobrenome)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Telefone / WhatsApp *"
              id="campo_telefone"
              type="text"
              inputMode="numeric"
              maxLength={13}
              placeholder="Ex: 22992052215"
              value={dados.telefone}
              onChange={(evento) => alterar('telefone', evento.target.value.replace(/\D/g, '').slice(0, 13))}
              onBlur={(evento) => {
                const completado = completarTelefoneNoBlur(evento.target.value);
                if (completado !== evento.target.value) {
                  setDados((atual) => ({ ...atual, telefone: completado }));
                }
              }}
              copyValue={telefoneFinal || copiaTexto(dados.telefone)}
              hint={
                telefoneFinal
                  ? `Copiado como: ${telefoneFinal} (${formatarTelefone(telefoneFinal)})`
                  : 'Ao sair do campo, completa automaticamente: 9 dígitos → 5522..., 11 dígitos → 55...'
              }
            />
            <Input
              label="Data de Nascimento"
              id="campo_data_nascimento"
              type="date"
              value={dados.data_nascimento}
              onChange={(evento) => setDados((atual) => ({ ...atual, data_nascimento: evento.target.value }))}
              copyValue={dados.data_nascimento}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <Input
              label="Rua *"
              id="campo_rua"
              placeholder="Ex: AVENIDA 15 DE NOVEMBRO"
              value={dados.rua}
              onChange={(evento) => alterar('rua', evento.target.value)}
              copyValue={copiaTexto(dados.rua)}
            />
            <Input
              label="Número *"
              id="campo_numero"
              placeholder="Ex: 123A"
              value={dados.numero}
              onChange={(evento) => alterar('numero', evento.target.value)}
              copyValue={copiaTexto(dados.numero)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <BairroAutocomplete
              bairros={bairros}
              value={dados.bairro_id}
              onSelect={(bairro) => setDados((atual) => ({ ...atual, bairro_id: bairro.id }))}
            />
            <Input
              label="Ponto de Referência"
              id="campo_referencia"
              placeholder="Ex: PRÓXIMO AO PARQUE"
              value={dados.referencia}
              onChange={(evento) => alterar('referencia', evento.target.value)}
              copyValue={copiaTexto(dados.referencia)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <Input
              label="Cidade (fixa pelo POP)"
              id="campo_cidade"
              value={CIDADE_NOME}
              disabled
              copyValue={CIDADE_NOME}
            />
            <Input
              label="Código DNA (fixo)"
              id="campo_codigo_dna"
              value={CIDADE_CODIGO_DNA}
              disabled
              copyValue={CIDADE_CODIGO_DNA}
            />
          </div>

          {bairroNome && (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Bairro selecionado: <strong>{bairroNome}</strong> — copie pelo ícone do campo.
            </p>
          )}

          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Texto digitado ou colado é convertido automaticamente em MAIUSCULAS. Nada é salvo aqui:
            esta bancada serve para preencher, conferir e copiar os dados para o DNA (POP 0002).
            Gênero e CPF não são coletados neste procedimento.
          </p>
        </div>
      </Card>

      {/* --- ADMINISTRAÇÃO DE BAIRROS --- */}
      {isAdmin && (
        <Card title="Administração da Base de Bairros" icon={ShieldCheck}>
          <form onSubmit={handleAdicionar} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div style={{ flex: 1, minWidth: '260px' }}>
              <Input
                label="Novo bairro (grafia oficial)"
                id="campo_novo_bairro"
                placeholder="Ex: Parque Novo Centro"
                value={edicaoNome}
                onChange={(evento) => setEdicaoNome(evento.target.value.toUpperCase())}
              />
            </div>
            <Button type="submit" icon={Plus} disabled={!edicaoNome.trim()}>Adicionar</Button>
          </form>

          {erroAdmin && (
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-error)', fontSize: '0.85rem', marginBottom: '12px' }}>
              <AlertCircle size={16} /> {erroAdmin}
            </p>
          )}

          <div className="table-wrapper" style={{ maxHeight: '360px', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Bairro</th>
                  <th>Situação</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {bairros.map((bairro) => (
                  <tr key={bairro.id} style={{ opacity: bairro.ativo ? 1 : 0.55 }}>
                    <td>
                      {edicaoId === bairro.id ? (
                        <input
                          className="input-field"
                          style={{ padding: '6px 10px', fontSize: '0.875rem', width: '100%' }}
                          value={edicaoNome}
                          onChange={(evento) => setEdicaoNome(evento.target.value.toUpperCase())}
                        />
                      ) : (
                        bairro.nome_oficial
                      )}
                    </td>
                    <td>{bairro.ativo ? 'Ativo' : 'Inativo'}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {edicaoId === bairro.id ? (
                        <>
                          <Button onClick={() => handleSalvarEdicao(bairro.id)} style={{ marginRight: '8px' }}>
                            Salvar
                          </Button>
                          <Button variant="secondary" onClick={() => setEdicaoId(null)}>Cancelar</Button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            title="Renomear bairro"
                            onClick={() => { setEdicaoId(bairro.id); setEdicaoNome(bairro.nome_oficial); }}
                            style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: 'var(--color-primary)', marginRight: '8px', display: 'inline-flex' }}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            title="Excluir bairro"
                            onClick={() => handleExcluir(bairro)}
                            style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: '#991b1b', marginRight: '8px', display: 'inline-flex' }}
                          >
                            <Trash2 size={15} />
                          </button>
                          <Button variant="secondary" onClick={() => handleAlternarAtivo(bairro)}>
                            {bairro.ativo ? 'Desativar' : 'Reativar'}
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {bairros.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      {loading ? 'Carregando...' : 'Nenhum bairro cadastrado. Execute supabase/bairros.sql no Supabase.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>
            Perfil administrativo pode criar, editar, excluir e desativar bairros. A exclusão só é
            permitida quando não existem clientes vinculados. Toda alteração é registrada na auditoria.
          </p>
        </Card>
      )}
    </div>
  );
}
