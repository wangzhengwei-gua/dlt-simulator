# -*- coding: utf-8 -*-
"""排列三 奇偶比 / 大小比 分析脚本"""
import json

with open('e:/dlt-simulator/data/pl3.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

history = data['history']
total = len(history)

# 奇数: 1,3,5,7,9 ; 偶数: 0,2,4,6,8
# 大数: 5,6,7,8,9 ; 小数: 0,1,2,3,4

parity_stats = {}
size_stats = {}

for h in history:
    nums = h['num']
    odd = sum(1 for n in nums if n % 2 == 1)
    even = 3 - odd
    big = sum(1 for n in nums if n >= 5)
    small = 3 - big

    pkey = '%d:%d' % (odd, even)
    skey = '%d:%d' % (big, small)

    parity_stats[pkey] = parity_stats.get(pkey, 0) + 1
    size_stats[skey] = size_stats.get(skey, 0) + 1

print('=' * 60)
print('排列三历史数据分析 (共 %d 期)' % total)
print('  奇数: 1,3,5,7,9  偶数: 0,2,4,6,8')
print('  大数: 5,6,7,8,9  小数: 0,1,2,3,4')
print('=' * 60)

print('\n【奇偶比 - 全部%d期】' % total)
for k in sorted(parity_stats.keys()):
    cnt = parity_stats[k]
    print('  %s  ->  %3d 次  (%.1f%%)' % (k, cnt, cnt / total * 100))

print('\n【大小比 - 全部%d期】' % total)
for k in sorted(size_stats.keys()):
    cnt = size_stats[k]
    print('  %s  ->  %3d 次  (%.1f%%)' % (k, cnt, cnt / total * 100))

# 最近30期
recent30 = history[:30]
print('\n' + '=' * 60)
print('最近30期明细')
print('=' * 60)
print('  期号      日期        号码      奇偶比  大小比')
print('  ' + '-' * 56)
for h in recent30:
    nums = h['num']
    odd = sum(1 for n in nums if n % 2 == 1)
    even = 3 - odd
    big = sum(1 for n in nums if n >= 5)
    small = 3 - big
    print('  %s  %s  [%d,%d,%d]    %d:%d     %d:%d' % (
        h['period'], h['date'], nums[0], nums[1], nums[2], odd, even, big, small))

# 最近30期统计
p30 = {}
s30 = {}
for h in recent30:
    nums = h['num']
    odd = sum(1 for n in nums if n % 2 == 1)
    even = 3 - odd
    big = sum(1 for n in nums if n >= 5)
    small = 3 - big
    pk = '%d:%d' % (odd, even)
    sk = '%d:%d' % (big, small)
    p30[pk] = p30.get(pk, 0) + 1
    s30[sk] = s30.get(sk, 0) + 1

print('\n【最近30期 奇偶比统计】')
for k in sorted(p30.keys()):
    print('  %s  ->  %2d 次  (%.1f%%)' % (k, p30[k], p30[k] / 30 * 100))

print('\n【最近30期 大小比统计】')
for k in sorted(s30.keys()):
    print('  %s  ->  %2d 次  (%.1f%%)' % (k, s30[k], s30[k] / 30 * 100))

# 最近10期
recent10 = history[:10]
print('\n' + '=' * 60)
print('最近10期明细 (重点参考)')
print('=' * 60)
for h in recent10:
    nums = h['num']
    odd = sum(1 for n in nums if n % 2 == 1)
    even = 3 - odd
    big = sum(1 for n in nums if n >= 5)
    small = 3 - big
    print('  %s  %s  [%d,%d,%d]    奇偶=%d:%d  大小=%d:%d' % (
        h['period'], h['date'], nums[0], nums[1], nums[2], odd, even, big, small))

# 奇偶比 + 大小比 组合统计
combo_stats = {}
for h in history:
    nums = h['num']
    odd = sum(1 for n in nums if n % 2 == 1)
    even = 3 - odd
    big = sum(1 for n in nums if n >= 5)
    small = 3 - big
    ckey = '奇偶%s/大小%s' % ('%d:%d' % (odd, even), '%d:%d' % (big, small))
    combo_stats[ckey] = combo_stats.get(ckey, 0) + 1

print('\n【奇偶比+大小比 组合统计 (全部%d期)】' % total)
for k in sorted(combo_stats.keys(), key=lambda x: -combo_stats[x]):
    cnt = combo_stats[k]
    print('  %-20s  ->  %3d 次  (%.1f%%)' % (k, cnt, cnt / total * 100))

# 各位数字频率
print('\n【各位数字频率 (全部%d期)】' % total)
for pos in range(3):
    freq = [0] * 10
    for h in history:
        freq[h['num'][pos]] += 1
    labels = ['百', '十', '个']
    print('  %s位: ' % labels[pos], end='')
    for d in range(10):
        print('%d(%d次,%.0f%%) ' % (d, freq[d], freq[d] / total * 100), end='')
    print()

# 最近30期各位频率
print('\n【最近30期 各位数字频率】')
for pos in range(3):
    freq = [0] * 10
    for h in recent30:
        freq[h['num'][pos]] += 1
    labels = ['百', '十', '个']
    print('  %s位: ' % labels[pos], end='')
    for d in range(10):
        print('%d(%d次,%.0f%%) ' % (d, freq[d], freq[d] / 30 * 100), end='')
    print()
