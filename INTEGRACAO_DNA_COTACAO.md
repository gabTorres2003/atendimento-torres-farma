# Integração de consulta ao DNA (via Cotação)

O Balcão passou a consultar **produtos do DNA** em modo somente leitura,
usando o backend do Cotação (que já possui conexão Firebird). Nenhuma
conexão direta do navegador com o DNA foi criada e nenhuma tabela do
Supabase do Balcão foi adicionada.

## Fluxo

```text
Faltas e Rupturas (tela)
   │  botão "Consultar no DNA"
   ▼
DnaProdutosRepository (src/infrastructure/integrations/dna)
   │  supabase.functions.invoke('consulta-dna')
   ▼
Edge Function consulta-dna (server-side, secrets)
   │  login + GET /api/integracao-balcao/produtos
   ▼
Backend Cotação → DNA/Firebird (PRODUTOS)
```

O resultado mostra a origem (`DNA`), código interno, EAN, descrição e
situação (ativo/inativo). A descrição só substitui o campo já digitado
quando o atendente clica em **"Usar descrição"** — uma falha na consulta
nunca apaga dados preenchidos.

## Onde a consulta aparece

- `src/features/rupturas/FaltasRupturasPage.jsx`
  - formulário **Registrar ruptura** (campo "EAN ou código do DNA");
  - formulário **Registrar urgência** (campo "EAN ou código DNA").

A consulta é sempre manual (não dispara a cada tecla), tem cache em memória
de 5 minutos por código e trata: código inválido, produto não encontrado,
indisponibilidade do gateway e timeout.

## Divisão de responsabilidade dos dados

| Dado | Origem |
|---|---|
| Código interno, EAN, descrição e situação do produto | DNA (somente leitura, sob demanda) |
| Registro de rupturas (inclui cliente e telefone), urgências, quantidade, usuário e auditoria | Supabase do Balcão (sem alteração) |
| Cadastro Padrão de clientes/bairros e cópia manual para o DNA | Supabase do Balcão (sem alteração) |

O DNA não substitui nenhuma tabela local. A consulta é usada apenas para
conferir/preencher a identificação do produto no momento do registro.

## Próximos pontos candidatos

- `EncomendaForm` (campos "Cód Produto" e "Produto Desejado") — mesmo
  componente, mesma consulta;
- busca por descrição, se houver índice confirmado no DNA;
- preço/estoque, após decisão de negócio e autenticação mais forte;
- clientes do DNA, somente após confirmar schema e base legal/LGPD.

## Arquivos

```text
supabase/functions/consulta-dna/index.ts
supabase/functions/consulta-dna/types.d.ts
supabase/config.toml                    # [functions.consulta-dna]
src/infrastructure/integrations/dna/DnaProdutosRepository.js
src/shared/components/inputs/ConsultaProdutoDna.jsx
src/features/rupturas/FaltasRupturasPage.jsx
```

## Configuração (sem valores secretos)

Secrets da Edge Function:

```text
COTACAO_API_URL
COTACAO_INTEGRACAO_USUARIO
COTACAO_INTEGRACAO_PIN
```

Nada disso vai para o bundle do frontend. Não existe variável `VITE_*`
nova. O contrato completo do endpoint e o diagnóstico estão em
`Cotacao-Drogaria/INTEGRACAO_BALCAO_DNA.md`.

Deploy da função:

```bash
supabase functions deploy consulta-dna --project-ref <ref-do-projeto>
```

## Validação executada

```text
npm run build  -> OK (Vite 8, 156 módulos)
npm run lint   -> falha por erros preexistentes do projeto
                  (ex.: `React` importado e não usado em vários arquivos)
```

Os arquivos novos não introduzem erros de lint. O aviso
`react-hooks/incompatible-library` para `react-hook-form.watch()` já existia
na tela e permanece como aviso.

## Limitações

- **Clientes do DNA ainda não são consultados.** Não há schema/consulta de
  clientes confirmado nos repositórios. Nada foi inventado.
- A autenticação do Balcão continua sendo a atual (tabela `users` + PIN no
  navegador). A Edge Function valida usuário ativo, mas essa identidade não
  é verificável criptograficamente; por isso a resposta não inclui dados
  pessoais, preço nem estoque. A evolução recomendada é migrar para
  Supabase Auth e validar o JWT do atendente na função.
- O backend do Cotação precisa estar acessível por HTTPS a partir do
  Supabase e em execução. Caso contrário, a tela informa que a consulta
  está indisponível e mantém os campos preenchidos.

## Teste manual

1. Abrir **Faltas e Rupturas**.
2. Informar um EAN/código DNA conhecido no campo correspondente.
3. Clicar em **Consultar no DNA**.
4. Conferir descrição/situação e clicar em **Usar descrição**.
5. Repetir com um código inexistente (mensagem de não encontrado) e com a
   função/backend desligado (mensagem de indisponibilidade, campos
   preservados).
