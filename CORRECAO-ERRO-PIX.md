# Correção do erro [object Object]

- As duas chamadas de geração PIX agora exibem mensagens de erro legíveis, inclusive para respostas HTTP 400/401/403/422/500.
- A função de servidor mostra o motivo retornado pela BluePag sem expor credenciais.
- O gateway utilizado permanece exclusivamente BluePag.
- A confirmação de pagamento continua consultando /api/check-payment e reconhece apenas status completed.

**Atenção:** a correção não prova que uma cobrança real será aceita. Se aparecer HTTP 401/403, confirme credenciais, aprovação e permissões no painel BluePag. Se aparecer HTTP 400/422, revise os campos da cobrança.
