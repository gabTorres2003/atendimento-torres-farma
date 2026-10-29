# CONTEXTO DO SISTEMA — Atendimento Torres Farma

## 1. Objetivo deste arquivo

Este arquivo fornece contexto permanente para IAs utilizadas no desenvolvimento do sistema **Atendimento Torres Farma**.

A IA deve ler este arquivo **antes de analisar ou alterar o código**. Ele define o contexto do projeto, a estrutura tecnológica conhecida, o banco de dados e as regras obrigatórias de desenvolvimento.

> **Regra principal:** preservar o funcionamento atual do sistema. Alterações devem ser pequenas, justificadas, testáveis e diretamente relacionadas à solicitação recebida.

---

## 2. Identificação do projeto

- **Sistema:** Atendimento Torres Farma
- **Repositório:** `gabTorres2003/atendimento-torres-farma`
- **GitHub:** https://github.com/gabTorres2003/atendimento-torres-farma
- **Branch principal:** `main`
- **Tipo:** sistema web interno de atendimento/balcão de drogaria
- **Frontend:** React
- **Build/dev server:** Vite
- **Banco de dados:** PostgreSQL via Supabase

O repositório atualmente possui o projeto dentro da pasta:

```text
atendimento-torres-farma/
```

A estrutura conhecida inclui:

```text
atendimento-torres-farma/
├── README.md
├── package.json
├── package-lock.json
├── vite.config.js
├── eslint.config.js
├── index.html
├── public/
└── src/
```

O `README.md` existente é apenas o README padrão do template React + Vite e, portanto, **este arquivo deve ser considerado a principal fonte de contexto funcional e de regras para a IA**.

---

## 3. Stack tecnológica

### Frontend

Tecnologias atualmente declaradas no projeto:

- React `19.2.7`
- React DOM `19.2.7`
- Vite `8.1.1`
- React Router DOM `7.18.1`
- React Hook Form `7.80.0`
- Supabase JS `2.110.0`
- Lucide React `1.22.0`
- ESLint `10.6.0`

Scripts disponíveis:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

### Banco

O sistema utiliza:

- PostgreSQL
- Supabase
- Supabase JavaScript Client

A aplicação possui acesso às tabelas por meio do cliente Supabase.

---

# 4. Contexto funcional

O sistema é utilizado no atendimento/balcão da **Drogaria Torres Farma**.

Entre as responsabilidades conhecidas do sistema estão:

- autenticação/login dos usuários;
- identificação do vendedor/atendente;
- consulta e utilização de medicamentos diversos;
- registro de encomendas de clientes;
- acompanhamento do status das encomendas;
- informações de fornecedor;
- informações de compra e entrega;
- registro de auditoria de ações relacionadas às encomendas.

A IA deve considerar que este é um **sistema operacional de uma drogaria**, portanto alterações que afetem cadastro, encomendas, preços, usuários ou registros de auditoria devem ser tratadas com cuidado.

---

# 5. Banco de dados

> Estrutura confirmada por dump do schema do projeto Supabase do Balcão.
> Em caso de divergência com o banco real, **o banco é a fonte de verdade**:
> confirme no Supabase antes de assumir que este documento está atualizado.

## 5.1 Tabela `users`

Tabela responsável pelos usuários/acesso ao sistema.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key, default `gen_random_uuid()` |
| `nome` | text | NOT NULL |
| `pin` | varchar | NOT NULL, **sem UNIQUE** |
| `role` | text | NOT NULL, default `'balconista'` |
| `ativo` | bool | Nullable, default `true` |
| `created_at` | timestamptz | Nullable, default `timezone('utc', now())` |
| `login` | text | Nullable, **sem UNIQUE** |

### Observações

- `id` identifica unicamente o usuário.
- `pin` **não** possui restrição `UNIQUE` no banco, e `login` também não.
  O login (`AuthProvider`) busca com `.ilike('login', ...).eq('pin', ...)
  .eq('ativo', true).single()`; PIN ou login duplicados fazem o `.single()`
  falhar. Não alterar essa consulta nem "corrigir" com dados duplicados.
