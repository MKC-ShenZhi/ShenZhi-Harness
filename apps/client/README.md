# 旧 Web 预览

保留给旧入口回归的静态页面与工作台资源。新版工作台在 [apps/szh-app](../szh-app/README.md)，不在这里继续加页面。

Harness 的 `GET /` 会跳到 `/preview/`。预览文件由 `apps/server/main.mjs` 按白名单提供。完整视觉依赖工程内的构建产物，后端快照只保留回归所需源码。
