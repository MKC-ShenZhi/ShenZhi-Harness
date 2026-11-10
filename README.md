# 深知 ShenZhi · Harness

> 深知 Harness 是面向特定领域任务问题的**方案自动研究智能体框架**。它把领域方案注册为可版本化的研究单元，由本机 Harness 调度运行、沉淀成果，并保留航行情报核对与 AIC 归档这两条专业任务链路。
>
> 本仓库是其工程：`apps/server` 承载 Harness HTTP 服务，`apps/szh-app` 是 Electron + React 工作台。两条后端接口共用同一进程，状态分开记录。

---

## 快速开始

要求 Node.js 22.19 或以上和 npm。Harness 在项目根目录启动：

```bash
npm ci
npm start          # 默认 http://127.0.0.1:4782
```

用 `GET /api/health` 确认服务。默认读写本机 `var/`，启动时会恢复或标记中断的已有记录。查询状态和注册方案不需要模型凭据。真实对话和 NOTAM 推理需要按 [.env.example](.env.example) 配置模型。

工作台（可选，查看方案、运行和成果）：

```bash
cd apps/szh-app
npm ci
npm run dev:desktop    # Vite 热更新 + Electron
# 或先构建再启动：
npm run build && npm start
```

Windows 可在根目录运行 `Start-SZH-Next.cmd`，自动安装依赖、拉起 Harness 并打开工作台。参数 `rebuild` 强制重新构建，`mock` 使用演示数据源。

> 新人入门请先看 [ONBOARDING.md](ONBOARDING.md)。协作约束见 [AGENTS.md](AGENTS.md)。

打开工作台后，数据源默认连接 `http://127.0.0.1:4782`。桌面端使用 Hash 路由，例如 `#/solutions`。

---

## 架构总览

```
工作台 apps/szh-app（Electron renderer）
  │  HTTP，只访问 Harness，不直接调用模型
  ▼
127.0.0.1:4782 ──── apps/server/main.mjs
  │
  ├── /api/tasks          旧任务：NOTAM 解析、通用对话、AIC 归档查看
  │     └── DSH SDK → 模型服务 / 专业插件 / 资料索引
  │
  └── /api/v1             方案注册、Run、Artifact
        └── SolutionRegistry + RunService
              └── 本机执行器（文本自检或 AIC Python 子进程）
  │
  ▼
var/   tasks、runs、conversations、dsh、solution-versions、solution-runs
```

| 入口 | 位置 | 说明 |
|------|------|------|
| Harness | `apps/server` | Node HTTP。旧任务与版本化 Run 两条链路 |
| 工作台 | `apps/szh-app` | Electron + React。方案库、运行、成果、对话 |
| 旧预览 | `apps/client` | 旧 Web 预览与工作台静态资源，供回归保留 |
| 领域方案 | `solutions/` | 航行情报、AIC 等方案定义与 Manifest |

浏览器打开根地址会跳到旧 Web 预览，该预览依赖完整工程里的前端构建产物。新版工作台直接访问 JSON API。架构与数据目录见 [docs/engineering/architecture.md](docs/engineering/architecture.md)，客户端字段见 [docs/harness/client-contract.md](docs/harness/client-contract.md)。

---

## 本机运行边界

当前服务用于可信本机，没有用户认证或访问控制。默认只监听 `127.0.0.1`。

1. 模型凭据放在根目录 `.env`，或由进程环境 `SZH_MODEL_ENV_FILE` 指向的私有文件。优先级为进程环境 > 根目录 `.env` > 私有配置。未指定私有文件时，依次查找用户目录下的 `.config/szh/model.env` 或旧的 `.config/autoresearch/glm.env`。
2. 复制 `.env.example` 只准备模型项。端口和 AIC 选项从进程环境读取，不会因为复制示例文件而生效。
3. 方案注册走维护者 CLI。`POST /api/v1/solutions/import` 固定返回 403。重复版本拒绝覆盖。
4. `var/` 存放任务、运行和成果，不入库。沙箱联调使用新建的临时目录，不要对项目目录使用 `--fresh`。

