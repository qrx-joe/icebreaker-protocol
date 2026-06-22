"""Shared review contract for local FastAPI and Vercel serverless endpoints."""

from __future__ import annotations

import json
import re
from typing import Any


REVIEW_PROMPT_VERSION = "review_v1"

REVIEW_DIMENSIONS = [
    {"key": "completion", "name": "完成度", "desc": "是否交付了每一步要求的可见产出"},
    {"key": "clarity", "name": "清晰度", "desc": "别人能否快速理解产出在说什么、要做什么"},
    {"key": "usefulness", "name": "可用性", "desc": "当前版本是否已经能被继续使用、修改或展示"},
    {"key": "audience_fit", "name": "受众匹配", "desc": "是否命中目标受众或使用场景"},
    {"key": "next_action", "name": "下一步明确度", "desc": "是否清楚下一刀应该改哪里"},
]

REVIEW_PROMPT_TEMPLATE = """你是破冰协议的产出质量评审员。
评价用户的产出，不评价用户。

只返回 JSON，不要 Markdown，不要 JSON 以外的文字。
JSON 中所有自然语言值必须用简体中文。

固定维度：
{dimensions}

JSON 结构：
{{
  "verdict": "一句话结论",
  "summary": "2-3 句话描述当前质量水平",
  "strengths": ["最多 3 个值得保留的优点"],
  "issues": ["最多 4 个产出的具体问题"],
  "priority_fix": "40 字以内的一个可执行修改指令",
  "dimensions": [
    {{"key":"completion","score":1,"comment":"原因"}},
    {{"key":"clarity","score":1,"comment":"原因"}},
    {{"key":"usefulness","score":1,"comment":"原因"}},
    {{"key":"audience_fit","score":1,"comment":"原因"}},
    {{"key":"next_action","score":1,"comment":"原因"}}
  ]
}}

规则：
- 不要自我评价，只评价产出。
- 严格且可执行。
- 不要安慰或空洞赞美。
- 每个问题必须指向产出本身。
- priority_fix 必须是唯一的最佳下一步修改。

待评价内容：
{payload}"""


def normalize_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def clamp_score(value: Any, default: int = 1) -> int:
    try:
        score = int(value)
    except (TypeError, ValueError):
        score = default
    return max(1, min(5, score))


def review_payload_dict(payload: Any) -> dict[str, Any]:
    if hasattr(payload, "model_dump"):
        return payload.model_dump()
    if isinstance(payload, dict):
        return payload
    return {}


def build_review_prompt(payload: Any) -> str:
    return REVIEW_PROMPT_TEMPLATE.format(
        dimensions=json.dumps(REVIEW_DIMENSIONS, ensure_ascii=False),
        payload=json.dumps(review_payload_dict(payload), ensure_ascii=False)[:9000],
    )


def fallback_review(payload: Any) -> dict[str, Any]:
    data = review_payload_dict(payload)
    steps = data.get("steps") or []
    filled = 0
    for step in steps:
        if isinstance(step, dict):
            output = step.get("user_output")
        else:
            output = getattr(step, "user_output", "")
        if len(normalize_text(output)) >= 5:
            filled += 1

    total_steps = max(len(steps), 1)
    base = max(2, min(4, round((filled / total_steps) * 5)))
    complete = filled == total_steps
    dimensions = [
        {
            **dim,
            "score": base,
            "comment": (
                "本地规则判断：每一步已有可见产出，但还需要更具体的验收标准和表达打磨。"
                if complete
                else "本地规则判断：部分步骤缺少足够清晰的产出，先补齐空白再谈优化。"
            ),
        }
        for dim in REVIEW_DIMENSIONS
    ]
    if not complete:
        dimensions[0]["score"] = 2
        dimensions[0]["comment"] = "本地规则判断：部分步骤还缺少足够具体的产出。"

    return {
        "total": sum(item["score"] for item in dimensions),
        "max": len(dimensions) * 5,
        "verdict": "能继续打磨" if complete else "需要补齐产出",
        "summary": "AI 评价暂时不可用，本次仅根据完成步骤做本地规则判断。",
        "strengths": ["已经完成了破冰流程，至少留下了可修改的版本。"],
        "issues": ["需要补充更明确的边界、验收标准和面向受众的表达。"],
        "priority_fix": "先补齐最薄弱的一步：让它有一个别人能看懂的具体产出。",
        "dimensions": dimensions,
        "prompt_version": REVIEW_PROMPT_VERSION,
    }


def complete_review_response(result: dict[str, Any], mode: str = "ai", error: str | None = None) -> dict[str, Any]:
    dimensions_by_key = {
        str(item.get("key")): item
        for item in result.get("dimensions", [])
        if isinstance(item, dict)
    }
    dimensions = []
    for dim in REVIEW_DIMENSIONS:
        incoming = dimensions_by_key.get(dim["key"], {})
        dimensions.append(
            {
                **dim,
                "score": clamp_score(incoming.get("score")),
                "comment": normalize_text(incoming.get("comment")),
            }
        )

    return {
        "total": sum(item["score"] for item in dimensions),
        "max": len(dimensions) * 5,
        "verdict": normalize_text(result.get("verdict")),
        "summary": normalize_text(result.get("summary")),
        "strengths": list(result.get("strengths") or [])[:3],
        "issues": list(result.get("issues") or [])[:4],
        "priority_fix": normalize_text(result.get("priority_fix")),
        "dimensions": dimensions,
        "mode": mode,
        "error": error,
        "prompt_version": normalize_text(result.get("prompt_version")) or REVIEW_PROMPT_VERSION,
    }
