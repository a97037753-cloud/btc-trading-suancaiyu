/**
 * 技术指标计算库
 * 支持: EMA, KDJ, RSI, 移动平均线等
 */

class Indicators {
  /**
   * 指数移动平均线 (EMA)
   */
  static ema(data, period) {
    if (!data || data.length < period) return [];
    
    const emaArray = [];
    const multiplier = 2 / (period + 1);
    
    // 简单移动平均线作为第一个EMA
    let sma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    emaArray.push(sma);
    
    // 计算后续EMA
    for (let i = period; i < data.length; i++) {
      sma = (data[i] - sma) * multiplier + sma;
      emaArray.push(sma);
    }
    
    return emaArray;
  }

  /**
   * 简单移动平均线 (SMA)
   */
  static sma(data, period) {
    if (!data || data.length < period) return [];
    const smaArray = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      smaArray.push(sum / period);
    }
    return smaArray;
  }

  /**
   * KDJ指标
   * @param closes 收盘价数组
   * @param highs 最高价数组
   * @param lows 最低价数组
   * @param period K线周期 (默认9)
   * @param kSmooth K值平滑周期 (默认3)
   * @param dSmooth D值平滑周期 (默认3)
   */
  static kdj(closes, highs, lows, period = 9, kSmooth = 3, dSmooth = 3) {
    if (!closes || closes.length < period) {
      return { k: [], d: [], j: [] };
    }

    const rsvArray = [];
    
    // 计算RSV (原始随机值)
    for (let i = period - 1; i < closes.length; i++) {
      const highestHigh = Math.max(...highs.slice(i - period + 1, i + 1));
      const lowestLow = Math.min(...lows.slice(i - period + 1, i + 1));
      const rsv = (highestHigh === lowestLow) 
        ? 0 
        : ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
      rsvArray.push(rsv);
    }

    // 计算K值 (RSV的EMA)
    const kArray = [];
    let k = 50;
    kArray.push(k);
    
    for (let i = 0; i < rsvArray.length; i++) {
      k = (rsvArray[i] + (kSmooth - 1) * k) / kSmooth;
      kArray.push(k);
    }

    // 计算D值 (K值的SMA)
    const dArray = [];
    for (let i = kSmooth - 1; i < kArray.length; i++) {
      const sum = kArray.slice(i - kSmooth + 1, i + 1).reduce((a, b) => a + b, 0);
      dArray.push(sum / kSmooth);
    }

    // 计算J值
    const jArray = [];
    for (let i = 0; i < Math.min(kArray.length, dArray.length); i++) {
      const j = 3 * kArray[i + kSmooth - 1] - 2 * dArray[i];
      jArray.push(j);
    }

    return {
      k: kArray,
      d: dArray,
      j: jArray,
      rsv: rsvArray
    };
  }

  /**
   * 相对强弱指标 (RSI)
   */
  static rsi(data, period = 14) {
    if (!data || data.length < period + 1) return [];
    
    const rsiArray = [];
    const changes = [];
    
    for (let i = 1; i < data.length; i++) {
      changes.push(data[i] - data[i - 1]);
    }
    
    let avgGain = 0, avgLoss = 0;
    
    // 计算第一个平均值
    for (let i = 0; i < period; i++) {
      if (changes[i] > 0) avgGain += changes[i];
      else avgLoss -= changes[i];
    }
    
    avgGain /= period;
    avgLoss /= period;
    
    for (let i = period; i < changes.length; i++) {
      const gain = changes[i] > 0 ? changes[i] : 0;
      const loss = changes[i] < 0 ? -changes[i] : 0;
      
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      
      const rs = avgGain / (avgLoss || 1);
      const rsi = 100 - (100 / (1 + rs));
      rsiArray.push(rsi);
    }
    
    return rsiArray;
  }

  /**
   * MACD指标
   */
  static macd(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEma = this.ema(data, fastPeriod);
    const slowEma = this.ema(data, slowPeriod);
    
    // 确保两个EMA长度一致
    const minLength = Math.min(fastEma.length, slowEma.length);
    const macdLine = [];
    
    for (let i = 0; i < minLength; i++) {
      macdLine.push(fastEma[fastEma.length - minLength + i] - slowEma[slowEma.length - minLength + i]);
    }
    
    const signal = this.ema(macdLine, signalPeriod);
    const histogram = [];
    
    for (let i = 0; i < Math.min(macdLine.length, signal.length); i++) {
      histogram.push(macdLine[macdLine.length - signal.length + i] - signal[i]);
    }
    
    return {
      macd: macdLine,
      signal: signal,
      histogram: histogram
    };
  }

  /**
   * 获取最高价 (指定周期内)
   */
  static highest(data, period) {
    if (!data || data.length < period) return [];
    const result = [];
    for (let i = period - 1; i < data.length; i++) {
      result.push(Math.max(...data.slice(i - period + 1, i + 1)));
    }
    return result;
  }

  /**
   * 获取最低价 (指定周期内)
   */
  static lowest(data, period) {
    if (!data || data.length < period) return [];
    const result = [];
    for (let i = period - 1; i < data.length; i++) {
      result.push(Math.min(...data.slice(i - period + 1, i + 1)));
    }
    return result;
  }

  /**
   * 检查金叉 (快线从下方穿过慢线)
   */
  static crossOver(fast, slow) {
    if (fast.length < 2 || slow.length < 2) return false;
    const len = Math.min(fast.length, slow.length);
    const curr = fast[len - 1] > slow[len - 1];
    const prev = fast[len - 2] <= slow[len - 2];
    return curr && prev;
  }

  /**
   * 检查死叉 (快线从上方穿过慢线)
   */
  static crossDown(fast, slow) {
    if (fast.length < 2 || slow.length < 2) return false;
    const len = Math.min(fast.length, slow.length);
    const curr = fast[len - 1] < slow[len - 1];
    const prev = fast[len - 2] >= slow[len - 2];
    return curr && prev;
  }

  /**
   * 标准差
   */
  static stdDev(data, period) {
    if (!data || data.length < period) return [];
    const result = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const subset = data.slice(i - period + 1, i + 1);
      const mean = subset.reduce((a, b) => a + b, 0) / period;
      const variance = subset.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
      result.push(Math.sqrt(variance));
    }
    
    return result;
  }
}

module.exports = Indicators;