| 变量 | 用途 |
|------|------|
| `SZH_MODEL_PROVIDER`、`SZH_MODEL`、`SZH_MODEL_BASE_URL`、`SZH_MODEL_API_KEY`、`SZH_MODEL_REASONING_EFFORT` | DSH 模型路由、凭据与推理强度 |
| `AUTORESEARCH_MODEL`、`AUTORESEARCH_MODEL_BASE_URL`、`AUTORESEARCH_MODEL_API_KEY` | 历史配置兼容回退 |
| `SZH_PORT` | HTTP 监听端口，默认 4782 |
| `SZH_HARNESS_URL` | 工作台连接的 Harness 地址，默认 `http://127.0.0.1:4782` |
| `SZH_DATA` | 工作台数据源：`harness` 或 `mock` |
| `SZH_AIC_MATERIALS` | 旧 AIC 归档资料目录，按需授权取得 |
| `SZH_AIC_PYTHON`、`SZH_AIC_PACKAGE` | AIC 适配器的服务端解释器与受控运行包目录，须同时设置 |
| `SZH_AIC_MODEL_PACKAGE_URL` | 旧归档结果的可选交付链接 |
| `SZH_SERVICE_URL` | 旧资料评估脚本使用的服务地址 |

---

## 工作台路由

| 路由 | 页面 | 实现位置 |
|------|------|----------|
| `#/` | 工作台首页 | [HomePage.tsx](apps/szh-app/src/features/home/HomePage.tsx) |
| `#/plan` | 研究计划 | [PlanPage.tsx](apps/szh-app/src/features/home/PlanPage.tsx) |
| `#/solutions` | 方案库 | [ExplorerPage.tsx](apps/szh-app/src/features/solutions/ExplorerPage.tsx) |
| `#/solutions/:id` | 方案工作空间（概览 / 运行 / 记录 / 开发） | [WorkspacePage.tsx](apps/szh-app/src/features/solutions/WorkspacePage.tsx) |
| `#/runs` | 运行列表 | [RunPages.tsx](apps/szh-app/src/features/runs/RunPages.tsx) |
| `#/runs/:id` | 运行页 | [RunPages.tsx](apps/szh-app/src/features/runs/RunPages.tsx) |
| `#/artifacts` | 成果列表 | [ArtifactPages.tsx](apps/szh-app/src/features/artifacts/ArtifactPages.tsx) |
| `#/artifacts/:runId/:artifactId` | 成果查看 | [ArtifactPages.tsx](apps/szh-app/src/features/artifacts/ArtifactPages.tsx) |
| `#/conversations` | AI 对话 | [ConversationsPage.tsx](apps/szh-app/src/features/assistant/ConversationsPage.tsx) |
| `#/settings` | 连接与数据源 | [SettingsPage.tsx](apps/szh-app/src/features/settings/SettingsPage.tsx) |

`#/solutions/:id/run` 会转到工作空间的运行页。页面只通过 `src/lib/api/queries.ts` 读写数据。演示数据源在浏览器内计算，记录带「演示」标识，不写入 Harness。

HTTP 路径、错误码和请求体见 [docs/harness/api.md](docs/harness/api.md)。

---

## 注册、测试与联调

```bash
node scripts/import-solution.mjs solutions/aic-flowproxy/manifest-v01.json
npm test
```

导入命令默认写入 `var/solution-versions`，第二个参数可指定注册目录。注册只校验定义，不表示模型环境可运行。默认全量测试里，四项旧 AIC 归档测试在缺少授权样本时会跳过。拥有材料时可设置 `SZH_AIC_MATERIALS` 后执行 `node --test tests/aic-entry.test.mjs`。测试使用替身模型或固定归档，不需要在线凭据。

```bash
node apps/szh-app/scripts/harness-sandbox.mjs --port 4790 --dir <一个新建的临时目录>
```

沙箱启动真实 HTTP 路由和本地文本词频自检执行器，可创建 Run、取消和下载文件。请使用专属临时目录。无凭据联调时只跑这条自检，用来确认基础链路。

`npm run check` 核对归档 PDF、引用和样例一致性，需先按 `knowledge/sources.json` 登记的发布者 URL 取得 PDF 并放入其 `local_path`。`npm run samples:load` 与 `npm run evaluate:materials` 属于完整交付工程的历史材料工具，需在隔离环境使用授权材料。

---

## 技术栈

