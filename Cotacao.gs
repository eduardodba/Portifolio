// Chave de API para acessar o serviço Cryptocompare
const API_KEY = 'fe763899ec36e32377cf4a176c88101e4509c5c617da0ca71a127a94a5cb9434'; 

/**
 * Obtém o preço atual de uma criptomoeda em USD a partir da API Cryptocompare
 * @param {string} symbol - Símbolo da criptomoeda (ex: BTC, ETH)
 * @return {number} Preço da criptomoeda em dólares americanos
 */
function getCryptoPrice(symbol) {
  // Constrói a URL da API com o símbolo da moeda e a chave de API
  const url = `https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD&api_key=${API_KEY}`;
  
  // Faz a requisição HTTP para a API
  const response = UrlFetchApp.fetch(url);
  
  // Converte a resposta de JSON para objeto JavaScript
  const data = JSON.parse(response.getContentText());
  
  // Retorna o valor em USD
  return data.USD;
}

/**
 * Função personalizada para uso direto nas células da planilha
 * Exemplo de uso: =COTACAO("BTC") para obter o preço do Bitcoin
 * @param {string} symbol - Símbolo da criptomoeda
 * @return {number|string} Preço em USD ou mensagem de erro se falhar
 */
function COTACAO(symbol) {
  try {
    // Tenta obter e retornar o preço da criptomoeda
    return getCryptoPrice(symbol);
  } catch (error) {
    // Retorna mensagem de erro caso ocorra algum problema
    return 'Erro ao obter preço';
  }
}
