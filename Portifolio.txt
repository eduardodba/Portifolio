Autor: Eduardo R. Babieri

Descrição: Este projeto permite o acompanhamento automatizado da sua carteira de criptomoedas via planilha no Google Sheets, 
integrando com um bot no Telegram para envio de análises diárias, mensais e de alocação. 
A ferramenta utiliza scripts em Google Apps Script e webhooks para entregar informações com base no histórico de aportes e valores de mercado.

Funcionalidades:
Registro e consolidação automática de aportes.
Armazenamento diário do histórico de ativos.
Geração automática de análises da carteira com base na performance.
Envio de mensagens via Telegram com comandos personalizados:
   /analise diária
   /analisemensal do mês anterior
   /alocacao da distribuição de ativos


Link da Planilha: https://docs.google.com/spreadsheets/d/14hXb3pmjo9cBIN3bhKOuy1Ss6cgODZ0KKq3BNan1Ays/edit?usp=sharing


1. Copie a planilha "Carteira Cripto - Modelo" para o seu Google Drive


2. Uso da planilha
   2.1 A aba ovewview é consolidada automaticamente com base nos valores cadastrados na aba Aportes
   2.2 Cadastre seus aportes e vendas na aba "Aportes" (a coluna cotacao e quantidade é preenchida automaticamente com base no valor do dolar e o preço do ativo cadastrado)
   2.3 A aba Historico é preenchida diariamente via script


3. Criacao do Bot no telegram
    3.1 Procure por BotFather
    3.2 Digite /newbot
    3.3 Defina um nome para o bot
    3.4 Defina o @ do seu bot no formato nome_bot
    3.5 Copie o Token fornecido do bot (exemplo: 7774551567:AAGa1jek-Y_eNtSeMiYv6Y4qQJoVLzTaLMM)
    3.6 Procure seu bot com o nome que foi definido e inicie ele
    3.7 Envie alguma mensagem para o seu bot para gerar seu chatID
    3.8 Digite isso no seu navegador substituindo o Token https://api.telegram.org/botSEU_TOKEN_DO_BOT/getUpdates
    3.9 Copie o valor ID que ira aparecer perto do trecho abaixo
         "from": {
          "id": 12345667890,
  

4. Configuracao dos Scripts 
   4.1 Na planilha clique em Extensoes / Apps Scripts
   4.2 No Script TelegramAnalise.gs substitua os valores TELEGRAM_TOKEN e AUTHORIZED_CHAT_ID pelos valores obtidos acima
   4.3 Salve o script
   4.4 Clique em Implementar / Nova Implantacao
   4.5 Defina um nome para o WebHook, deixe configurado para enviar como voce e qualquer pessoa pode acessar
   4.6 Autorize o acesso
   4.7 Copie o link gerado no App Web - https://script.google.com/macros/s/AKfycbzILZKL-gJ0yO5C-Pc-7oHoKqyuPwHp9FKYKW63xp86jNjj7n31BWOJUPheM-wYBBZk/exec
   4.8 Substitua os valores no link com base nos seus valores coletados - https://api.telegram.org/bot<SEU_TOKEN>/setWebhook?url=<SUA_URL_HTTPS>
      Exemplo: https://api.telegram.org/bot7774551567:AAGa1jek-Y_eNtSeMiYv6Y4qQJoVLzTaLMM/setWebhook?url=https://script.google.com/macros/s/AKfycbzILZKL-gJ0yO5C-Pc-7oHoKqyuPwHp9FKYKW63xp86jNjj7n31BWOJUPheM-wYBBZk/exec

   Retorno Esperado: {"ok":true,"result":true,"description":"Webhook was set"}

   4.9 Caso voce edit o script será necessário atualizar o Webhook
     4.9.1 Clique em Implementar / Gerenciar Implantacoes / Editar
           Em versoes, coloque Nova Versao / Atualize o nome e clique em Implantar / Concluir


5. Configurar Triggers
   5.1 Em Apps Scripts clique em Acionadores (icone do relógio)
   5.2 Clique em Adicionar Acionadores / gravarHIstorico
       Selecione a origem do evento (Baseado no tempo)
       Selecione o tipo de acionador com base no tempo (Contador de Dia)
       Selecione a hora do dia (20hrs as 21hrs) - Horario de fechamento do mercado americano

   5.2 Defina um novo Acionador para analise diaria (gerarAnaliseTelegram)
       Selecione a origem do evento (Baseado no tempo)
       Selecione o tipo de acionador com base no tempo (Contador de Dia)
       Selecione a hora do dia (20hrs as 21hrs) - Horario de fechamento do mercado americano

  5.3 Defina um novo Acionador para analise mensal (gerarAnaliseMensalTelegram)
      Selecione a origem do evento (Baseado no tempo)
       Selecione o tipo de acionador com base no tempo (Contador de Mes)
       Selecione 1 dia do mes e horario (21hrs as 22hrs)


6. Comandos do Bot
   6.1 /analise - Comando para gerar analise com base na aba Historico do dia atual em comparacao ao dia anterior (precisa ter pelo menos 2 registros na aba historico)     
   6.2 /analisemensal - Comando para gerar uma analise do Mes anterior, compara o primeiro dia do mes anterior com o ultimo (precisa ter dados do mes anterior na aba historico)
   6.3 /alocacao - Comando para gerar uma analise da distribuicao do portifolio

    
7. Adicionar novos ativos na planilha para cotacao
   7.1 Va em exibir todas as paginas da planilha / Moedas
   7.2 Cadastre novos ativos caso seja necessário
       Cripto sao exibidos através da api Cryptocompare
       Acoes sao coletados atraves da formula abaixo:
      =IMPORTXML("https://www.infomoney.com.br/cotacoes/nasdaq/acao/microstrategy-incorporated-class-a-mstr/";"/html/body/div[4]/div/div[1]/div[1]/div/div[3]/div[1]/p")
      Video que ensina a criar - https://www.youtube.com/watch?v=xAuinPQmbM8


   
