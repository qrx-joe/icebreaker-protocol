# 破冰协议 · 当前迭代任务（Current Sprint）

> 本文档只保留**当前迭代（1-2周）**内要完成的任务。
> 长期规划见 [NEXT-TODO.md](./NEXT-TODO.md)。

---

## 本轮结论（2026-06-17）

别再盲目加方法论功能。当前真正该做的是把核心闭环、缓存更新、评价体验和重复逻辑收紧。否则这个项目会一边反完美主义，一边被自己的“功能堆叠瘾”拖死。

---

## 已完成验证

| 优先级 | 任务 | 结果 | 备注 |
|--------|------|------|------|
| P0 | 前端生产构建 | ✅ 通过 | `cmd /c npm run build` 成功；普通 PowerShell 沙箱会误解析 Vite root，属于环境噪音 |
| P0 | 协议契约测试 | ✅ 通过 | `uv run python -m unittest discover tests -v` 通过，3 个 expected failure 为已知漂移 |
| P0 | 核心 API 闭环 | ✅ 通过 | 输入 → 契约 → 拆解 → Done → AI 评价均返回正确结果 |
| P0 | 改进循环运行时引用 | ✅ 已修复 | `improvementTargetIdx` 改为 `state.improvementTargetIdx` |
| P0 | 步骤主动建议运行时引用 | ✅ 已修复 | `currentTask` 改为 `state.currentTask` |
| P0 | Service Worker 缓存复位入口 | ✅ 已实现 | 设置页新增“刷新本地缓存”，可清理 Cache Storage、注销 SW 并刷新 |
| P1 | 评价页区分 AI / 本地规则来源 | ✅ 已实现 | 评价卡片和 Markdown 导出都会标明来源 |
| P1 | PWA 资源直连 | ✅ 通过 | `/icon.svg` 与 `/manifest.json` 均返回 200 |

---

## 下一步任务计划

| 优先级 | 任务 | 为什么现在做 | 验收标准 |
|--------|------|--------------|----------|
| P0 | 用真实浏览器跑完整前端路径 | API 通不等于用户路径通；前端状态流仍可能断 | 输入任务后可完成拆解、步骤提交、Done、只改一处、评价 |
| P1 | 统一版本号策略 | `pyproject.toml` 是 2.0.0，文档是 2.2.0-dev，发布口径混乱 | README / SKILL / pyproject / CHANGELOG 版本一致 |
| P1 | 抽出 review 共享契约 | `server.py` 与 `demo/api/review.py` 重复，会继续制造漂移 | 维度、fallback、响应字段至少有一个共享事实来源 |

---

## 使用规则

1. **最多 5 件事**：超过就砍，别把 TODO 写成焦虑清单。
2. **先验证再扩展**：方法论集成排在缓存和评价可信度之后。
3. **发现坏味道就立刻处理**：重复逻辑、隐式全局变量、缓存不可控都不是“小问题”。
