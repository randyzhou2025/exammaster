# ExamMaster 多端备考客户端 — 技术方案（Taro）

**文档版本**：1.0  
**日期**：2026-05-20  
**状态**：**技术路线已定（Taro 多端）**；§8 产品/数据项待确认后冻结排期  
**关联**：`docs/INTERACTION_SPEC.md`、`docs/PYTHON_CODE_FILL_REQUIREMENTS.md`、`src/lib/routes.ts`

---

## 0. 已定技术决策

| ID | 决策 | 说明 |
|----|------|------|
| **C-10** | **Taro 3 + React 18** | 编译到各端小程序与 H5；**不采用**微信原生重写、**不采用** web-view 嵌现有 Vite H5 作为终态 |
| **C-11** | **抽取 `packages/domain`（及共享 types）** | Web 与 Taro 共用判分/组卷/代码填空逻辑，避免双份规则 |
| **C-12** | **管理后台仅保留现有 Web** | `/admin/*` 不进 Taro 应用 |
| **多端目标** | **微信 → H5 → 支付宝**（可并行） | 同一套 `apps/taro` 源码，按 `TARO_ENV` / `--type` 出包；后续可扩展抖音等 |

**产品范围、进度上云、答案下发等**仍见 §8，未确认前仅影响分期，不改变 Taro 架构方向。

---

## 1. 文档目的

在现有 **ExamMaster Web**（React + Vite + Fastify + PostgreSQL）基础上，用 **Taro** 建设可编译到 **微信/支付宝小程序、H5** 等端的备考客户端，与 Web **共用后端与题库构建链路**；Web 继续承担管理端、运营与桌面刷题入口。

---

## 2. 现状摘要（As-Is）

### 2.1 技术栈与部署

| 层级 | 现状 |
|------|------|
| 前端（Web） | React 18 + Vite + React Router + Zustand + Tailwind |
| 后端 | Fastify + JWT + Drizzle ORM + PostgreSQL |
| 部署 | Docker：`exam_frontend` + `exam_api` + `exam_postgres`；子路径 `/examprep/` |
| 管理 | Web：`/admin/*` |

### 2.2 业务能力（已实现）

| 模块 | 功能 | 数据与判题 |
|------|------|------------|
| **理论** | 顺序/随机/未做/错题/收藏、答题/背题、错题本、模考 | `theoryBank.json`（约 280KB）；进度 **localStorage**（`appStore`） |
| **实操** | 代码填空、检查答案、会话内显示答案 | `codeFillBank.json`（约 185KB）；`codeFillScoring`；**localStorage**（`codeFillStore`） |
| **账号** | 邮箱登录、JWT、授权 gate | 用户与日志在 **PostgreSQL**；做题进度**未上云** |

### 2.3 后端 API（业务相关）

当前仅有 **auth / admin / health**；无题库下发、进度同步（二期扩展，见 §12）。

### 2.4 与 Taro 端的差异（需在抽象层屏蔽）

| 维度 | Web（Vite） | Taro 各端 |
|------|-------------|----------|
| 路由 | React Router URL | `app.config.ts` 页面栈 + `Taro.navigateTo` |
| 存储 | `localStorage` | `Taro.setStorage`（按端一致 API） |
| 登录 | 邮箱密码 | 微信 `login` / 支付宝 `my.getAuthCode` 等 → 统一 JWT |
| 样式 | Tailwind | **SCSS Modules + Taro 设计稿 375**（见 §3.6）；禁止依赖 Web 专有 DOM API |
| 代码 UI | HTML `<input>` | Taro `<Input>` + 行内排版组件（两端真机验收） |

---

## 3. 目标架构（To-Be · Taro 多端）

### 3.1 总体形态

```text
                    ┌──────────────────────────────────────┐
                    │     apps/taro（Taro 3 + React 18）      │
                    │  pages: auth / theory* / operate* / …  │
                    │  platform: 登录·存储·导航·埋点（多端分支）   │
                    └───────────────┬──────────────────────────┘
                                    │ import
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
 packages/domain              packages/shared-types         packages/theory-data
 packages/codefill-data       （Zustand store 可放 apps/taro 或 packages/stores）
        ▲                           ▲
        │                           │
 apps/web（现有 Vite，渐进引用 domain）          server（Fastify 扩展）
        │                                           │
        └──────────────── HTTPS /api ───────────────┘
                              PostgreSQL

编译产出（同一源码，不同 CI job）：
  taro build --type weapp   → 微信开发者工具上传
  taro build --type alipay  → 支付宝开发者工具上传
  taro build --type h5      → 静态资源（可挂 Nginx 或嵌入现有域）
```