- `role` representa o papel/permissão do usuário (default `balconista`).
  O banco **não** tem CHECK nessa coluna; os valores usados pelo código são
  `admin`, `balconista` e `caixa` (comparações variam entre exato `'admin'` e
  comparação case-insensitive). Valor divergente não é rejeitado pelo banco —
  revise com cautela.
- `ativo` permite controlar se o usuário está ativo.

---

## 5.2 Tabela `medicamentos_diversos`

Tabela utilizada para medicamentos/produtos diversos.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key, default `gen_random_uuid()` |
| `produto` | text | NOT NULL |
| `codigo_diversos` | text | Nullable |
| `preco` | numeric | Nullable |
| `categoria` | text | NOT NULL |
| `classificacao` | text | Nullable |
| `created_at` | timestamptz | Nullable, default `timezone('utc', now())` |

### Observações

- `produto` representa o nome/descrição do produto.
- `codigo_diversos` representa o código utilizado para identificação.
- `preco` representa o preço cadastrado.
- `categoria` e `classificacao` são utilizadas para organização/classificação.

---

## 5.3 Tabela `encomendas`

Tabela principal para registro e acompanhamento de encomendas.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key, default `gen_random_uuid()` |
| `cliente` | text | NOT NULL |
| `telefone` | text | Nullable |
| `produto` | text | NOT NULL |
| `data_encomenda` | date | Nullable |
| `status` | text | Nullable, default `'Pendente'` |
| `fornecedor` | text | Nullable |
| `vendedor` | text | Nullable |
| `created_at` | timestamptz | Nullable, default `timezone('utc', now())` |
| `quantidade` | text | Nullable, default `'1'` (texto, não inteiro) |
| `pagamento` | text | Nullable, default `'Receber na entrega'` |
| `comprado` | bool | Nullable, default `false` |
| `data_compra` | date | Nullable |
| `entregue` | bool | Nullable, default `false` |
| `codigo_produto` | text | Nullable |
| `data_prevista` | date | Nullable |
| `fornecedor_sugerido` | text | Nullable |

### Observações

A tabela permite acompanhar o ciclo da encomenda, incluindo:

1. cliente;
2. produto;
3. quantidade;
4. vendedor responsável;
5. fornecedor;
6. situação/status;
7. compra;
8. previsão;
9. entrega;
10. pagamento;
11. código do produto.

`quantidade` é **texto** no banco (não `integer`); converter com cuidado ao
somar/comparar. **Não alterar nomes ou tipos dessas colunas sem necessidade
comprovada.**

---

## 5.4 Tabela `auditoria_encomendas`

Tabela destinada ao registro de ações relacionadas às encomendas.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key, default `gen_random_uuid()` |
| `vendedor` | text | NOT NULL |
| `acao` | text | NOT NULL |
| `produto` | text | Nullable |
| `detalhes` | text | Nullable |
| `data_hora` | timestamptz | Nullable, default `timezone('utc', now())` |

### Regra importante

A auditoria é importante para rastreabilidade.

Quando uma funcionalidade existente registra ações nessa tabela, a IA **não deve remover, ignorar ou substituir esse mecanismo** sem que isso faça parte explícita da solicitação.

---

## 5.5 Tabela `rupturas`

Registro de faltas/rupturas informadas no atendimento.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key, default `gen_random_uuid()` |
| `nome_produto` | text | NOT NULL |
| `ean_dna` | text | Nullable |
| `canal_procura` | text | NOT NULL, default `'BALCÃO'`, CHECK (`BALCÃO`, `WHATSAPP`, `TELEFONE`, `OUTROS`) |
| `nome_cliente` | text | NOT NULL |
| `quantidade_solicitada` | integer | NOT NULL, default `1`, CHECK `> 0` |
| `telefone_cliente` | text | Nullable |
| `usuario_registro` | text | NOT NULL, default `'Balcão'` |
| `created_at` | timestamptz | NOT NULL, default `now()` |

