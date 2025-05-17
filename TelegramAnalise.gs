// Configurações globais do bot
var CONFIG = {
  TELEGRAM_TOKEN: "7774551567:AAGa1jek-Y_eNtSeMiYv6Y4qQJoVLzTaLMM",
  AUTHORIZED_CHAT_ID: 1234566534324,
  SHEET_NAME: "Histórico"
};


/**
 * Função principal que recebe as mensagens do Telegram via webhook
 */
function doPost(e) {
  try {
    // Log inicial para verificar se a requisição chegou
    Logger.log("Requisição recebida: " + JSON.stringify(e));
    
    // Verifica se a requisição contém dados válidos
    if (!e?.postData?.contents) {
      Logger.log("Requisição inválida: postData ou contents ausente");
      return;
    }
    
    // Processa os dados da mensagem
    var update = JSON.parse(e.postData.contents);
    var message = update.message || {};
    var chatId = message.chat?.id;
    var text = message.text || "";
    
    // Log dos dados recebidos
    Logger.log("Chat ID: " + chatId + ", Texto: " + text);
    
    // Normaliza o comando (remove @NomeDoBot, se presente)
    var command = text.split("@")[0].trim();
    
    // Verifica o comando e a autorização do usuário
    if (command === "/analise" && chatId === CONFIG.AUTHORIZED_CHAT_ID) {
      Logger.log("Executando /analise para chatId autorizado: " + chatId);
      processAnalysisRequest(chatId);
    } 
    else if (command === "/analisemensal" && chatId === CONFIG.AUTHORIZED_CHAT_ID) {
      Logger.log("Executando /analisemensal para chatId autorizado: " + chatId);
      processMonthlyAnalysis(chatId);
    }
    else if (command === "/teste" && chatId === CONFIG.AUTHORIZED_CHAT_ID) {
      Logger.log("Executando /teste para chatId autorizado: " + chatId);
      sendTelegramMessage(chatId, "✅ Comando de teste executado com sucesso!");
    } 
    else if (command === "/alocacao" && chatId === CONFIG.AUTHORIZED_CHAT_ID) {
      Logger.log("Executando /alocacao para chatId autorizado: " + chatId);
      var allocationMessage = GerarAlocacaoTelegram();
      sendTelegramMessage(chatId, allocationMessage);
    } 
    else if (command === "/analise" || command === "/analisemensal" || command === "/teste" || command === "/alocacao") {
      Logger.log("Acesso não autorizado para " + command + ", chatId: " + chatId);
      sendTelegramMessage(chatId, "🚫 Acesso não autorizado!");
    } 
    else {
      Logger.log("Comando desconhecido: " + command);
      sendTelegramMessage(chatId, "Comando não reconhecido. Tente /analise, /analisemensal, /teste ou /alocacao.");
    }
  } catch (e) {
    Logger.log("Erro no doPost: " + e.toString() + ", Stack: " + e.stack);
    sendTelegramMessage(chatId, "❌ Erro ao processar o comando. Tente novamente.");
  }
}

/**
 * Gera análise de alocação da carteira
 */
function GerarAlocacaoTelegram() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Overview");
    const rows = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 24];
    
    // Obtém dados
    const data = sheet.getRangeList(rows.map(row => `A${row}:C${row}`)).getRanges()
      .map(range => range.getValues()[0]);
    const percentages = sheet.getRangeList(rows.map(row => `G${row}`)).getRanges()
      .map(range => ({
        display: range.getDisplayValue().replace(',', '.'),
        numeric: parseFloat(range.getDisplayValue().replace('%', '').replace(',', '.')) || 0
      }));
    
    // Formata data
    const today = new Date();
    const dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), "dd/MM/yyyy");
    
    // Processa alocações
    const allocations = [];
    for (let i = 0; i < data.length; i++) {
      const asset = data[i].filter(cell => cell).join(' ').trim();
      const percentage = percentages[i];
      
      if (asset && percentage.numeric > 0.01) {
        const percValue = percentage.numeric.toFixed(2);
        const percFormatted = `${percValue}%`;
        
        allocations.push({
          name: asset,
          perc: percentage.numeric,
          percFormatted: percFormatted
        });
      }
    }
    
    // Ordena do maior para o menor percentual
    allocations.sort((a, b) => b.perc - a.perc);
    
    // Determina o comprimento máximo do nome do ativo
    const maxAssetLength = Math.max(...allocations.map(a => a.name.length));
    
    // Monta a mensagem
    let message = `📊 Alocação da Carteira - ${dateStr}\n\n`;
    allocations.forEach(alloc => {
      message += `${alloc.percFormatted.padEnd(7)} ${alloc.name.padEnd(maxAssetLength)}\n`;
    });
    
    return allocations.length > 0 ? message : "⚠️ Nenhum dado encontrado.";
  } catch (e) {
    console.error("Erro: " + e.toString());
    return "❌ Erro ao buscar dados. Verifique: \n1. Se a aba 'Overview' existe\n2. Se os valores na coluna G são números\n3. Se as linhas 10-24 têm dados válidos";
  }
}

