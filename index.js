const express = require('express');
const crypto = require('crypto');
const request = require('request');
const path = require('path');
const promise = require('promise');
const fs = require('fs');
const app = express();

const listnePort = 3000;
const INTERVAL = 5000;
const BP = 0.05;
const SP = 0.05;
const BTC_FEE = 0.001;
const AVG = 3; // recent price average count
const ACCESS_TOKEN = 'f9b2f729-4a4b-4b13-928d-462b88f00ac0';
const SECRET_KEY = 'd62e5f19-bd52-4758-b1a7-c3b3651220e3';

const coinUser = {
  userInfo: 'https://api.coinone.co.kr/v2/account/user_info/',
  virtualAccount: 'https://api.coinone.co.kr/v2/account/virtual_account/',
  depositAdress: 'https://api.coinone.co.kr/v2/account/deposit_address/',
  balance: 'https://api.coinone.co.kr/v2/account/balance/',
  dailyBalance: 'https://api.coinone.co.kr/v2/account/daily_balance/',
};

const coinInfo = {
  transactionHistory: 'https://api.coinone.co.kr/v2/transaction/history/'
};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/client.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'client.js'));
});

app.get('/get', (req, res) => {	
	res.send(returnValue);	
});

app.listen(listnePort, function() {
	console.log(`Server started on port ${listnePort}`);
	Initialize();
	getTradeInfo();
  setInterval(getTradeInfo, INTERVAL);
	getEtcInfo();
  setInterval(getEtcInfo, INTERVAL *2);
});

const tradeData = { 
	qty: 0,
  holdPrice: 0,
  lastSellPrice: 0,
  lastBuyPrice: 0,
  highPrice: 0,
  lowPrice: 0,
	lastIncome: 0,
	grossIncome: 0,
  lastTradeTime: '',
  updateTime: ''
};

const returnValue = { 
	complete_order_price: 0,
  last_complete_price: 0,
	order_book_ask: 0,
	order_book_bid: 0,
	order_book_avg: 0,
	my_trade_data: 0,
	info: 'none',
	error: 'none',
	avg_high: 0,
	avg_low: 0,
	port: `${listnePort} B ${BP} S ${SP}`
};

const Initialize = function() {
	try {
		// test
		const account = JSON.parse(fs.readFileSync('./testWallet.json', 'utf8'));
	
		const data = fs.readFileSync('./cog.json', 'utf8');
		if (data) {
			const readData = JSON.parse(data);
			const lastStatus = readData[readData.length - 1];
			tradeData.qty = account.btc;
			tradeData.holdPrice = account.price; 
			tradeData.lastSellPrice = lastStatus.lastSellPrice;
			tradeData.lastBuyPrice = lastStatus.lastBuyPrice;
			tradeData.highPrice = 0;
			tradeData.lowPrice = 0;
			tradeData.lastIncome = lastStatus.lastIncome;
			tradeData.grossIncome = lastStatus.grossIncome;
			tradeData.lastTradeTime = lastStatus.lastTradeTime;
			tradeData.updateTime = getTime();
			readData.push(tradeData);
			fs.writeFileSync('./cog.json', JSON.stringify(readData), 'utf8'); 
		} else  {
			tradeData.qty = account.btc;
			tradeData.holdPrice = account.price; 
			tradeData.lastSellPrice =	0; 
			tradeData.lastBuyPrice = 0;
			tradeData.highPrice = 0;
			tradeData.lowPrice = 0;
			tradeData.lastIncome = 0;
			tradeData.grossIncome = 0;
			tradeData.lastTradeTime = getTime();
			tradeData.updateTime = getTime();
			fs.writeFileSync('./cog.json', JSON.stringify([tradeData]), 'utf8'); 
		}
	} catch (error) {
		returnValue.error = `Initialize: ${JSON.stringify(error)}`;
	};
};