Contém dados pessoais (`nome_cliente`, `telefone_cliente`). Não expor em
consultas públicas nem ampliar acesso sem avaliar RLS/LGPD.

---

## 5.6 Tabela `urgencias`

Registro de urgências de produto (inclusive quando o item não está no DNA).

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key, default `gen_random_uuid()` |
| `nome_produto` | text | NOT NULL |
| `ean_dna` | text | Nullable |
| `falta_dna` | bool | NOT NULL, default `false` |
| `usuario_registro` | text | Nullable |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `quantidade` | integer | NOT NULL, default `1`, CHECK `> 0` |

---

## 5.7 Tabela `feriados`

Cadastro de feriados e pontos facultativos.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key, default `gen_random_uuid()` |
| `data` | date | NOT NULL |
| `nome` | text | NOT NULL |
| `abrangencia` | text | NOT NULL, CHECK (`NACIONAL`, `ESTADUAL`, `MUNICIPAL`) |
| `natureza` | text | NOT NULL, default `'FERIADO'`, CHECK (`FERIADO`, `PONTO_FACULTATIVO`) |
| `observacao` | text | Nullable |
| `ativo` | bool | NOT NULL, default `true` |
| `created_by` | uuid | Nullable, FK → `users(id)` |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `updated_at` | timestamptz | NOT NULL, default `now()` |

---

## 5.8 Tabela `escalas_feriados`

Escala de trabalho vinculada a um feriado.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key, default `gen_random_uuid()` |
| `feriado_id` | uuid | NOT NULL, FK → `feriados(id)` |
| `status` | text | NOT NULL, default `'RASCUNHO'`, CHECK (`RASCUNHO`, `PENDENTE`, `CONFIRMADA`) |
| `horario_inicio` | time | Nullable |
| `horario_fim` | time | Nullable |
| `criada_por` | uuid | Nullable, FK → `users(id)` |
| `confirmada_por` | uuid | Nullable, FK → `users(id)` |
| `criada_em` | timestamptz | NOT NULL, default `now()` |
| `confirmada_em` | timestamptz | Nullable |
| `updated_at` | timestamptz | NOT NULL, default `now()` |

---

## 5.9 Tabela `escala_feriados_membros`

Pessoas incluídas em uma escala de feriado.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key, default `gen_random_uuid()` |
| `escala_id` | uuid | NOT NULL, FK → `escalas_feriados(id)` |
| `tipo_funcionario` | text | NOT NULL, CHECK (`BALCONISTA`, `CAIXA`, `MOTOBOY`) |
| `balconista_id` | uuid | Nullable, FK → `users(id)` |
| `situacao` | text | NOT NULL, default `'FOLGA'`, CHECK (`TRABALHA`, `FOLGA`) |
| `horario_inicio` | time | Nullable |
| `horario_fim` | time | Nullable |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `updated_at` | timestamptz | NOT NULL, default `now()` |
| `motoboy_id` | uuid | Nullable, **sem FK declarada** (motoboys ficam no projeto Supabase do Caixa) |

`tipo_funcionario = 'MOTOBOY'` usa `motoboy_id`; os demais usam
`balconista_id`. O `motoboy_id` referencia a tabela `motoboys` do **outro**
projeto Supabase (Caixa), não deste banco — ver `CaixaMotoboysRepository`.

---

## 5.10 Tabela `bairros`

Base oficial de bairros do Cadastro Padrão.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key, default `gen_random_uuid()` |
| `nome_oficial` | text | NOT NULL, UNIQUE |
| `ativo` | bool | NOT NULL, default `true` |
| `created_at` | timestamptz | NOT NULL, default `now()` |

---

## 5.11 Tabela `clientes`