/**
 * Processa a requisição de análise diária
 */
function processAnalysisRequest(chatId) {
  try {
    SpreadsheetApp.flush();
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
    var data = sheet.getDataRange().getValues();
    
    if (data.length < 3) {
      sendTelegramMessage(chatId, "⚠️ Dados insuficientes para análise");
      return;
    }

    var lastRow = data[data.length - 1];
    var analysisDate = Utilities.formatDate(new Date(lastRow[0]), "GMT-3", "dd/MM/yyyy");

    var message = `📊 *Análise da Carteira - ${analysisDate}*\n\n`;

    // 1. Análise de variação percentual
    var priceAnalysis = analyzePriceChanges(data);
    
    if (priceAnalysis.gains.length > 0) {
      message += "💹 *Maiores Altas (24h):*\n" + formatPriceChanges(priceAnalysis.gains) + "\n\n";
    }
    
    if (priceAnalysis.losses.length > 0) {
      message += "🔻 *Maiores Baixas (24h):*\n" + formatPriceChanges(priceAnalysis.losses) + "\n\n";
    }

    // 2. Análise de alocação
    var allocationAnalysis = analyzeAllocationChanges(data);
    if (allocationAnalysis.length > 0) {
      message += "📈 *Ativos Ganhando Espaço:*\n" + formatAllocationChanges(allocationAnalysis) + "\n\n";
    }

    // 3. Saldos atuais
    var previousRow = data[data.length - 2];
    message += formatCurrentBalances(lastRow, previousRow);

    // 4. Dados de lucro
    var profitData = getProfitData();
    var hasProfitData = profitData.lucroBtc !== 0 || profitData.lucroEth !== 0 || 
                       profitData.pmBtc !== 0 || profitData.pmEth !== 0;
    
    if (hasProfitData) {
      message += "\n\n💎 *Preço Médio e Lucro:*\n" +
                 (profitData.lucroBtc !== 0 ? `💰 Lucro BTC: R$${formatNumber(profitData.lucroBtc, 2)}\n` : '') +
                 (profitData.lucroEth !== 0 ? `💰 Lucro ETH: R$${formatNumber(profitData.lucroEth, 2)}\n` : '') +
                 (profitData.pmBtc !== 0 ? `📌 PM BTC: $${formatNumber(profitData.pmBtc, 2)}\n` : '') +
                 (profitData.pmEth !== 0 ? `📌 PM ETH: $${formatNumber(profitData.pmEth, 2)}\n` : '');
    }
    
    message = message.trim();
    sendTelegramMessage(chatId, message);

  } catch (e) {
    sendTelegramMessage(chatId, "❌ Erro na análise: " + e.message);
    Logger.log(e);
  }
}

/**
 * Gera análise mensal do desempenho da carteira
 */
