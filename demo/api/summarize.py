import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))
from _common import json_response, read_json, summarize_text


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        payload = read_json(self)
        json_response(self, {"summary": summarize_text(payload.get("user_content"))})

    def do_OPTIONS(self):
        json_response(self, {})