Cadastro Padrão de clientes (dados pessoais e endereço).

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key, default `gen_random_uuid()` |
| `nome` | text | NOT NULL |
| `telefone` | text | NOT NULL |
| `rua` | text | NOT NULL |
| `numero` | text | NOT NULL |
| `bairro_id` | uuid | NOT NULL, FK → `bairros(id)` |
| `referencia` | text | Nullable |
| `cidade` | text | NOT NULL, default `'CAMPOS DOS GOYTACAZES'` |
| `cidade_codigo_dna` | text | NOT NULL, default `'3190'` |
| `data_nascimento` | date | Nullable |
| `usuario_registro` | text | Nullable |
| `created_at` | timestamptz | NOT NULL, default `now()` |

Contém dados pessoais (nome, telefone, endereço, data de nascimento). A cópia
para o DNA é **manual**; o Balcão não escreve no DNA. Qualquer ampliação de
acesso/consulta exige avaliação de LGPD e RLS.

---

# 6. RLS / segurança do banco

As políticas atualmente informadas são:

## `users`

Policy:

```text
Permitir leitura e escrita para controle de login
Command: ALL
Roles: public
USING: true
```

## `medicamentos_diversos`

Policy:

```text
Permitir acesso total aos medicamentos
Command: ALL
Roles: public
USING: true
```

## `encomendas`

Policy:

```text
Permitir acesso total as encomendas
Command: ALL
Roles: public
USING: true
```

## `bairros` e `clientes`

Definidas na migration `20260925120000_cadastro_padrao_clientes.sql`:

```text
acesso_livre_bairros   — ALL — USING true / WITH CHECK true
acesso_livre_clientes  — ALL — USING true / WITH CHECK true
```

Como `clientes` contém dados pessoais, esse acesso livre é um risco a ser
considerado antes de qualquer ampliação da consulta.

> As policies de `rupturas`, `urgencias`, `feriados`, `escalas_feriados` e
> `escala_feriados_membros` não estão documentadas aqui (não vieram no schema
> informado). **Confirme no Supabase antes de assumir que estão protegidas.**

### ATENÇÃO

Essas políticas representam acesso bastante permissivo.

A IA **não deve alterar as políticas RLS automaticamente** durante uma implementação funcional, a menos que a solicitação seja especificamente sobre segurança/RLS.

Se identificar um risco de segurança relacionado às políticas atuais:

1. informe o risco;
2. explique qual tabela/policy está envolvida;
3. não faça uma alteração especulativa;
4. aguarde uma solicitação explícita caso seja necessária uma mudança.

---

# 7. Regras obrigatórias para a IA

## Regra 1 — Ler o contexto antes de trabalhar

Antes de qualquer alteração:

1. leia este arquivo;
2. leia o `README.md` existente;
3. analise a estrutura do projeto;
4. localize somente os arquivos relevantes para a solicitação.

---

## Regra 2 — Não ler o projeto inteiro sem necessidade

Não faça uma leitura indiscriminada de todos os arquivos.

Use investigação direcionada:

- localizar componentes;
- localizar páginas;
- localizar hooks;
- localizar serviços;
- localizar chamadas ao Supabase;
- localizar queries;
- localizar funções relacionadas ao problema;
- localizar estilos diretamente envolvidos.

Leia arquivos completos somente quando necessário para entender o fluxo.

---

## Regra 3 — Investigar antes de alterar

Nunca altere código apenas com base em uma suposição.

Antes de modificar:

1. identifique onde a funcionalidade está implementada;
2. entenda o fluxo atual;
3. identifique dependências;
4. identifique possíveis efeitos colaterais;
5. somente então faça a alteração.

---

## Regra 4 — Corrigir a causa, não o sintoma

Se houver um erro, descubra sua causa real.

Não utilize soluções como:

- esconder erros;
- adicionar `try/catch` sem tratar a causa;
- colocar delays artificiais;
- adicionar reloads desnecessários;
- duplicar chamadas;
- ignorar erros;
- criar estados paralelos sem necessidade.