function processMonthlyAnalysis(chatId) {
  try {
    SpreadsheetApp.flush();
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    // Obtém datas do mês anterior
    var today = new Date();
    var firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    var lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    
    // Encontra os dados do primeiro e último dia do mês anterior
    var firstDayData = null;
    var lastDayData = null;
    
    for (var i = 1; i < data.length; i++) {
      var rowDate = new Date(data[i][0]);
      if (rowDate >= firstDayOfLastMonth && rowDate <= lastDayOfLastMonth) {
        if (!firstDayData || rowDate < new Date(firstDayData[0])) {
          firstDayData = data[i];
        }
        if (!lastDayData || rowDate > new Date(lastDayData[0])) {
          lastDayData = data[i];
        }
      }
    }
    
    if (!firstDayData || !lastDayData) {
      sendTelegramMessage(chatId, "⚠️ Dados insuficientes para análise mensal");
      return;
    }
    
    // Formata as datas
    var firstDayFormatted = Utilities.formatDate(new Date(firstDayData[0]), "GMT-3", "dd/MM/yyyy");
    var lastDayFormatted = Utilities.formatDate(new Date(lastDayData[0]), "GMT-3", "dd/MM/yyyy");
    var monthName = Utilities.formatDate(firstDayOfLastMonth, "GMT-3", "MMMM/yyyy");
    
    // Monta a mensagem
    var message = `📅 *Análise Mensal - ${monthName}*\n`;
    message += `(De ${firstDayFormatted} a ${lastDayFormatted})\n\n`;
    
    // 1. Análise de variação percentual
    var priceAnalysis = analyzeMonthlyPriceChanges(headers, firstDayData, lastDayData);
    
    if (priceAnalysis.gains.length > 0) {
      message += "💹 *Maiores Altas (Mês):*\n" + formatPriceChanges(priceAnalysis.gains) + "\n\n";
    }
    
    if (priceAnalysis.losses.length > 0) {
      message += "🔻 *Maiores Baixas (Mês):*\n" + formatPriceChanges(priceAnalysis.losses) + "\n\n";
    }
    
    // 2. Análise de alocação
    var allocationAnalysis = analyzeMonthlyAllocationChanges(headers, firstDayData, lastDayData);
    if (allocationAnalysis.gains.length > 0) {
      message += "📈 *Ativos Ganhando Espaço:*\n" + formatAllocationChanges(allocationAnalysis.gains) + "\n\n";
    }
    if (allocationAnalysis.losses.length > 0) {
      message += "📉 *Ativos Perdendo Espaço:*\n" + formatAllocationChanges(allocationAnalysis.losses) + "\n\n";
    }
    
    // 3. Saldos totais
    message += formatMonthlyBalances(firstDayData, lastDayData);
    
    // 4. Dados de lucro
    var profitData = getProfitData();
    var hasProfitData = profitData.lucroBtc !== 0 || profitData.lucroEth !== 0 || 
                       profitData.pmBtc !== 0 || profitData.pmEth !== 0;
    
    if (hasProfitData) {
      message += "\n\n💎 *Preço Médio e Lucro:*\n" +
                 (profitData.lucroBtc !== 0 ? `💰 Lucro BTC: R$${formatNumber(profitData.lucroBtc, 2)}\n` : '') +
                 (profitData.lucroEth !== 0 ? `💰 Lucro ETH: R$${formatNumber(profitData.lucroEth, 2)}\n` : '') +
                 (profitData.pmBtc !== 0 ? `📌 PM BTC: $${formatNumber(profitData.pmBtc, 2)}\n` : '') +
                 (profitData.pmEth !== 0 ? `📌 PM ETH: $${formatNumber(profitData.pmEth, 2)}\n` : '');
    }
    
    message = message.trim();
    sendTelegramMessage(chatId, message);
    
  } catch (e) {
    sendTelegramMessage(chatId, "❌ Erro na análise mensal: " + e.message);
    Logger.log("Erro em processMonthlyAnalysis: " + e.toString() + "\nStack: " + e.stack);
  }
}

/**
 * Analisa variações de preço diárias
 */
function analyzePriceChanges(data) {
  var headers = data[0];
  var lastRow = data[data.length - 1];
  var previousRow = data[data.length - 2];
  var assets = [];

  for (var col = 7; col <= 21; col++) {
    var header = headers[col];
    if (!header) continue;

    var assetName = header.split('/')[0]?.trim() || header.trim();
    var current = lastRow[col];
    var previous = previousRow[col];
    
    if (previous && current && previous !== 0) {
      var variation = ((current - previous) / previous) * 100;
      assets.push({
        name: assetName,
        variation: variation,
        price: current
      });
    }
  }

  return {
    gains: assets.filter(a => a.variation > 0)
                 .sort((a, b) => b.variation - a.variation)
                 .slice(0, 5),
    losses: assets.filter(a => a.variation < 0)
                  .sort((a, b) => a.variation - b.variation)
                  .slice(0, 5)
  };
}

/**
 * Analisa variações de preço mensais
 */
function analyzeMonthlyPriceChanges(headers, firstDayData, lastDayData) {
  var assets = [];

  for (var col = 7; col <= 21; col++) {
    var header = headers[col];
    if (!header) continue;

    var assetName = header.split('/')[0]?.trim() || header.trim();
    var current = lastDayData[col];
    var previous = firstDayData[col];
    
    if (previous && current && previous !== 0) {
      var variation = ((current - previous) / previous) * 100;
      assets.push({
        name: assetName,
        variation: variation,
        price: current
      });
    }
  }

  return {
    gains: assets.filter(a => a.variation > 0)
                 .sort((a, b) => b.variation - a.variation)
                 .slice(0, 5),
    losses: assets.filter(a => a.variation < 0)
                  .sort((a, b) => a.variation - b.variation)
                  .slice(0, 5)
  };
}

