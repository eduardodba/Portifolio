function gravarHistorico() {
  // Constantes com os nomes das abas e configurações
  const nomeOrigem = "Overview";
  const nomeHistorico = "Histórico";
  const nomeMoedas = "Moedas";
  const maxTentativas = 10; // Número máximo de tentativas de leitura dos dados

  // Obtém referências das abas necessárias
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const abaOrigem = planilha.getSheetByName(nomeOrigem);
  // Cria a aba de histórico se não existir
  const abaHistorico = planilha.getSheetByName(nomeHistorico) || planilha.insertSheet(nomeHistorico);
  const abaMoedas = planilha.getSheetByName(nomeMoedas);

  // Lista de células que serão lidas da aba Overview
  const celulas = [
    "D2", "E2", "F2", "B6", "E6", "A6", "D6",
    "D23", "D24", "D10", "D11", "D12", "D13", "D14",
    "D15", "D16", "D17", "D18", "D19", "D20", "D21", "D22",
    "G10", "G11", "G12", "G13", "G14", "G15", "G16", "G17", "G18", "G19", "G20", "G21", "G23", "G24"
  ];

  // Função para obter os valores das células especificadas
  function obterValores() {
    // Força atualização dos dados antes da leitura
    SpreadsheetApp.flush();
    
    // Obtém os valores de todas as células especificadas
    const ranges = abaOrigem.getRangeList(celulas);
    const valores = ranges.getRanges().map(range => range.getValue());
    
    // Adiciona a data atual no início do array
    valores.unshift(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"));
    
    // Adiciona o valor da célula B1 da aba Moedas
    const valorMoeda = abaMoedas.getRange("B1").getValue();
    valores.push(valorMoeda);
    
    return valores;
  }

  // Função para validar se todos os valores são válidos
  function validarValores(valores) {
    return valores.every(valor => {
      if (valor instanceof Error) return false; // Ignora erros do Google Sheets
      if (typeof valor === 'string' && valor.startsWith('#')) return false; // Ignora erros como texto
      return ![null, undefined, ""].includes(valor); // Ignora valores vazios
    });
  }

  // Tenta obter os valores válidos, com repetição em caso de falha
  let tentativas = 0;
  let valores;
  
  do {
    valores = obterValores();
    tentativas++;
    
    if (!validarValores(valores)) {
      if (tentativas >= maxTentativas) {
        throw new Error("Falha após " + maxTentativas + " tentativas. Verifique as células fonte.");
      }
      Utilities.sleep(5000); // Espera 5 segundos antes de tentar novamente
    }
  } while (!validarValores(valores));

  // Cria cabeçalhos na aba de histórico se estiver vazia
  if (abaHistorico.getLastRow() === 0) {
    const cabecalhos = [
      "Data", "Saldo USD", "Saldo R$", "Saldo BTC", "QTD BTC", "QTD ETH",
      "PM BTC", "PM ETH", "BTC / USD", "ETH / USD", "SOL / USD", "FET / USD",
      "RENDER / USD", "NEAR / USD", "LINK / USD", "PENDLE / USD", "AGIX / USD",
      "RSIC / USD", "DOG / USD", "CKB / USD", "ZRO / USD", "LDO / USD", "MSTR / USD",
      "% SOL", "% FET", "% RENDER", "% NEAR", "% LINK", "% PENDLE", "% AGIX", "% RSIC", 
      "% DOG", "% CKB", "% ZRO", "% LDO", "% BTC", "% ETH", "COTACAO BTC"
    ];
    abaHistorico.appendRow(cabecalhos);
  }

  // Adiciona os valores na próxima linha disponível
  const linha = abaHistorico.getLastRow() + 1;
  abaHistorico.getRange(linha, 1, 1, valores.length).setValues([valores]);

  // Verifica se os valores foram gravados corretamente
  const valoresInseridos = abaHistorico.getRange(linha, 1, 1, valores.length).getValues()[0];
  
  // Se houver problema com os valores gravados, remove a linha e tenta novamente
  if (!validarValores(valoresInseridos)) {
    abaHistorico.deleteRow(linha);
    gravarHistorico(); // Chama a função recursivamente
  }
}
