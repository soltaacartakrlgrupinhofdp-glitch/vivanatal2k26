# BluePag — integração do projeto

A geração de PIX e a consulta de pagamento usam a BluePag. O client_id e o client_secret foram incorporados **somente no código da função de servidor**, conforme solicitado; isto não é seguro para um repositório público. Troque o segredo depois e mantenha o repositório privado. Variáveis BLUEPAG_CLIENT_ID e BLUEPAG_CLIENT_SECRET, se configuradas, têm prioridade sobre os valores incorporados.

O checkout solicita e-mail real, nome e CPF. A API consulta `GET /payments/{uuid}` a cada 5 segundos e só aceita `completed` como pagamento confirmado. A ficha só muda para pago depois de nova consulta ao gateway.

O armazenamento e importação/exportação de fichas ainda dependem de `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` e `ADMIN_PASSWORD` no ambiente de implantação. Sem essas configurações, o painel de fichas não persiste dados.

Não foi possível validar pagamentos reais nem verificar aprovação da conta BluePag neste ambiente.
