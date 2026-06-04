# 破冰协议 · 技术规范与标准

> 版本：v0.1 | 创建日期：2026-06-01
> 本文档定义代码规范、目录结构和注释标准。

---

## 一、技术选型

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端 | Vanilla JS + Vite | Vite 6.x | 不引入框架，降低决策成本 |
| 构建工具 | Vite | 6.x | 开发服务器 + 生产构建 + PWA 支持 |
| 后端（本地）| FastAPI | 0.115+ | Python 异步框架，自动 API 文档 |
| 后端（线上）| Vercel Serverless | - | `demo/api/` 下的 Python 函数 |
| AI SDK | OpenAI Python / JS SDK | 1.x | 统一接口，支持多模型切换 |
| 包管理 | uv | 0.6+ | 仅用于 Python 依赖 |
| Node 包管理 | npm | 10.x | 前端依赖 |

---

## 二、目录结构

```
icebreaker-protocol/
├── demo/                    # 前端代码 + Vercel 部署
│   ├── src/                 # 前端源码
│   │   ├── main.js          # 入口
│   │   ├── landing.js       # 首页
│   │   ├── contract.js      # 契约页
│   │   ├── roadmap.js       # 路线图
│   │   ├── steps.js         # 步骤执行
│   │   ├── timer.js         # 三阶段计时器
│   │   ├── protocol.js      # [Protocol] 抽屉
│   │   ├── review.js        # 评价页
│   │   ├── settings.js      # 设置面板
│   │   ├── attachments.js   # 附件解析
│   │   ├── speech.js        # 语音输入
│   │   ├── help.js          # 提示词起搏器
│   │   ├── inactivity.js    # 无活动监控
│   │   └── utils.js         # 工具函数
│   ├── api/                 # Vercel Serverless 函数
│   ├── dist/                # 构建输出（不提交）
│   └── index.html           # 主页面
├── server.py                # 本地 FastAPI 后端
├── docs/                    # 项目文档
│   ├── COMMUNICATING.md     # 人机协作规范
│   ├── ADVICE.md            # 建议与踩坑记录
│   ├── STANDARDS.md         # 本文档
│   └── ...                  # 其他文档
├── scripts/                 # 工具脚本
├── reviews/                 # 评价报告输出
├── pyproject.toml           # Python 项目配置
└── README.md                # 项目说明
```

---

## 三、代码规范

### 3.1 JavaScript
- 使用 ES2020+ 语法
- 模块导入用相对路径：`import { x } from './utils.js'`
- 状态变量用 `state` 对象集中管理，不分散在全局
- DOM 操作前检查元素存在：`if (!el) return;`

### 3.2 Python
- 类型注解：函数参数和返回值必须标注
- 异步优先：IO 操作（AI 请求、文件读取）用 `async/await`
- Pydantic 模型：API 请求/响应必须定义模型
- 错误处理：用 `try/except` 捕获外部 API 调用，返回友好错误信息

### 3.3 注释规范（详细）

**函数级注释（必须）：**
```javascript
/**
 * 进入指定步骤，渲染步骤界面
 * @param {number} index - 步骤索引（从0开始）
 * @param {boolean} isImprovement - 是否为改进循环
 * @returns {Promise<void>}
 */
async function goToStep(index, isImprovement = false) { ... }
```

**复杂逻辑块（必须）：**
```javascript
// 检测旧版 Service Worker 并强制清理
// 原因：Vite PWA 构建后文件名带 hash，旧 SW 会缓存过期资源
// 触发条件：页面加载时检测当前 SW 版本与构建版本不一致
if (currentSWVersion !== buildVersion) { ... }
```

**不需要注释的：**
- 自描述的单行操作：`const sum = a + b;`
- 标准 API 调用：`document.getElementById('app')`

---

## 四、API 规范

### 4.1 端点命名
- 全部小写，用连字符：`/api/task-decompose`
- 动词用 HTTP 方法表示：GET 查询、POST 创建、PUT 更新

### 4.2 响应格式
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "version": "2.0.0",
    "prompt_version": "review_v1"
  }
}
```

### 4.3 错误码
| 状态码 | 场景 | 前端行为 |
|--------|------|----------|
| 400 | 请求参数错误 | 提示用户检查输入 |
| 401 | API Key 未配置 | 引导用户打开设置面板 |
| 429 | 速率限制 | 提示"请求太频繁，请稍后再试" |
| 500 | 服务端错误 | 显示"服务暂时不可用"，记录日志 |

---

## 五、可维护性要求

### 5.1 单一职责
- 一个文件只干一件事：`steps.js` 只管步骤渲染，不处理计时器逻辑
- 超过 200 行的文件必须考虑拆分

### 5.2 可扩展预留
- 新功能通过"开关"控制，默认关闭
- 配置项集中管理，不硬编码在业务逻辑中

### 5.3 向后兼容
- API 响应新增字段用可选值，不破坏旧前端
- localStorage 数据结构变更时，提供迁移逻辑
