import os
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))
sys.path.append(str(Path(__file__).resolve().parents[2]))

from _common import call_ai, json_response, parse_json_object, read_json
from review_contract import build_review_prompt, complete_review_response, fallback_review

API_KEY = os.getenv("DEEPSEEK_API_KEY") or os.getenv("OPENAI_API_KEY") or ""


def ai_review(payload):
    raw = call_ai(
        [{"role": "user", "content": build_review_prompt(payload)}],
        max_tokens=1200,
        temperature=0.2,
    )
    return parse_json_object(raw)


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        payload = read_json(self)
        result = ai_review(payload)
        if result and API_KEY:
            json_response(self, complete_review_response(result, mode="ai"))
            return

        error = "api_key_missing" if not API_KEY else "invalid_response"
        json_response(self, complete_review_response(fallback_review(payload), mode="local", error=error))

    def do_OPTIONS(self):
        json_response(self, {})
