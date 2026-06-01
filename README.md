# 破冰协议（Icebreaker Protocol）

> 完美主义者的 AI 任务启动协议：拆解瘫痪，逼近雏形。

---

## 项目背景

完美主义者不是不想做，而是太想做对，反而动不了。破冰协议不管理任务、不切割时间、不提供激励——它只做一件事：**把启动成本降到零，并逼你交出一个可改的雏形。**

核心流程：启动契约 → 任务拆解 → 限时执行 → 改进循环 → 产出评价。每一步都有明确产出，每轮改进只改一处，协议不安慰只给操作。

### 技术栈

| 层级 | 技术 | 版本 |
|---|---|---|
| 语言 | Python | 3.11 |
| 包管理 | uv | 项目内 `.venv` |
| 后端框架 | FastAPI | 0.136.1 |
| ASGI 服务 | Uvicorn | 0.46.0 |
| LLM SDK | OpenAI Python SDK | 2.36.0（兼容 DeepSeek / OpenAI） |
| 文档解析 | pypdf / python-docx / openpyxl / python-pptx | 6.11.0 / 1.2.0 / 3.1.5 / 1.0.2 |
| 环境变量 | python-dotenv | 1.2.2 |
| 前端构建 | Vite | 6.4.2 |
| PWA | vite-plugin-pwa | 1.3.0 |
| Markdown 渲染 | marked | 15.0.12 |
| XSS 防护 | DOMPurify | 3.4.5 |
| 部署 | Vercel Serverless | Python 3.11 Runtime |

### 技术亮点

- **三端对齐的协议契约测试**：协议同时存在 SKILL.md（Agent Skill）、server.py（本地 FastAPI）、demo/api/（Vercel Serverless）三种形态，任何一端偏离协议规则都会被 `tests/` 下的契约测试捕获，5 秒内跑完，不依赖 LLM。
- **规则引擎 + LLM 双通道拆解**：没有 API Key 时，后端使用内置规则引擎完成任务拆解和步骤帮助，demo 全程可跑通；有 Key 时无缝切换为 LLM 驱动，降低首次使用门槛。
- **改进循环的"只改一处"约束**：完成后 AI 指定最值得改的步骤，用户只管确认。第 3 轮温和提醒，第 4 轮强警告——协议是一把刀不是一堵墙，但刀刃始终对着完美主义无限循环。
- **三阶段倒计时器**：乱写期 → 修整期 → 紧急状态，把"限时执行"从抽象约束变成可感知的压力梯度，配合停滞自动介入（60 秒无输入触发帮助面板）。
- **附件上下文穿透**：PDF / DOCX / XLSX / PPTX 解析后摘要带入任务拆解和步骤帮助，用户上传材料后 AI 不会"失忆"。
- **前端状态持久化与会话恢复**：localStorage 快照 + 版本迁移 + 7 天过期清理，关闭浏览器重开后回到中断时的步骤，附件和设置完整保留。

### 项目演示

- 本地运行：`uv run icebreaker-demo` → `http://localhost:8000`

---

## 快速开始

### 方式一：生产模式（推荐新手）

前端已预构建，只需启动后端：

```bash
# 1. 准备环境
uv venv --python 3.11
uv sync

# 2. 配置 AI（可选，不配也全程可用）
cp .env.example .env

# 3. 启动（前端 + API 统一端口）
uv run icebreaker-demo
```

打开 http://localhost:8000 — 前端和 API 都在这个端口。

### 方式二：开发模式（前端开发用）

前后端分别启动，前端带热更新：

```bash
# 终端 1：启动后端
uv run icebreaker-demo
# → http://localhost:8000 (API)

# 终端 2：启动前端开发服务器
cd demo
npm install
npm run dev
# → http://localhost:3000 (前端，自动代理 API 到 8000)
```

| 端口 | 服务 | 说明 |
|------|------|------|
| 8000 | FastAPI 后端 | 提供 `/api/*` 接口和生产模式前端 |
| 3000 | Vite 开发服务器 | 前端热更新，API 请求代理到 8000 |

### 环境变量配置

在项目根目录创建 `.env` 文件：

