# Agente de QA

Agente de testes sobre o **Antigravity CLI** (`agy`). Ele testa a aplicação pelo navegador ou pela API, cria
*cases* reutilizáveis e entrega relatórios de **PASS / FAIL** com evidências. Funciona em Windows, macOS e Linux e
não é amarrado a um projeto: nome, ambientes, perfis e contexto são definidos no setup.

## Requisitos

- [Node.js](https://nodejs.org) 18 ou mais novo (LTS recomendado), com `npx`
- Pelo menos uma IA instalada e autenticada (o menu mostra só as que encontrar):

  | IA | Comando | Modelos oferecidos | Raciocínio |
  |---|---|---|---|
  | [Antigravity CLI](https://antigravity.google) | `agy` | Gemini Flash e Gemini Pro (versão mais nova de cada, lida de `agy models`) | máximo |
  | [Codex](https://github.com/openai/codex) | `codex` | GPT-6 Luna, GPT-6 Sol, GPT-5.6 Terra (só os que existirem na conta) | medium (`--no-daemon`) |
  | [Claude Code](https://claude.com/claude-code) | `claude` | Opus 5.5, Sonnet 5.5 | medium |
- Google Chrome **ou** espaço para baixar o Chromium do Playwright

Não há `npm install`: os scripts usam só módulos nativos do Node.

## Instalação

```bash
git clone https://github.com/muriloSanches1001/qa-agent.git
cd qa-agent
```

| Sistema | Setup | Testar |
|---|---|---|
| Windows | `setup.bat` (clique duplo) | `qa.bat` |
| macOS / Linux | `./setup.sh` | `./qa.sh` |
| Qualquer um | `npm run setup` | `npm run qa` |

> macOS/Linux: se aparecer "permission denied", rode `chmod +x setup.sh qa.sh` uma vez.

### O que o setup faz

1. Detecta o sistema operacional e confere Node, `npx` e `agy`.
2. Pergunta o **projeto** (nome e descrição) e cria `context/PROJECT.md` para você preencher com o contexto de
   negócio (perfis, módulos, regras, como autenticar na API).
3. Pergunta os **perfis**: como se chamam o administrador e o usuário padrão neste projeto (ex.: "Franqueadora" e
   "Franqueado") e o que muda entre eles.
4. Pergunta os **ambientes** (quantos quiser): nome, URL do front, URL da API, observações, e o usuário/senha
   de cada perfil, com a opção de reaproveitar as credenciais do ambiente anterior.
5. Registra no `agy` o MCP **`qa-playwright`** (o navegador do agente) e, se você escolher, baixa o Chromium.
6. Gera uma pasta por ambiente em `workspaces/`.

Rodar o setup de novo permite reconfigurar (as respostas atuais viram padrão), adicionar um ambiente ou só refazer
a parte da máquina.

## Uso

Rode `qa.bat` / `./qa.sh`. O menu (setas + Enter) pergunta:

1. **IA** e **modelo** (a última escolha vem pré-selecionada)
2. **Ambiente**
3. **Modo**: Navegador (`/qa-browser`), API (`/qa-api`) ou reexecutar cases (`/qa-run`)
4. **Origem**: um arquivo da pasta `files/` ou um contexto digitado na hora (no `/qa-run`, a lista de cases)

Depois abre a IA escolhida dentro da pasta do ambiente com o comando já montado. Se a origem for um arquivo, ele é
excluído de `files/` quando o agente termina sem erro.

O navegador (Playwright MCP `qa-playwright`) fica registrado no Antigravity pelo setup; Codex e Claude Code o
recebem a cada execução (`-c mcp_servers...` e `--mcp-config`), sem mexer na configuração global deles.

> O agente roda com todas as permissões liberadas (`--dangerously-skip-permissions` no Antigravity e no Claude Code,
> `--dangerously-bypass-approvals-and-sandbox` no Codex): não pede confirmação para nada. As regras do `QA.md` mandam
> ele escrever só dentro da pasta do ambiente e não instalar nada, mas isso é instrução, não bloqueio. Use em
> máquinas e ambientes de teste.

## Estrutura

```
qa-agent/
├── setup.bat / setup.sh   → setup (chama scripts/setup.mjs)
├── qa.bat / qa.sh         → menu de testes (chama scripts/run.mjs)
├── scripts/               → lógica em Node
├── templates/             → modelos do QA.md, das skills e do contexto
├── files/                 → coloque aqui as especificações a testar          (ignorado pelo Git)
├── context/PROJECT.md     → contexto do projeto, criado pelo setup           (ignorado pelo Git)
├── qa.config.json         → projeto, ambientes e credenciais                 (ignorado pelo Git)
└── workspaces/<ambiente>/ → gerado: QA.md, CONTEXT.md, skills, cases, reports (ignorado pelo Git)
```

**Tudo o que você gera fica só na sua máquina**: configuração, credenciais, contexto, cases e relatórios estão no
`.gitignore`. O repositório traz apenas os scripts e os templates; para atualizar, basta `git pull`, sem risco
de conflito com o que você criou.

`QA.md`, `CONTEXT.md` e as skills de cada ambiente são **regerados a cada execução** a partir de `templates/`,
`qa.config.json` e `context/PROJECT.md`. Para mudar o comportamento do agente, edite os templates (vale para
todos os ambientes). `cases/` e `reports/` nunca são sobrescritos.

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| Agente diz "MCP qa-playwright não configurado" | Rode o setup → "Só configurar a máquina" e confira com `agy mcp list` |
| Navegador não abre / pede instalação | Rode o setup e escolha "Chromium do Playwright" |
| `agy` não encontrado | Instale o Antigravity CLI e reabra o terminal |
