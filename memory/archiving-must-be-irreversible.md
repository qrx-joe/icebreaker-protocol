---
name: archiving-must-be-irreversible
description: 「结案归档」是不可逆动作,这是协议能真正交付的唯一办法
metadata:
  type: feedback
---

破冰协议 Done 页的主按钮必须是「结案归档」(不可逆),不是「评价产出」(可继续优化)
也不是「只改一处」(可无限循环)。

**Why:** 元反思指出 Layer 2「意图防护」原本 70/100 但扣分关键就在这:
原设计的「软提醒」(第 3 轮温和警告、第 4 轮强警告但不硬截断)在心理上是在说
「你想继续也可以哦」,完美主义者会感谢这份体贴然后继续不交付。
而评价器(5 维评分 + Markdown 报告)对正在使用协议的用户是反向激励——
评分一出,他下一步会回去改文档而不是把东西发出去。

「不可逆」才是关键。当用户感受到「结案=这事翻篇」这个动作存在时,
他才会真的去做完成判断,而不是把判断无限推迟。

**How to apply:**
1. Done 页主按钮必须是 `btnArchive` (primary),不要被产品经理思路诱导降级
2. 改进按钮第 3 轮起 disabled + 解锁需主动操作,这是有意设计的摩擦
3. 结案动作必须做到:
   - history 标记 `status: 'archived'` 不可改回 in_progress
   - 自动 reset 回 landing(让用户感受到"翻篇")
   - 自动下载 Markdown 备份(让用户安心)
4. 如果有人提议"给用户一个修改已结案任务的入口",拒绝。想改请发起新任务。

实现位置:`demo/src/done.js::archiveAndReset()`、`demo/index.html#pageDone`

相关:[[real-blocker-is-product-usage]]
