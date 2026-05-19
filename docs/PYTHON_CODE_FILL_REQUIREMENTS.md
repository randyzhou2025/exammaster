# Python 代码填空练习 — 需求分析

**文档版本**：0.2（已评审确认）  
**日期**：2026-05-13  
**状态**：需求分析定稿，可进入交互说明 / 技术方案  
**关联**：`docs/INTERACTION_SPEC.md`、`PythonCode/`、`PythonCode/Python代码题题库.pdf`

---

## 1. 背景与目标

### 1.1 背景

人工智能训练师考试在真实场景中分为**理论考试（100 分）**与**实操考试（100 分）**，彼此独立。当前产品已支持理论题库（判断 / 单选 / 多选）与理论模拟考试；**实操部分**对应仓库中 20 道 Python 代码填空题，需在 App 内以「文字填空」形式练习（含 3.2.x 系列，交互与 1.x/2.x 一致，不跑 ONNX）。

### 1.2 产品目标

| 目标 | 说明 |
|------|------|
| **G1** | 首页区分为 **理论练习** 与 **实操练习** 两大块，结构清晰。 |
| **G2** | 实操：20 题全覆盖；**选题 → 多 Cell 填空 → 检查答案 → 题干/显示答案 → 本地进度**。 |
| **G3** | 判题：纯文本比对（首版不执行 Python / ONNX）。 |
| **G4** | 路由可扩展：在 `/examprep` 总入口下按 **考试 / 等级 / 模块(theory\|operate)** 分层。 |
| **G5** | 题库构建：**ipynb 出题面、html 出题干、PDF 黄色标答案**；构建时强校验，降低识别错误。 |

### 1.3 非目标（首版不做）

- 实操模拟考试、限时组卷、计分卷面（理论模考保持现状，实操模考不做）。
- 浏览器内运行 `.ipynb` 或 ONNX 推理验证。
- 服务端保存做题进度。
- 代码题管理后台。

---

## 2. 已确认的产品决策（评审结论）

| # | 议题 | 结论 |
|---|------|------|
| 1 | 题库范围 | **20 题全做**，含 **3.2.1–3.2.5**；统一为**文字填空** UI，不实现图像上传/推理交互。 |
| 2 | 标准答案 | 来自 **`PythonCode/Python代码题题库.pdf`**，按题号一一对应；PDF 中**黄色**为填空标准答案。 |
| 3 | 首页 | **改造首页**：**理论练习**（顺序练习 + 模拟考试 + 错题/收藏）与 **实操练习**（代码填空）分区展示。 |
| 4 | 「显示答案」与完成度 | **仅「显示答案」不算完成**；须用户点击 **「检查答案」且当前题全部填空判对** 才记「已完成」（见 §4.3）。 |
| 5 | 实操模考 | **不需要**；理论与实操各自 100 分，本次不做实操模考。 |
| 6 | 路由 | 采用分层 URL（见 §3）；`VITE_BASE_PATH=/examprep/` 为部署总口子。 |
| 7 | 清除数据 | 设置页 **「清除全部数据」同时清除** 理论进度与实操进度。 |

### 2.1 素材与答案来源（补充确认）

| 素材 | 用途 |
|------|------|
| `{题号}-素材/{题号}.ipynb` | **唯一**代码面来源：Cell 结构、下划线空位（`_____________`） |
| `{题号}-素材/{题号}.html` | **题干说明**（工作任务、数据字段、任务要求等），解析为 `stem` |
| `Python代码题题库.pdf` | **20 题标准答案**，按题目序号与 ipynb 空位顺序对齐；黄色高亮为答案文本 |

**题量**：固定 **20 题**，目录与题号如下（构建脚本扫描校验必须 20/20）：

`1.1.1`–`1.1.5`、`2.1.1`–`2.1.5`、`2.2.1`–`2.2.5`、`3.2.1`–`3.2.5`。

**质量要求**：提取题目与答案时须做**自动化校验 + 可人工复核的报告**（见 §5.4），尽量避免 PDF/解析错误导致判题错题。

---

## 3. 路由与信息架构

### 3.1 部署总口子与 React 路由

