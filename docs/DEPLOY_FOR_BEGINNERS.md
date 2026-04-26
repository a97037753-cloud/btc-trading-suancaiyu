# 给 0 基础新手的完整部署与测试指南

> 目标：把 BTC 量化信号系统在你自己的服务器上跑起来，并且能确认它真的在工作。

## 0. 先理解：这个项目是“信号系统”，不是自动下单机器人

- 它会拉取 Binance 行情，计算 EMA + KDJ，输出买卖信号。
- 它**不会直接下单**（默认仅分析）。
- 新手建议先把它当作“学习 + 观察信号”的系统来跑。

---

## 1. 最简单的测试（本地电脑）

### 1.1 你需要先安装

- [Node.js LTS](https://nodejs.org/)（建议 20.x）
- Git

安装后在终端执行：

```bash
node -v
npm -v
git --version
```

如果都能输出版本号，说明环境 OK。

### 1.2 下载代码并安装依赖

```bash
git clone <你的仓库地址>
cd btc-trading-suancaiyu
npm install
```

### 1.3 配置环境变量

```bash
cp .env.example .env
```

然后打开 `.env`，填入：

```env
BINANCE_API_KEY=你的API_KEY
BINANCE_API_SECRET=你的API_SECRET
PORT=3000
```

### 1.4 启动系统

```bash
npm start
```

如果看到类似 `BTC 交易信号系统已启动`，说明服务已起来。

### 1.5 验证是否成功

新开一个终端执行：

```bash
curl http://localhost:3000/api/health
```

看到 `success: true` 就表示成功。

再测试核心接口：

```bash
curl http://localhost:3000/api/analysis
curl http://localhost:3000/api/signal/latest
```

---

## 2. 一键自动测试脚本（推荐新手）

项目内置脚本（基础模式）：

```bash
npm run test:smoke
```

基础模式只检测 `/api/health`，适合你还没配置 Binance API 的情况。

完整模式（需要可用 Binance API Key）：

```bash
npm run test:smoke:full
```

完整模式会检测：

1. `/api/health`
2. `/api/price`
3. `/api/signal/latest`

都返回 200 才算通过。

---

## 3. 部署到哪里？新手推荐顺序

## 方案 A（最推荐）：云服务器 + Docker（通用、稳定）

适用：阿里云/腾讯云/AWS/Google Cloud 任意 Linux 服务器。

### 步骤

1. 购买一台 Linux 云服务器（Ubuntu 22.04）
2. 开放安全组端口：`22`（SSH）和 `3000`（项目端口）
3. 安装 Docker & Docker Compose
4. 上传代码并配置 `.env`
5. 执行：

```bash
docker compose up -d --build
```

6. 浏览器访问：

```text
http://你的服务器公网IP:3000
```

7. 验证：

```bash
curl http://127.0.0.1:3000/api/health
```

## 方案 B：Railway / Render（一键部署平台）

适用：纯新手，不想自己运维服务器。

- 优点：简单；自动构建；有日志面板。
- 缺点：免费额度有限；长期成本可能更高。

部署要点：

1. 导入 GitHub 仓库
2. 设置环境变量（BINANCE_API_KEY / BINANCE_API_SECRET）
3. 设置启动命令 `npm start`
4. 平台分配域名后访问 `/api/health`

---

## 4. 生产环境必做（非常重要）

1. **API 权限只开只读**，不要开交易权限。
2. 使用强密码 + SSH 密钥登录服务器。
3. 配置日志轮转，避免磁盘写满。
4. 定期更新系统和依赖。
5. 给接口加访问控制（Nginx Basic Auth / IP 白名单）。

---

## 5. 常见报错排查

## 5.1 `BINANCE_API_KEY 未配置`

- 检查 `.env` 是否存在、变量名是否正确。
- 修改后要重启服务。

## 5.2 `接口 500`

- 看日志：

```bash
docker compose logs -f
# 或
npm start
```

- 常见原因：网络无法访问 Binance，或 API key 不可用。

## 5.3 `docker: command not found`

说明 Docker 未安装，先安装 Docker 再部署。

---

## 6. 给新手的建议

- 先在本地跑通，再上云。
- 先做“观察信号”，不要实盘自动交易。
- 一次只改一个配置，出错更容易排查。

祝你部署顺利 🚀
