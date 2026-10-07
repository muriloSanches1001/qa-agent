---
name: qa-api
description: >-
  Testa uma funcionalidade de {{PROJECT_NAME}} chamando direto os endpoints da API.
  Use quando o usuário pedir para testar "a API", "o endpoint", "o back" ou passar /qa-api com um contexto
  ou um arquivo de especificação.
---

# QA pela API

Argumento: um contexto em texto livre ou a referência a um arquivo com a especificação da funcionalidade.

## Passos

1. Leia `QA.md` e `CONTEXT.md` na raiz desta pasta: ambiente, credenciais, regras e formato do resultado valem
   integralmente.
2. Verifique se a API responde (seção 1 do `QA.md`). Se não responder, gere relatório **BLOQUEADO** e pare.
3. Descubra os endpoints envolvidos:
   - pela documentação indicada em `CONTEXT.md` (Swagger/OpenAPI), se houver;
   - ou abrindo o front com as ferramentas do MCP `{{MCP_NAME}}`, executando a ação uma vez e lendo
     `browser_network_requests` (URL, método, cabeçalhos, corpo). Use exatamente os mesmos cabeçalhos que o front envia.
4. Autentique como descrito em `CONTEXT.md` (seção "Como autenticar na API"); se não estiver descrito, descubra
   pela requisição de login do front. Faça isso para cada perfil necessário.
5. Planeje os cenários: sucesso, validação (campos obrigatórios, tipos e tamanhos inválidos), recurso inexistente
   (404), sem token (401), perfil sem permissão (403 ou dado filtrado) e acesso indevido do perfil {{USER_LABEL}}.
   Mostre a lista de cenários ao usuário em uma linha cada e siga.
6. Crie ou reaproveite os cases em `cases/` (modo `api`), com nome em inglês e kebab-case.
7. Execute as chamadas com `curl` (ou `Invoke-RestMethod` no Windows). Para cada uma, registre método, URL, corpo
   enviado, status e corpo recebido. Não grave o token em arquivo.
8. Confira também o efeito colateral: após criar/editar, faça um GET e confirme que o dado persistiu como esperado.
9. Atualize o histórico dos cases, gere o relatório em `reports/` (evidências = requisição e resposta) e responda
   no chat com o veredito e os campos obrigatórios de cada FAIL.