```bash
cp .env.example .env
# 编辑 .env 填入 Key
```

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DEEPSEEK_API_KEY` | (空) | DeepSeek API Key。不配置时使用规则引擎 fallback |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | API 基础地址，可改为 OpenAI 兼容端点 |
| `DEEPSEEK_MODEL` | `deepseek-chat` | 模型名称 |

没有 API Key 时，demo 全程可用——任务拆解和评价都走本地规则引擎。
可在设置面板（协议设置 → AI 接口）查看当前 Key 连通状态。

---

## 核心机制

1. **启动契约**：把目标从"做完美"压缩为"做出可以改的雏形"。
2. **任务拆解**：将任务拆成 3-6 个可见产出块，每步有明确交付物。
3. **限时执行**：每步默认 1-15 分钟，三阶段计时（乱写期 / 修整期 / 紧急状态）。
4. **上下文协助**：`[Protocol]` 侧边抽屉读取当前任务、步骤、历史产出和附件上下文。
5. **改进循环**：AI 指定最值得改的一步，每轮只改一处，轮次警告防止无限优化。
6. **产出评价**：5 维度质量报告（功能完整性 / 产出质量 / 可展示性 / 文档 / 受众匹配度）。

---

## 功能状态

| 功能 | 状态 | 说明 |
|---|---|---|
| Agent Skill 协议 | ✅ | `SKILL.md` 可作为独立对话协议使用 |
| AI 任务拆解 | ✅ | API 可用时 LLM 驱动；不可用时规则引擎 fallback |
| 任务路线图 | ✅ | 3-6 步可见产出，当前步骤高亮 |
| 三阶段倒计时 | ✅ | 乱写期 / 修整期 / 紧急状态 |
| 侧边抽屉帮助 | ✅ | `[Protocol]` 读取任务上下文 |
| 停滞自动介入 | ✅ | 60 秒无输入自动打开帮助面板 |
| 语音输入 | ✅ 基础版 | Web Speech API，支持首页/步骤区/帮助抽屉 |
| 附件解析 | ✅ | PDF、DOCX、XLSX、PPTX → 上下文 |
| 摘要归档 | ✅ | `/api/summarize` 破冰战报摘要 |
| 改进循环 | ✅ | Done → Roadmap，高亮改进目标，轮次警告 |
| 产出质量评价 | ✅ | Web 表单 + CLI 脚本 |
| 协议设置 | ✅ | 强度 / 时间偏好 / 产出模式 |
| PWA | ✅ | Vite PWA 插件 + manifest + Service Worker |
| Vercel Serverless | ✅ | `demo/api/` 轻量 fallback |

---

## 项目结构

```text
.
├── SKILL.md                         # 破冰协议 Agent Skill（唯一事实源）
├── server.py                        # FastAPI 本地演示后端
├── dev-server.py                    # 轻量开发服务器（零依赖 HTTP）
├── main.py                          # icebreaker-demo 入口
├── scripts/
│   ├── timer.py                     # 思考预算倒计时脚本
│   ├── review.py                    # CLI 产出质量评价器
│   └── migrate_state_v2.py          # 前端状态迁移脚本
├── demo/
│   ├── index.html                   # Vite 前端入口
│   ├── src/                         # 前端模块（state / steps / timer / help / ...）
│   ├── api/                         # Vercel Serverless API
│   │   ├── _common.py              # 共享逻辑（拆解 / 回复 / 摘要）
│   │   ├── chat.py                 # 对话接口
│   │   ├── summarize.py            # 摘要接口
│   │   └── attachments/            # 附件解析
│   ├── public/                      # manifest / icon
│   ├── vite.config.js              # Vite + PWA + API 代理
│   └── vercel.json                 # Vercel 部署配置
├── tests/
│   ├── test_protocol_contract.py   # 协议三方契约测试
│   └── test_cases.json             # 测试用例
├── docs/                            # 产品文档
├── references/                      # 场景与拆解示例
├── materials/                       # 路演 PPT、海报（非代码资产）
└── reviews/                         # 质量评价报告输出（本地，不入 git）
```

---

## API 概览

| 接口 | 方法 | 用途 |
|---|---|---|
| `/api/chat` | POST | 主对话入口：契约、拆解、步骤帮助、完成状态 |
| `/api/chat/stream` | POST | SSE 流式输出 `[Protocol]` 回复 |
| `/api/attachments/parse` | POST | 解析 PDF / DOCX / XLSX / PPTX 附件 |
| `/api/review` | POST | AI 产出质量评价（5 维度，含 fallback） |
| `/api/summarize` | POST | 将单步产出压缩成破冰战报摘要 |
| `/api/key-status` | GET | 检查 AI API Key 配置状态和连通性 |

本地 FastAPI 和 Vercel Serverless 提供同名接口，后者为轻量 fallback。

---

## 协议契约测试

三种形态（SKILL.md / server.py / demo/api）必须对齐：

```bash
uv run python -m unittest discover tests -v
```

覆盖 8 条硬规则（步骤数 3-6、单步时长 1-15 分钟、screen 路由、关键词触发），5 秒跑完。已知偏差以 `expectedFailure` 标记。详见 `tests/README.md`。

---

## 产出质量评价

**Web**：Done 页 → "评价产出" → 5 维度打分 → 下载 Markdown 报告

**CLI**：

```bash
uv run python scripts/review.py "我的任务名"
```

报告写入 `reviews/`，历史记录写入 `reviews/history.json`。

---

## 设计原则

- 不安慰，不鸡汤，只给下一步操作。
- 每一步必须有可见产出，禁止"想一想"这种空操作。
- 复杂任务增加步骤数量，不增加单步时长。
- 改进时每轮只改一处，防止"优化"变成新的拖延。
- 协议不是降低标准，而是先制造一个可以被标准加工的对象。

---

## 相关文档

- [产品设计决策](docs/product-design-decisions.md)
- [战略定位与竞品分析](docs/strategic-positioning.md)
- [比赛审视报告](docs/competition-review.md)
- [场景与拆解示例](references/scenarios-and-examples.md)
- [更新日志](docs/CHANGELOG.md)

---

## 许可证

MIT
