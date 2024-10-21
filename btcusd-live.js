// Please check this attached screenshot for better understanding: 
// https://1drv.ms/i/c/38c893c5799c163b/EXtPg0jH8CdBmY0BcaYhK2sBLQy0garvMxn5eTYtK4sXLQ?e=mUxf9g


import axios from 'axios';
import WebSocket from 'ws';

import { RSI } from '@debut/indicators';  // Use `import` instead of `require`


// Historical data to initialize the indicators
let rsiInitialPrice;
// Define RSI period (e.g., 14)
const rsiPeriod = 14;
const rsiIndicator = new RSI(rsiPeriod);  // Initialize RSI properly using `new`

async function fetchBTCIntradayData() {
  const url = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=100';
  
  try {
      const response = await axios.get(url);
      rsiInitialPrice = response.data.slice(-14).map(record => record[4]);
      rsiInitialPrice.forEach(close => {
        // Use `nextValue()` to initialize properly with closed candle data
        rsiIndicator.nextValue(close);
      });
  } catch (error) {
      console.error('Error fetching data:', error);
  }
}

fetchBTCIntradayData();


let lastTickTime = null;  // To store the last tick's minute

// Function to detect if the new tick is from a new minute
function isNewMinute(timestamp) {
  const date = new Date(timestamp);  // No need to multiply by 1000 since it's already in milliseconds
  const currentMinute = date.getUTCMinutes();  // Extract the minute from the timestamp

  if (lastTickTime === null || lastTickTime !== currentMinute) {
      lastTickTime = currentMinute;  // Update the last tick time
      return true;  // It's a new minute
  }
  return false;  // It's the same minute
}

// Function to process each incoming tick (new price update)
function processTick(tick) {
  const rsiValue = rsiIndicator.momentValue(tick.price);
  console.log(`${convertUnixToIST(tick.timestamp)}, LTP: ${tick.price}, RSI: ${rsiValue}`);

  if (isNewMinute(tick.timestamp)) {
    const finalRsiValue = rsiIndicator.nextValue(tick.price);
    console.log(`\n --------------------------------------`);
    // console.log(`Candle Closed at Tick: ${tick.price}, Final RSI: ${finalRsiValue}`);
  }
}
// Binance WebSocket URL for BTCUSDT price ticker
const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');

// When a connection is opened
ws.on('open', function open() {
    console.log('Connected to Binance WebSocket for BTCUSDT trades');
});

// When a message is received (live price updates)
ws.on('message', function incoming(data) {
    const trade = JSON.parse(data);  // Parse the incoming data
    const price = trade.p;  // 'p' represents the price field in Binance trade stream
    // console.log(JSON.stringify(trade));
    // console.log(`Live BTC price: ${price} USDT`);
    processTick({price:price, timestamp: trade.E})
});

// Handle errors
ws.on('error', (error) => {
    console.error(`WebSocket error: ${error.message}`);
});

// Handle WebSocket close
ws.on('close', () => {
    console.log('WebSocket connection closed');
});

setTimeout(() => {
  ws.close();  // Close the WebSocket connection
  console.log('WebSocket connection closed after 1 minute');
}, 1200000);  // 60000 ms = 1 minute

function convertUnixToIST(unixTimestamp) {
  const date = new Date(unixTimestamp);  // Unix timestamp is already in milliseconds
  const offsetIST = 5.5 * 60 * 60 * 1000;  // Offset for IST (5 hours 30 minutes in milliseconds)
  
  const dateIST = new Date(date.getTime() + offsetIST);  // Adjust to IST time
  
  const hours = dateIST.getUTCHours().toString().padStart(2, '0');  // Get hours in 24-hour format
  const minutes = dateIST.getUTCMinutes().toString().padStart(2, '0');  // Get minutes
  const seconds = dateIST.getUTCSeconds().toString().padStart(2, '0');  // Get seconds

  return `${hours}:${minutes}:${seconds}`;  // Return time as hh:mm:ss
}
