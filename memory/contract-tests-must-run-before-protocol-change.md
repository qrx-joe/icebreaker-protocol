---
name: contract-tests-must-run-before-protocol-change
description: 改协议行为前必须跑 tests/test_protocol_contract.py
metadata:
  type: feedback
---

任何修改 SKILL.md、server.py 规则引擎、或 demo/api/_common.py 协议逻辑的提交前,
必须运行契约测试,否则可能在不知情的情况下让三个形态分叉。

**Why:** 元反思指出 Layer 3 「对齐验证」是项目最大执行风险——三形态产品没有 single
source of truth 时,任何改动都是脆弱性的种植场。契约测试就是为此而生:
- 14 个测试用例,5 秒跑完,零外部依赖(标准库 unittest)
- 当前 11 个 OK + 3 个 expectedFailure(已知不一致的提醒)
- 一旦 expectedFailure 变成 unexpected success,说明对齐了,这时应该删除装饰器

**How to apply:**
```bash
uv run python -m unittest discover tests -v
```
- 11 OK + 3 expected failures = 当前已知状态,可以提交
- 任何 OK 变 FAIL = 你的改动破坏了已对齐的契约,必须修复
- expectedFailure 意外成功 = 偏差被修复了,去掉装饰器并 commit

测试文件:`tests/test_protocol_contract.py`
测试设计文档:`tests/README.md`

相关:[[skill-md-is-source-of-truth]] [[multi-form-product-fragility]]