A correção deve resolver o problema na origem.

---

## Regra 5 — Não fazer refatorações não solicitadas

Não aproveite uma solicitação para:

- reorganizar todo o projeto;
- trocar bibliotecas;
- mudar arquitetura;
- migrar React;
- migrar banco;
- alterar estrutura de componentes sem necessidade;
- renomear arquivos sem necessidade;
- modificar estilos não relacionados;
- melhorar código fora do escopo.

**Escopo pequeno e controlado é prioridade.**

---

## Regra 6 — Preservar funcionalidades existentes

Uma alteração nova não pode quebrar funcionalidades existentes.

Sempre considere:

- login;
- permissões;
- cadastro;
- consulta de produtos;
- preços;
- encomendas;
- alteração de status;
- compras;
- entregas;
- auditoria;
- navegação;
- responsividade.

Se uma alteração puder afetar outra funcionalidade, investigue antes.

---

## Regra 7 — Banco de dados

Não crie, remova ou altere tabelas/colunas sem necessidade.

Antes de uma alteração no banco:

1. verifique se a coluna/tabela já existe;
2. procure referências no código;
3. verifique impacto nas consultas;
4. verifique impacto no frontend;
5. explique a alteração necessária.

Nunca invente uma coluna ou tabela porque ela "parece necessária".

---

## Regra 8 — Supabase

Ao trabalhar com Supabase:

- preserve o padrão existente de acesso;
- não crie clientes Supabase duplicados sem necessidade;
- não exponha credenciais;
- nunca coloque `service_role` no frontend;
- não altere RLS sem solicitação específica;
- trate erros retornados pelo Supabase adequadamente;
- evite chamadas duplicadas desnecessárias;
- evite consultas em loop quando uma consulta em lote puder resolver o problema.

---

## Regra 9 — Autenticação e autorização

O sistema possui usuários com:

- `id`;
- `nome`;
- `pin`;
- `role`;
- `ativo`;
- `login`.

Não altere o fluxo de autenticação ou autorização sem investigar completamente o fluxo atual.

Não substitua o sistema de autenticação por outro mecanismo sem solicitação explícita.

---

## Regra 10 — Auditoria

Quando uma operação existente possuir auditoria, preserve-a.

Se uma nova operação relevante precisar de auditoria, primeiro investigue como as ações existentes são registradas e siga o padrão atual.

Não invente um novo sistema de auditoria paralelo.

---

## Regra 11 — Interface

Ao alterar a interface:

- preserve o padrão visual existente;
- mantenha responsividade;
- não remova funcionalidades existentes;
- não altere componentes não relacionados;
- mantenha textos claros em português;
- mantenha os fluxos de uso rápidos, considerando que o sistema é utilizado durante atendimento de balcão.

---

## Regra 12 — Performance

Evite:

- consultas repetidas ao banco;
- chamadas Supabase dentro de loops quando puderem ser agrupadas;
- renders desnecessários;
- buscas duplicadas;
- listeners duplicados;
- efeitos React executados sem necessidade.

Entretanto, **não faça otimizações especulativas**. Só altere performance quando houver relação com a tarefa ou evidência concreta de problema.

---

## Regra 13 — Compatibilidade

Antes de adicionar uma dependência:

1. verifique se já existe uma solução utilizando as dependências atuais;
2. considere o impacto no bundle;
3. considere manutenção futura;
4. só instale uma nova dependência se realmente for necessária.

---

## Regra 14 — Validação obrigatória

Depois de implementar:

1. execute `npm run lint`;
2. execute `npm run build`;
3. corrija erros introduzidos pela alteração;
4. verifique se não existem imports quebrados;
5. verifique rotas afetadas;
6. revise as alterações feitas.

Se não puder executar algum comando, informe claramente.

---

## Regra 15 — Não mascarar falhas de build/lint

