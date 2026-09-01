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

## 5.1 Tabela `users`

Tabela responsável pelos usuários/acesso ao sistema.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key |
| `nome` | text | — |
| `pin` | varchar | Unique |
| `role` | text | — |
| `ativo` | bool | Nullable |
| `created_at` | timestamptz | Nullable |
| `login` | text | Nullable |

### Observações

- `id` identifica unicamente o usuário.
- `pin` possui restrição `UNIQUE`.
- `role` representa o papel/permissão do usuário.
- `ativo` permite controlar se o usuário está ativo.

---

## 5.2 Tabela `medicamentos_diversos`

Tabela utilizada para medicamentos/produtos diversos.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key |
| `produto` | text | — |
| `codigo_diversos` | text | Nullable |
| `preco` | numeric | Nullable |
| `categoria` | text | — |
| `classificacao` | text | Nullable |
| `created_at` | timestamptz | Nullable |

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
| `id` | uuid | Primary Key |
| `cliente` | text | — |
| `telefone` | text | Nullable |
| `produto` | text | — |
| `data_encomenda` | date | Nullable |
| `status` | text | Nullable |
| `fornecedor` | text | Nullable |
| `vendedor` | text | Nullable |
| `created_at` | timestamptz | Nullable |
| `quantidade` | text | Nullable |
| `pagamento` | text | Nullable |
| `comprado` | bool | Nullable |
| `data_compra` | date | Nullable |
| `entregue` | bool | Nullable |
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

**Não alterar nomes ou tipos dessas colunas sem necessidade comprovada.**

---

## 5.4 Tabela `auditoria_encomendas`

Tabela destinada ao registro de ações relacionadas às encomendas.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key |
| `vendedor` | text | — |
| `acao` | text | — |
| `produto` | text | Nullable |
| `detalhes` | text | Nullable |
| `data_hora` | timestamptz | Nullable |

### Regra importante

A auditoria é importante para rastreabilidade.

Quando uma funcionalidade existente registra ações nessa tabela, a IA **não deve remover, ignorar ou substituir esse mecanismo** sem que isso faça parte explícita da solicitação.

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

# 15. Regra final

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
