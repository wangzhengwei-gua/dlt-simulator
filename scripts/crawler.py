#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
彩票开奖号码爬虫 - 大乐透 / 双色球 / 排列三
数据来源：500彩票网（datachart.500.com）

用法:
    python scripts/crawler.py            # 爬取全部三种
    python scripts/crawler.py dlt        # 仅大乐透
    python scripts/crawler.py ssq        # 仅双色球
    python scripts/crawler.py pl3        # 仅排列三
"""

import requests
import json
import os
import re
import sys
from datetime import datetime, timezone, timedelta

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# 东八区（北京时间）：用于开奖日判断与时间戳，保证 GitHub Actions(UTC) 下也一致
BJT = timezone(timedelta(hours=8))


def now_bjt():
    return datetime.now(BJT)


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

# 各彩种配置
LOTTERY_SOURCES = {
    'dlt': {
        'name': '大乐透',
        'url': 'https://datachart.500.com/dlt/history/newinc/history.php?limit={limit}&sort=0',
        'referer': 'https://datachart.500.com/dlt/',
        'encoding': 'utf-8',
        # (字段名, css_class正则, 期望数量)
        # cfont2 同时匹配 class="cfont2" 和 class="t_cfont2"
        'areas': [('front', 'cfont2', 5), ('back', 'cfont4', 2)],
        'output': 'latest.json',
        # 默认抓取期数
        'limit': 30,
        # 开奖星期：0=周一 ... 6=周日；大乐透 周一/三/六
        'draw_days': [0, 2, 5],
    },
    'ssq': {
        'name': '双色球',
        'url': 'https://datachart.500.com/ssq/history/newinc/history.php?limit={limit}&sort=0',
        'referer': 'https://datachart.500.com/ssq/',
        'encoding': 'utf-8',
        # 红球6个(t_cfont2)，蓝球1个(t_cfont4，另有1个&nbsp单元格会被自动过滤)
        'areas': [('red', 'cfont2', 6), ('blue', 'cfont4', 1)],
        'output': 'ssq.json',
        'limit': 30,
        # 双色球 周二/四/日
        'draw_days': [1, 3, 6],
    },
    'pl3': {
        'name': '排列三',
        'url': 'https://datachart.500.com/pls/history/inc/history.php?limit={limit}&sort=0',
        'referer': 'https://datachart.500.com/pls/',
        'encoding': 'gb2312',
        # 3个号码在同一个 cfont2 单元格中(如 "8 3 7")
        'areas': [('num', 'cfont2', 3)],
        'output': 'pl3.json',
        # 排列三 每日开奖，默认抓取较多期数以便奇偶比等分析
        'limit': 200,
        'draw_days': [0, 1, 2, 3, 4, 5, 6],
    },
}


def fetch_html(config, limit=None):
    headers = {**HEADERS, "Referer": config['referer']}
    url = config['url'].format(limit=limit or config.get('limit', 30))
    resp = requests.get(url, headers=headers, timeout=15)
    resp.encoding = config['encoding']
    return resp.text


def extract_balls(row_html, css_class, expected_count):
    """从行中提取指定 css class 的号码

    兼容三种结构:
      - 大乐透: 多个 <td class="cfont2">XX</td>，每个1个号码
      - 双色球: 多个 <td class="t_cfont2">XX</td>，每个1个号码
      - 排列三: 单个 <td class="cfont2">8 3 7</td>，含多个号码
    cfont2 正则同时匹配 "cfont2" 和 "t_cfont2"；&nbsp; 等无数字单元格自动忽略
    """
    cell_pattern = re.compile(
        r'<td[^>]*' + css_class + r'[^>]*>(.*?)</td>',
        re.DOTALL
    )
    cells = cell_pattern.findall(row_html)
    numbers = []
    for cell in cells:
        nums = re.findall(r'\d+', cell)
        numbers.extend([int(n) for n in nums])
    return numbers[:expected_count]


def extract_period_and_date(row_html):
    """提取期号(5+位纯数字)和日期(yyyy-mm-dd)

    兼容大乐透/排列三(期号日期在 t_tr1 单元格)和双色球(期号日期在普通 td)
    """
    clean = re.sub(r'<!--.*?-->', '', row_html, flags=re.DOTALL)
    all_tds = re.findall(r'<td[^>]*>([^<]+)</td>', clean)

    period = ""
    date = ""
    for v in all_tds:
        v = v.strip()
        if not v or v == '&nbsp;':
            continue
        date_match = re.match(r'(\d{4}-\d{2}-\d{2})', v)
        if date_match and not date:
            date = date_match.group(1)
        elif re.match(r'^\d{5,}$', v) and not period:
            period = v
    return period, date


def crawl_one(lottery_type, limit=None, force=False):
    config = LOTTERY_SOURCES[lottery_type]
    name = config['name']
    eff_limit = limit or config.get('limit', 30)
    print("[{}] 开始爬取{}开奖数据(limit={})...".format(
        now_bjt().strftime("%Y-%m-%d %H:%M:%S"), name, eff_limit))

    # 不再按"非开奖日"硬性跳过：开奖日当晚若 GitHub Actions schedule 被延迟/丢弃，
    # 非开奖日仍需补爬。是否有新数据由下方日期比较决定，无新数据时自动跳过写入，
    # 不会产生无意义提交。
    try:
        html = fetch_html(config, eff_limit)
    except Exception as e:
        print("[ERROR] {} 请求失败: {}".format(name, e))
        return None

    # 提取数据行
    rows = re.findall(r'<tr class="t_tr1">.*?</tr>', html, re.DOTALL)

    history = []
    for row_html in rows:
        period, date = extract_period_and_date(row_html)
        if not period or not date:
            continue

        entry = {'period': period, 'date': date}
        valid = True
        for field, css_class, expected in config['areas']:
            nums = extract_balls(row_html, css_class, expected)
            if len(nums) != expected:
                valid = False
                break
            entry[field] = nums

        if valid:
            history.append(entry)

    if not history:
        print("[ERROR] {} 未能解析到有效数据".format(name))
        debug_path = os.path.join(DATA_DIR, "_crawl_debug_{}.html".format(lottery_type))
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(debug_path, "w", encoding="utf-8") as f:
            f.write(html[:20000])
        print("[DEBUG] HTML 已保存到 {}".format(debug_path))
        return None

    # 仅当抓到比现有更新的数据、或抓到更多期数、或强制写入时才写入
    output_file = os.path.join(DATA_DIR, config['output'])
    new_latest_date = history[0]['date']
    if not force and os.path.exists(output_file):
        try:
            with open(output_file, 'r', encoding='utf-8') as f:
                existing = json.load(f)
            existing_latest = existing.get('latest', {}).get('date', '')
            existing_count = len(existing.get('history', []))
            if new_latest_date <= existing_latest and len(history) <= existing_count:
                print("[SKIP] {} 最新数据仍为 {}，且期数未增多({}<={})，跳过写入".format(
                    name, new_latest_date, len(history), existing_count))
                # 返回现有数据，供 API 调用方使用
                return existing
        except Exception:
            pass  # 现有文件读取失败则直接覆盖写入

    os.makedirs(DATA_DIR, exist_ok=True)
    result = {
        "latest": history[0],
        "history": history,
        "updateTime": now_bjt().strftime("%Y-%m-%d %H:%M:%S"),
    }
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print("[OK] {} 爬取成功! 最新一期: 第{}期 ({})".format(
        name, history[0]["period"], history[0]["date"]))
    area_str = "  ".join(
        "{}: {}".format(f, history[0][f]) for f, _, _ in config['areas'])
    print("      号码: {}".format(area_str))
    print("      共 {} 期数据已保存到 {}".format(len(history), output_file))
    return result


def crawl(types=None, limit=None, force=False):
    if types is None:
        types = list(LOTTERY_SOURCES.keys())
    for t in types:
        crawl_one(t, limit=limit, force=force)
        print()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="彩票开奖号码爬虫")
    # 注意：nargs="*" 不能配合 choices=，否则不传参时会因空列表报错
    parser.add_argument("types", nargs="*",
                        help="要爬取的彩种（留空则全部），可选: " + ", ".join(LOTTERY_SOURCES.keys()))
    parser.add_argument("--limit", type=int, default=None,
                        help="抓取期数（覆盖各彩种默认值）")
    parser.add_argument("--force", action="store_true",
                        help="强制写入，即使数据无更新")
    args = parser.parse_args()
    invalid = [t for t in args.types if t not in LOTTERY_SOURCES]
    if invalid:
        parser.error("未知彩种: {} (可选: {})".format(
            ', '.join(invalid), ', '.join(LOTTERY_SOURCES.keys())))
    types = args.types if args.types else None
    crawl(types, limit=args.limit, force=args.force)