Não altere ESLint, Vite ou configuração do projeto apenas para fazer um erro desaparecer.

Primeiro determine por que o erro ocorreu.

---

## Regra 16 — Git

Por padrão, a IA deve:

- analisar o estado atual do Git;
- preservar alterações locais existentes;
- não apagar trabalho do desenvolvedor;
- não fazer `reset --hard`;
- não executar comandos destrutivos;
- não sobrescrever alterações sem autorização.

### Commits

**Não criar commits automaticamente**, salvo quando o usuário solicitar explicitamente.

### Push

**Não fazer `git push` automaticamente**, salvo solicitação explícita.

---

# 8. Procedimento padrão para cada solicitação

Sempre siga esta sequência:

### ETAPA 1 — Entender

Interprete exatamente o que foi solicitado.

### ETAPA 2 — Localizar

Encontre os arquivos, componentes, funções e consultas envolvidos.

### ETAPA 3 — Investigar

Entenda o funcionamento atual antes de alterar.

### ETAPA 4 — Planejar

Defina a menor alteração capaz de atender ao requisito.

### ETAPA 5 — Implementar

Faça somente as alterações necessárias.

### ETAPA 6 — Validar

Execute:

```bash
npm run lint
npm run build
```

E faça verificações adicionais quando necessário.

### ETAPA 7 — Relatar

Informe:

- o que foi alterado;
- quais arquivos foram modificados;
- por que a alteração foi necessária;
- como foi validada;
- eventuais limitações ou pontos que precisam ser testados manualmente.

---

# 9. Quando a IA deve parar e perguntar

A IA deve **PARAR e perguntar ao usuário** quando:

- houver mais de uma interpretação razoável da solicitação;
- for necessário alterar o banco de forma estrutural sem requisito claro;
- houver risco de perda de dados;
- houver risco de quebrar autenticação;
- houver necessidade de modificar RLS;
- houver necessidade de alterar arquitetura;
- houver necessidade de instalar uma dependência relevante;
- houver conflito entre o comportamento solicitado e o comportamento atual;
- não for possível determinar a regra de negócio com segurança.

Não invente regras de negócio.

---

# 10. Política contra alterações especulativas

A IA não deve fazer alterações "por garantia".

Exemplos proibidos:

```text
"Vou alterar isso também porque pode dar problema."
```

```text
"Vou refatorar esse componente enquanto estou aqui."
```

```text
"Vou mudar a estrutura do banco para ficar melhor."
```

```text
"Vou atualizar todas as dependências."
```

Essas ações somente devem ocorrer quando forem necessárias para a solicitação e devidamente justificadas.

---

# 11. Princípio de menor mudança possível

Quando duas soluções resolverem o problema:

> escolha a solução que modifica menos código e apresenta menor risco de efeitos colaterais.

Prioridades:

1. preservar comportamento existente;
2. resolver o requisito;
3. manter simplicidade;
4. reduzir impacto;
5. facilitar manutenção.

---

# 12. Segurança

Nunca:

- exponha credenciais;
- copie chaves privadas para arquivos públicos;
- coloque secrets no frontend;
- registre PINs ou credenciais em logs desnecessários;
- remova controles de autorização para facilitar testes;
- altere RLS sem solicitação;
- envie dados sensíveis para serviços externos sem autorização.

Se encontrar uma credencial exposta no projeto, informe imediatamente e **não a reproduza na resposta**.

---

# 13. Princípios de desenvolvimento do projeto

Este sistema é utilizado em um ambiente real de drogaria.

Portanto:

- confiabilidade é mais importante que quantidade de mudanças;
- simplicidade é preferível a complexidade;
- estabilidade é preferível a refatorações;
- alterações de banco devem ser cautelosas;
- fluxos de atendimento devem ser rápidos;
- dados de encomendas devem ser preservados;
- auditoria deve ser preservada;
- mudanças devem ser facilmente reversíveis.

---

