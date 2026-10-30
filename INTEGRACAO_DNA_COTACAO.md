# Integração de consulta ao DNA (via Cotação)

O Balcão passou a consultar **produtos do DNA** em modo somente leitura,
usando o backend do Cotação (que já possui conexão Firebird). Nenhuma
conexão direta do navegador com o DNA foi criada e nenhuma tabela do
Supabase do Balcão foi adicionada.

São dois tipos de consulta, ambos sob demanda:

1. **Código** (EAN ou código interno) — fluxo original, inalterado;
2. **Descrição ou princípio ativo** — pesquisa em lista curta, limitada e
   ordenada por relevância no backend.

## Fluxo

```text
Faltas e Rupturas (tela)
   │  botão "Consultar código" / "Buscar"
   ▼
DnaProdutosRepository (src/infrastructure/integrations/dna)
   │  supabase.functions.invoke('consulta-dna')
   ▼
Edge Function consulta-dna (server-side, secrets)
   │  login + GET /api/integracao-balcao/produtos          (código)
   │        ou GET /api/integracao-balcao/produtos/pesquisa (texto)
   ▼
Backend Cotação → DNA/Firebird (PRODUTOS)
```

O resultado mostra a origem (`DNA`), código interno, EAN, descrição,
princípio ativo, apresentação, fabricante e situação (ativo/inativo). A
descrição só substitui o campo já digitado quando o atendente clica em
**"Usar descrição"** ou seleciona um item da lista — nenhum resultado é
escolhido automaticamente. Uma falha na consulta nunca apaga dados
preenchidos.

## Onde a consulta aparece

Levantamento completo dos pontos do Balcão que permitem pesquisar/selecionar
produto no DNA:

| Fluxo | Arquivo | Consulta ao DNA | Busca por nome/princípio |
|---|---|---|---|
| Registrar ruptura | `src/features/rupturas/FaltasRupturasPage.jsx` | Sim, via `ConsultaProdutoDna` | Sim |
| Registrar urgência | `src/features/rupturas/FaltasRupturasPage.jsx` | Sim, via `ConsultaProdutoDna` | Sim |

