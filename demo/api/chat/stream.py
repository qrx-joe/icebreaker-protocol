import json
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))
from _common import assistant_reply, read_json, try_ai_reply


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        payload = read_json(self)
        reply = try_ai_reply(payload) or assistant_reply(payload) or "先写一个最小版本。"
        body = (
            f"data: {json.dumps({'text': reply}, ensure_ascii=False)}\n\n"
            "data: [DONE]\n\n"
        ).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache, no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()