| 类别 | 技术 | 状态 |
|------|------|------|
| Harness | Node.js ≥ 22.19，原生 HTTP（`apps/server/main.mjs`） | 已接入 |
| 模型执行 | DSH SDK（`@deepseek-ai/dsh`） | 已接入；无凭据时只提供查询与自检 |
| 方案校验 | AJV 8 | 已接入 |
| 工作台 | Electron + React 19 + TypeScript + Vite | 已接入 |
| 服务端数据 | TanStack Query v5 | 已接入 |
| 路由 | React Router 7（HashRouter） | 已接入 |
| 图标 | Lucide React | 已接入 |
| 领域执行 | 本机 Python 子进程（AIC 适配器，需单独配置） | 环境依赖 |
| 认证 / 远程调度 / Run 事件流 | — | 尚未提供 |

能力对照见 [docs/engineering/status.md](docs/engineering/status.md)。发布前的门槛见 [docs/engineering/tech-debt.md](docs/engineering/tech-debt.md)。

## 目录结构

```
szh-harness/
├── apps/
│   ├── server/            # Harness：任务、注册、Run、Artifact
│   ├── szh-app/           # Electron 工作台；features 为页面，lib/api 为数据访问
│   └── client/            # 旧 Web 预览，保留回归所需源码
├── solutions/             # 领域方案：aviation-notam、aic-flowproxy
├── plugins/               # 专业工具（NOTAM schema）
├── knowledge/             # 资料索引与出处
├── contracts/             # 接口样例与领域约定
├── evaluation/            # NOTAM / 报告回归样例
├── scripts/               # 导入、检查、评估、运行时入口
├── tests/                 # Harness 回归
├── docs/
│   ├── engineering/       # 架构、能力状态、技术债务、Git 约定
│   └── harness/           # HTTP API 与客户端契约
├── AGENTS.md
├── ONBOARDING.md
└── README.md
```

## 开发规范

### 命名约定

| 目标 | 约定 | 示例 |
|------|------|------|
| Harness 模块 | kebab-case | `solution-runs.mjs`、`dsh-runner.mjs` |
| 工作台文件 | PascalCase 组件，功能目录 kebab 或单词 | `SolutionCard.tsx`、`features/runs/` |
| 函数 / 变量 | camelCase | `createRun` |
| 类型 / 接口 | PascalCase | `Run`、`SolutionVersion` |
| 环境变量 | `SZH_` 前缀 | `SZH_PORT`、`SZH_HARNESS_URL` |
| 方案标识 | kebab-case | `aviation-notam`、`aic-flowproxy` |

### 职责边界

```
页面与交互     apps/szh-app/src/features     只通过 lib/api/queries.ts 访问数据
数据适配       apps/szh-app/src/lib/api      harness.ts 对真实 HTTP，mock.ts 对演示
HTTP 与校验    apps/server/main.mjs          路由、请求体、错误封装
任务链路       tasks.mjs / dsh-runner.mjs    NOTAM、对话、旧 AIC 归档
方案链路       solution-registry.mjs         版本不可覆盖
运行链路       solution-runs.mjs             Run 队列、执行器、Artifact
领域定义       solutions/ 与 plugins/        方案 Manifest、规则和工具
```

工作台不直接运行专业模型，也不直连 DSH。新增后端字段时，先对照 [docs/harness/api.md](docs/harness/api.md)，再改 `harness.ts` 的映射。

### 状态与样式

- 服务端状态走 TanStack Query。组件局部状态用 `useState`。跨页界面状态留在 `src/app/ui-state.tsx`。
- 原始颜色只写在 `apps/szh-app/src/styles/tokens.css`。组件使用已有令牌。
- Mock 与 Harness 必须能区分。界面上的演示记录保持「演示」标识，不把派生时间线写成真实执行日志。

---

## 已知限制

- Run 目前只有状态和时间戳，没有阶段、百分比或日志流。执行日志在成功后作为成果提供。
- 取消请求不落盘。刷新后以服务端实际状态为准。
- 提交前无法探测执行环境是否就绪，环境问题在创建 Run 时返回。
- 注册使用严格 JSON Schema，不接受 `x-advanced` 等未注册注解。
- 通用远程调度、暂停、上传资产、成果生命周期和多用户权限尚未提供。

细节与验证记录见 [能力状态](docs/engineering/status.md) 和 [技术债务](docs/engineering/tech-debt.md)。