const SellorBuy = function(currentPrice) {
	try {
		const readData = JSON.parse(fs.readFileSync('./cog.json', 'utf8'));
		const lastStatus = readData[readData.length - 1];
		if (!lastStatus.highPrice) lastStatus.highPrice = currentPrice;
		if (!lastStatus.lowPrice) lastStatus.lowPrice = currentPrice;

		if (currentPrice <= lastStatus.lowPrice) { // update low price
			lastStatus.lowPrice = currentPrice;
			lastStatus.updateTime = getTime();
			readData.push(lastStatus);
			returnValue.my_trade_data = lastStatus;
			fs.writeFileSync('./cog.json', JSON.stringify(readData), 'utf8'); 
		} else if (currentPrice >= lastStatus.highPrice) { // update high price
			lastStatus.highPrice = currentPrice;
			lastStatus.updateTime = getTime();
			readData.push(lastStatus);
			returnValue.my_trade_data = lastStatus;
			fs.writeFileSync('./cog.json', JSON.stringify(readData), 'utf8'); 
		} else {
			lastStatus.updateTime = getTime();
			returnValue.my_trade_data = lastStatus;
		}
		
		if (readData.length > AVG) {
			const averageLowPriceData = [];
			for (let i = readData.length - AVG; i <= readData.length -1;	i = i +1) {
				averageLowPriceData.push({ price: readData[i].lowPrice });
			}
			const lowPriceAvg = averagePrice(averageLowPriceData);
			returnValue.avg_low = lowPriceAvg.high;
			const averageHighPriceData = [];
			for (let i = readData.length - AVG; i <= readData.length -1;	i = i +1) {
				averageHighPriceData.push({ price: readData[i].highPrice });
			}
			const highPriceAvg = averagePrice(averageHighPriceData);
			returnValue.avg_high = highPriceAvg.low;

			if (lastStatus.qty) { // sell, has btc
				const MR = 1.002; // minimum ratio
				const RP = (1 - currentPrice / highPriceAvg.low) * 100;
				const RC = (highPriceAvg.low - currentPrice) * lastStatus.qty;
				const FEE = currentPrice * BTC_FEE * lastStatus.qty;
 				returnValue.info =
        	`Sell R ${RP.toString().substr(0, 5)}% ${Math.floor(RC/1000)*1000}W` +
					` LB*MR < CP = ${lastStatus.lastBuyPrice * MR} < ${currentPrice}:` +
					` ${lastStatus.lastBuyPrice * MR < currentPrice}` +
					` LI < RC*MR = ${lastStatus.lastIncome} < ${RC * MR}:`+
					` ${lastStatus.lastIncome < RC * MR}` +
					` GI*MR < RC = ${lastStatus.grossIncome * MR} < ${RC}:` +
					` ${lastStatus.grossIncome * MR < RC}`;

				if (currentPrice < highPriceAvg.low && RP >= SP &&
			  		(lastStatus.lastBuyPrice * MR < currentPrice ||
						(lastStatus.lastIncome > 0 && lastStatus.lastIncome < RC * MR) ||
						(lastStatus.grossIncome > 0 && lastStatus.grossIncome * MR < RC))) {
					tradeData.lastIncome = Math.floor(
						(currentPrice - lastStatus.lastBuyPrice) * lastStatus.qty / 1000)*1000
						- FEE;
					tradeData.grossIncome = lastStatus.grossIncome + tradeData.lastIncome;
					tradeData.qty = 0;
					tradeData.holdPrice = currentPrice * lastStatus.qty - FEE;
					tradeData.lastSellPrice = currentPrice;
					tradeData.lastBuyPrice = lastStatus.lastBuyPrice;
					tradeData.highPrice = currentPrice;
					tradeData.lowPrice = currentPrice;
					tradeData.updateTime = getTime();
					tradeData.lastTradeTime = getTime();
					readData.push(tradeData);
					fs.writeFileSync('./cog.json', JSON.stringify(readData), 'utf8'); 
					returnValue.my_trade_data = tradeData;
					// test
					fs.writeFileSync('./testWallet.json', JSON.stringify({
						btc: tradeData.qty, price: tradeData.holdPrice}), 'utf8'); 
				}
			} else { // buy, no has btc
				const IP = (currentPrice / lowPriceAvg.high - 1) * 100;
				if (currentPrice > lowPriceAvg.high && IP >= BP) {
					tradeData.lastIncome = lastStatus.lastIncome;
					tradeData.grossIncome = lastStatus.grossIncome;
					tradeData.qty = lastStatus.holdPrice / currentPrice * (1- BTC_FEE);
					tradeData.holdPrice = 0;
					tradeData.lastSellPrice	= lastStatus.lastSellPrice;
					tradeData.lastBuyPrice = currentPrice;
					tradeData.highPrice = currentPrice;
					tradeData.lowPrice = currentPrice;
					tradeData.updateTime = getTime();
					tradeData.lastTradeTime = getTime();
					readData.push(tradeData);
					fs.writeFileSync('./cog.json', JSON.stringify(readData), 'utf8'); 
					returnValue.my_trade_data = tradeData;
					// test
					fs.writeFileSync('./testWallet.json', JSON.stringify({
						btc: tradeData.qty, price: tradeData.holdPrice}), 'utf8'); 
				 }
			}
		}
	} catch (error) {
		console.log(error);
		returnValue.error = `sellodBuy: ${JSON.stringify(error)}`;
	};
};

