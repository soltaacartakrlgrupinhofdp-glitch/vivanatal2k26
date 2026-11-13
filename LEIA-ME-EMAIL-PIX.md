# E-mail técnico no PIX

O checkout não solicita e-mail. Quando não fornecido, o backend cria um endereço técnico aleatório sob o domínio reservado `example.com` para preencher `payer_email`. Não é uma caixa de correio e não pode receber comprovantes. A documentação BluePag exige `payer_email`, mas não garante que endereços técnicos sejam aceitos. Caso a API exija um e-mail real, será necessário coletá-lo do pagador.

A verificação de pagamento continua pelo UUID da transação em `/api/check-payment`. Esta alteração não foi testada com uma cobrança real.