- `src/features/rupturas/FaltasRupturasPage.jsx`
  - formulário **Registrar ruptura** (bloco "Busca por código" + "Busca por
    descrição ou princípio ativo");
  - formulário **Registrar urgência** (mesmo componente).

Não há outros pontos de consulta ao DNA no Balcão:

- `EncomendaForm` ("Cód Produto" e "Produto Desejado") usa texto livre e
  **não** consulta o DNA hoje — candidato listado em "Próximos pontos";
- `DiversosForm`/`DiversosSearch` usam a tabela local do Supabase, não o DNA;
- `CadastroPadraoPage` apenas copia valores fixos para colar no DNA, sem
  consulta;
- o `Dashboard` não pesquisa produtos.

O componente `ConsultaProdutoDna` é dono do campo de código: o
`FaltasRupturasPage` registra um `input type="hidden"` no `react-hook-form`
e repassa o valor via `onCodigoChange`. Assim não existem dois campos
duplicados para o mesmo dado.

A consulta é sempre manual (não dispara a cada tecla) e aceita `Enter` no
campo de busca; `Enter` repetido é ignorado enquanto a consulta anterior está
em andamento, sem duplicar requisições. Há cache em memória de 5 minutos por
código e por `tipo:termo` (texto em minúsculas). São tratados: código/termo
inválido, produto não encontrado, lista vazia, lista truncada,
indisponibilidade do gateway e timeout.

### Interface de busca (somente Rupturas/Faltas)

A aba de **Faltas e Rupturas** ficou exclusiva de rupturas: a opção de
**Urgências foi removida desta aba** (a tabela `urgencias`, o hook
`useUrgencias` e o repositório `UrgenciasRepository` permanecem intactos e
nada foi apagado do banco).

Ao abrir a aba o atendente vê apenas duas opções:

1. **Escrever Manualmente** — formulário direto com produto, canal de
   procura, cliente, quantidade e telefone.
2. **Pesquisar no DNA** — abre o painel de consulta e, depois da seleção,
   mostra os mesmos campos do cliente para concluir o registro.

Ambas as opções levam ao mesmo formulário e à mesma gravação; o que muda é
como o produto é identificado.

O componente `ConsultaProdutoDna` continua com um único campo e três modos:

- **Código de barras / DNA:** aceita EAN ou código interno do DNA e consulta
  o produto exato, com botão de busca, `Enter` e ação "Limpar resultado".
- **Nome do produto** e **Princípio ativo:** executam a pesquisa textual.
- **Seleção explícita:** cada resultado tem um botão "Selecionar"; nada é
  aplicado ao formulário por clique acidental na linha.
- **Hierarquia do resultado:** nome em destaque; princípio ativo,
  apresentação e fabricante em blocos comparáveis; códigos DNA/EAN em chips;
  selo e aviso para produto inativo.
- **Estados desenhados:** inicial, carregando (com skeleton), sem
  resultados, erro e resultados encontrados.
- **Falha visível:** enquanto a versão publicada da Edge Function não aceitar
  o parâmetro `tipo`, a busca textual retorna erro explícito (ver
  "Causa raiz da busca por nome" abaixo) em vez de mostrar um "nenhum
  resultado" falso.
- **Acessibilidade:** rótulos associados ao campo, `aria-pressed` nos modos e
  na seleção, `role="alert"` para erros, anúncio de resultados via
  `aria-live`, foco visível e IDs únicos por instância (`useId`).
- **Sem mudança de contrato:** `DnaProdutosRepository`, Edge Function,
  validações, cache, consultas e gravações no Supabase permanecem iguais.

```text
src/shared/components/inputs/ConsultaProdutoDna.jsx
src/shared/components/inputs/ConsultaProdutoDna.css
src/features/rupturas/FaltasRupturasPage.jsx
src/features/rupturas/FaltasRupturasPage.css
```

### Causa raiz da busca por nome (investigação em 30/10/2026)

A busca por nome/descrição **não quebrou no código**: a Edge Function
`consulta-dna` publicada no projeto Supabase ainda é a versão **anterior** ao
suporte a pesquisa textual (commit `acb6417`), que ignora o parâmetro `tipo`.

Prova obtida chamando a função publicada:

```text
POST consulta-dna {termo:"7891317026554"}            -> 200 {"encontrado":true,...}   (busca por código OK)
POST consulta-dna {termo:"dipirona",tipo:"descricao"} -> 200 {"encontrado":false}      (?)
POST consulta-dna {termo:"dipirona 500",tipo:"descricao"} -> 400 "Informe apenas letras ou números (até 20 caracteres)."
```

A última resposta usa uma mensagem que **só existe na versão antiga**. Ou
seja, a função publicada trata `dipirona` como um *código*, o backend do
Cotação responde `404` e a função devolve `{"success":true,"encontrado":false}`.
O frontend, esperando `resultados`, interpretava isso como lista vazia — por
isso a tela mostrava "Nenhum produto corresponde à busca" sem erro nenhum.
A busca por EAN/código continuava funcionando porque não depende de `tipo`.

Correções aplicadas neste repositório:

- `DnaProdutosRepository.pesquisarProdutos` agora valida se a resposta traz
  `resultados`. Se não vier (versão publicada antiga), lança erro explícito
  em vez de simular lista vazia.
- A Edge Function, em modo textual, deixou de converter `404` em lista
  vazia: o backend responde `200` com lista vazia quando não encontra
  produtos, então `404` significa rota inexistente e agora vira erro `503`
  com mensagem orientando a publicar a versão com `/produtos/pesquisa`.

A correção definitiva exige publicar a função:

```bash
npx supabase functions deploy consulta-dna --project-ref uddmenewrluxyewdyfxe
```

O backend do Cotação com `/api/integracao-balcao/produtos/pesquisa` também
precisa estar publicado. Enquanto isso, a tela informa a indisponibilidade e
a busca por código/EAN segue operando.

### Listagem das rupturas cadastradas

- Os registros são agrupados por produto e **todos os clientes de cada
  produto aparecem** — a tabela `rupturas` já modela uma linha por
  solicitação (com `nome_cliente` e `telefone_cliente`), então não há
  perda de cliente ao agrupar.
- Cada linha mostra cliente, telefone (ou "sem telefone"), data/hora, canal,
  quantidade e usuário que registrou.
- O cabeçalho do grupo mostra o EAN/DNA quando algum registro possui e a
  contagem de clientes.
- Administradores podem excluir um registro específico (com confirmação
  informando o cliente).

### Busca por descrição ou princípio ativo

- O atendente escolhe **Nome** ou **Princípio ativo** no seletor de modo e
  digita de 2 a 40 caracteres.
- A pesquisa roda no DNA pelo backend do Cotação; o navegador não conhece
  a URL interna nem credenciais.
- O backend normaliza o termo (maiúsculas, sem acentos, espaços
  colapsados), limita a 20 resultados (`SELECT FIRST 21` para detectar
  truncamento) e ordena por relevância: exato → prefixo → início de
  palavra → trecho parcial → ativo antes de inativo → descrição.
- Quando existem mais itens do que o limite, a tela avisa para refinar o
  termo em vez de exibir uma lista enorme.
- Cada item mostra descrição, princípio ativo, apresentação, fabricante,
  código DNA, EAN e selo de inativo. O atendente usa o botão **Selecionar**
  para aplicar o produto ao formulário.

## Divisão de responsabilidade dos dados

| Dado | Origem |
|---|---|
| Código interno, EAN, descrição, princípio ativo, apresentação, fabricante e situação | DNA (somente leitura, sob demanda) |
| Registro de rupturas (inclui cliente e telefone), urgências, quantidade, usuário e auditoria | Supabase do Balcão (sem alteração) |
| Cadastro Padrão de clientes/bairros e cópia manual para o DNA | Supabase do Balcão (sem alteração) |

O DNA não substitui nenhuma tabela local. A consulta é usada apenas para
conferir/preencher a identificação do produto no momento do registro.

## Próximos pontos candidatos

- `EncomendaForm` (campos "Cód Produto" e "Produto Desejado") — hoje é texto
  livre e não consulta o DNA; usar o mesmo `ConsultaProdutoDna` exige decisão
  de produto (o campo aceita código digitado manualmente);
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

Deploy da função (projeto Supabase do Balcão):

```bash
npx supabase functions deploy consulta-dna --project-ref uddmenewrluxyewdyfxe
```

Secrets (executar uma vez por projeto):

```bash
npx supabase secrets set --project-ref uddmenewrluxyewdyfxe \
  COTACAO_API_URL=https://<host-do-cotacao> \
  COTACAO_INTEGRACAO_USUARIO=<usuario> \
  COTACAO_INTEGRACAO_PIN=<pin>
```

### Diagnóstico rápido de CORS

Erro no navegador do tipo *"Response to preflight request doesn't pass
access control check: It does not have HTTP ok status"* quase sempre é a
função ausente ou recusando o `OPTIONS` — não é o cabeçalho CORS do código.

```bash
curl.exe -i -X OPTIONS ^
  "https://uddmenewrluxyewdyfxe.supabase.co/functions/v1/consulta-dna" ^
  -H "Origin: https://balcaotorresfarma.netlify.app"
```

| Resposta do `OPTIONS` | Causa |
|---|---|
| `200` | Função publicada e CORS ok |
| `404` + `{"code":"NOT_FOUND","message":"Requested function was not found"}` | Função **não publicada** neste projeto (ou publicada em outro `--project-ref`). Causa exata do erro de preflight. |
| `401` | `verify_jwt` ativo no deploy; publique com o `config.toml` (`verify_jwt = false`) |
| `500` | Erro de inicialização (ex.: secret/ambiente ausente) |

Referência: `admin-feriados` no mesmo projeto responde `200` ao `OPTIONS`.

### Diagnóstico de falha na consulta (502/503)

A função autentica em `POST /auth/login` no Cotação e só então chama
`GET /api/integracao-balcao/produtos` (código) ou
`GET /api/integracao-balcao/produtos/pesquisa` (texto). O status que chega
ao navegador indica em qual etapa falhou:

| Resposta | Causa |
|---|---|
| `200` + `encontrado: true` | produto retornado pelo DNA (busca por código) |
| `200` + `encontrado: false` | código não existe no DNA |
| `200` + `resultados: [...]` | pesquisa textual executada (lista pode vir vazia) |
| `400` | código fora do padrão (somente letras/números, até 20) ou texto fora de 2–40 caracteres |
| `403` | `actor.id` ausente ou usuário inativo no Balcão |
| `502` | login ou chamada ao Cotação falhou (backend fora, 401/5xx) |
| `503` | secrets ausentes **ou** DNA/Firebird indisponível |

Os três secrets já estão configurados no projeto do Balcão. Para
reconfigurar ou rotacionar, use o comando acima: valores não entram em
arquivo versionado nem no frontend.

Teste ponta a ponta (substitua `<id-usuario-ativo-do-balcao>` por um `id`
da tabela `users` com `ativo = true`):

```bash
curl.exe -s -X POST ^
  "https://uddmenewrluxyewdyfxe.supabase.co/functions/v1/consulta-dna" ^
  -H "Content-Type: application/json" ^
  -H "Origin: https://balcaotorresfarma.netlify.app" ^
  --data "{\"termo\":\"7891317026554\",\"actor\":{\"id\":\"<id>\"}}"
```

Resultado esperado: `{"success":true,"encontrado":true,"produto":{...}}`.

Pesquisa textual:

```bash
curl.exe -s -X POST ^
  "https://uddmenewrluxyewdyfxe.supabase.co/functions/v1/consulta-dna" ^
  -H "Content-Type: application/json" ^
  -H "Origin: https://balcaotorresfarma.netlify.app" ^
  --data "{\"termo\":\"dipirona\",\"tipo\":\"descricao\",\"actor\":{\"id\":\"<id>\"}}"
```

Resultado esperado:
`{"success":true,"resultados":[...],"truncado":false}`. Termo vazio, com
1 caractere ou acima de 40 retorna `400` com mensagem.

## Validação executada

```text
npm run build  -> OK (Vite 8.1.1, 159 módulos)
npm run lint   -> falha por erros preexistentes do projeto
                  (24 erros e 1 aviso, nenhum nos arquivos alterados)
```

Os arquivos alterados não introduzem erros de lint. O único diagnóstico neles
é o aviso `react-hooks/incompatible-library` para `react-hook-form.watch()`,
que já existia na tela e permanece como aviso.

Validação visual da nova interface (30/10/2026), em navegador real com a
Edge Function simulada em service worker:

```text
30/10/2026 (aba exclusiva de Rupturas, com dois cenários de função):
  cenário A — função publicada ANTIGA (comportamento real de hoje):
    1440px  duas opções iniciais, sem menção a Urgências,
            busca por nome com erro explícito da integração,
            busca por EAN/código funcionando                -> OK
  cenário B — função ATUALIZADA (esperado após deploy):
    listagem com TODOS os clientes por produto, telefone
    ausente tratado como "sem telefone", registro antigo   -> OK
    busca por nome e por princípio ativo com resultados     -> OK
    produto inativo sinalizado, sem duplicatas              -> OK
    seleção explícita, validação de campos obrigatórios,
    cadastro salvo e listagem atualizada                    -> OK
    estados sem resultados e "Voltar"                       -> OK
    430px  opções iniciais e listagem                       -> OK
    DOM    sem IDs duplicados                               -> OK
    Console sem erros nem avisos                            -> OK
```

A resposta do DNA foi simulada por service worker local, portanto a
validação cobre a interface e o comportamento do cliente; não substitui um
teste contra o backend real após o deploy.

Chamadas reais à função publicada em 30/10/2026 (prova da causa raiz):

```text
POST consulta-dna {termo:"7891317026554"}                -> 200 produto BEDOZE
POST consulta-dna {termo:"dipirona",tipo:"descricao"}    -> 200 {"encontrado":false}
POST consulta-dna {termo:"dipirona 500",tipo:"descricao"}-> 400 "Informe apenas letras ou números (até 20 caracteres)."
GET  consulta-dna                                        -> 405 (método não permitido)
POST consulta-dna {actor:{id:"abc"}}                     -> 403 "Usuário não identificado."
```

Essa validação cobriu a interface e o comportamento do cliente; a resposta do
DNA foi simulada, portanto não substitui um teste contra o backend real.

No backend do Cotação:

```text
.\mvnw.cmd -B -ntp test
Tests run: 15, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

O SQL da pesquisa foi validado por sintaxe no Firebird 2.5.9 local
(`C:\DNA\Pharmacy\COMERCIOEXP.FDB`, tabela `PRODUTOS` vazia), conferindo
também o schema real: `FARPRINCIPIOATIVO`, `FARAPRESENTACAO`, `UNIDADE`,
`CODFABRICANTE`, `INATIVO`, `CODIGO`, `CODBARRAS`, `DESCRICAO` e
`FORNECEDORES.RAZAO`. `EMBALAGEM` não existe nessa base e não é usada.

Verificação ponta a ponta anterior (busca por código), em 28/10/2026, com
EAN real do DNA:

```text
POST /functions/v1/consulta-dna (actor ativo)   -> 200
  {"success":true,"encontrado":true,"produto":{"codigo":42752,
   "codbarras":"7891317026554",
   "descricao":"BEDOZE 5MG ML SOL C 2AMP 1ML 120991",
   "inativo":"N","origem":"DNA"}}

POST /functions/v1/consulta-dna (código inexistente) -> 200
  {"success":true,"encontrado":false}

OPTIONS /functions/v1/consulta-dna              -> 200 (CORS ok)
```

A pesquisa textual ainda **não** foi exercitada contra o DNA de produção
desta máquina: o Firebird `192.168.0.252:3050` não está acessível daqui.
A validação foi feita com testes unitários (10 casos) e sintaxe no schema
local.

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
- **Sem índice em `DESCRICAO`/`FARPRINCIPIOATIVO`.** A pesquisa textual faz
  varredura da tabela a cada ação explícita. Nenhum índice ou migração foi
  criado no DNA; monitorar o tempo de resposta em produção.
- **Acentos no cadastro.** O termo é normalizado sem acentos; se algum
  produto estiver cadastrado com acento, a busca digitada sem acento pode
  não encontrá-lo. A busca por código/EAN continua garantida.
- **Deploy pendente — causa da busca por nome parada.** A Edge Function
  `consulta-dna` publicada no Supabase ainda é a versão anterior à pesquisa
  textual: ela ignora `tipo` e responde como busca por código. Por isso a
  busca por nome/princípio ativo hoje devolve "nenhum resultado" em vez de
  lista. O frontend foi ajustado para mostrar erro explícito nesse caso, mas
  o retorno da funcionalidade depende de publicar a função:

  ```bash
  npx supabase functions deploy consulta-dna --project-ref uddmenewrluxyewdyfxe
  ```

  O backend do Cotação com `/produtos/pesquisa` também precisa estar
  publicado. A busca por código/EAN funciona independentemente disso.

## Teste manual

Com a aba **Faltas e Rupturas** aberta, a tela deve mostrar apenas duas
opções: **Escrever Manualmente** e **Pesquisar no DNA**. Não deve haver
nenhuma menção a Urgências.

Escrever Manualmente:

1. Clicar em **Escrever Manualmente**.
2. Preencher produto, canal, nome do cliente, quantidade e telefone.
3. Tentar salvar sem nome de cliente (erro de obrigatório).
4. Salvar e conferir a mensagem de sucesso e o registro na listagem.

Pesquisar no DNA:

5. Clicar em **Pesquisar no DNA**, escolher **Código de barras / DNA** e
   informar um EAN/código DNA conhecido; conferir o produto e clicar em
   **Selecionar**.
6. Repetir com código inexistente (mensagem de não encontrado).
7. Escolher **Nome**, digitar `dipirona` e pressionar `Enter`. Se a função
   publicada ainda for a antiga, a tela mostra o erro de integração
   explícito (é o esperado até o deploy); após o deploy, mostra a lista com
   selo de inativo.
8. Repetir com **Princípio ativo**, com termo sem resultado e com termo
   genérico que gere mais de 20 itens (aviso de refino).
9. Selecionar um produto, preencher os dados do cliente e salvar.

Listagem:

10. Conferir que produtos com dois ou mais clientes listam **todos** eles,
    com telefone (ou "sem telefone"), data, canal, quantidade e usuário.
11. Conferir que registros antigos sem telefone ou sem EAN aparecem sem
    quebrar o layout.
12. Com perfil administrador, excluir um registro específico e confirmar a
    remoção apenas daquele cliente.