# 14. Formato esperado da resposta da IA

Ao terminar uma tarefa, responda de forma objetiva:

## Alterações realizadas

- `arquivo`: descrição da alteração
- `arquivo`: descrição da alteração

## Causa / solução

Explique brevemente o problema encontrado e como foi solucionado.

## Validação

```text
npm run lint: OK/ERRO
npm run build: OK/ERRO
```

## Testes manuais recomendados

Liste apenas os testes realmente necessários.

## Observações

Informe riscos, limitações ou decisões importantes.

---

# 15. Integração de consulta ao DNA (via Cotação)

O módulo **Faltas e Rupturas** permite consultar um produto no DNA pelo
código interno ou EAN. A consulta é somente leitura e passa por:

```text
Navegador → Edge Function `consulta-dna` (Supabase do Balcão)
          → backend do Cotação (`GET /api/integracao-balcao/produtos`)
          → DNA / Firebird (`PRODUTOS`)
```

Regras desta integração:

- o navegador nunca acessa o Firebird e nunca recebe credenciais do
  Cotação/DNA;
- as credenciais ficam nos secrets da Edge Function
  (`COTACAO_API_URL`, `COTACAO_INTEGRACAO_USUARIO`, `COTACAO_INTEGRACAO_PIN`);
- a resposta traz apenas código, EAN, descrição, situação e origem (`DNA`);
  não traz preço, custo, estoque nem dados pessoais;
- a consulta é manual, tem cache curto em memória e nunca sobrescreve
  campos preenchidos sem ação explícita do atendente;
- nenhuma tabela, coluna, policy ou migration foi criada no Supabase do
  Balcão para essa integração.

Arquivos principais:

```text
supabase/functions/consulta-dna/index.ts
src/infrastructure/integrations/dna/DnaProdutosRepository.js
src/shared/components/inputs/ConsultaProdutoDna.jsx
src/shared/components/inputs/ConsultaProdutoDna.css
src/features/rupturas/FaltasRupturasPage.jsx
src/features/rupturas/FaltasRupturasPage.css
```

A interface da consulta é compartilhada entre **Rupturas** e **Urgências**:

- um único campo alterna entre **Código / EAN**, **Nome** e
  **Princípio ativo**, mantendo `Enter`, botão de busca e as mesmas consultas;
- o produto só é aplicado ao formulário pelo botão **Selecionar** de cada
  resultado (sem clique acidental na linha);
- o componente é o mesmo nas duas abas; `contexto="ruptura"` ou
  `contexto="urgencia"` muda apenas acento (azul/âmbar), rótulos e textos de
  orientação;
- cada instância usa IDs próprios (`useId`), pois as duas buscas convivem na
  mesma página;
- não houve mudança de contrato, validação, permissão ou gravação.

Detalhes, contrato do endpoint, pendências e limitações:
`INTEGRACAO_DNA_COTACAO.md` (neste repositório) e
`Cotacao-Drogaria/INTEGRACAO_BALCAO_DNA.md`.

**Consulta de clientes do DNA não está implementada**: não existe tabela ou
consulta de clientes do **DNA** confirmada nos repositórios. Não criar SQL por
suposição. O que existe e está confirmado é o Cadastro Padrão **local** no
Supabase do Balcão (`bairros` e `clientes` — seções 5.10 e 5.11), com cópia
manual para o DNA; esse fluxo permanece inalterado.

---

# 16. Regra final

> **Não altere o que não foi solicitado.**
>
> **Não suponha regras de negócio.**
>
> **Não faça refatorações por iniciativa própria.**
>
> **Investigue antes de modificar.**
>
> **Corrija a causa, não o sintoma.**
>
> **Preserve o funcionamento existente.**
>
> **Valide lint e build após as alterações.**
>
> **Se houver ambiguidade relevante, pare e pergunte.**

Este arquivo deve ser tratado como um **contrato de desenvolvimento** para qualquer IA utilizada neste projeto.
