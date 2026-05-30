---
name: redundant-css-in-static
description: static/protocol-ui.css 是 demo/src/protocol-ui.css 的冗余副本,迟早出 bug
metadata:
  type: project
---

`static/protocol-ui.css` 与 `demo/src/protocol-ui.css` 文件内容**完全相同**
(diff 验证过)。前者仅被 `demo/test-css.html` 通过 `/static/protocol-ui.css` 引用,
后者被 `demo/src/main.js` 通过 `import './protocol-ui.css'` 引用(主入口)。

**Why:** 典型的代码冗余(Redundancy)。改一处忘了另一处必然出 bug——
而且 test-css.html 看起来像测试文件,不会有人记得它的存在。
这条偏差是元反思报告中识别但**未在本轮清理范围内**的尾巴。

**How to apply:**
最小修复路径:
1. 修改 `demo/test-css.html` 把 `/static/protocol-ui.css` 改为引用 `src/protocol-ui.css`
   (或者干脆删掉 test-css.html,如果它已经不再使用)
2. 删除根目录 `static/protocol-ui.css`
3. 如果 `static/` 目录为空,一并删除
4. 验证 `npm run build` 不报错

或者:确认 `demo/test-css.html` 已经废弃,直接删除它,然后删除 `static/`。

相关:[[multi-form-product-fragility]]
