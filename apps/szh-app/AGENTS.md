# ShenZhi 工作台协作规则

本文件适用于 `apps/szh-app/`。同时遵循仓库根目录的 [AGENTS.md](../../AGENTS.md)。

## 前端约束

- `src/app/` 负责路由和跨页界面状态。页面放在 `src/features/{module}/`。
- 读写 Harness 只经过 `src/lib/api/queries.ts`。真实映射在 `harness.ts`，演示数据在 `mock.ts`，二者不要混写。
- 组件不直接请求 HTTP，也不读取模型密钥或 `var/`。
- Feature 内的组件、类型和常量先留在 Feature 内。确认被多个模块使用后，再放到 `src/components/` 或 `src/lib/`。
- 原始颜色只写在 `src/styles/tokens.css`。
- 后端尚未提供的阶段、百分比、实时日志和暂停，不要画成真实执行数据。取消中的本地状态必须在刷新后回到服务端快照。
- 沿用现有 React、TanStack Query、HashRouter 和组件。不为单个页面另起数据层。
- 修改完成后执行 `npm run typecheck` 与 `npm test`。涉及页面流程时，按 README 的捕获脚本或本机工作台再看一遍主路径。

新增后端字段时，先更新契约说明，再改 `harness.ts`。Harness 拒绝的 Schema 注解不要在表单里假装已经生效。
