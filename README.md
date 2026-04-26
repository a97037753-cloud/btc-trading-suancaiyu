# 🚀 BTC 量化交易信号系统

> 基于双策略综合确认的自动交易信号生成系统
> 
> 支持 **5分钟、10分钟、15分钟** 三个时间框架实时分析

## 📊 系统特性

### 🎯 双策略设计

#### 策略1: EMA 趋势分析
- 使用 EMA (5, 20, 44, 55, 233, 250) 多周期
- 识别价格上升/下降趋势
- 两组趋势线监控 (44/55) 和 (233/250)

#### 策略2: KDJ 金叉死叉
- K线周期: 36
- D值平滑: 5
- 金叉 = 买入信号
- 死叉 = 卖出信号
- 超卖 (K<20) / 超买 (K>80) 区间识别

### ✨ 信号等级

| 信号类型 | 条件 | 信心度 | 说明 |
|--------|------|--------|------|
| **STRONG_BUY** 🟢 | EMA上升 + KDJ金叉 | 95% | 强买入，多时间框架确认 |
| **BUY** 🟢 | EMA上升 或 KDJ金叉 | 60% | 买入信号，需谨慎 |
| **STRONG_SELL** 🔴 | EMA下降 + KDJ死叉 | 95% | 强卖出，多时间框架确认 |
| **SELL** 🔴 | EMA下降 或 KDJ死叉 | 60% | 卖出信号，需谨慎 |
| **WAIT** ⏸️ | 无确认信号 | 0% | 观望，等待下一个信号 |

## 🛠️ 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置API密钥

复制 `.env.example` 为 `.env`:

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 Binance API 信息:

```env
BINANCE_API_KEY=your_api_key_here
BINANCE_API_SECRET=your_api_secret_here
PORT=3000
```