**原则**：业务页面只写一份；**平台差异**收敛到 `packages/platform`（或 `apps/taro/src/platform`），禁止在页面里散落 `wx.` / `my.`。

### 3.2 集成路线（历史对比 · 已结案）

| 方案 | 结论 |
|------|------|
| A. 微信原生 | ❌ 不选：无法复用 React，多端成本高 |
| **B. Taro** | ✅ **已选**：微信 + 支付宝 + H5 同仓，与现有 React 技能栈一致 |
| C. web-view 嵌 H5 | ❌ 不选：登录/存储/体验劣于编译型小程序 |
| D. 混合 | ❌ 不选：进度与体验分裂 |

### 3.3 Monorepo 目录（目标态，可分阶段迁入）

```text
ExamMaster/
  packages/
    domain/                 # 从 src/domain 抽出：scoring, examAssembly, codeFillScoring
    shared-types/           # Question, CodeFill, BackupPayload 等
    platform/               # 存储、请求、登录、路由封装（内部按 TARO_ENV 分支）
    theory-data/            # theoryBank.json（构建产物）
    codefill-data/          # codeFillBank.json（构建产物）
  apps/
    web/                    # 现 src/ 逐步迁入；短期仍可保留根目录 src/
    taro/                   # 新建 Taro 工程
      config/
        index.ts            # 公共：designWidth 375, framework react, webpack5
        dev.ts / prod.ts
      src/
        app.config.ts       # 页面表、分包、window、tabBar（若需要）
        app.tsx
        pages/              # 与 §10 映射一致
        components/
          codefill/         # CodeFillLine（Taro Input 版）
        stores/             # 从 web zustand 迁移，persist 走 platform/storage
        platform/
          index.ts          # 统一导出
          auth.weapp.ts | auth.alipay.ts | auth.h5.ts
          storage.ts
          request.ts        # baseURL、JWT header
      project.config.json   # 微信（可由 CI 注入 appid）
  scripts/                  # 现有 build-code-fill-bank 等，产出写入 packages/*-data
  server/                   # 扩展 §12 接口
```

**一期可不立刻搬空根目录 `src/`**：先新建 `apps/taro` + 抽 `packages/domain`，Web 仍用 `src/domain`  re-export，避免大爆炸迁移。

### 3.4 多端编译矩阵与优先级

| 端 | Taro type | 首版优先级 | 上线要点 |
|----|-----------|------------|----------|
| **微信小程序** | `weapp` | **P0** | AppID、合法域名、隐私协议、分包 |
| **H5** | `h5` | **P1** | 与 API 同域或 CORS；可替代部分「手机浏览器访问」场景 |
| **支付宝小程序** | `alipay` | **P1** | 支付宝 AppID、`my.` 登录、域名白名单 |
| 抖音 / 京东等 | `tt` 等 | P2 | 按需加 `@tarojs/plugin-platform-*`，业务代码无感前提：平台层已抽象 |

**推荐 Taro 版本**：3.6.x LTS（与团队 `cyber-mood-journal` 的 `mini-frontend` 对齐，降低踩坑成本）。

**package.json 脚本约定**：

```json
{
  "dev:weapp": "taro build --type weapp --watch",
  "dev:alipay": "taro build --type alipay --watch",
  "dev:h5": "taro build --type h5 --watch",
  "build:weapp": "taro build --type weapp",
  "build:alipay": "taro build --type alipay",
  "build:h5": "taro build --type h5"
}
```

### 3.5 平台抽象层（快速适配多端的关键）

`packages/platform`（或 `apps/taro/src/platform`）对外**稳定接口**，对内按编译目标分支：

