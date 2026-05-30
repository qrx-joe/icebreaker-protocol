#!/usr/bin/env python3
"""Local dev server for icebreaker-protocol API functions.
Routes /api/chat to _common.chat_response() and /api/summarize to summarize.summarize_response().
"""

import json
import os
import sys
from pathlib import Path
from http.server import BaseHTTPRequestHandler, HTTPServer

REPO_ROOT = Path(__file__).resolve().parent
API_DIR = REPO_ROOT / 'demo' / 'api'
sys.path.insert(0, str(API_DIR))
sys.path.insert(0, str(API_DIR.parent))

# Pre-import to fail fast
from _common import chat_response

class DevRouter(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        path = args[1] if len(args) > 1 else ''
        if path.startswith('/api/'):
            print(f"[API] {args[0]} {path} - {args[2] if len(args) > 2 else ''}")

    def _read_payload(self):
        length = int(self.headers.get('content-length') or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(length).decode('utf-8', errors='replace')
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}

    def _json_response(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_POST(self):
        payload = self._read_payload()
        route = self.path.split('?')[0]

        if route == '/api/chat':
            result = chat_response(payload)
            self._json_response(result)
            return

        if route == '/api/summarize':
            try:
                from summarize import summarize_response
                result = summarize_response(payload)
            except Exception:
                result = {"reply": "Summarize not available", "screen": "message"}
            self._json_response(result)
            return

        self.send_error(404, f"No handler for {self.path}")


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    server = HTTPServer(('0.0.0.0', port), DevRouter)
    print(f"[Dev] API server running at http://localhost:{port}/")
    print(f"[Dev] Routes: /api/chat, /api/summarize")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Dev] Shutting down.")
        server.shutdown()