- 生产环境静态资源部署在 **`/examprep/`**（`VITE_BASE_PATH=/examprep/`）。
- 应用内 `BrowserRouter` 的 `basename` 为 `/examprep`，下表路径均为 **basename 之后** 的 **应用内 path**（浏览器完整路径 = `/examprep` + path）。

### 3.2 当前理论路由（改造前，供对照）

| 应用内 path | 页面 |
|-------------|------|
| `/` | 考试中心首页（顺序练习 + 模考混排） |
| `/sequential` | 顺序练习仪表盘 |
| `/practice/:kind`、`/practice/session` | 理论做题 |
| `/mock`、`/mock/session`、`/mock/result` | 理论模拟考试 |
| `/wrong-book` | 错题本 / 收藏 |
| `/banks` | 选择题库 |
| `/settings`、`/login`、`/register`、`/auth/pending` | 全局 |
| `/admin/users`、`/admin/login-logs` | 管理 |

完整 URL 示例：`https://qiway.site/examprep/sequential`。

### 3.3 目标路由（可扩展、层次分明）

采用 **考试产品 → 可选等级 → 模块** 三段式，便于后续扩展（四级、其他考试、无等级考试）。

**路径参数约定**

| 段 | 示例 | 说明 |
|----|------|------|
| `examId` | `AITrainer` | 考试/证书产品线 slug |
| `levelId` | `level3` | 等级；无等级考试时路由可省略该段（见下） |
| `module` | `theory` \| `operate` | **理论** \| **实操（代码填空）** |

**当前默认考试**（人工智能训练师 三级）：`examId=AITrainer`，`levelId=level3`。

#### 3.3.1 备考域（需登录 + 已选题库/考试上下文）

| 应用内 path | 页面 |
|-------------|------|
| `/AITrainer/level3` | **等级首页**（可选）：理论 \| 实操 两个入口卡片；若理论首页已足够，也可从 `/theory` 反链 |
| `/AITrainer/level3/theory` | **理论练习首页**（改造自现 HomePage 理论部分） |
| `/AITrainer/level3/theory/sequential` | 顺序练习仪表盘 |
| `/AITrainer/level3/theory/practice/:kind` | 理论练习入口（wrong / favorite 等） |
| `/AITrainer/level3/theory/practice/session` | 理论做题页 |
| `/AITrainer/level3/theory/mock` | 理论模考说明 |
| `/AITrainer/level3/theory/mock/session` | 理论模考中 |
| `/AITrainer/level3/theory/mock/result` | 理论成绩单 |
| `/AITrainer/level3/theory/wrong-book` | 错题本 / 收藏 |
| `/AITrainer/level3/operate` | **实操练习首页**（代码填空配置：模式/选题/统计） |
| `/AITrainer/level3/operate/session` | **实操做题页** |

浏览器完整路径示例：

- 理论首页：`/examprep/AITrainer/level3/theory`
- 实操配置：`/examprep/AITrainer/level3/operate`
- 实操做题：`/examprep/AITrainer/level3/operate/session`

#### 3.3.2 全局（与具体考试模块解耦）

| 应用内 path | 说明 |
|-------------|------|
| `/login`、`/register` | 登录注册 |
| `/auth/pending` | 待授权 |
| `/settings` | 设置（清除全部数据等） |
| `/banks` | 选题库/考试（可演进为考试目录 `/examprep` 下多考试列表） |
| `/admin/*` | 管理后台 |

#### 3.3.3 扩展示例（实现时路由表预留，本期可不实现页面）

| 场景 | path 示例 |
|------|-----------|
| 四级理论 | `/AITrainer/level4/theory` |
| 其他考试、带等级 | `/OtherCert/level2/operate` |
| 不区分等级 | `/SomeExam/theory`（`levelId` 路由段可选，用嵌套路由 `level3?` 或两套 Route 注册） |

**实现建议**：集中定义 `routes.ts` 常量，例如 `examPath('AITrainer','level3','theory','sequential')`，避免硬编码散落；`selectedExam` 存入 persist（可替代或扩展现有 `selectedQuestionBankId`）。

#### 3.3.4 兼容与迁移

