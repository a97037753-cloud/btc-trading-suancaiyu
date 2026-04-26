const express = require('express');
const path = require('path');
require('dotenv').config();

const BinanceClient = require('./lib/binanceClient');
const SignalEngine = require('./lib/signalEngine');
const Indicators = require('./lib/indicators');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 初始化
const binance = new BinanceClient();
const signalEngine = new SignalEngine();
let lastAnalysis = {};
let signalHistory = [];
const MAX_HISTORY = 100;

// 缓存K线数据
const klineCache = {};

/**
 * 获取指定时间框架的K线数据
 */
app.get('/api/klines/:interval', async (req, res) => {
  try {
    const { interval } = req.params;
    const limit = parseInt(req.query.limit) || 300;
    
    const klines = await binance.getKlines('BTCUSDT', interval, limit);
    res.json({ success: true, data: klines });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取单个时间框架的完整分析
 */
app.get('/api/analysis/:interval', async (req, res) => {
  try {
    const { interval } = req.params;
    const klines = await binance.getKlines('BTCUSDT', interval, 300);
    
    if (!klines || klines.length < 50) {
      return res.status(400).json({ success: false, error: '数据不足' });
    }

    // 提取收盘价
    const closes = klines.map(k => parseFloat(k[4]));
    const highs = klines.map(k => parseFloat(k[2]));
    const lows = klines.map(k => parseFloat(k[3]));
    const times = klines.map(k => new Date(parseInt(k[0])).toLocaleString('zh-CN'));

    // 计算指标
    const analysis = signalEngine.analyze(closes, highs, lows, interval);
    
    // 获取信号
    const signal = signalEngine.generateSignal(analysis, interval);

    res.json({
      success: true,
      interval,
      timestamp: new Date().toLocaleString('zh-CN'),
      price: closes[closes.length - 1],
      analysis,
      signal,
      klineCount: klines.length,
      lastKlineTime: times[times.length - 1]
    });
  } catch (error) {
    console.error(`分析错误 [${req.params.interval}]:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取所有时间框架的综合分析
 */
app.get('/api/analysis', async (req, res) => {
  try {
    const intervals = ['5m', '10m', '15m'];
    const results = {};
    const allSignals = [];

    for (const interval of intervals) {
      const klines = await binance.getKlines('BTCUSDT', interval, 300);
      if (!klines || klines.length < 50) continue;

      const closes = klines.map(k => parseFloat(k[4]));
      const highs = klines.map(k => parseFloat(k[2]));
      const lows = klines.map(k => parseFloat(k[3]));

      const analysis = signalEngine.analyze(closes, highs, lows, interval);
      const signal = signalEngine.generateSignal(analysis, interval);

      results[interval] = {
        analysis,
        signal,
        price: closes[closes.length - 1],
        timestamp: new Date(parseInt(klines[klines.length - 1][0])).toLocaleString('zh-CN')
      };

      allSignals.push(signal);
    }

    // 综合信号判断
    const synthSignal = signalEngine.synthesizeSignals(allSignals);

    // 保存到历史
    if (synthSignal.type !== 'WAIT') {
      const historyItem = {
        timestamp: new Date().toLocaleString('zh-CN'),
        signal: synthSignal.type,
        confidence: synthSignal.confidence,
        price: results['5m']?.price || 0,
        details: synthSignal
      };
      signalHistory.unshift(historyItem);
      if (signalHistory.length > MAX_HISTORY) {
        signalHistory.pop();
      }
    }

    lastAnalysis = results;

    res.json({
      success: true,
      timestamp: new Date().toLocaleString('zh-CN'),
      intervals: results,
      synthesis: synthSignal,
      signalHistory: signalHistory.slice(0, 20)
    });
  } catch (error) {
    console.error('综合分析错误:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取最新信号
 */
app.get('/api/signal/latest', async (req, res) => {
  try {
    const klines5m = await binance.getKlines('BTCUSDT', '5m', 300);
    const closes = klines5m.map(k => parseFloat(k[4]));
    const highs = klines5m.map(k => parseFloat(k[2]));
    const lows = klines5m.map(k => parseFloat(k[3]));

    const analysis = signalEngine.analyze(closes, highs, lows, '5m');
    const signal = signalEngine.generateSignal(analysis, '5m');

    res.json({
      success: true,
      signal,
      price: closes[closes.length - 1],
      timestamp: new Date().toLocaleString('zh-CN')
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取信号历史
 */
app.get('/api/signal/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({
    success: true,
    history: signalHistory.slice(0, limit),
    total: signalHistory.length
  });
});

/**
 * 获取当前价格
 */
app.get('/api/price', async (req, res) => {
  try {
    const price = await binance.getCurrentPrice('BTCUSDT');
    res.json({ success: true, price, timestamp: new Date().toLocaleString('zh-CN') });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取24小时统计
 */
app.get('/api/stats/24h', async (req, res) => {
  try {
    const stats = await binance.get24hStats('BTCUSDT');
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 健康检查
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toLocaleString('zh-CN'),
    signals: signalHistory.length
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ success: false, error: '接口不存在' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n🚀 BTC 交易信号系统已启动`);
  console.log(`📊 访问地址: http://localhost:${PORT}`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`\n📈 监控时间框架: 5分钟、10分钟、15分钟`);
  console.log(`🎯 双策略: EMA趋势 + KDJ金叉死叉`);
  console.log(`\n⚠️  请确保 .env 文件已配置 BINANCE_API_KEY 和 BINANCE_API_SECRET\n`);
});

module.exports = app;
