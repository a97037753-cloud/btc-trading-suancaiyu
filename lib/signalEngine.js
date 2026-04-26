const Indicators = require('./indicators');

/**
 * 信号生成引擎
 * 综合两套策略: EMA趋势 + KDJ金叉死叉
 */
class SignalEngine {
  constructor() {
    // 参数配置
    this.emaConfig = {
      fast: 5,
      mid: 20,
      slow: 44,
      trend1: 55,
      trend2: 233
    };

    this.kdjConfig = {
      k: 36,
      d: 5,
      lineUp: 80,
      lineMiddle: 50,
      lineDown: 20
    };
  }

  /**
   * 完整分析 (策略1 + 策略2)
   */
  analyze(closes, highs, lows, interval) {
    try {
      // 策略1: EMA分析
      const emaAnalysis = this.analyzeEMA(closes, interval);

      // 策略2: KDJ分析
      const kdjAnalysis = this.analyzeKDJ(closes, highs, lows);

      return {
        ema: emaAnalysis,
        kdj: kdjAnalysis,
        timestamp: new Date().toISOString(),
        interval
      };
    } catch (error) {
      console.error('分析错误:', error);
      return { error: error.message };
    }
  }

  /**
   * 策略1: EMA趋势分析
   */
  analyzeEMA(closes, interval) {
    if (closes.length < 250) {
      return { error: '数据不足' };
    }

    // 计算各个EMA
    const ema5 = Indicators.ema(closes, 5);
    const ema20 = Indicators.ema(closes, 20);
    const ema44 = Indicators.ema(closes, 44);
    const ema55 = Indicators.ema(closes, 55);
    const ema233 = Indicators.ema(closes, 233);
    const ema250 = Indicators.ema(closes, 250);

    const lastIdx = closes.length - 1;
    const prevIdx = closes.length - 2;

    // 当前值
    const current = {
      price: closes[lastIdx],
      ema5: ema5[ema5.length - 1],
      ema20: ema20[ema20.length - 1],
      ema44: ema44[ema44.length - 1],
      ema55: ema55[ema55.length - 1],
      ema233: ema233[ema233.length - 1],
      ema250: ema250[ema250.length - 1]
    };

    // 前一根K线值
    const previous = {
      price: closes[prevIdx],
      ema5: ema5[ema5.length - 2] || ema5[ema5.length - 1],
      ema20: ema20[ema20.length - 2] || ema20[ema20.length - 1],
      ema44: ema44[ema44.length - 2] || ema44[ema44.length - 1],
      ema55: ema55[ema55.length - 2] || ema55[ema55.length - 1],
      ema233: ema233[ema233.length - 2] || ema233[ema233.length - 1],
      ema250: ema250[ema250.length - 2] || ema250[ema250.length - 1]
    };

    // 判断EMA上升趋势
    const emaUptrend = 
      current.ema5 > current.ema20 &&
      current.ema20 > current.ema44 &&
      current.ema44 > current.ema55 &&
      current.ema55 > current.ema233 &&
      current.ema233 > current.ema250 &&
      current.price > current.ema5;

    // 判断EMA下降趋势
    const emaDowntrend =
      current.ema5 < current.ema20 &&
      current.ema20 < current.ema44 &&
      current.ema44 < current.ema55 &&
      current.ema55 < current.ema233 &&
      current.ema233 < current.ema250 &&
      current.price < current.ema5;

    // 判断趋势转折
    const prevUptrendStrong = previous.ema44 > previous.ema55 && previous.ema55 > previous.ema233;
    const currUptrendStrong = current.ema44 > current.ema55 && current.ema55 > current.ema233;
    const trendChange = (prevUptrendStrong && !currUptrendStrong) || (!prevUptrendStrong && currUptrendStrong);

    // 两组趋势线
    const trendLine1 = {
      fast: current.ema44,
      slow: current.ema55,
      crossed: Indicators.crossOver([current.ema44], [current.ema55]) || 
               Indicators.crossDown([current.ema44], [current.ema55])
    };

    const trendLine2 = {
      fast: current.ema233,
      slow: current.ema250,
      crossed: Indicators.crossOver([current.ema233], [current.ema250]) || 
               Indicators.crossDown([current.ema233], [current.ema250])
    };

    return {
      current,
      previous,
      uptrend: emaUptrend,
      downtrend: emaDowntrend,
      trendChange,
      trendLine1,
      trendLine2,
      strength: this.calculateEMAStrength(emaUptrend, emaDowntrend, current, previous)
    };
  }

