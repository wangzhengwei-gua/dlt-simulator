#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
大乐透开奖号码爬虫
数据来源：500彩票网（datachart.500.com）
"""

import requests
import json
import os
import re
from datetime import datetime

# 500彩票网大乐透历史数据
API_URL = "https://datachart.500.com/dlt/history/newinc/history.php?limit=30&sort=0"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://datachart.500.com/dlt/",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
LATEST_FILE = os.path.join(DATA_DIR, "latest.json")


def crawl():
    print("[{}] 开始爬取大乐透开奖数据...".format(datetime.now().strftime("%Y-%m-%d %H:%M:%S")))

    try:
        resp = requests.get(API_URL, headers=HEADERS, timeout=15)
        # 500彩票网返回 utf-8 内容，但 requests 可能识别为 ISO-8859-1
        resp.encoding = "utf-8"
        html = resp.text
    except Exception as e:
        print("[ERROR] 请求失败: {}".format(e))
        return None

    # 提取每行数据：<tr class="t_tr1">...</tr>
    # 有效数据行包含：期号(t_tr1) + 前区5个(cfont2) + 后区2个(cfont4) + ... + 日期(t_tr1)
    row_pattern = re.compile(r'<tr class="t_tr1">.*?</tr>', re.DOTALL)

    history = []
    for row in row_pattern.finditer(html):
        row_html = row.group(0)

        # 提取前区号码（class="cfont2"）和后区号码（class="cfont4"）
        front = [int(x) for x in re.findall(r'<td class="cfont2">(\d+)</td>', row_html)]
        back = [int(x) for x in re.findall(r'<td class="cfont4">(\d+)</td>', row_html)]

        if len(front) != 5 or len(back) != 2:
            continue  # 跳过表头等无效行

        # 提取期号（cfont2 之前的第一个 t_tr1 数字，排除注释中的内容）
        # 先移除 HTML 注释
        clean = re.sub(r'<!--.*?-->', '', row_html, flags=re.DOTALL)
        t_tr1_vals = re.findall(r'<td class="t_tr1">([^<]+)</td>', clean)
        # 期号是第一个纯数字的 t_tr1 值
        period = ""
        for v in t_tr1_vals:
            v = v.strip()
            if v.isdigit():
                period = v
                break

        # 提取日期（最后一个 t_tr1 中匹配日期格式的值）
        date = ""
        for v in t_tr1_vals:
            v = v.strip()
            if re.match(r'\d{4}-\d{2}-\d{2}', v):
                date = v
                break

        if period and date:
            history.append(
                {
                    "period": period,
                    "date": date,
                    "front": front,
                    "back": back,
                }
            )

    if not history:
        print("[ERROR] 未能解析到有效数据")
        # 保存调试信息
        debug_path = os.path.join(DATA_DIR, "_crawl_debug.html")
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(debug_path, "w", encoding="utf-8") as f:
            f.write(html[:10000])
        print("[DEBUG] HTML 已保存到 {}".format(debug_path))
        return None

    # 保存
    os.makedirs(DATA_DIR, exist_ok=True)
    result = {
        "latest": history[0],
        "history": history,
        "updateTime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }

    with open(LATEST_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print("[OK] 爬取成功! 最新一期: 第{}期 ({})".format(history[0]["period"], history[0]["date"]))
    print("      前区: {}  后区: {}".format(history[0]["front"], history[0]["back"]))
    print("      共 {} 期数据已保存到 {}".format(len(history), LATEST_FILE))
    return result


if __name__ == "__main__":
    crawl()