| 能力 | 统一 API 示例 | 微信 | 支付宝 | H5 |
|------|---------------|------|--------|-----|
| 登录 | `platformAuth.login()` → `{ token }` | `Taro.login` + `/api/auth/wechat` | `my.getAuthCode` + `/api/auth/alipay` | 邮箱/手机号或微信 H5 OAuth（二期） |
| 存储 | `platformStorage.get/set/remove` | `Taro.setStorage` | 同左 | `localStorage` |
| 请求 | `platformRequest.get/post` | `Taro.request` | 同左 | `fetch` |
| 路由 | `platformNav.toPractice()` | `Taro.navigateTo` | 同左 | `history` 或 hash（Taro H5 路由） |
| 分享 | `platformShare`（可选） | `onShareAppMessage` | 支付宝分享 API | Web Share / 链接复制 |

实现方式：

```typescript
// packages/platform/src/auth/index.ts
import { login as loginWeapp } from "./weapp";
import { login as loginAlipay } from "./alipay";
import { login as loginH5 } from "./h5";

export function login() {
  if (process.env.TARO_ENV === "weapp") return loginWeapp();
  if (process.env.TARO_ENV === "alipay") return loginAlipay();
  return loginH5();
}
```

**禁止**：业务页直接 `import Taro` 调登录（除组件级生命周期外），一律走 `platform`。

### 3.6 样式与 UI 规范

| 项 | 约定 |
|----|------|
| 设计稿 | `designWidth: 375`，与现 Web 移动优先一致 |
| 样式方案 | **SCSS Modules** 为主；可选 `@tarojs/plugin-html` 仅用于简单富文本，**不全站 Tailwind 编译**（避免 rpx/选择器兼容问题） |
| 触控 | 可点击区域 ≥ 44px；`safe-area` 用 Taro 变量 + 底部 padding |
| 图标/图片 | 放 `apps/taro/src/assets`，大图进分包 |

Web 端可继续 Tailwind；Taro 与 Web **视觉对齐靠设计 token**（颜色、圆角、字号表），不靠共用 className。

### 3.7 逻辑复用与 Web 关系

| 资产 | Web | Taro |
|------|-----|------|
| `domain/*` | ✅ 引用 `packages/domain` | ✅ 同包 |
| `stores` 业务逻辑 | Zustand | 同结构；persist 适配 `platformStorage` |
| `pages/*.tsx` 视图 | 保留 Vite | **重写为 Taro 页**（复用 hooks 与 domain，不直接复制 DOM 代码） |
| `CodeFillLine` | HTML input | Taro `Input` + `View` 行排版，**M3 前必须真机原型** |
| 管理后台 | 仅 Web | 不编译到任何 Taro type |

---

## 4. 必须改造项（按系统分层）

### 4.1 Taro 端（`apps/taro`）

| 编号 | 改造项 | 说明 | 优先级 |
|------|--------|------|--------|
| F-01 | **初始化 Taro 工程** | React + TS + webpack5；配置 weapp/alipay/h5 | P0 |
| F-02 | **platform 抽象层** | 登录/存储/请求/导航；禁止业务层直接调 `wx`/`my` | P0 |
| F-03 | **页面与分包** | 对照 §10；理论/实操分包加载题库 JSON | P0 |
| F-04 | **Zustand + persist** | 键名与 Web 备份格式兼容（便于 §8 C-24） | P0 |
| F-05 | **多端登录** | 微信 P0；支付宝/H5 按 §3.4 分期 | P0/P1 |
| F-06 | **理论做题页** | 题型、背题、收藏、题号抽屉；滑动手势按 Taro 重写 | P0 |
| F-07 | **理论模考** | 倒计时 `useDidHide` / `useDidShow` | 见 §8 C-06 |
| F-08 | **实操 + CodeFillLine** | 行内填空 Taro 组件；微信/支付宝真机各测一轮 | P0 |
| F-09 | **授权 gate** | `isAuthorized` 对标 `pending` | P0 |
| F-10 | **条件编译** | 仅微信可用的能力用 `process.env.TARO_ENV === 'weapp'` 隔离 | P1 |
| F-11 | **抽 `packages/domain`** | Web 改引用；单测覆盖判分 | P0 |

### 4.2 后端 API（扩展现有 Fastify）

