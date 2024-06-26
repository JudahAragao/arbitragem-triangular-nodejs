const { exchangeInfo } = require("./api.js");
const stream = require("./stream");

const QUOTE = process.env.QUOTE;
const AMOUNT = parseInt(process.env.AMOUNT);
const INTERVAL = parseInt(process.env.CRAWLER_INTERVAL);
const PROFITABILITY = parseFloat(process.env.PROFITABILITY);

function getBuyBuySell(buySymbols, allSymbols, symbolsMap) {
    const buyBuySell = [];
    for (let i = 0; i < buySymbols.length; i++) {
        const buy1 = buySymbols[i];

        const right = allSymbols.filter(s => s.quote === buy1.base);

        for (let j = 0; j < right.length; j++) {
            const buy2 = right[j];

            const sell1 = symbolsMap[buy2.base + buy1.quote];
            if (!sell1) continue;

            buyBuySell.push({ buy1, buy2, sell1 });
        }
    }
    return buyBuySell;
}

function getBuySellSell(buySymbols, allSymbols, symbolsMap) {
    const buySellSell = [];
    for (let i = 0; i < buySymbols.length; i++) {
        const buy1 = buySymbols[i];

        const right = allSymbols.filter(s => s.base === buy1.base && s.quote !== buy1.quote);

        for (let j = 0; j < right.length; j++) {
            const sell1 = right[j];

            const sell2 = symbolsMap[sell1.quote + buy1.quote];
            if (!sell2) continue;

            buySellSell.push({ buy1, sell1, sell2 });
        }
    }
    return buySellSell;
}

function processBuyBuySell(buyBuySell) {
    for (let i = 0; i < buyBuySell.length; i++) {
        const candidate = buyBuySell[i];

        //verifica se já temos todos os preços
        let priceBuy1 = stream.getBook(candidate.buy1.symbol);
        if (!priceBuy1) continue;
        priceBuy1 = parseFloat(priceBuy1.price);

        let priceBuy2 = stream.getBook(candidate.buy2.symbol);
        if (!priceBuy2) continue;
        priceBuy2 = parseFloat(priceBuy2.price);

        let priceSell1 = stream.getBook(candidate.sell1.symbol);
        if (!priceSell1) continue;

        priceSell1 = parseFloat(priceSell1.price);

        //se tem o preço dos 3, pode analisar a lucratividade
        const crossRate = (1 / priceBuy1) * (1 / priceBuy2) * priceSell1;
        if (crossRate > PROFITABILITY) {
            console.log(`OP BBS EM ${candidate.buy1.symbol} > ${candidate.buy2.symbol} > ${candidate.sell1.symbol} = ${crossRate}`);
            console.log(`Investindo ${QUOTE}${AMOUNT}, retorna ${QUOTE}${((AMOUNT / priceBuy1) / priceBuy2) * priceSell1}`);
        }
    }
}

function processBuySellSell(buySellSell) {
    for (let i = 0; i < buySellSell.length; i++) {
        const candidate = buySellSell[i];

        //verifica se já temos todos os preços
        let priceBuy1 = stream.getBook(candidate.buy1.symbol);
        if (!priceBuy1) continue;
        priceBuy1 = parseFloat(priceBuy1.price);

        let priceSell1 = stream.getBook(candidate.sell1.symbol);
        if (!priceSell1) continue;
        priceSell1 = parseFloat(priceSell1.price);

        let priceSell2 = stream.getBook(candidate.sell2.symbol);
        if (!priceSell2) continue;
        priceSell2 = parseFloat(priceSell2.price);

        //se tem o preço dos 3, pode analisar a lucratividade
        const crossRate = (1 / priceBuy1) * priceSell1 * priceSell2;
        if (crossRate > PROFITABILITY) {
            console.log(`OP BSS EM ${candidate.buy1.symbol} > ${candidate.sell1.symbol} > ${candidate.sell2.symbol} = ${crossRate}`);
            console.log(`Investindo ${QUOTE}${AMOUNT}, retorna ${QUOTE}${((AMOUNT / priceBuy1) * priceSell1) * priceSell2}`);
        }
    }
}

const getSymbolMap = (symbols) => {
    const map = {}
    symbols.map(s => map[s.symbol] = s)
    return map
}

const start = async () => {
    //pega todas moedas que estão sendo negociadas
    console.log('Loading Exchange Info...');
    const allSymbols = await exchangeInfo();

    // moedas que podem ser compradas
    const buySymbols = allSymbols.filter(s => s.quote === QUOTE)
    console.log(`Existem ${buySymbols.length} pares que você pode comprar com ${QUOTE} quote`)

    // transformar array de symbols em map de symbols
    const symbolsMap = getSymbolMap(allSymbols)

    // Descobre os pares para triangular BUY-BUY-SELL
    const buyBuySell = getBuyBuySell(buySymbols, allSymbols, symbolsMap)
    console.log(`Existem ${buyBuySell.length} pares para a operação BBS`)

    //Descobre os pares para triangular BUY-SELL-SELL
    const buySellSell = getBuySellSell(buySymbols, allSymbols, symbolsMap);
    console.log(`Existem ${buySellSell.length} pares para a operação BSS`)

    setInterval(async () => {
        console.log(new Date())
        processBuyBuySell(buyBuySell)
        processBuySellSell(buySellSell)
    }, INTERVAL)
}

start();