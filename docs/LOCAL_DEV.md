# 本地开发启动说明（前端 + API + PostgreSQL）

本文说明从零准备环境，到**启动 / 停止**前后端与数据库的完整流程。项目根目录默认为 ExamMaster 仓库根路径。

---

## 一、环境要求

| 组件 | 说明 |
|------|------|
| **Node.js** | 建议 LTS 18+ 或 20+（需自带 `npm`）。 |
| **Docker Desktop** | 用于本地 PostgreSQL 容器（推荐）。安装后务必**打开应用**，等托盘图标显示运行中。 |
| **终端** | macOS / Linux / Windows（PowerShell 或 WSL）均可，下文命令以 macOS 为例。 |

不使用 Docker 时，需自行安装 **PostgreSQL**，并配置 `server/.env` 中的 `DATABASE_URL`（见「附录：不用 Docker」）。

---

## 二、首次准备（只做一次）

以下均在**项目根目录**执行（含 `package.json`、`docker-compose.yml` 的那一层）。

### 1. 安装依赖

```bash
cd /path/to/ExamMaster
npm install
npm --prefix server install
```

### 2. 启动数据库并建表（Docker）

确保 **Docker Desktop 已运行**，然后执行：

```bash
npm run setup:local
```

该脚本会依次：

1. 执行 `docker compose up -d`，启动 Postgres（镜像 `postgres:16-alpine`，容器名 `exam-master-pg`）。
2. 等待数据库就绪（`pg_isready`）。
3. 若不存在则创建 **`server/.env`**，写入本地开发默认变量（含数据库 URL、JWT、可选管理员种子）。
4. 在 `server` 目录执行 **`npm run db:push`**（Drizzle），把表结构推到数据库。

看到终端输出 **「完成」** 且无报错即可。

若 **`server/.env` 已存在**，脚本**不会覆盖**你的 `.env`，仍会尝试启动 Docker 并执行 `db:push`。

### 3. 默认管理员账号（可选）

当 **`server/.env`** 里配置了：

```env
ADMIN_EMAIL=admin@local.test
ADMIN_PASSWORD=Admin123456
```

则 **API 进程第一次成功启动时**，若该邮箱在库里还不存在，会自动插入一名 **管理员**（`role=admin`，且默认已授权使用题库）。

> 若你改过上述两项，请以 `.env` 为准登录后台。

---

## 三、日常启动（每次开发）

**顺序：先保证数据库在跑，再起前端和 API。**

### 步骤 A：数据库（Docker）

若电脑重启或执行过 `docker compose down`，需要先起库：

```bash
cd /path/to/ExamMaster
npm run docker:up
```

确认容器在跑（可选）：

```bash
docker compose ps
```

### 步骤 B：前后端（任选一种）

#### 方式 1：单终端（推荐）

在项目根目录：

```bash
npm run dev:full
```

会同时启动：

- **前端**：Vite，默认 **http://localhost:5173/**
- **API**：Fastify，默认 **http://127.0.0.1:4000/**（监听 `0.0.0.0:4000`）

开发环境下，Vite 会把浏览器发往 **`/api`** 的请求**代理**到 `127.0.0.1:4000`，因此前端使用相对路径 `/api/...` 即可，无需改 CORS。

停止：在该终端按 **`Ctrl + C`**（会结束两条子进程）。

#### 方式 2：两个终端

**终端 1（前端）：**

```bash
cd /path/to/ExamMaster
npm run dev
```

**终端 2（API）：**

```bash
cd /path/to/ExamMaster
npm run dev:api
```

停止：分别在对应终端 **`Ctrl + C`**。

### 步骤 C：浏览器验证

1. 打开：**http://localhost:5173/**
2. 可选自检 API：`curl http://127.0.0.1:4000/api/health`  
   正常返回：`{"ok":true}`

---

## 四、停止服务

### 停止前端 / API