| 编号 | 改造项 | 说明 | 优先级 |
|------|--------|------|--------|
| B-01 | **微信登录** | `POST /api/auth/wechat` | P0 |
| B-02 | **支付宝登录** | `POST /api/auth/alipay` | P1 |
| B-03 | **用户表扩展** | `wechat_openid`、`alipay_user_id`、`unionid` 等；合并策略见 §8 C-23 | P0 |
| B-04 | **多端合法域名** | 微信/支付宝后台分别配置 API 域名 | P0 |
| B-05 | **题库 manifest（二期）** | CDN 热更新时启用 | P2 |
| B-06 | **进度 sync（二期）** | `GET/PUT /api/progress` | 见 §8 C-20 |
| B-07 | **限流与安全** | 各端 `code` 一次性、登录防刷 | P0 |

### 4.3 数据与运维

| 编号 | 改造项 | 说明 |
|------|--------|------|
| O-01 | 微信/支付宝小程序后台：类目、隐私、用户协议 URL |
| O-02 | **CI 矩阵**：`build:weapp` / `build:alipay` / `build:h5` 分 job；与 Web Docker **分离** |
| O-03 | 上传流水线：微信 `miniprogram-ci` / 支付宝开放平台 CLI |
| O-04 | 监控：分端统计启动耗时、登录成功率、API 错误率 |
| O-05 | 题库构建：沿用 `scripts/build-code-fill-bank.mjs` → `packages/codefill-data` |

---

## 5. 功能与行为对齐

### 5.1 多端客户端功能（对标 Web）

| 功能 | Web | Taro 首版建议 | 备注 |
|------|-----|----------------|------|
| 理论练习全套 | ✅ | ✅ | 统计口径依赖 `packages/domain` |
| 理论模考 | ✅ | ⚠️ | 见 §8 C-06 |
| 实操代码填空 | ✅ | ✅ | UI 必须两端真机验收 |
| 题库选择 | ✅ | ⚠️ | 见 §8 C-05 |
| 邮箱登录 | ✅ | H5 可保留；小程序以端登录为主 | §8 C-04 |
| 管理后台 | ✅ | ❌ | 仅 Web |

### 5.2 端特有能力（可选）

| 功能 | 微信 | 支付宝 | H5 |
|------|------|--------|-----|
| 分享 | P2 | P2 | 链接复制 |
| 订阅消息 | P2 | 按支付宝能力 | — |
| 客服 | P1 | P1 | 网页客服 |

### 5.3 题库下发

| 阶段 | 策略 |
|------|------|
| **一期** | JSON 打入 Taro **分包**（weapp/alipay 共用数据包；H5 可 import 或静态资源） |
| **二期** | API manifest + CDN，各端 `platformStorage` 缓存 |

### 5.3.1 代码填空答案

默认与 Web 一致：**答案随客户端题库**（见 §8 C-21）。若改为服务端判题，需同时改 Web 与 Taro。

### 5.4 进度同步

| 阶段 | 行为 |
|------|------|
| **一期** | `platformStorage` 本地持久化 |
| **二期** | 登录后云端 sync，多端一致（§8 C-41） |

---

## 6. 非功能需求

| 类别 | 要求 |
|------|------|
| 性能 | 各端首屏可交互 &lt; 3s（4G）；理论切题 &lt; 200ms |
| 兼容 | 微信基础库、支付宝基础库下限在 `apps/taro` README 写明 |
| 安全 | HTTPS、JWT、分端密钥隔离；管理接口仅 admin |
| 隐私 | 分端隐私政策列明 openid/uid、做题记录（若上云） |
| 可维护性 | 新业务只改一处页面；平台差异只改 `platform/*` |

---

## 7. 分期建议（Taro）

| 阶段 | 范围 | 交付物 |
|------|------|--------|
| **M0** | 确认 §8 产品项；搭建 `apps/taro` + `packages/domain` + `platform` 骨架 | 空壳可编译 weapp/alipay/h5 |
| **M1** | 微信登录 + 理论首页 + 顺序练习 + 设置；**weapp 体验版** | 微信内测 |
| **M2** | 理论完整（模考/错题/背题）；**支付宝小程序**同功能回归 | 双端提审备选 |
| **M3** | 实操代码填空；CodeFillLine 双端真机通过 | 实操对标 Web |
| **M4** | H5 发布（可选与 Web 合并域）；进度上云、CDN 题库、分享 | 按运营优先级 |