  /**
   * 策略2: KDJ分析
   */
  analyzeKDJ(closes, highs, lows) {
    if (closes.length < 50) {
      return { error: '数据不足' };
    }

    const kdj = Indicators.kdj(closes, highs, lows, 36, 5, 5);

    if (kdj.k.length < 2 || kdj.d.length < 2) {
      return { error: 'KDJ计算失败' };
    }

    const lastIdx = kdj.k.length - 1;
    const prevIdx = kdj.k.length - 2;

    const current = {
      k: kdj.k[lastIdx],
      d: kdj.d[lastIdx],
      j: kdj.j[lastIdx] || (3 * kdj.k[lastIdx] - 2 * kdj.d[lastIdx])
    };

    const previous = {
      k: kdj.k[prevIdx],
      d: kdj.d[prevIdx],
      j: kdj.j[prevIdx] || (3 * kdj.k[prevIdx] - 2 * kdj.d[prevIdx])
    };

    // 金叉判断
    const goldCross = previous.k <= previous.d && current.k > current.d;
    // 死叉判断
    const deadCross = previous.k >= previous.d && current.k < current.d;

    // 区间判断
    const inOversold = current.k < this.kdjConfig.lineDown;
    const inOverbought = current.k > this.kdjConfig.lineUp;
    const inMiddle = current.k >= this.kdjConfig.lineDown && current.k <= this.kdjConfig.lineUp;

    // K值上升/下降
    const kRising = current.k > previous.k;
    const kFalling = current.k < previous.k;

    return {
      current,
      previous,
      goldCross,      // 金叉 = 买入信号
      deadCross,      // 死叉 = 卖出信号
      inOversold,     // 超卖
      inOverbought,   // 超买
      inMiddle,       // 中间
      kRising,
      kFalling,
      strength: this.calculateKDJStrength(goldCross, deadCross, current, inOversold, inOverbought)
    };
  }

  /**
   * 计算EMA强度 (0-100)
   */
  calculateEMAStrength(uptrend, downtrend, current, previous) {
    if (!uptrend && !downtrend) return 0;

    let strength = 50;

    if (uptrend) {
      // 上升趋势
      const ratio = (current.price - current.ema250) / (current.ema5 - current.ema250);
      strength = Math.min(100, 50 + ratio * 50);
    } else if (downtrend) {
      // 下降趋势
      const ratio = (current.ema250 - current.price) / (current.ema250 - current.ema5);
      strength = Math.max(0, 50 - ratio * 50);
    }

    return Math.round(strength);
  }

  /**
   * 计算KDJ强度 (0-100)
   */
  calculateKDJStrength(goldCross, deadCross, current) {
    if (goldCross) {
      // 金叉: 强度 = K值相对位置
      return Math.min(100, Math.max(0, current.k));
    } else if (deadCross) {
      // 死叉: 强度 = 100 - K值相对位置
      return Math.min(100, Math.max(0, 100 - current.k));
    }
    return 50;
  }

