import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))
from _common import chat_response, json_response, read_json


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        payload = read_json(self)
        json_response(self, chat_response(payload))

    def do_OPTIONS(self):
        json_response(self, {})
