# -*- coding: utf-8 -*-
"""排列三 前后期各位数字转移统计

用法:
    python scripts/analyze_pl3_trans.py              # 统计全部历史
    python scripts/analyze_pl3_trans.py 306           # 以上期=306为例统计
    python scripts/analyze_pl3_trans.py 3 0 6         # 同上(分开传)

说明:
    history[0] 为最新一期。我们统计:
    当某期百位=X 时, 下一期(更晚一期)百位出现各数字的次数。
    十位、个位同理。
"""
import json
import sys


def load_history():
    with open('e:/dlt-simulator/data/pl3.json', 'r', encoding='utf-8') as f:
        return json.load(f)['history']


def build_transition(history, pos):
    """统计某一位: 上期数字 d -> 下期数字 d' 的次数。

    history[0] 最新, history[1] 次新 ...
    "下一期"指时间上更晚的一期, 即索引更小的一期。
    所以转移对为: history[i+1] (上期) -> history[i] (下期)。
    """
    trans = [[0] * 10 for _ in range(10)]  # trans[prev][next]
    for i in range(len(history) - 1):
        prev = history[i + 1]['num'][pos]
        nxt = history[i]['num'][pos]
        trans[prev][nxt] += 1
    return trans


def print_transition(trans, pos_label, total):
    print('\n【%s位 转移统计 (上期%s位 -> 下期%s位)】' % (pos_label, pos_label, pos_label))
    print('  上期\\下期', end='')
    for d in range(10):
        print('   %d  ' % d, end='')
    print('   合计')

    for prev in range(10):
        row_sum = sum(trans[prev])
        print('    %d    ' % prev, end='')
        for nxt in range(10):
            cnt = trans[prev][nxt]
            if row_sum > 0:
                print(' %3d(%2.0f%%)' % (cnt, cnt / row_sum * 100), end='')
            else:
                print(' %3d( - )' % cnt, end='')
        print('  %4d' % row_sum)

    # 各上期数字下最常出现的下期数字
    print('\n  -- 上期%s位=X时, 下期最常出现的%s位数字 --' % (pos_label, pos_label))
    for prev in range(10):
        row_sum = sum(trans[prev])
        if row_sum == 0:
            print('  上期=%d : 无样本' % prev)
            continue
        ranked = sorted(range(10), key=lambda d: -trans[prev][d])
        top = ranked[0]
        top_pct = trans[prev][top] / row_sum * 100
        top3 = ', '.join('%d(%d次,%.0f%%)' % (d, trans[prev][d], trans[prev][d] / row_sum * 100)
                         for d in ranked[:3] if trans[prev][d] > 0)
        print('  上期=%d (共%d期): 下期最常 -> %d (%.0f%%)  | TOP3: %s' % (
            prev, row_sum, top, top_pct, top3))


def print_case(history, prev_num):
    """给定上期号码(如 [3,0,6]), 输出各位的转移统计。"""
    print('\n' + '=' * 64)
    print('上期号码 = %d%d%d 的转移统计' % (prev_num[0], prev_num[1], prev_num[2]))
    print('=' * 64)
    labels = ['百', '十', '个']
    for pos in range(3):
        trans = build_transition(history, pos)
        d = prev_num[pos]
        row_sum = sum(trans[d])
        print('\n【%s位: 上期=%d -> 下期分布 (样本%d期)】' % (labels[pos], d, row_sum))
        if row_sum == 0:
            print('  无样本数据')
            continue
        ranked = sorted(range(10), key=lambda x: -trans[d][x])
        for nxt in ranked:
            cnt = trans[d][nxt]
            if cnt == 0:
                continue
            bar = '█' * int(round(cnt / row_sum * 40))
            print('  下期=%d : %3d次 (%.1f%%) %s' % (nxt, cnt, cnt / row_sum * 100, bar))


def main():
    history = load_history()
    total = len(history)
    print('=' * 64)
    print('排列三 前后期各位数字转移统计 (共 %d 期)' % total)
    print('说明: history[0]为最新, "下期"=时间上更晚的一期')
    print('=' * 64)

    # 全量转移矩阵
    labels = ['百', '十', '个']
    for pos in range(3):
        trans = build_transition(history, pos)
        print_transition(trans, labels[pos], total)

    # 指定上期号码的案例
    args = sys.argv[1:]
    if args:
        if len(args) == 1 and len(args[0]) == 3:
            s = args[0]
            prev_num = [int(s[0]), int(s[1]), int(s[2])]
        else:
            prev_num = [int(a) for a in args]
        print_case(history, prev_num)
    else:
        # 默认用最新一期作为上期
        latest = history[0]['num']
        print('\n(未指定上期号码, 默认使用最新一期 %s 作为上期)' % ''.join(str(d) for d in latest))
        print_case(history, latest)


if __name__ == '__main__':
    main()
