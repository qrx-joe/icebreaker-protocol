# 破冰协议 · Next To-Do

> 当前版本: v2.0.0 | 最后更新: 2026-05-31

---

## 🔴 高优先级（阻塞/影响核心体验）

### 0. AI 评价始终显示"暂不可用"
**状态**: 后端路由已实现，但前端仍显示 fallback 文案
**根因分析**:
- `_ai_review()` 调用 `client.chat.completions.create()` 时可能抛出异常（API Key 无效、网络超时、模型返回格式错误）
- 异常后落入 `_fallback_review()`，返回 `"mode": "local"` 和 `"summary": "AI评价暂时不可用..."`
- 前端 `review.js:219` 检测到 `data.mode === 'local'` 时弹出 toast，但未明确告知用户是 API Key 问题还是网络问题

**待排查**:
- [ ] 确认 `.env` 中的 `DEEPSEEK_API_KEY` 是否有效（curl 直接测试 API）
- [ ] 确认 `_ai_review()` 异常时是否吞掉了有用的错误信息（当前 `except Exception: return {}`）
- [ ] 前端未区分"API Key 缺失"和"API 调用失败"，用户无法自助排查

**修复方案**:
- [ ] `_ai_review()` 异常时返回具体错误类型（`api_key_missing` / `timeout` / `invalid_response`）
- [ ] 前端根据错误类型显示不同的引导文案（如"请检查 .env 中的 API Key"）
- [ ] 在设置面板中增加 API Key 配置入口和连通性测试按钮

---

### 1. 前端样式渲染稳定性
**状态**: 部分场景下仍无法渲染（白底无样式）
**根因**: 
- Vite 构建的 `dist/` 目录被 FastAPI 静态文件服务挂载后，浏览器仍可能加载缓存的旧版本
- PWA Service Worker 缓存策略导致旧版本 `index.html`（引用 `/src/main.js`）被优先返回

**解决方案**:
- [ ] 在 `vite.config.js` 中配置 `workbox` 的 `skipWaiting` 和 `clientsClaim`，确保新版本立即生效
- [ ] 为 `index.html` 添加缓存控制头 `Cache-Control: no-cache, no-store, must-revalidate`
- [ ] 或在 FastAPI 中为 `index.html` 单独设置无缓存响应头（而非通过 `StaticFiles`）
- [ ] 考虑在 `index.html` 中添加版本戳查询参数（如 `?v=2.0.0`）强制刷新

**验证方式**: 关闭浏览器后重新打开，首次访问即显示深色主题样式

---

### 2. `demo/uv.lock` 是否应加入 `.gitignore`
**状态**: 已提交到仓库
**问题**: `uv.lock` 是 uv 包管理器的锁定文件，通常用于 Python 依赖锁定。但 `demo/` 目录是前端项目（npm/vite），此文件可能是误生成。

**行动**:
- [ ] 确认 `demo/uv.lock` 的来源和必要性
- [ ] 如不需要，从仓库移除并加入 `.gitignore`

---

## 🟡 中优先级（功能完善）

### 3. 统一开发/生产启动方式文档
**状态**: README 未更新本次改动
**问题**: 当前项目支持两种启动方式，但文档未明确说明：
- **开发模式**: `cd demo && npm run dev`（Vite port 3000）+ `uv run python main.py`（FastAPI port 8000）
- **生产模式**: `cd demo && npm run build` + `uv run python main.py`（FastAPI 直接服务 dist/）

**行动**:
- [ ] 更新 README.md，添加清晰的「快速启动」章节
- [ ] 说明两种模式的适用场景和端口映射
- [ ] 添加环境变量配置说明（`.env` 文件）

---

### 4. `/api/review` 端点缺少响应模型
**状态**: 已实现但无 Pydantic 模型验证
**问题**: `server.py` 中的 `review` 端点返回 `dict`，FastAPI 无法生成正确的 OpenAPI 文档

**行动**:
- [ ] 为 `ReviewResponse` 创建 Pydantic 模型（含 `dimensions` 列表）
- [ ] 统一 `normalizeReview` 逻辑（前端 `review.js` 与后端 `_fallback_review` 的评分算法应保持一致）

---

### 5. PWA 资源 404
**状态**: `icon.svg` 和 `manifest.json` 在某些场景下 404
**根因**: 构建后的 `dist/` 目录包含这些文件，但 `StaticFiles(html=True)` 的 SPA fallback 可能干扰

**行动**:
- [ ] 验证 `dist/icon.svg` 和 `dist/manifest.json` 是否能直接访问
- [ ] 如不能，检查 `StaticFiles` 的 `check_dir` 行为或改用显式路由

---

## 🟢 低优先级（优化/重构）

### 6. 代码质量
- [ ] `server.py` 中的 `REVIEW_PROMPT` 和 `REVIEW_DIMENSIONS` 可提取到独立模块（如 `server/review.py`）
- [ ] `demo/api/review.py`（Vercel serverless 版本）与 `server.py` 中的 review 逻辑重复，考虑复用
- [ ] `server.py` 已超过 800 行，建议按功能拆分为多个模块

### 7. 测试覆盖
- [ ] 为 `/api/review` 添加单元测试（有 API Key 时返回 AI 评价，无 Key 时返回 fallback）
- [ ] 为静态文件服务添加测试（确认 `dist/` 资源可访问）

### 8. 部署优化
- [ ] Vercel 部署时，`demo/api/` 下的 serverless 函数是否仍能正常工作？
- [ ] `demo/api/_common.py` 中的 `load_dotenv()` 在 Vercel 环境（无 `.env` 文件）下是否安全？

---

## 📋 已完成的改动（本次会话）

| 改动 | 文件 | 说明 |
|---|---|---|
| ✅ 添加 `/api/review` 路由 | `server.py` | FastAPI 支持 AI 质量评价 |
| ✅ 修复 `.env` 加载 | `demo/api/_common.py` | Vercel serverless 函数也能读取环境变量 |
| ✅ 修复静态文件挂载 | `server.py` | `dist/` 完整挂载到 `/`，支持 SPA fallback |
| ✅ 构建生产版本 | `demo/dist/` | `npm run build` 生成 |

---

## 🚀 推荐下一步行动

1. **立即处理**: 解决前端样式缓存问题（高优先级 #1）
2. **本周内**: 更新 README 启动文档（中优先级 #3）
3. **下次迭代**: 重构 review 逻辑，统一前后端评分标准（中优先级 #4）
