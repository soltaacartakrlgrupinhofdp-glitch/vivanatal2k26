INTEGRAÇÃO PAGOU.AI V2
- A rota /api/allowpay é mantida como alias por compatibilidade com o checkout; usa Pagou.ai.
- /api/check-payment consulta GET /v2/transactions/{id}.
- /api/pagou-webhook recebe notify_url e reconcilia com GET; o frontend continua consultando periodicamente.
- O admin /admin.html usa senha embutida no api/fichas.js, mas depende de UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN na Vercel. Sem Redis, fichas/admin NÃO funcionam.
- A chave Pagou foi embutida no backend conforme pedido; ROTACIONE após testar e mova para PAGOU_SECRET_KEY na Vercel.
- Não foi realizada cobrança real; a aceitação pela conta Pagou não está garantida.
- O e-mail @sorte.com pressupõe autorização de uso do domínio e aceitação da Pagou.