- 旧 path（`/`, `/sequential`, …）在改造期提供 **`Navigate` 301/302 式重定向** 到 `/AITrainer/level3/theory/...`，避免用户书签失效。
- 默认考试未选择时：仍走 `/banks` 或自动写入 `AITrainer/level3`。

### 3.4 首页信息架构（改造后）

**`/AITrainer/level3/theory`**（理论练习首页）示意结构：

```
┌─────────────────────────────────┐
│ 人工智能训练师（3级）· 理论练习      │
├─────────────────────────────────┤
│ 【理论练习】                      │
│   · 顺序练习（进度 x/900）        │
│   · 模拟考试（190题/60分钟）      │
│   · 错题本 / 收藏                 │
├─────────────────────────────────┤
│ 【实操练习】→ 跳转 operate 首页   │
│   · Python 代码填空（进度 x/20）  │
└─────────────────────────────────┘
```

**`/AITrainer/level3/operate`**：实操专用配置页（§4.1），不再与理论混在同一屏。

---

## 4. 功能需求

### 4.1 实操 · 练习配置页（`/operate`）

#### 4.1.1 练习方式（三选一）

| 模式 | 行为 |
|------|------|
| 按顺序刷全部 | 20 题按题号排序 |
| 随机刷全部 | 20 题洗牌 |
| 挑选特定题目 | 题号网格多选；未选不可开始 |

#### 4.1.2 选题网格

- 展示 `1.1.1` … `3.2.5` 共 20 格；**全选 / 清除**；**已选 N 题**。
- **已完成**（§4.3）显示角标。

#### 4.1.3 统计

- **题目总数**：20（固定，与构建校验一致）。
- **已完成**：全对通过检查的题目数。

#### 4.1.4 操作

| 按钮 | 行为 |
|------|------|
| 开始答题 | 写 `codeFillPractice` 会话 → `/operate/session` |
| 清空所有数据 | 仅清空**实操**进度与会话（设置页「清除全部」则理论+实操一并清，见 §2） |

---

### 4.2 实操 · 做题页（`/operate/session`）

（交互与 v0.1 一致，仅强调数据源）

- 顶栏：题号 + 标题、进度（第 i/n 题 · x 块 · y 空）、**题干**（来自 **html** 解析内容）。
- 代码区：与 **ipynb** Cell 对齐；行内填空。
- **检查答案** / **显示答案** / **清空本题** / **上一题** / **下一题**。
- **显示答案**：填入标准答案并标记为已揭示；**不单独触发「已完成」**。

### 4.3 完成态与进度

| 规则 | 说明 |
|------|------|
| **单题完成** | 用户点击 **「检查答案」** 且 20 题中该题**全部空**判对（在已揭示答案状态下检查通过也算）。 |
| **不算完成** | 仅点击「显示答案」未点检查，或检查未全对。 |
| **草稿** | 切换题号、刷新页面后保留输入；未完成题可继续练。 |
| **继续练习** | 持久化 `operateResumeQuestionId`（对齐理论书签思路）。 |

---

## 5. 数据与内容模型

### 5.1 单题 JSON 结构（构建产物）

```ts
interface CodeFillQuestion {
  id: string;              // "1.1.1"，与目录名一致
  title: string;           // 从 html 标题或 pdf 章节名提取
  stem: string;            // 来自 {id}.html 正文（工作任务等）
  cells: CodeFillCell[];   // 来自 {id}.ipynb
  meta: {
    examId: "AITrainer";
    levelId: "level3";
    blankCount: number;
    cellCount: number;
  };
}
```

`CodeFillBlank.accepted: string[]` 来自 PDF 黄色答案，顺序与 ipynb 中空位**从上到下、逐 Cell、逐行**一致。

### 5.2 用户进度（localStorage）

独立 key（如 `codeFillProgress-v1`），字段同 v0.1；**设置 `resetAll()` 必须同时清空** 理论与实操（及模考记录等现有字段）。

备份 `exportBackup` / `importBackup`：**二期**纳入实操进度；首版至少保证「清除全部」一致。

### 5.3 题库构建流水线（必须实现）

