# 协议契约测试

> SKILL.md 规则 ↔ server.py 行为 ↔ demo/api Vercel 响应 的三方对齐验证。

## 为什么需要这套测试

破冰协议同时存在三种形态：

| 形态 | 文件 | 用户 |
|------|------|------|
| Agent Skill | `SKILL.md` | Claude/Codex 等 Agent |
| FastAPI 后端 | `server.py` | 本地 demo 用户 |
| Vercel serverless | `demo/api/*.py` | 公开演示用户 |

三个形态各自实现了一套"协议规则"。**没有自动化对齐机制时,改动一处会悄悄背叛另两处**。这就是契约测试要捕捉的问题。

## 当前覆盖的契约

| ID | 契约 | 来源 | server.py | demo/api | SKILL.md |
|----|------|------|:---------:|:--------:|:--------:|
| C1 | 任务拆解步骤数在合理范围 | SKILL.md「3-6 步」 | ✅ | ✅ | ✅ |
| C2 | 每步 minutes 在 1-15 区间 | SKILL.md「1-15 分钟」 | ✅ | ✅ | ✅ |
| C3 | 每步必须有非空 output | SKILL.md「禁止空操作」 | ✅ | ✅ | ✅ |
| C4 | 首次访问返回 screen=contract | server.py L489 | ✅ | ✅ | — |
| C5 | agreement 信号返回 screen=roadmap | server.py L485 | ✅ | ✅ | — |
| C6 | done 信号返回 screen=done | server.py L479 | ✅ | ✅ | — |
| C7 | thinking_delay 返回 thinking_budget_seconds=300 | server.py L444 | ✅ | — | — |
| C8 | server.py 与 demo/api 对同一输入返回相同 screen | 跨端对齐 | — | — | — |
| C9 | 评价 fallback 与 prompt version 共享契约 | `review_contract.py` | ✅ | ✅ | — |

agreement / done 关键词仍有两条已知跨端漂移测试，以 `expectedFailure` 标记；一旦修复对齐，测试会提示 unexpected success。

## 运行

```bash
uv run python -m unittest discover tests -v
```

零新依赖,使用标准库 unittest。

## 设计原则

1. **只测可自动验证的硬规则**：步骤数、时长区间、screen 字段、关键词触发
2. **不测主观语义**：不验证 reply 文案质量,只验证结构契约
3. **不调用真实 LLM**：所有用例走规则引擎分支,5 秒内跑完
4. **暴露不一致而非掩盖**：发现 server.py 和 demo/api 对同一输入返回不同结果时,测试失败,迫使修复