预估（粗算）：M0+M1 约 2–4 人周；M2 约 2–4 人周；M3 约 3–5 人周；后端微信+支付宝登录约 2–3 人周。

---

## 8. 待确认事项（产品 / 数据）

**C-10 已定为 Taro，不再讨论。** 其余项请标注首版 / 二期 / 不做。

### 8.1 产品与范围

| ID | 问题 | 建议默认 |
|----|------|----------|
| **C-01** | 首版模块 | 理论+实操 |
| **C-02** | 与 Web 共用用户与 `isAuthorized` | 是 |
| **C-03** | 未授权能否浏览首页 | 可浏览不可做题 |
| **C-04** | 小程序内邮箱登录 | 仅端登录；邮箱绑定二期 |
| **C-05** | 固定单题库 vs 多题库 | 固定三级 |
| **C-06** | 模考是否首版 | 二期 |

### 8.2 数据与安全

| ID | 问题 | 建议默认 |
|----|------|----------|
| **C-20** | 进度首版上云 | 否 |
| **C-21** | 代码填空答案在客户端 | 是（与 Web 一致） |
| **C-22** | 题库更新 | 随端发版 |
| **C-23** | 微信/支付宝/邮箱账号合并 | 待产品定 |
| **C-24** | Web 进度导入 Taro | JSON 导入或等上云 |

### 8.3 合规与运营

| ID | 问题 |
|----|------|
| **C-30** | 教育/工具类目与资质（微信+支付宝） |
| **C-31** | 用户协议、隐私政策 HTTPS URL |
| **C-33** | 正式 API 域名（双端白名单） |
| **C-40** | 首版上线时间 |
| **C-41** | 多端进度是否必须互通 |
| **C-42** | 各端体验版/提审账号 |

---

## 9. 风险与依赖

| 风险 | 缓解 |
|------|------|
| 代码填空在 Taro 输入/滚动踩坑 | 微信+支付宝真机原型前置；必要时 `cover-view` |
| 多端登录/审核政策差异 | `platform/auth.*` 隔离；合规模板分端文案 |
| Taro 与 Web 样式双轨 | 设计 token 表；不做 Tailwind 全量移植 |
| 判分不一致 | `packages/domain` + 共享单测 |
| 包体超限 | 分包 + 按需加载题库 |
| 支付宝能力滞后于微信 | 首版以微信为主轴，支付宝 M2 对齐功能集 |

---

## 10. Web 路由 → Taro 页面映射

| Web（`routes.ts`） | Taro 路径建议 |
|--------------------|---------------|
| `login` / `register` / `auth/pending` | `pages/auth/login` 等 |
| `.../theory` | `pages/theory/home` |
| `.../theory/sequential` | `pages/theory/dashboard` |
| `.../theory/practice/session` | `pages/theory/practice` |
| `.../theory/mock/*` | `pages/theory/mock/*`（分包） |
| `.../theory/wrong-book` | `pages/theory/wrong-book` |
| `.../operate` | `pages/operate/home` |
| `.../operate/session` | `pages/operate/session`（分包） |
| `settings` | `pages/settings/index` |
| `admin/*` | **不实现** |

**分包建议**：

- `packageTheory`：含 `theoryBank.json`
- `packageOperate`：含 `codeFillBank.json`

---

## 11. 后端接口草案（多端登录）

```text
POST /api/auth/wechat     { code }           → { token, user }
POST /api/auth/alipay     { authCode }       → { token, user }
POST /api/auth/login      { email, password } → { token, user }   # H5 / 管理用途
GET  /api/auth/me         Authorization       → { user }

# 二期
GET  /api/content/manifest
GET  /api/progress
PUT  /api/progress
```

用户表字段（示意）：`id`, `email?`, `wechat_openid?`, `alipay_user_id?`, `unionid?`, `is_authorized`, `role`, …

---

## 12. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 0.1 | 2026-05-19 | 初稿：架构评估、选型对比 |
| 1.0 | 2026-05-20 | **定为 Taro 多端**；补充 platform 抽象、Monorepo、编译矩阵、分期与接口草案 |

---

**下一步**：确认 §8 产品项 → 初始化 `apps/taro` + `packages/domain` → M1 微信体验版；并行输出各端提审检查表（可附于 `docs/MINIPROGRAM_RELEASE_CHECKLIST.md`）。
