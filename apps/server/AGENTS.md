# ShenZhi Harness 协作规则

本文件适用于 `apps/server/`。同时遵循仓库根目录的 [AGENTS.md](../../AGENTS.md)。

## 后端约束

- `main.mjs` 负责路由、请求体读取、错误封装和旧预览文件白名单。业务规则放进对应模块，不在路由分支里堆叠。
- `/api/tasks` 与 `/api/v1` 是两条链路。任务队列和 Run 队列、任务目录和 `solution-runs` 目录都不要混用。
- 方案定义的校验放在 `solution-registry.mjs`。执行、取消和成果登记放在 `solution-runs.mjs`。
- NOTAM 的模式选择、结构化校验和原文核对留在现有 `notam-*.mjs` / `parsing.mjs` / `report-parsing.mjs`。不要把报文规则复制进通用 Run。
- 外部模型和专业计算通过现有 DSH 调用或已配置的执行器进入。缺少密钥或运行环境时返回明确错误，不要改成演示数据。
- 配置从现有环境变量和 `.env` 读取，不把密钥写进源码。新增配置时同步 `.env.example` 和根目录 README 的变量表。
- 当前没有鉴权中间件。不要在未实现访问控制时增加可从非本机访问的监听方式。
- 修改完成后，在仓库根目录执行 `npm test`，或运行与改动对应的 `node --test tests/<name>.test.mjs`。

接口形状、状态机或落盘目录发生变化时，先说明对 `apps/szh-app` 的影响，并更新 `docs/harness/`。
