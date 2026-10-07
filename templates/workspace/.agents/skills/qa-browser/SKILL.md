---
name: qa-browser
description: >-
  Testa uma funcionalidade de {{PROJECT_NAME}} pela interface, navegando no front com o navegador.
  Use quando o usuário pedir para testar algo "no navegador", "na tela" ou passar /qa-browser com um
  contexto ou um arquivo de especificação.
---

# QA pelo navegador

Argumento: um contexto em texto livre ou a referência a um arquivo com a especificação da funcionalidade.

## Passos

1. Leia `QA.md` e `CONTEXT.md` na raiz desta pasta: ambiente, credenciais, regras e formato do resultado valem
   integralmente.
2. Verifique se o ambiente está de pé (seção 1 do `QA.md`). Se não estiver, gere relatório **BLOQUEADO** e pare.
3. Entenda o pedido. Se for um arquivo, leia-o por inteiro. Se estiver ambíguo demais para definir o resultado
   esperado, pergunte antes de começar.
4. Planeje os cenários: caminho feliz, validações/erros de formulário, casos de borda e — quando houver diferença
   de permissão — os dois perfis ({{ADMIN_LABEL}} e {{USER_LABEL}}), incluindo tentar abrir pela URL o que o perfil
   não deveria ver. Mostre a lista de cenários ao usuário em uma linha cada e siga.
5. Para cada cenário, procure um case equivalente em `cases/`. Se não existir, crie a partir de
   `cases/_TEMPLATE.md` com nome em inglês e kebab-case.
6. Execute no navegador usando **somente as ferramentas do MCP `{{MCP_NAME}}`** (`browser_navigate`,
   `browser_snapshot`, `browser_click`, `browser_type`, `browser_fill_form`, `browser_take_screenshot`,
   `browser_console_messages`, `browser_network_requests` etc.):
   - as ferramentas podem não aparecer de início porque algumas IAs as carregam sob demanda: **procure-as** (busca de
     ferramentas / tool search pelo nome `browser_navigate` ou pelo MCP `{{MCP_NAME}}`) antes de concluir que não existem;
   - **não** instale pacotes, **não** escreva scripts Playwright/Selenium/Python e **não** verifique instalação pelo
     terminal; se, depois de procurar, as ferramentas `browser_*` não existirem, gere relatório **BLOQUEADO** dizendo
     "MCP {{MCP_NAME}} não configurado — rode o setup" e pare;
   - faça login com a credencial do perfil do case;
   - siga os passos do case, conferindo o resultado esperado de cada um (use `browser_snapshot` para ler a tela);
   - tire print do estado final e de qualquer erro com `browser_take_screenshot`, passando `filename` como
     `{{ENV_SLUG}}/reports/<pasta-do-relatorio>/<nn>-<descricao>.png` (o MCP salva relativo à pasta `workspaces`);
   - em caso de erro, leia `browser_console_messages` e `browser_network_requests` e registre as requisições que
     falharam;
   - ao trocar de perfil, faça logout antes de logar com o outro usuário.
7. Atualize o histórico de cada case executado.
8. Gere o relatório em `reports/` conforme `reports/_TEMPLATE.md`, com a seção "Alterações feitas no ambiente"
   listando tudo o que foi criado, editado ou excluído.
9. Responda no chat com o veredito, a tabela de cases e, para cada FAIL, os campos obrigatórios do `QA.md`.