/**
 * Analisa mudanças na alocação diária
 */
function analyzeAllocationChanges(data) {
  var headers = data[0];
  var lastRow = data[data.length - 1];
  var previousRow = data[data.length - 2];
  var changes = [];

  for (var col = 22; col <= 36; col++) {
    var header = headers[col];
    if (!header || header.includes("MSTR / USD")) continue;

    var assetName = header.split('%')[1]?.trim() || header.trim();
    var current = lastRow[col];
    var previous = previousRow[col];
    
    if (current && previous) {
      var change = current - previous;
      changes.push({
        asset: assetName,
        change: change,
        current: current
      });
    }
  }

  return changes.filter(a => a.change > 0)
                .sort((a, b) => b.change - a.change)
                .slice(0, 5);
}

/**
 * Analisa mudanças na alocação mensal
 */
function analyzeMonthlyAllocationChanges(headers, firstDayData, lastDayData) {
  var changes = [];

  for (var col = 22; col <= 36; col++) {
    var header = headers[col];
    if (!header || header.includes("MSTR / USD")) continue;

    var assetName = header.split('%')[1]?.trim() || header.trim();
    var current = lastDayData[col];
    var previous = firstDayData[col];
    
    if (current && previous) {
      var change = current - previous;
      changes.push({
        asset: assetName,
        change: change,
        current: current
      });
    }
  }

  return {
    gains: changes.filter(a => a.change > 0)
                 .sort((a, b) => b.change - a.change)
                 .slice(0, 5),
    losses: changes.filter(a => a.change < 0)
                  .sort((a, b) => a.change - b.change)
                  .slice(0, 5)
  };
}

/**
 * Formata os saldos atuais diários
 */
function formatCurrentBalances(lastRow, previousRow) {
  var usdCurrent = lastRow[1] || 0;
  var usdPrevious = previousRow[1] || 0;
  var brlCurrent = lastRow[2] || 0;
  var brlPrevious = previousRow[2] || 0;
  var btcBalanceCurrent = lastRow[3] || 0;
  var btcBalancePrevious = previousRow[3] || 0;
  var btcQtdCurrent = lastRow[4] || 0;
  var btcQtdPrevious = previousRow[4] || 0;

  function getArrow(current, previous) {
    if (current > previous) return '🤑';
    if (current < previous) return '😨';
    return '😐';
  }

  function getDifference(current, previous, decimalPlaces) {
    if (current === previous) return '';
    var difference = current - previous;
    return difference >= 0 ? `(+${difference.toFixed(decimalPlaces)})` : `(${difference.toFixed(decimalPlaces)})`;
  }

  function getDifferenceInSatoshis(current, previous) {
    if (current === previous) return '';
    var difference = (current - previous) * 100000000;
    return difference >= 0 ? `(+${difference.toFixed(0)} sat)` : `(${difference.toFixed(0)} sat)`;
  }

  return `💰 *Saldos Atuais:*\n` +
         `- USD: $${usdCurrent.toFixed(2)} ${getArrow(usdCurrent, usdPrevious)} ${getDifference(usdCurrent, usdPrevious, 2)}\n` +
         `- BRL: R$${brlCurrent.toFixed(2)} ${getArrow(brlCurrent, brlPrevious)} ${getDifference(brlCurrent, brlPrevious, 2)}\n` +
         `- SALDO BTC: ${btcBalanceCurrent.toFixed(7)} ${getArrow(btcBalanceCurrent, btcBalancePrevious)} ${getDifferenceInSatoshis(btcBalanceCurrent, btcBalancePrevious)}\n` +
         `- QTD BTC: ${btcQtdCurrent.toFixed(7)} ${getArrow(btcQtdCurrent, btcQtdPrevious)} ${getDifferenceInSatoshis(btcQtdCurrent, btcQtdPrevious)}`;
}

/**
 * Formata os saldos mensais
 */
/**
 * Formata os saldos mensais
 */
