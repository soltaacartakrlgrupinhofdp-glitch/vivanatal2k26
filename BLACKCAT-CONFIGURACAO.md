# BlackCat PIX — configuração

A credencial privada foi incluída **somente no código do backend** (`api/blackcat-client.js`), conforme solicitação do proprietário. Não está nos arquivos HTML nem JavaScript públicos.

O projeto tentará utilizar `BLACKCAT_API_KEY` da Vercel se estiver definida; caso contrário, usará a chave incorporada ao backend. A chave pública não é necessária para a autenticação da API nesta implementação.

**Atenção:** qualquer pessoa com acesso ao repositório, ao ZIP ou ao código-fonte do backend poderá ler essa chave. Recomendamos girar a credencial e migrar para variável de ambiente antes de disponibilizar o repositório a terceiros.

Não foi realizada uma transação real de teste.
