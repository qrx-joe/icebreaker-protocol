"""协议契约测试 — 验证 SKILL.md 规则在 server.py 和 demo/api 两端都被遵守。

运行：uv run python -m unittest discover tests -v

设计原则见 tests/README.md。
"""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

# 把项目根加入 sys.path，让 server / demo.api._common 可被 import
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "demo" / "api"))

# 屏蔽真实 LLM 调用：测试用例只覆盖规则引擎分支
import os
os.environ.pop("DEEPSEEK_API_KEY", None)
os.environ.pop("OPENAI_API_KEY", None)

import server  # noqa: E402
import _common as vercel  # noqa: E402  demo/api/_common.py


# ───────────────────────── 测试用例:任务样本 ─────────────────────────

# 覆盖 SKILL.md 提到的 5 类典型场景。每条样本只测规则引擎,不依赖 LLM。
TASK_SAMPLES = [
    "我想写一篇小红书笔记",          # content
    "我想认识一个同行业的人",        # social
    "我在找工作但是不敢投简历",      # job
    "我想做一个 python 小项目",      # code
    "我想推进毕业论文",              # general
]


# ──────────────────────── C1-C3: 步骤拆解契约 ────────────────────────

class StepDecompositionContract(unittest.TestCase):
    """SKILL.md 第二步「任务拆解」的硬规则。"""

    MIN_STEPS, MAX_STEPS = 3, 6
    MIN_MINUTES, MAX_MINUTES = 1, 15

    def _check_steps(self, steps, label):
        # C1: 步骤数在 3-6 之间
        self.assertGreaterEqual(
            len(steps), self.MIN_STEPS,
            f"[{label}] 步骤数 {len(steps)} 少于 SKILL.md 规定的最少 3 步",
        )
        self.assertLessEqual(
            len(steps), self.MAX_STEPS,
            f"[{label}] 步骤数 {len(steps)} 超过 SKILL.md 规定的最多 6 步",
        )

        for i, step in enumerate(steps, 1):
            # 兼容 server.Step 对象 和 dict
            minutes = step.minutes if hasattr(step, "minutes") else step.get("minutes")
            output = step.output if hasattr(step, "output") else step.get("output")
            instruction = step.instruction if hasattr(step, "instruction") else step.get("instruction")

            # C2: 每步 1-15 分钟
            self.assertIsNotNone(minutes, f"[{label}] 第 {i} 步缺少 minutes 字段")
            self.assertGreaterEqual(
                minutes, self.MIN_MINUTES,
                f"[{label}] 第 {i} 步时长 {minutes} 分钟低于 SKILL.md 下限 1 分钟",
            )
            self.assertLessEqual(
                minutes, self.MAX_MINUTES,
                f"[{label}] 第 {i} 步时长 {minutes} 分钟超过 SKILL.md 上限 15 分钟",
            )

            # C3: output 必须非空(禁止空操作)
            self.assertTrue(
                output and output.strip(),
                f"[{label}] 第 {i} 步缺少非空 output——违反 SKILL.md「禁止空操作」",
            )
            self.assertTrue(
                instruction and instruction.strip(),
                f"[{label}] 第 {i} 步缺少非空 instruction",
            )

    def test_server_rule_engine_all_samples(self):
        """server.build_rule_steps() 对每类任务都符合 C1-C3。"""
        for task in TASK_SAMPLES:
            with self.subTest(task=task):
                steps = server.build_rule_steps(task)
                self._check_steps(steps, f"server::{task}")

    def test_vercel_infer_steps_all_samples(self):
        """demo/api 的 infer_steps() 对每类任务都符合 C1-C3。"""
        for task in TASK_SAMPLES:
            with self.subTest(task=task):
                steps = vercel.infer_steps(task)
                self._check_steps(steps, f"vercel::{task}")

    def test_vercel_infer_steps_compact_mode_still_in_range(self):
        """compact 时间偏好下,minutes 仍应落在 SKILL.md 1-15 区间内。"""
        for task in TASK_SAMPLES:
            with self.subTest(task=task, mode="compact"):
                steps = vercel.infer_steps(task, time_preference="compact")
                self._check_steps(steps, f"vercel-compact::{task}")

    def test_vercel_infer_steps_loose_mode_violates_upper_bound(self):
        """已知偏差:loose 模式 max_min=20,会违反 SKILL.md 的 15 分钟上限。

        这条测试用 expectedFailure 标记,持续提醒需要修复(对齐 SKILL.md)。
        """
        for task in TASK_SAMPLES:
            steps = vercel.infer_steps(task, time_preference="loose")
            for step in steps:
                if step["minutes"] > self.MAX_MINUTES:
                    return  # 至少有一步违反 → expectedFailure 视为成功
        self.fail("loose 模式没有违反 15 分钟上限——可能已经修复,请去掉 expectedFailure 装饰器")

    # 真正的 expectedFailure 等价物:把上面这条挂上装饰器
    test_vercel_infer_steps_loose_mode_violates_upper_bound = unittest.expectedFailure(
        test_vercel_infer_steps_loose_mode_violates_upper_bound
    )


