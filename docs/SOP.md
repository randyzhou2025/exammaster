# ExamMaster 开发与部署 SOP

本文约定改代码、发版、部署时的**最低责任流程**。违反下列原则导致的线上故障，应回溯改动而非在下游打补丁。

---

## 1. 核心原则：不随意改既有代码，先想清楚后果

### 1.1 什么叫「随意改」

- 任务只要求加功能，却**顺手重构**目录、构建方式、路由、ignore 规则、环境变量默认值。
- 看到「能跑」就改，没有核对**谁还在依赖旧行为**（线上 compose、Nginx、脚本、其他服务）。
- 遇到报错用**最小补丁**糊过去（例如删掉 `.dockerignore` 里一行），而不回到「当初为什么这样设计」。

### 1.2 改动前必须回答的问题

每次动到**构建、部署、路由、鉴权、持久化**时，先书面（或 PR 描述里）回答：

1. **谁在用这段配置？**（本地 dev / 生产 Docker / 宝塔 Nginx / CI）
2. **改动后构建上下文、运行时、数据流分别变了吗？**
3. **旧环境不设新变量时，默认行为是否与现网一致？**
4. **有没有更窄的改法**（只动新文件 / 新接口），而不是改共享基础设施？

答不清楚 → **不要改**，或先和用户确认。

### 1.3 优先「增量、可回滚」

- 新能力用**新文件、新 env、新路由**接入；保留旧路径/旧 compose 字段直到确认无引用。
- 禁止「一个大提交里同时改业务 + 改部署结构」，除非部署变更已单独验证。
- 回滚方案：说明 `git revert` 哪几个 commit 即可恢复现网。

---

## 2. 部署与 Docker 专项（血泪教训）

### 2.1 构建上下文分工（固定，勿混用）

| 服务 | compose 配置 | 说明 |
|------|----------------|------|
| **exam_frontend** | `context: .`（仓库根） | 根目录 `.dockerignore` 生效；**必须**继续 `ignore server/` 以减小上下文 |
| **exam_api** | `context: ./server` | 只用 `server/` 目录；**不得**改为 `context: .` 并从根路径 `COPY server/` |

**禁止**为了拷贝 `src/data/*.json` 而把 API 改成仓库根 context——题库应放在 `server/assets/banks/`（`scripts/sync-banks-to-server.mjs` 同步）。

### 2.2 改 `.dockerignore` / `Dockerfile` / `docker-compose.prod.yml` 时

**发版前必跑（仓库根目录）：**

```bash
EXAM_POSTGRES_PASSWORD=dummy JWT_SECRET=dummy-secret-min-16-chars \
  docker compose -f docker-compose.prod.yml build exam_api exam_frontend
```

两条镜像都 build 成功再 `up -d --build` 上线。

### 2.3 环境变量

- `TRIAL_MODE_ENABLED`、`VITE_*` 等：改含义或默认值时，写明**现网不配时的行为**。
- 生产 secrets 只写在服务器 `.env.prod`，不进 git。

---

## 3. 开发完成 → 交付检查清单

与 [`.cursor/rules/dev-workflow.mdc`](../.cursor/rules/dev-workflow.mdc) 一致，交付前勾选：

- [ ] 改动范围与任务一致，无无关重构
- [ ] `npm run build`（或 `build:web` + `server build`）通过
- [ ] 动到 Docker / 部署文件 → **第 2.2 节 build 两条镜像**
- [ ] 动到 API / 表结构 → `db:push` 或 `deploy/sql/*.sql` 已对齐
- [ ] 关键用户路径能说明如何验证（或已本地点验）

---

## 4. 线上增量更新（常规）

```bash
git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
npm run db:push:prod   # 无 schema 变更时可跳过
```

---

## 5. 案例：API build context 误改（2026-06）

**错误：** 为拷贝题库 JSON，将 `exam_api` 从 `context: ./server` 改为 `context: .`，且未处理根 `.dockerignore` 中的 `server` → 线上 build 失败。

**错误补救：** 直接删除 `.dockerignore` 里的 `server` → API 能 build，但前端每次 build 都会上传整份 `server/` 目录。

**正确做法：** 恢复 `context: ./server`；题库用 `server/assets/banks/`；保留 `.dockerignore` 的 `server`。

**教训：** 基础设施改动 ≠ 功能改动；改 compose/Dockerfile 必须双镜像 build 验证。