```
PythonCode/{id}-素材/{id}.ipynb  ──► 解析 cells + blank 列表
PythonCode/{id}-素材/{id}.html  ──► 解析 stem（题干）
PythonCode/Python代码题题库.pdf ──► 按题号切分 + 提取黄色文本为 answers[]
                    │
                    ▼
           scripts/build-code-fill-bank.mjs
                    │
                    ▼
           src/data/codeFillBank.json + build-report.json
```

**脚本建议名**：`scripts/build-code-fill-bank.mjs`（或 `npm run build:code-bank`）。

### 5.4 构建校验（强制，避免识别错误）

构建失败（非零退出）条件建议包含：

| 校验项 | 说明 |
|--------|------|
| **题量** | 必须正好 **20** 个目录，且题号集合与清单一致 |
| **空位数量** | 每题：ipynb 中 `_____________` 个数 = PDF 提取的黄色答案条数 |
| **顺序抽检** | 第 1 空 ipynb 上下文与 PDF 第 1 条答案可做关键字匹配（可选启发式） |
| **html 存在** | 每题必须有对应 `.html` |
| **无空答案** | 任一空 `accepted` 为空则失败 |
| **报告文件** | 输出 `build-report.json`：每题 blankCount、stem 长度、答案预览前 40 字，供人工 diff |

PDF 解析实现路径（实现阶段选型，需求层定原则）：

1. 优先：PDF 文本+颜色信息提取黄色 run（如 `pdfjs` / Python `pdfplumber` 预处理后生成 JSON，前端构建只读 JSON）。  
2. 兜底：首次人工校对生成 `PythonCode/answers.manifest.json`，构建只信 manifest，PDF 仅作来源文档。

**禁止**：仅 OCR 无校验即上线；**必须**可重复构建且校验通过。

---

## 6. 判题规则

- 时机：仅 **检查答案**。
- 规则：trim、引号归一、多答案候选；**不执行 Python**。
- 3.2.x 与 1.x 相同文本判题（ONNX 相关空在 ipynb/PDF 中仍表现为代码片段填空）。

---

## 7. UI/UX

- 移动优先；风格与 ExamMaster 品牌统一（**参考截图，不一比一复刻**）。
- 理论首页与实操首页视觉分区明确（标题、配色或卡片分组区分「理论」「实操」）。

---

## 8. 与现有模块关系

| 模块 | 关系 |
|------|------|
| 理论 `theoryBank` | 不变；路由迁至 `.../theory/...` |
| 理论模考 | 仅理论路径下保留 |
| 实操 | 新 `codeFillBank` + `codeFillStore`（或 appStore 切片） |
| 认证 | 不变 |

---

## 9. 验收标准

| 编号 | 验收项 |
|------|--------|
| AC-1 | 理论/实操首页分区清晰；实操入口进入 `/AITrainer/level3/operate` |
| AC-2 | 20 题均可练习；3.2.x 为文字填空，无 ONNX 交互 |
| AC-3 | 题干来自 html，代码块来自 ipynb，与素材一致 |
| AC-4 | 检查答案与 PDF 标准答案一致（抽检 ≥3 题全空正确） |
| AC-5 | 显示答案不单独计完成；检查全对计完成 |
| AC-6 | 构建脚本校验失败时 CI/本地 build 失败 |
| AC-7 | 设置「清除全部」同时清空理论与实操进度 |
| AC-8 | 旧 URL 重定向到 `.../theory/...` 可用 |
| AC-9 | 无实操模考入口 |

---

## 10. 分期建议

| 阶段 | 内容 |
|------|------|
| **P0** | 路由重构 + 理论首页改造 + 构建流水线 + 实操 P0 页面 |
| **P1** | 备份含实操进度、继续练习书签优化 |
| **P2** | 多考试/多等级目录、考试选择页 |

---

## 11. 附录：参考截图 → 需求映射

（同 v0.1 §13，略）

---

## 12. 待办（实现前技术方案需细化）

1. PDF 黄色答案提取选型与样例 PR（附 1.1.1 人工对照表）。  
2. `selectedQuestionBankId` 与 `examId/levelId` 数据模型合并方案。  
3. html → `stem` 清洗规则（去导航、保留工作任务 Markdown）。

---

**文档结束（v0.2）。** 若需调整路由 slug（`AITrainer` / `level3` / `operate`）命名，可在技术方案阶段最终锁定常量。