function formatMonthlyBalances(firstDayData, lastDayData) {
  var usdCurrent = lastDayData[1] || 0;
  var usdPrevious = firstDayData[1] || 0;
  var brlCurrent = lastDayData[2] || 0;
  var brlPrevious = firstDayData[2] || 0;
  var btcBalanceCurrent = lastDayData[3] || 0;
  var btcBalancePrevious = firstDayData[3] || 0;
  var btcQtdCurrent = lastDayData[4] || 0;
  var btcQtdPrevious = firstDayData[4] || 0;

  function getDifference(current, previous, decimalPlaces) {
    if (current === previous) return '';
    var difference = current - previous;
    return difference >= 0 ? `(+${formatNumber(difference, decimalPlaces)})` : `(${formatNumber(difference, decimalPlaces)})`;
  }

  function getDifferenceInSatoshis(current, previous) {
    if (current === previous) return '';
    var difference = (current - previous) * 100000000;
    return difference >= 0 ? `(+${difference.toFixed(0)} sat)` : `(${difference.toFixed(0)} sat)`;
  }

  return `💰 *Variação Mensal dos Saldos:*\n` +
         `- USD: $${usdCurrent.toFixed(2)} ${getDifference(usdCurrent, usdPrevious, 2)}\n` +
         `- BRL: R$${brlCurrent.toFixed(2)} ${getDifference(brlCurrent, brlPrevious, 2)}\n` +
         `- SALDO BTC: ${btcBalanceCurrent.toFixed(7)} ${getDifferenceInSatoshis(btcBalanceCurrent, btcBalancePrevious)}\n` +
         `- QTD BTC: ${btcQtdCurrent.toFixed(7)} ${getDifferenceInSatoshis(btcQtdCurrent, btcQtdPrevious)}`;
}

/**
 * Formata as variações de preço para exibição
 */
function formatPriceChanges(assets) {
  return assets.map(a => {
    var variationAbs = Math.abs(a.variation);
    var decimals = variationAbs < 0.05 ? 4 : 2;
    return `${a.variation > 0 ? '🟢' : '🔴'} ${a.name}: ${a.variation.toFixed(decimals)}% ($${a.price.toFixed(2)})`;
  }).join('\n');
}

/**
 * Formata as mudanças de alocação para exibição
 */
function formatAllocationChanges(changes) {
  return changes.map(c => {
    var decimals = c.change < 0.05 ? 4 : 1;
    var currentDecimals = c.current < 0.05 ? 4 : 1;
    return `📈 ${c.asset}: +${c.change.toFixed(decimals)}% (Atual: ${c.current.toFixed(currentDecimals)}%)`;
  }).join('\n');
}

/**
 * Obtém dados de lucro e preço médio
 */
function getProfitData() {
  try {
    SpreadsheetApp.flush();
    var overviewSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Overview");
    return {
      pmBtc: overviewSheet.getRange("A6").getValue(),
      pmEth: overviewSheet.getRange("D6").getValue(),
      lucroBtc: overviewSheet.getRange("H2").getValue(),
      lucroEth: overviewSheet.getRange("F6").getValue()
    };
  } catch (e) {
    Logger.log("Erro ao buscar dados de lucro/PM: " + e.toString());
    return {
      pmBtc: 0,
      pmEth: 0,
      lucroBtc: 0,
      lucroEth: 0
    };
  }
}

/**
 * Formata número com casas decimais específicas
 */
function formatNumber(value, decimals) {
  return (parseFloat(value) || 0).toFixed(decimals);
}

/**
 * Envia mensagem para o Telegram
 */
function sendTelegramMessage(chatId, text) {
  var url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/sendMessage`;
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    })
  };
  UrlFetchApp.fetch(url, options);
}

/**
 * Função para disparar análise mensal no dia 1º
 */
function triggerMonthlyAnalysis() {
  var today = new Date();
  if (today.getDate() === 1) {
    processMonthlyAnalysis(CONFIG.AUTHORIZED_CHAT_ID);
  }
}

/**
 * Adiciona trigger para execução automática
 */
function setupMonthlyTrigger() {
  // Remove triggers existentes
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "triggerMonthlyAnalysis") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Cria novo trigger para rodar diariamente
  ScriptApp.newTrigger("triggerMonthlyAnalysis")
    .timeBased()
    .everyDays(1)
    .create();
}

/**
 * Função para gerar análise manualmente (não via webhook)
 */
function GerarAnaliseTelegram() {
  processAnalysisRequest(CONFIG.AUTHORIZED_CHAT_ID);
}

/**
 * Função para gerar análise mensal manualmente
 */
function GerarAnaliseMensalTelegram() {
  processMonthlyAnalysis(CONFIG.AUTHORIZED_CHAT_ID);
}