  /**
   * 生成单个时间框架的信号
   */
  generateSignal(analysis, interval) {
    if (analysis.error) {
      return { type: 'ERROR', message: analysis.error, confidence: 0 };
    }

    const ema = analysis.ema;
    const kdj = analysis.kdj;

    let type = 'WAIT';
    let reason = [];
    let buyReasons = [];
    let sellReasons = [];

    // 买入条件
    if (ema.uptrend && kdj.goldCross) {
      type = 'STRONG_BUY';
      buyReasons = [
        'EMA全线上升',
        'KDJ金叉形成'
      ];
    } else if (ema.uptrend && kdj.kRising && kdj.inOversold) {
      type = 'BUY';
      buyReasons = [
        'EMA上升趋势',
        'KDJ超卖反弹'
      ];
    } else if (kdj.goldCross && ema.current.price > ema.current.ema20) {
      type = 'BUY';
      buyReasons = [
        'KDJ金叉信号',
        '价格在EMA20上方'
      ];
    }

    // 卖出条件
    if (ema.downtrend && kdj.deadCross) {
      type = 'STRONG_SELL';
      sellReasons = [
        'EMA全线下降',
        'KDJ死叉形成'
      ];
    } else if (ema.downtrend && kdj.kFalling && kdj.inOverbought) {
      type = 'SELL';
      sellReasons = [
        'EMA下降趋势',
        'KDJ超买回调'
      ];
    } else if (kdj.deadCross && ema.current.price < ema.current.ema20) {
      type = 'SELL';
      sellReasons = [
        'KDJ死叉信号',
        '价格在EMA20下方'
      ];
    }

    const reasons = buyReasons.length > 0 ? buyReasons : sellReasons;

    // 信心度
    let confidence = 0;
    if (type === 'STRONG_BUY' || type === 'STRONG_SELL') {
      confidence = 95;
    } else if (type === 'BUY' || type === 'SELL') {
      confidence = 60;
    } else {
      confidence = 0;
    }

    return {
      type,
      interval,
      confidence,
      reasons,
      emaStatus: {
        uptrend: ema.uptrend,
        downtrend: ema.downtrend,
        price: ema.current.price,
        ema5: ema.current.ema5,
        ema20: ema.current.ema20
      },
      kdjStatus: {
        goldCross: kdj.goldCross,
        deadCross: kdj.deadCross,
        k: kdj.current.k,
        d: kdj.current.d,
        inOversold: kdj.inOversold,
        inOverbought: kdj.inOverbought
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 综合多个时间框架的信号
   */
  synthesizeSignals(signals) {
    if (!signals || signals.length === 0) {
      return {
        type: 'WAIT',
        confidence: 0,
        reasoning: '无有效信号'
      };
    }

    // 统计各类型信号
    const buyCount = signals.filter(s => s.type.includes('BUY')).length;
    const sellCount = signals.filter(s => s.type.includes('SELL')).length;
    const strongBuyCount = signals.filter(s => s.type === 'STRONG_BUY').length;
    const strongSellCount = signals.filter(s => s.type === 'STRONG_SELL').length;

    let synthesisType = 'WAIT';
    let confidence = 0;
    let reasoning = [];

    // 综合判断
    if (strongBuyCount >= 2) {
      // 至少2个时间框架强买
      synthesisType = 'STRONG_BUY';
      confidence = 95;
      reasoning = ['多时间框架强买确认'];
    } else if (buyCount >= 2 && strongBuyCount > 0) {
      // 混合买入
      synthesisType = 'BUY';
      confidence = 75;
      reasoning = ['多时间框架买入确认'];
    } else if (buyCount >= 2) {
      synthesisType = 'BUY';
      confidence = 60;
      reasoning = ['多时间框架买入信号'];
    } else if (strongSellCount >= 2) {
      synthesisType = 'STRONG_SELL';
      confidence = 95;
      reasoning = ['多时间框架强卖确认'];
    } else if (sellCount >= 2 && strongSellCount > 0) {
      synthesisType = 'SELL';
      confidence = 75;
      reasoning = ['多时间框架卖出确认'];
    } else if (sellCount >= 2) {
      synthesisType = 'SELL';
      confidence = 60;
      reasoning = ['多时间框架卖出信号'];
    }

    return {
      type: synthesisType,
      confidence,
      reasoning,
      details: {
        buySignals: buyCount,
        sellSignals: sellCount,
        strongBuy: strongBuyCount,
        strongSell: strongSellCount,
        timeframes: signals.map(s => ({
          interval: s.interval,
          type: s.type,
          confidence: s.confidence
        }))
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = SignalEngine;
