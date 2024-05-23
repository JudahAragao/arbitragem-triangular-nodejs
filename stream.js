const WebSocket = require('ws');

// Primeira conexão para obter os símbolos
const wsMiniTicker = new WebSocket("wss://stream.binance.com:9443/ws/!miniTicker@arr");

const BOOK = {};

// Função para criar conexões WebSocket para cada símbolo
function createSymbolWebSocket(symbol) {
    const wsSymbol = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@trade`);

    wsSymbol.onmessage = (event) => {
        const tradeData = JSON.parse(event.data);
        BOOK[symbol] = { price: parseFloat(tradeData.p) };
        // console.log(BOOK);
    };
}

// Quando a primeira conexão recebe uma mensagem
wsMiniTicker.onmessage = (event) => {
    const tickerData = JSON.parse(event.data);

    tickerData.forEach((ticker) => {
        const symbol = ticker.s;
        if (!BOOK[symbol]) {
            createSymbolWebSocket(symbol);
        }
    });
};

// Exportar função para obter dados em tempo real
function getBook(symbol) {
    return BOOK[symbol];
}

module.exports = {
    getBook
};
