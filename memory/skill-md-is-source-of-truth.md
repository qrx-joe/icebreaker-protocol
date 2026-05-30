---
name: skill-md-is-source-of-truth
description: SKILL.md 是协议行为的唯一事实源,server.py 和 demo/api 必须对齐它
metadata:
  type: project
---

破冰协议同时存在三种形态:Agent Skill (SKILL.md) / 本地后端 (server.py) /
Vercel serverless (demo/api/_common.py)。**SKILL.md 是唯一事实源**,
另两端必须与它对齐,不能反过来。

**Why:** 三种形态之前各自维护一套规则,导致悄悄分叉:
- `is_agreement` 关键词集:server 有「ok/好/go」,vercel 有「启动/走起」
- `is_done_request` 关键词集:server 有「全部完成/雏形完成」,vercel 有「完成了/结束/交付」
- 步骤时长:SKILL.md 写 1-15 分钟,vercel loose 模式实际可达 20 分钟
任何一处偏差都会导致同一用户输入在不同形态下走完全不同的流程,但没人会发现。

**How to apply:**
1. 修改任何协议行为前,先确认 SKILL.md 是否反映了期望的新行为
2. 改完 SKILL.md 后,同步改 server.py 和 demo/api/_common.py
3. 改完后跑 `uv run python -m unittest discover tests -v`,
   契约测试会暴露未对齐项
4. 不要在 server.py 或 demo/api 里自创规则,先回 SKILL.md 写清楚

相关:[[contract-tests-must-run-before-protocol-change]] [[multi-form-product-fragility]]
