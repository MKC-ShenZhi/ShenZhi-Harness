# ShenZhi Harness 新人上手指南

欢迎加入深知（ShenZhi）Harness。本文帮你在最短时间内跑起本机 Harness 和工作台，并知道文档在哪里。预计阅读 15 分钟，环境搭建 20 分钟。

---

## 一、这个项目是什么

深知 Harness 是面向特定领域任务问题的方案自动研究智能体框架。领域方案注册之后，由本机服务调度运行并留下可下载的成果。仓库是单体工程：

```
szh-harness/
├── apps/
│   ├── server/         # Node Harness（任务 / 方案 / Run / Artifact）
│   ├── szh-app/        # Electron + React 工作台
│   └── client/         # 旧 Web 预览，回归用
├── solutions/          # 领域方案定义
├── docs/               # 架构、API、能力状态
├── README.md           # 项目总览与运行边界
└── ONBOARDING.md       # 本文
```

**职责边界**：页面与交互归 `apps/szh-app`，执行、校验和落盘归 `apps/server`。工作台只通过 HTTP 访问 Harness，不直接调用模型或专业计算环境。

## 二、先读这三份规则

1. 根目录 [AGENTS.md](AGENTS.md)：全仓库协作原则
2. [docs/engineering/git-conventions.md](docs/engineering/git-conventions.md)：提交信息与入库范围
3. 你主要工作目录下的 `AGENTS.md`（[apps/server/AGENTS.md](apps/server/AGENTS.md)、[apps/szh-app/AGENTS.md](apps/szh-app/AGENTS.md)）

## 三、本地环境搭建

### 3.1 前置要求

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | ≥ 22.19 | 工作台与 Harness 共用 |
| npm | 随 Node | 根目录与 `apps/szh-app` 各有一份锁文件 |
| Git | — | 入库范围见根目录 `.gitignore` 白名单 |

Windows 10/11 是当前主要验证平台。AIC 真实推理另需本机 Python 与受控运行包，查询和文本自检不需要。

### 3.2 启动 Harness

```bash
npm ci
npm start                     # http://127.0.0.1:4782
```

确认：

```bash
curl http://127.0.0.1:4782/api/health
```

无模型密钥也可以启动。健康检查里的 `model_configured` 只说明配置是否存在，不表示上游模型可用。

需要真实对话或 NOTAM 推理时，复制 [.env.example](.env.example) 为 `.env`，填入 `SZH_MODEL_API_KEY`。端口、AIC 资料目录不从 `.env` 读取，要在进程环境里设置。

### 3.3 启动工作台

```bash
cd apps/szh-app
npm ci
npm run dev:desktop           # 开发
```

新的 `var/` 里方案注册表是空的。可以用隔离沙箱发布一条文本词频自检方案：

```bash
node apps/szh-app/scripts/harness-sandbox.mjs --port 4790 --dir <一个新建的临时目录>
```

再用 `SZH_HARNESS_URL=http://127.0.0.1:4790` 启动工作台。也可以在设置里切换到演示数据源。演示数据不进入真实服务。

Windows 下也可双击根目录 `Start-SZH-Next.cmd`。

### 3.4 注册一条方案

```bash
node scripts/import-solution.mjs solutions/aic-flowproxy/manifest-v01.json
```

注册只校验 Manifest。HTTP 导入接口固定拒绝，不要在工作台里找发布按钮。

### 3.5 提交前的检查

```bash
npm test                                      # Harness 回归
cd apps/szh-app && npm run typecheck && npm test
```

改哪一层就跑哪一层。缺少 `SZH_AIC_MATERIALS` 时，四项旧 AIC 归档测试会跳过，这是预期结果。

## 四、Git 协作

- Commit 格式：`<type>: <中文描述>`。`type` 用 `feat` / `fix` / `refactor` / `docs` / `chore` / `test`。
- 一个 commit 对应一个明确目的。
- 密钥、`var/`、PDF、模型权重、截图和构建产物不入库。`.gitignore` 是白名单，新路径需要显式放行。
- 完整细则：[docs/engineering/git-conventions.md](docs/engineering/git-conventions.md)。

## 五、遇到问题去哪查

| 问题类型 | 去处 |
|----------|------|
| 怎么启动、环境变量、运行边界 | [README.md](README.md) |
| 模块怎么分工、数据写在哪 | [docs/engineering/architecture.md](docs/engineering/architecture.md) |
| 某项能力有没有实现 | [docs/engineering/status.md](docs/engineering/status.md) |
| HTTP 路径和错误码 | [docs/harness/api.md](docs/harness/api.md) |
| 工作台字段怎么对应后端 | [docs/harness/client-contract.md](docs/harness/client-contract.md) |
| 工作台页面和已知降级 | [apps/szh-app/README.md](apps/szh-app/README.md) |
| 发布前的安全与稳定性门槛 | [docs/engineering/tech-debt.md](docs/engineering/tech-debt.md) |

## 六、常见坑

1. **复制了 `.env.example` 但端口没变** → `SZH_PORT` 和 AIC 变量只读进程环境。
2. **工作台方案列表是空的** → 新数据目录不会自动导入 `solutions/`。用 CLI 或沙箱注册。
3. **接口导入方案返回 403** → 这是固定行为。使用 `scripts/import-solution.mjs`。
4. **AIC 测试失败或跳过** → 未设置授权资料目录时跳过是正常的。路径已设置但文件缺失则会报错。
5. **沙箱写进了项目 `var/`** → 每次指定新建临时目录，不要使用 `--fresh` 清理已有目录。
6. **把 Harness 端口转到局域网** → 当前没有认证。只在本机 loopback 使用。
