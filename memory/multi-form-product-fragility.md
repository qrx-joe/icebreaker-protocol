---
name: multi-form-product-fragility
description: 这是一个多形态产品(Skill+Backend+Serverless),所有改动要三端同步思考
metadata:
  type: project
---

破冰协议的协议规则同时存在于:
- `SKILL.md` — Agent Skill,给 Claude/Codex 等 Agent 读的自然语言协议
- `server.py` — FastAPI 本地后端,给本地 demo 用户
- `demo/api/_common.py` — Vercel serverless,给公开演示用户

加上前端 `demo/src/*.js` 也实现了一部分流程状态机(轮次警告、按钮显示),
**共 4 处实现同一套协议**。

**Why:** 这是项目最大的脆弱性来源。元反思评分中 Layer 3「执行可靠」只有 60/100,
主要扣分项就是这个。改一处忘了另一处,用户看到的行为会和 SKILL.md 描述的不一致,
但 review 时根本不会被发现——因为没人会同时打开 4 个文件比对。

**How to apply:**
1. 任何涉及"协议规则"的改动,先列出会影响哪几端
2. 协议核心规则(步骤数、时长、关键词、状态机路由)以 SKILL.md 为准
3. 接口契约(screen/task/steps/current_step)由 server.py 和 demo/api 共同遵守
4. 前端 UI 状态(改进轮次锁定、按钮文案)以 demo/src/done.js 为准,
   但要确保对应的后端字段(如 history.status)有定义
5. 改完跑契约测试,然后跑 `npm run build` 确认前端不爆错

长期方案考虑:把核心协议规则抽成 `protocol.yaml`,SKILL.md 由它生成,
server.py 和 demo/api 都读它。但短期内契约测试已经能兜住下限。

相关:[[skill-md-is-source-of-truth]] [[contract-tests-must-run-before-protocol-change]]
