# 破冰协议（Icebreaker Protocol）

> 面向完美主义者的 AI 任务启动协议：把“想太多但动不了”的状态，拆成可执行步骤，并逼近一个可以修改的雏形。

破冰协议不是时间管理工具，也不是待办清单。它针对的是另一类更隐蔽的卡点：你知道事情重要，也并不是不想做，但因为太在乎结果，反而迟迟不敢开始。

项目当前包含三部分：

- 一套可作为 Agent Skill 使用的协议指令（`SKILL.md`）
- 一个 FastAPI 本地演示后端（`server.py`）
- 一个 Vite 前端 demo，包含任务拆解、计时、附件、语音、改进循环和产出评价（`demo/`）

---

## 核心机制

1. **启动契约**：把目标从“做完美”压缩为“做出可以改的雏形”。
2. **任务拆解**：将任务拆成 3-6 个可见产出块，每步有明确交付物。
3. **限时执行**：每步默认 1-15 分钟，计时器分为乱写期、修整期和紧急状态。
4. **上下文协助**：`[Protocol]` 侧边抽屉读取当前任务、步骤、历史产出和附件上下文，直接给可用内容。
5. **改进循环**：完成后只改一处，由 AI 指定最值得改的步骤，避免用户继续陷入选择瘫痪。
6. **产出评价**：从功能完整性、产出质量、可展示性、文档、受众匹配度 5 个维度生成质量报告。

---

## 技术栈

| 层级 | 技术 | 版本 / 说明 |
|---|---|---|
| Python | Python | 3.11（见 `.python-version`） |
| Python 包管理 | uv | 项目内 `.venv`，禁止直接使用 `pip` |
| 后端 | FastAPI | `>=0.110.0` |
| 后端服务 | Uvicorn | `>=0.29.0` |
| LLM SDK | OpenAI Python SDK | `>=1.12.0`，兼容 DeepSeek/OpenAI 风格接口 |
| 文档解析 | pypdf / python-docx / openpyxl / python-pptx | 支持 PDF、DOCX、XLSX、PPTX 附件解析 |
| 前端 | Vite | `^6.0.0`（lock 中为 6.4.2） |
| PWA | vite-plugin-pwa | `^1.3.0` |
| Markdown | marked | `^15.0.0`（lock 中为 15.0.12） |
| XSS 防护 | DOMPurify | `^3.2.0`（lock 中为 3.4.5） |

---

## 快速开始

### 1. 准备 Python 环境

```bash
uv venv --python 3.11
uv sync
```

Windows 激活虚拟环境：

```powershell
.venv\Scripts\activate
```

### 2. 配置可选的 AI 接口

没有 API Key 时，后端会使用内置规则引擎，demo 仍可跑通。

```bash
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

也可以复制 `.env.example` 为 `.env` 后填写。

### 3. 启动本地演示

```bash
uv run icebreaker-demo
```

打开：

```text
http://localhost:8000
```

### 4. 前端开发模式

```bash
cd demo
npm install
npm run dev
```

构建：

```bash
cd demo
npm run build
```

---

## 功能状态

| 功能 | 状态 | 说明 |
|---|---|---|
| Agent Skill 协议 | 已实现 | `SKILL.md` 可作为独立对话协议使用 |
| AI 任务拆解 | 已实现 | API 可用时由模型拆解；不可用时走规则引擎 |
| 任务路线图 | 已实现 | 3-6 步可见产出，支持当前步骤高亮 |
| 三阶段倒计时 | 已实现 | 乱写期 / 修整期 / 紧急状态 |
| 侧边抽屉帮助 | 已实现 | `[Protocol]` 读取任务、步骤、历史产出和附件 |
| 停滞自动介入 | 已实现 | 单步停留过久时主动打开帮助面板 |
| 语音输入 | 已实现基础版 | 基于 Web Speech API，支持首页、步骤区和帮助抽屉 |
| 附件解析 | 已实现 | PDF、DOCX、XLSX、PPTX 可解析为上下文 |
| 摘要归档 | 已实现 | `/api/summarize` 将每步产出压缩为战报摘要 |
| 改进循环 | 已实现 | Done 页进入 Roadmap，高亮一处改进目标 |
| 产出质量评价 | 已实现 | Web 表单 + CLI 脚本，生成 Markdown 报告 |
| PWA | 已实现 | Vite PWA 插件、manifest、图标 |
| Vercel serverless demo | 已配置 | `demo/api/` 提供轻量 API fallback |

---

## 项目结构

```text
.
├── SKILL.md                         # 破冰协议 Agent Skill
├── server.py                        # FastAPI 本地演示后端
├── main.py                          # icebreaker-demo 入口
├── scripts/
│   ├── timer.py                     # 倒计时脚本
│   ├── review.py                    # CLI 产出质量评价器
│   └── migrate_state.py             # 本地状态迁移辅助脚本
├── demo/
│   ├── index.html                   # Vite 前端入口
│   ├── src/                         # 前端模块
│   ├── api/                         # Vercel serverless API
│   ├── public/                      # manifest / icon
│   └── vite.config.js
├── docs/                            # 项目文档
│   ├── product-design-decisions.md  # 产品设计决策和状态
│   ├── strategic-positioning.md     # 战略定位与竞品分析
│   ├── competition-review.md        # 比赛提交前审视报告
│   ├── CHANGELOG.md                 # 更新日志
│   ├── 商业价值说明书.md            # 商业化与定位说明
│   └── 录屏脚本.md                  # 效果演示视频脚本
├── references/
│   └── scenarios-and-examples.md    # 场景与拆解示例
├── materials/                       # 路演 PPT、海报、历史归档(非代码资产)
├── reviews/                         # 质量评价报告输出目录(本地，不纳入 git)
└── tests/                           # 协议契约测试
```

---

## API 概览

本地 FastAPI 后端提供：

| 接口 | 用途 |
|---|---|
| `POST /api/chat` | 主对话入口：契约、拆解、步骤帮助、完成状态 |
| `POST /api/chat/stream` | SSE 流式输出 `[Protocol]` 回复 |
| `POST /api/attachments/parse` | 解析 PDF / DOCX / XLSX / PPTX 附件 |
| `POST /api/summarize` | 将单步原始产出压缩成战报摘要 |
| `GET /` | 返回 demo 首页 |

Vercel 版本在 `demo/api/` 下提供同名轻量接口，优先保证 demo 可运行。

---

## 产出质量评价

Web demo 的 Done 页面可以进入“评价产出”，从 5 个维度打分并下载 Markdown 报告。

也可以使用 CLI：

```bash
uv run python scripts/review.py "我的任务名"
```

报告会写入 `reviews/`，历史记录写入 `reviews/history.json`。

---

## 设计原则

- 不安慰，不鸡汤，只给下一步操作。
- 每一步必须有可见产出，禁止“想一想”这种空操作。
- 复杂任务增加步骤数量，不增加单步时长。
- 改进时每轮只改一处，防止“优化”变成新的拖延。
- 协议不是降低标准，而是先制造一个可以被标准加工的对象。

---

## 相关文档

- [产品设计决策](docs/product-design-decisions.md)
- [战略定位与竞品分析](docs/strategic-positioning.md)
- [比赛提交前问题审视报告](docs/competition-review.md)
- [商业价值说明书](docs/商业价值说明书.md)
- [录屏脚本](docs/录屏脚本.md)
- [更新日志](docs/CHANGELOG.md)

---

## 许可证

MIT
