# BluePag — configuração

Na Vercel > Settings > Environment Variables, configure `BLUEPAG_CLIENT_ID`, `BLUEPAG_CLIENT_SECRET`, `ADMIN_PASSWORD`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Publique novamente. Conta BluePag deve estar aprovada.

**IMPORTANTE:** A BluePag exige e-mail real do pagador. A página atual não solicita e-mail: adicione um campo de e-mail e envie `email` no JSON de criação do PIX antes de ativar cobranças reais. Não invente e-mails.

A consulta de pagamento usa GET /payments/{uuid}. O webhook pode ser configurado separadamente no painel BluePag, mas sua verificação criptográfica depende do algoritmo exato de assinatura, não informado no PDF; não foi ativado.

O painel exporta/importa até 1000 fichas por lote, com retenção Redis de 90 dias. Importações preservam status histórico como dados migrados, mas **não** validam pagamentos em uma nova conta BluePag. O backup JSON contém dados pessoais: proteja-o e compartilhe apenas entre ambientes autorizados.

**Atenção:** o código existente usa preços e quantidades diferentes na validação de fichas; alinhe os valores no backend com os preços reais antes de produção. A rota pública de registro de fichas ainda precisa de vínculo criptográfico entre transação e dados de pagamento para impedir cadastros falsos.
