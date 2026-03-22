# Ponderada Semana 07 - Módulo 09

&emsp;Nesta pondera implementei uma aplicação para recebimento de telemetria de sensores industriais. A proposta foi separar o recebimento da requisição HTTP do processamento dos dados, usando RabbitMQ para fila e um worker para consumo assíncrono. Os dados processados são persistidos em PostgreSQL.

&emsp;O backend foi desenvolvido em NestJS. Essa escolha foi alinhada com o professor em sala de aula.

**Objetivo**

&emsp;Receber leituras de sensores por HTTP, registrar a entrada da mensagem, enviar o payload para uma fila, consumir essa fila em um worker separado e gravar o resultado no banco de dados.

**Arquitetura**

1. O dispositivo envia uma requisição `POST` para o backend.
2. O backend recebe os dados, gera `horaColeta` e `jobId`, registra a entrada em `job_status_logs` com status `em_fila` e publica a mensagem no RabbitMQ.
3. O worker fica escutando a fila `telemetria_sensores`.
4. Quando a mensagem chega ao worker, o status do job passa para `processando`.
5. O worker persiste a telemetria na tabela `telemetria_sensores`.
6. Se o processamento terminar, o status passa para `concluido`.
7. Se houver erro, o sistema registra a situação em `error_details` e atualiza o status do job.

**Tecnologias**

1. NestJS no backend e no worker
2. RabbitMQ para mensageria
3. PostgreSQL para persistência
4. Docker e Docker Compose para execução do ambiente
5. k6 para teste de carga

**Estrutura do projeto**

1. `src/backend` contém a API HTTP
2. `src/worker` contém o consumidor da fila
3. `src/db` contém a inicialização do banco
4. `src/rabbitmq` contém a configuração do broker
5. `src/loadtest` contém o script de teste de carga
6. `src/docker-compose.yml` orquestra os serviços

**Como executar**

1. Na raiz do projeto, execute:

```bash
docker compose -f src/docker-compose.yml up --build
```

3. Aguarde a subida dos serviços.

&emsp;Após isso, os serviços ficam disponíveis nos seguintes endereços:

1. Backend em `http://localhost:3004`
2. Documentação Swagger em `http://localhost:3004/docs`
3. RabbitMQ em `http://localhost:15672`
4. PostgreSQL em `localhost:5432`

**Credenciais do ambiente**

1. RabbitMQ

```txt
usuario: admin
senha: admin
```

2. PostgreSQL

```txt
usuario: postgres
senha: postgres
banco: pond_murilo
```

**Endpoint principal**

&emsp;Rota:

```txt
POST /telemetria-sensores
```

&emsp;Exemplo de payload:

```json
{
  "idDispositivo": 101,
  "tipoSensor": "temperatura",
  "naturezaLeitura": "analogica",
  "valorColetado": "24.7"
}
```

&emsp;Resposta esperada:

```json
{
  "mensagem": "Telemetria do sensor recebida em fila para processamento",
  "jobId": "uuid"
}
```

**Tabelas principais**

1. `job_status_logs`
&emsp;Registra o ciclo de vida do job, incluindo status, payload e detalhes de erro.

2. `telemetria_sensores`
&emsp;Armazena a telemetria já processada pelo worker.

**Fluxo de status**

1. `em_fila`
2. `processando`
3. `concluido`
4. `falhou`
5. `reprocessando`
6. `cancelado`


**Tratamento de erro**

1. Se a publicação na fila falhar, o backend atualiza o job para `falhou` e registra uma mensagem em `error_details`.
2. Se o worker receber um payload inválido e conseguir identificar o `jobId`, ele atualiza o job para `falhou` e registra o motivo em `error_details`.
3. Se o processamento falhar, o worker atualiza o job para `reprocessando` e grava a mensagem de erro em `error_details`.

**Teste de carga com k6**

&emsp;O script de carga está em:

```txt
src/loadtest/telemetria-k6.js
```

&emsp;Para executar:

```bash
k6 run src/loadtest/telemetria-k6.js
```

&emsp;O cenário atual faz um aumento gradual de usuários virtuais até uma carga mais alta, mantém essa carga por um período curto e depois reduz até zero.

&emsp;O teste verifica:
1. se a resposta do endpoint retorna status `202`
2. se o backend retorna `jobId`
3. se a taxa de erro HTTP fica abaixo do limite configurado
4. se a duração das requisições fica dentro do threshold definido no script

&emsp;Para exportar um resumo em JSON:

```bash
k6 run src/loadtest/telemetria-k6.js --summary-export=src/loadtest/resultado-k6.json
```

&emsp;O resultado exportado usado nesta análise está em:

```txt
src/loadtest/resultado-k6.json
```


**Relatório do teste executado**