# ──────────────────────── C4-C7: API 路由契约 ────────────────────────

class APIRoutingContract(unittest.TestCase):
    """/api/chat 的 phase 路由规则——SKILL.md 工作流的状态机。"""

    def _server_chat(self, **payload):
        """直接调用 server.py 的规则引擎,绕过 FastAPI HTTP 层。"""
        req = server.ChatRequest(**payload)
        # 复刻 server.chat() 主体逻辑(L471-489),不走 async
        message = server.normalize_text(req.message)
        for trigger, reply in server.SHAME_REFRAMES.items():
            if trigger in message:
                return server.ChatResponse(
                    reply=reply, screen="message",
                    task=req.task, steps=req.steps, current_step=req.current_step,
                )
        if server.is_done_request(message):
            return server.build_done(req)
        if req.phase == "step" or server.is_stuck(message) or server.is_thinking_delay(message):
            return server.build_step_help(req)
        if server.is_agreement(message):
            return server.build_roadmap(req)
        task = server.extract_task(req)
        return server.ChatResponse(reply=server.CONTRACT_REPLY, screen="contract", task=task)

    def _vercel_chat(self, **payload):
        return vercel.chat_response(payload)

    # C4: 首次消息(有任务但无 phase)返回 contract
    def test_C4_server_returns_contract_on_first_message(self):
        resp = self._server_chat(message="我想写一篇小红书笔记")
        self.assertEqual(resp.screen, "contract", "server 首次消息应返回 contract 屏")

    def test_C4_vercel_returns_contract_on_first_message(self):
        resp = self._vercel_chat(message="我想写一篇小红书笔记")
        self.assertEqual(resp["screen"], "contract", "vercel 首次消息应返回 contract 屏")

    # C5: agreement 信号返回 roadmap + 步骤数组
    def test_C5_server_agreement_returns_roadmap(self):
        resp = self._server_chat(message="同意,开始", task="我想写一篇小红书笔记")
        self.assertEqual(resp.screen, "roadmap")
        self.assertTrue(len(resp.steps) > 0, "roadmap 必须带步骤数组")

    def test_C5_vercel_agreement_returns_roadmap(self):
        # 注意:vercel 要求 phase=contract 才认 agreement
        resp = self._vercel_chat(
            message="同意,开始",
            task="我想写一篇小红书笔记",
            phase="contract",
        )
        self.assertEqual(resp["screen"], "roadmap")
        self.assertTrue(len(resp["steps"]) > 0)

    # C6: done 信号返回 done 屏
    def test_C6_server_done_returns_done_screen(self):
        resp = self._server_chat(
            message="所有步骤完成了",
            task="测试任务",
            steps=[server.Step(title="t", instruction="i", output="o", minutes=5)],
            outputs=["产出A"],
        )
        self.assertEqual(resp.screen, "done")

    def test_C6_vercel_done_returns_done_screen(self):
        resp = self._vercel_chat(
            message="所有步骤完成了",
            task="测试任务",
            steps=[{"title": "t", "instruction": "i", "output": "o", "minutes": 5}],
            outputs=["产出A"],
        )
        self.assertEqual(resp["screen"], "done")

    # C7: thinking_delay 触发思考预算 300 秒
    def test_C7_server_thinking_delay_returns_300s_budget(self):
        resp = self._server_chat(
            message="我还没想清楚,让我再想想",
            task="测试任务",
            steps=[server.Step(title="t", instruction="i", output="o", minutes=5)],
            phase="step",
        )
        self.assertEqual(resp.thinking_budget_seconds, 300,
                         "thinking_delay 必须返回 300 秒预算(SKILL.md「5 分钟思考预算」)")


