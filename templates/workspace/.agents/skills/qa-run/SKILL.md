---
name: qa-run
description: >-
  Reexecuta cases de QA já existentes na pasta cases/ (um, vários ou todos) como teste de regressão.
  Use quando o usuário passar /qa-run com o nome de um case, um módulo ou "all".
---

# Reexecução de cases

Argumento: nome de um case (com ou sem `.md`), um prefixo/módulo (ex.: `order`) ou `all`.

## Passos

1. Leia `QA.md` e `CONTEXT.md` na raiz desta pasta: ambiente, credenciais, regras e formato do resultado valem
   integralmente.
2. Selecione os cases em `cases/` que correspondem ao argumento (ignore `_TEMPLATE.md`). Se nenhum corresponder,
   liste os cases disponíveis e pergunte qual executar.
3. Verifique se o ambiente está de pé. Se não estiver, gere relatório **BLOQUEADO** e pare.
4. Execute cada case exatamente como está escrito, no modo indicado nele (`browser` com as ferramentas do MCP
   `{{MCP_NAME}}`, ou `api`), com o perfil indicado. Não reescreva passos durante a execução; se um passo estiver
   desatualizado (a tela mudou, mas a funcionalidade funciona), marque como **OBSERVAÇÃO** e proponha a correção do
   case no relatório.
5. Garanta as pré-condições de cada case (crie os dados necessários, se faltarem).
6. Atualize o histórico de cada case, gere o relatório em `reports/` e responda no chat com o veredito, a tabela de
   cases e os campos obrigatórios de cada FAIL.