- 若使用 **`npm run dev:full`**：在运行该命令的终端 **`Ctrl + C`**。
- 若分两个终端：各自 **`Ctrl + C`**。
- 若终端已关掉但端口仍被占用（少见），可手动释放端口后再启动：
  ```bash
  # macOS / Linux：查看占用 5173 / 4000 的进程
  lsof -i :5173
  lsof -i :4000
  # 按 PID 结束进程，例如：
  kill <PID>
  ```

### 停止数据库容器（可选）

不关机、只做前端改动时，**不必**停数据库。

需要关掉 Postgres 容器时（仍会保留数据卷）：

```bash
cd /path/to/ExamMaster
npm run docker:down
```

下次开发前再执行 **`npm run docker:up`** 即可。

---

## 五、`server/.env` 常用变量说明

| 变量 | 含义 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接串。若使用仓库自带 `docker-compose.yml`，默认形如：`postgresql://exam:exam_dev_password@127.0.0.1:5433/exam_master`（端口 **5433**）。 |
| `JWT_SECRET` | JWT 签名密钥，**至少 16 字符**；切勿泄露、勿提交到 Git。 |
| `JWT_EXPIRES_IN` | Token 过期时间，默认如 `7d`。 |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | 首次启动 API 时自动创建管理员的邮箱与密码（仅当该邮箱尚不存在）。 |
| `PORT` | API 端口，默认 `4000`。 |
| `HOST` | 监听地址，默认 `0.0.0.0`。 |

`.env` 已由 `.gitignore` 忽略，请勿把真实生产密钥提交进仓库。

---

## 六、常见问题

### 1. 前端提示「网络错误」或注册失败

多为 **API 未启动** 或 **数据库未就绪**。请确认：

1. `docker compose ps` 中 Postgres 为运行状态；
2. 终端里 **`npm run dev:api`** 或 **`dev:full`** 正在跑且无报错；
3. 浏览器开发者工具 → Network，查看 `/api/...` 是否返回连接失败。

### 2. `DATABASE_URL is required` / API 起不来

- 确认 **`server/.env`** 存在且含有效 `DATABASE_URL`。  
- 可先删除 `.env` 后重新执行 **`npm run setup:local`**（会重新生成模板，注意备份你自己的修改）。

### 3. 修改了数据库表结构（`server/src/db/schema.ts`）

在 `server` 目录执行：

```bash
npm run db:push
```

或在项目根：

```bash
npm run db:push
```

### 4. 重新导入题库 JSON（从 PDF）

项目根目录（需本地存在 `题库/…pdf` 及解析脚本）：

```bash
npm run import-theory-bank
```

---

## 附录：不用 Docker、使用本机 PostgreSQL

1. 在本机安装 PostgreSQL，创建数据库（例如 `exam_master`）。
2. 复制 `server/.env.example` 为 `server/.env`，将 `DATABASE_URL` 改为你的连接串（主机、端口一般为 `5432`）。
3. 填写 **`JWT_SECRET`**（≥16 字符），按需填写 **`ADMIN_*`**。
4. 执行：`npm run db:push`（在根目录或 `server` 目录均可，见上文）。
5. 再按「三、日常启动」启动 **`npm run dev`** + **`npm run dev:api`** 或 **`npm run dev:full`**。

---

## 附录：生产部署（简述）

- 前端：`npm run build`，将 `dist/` 交给 Nginx 等静态托管。
- API：在服务器运行 `server` 构建产物（如 `npm run build && npm start`），配置进程守护与环境变量。
- 浏览器须能访问**同源**下的 **`/api`**（由反向代理转到 Node），或配置前端 **`VITE_API_URL`** 指向 API 根地址（需注意 CORS 与安全）。

---

## 行为说明（MVP）

- **账号与授权**：存在服务端 PostgreSQL；登录使用 JWT。
- **做题进度 / 错题 / 收藏**：仍在浏览器 **localStorage**（与当前 MVP「方案 A」一致）；换浏览器或清站点数据会丢进度，可用设置页 **导出备份 JSON**。
