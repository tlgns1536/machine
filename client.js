function getValue() {
	const request = new Request(`/get`);
	fetch(request)
	.then(function(result) {
		result.json() 
		.then(function(res) {
			document.getElementById("port").innerHTML = res.port;
			document.getElementById("update").innerHTML = res.my_trade_data.updateTime;
			document.getElementById("last").innerHTML = res.last_complete_price;
			const hdiffPrice = res.last_complete_price - res.my_trade_data.highPrice;
			const ldiffPrice = res.last_complete_price - res.my_trade_data.lowPrice;
			const hrate = 
				String((1 - res.my_trade_data.highPrice / res.last_complete_price) * 100);
			const lrate = 
      	String((res.last_complete_price / res.my_trade_data.lowPrice - 1) * 100);
      document.getElementById("hrate").innerHTML = `${hrate.substr(0,6)}% ${hdiffPrice}`; 
      document.getElementById("lrate").innerHTML = `${lrate.substr(0,5)}% ${ldiffPrice}`;

			document.getElementById("hprice").innerHTML = res.my_trade_data.highPrice;
			document.getElementById("hpriceavg").innerHTML = res.avg_high;
			document.getElementById("lprice").innerHTML = res.my_trade_data.lowPrice;
			document.getElementById("lpriceavg").innerHTML = res.avg_low;

			document.getElementById("qty").innerHTML = res.my_trade_data.qty;
			document.getElementById("hold").innerHTML = res.my_trade_data.holdPrice;
			document.getElementById("lincome").innerHTML = res.my_trade_data.lastIncome;
			document.getElementById("gincome").innerHTML = res.my_trade_data.grossIncome;
			document.getElementById("trade").innerHTML = res.my_trade_data.lastTradeTime;
			document.getElementById("sell").innerHTML = res.my_trade_data.lastSellPrice;
			document.getElementById("buy").innerHTML = res.my_trade_data.lastBuyPrice;
			// ECT
			document.getElementById("recent").innerHTML = res.complete_order_price;
			document.getElementById("askavg").innerHTML = res.order_book_ask.average;
			document.getElementById("askhigh").innerHTML = res.order_book_ask.high;
			document.getElementById("asklow").innerHTML = res.order_book_ask.low;
			document.getElementById("bidavg").innerHTML = res.order_book_bid.average;
			document.getElementById("bidhigh").innerHTML = res.order_book_bid.high;
			document.getElementById("bidlow").innerHTML = res.order_book_bid.low;
			document.getElementById("avg").innerHTML = res.order_book_avg;
			// INFO
      document.getElementById("info").innerHTML = res.info; 
			// ERR
      document.getElementById("error").innerHTML = res.error; 
    })
		.catch(function(err) {
			if (err) document.getElementById("error").innerHTML = err; 
		});
  });
}