const getTime = function() {
	const currentDate = new Date();
	return `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}` +
		`-${currentDate.getDate()}-${currentDate.getHours()}` +
    `-${currentDate.getMinutes()}-${currentDate.getSeconds()}`;
};

const getEtcInfo = function() {
  coinOneGet('https://api.coinone.co.kr/trades/')
	.then((result) => {
		const recent = averagePrice(result.completeOrders);
		coinOneGet('https://api.coinone.co.kr/orderbook/')
		.then((result) => {
			const ask = averagePrice(result.ask);
			const bid = averagePrice(result.bid);
			returnValue.complete_order_price = recent.average;
			returnValue.order_book_ask = ask;
			returnValue.order_book_bid = bid;
			returnValue.order_book_avg = (ask.average+bid.average)/2;
  	})
		.catch((error) => {
			returnValue.error = `getEtcInfo orderbook: ${JSON.stringify(error)}`;
		});
  })
	.catch((error) => {
		returnValue.error = `getEtcInfo trades: ${JSON.stringify(error)}`;
	});

};
const getTradeInfo = function() {
	coinOneGet('https://api.coinone.co.kr/ticker/')
	.then((result) => {
		const last = averagePrice(result.last);
		returnValue.last_complete_price = last.average;
		SellorBuy(Number(last.average));
	})
	.catch((error) => {
		returnValue.error = `getTradeInfo ticker: ${JSON.stringify(error)}`;
	});
};

const averagePrice = function(priceArray) {
	if (typeof(priceArray) !== 'object') {
		return { average: priceArray };
	}
	const price = {
		low: Number.MAX_SAFE_INTEGER,
		high: 0,
		total: 0,
		count: 0,
		average: 0
  };
	let totalPrice = 0;
	let lastIndex = 0;
	priceArray.forEach(function(object, index) {
		const sum = Number(price.total) + Number(object.price);
		if (Number.MAX_SAFE_INTEGER > sum) {
			price.total = sum;
			price.count = index + 1;
			if (Number(price.high) < Number(object.price)) {
				 price.high = Number(object.price);
			}
			if (Number(price.low) > Number(object.price)) {
				price.low = Number(object.price);
			}
		} 
  });
	price.average = Math.floor(price.total / price.count / 1000) * 1000;
	return price;
};

const options = function(url) {
	const payload = {
		"access_token": ACCESS_TOKEN,
		"nonce": Date.now()
	};

	const payloads = new Buffer(JSON.stringify(payload)).toString('base64');

	const signature = crypto
		.createHmac("sha512", SECRET_KEY.toUpperCase())
		.update(payloads)
		.digest('hex');

	const headers = {
		'content-type':'application/json',
		'X-COINONE-PAYLOAD': payloads,
		'X-COINONE-SIGNATURE': signature
	};

	const option = {
		url: url,
		headers: headers,
		body: payloads
	};
	return option;
};

const coinOnePost = function(uri) {
	return new promise(function(resolve, reject) {
		request.post(options(url), function(error, response, body) {
			const data = JSON.parse(body);
			if (data.result === 'error') {
				reject(data);
			}
			if (data.result === 'success') {
				resolve(data);
			}
		});
	});
};

const coinOneGet = function(url) {
	return new promise(function(resolve, reject) {
		request.get(options(url), function(error, response, body) {
			if (body) {
				try {
					const data = JSON.parse(body);
					if (data.result === 'error') {
						reject(data);
					}
					if (data.result === 'success') {
						resolve(data);
					}
				} catch(error) {
					returnValue.error = `coinOneGet: ${JSON.stringify(error)}`;
				};
			}
		});
	});
};