1. Total de requisições HTTP: `5776`
2. Taxa média de requisições: `45.65 req/s`
3. Total de iterações: `5776`
4. Pico de usuários virtuais: `400`
5. Tempo médio de resposta: `5160.91 ms`
6. Mediana do tempo de resposta: `5469.61 ms`
7. Percentil 90 do tempo de resposta: `8681.26 ms`
8. Percentil 95 do tempo de resposta: `8699.80 ms`
9. Tempo máximo observado: `8743.54 ms`
10. Dados enviados: `1417785 bytes`
11. Dados recebidos: `2079360 bytes`
12. Check `status 202`: `5776 acertos e 0 falhas`
13. Check `retornou jobId`: `5776 acertos e 0 falhas`

**Análise do teste**

&emsp;Pelo lado funcional, o sistema se comportou de forma consistente. As `5776` requisições avaliadas retornaram `202` e todas trouxeram `jobId`. Isso mostra que, durante o teste, o backend continuou aceitando as mensagens e o fluxo de geração de identificador e envio para fila permaneceu ativo mesmo com aumento de concorrência.

&emsp;Pelo lado de desempenho, o resultado indica um gargalo claro. O tempo médio de resposta ficou em `5160.91 ms`, a mediana ficou em `5469.61 ms` e o percentil 95 chegou a `8699.80 ms`. Como o threshold definido no teste era `p(95) < 3000 ms`, o sistema não atendeu a meta de latência. Em outras palavras, o endpoint continuou funcionando, mas a resposta ficou lenta quando a carga subiu.

&emsp;Um ponto importante é que o maior custo apareceu no tempo de espera do servidor. No relatório, `http_req_waiting` ficou com média próxima de `5160 ms`, enquanto envio e recebimento da resposta ficaram muito baixos. Isso sugere que o problema principal não está na rede entre cliente e aplicação, mas sim no processamento interno antes da resposta HTTP ser devolvida.

&emsp;Relacionando esse resultado com a implementação atual, a latência provavelmente está concentrada nestas etapas:
1. o backend faz `INSERT` em `job_status_logs` antes de responder
2. o backend publica a mensagem no RabbitMQ ainda dentro do ciclo da requisição
3. backend e worker compartilham o mesmo banco, então o volume de escrita pode aumentar a disputa por conexão e I/O

&emsp;Outro ponto que chama atenção é a relação entre concorrência e throughput. O teste chegou a `400` usuários virtuais, mas a taxa média ficou em `45.65 req/s`. Isso indica que a aplicação conseguiu continuar aceitando chamadas, porém a cada aumento de pressão o tempo para concluir cada requisição cresceu bastante. Na prática, a fila ajudou a desacoplar o processamento posterior, mas o caminho de aceitação da mensagem ainda não ficou leve o suficiente para sustentar essa carga com baixa latência.

&emsp;Portanto, o resultado foi bom em confiabilidade funcional, porque o sistema não parou de responder nem perdeu o padrão esperado da API, mas foi ruim em desempenho sob estresse, porque a latência ficou muito acima da meta definida no próprio teste.

&emsp;Como melhorias técnicas, eu consideraria estes próximos passos:
1. medir CPU, memória e uso de disco dos contêineres durante o teste para identificar onde a saturação aparece primeiro
2. revisar o pool de conexões do PostgreSQL para backend e worker
3. reduzir o custo síncrono do caminho HTTP, principalmente o que acontece antes do retorno `202`
4. repetir o experimento com cenários separados de carga média e estresse, para identificar em que ponto a latência começa a crescer de forma mais forte
5. testar mais de uma configuração do worker para verificar se o aumento de consumo da fila reduz a contenção com o banco ao longo da execução


**Testes unitários**

&emsp;Para rodar os testes unitários do sistema:

```bash
cd src/backend
npm test -- --runInBand
```

&emsp;Para rodar os testes unitários do worker:

```bash
cd src/worker
npm test -- --runInBand
```

**Conclusão**

&emsp;Com esta implementação, a proposta principal da pondera foi atendida: o sistema recebe a telemetria por HTTP, registra o job, envia a mensagem para o RabbitMQ, consome de forma assíncrona no worker e persiste os dados no PostgreSQL. A separação entre backend e worker ajudou a organizar melhor o fluxo e deixou o processamento desacoplado do recebimento da requisição.

&emsp;Ao mesmo tempo, o teste de carga mostrou que funcionamento correto e bom desempenho não são exatamente a mesma coisa. Durante o experimento, a aplicação continuou respondendo com o formato esperado, mas a latência aumentou bastante quando a concorrência cresceu. Isso indica que a arquitetura escolhida resolve a parte de desacoplamento, mas ainda precisa de ajustes para responder melhor em cenários de maior pressão.

&emsp;Por fim, o projeto ficou consistente como prova de conceito e também como base para evolução. Ele já demonstra o uso de mensageria, persistência e processamento assíncrono, mas os resultados do k6 mostram que ainda existem pontos de otimização, principalmente no caminho síncrono da requisição.