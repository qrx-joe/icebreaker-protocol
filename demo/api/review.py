import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))
from _common import call_ai, json_response, normalize_text, parse_json_object, read_json

API_KEY = os.getenv("DEEPSEEK_API_KEY") or os.getenv("OPENAI_API_KEY") or ""


DIMENSIONS = [
    {"key": "completion", "name": "Completion", "desc": "Visible outputs for each required step"},
    {"key": "clarity", "name": "Clarity", "desc": "Whether another person can understand the output quickly"},
    {"key": "usefulness", "name": "Usefulness", "desc": "Whether the current version can be used, revised, or shown"},
    {"key": "audience_fit", "name": "Audience fit", "desc": "Whether it fits the target audience or use case"},
    {"key": "next_action", "name": "Next action", "desc": "Whether the next revision target is clear"},
]


def fallback_review(payload):
    steps = payload.get("steps") or []
    filled = sum(1 for item in steps if len(normalize_text(item.get("user_output"))) >= 5)
    total_steps = max(len(steps), 1)
    base = max(2, min(4, round((filled / total_steps) * 5)))
    dimensions = [
        {
            **dim,
            "score": base,
            "comment": "AI review is unavailable. Use this as a coarse completion-based fallback.",
        }
        for dim in DIMENSIONS
    ]
    if filled < total_steps:
        dimensions[0]["score"] = 2
        dimensions[0]["comment"] = "Some steps still lack enough concrete output."
    return {
        "total": sum(item["score"] for item in dimensions),
        "max": len(dimensions) * 5,
        "verdict": "Needs revision",
        "summary": "AI review is unavailable, so this fallback only checks whether each step has visible output.",
        "strengths": ["A revisable version exists."],
        "issues": ["Some output still needs clearer boundaries, acceptance criteria, or audience-facing wording."],
        "priority_fix": "Strengthen the weakest step into a concrete visible output.",
        "dimensions": dimensions,
    }


def ai_review(payload):
    prompt = f"""
You are the output quality reviewer for Icebreaker Protocol.
Evaluate the user's output, not the user.

Return JSON only. No Markdown. No text outside JSON.
All natural-language values in the JSON must be written in Simplified Chinese.

Fixed dimensions:
{json.dumps(DIMENSIONS, ensure_ascii=False)}

Required JSON shape:
{{
  "verdict": "one short conclusion",
  "summary": "2-3 sentences about the current quality level",
  "strengths": ["up to 3 strengths to keep"],
  "issues": ["up to 4 concrete issues in the output"],
  "priority_fix": "one actionable instruction under 40 Chinese characters",
  "dimensions": [
    {{"key":"completion","score":1,"comment":"reason"}},
    {{"key":"clarity","score":1,"comment":"reason"}},
    {{"key":"usefulness","score":1,"comment":"reason"}},
    {{"key":"audience_fit","score":1,"comment":"reason"}},
    {{"key":"next_action","score":1,"comment":"reason"}}
  ]
}}

Rules:
- The user must not self-evaluate.
- Be strict and actionable.
- Do not comfort or praise vaguely.
- Every issue must point to the output itself.
- "priority_fix" must be the single best next revision.

Content to review:
{json.dumps(payload, ensure_ascii=False)[:9000]}
"""
    raw = call_ai([{"role": "user", "content": prompt}], max_tokens=1200, temperature=0.2)
    parsed = parse_json_object(raw)
    return parsed or {}


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        payload = read_json(self)
        result = ai_review(payload)
        if not result and not API_KEY:
            result = fallback_review(payload)
        if not API_KEY:
            result["mode"] = "local"
        json_response(self, result)

    def do_OPTIONS(self):
        json_response(self, {})
