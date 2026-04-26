const axios = require('axios');
const crypto = require('crypto');

class BinanceClient {
  constructor() {
    this.baseURL = 'https://api.binance.com/api';
    this.apiKey = process.env.BINANCE_API_KEY;
    this.apiSecret = process.env.BINANCE_API_SECRET;
    this.recvWindow = 5000;
  }

  /**
   * 生成签名
   */
  signature(queryString) {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  /**
   * 获取K线数据
   */
  async getKlines(symbol, interval, limit = 500) {
    try {
      const response = await axios.get(`${this.baseURL}/v3/klines`, {
        params: {
          symbol,
          interval,
          limit: Math.min(limit, 1000)
        }
      });
      return response.data;
    } catch (error) {
      console.error(`获取K线数据失败 [${symbol} ${interval}]:`, error.message);
      throw error;
    }
  }

  /**
   * 获取当前价格
   */
  async getCurrentPrice(symbol) {
    try {
      const response = await axios.get(`${this.baseURL}/v3/ticker/price`, {
        params: { symbol }
      });
      return parseFloat(response.data.price);
    } catch (error) {
      console.error(`获取价格失败 [${symbol}]:`, error.message);
      throw error;
    }
  }

  /**
   * 获取24小时统计
   */
  async get24hStats(symbol) {
    try {
      const response = await axios.get(`${this.baseURL}/v3/ticker/24hr`, {
        params: { symbol }
      });
      return {
        symbol: response.data.symbol,
        price: parseFloat(response.data.lastPrice),
        priceChange: parseFloat(response.data.priceChange),
        priceChangePercent: parseFloat(response.data.priceChangePercent),
        highPrice: parseFloat(response.data.highPrice),
        lowPrice: parseFloat(response.data.lowPrice),
        openPrice: parseFloat(response.data.openPrice),
        volume: parseFloat(response.data.volume),
        quoteAssetVolume: parseFloat(response.data.quoteAssetVolume)
      };
    } catch (error) {
      console.error(`获取24小时统计失败 [${symbol}]:`, error.message);
      throw error;
    }
  }
}

module.exports = BinanceClient;