**获取 Binance API 密钥:**
1. 访问 [Binance 官网](https://www.binance.com)
2. 登录账号
3. 进入 "账户" → "API 管理"
4. 创建新的 API Key
5. 确保只开启 "读取" 权限 (安全考虑)

### 3. 启动系统

```bash
npm start
```

系统会在 `http://localhost:3000` 启动

### 4. 打开Web界面

在浏览器中访问: **http://localhost:3000**


## 🐳 Docker 部署（推荐生产环境）

### 1. 准备环境变量

```bash
cp .env.example .env
# 编辑 .env，填入 BINANCE_API_KEY / BINANCE_API_SECRET
```

### 2. 启动服务

```bash
docker compose up -d --build
```

### 3. 检查运行状态

```bash
docker compose ps
curl http://localhost:3000/api/health
```

### 4. 常用运维命令

```bash
# 查看日志
docker compose logs -f

# 重启服务
docker compose restart

# 停止并删除容器
docker compose down
```

> 默认对外端口为 `3000`，如需修改请编辑 `docker-compose.yml` 的端口映射。

## 📡 API 接口文档

### 获取完整分析

```http
GET /api/analysis
```

**返回示例:**
```json
{
  "success": true,
  "timestamp": "2026-04-26 10:30:45",
  "intervals": {
    "5m": {
      "signal": {
        "type": "STRONG_BUY",
        "confidence": 95,
        "reasons": ["EMA全线上升", "KDJ金叉形成"]
      },
      "price": 65234.50
    },
    "10m": { ... },
    "15m": { ... }
  },
  "synthesis": {
    "type": "STRONG_BUY",
    "confidence": 95,
    "reasoning": ["多时间框架强买确认"]
  }
}
```

### 获取单个时间框架分析

```http
GET /api/analysis/:interval
```

参数:
- `interval`: `5m`, `10m`, `15m`

**示例:**
```http
GET /api/analysis/5m
```

### 获取最新信号

```http
GET /api/signal/latest
```

### 获取信号历史

```http
GET /api/signal/history?limit=50
```

参数:
- `limit`: 返回记录数 (默认50)

### 获取当前价格

```http
GET /api/price
```

### 获取24小时统计

```http
GET /api/stats/24h
```

### 健康检查

```http
GET /api/health
```

## 📁 项目结构

```
btc-trading-suancaiyu/
├── server.js                 # Express 服务器主文件
├── package.json              # Node.js 依赖配置
├── .env.example              # 环境变量模板
├── .gitignore               # Git 忽略文件
│
├── lib/                      # 核心库文件
│   ├── binanceClient.js     # Binance API 客户端
│   ├── indicators.js        # 技术指标计算 (EMA, KDJ, RSI, MACD)
│   └── signalEngine.js      # 信号生成引擎 (策略综合)
│
├── middleware/               # 中间件
│   └── staticFiles.js       # 静态文件服务
│
└── public/                   # 前端文件
    └── index.html           # Web 交互界面
```

## 🔧 指标计算说明

### EMA (指数移动平均)

用于识别价格趋势，周期:
- **5, 20**: 短期趋势
- **44, 55**: 中期趋势
- **233, 250**: 长期趋势

**买入条件:**
```
价格 > EMA5 > EMA20 > EMA44 > EMA55 > EMA233 > EMA250
→ 完美上升趋势
```

**卖出条件:**
```
价格 < EMA5 < EMA20 < EMA44 < EMA55 < EMA233 < EMA250
→ 完美下降趋势
```

### KDJ 指标

**参数:**
- K线周期: 36
- D值平滑: 5
- 超卖线: 20
- 中轴线: 50
- 超买线: 80

**金叉信号:**
```
前一根: K <= D
当前根: K > D
→ 形成金叉，买入信号
```

**死叉信号:**
```
前一根: K >= D
当前根: K < D
→ 形成死叉，卖出信号
```

## 💡 Web界面功能

### 实时显示
- ✅ 三个时间框架独立分析
- ✅ 买卖信号强度显示
- ✅ 信心度进度条
- ✅ 技术指标数值展示
- ✅ 信号形成原因说明

### 交互功能
- 🔄 **立即分析**: 手动触发分析
- ⏱️ **自动更新**: 每30秒自动刷新
- 📈 **信号历史**: 查看过去的信号记录
- 🔁 **页面刷新**: 重新加载系统

## ⚙️ 参数调整

编辑 `lib/signalEngine.js` 中的配置:

```javascript
this.emaConfig = {
  fast: 5,      // 可修改
  mid: 20,      // 可修改
  slow: 44,     // 可修改
  trend1: 55,   // 可修改
  trend2: 233   // 可修改
};

this.kdjConfig = {
  k: 36,           // K线周期
  d: 5,            // D值平滑周期
  lineUp: 80,      // 超买线
  lineMiddle: 50,  // 中轴线
  lineDown: 20     // 超卖线
};
```

## 🔐 安全建议

⚠️ **重要事项:**

1. **API Key 权限**
   - 仅使用 "只读" 权限
   - 永远不要开启 "交易" 权限
   - 设置 IP 白名单

2. **保护 `.env` 文件**
   - 不要上传到 Git
   - 不要分享给他人
   - 定期更换密钥

3. **环境部署**
   - 在安全的服务器上运行
   - 使用 HTTPS 传输
   - 定期备份配置

## 🚀 未来计划

- [ ] 支持更多交易对 (ETH, BNB 等)
- [ ] 添加历史数据回测功能
- [ ] 集成 Telegram/邮件通知
- [ ] Web 端参数配置界面
- [ ] 数据库存储交易记录
- [ ] 移动端应用

## 📝 常见问题

### Q: 系统显示 "API 连接失败"
**A:** 
- 检查 `.env` 文件中的 API Key 是否正确
- 确认网络连接正常
- 检查 Binance API 是否可用

### Q: 信号准确率如何?
**A:**
- 系统只提供信号，不保证 100% 准确
- 建议配合其他技术分析手段
- 强买/强卖信号 (95% 信心度) 准确率较高

### Q: 能否添加自动下单功能?
**A:**
- 当前版本仅生成信号
- 可通过修改代码添加 Binance 交易 API 调用
- 建议先充分测试后再实盘操作

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 💬 支持

如有问题或建议，欢迎提交 Issue 或 Pull Request!

---

**⚠️ 风险声明:**

本系统仅供学习交流使用，不构成投资建议。
使用本系统交易产生的任何亏损，作者概不负责。
请自行承担使用风险，谨慎交易!

---

**最后更新:** 2026-04-26
