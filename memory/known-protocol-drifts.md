---
name: known-protocol-drifts
description: 当前已知的 3 处 SKILL.md ↔ server.py ↔ demo/api 协议偏差
metadata:
  type: project
---

截至 2026-05-30,契约测试(`tests/test_protocol_contract.py`)以 `expectedFailure`
形式持续暴露的 3 处偏差:

| ID | 偏差 | 影响 |
|----|------|------|
| D1 | `is_agreement` 关键词分叉 | server 认「ok/好/go」,vercel 认「启动/走起」。
                                   同一用户在两端"同意进入下一步"的命中率不同 |
| D2 | `is_done_request` 关键词分叉 | server 认「全部完成/雏形完成」,
                                       vercel 认「完成了/结束/交付」 |
| D3 | vercel `loose` 模式 minutes 可达 20 | SKILL.md 写「每步 1-15 分钟」,
                                            vercel 实际 max_min=20 |

**Why:** 这些不是 bug,是历史决策的副作用——server.py 和 demo/api 是不同时间不同
形态独立实现的,关键词列表当时各自顺手就敲了。但留下不修就会让 SKILL.md 失去权威性。

**How to apply:**
修复路径(任选其一,但都要更新 SKILL.md 为唯一事实源):
1. **统一关键词集**:在 SKILL.md 明确列出 agreement / done 的触发词清单,
   server.py 和 demo/api 都从这个清单生成判断逻辑
2. **统一 minutes 上限**:决定到底是 15 还是 20,改 SKILL.md 后同步两端

修完后:
- 跑 `uv run python -m unittest discover tests -v`
- 对应的 expectedFailure 测试会"意外成功",unittest 会报 unexpected success
- 此时**去掉 @unittest.expectedFailure 装饰器**并 commit
- 更新本 memory,移除已修复的偏差

相关:[[skill-md-is-source-of-truth]] [[contract-tests-must-run-before-protocol-change]]