# ──────────────────────── C8: 跨端对齐契约 ────────────────────────

class CrossEndAlignment(unittest.TestCase):
    """server.py 与 demo/api 对同一输入应返回相同 screen。"""

    SCENARIOS = [
        # (描述, payload, 期望 screen)
        ("首次访问无 phase", {"message": "我想写小红书"}, "contract"),
        ("done 请求",
         {"message": "所有步骤完成", "task": "x",
          "steps": [{"title": "t", "instruction": "i", "output": "o", "minutes": 5}],
          "outputs": ["a"]},
         "done"),
    ]

    def _server_screen(self, payload):
        # 复用上面的辅助
        helper = APIRoutingContract()
        steps_in = payload.get("steps") or []
        # dict → server.Step
        if steps_in and isinstance(steps_in[0], dict):
            payload = {**payload, "steps": [server.Step(**s) for s in steps_in]}
        resp = helper._server_chat(**payload)
        return resp.screen

    def _vercel_screen(self, payload):
        return vercel.chat_response(payload)["screen"]

    def test_C8_same_input_same_screen(self):
        for desc, payload, expected in self.SCENARIOS:
            with self.subTest(scenario=desc):
                s = self._server_screen(payload)
                v = self._vercel_screen(payload)
                self.assertEqual(
                    s, expected,
                    f"[{desc}] server 返回 {s},期望 {expected}",
                )
                self.assertEqual(
                    v, expected,
                    f"[{desc}] vercel 返回 {v},期望 {expected}",
                )
                self.assertEqual(
                    s, v,
                    f"[{desc}] 跨端不一致:server={s} vs vercel={v}",
                )


# ───────────────── 已知不一致:用 expectedFailure 暴露 ─────────────────

class KnownDriftBetweenForms(unittest.TestCase):
    """记录 server.py 与 demo/api 已经分叉的契约,持续提醒需要对齐。

    这些测试期望失败(unittest.expectedFailure)。一旦真的修复对齐,
    测试反而会"意外通过",unittest 会报 unexpected success,提醒你去掉装饰器。
    """

    @unittest.expectedFailure
    def test_agreement_keywords_should_be_identical(self):
        """server.is_agreement 与 vercel.is_agreement 关键词集应一致。"""
        # 取几个典型差异点
        cases = ["继续", "ok", "好", "go", "启动", "走起"]
        for word in cases:
            with self.subTest(word=word):
                s_match = server.is_agreement(word)
                v_match = vercel.is_agreement(word)
                self.assertEqual(
                    s_match, v_match,
                    f"关键词 '{word}': server={s_match} vs vercel={v_match}",
                )

    @unittest.expectedFailure
    def test_done_request_keywords_should_be_identical(self):
        """server.is_done_request 与 vercel.is_done_request 关键词集应一致。"""
        cases = ["全部完成", "都完成", "完成了", "结束", "交付", "雏形完成"]
        for word in cases:
            with self.subTest(word=word):
                s_match = server.is_done_request(word)
                v_match = vercel.is_done_request(word)
                self.assertEqual(
                    s_match, v_match,
                    f"关键词 '{word}': server={s_match} vs vercel={v_match}",
                )


if __name__ == "__main__":
    unittest.main(verbosity=2)
