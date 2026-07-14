#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
本地开发服务器：静态文件 + 按需爬取接口

用法:
    python serve.py              # 默认端口 8000
    python serve.py 9000         # 指定端口

接口:
    GET /api/crawl?type=pl3&limit=150
        触发爬虫抓取指定期数并返回更新后的 JSON 数据
        type:  dlt / ssq / pl3（默认 pl3）
        limit: 抓取期数（默认 200）
"""

import json
import os
import sys
import urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

# 让脚本能 import crawler 模块
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(BASE_DIR, "scripts"))

import crawler  # noqa: E402


class DevHandler(SimpleHTTPRequestHandler):
    # 静态文件根目录设为项目根
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def _send_json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        qs = urllib.parse.parse_qs(parsed.query)

        if path == "/api/crawl":
            return self._handle_crawl(qs)

        # 其余请求交给静态文件处理
        return super().do_GET()

    def _handle_crawl(self, qs):
        lot_type = (qs.get("type", ["pl3"])[0]).lower()
        if lot_type not in crawler.LOTTERY_SOURCES:
            return self._send_json(400, {"ok": False, "error": "未知彩种: " + lot_type})

        try:
            limit = int(qs.get("limit", ["200"])[0])
        except ValueError:
            limit = 200
        limit = max(1, min(limit, 500))  # 限制 1~500

        try:
            result = crawler.crawl_one(lot_type, limit=limit, force=True)
        except Exception as e:
            return self._send_json(500, {"ok": False, "error": str(e)})

        if not result:
            return self._send_json(500, {"ok": False, "error": "爬取失败，未获取到数据"})

        history = result.get("history", [])
        return self._send_json(200, {
            "ok": True,
            "type": lot_type,
            "count": len(history),
            "limit": limit,
            "latest": result.get("latest"),
            "history": history,
        })

    def log_message(self, fmt, *args):
        # 简化日志
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = ThreadingHTTPServer(("0.0.0.0", port), DevHandler)
    print("=" * 50)
    print("  本地开发服务器已启动")
    print("  静态站点:  http://localhost:%d/" % port)
    print("  爬取接口:  http://localhost:%d/api/crawl?type=pl3&limit=150" % port)
    print("  按 Ctrl+C 停止")
    print("=" * 50)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
        server.server_close()


if __name__ == "__main__":
    main()
