import base64
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))
from _common import json_response, read_json


TEXT_EXTENSIONS = (".txt", ".md", ".csv", ".json", ".yaml", ".yml", ".log", ".html", ".htm")


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        payload = read_json(self)
        name = str(payload.get("name") or "attachment")
        mime = str(payload.get("type") or "application/octet-stream")
        raw = payload.get("data_base64") or ""
        try:
            data = base64.b64decode(raw)
        except Exception:
            data = b""

        lower = name.lower()
        text = ""
        parsed = False
        error = ""
        if mime.startswith("text/") or lower.endswith(TEXT_EXTENSIONS):
            text = data.decode("utf-8", errors="replace")[:60000]
            parsed = bool(text.strip())
        else:
            error = "当前线上轻量解析仅支持文本类附件，其他类型先记录文件名。"

        json_response(
            self,
            {
                "name": name,
                "type": mime,
                "size": len(data),
                "text": text,
                "parsed": parsed,
                "error": error,
            },
        )

    def do_OPTIONS(self):
        json_response(self, {})
