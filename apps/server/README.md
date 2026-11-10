# ShenZhi Harness

任务、方案注册、Run、Artifact，以及 NOTAM / AIC 两条专业链路。工作台只访问本服务的 HTTP API。

```bash
# 在仓库根目录
npm ci
npm start
npm test
```

默认 `http://127.0.0.1:4782`。模型、端口和 AIC 配置见仓库根目录 [README](../../README.md)。

## 模块

| 文件 | 职责 |
|------|------|
| `main.mjs` | HTTP 路由、请求体校验、错误封装、旧预览白名单 |
| `tasks.mjs`、`dsh-runner.mjs` | NOTAM、通用对话、DSH 一轮调用 |
| `solution-registry.mjs` | Manifest 校验与不可覆盖的版本记录 |
| `solution-runs.mjs` | Run 队列、执行器、Artifact 元数据 |
| `knowledge.mjs` | 资料索引检索 |

协作约束见 [AGENTS.md](AGENTS.md)。架构见 [docs/engineering/architecture.md](../../docs/engineering/architecture.md)，路由见 [docs/harness/api.md](../../docs/harness/api.md)，工作台字段见 [docs/harness/client-contract.md](../../docs/harness/client-contract.md)。
