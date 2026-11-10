# ShenZhi Harness 文档目录说明

本目录维护深知 Harness 的工程规范、接口契约和能力说明。

新增或维护文档时，优先放入对应分类目录，避免无明确归属的文档长期堆在 `docs/` 根目录。

## 目录说明

```text
docs/
├── README.md          # 本说明
├── engineering/       # 架构、能力状态、技术债务、Git 约定
└── harness/           # HTTP API 与工作台契约
```

### `engineering/`

项目级工程文档：

- [architecture.md](engineering/architecture.md)：模块边界、两条执行链路、数据目录
- [status.md](engineering/status.md)：当前能力与验证记录
- [tech-debt.md](engineering/tech-debt.md)：发布前门槛与已知风险
- [git-conventions.md](engineering/git-conventions.md)：提交信息与入库范围

### `harness/`

方案自动研究链路的接口说明：

- [api.md](harness/api.md)：`/api/tasks` 与 `/api/v1` 的真实路由
- [client-contract.md](harness/client-contract.md)：Electron 工作台如何消费这些路由

## 业务模块文档

某个领域方案形成稳定说明后，再建立独立目录，例如：

```text
docs/
├── notam/
├── aic/
└── ...
```

其中可按需要放置 `README.md`、`API.md`、`VALIDATION.md`。文件少时用清晰文件名即可，不要求每个模块套同一套文件。

当前领域定义仍以仓库里的 `solutions/`、`contracts/`、`knowledge/` 为准，不在 `docs/` 下再复制一份。

## 文档维护原则

1. `docs/` 不与代码目录严格镜像，但业务语义要一致。
2. 项目级规范放 `engineering/`，接口与客户端约定放 `harness/`。
3. 阶段性记录不要写成当前规范。能力是否可用，以 `engineering/status.md` 为准。
4. 不为凑目录创建没有内容的空文件夹。
5. 架构、公共接口或运行边界发生变化时，同步更新对应文档和根目录 README。
