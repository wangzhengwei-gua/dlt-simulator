# -*- coding: utf-8 -*-
"""排列五 3*3*3*3*3 复式分析：奇偶比/大小比/012路/走势"""
import json

with open('e:/dlt-simulator/data/pl5.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

history = data['history']
total = len(history)
print('总期数:', total)

# 奇数:1,3,5,7,9  偶数:0,2,4,6,8
# 大数:5,6,7,8,9  小数:0,1,2,3,4
# 0路:0,3,6,9  1路:1,4,7  2路:2,5,8

def road(d):
    return d % 3

def calc_ratios(nums):
    odd = sum(1 for n in nums if n%2==1)
    big = sum(1 for n in nums if n>=5)
    return odd, len(nums)-odd, big, len(nums)-big

# ===== 奇偶比 / 大小比 统计 =====
print('\n' + '='*60)
print('奇偶比统计 (5位数)')
print('='*60)

parity_stats = {}
size_stats = {}
for h in history:
    nums = h['num']
    o,e,b,s = calc_ratios(nums)
    pk = '%d:%d' % (o,e)
    sk = '%d:%d' % (b,s)
    parity_stats[pk] = parity_stats.get(pk,0)+1
    size_stats[sk] = size_stats.get(sk,0)+1

print('\n【奇偶比 - 全部%d期】' % total)
for k in sorted(parity_stats.keys(), key=lambda x: -parity_stats[x]):
    print('  %s  ->  %3d 次  (%.1f%%)' % (k, parity_stats[k], parity_stats[k]/total*100))

print('\n【大小比 - 全部%d期】' % total)
for k in sorted(size_stats.keys(), key=lambda x: -size_stats[x]):
    print('  %s  ->  %3d 次  (%.1f%%)' % (k, size_stats[k], size_stats[k]/total*100))

# 最近30期
recent30 = history[:30]
p30 = {}
s30 = {}
for h in recent30:
    nums = h['num']
    o,e,b,s = calc_ratios(nums)
    p30['%d:%d'%(o,e)] = p30.get('%d:%d'%(o,e),0)+1
    s30['%d:%d'%(b,s)] = s30.get('%d:%d'%(b,s),0)+1

print('\n【最近30期 奇偶比】')
for k in sorted(p30.keys(), key=lambda x: -p30[x]):
    print('  %s  ->  %2d 次  (%.1f%%)' % (k, p30[k], p30[k]/30*100))

print('\n【最近30期 大小比】')
for k in sorted(s30.keys(), key=lambda x: -s30[x]):
    print('  %s  ->  %2d 次  (%.1f%%)' % (k, s30[k], s30[k]/30*100))

# ===== 012路 各位频率 =====
print('\n' + '='*60)
print('012路 各位频率')
print('='*60)

labels = ['万','千','百','十','个']

# 全部
print('\n【各位 012路频率 (全部%d期)】' % total)
for p in range(5):
    r = [0,0,0]
    for h in history:
        r[road(h['num'][p])] += 1
    print('  %s位: 0路=%d(%.0f%%) 1路=%d(%.0f%%) 2路=%d(%.0f%%)' % (
        labels[p], r[0],r[0]/total*100, r[1],r[1]/total*100, r[2],r[2]/total*100))

# 最近30期
print('\n【最近30期 各位 012路频率】')
for p in range(5):
    r = [0,0,0]
    for h in recent30:
        r[road(h['num'][p])] += 1
    print('  %s位: 0路=%d(%.0f%%) 1路=%d(%.0f%%) 2路=%d(%.0f%%)' % (
        labels[p], r[0],r[0]/30*100, r[1],r[1]/30*100, r[2],r[2]/30*100))

# ===== 各位数字频率 =====
print('\n' + '='*60)
print('各位数字频率')
print('='*60)

print('\n【全部%d期】' % total)
for p in range(5):
    freq = [0]*10
    for h in history:
        freq[h['num'][p]] += 1
    print('  %s位: ' % labels[p], end='')
    for d in range(10):
        print('%d(%d,%.0f%%) ' % (d, freq[d], freq[d]/total*100), end='')
    print()

print('\n【最近30期】')
for p in range(5):
    freq = [0]*10
    for h in recent30:
        freq[h['num'][p]] += 1
    print('  %s位: ' % labels[p], end='')
    for d in range(10):
        print('%d(%d,%.0f%%) ' % (d, freq[d], freq[d]/30*100), end='')
    print()

# ===== 各位遗漏 =====
print('\n' + '='*60)
print('各位数字遗漏 (距上次出现期数)')
print('='*60)
for p in range(5):
    miss = [0]*10
    for d in range(10):
        for i, h in enumerate(history):
            if h['num'][p] == d:
                miss[d] = i
                break
        else:
            miss[d] = total
    print('  %s位: ' % labels[p], end='')
    for d in range(10):
        print('%d(%d期) ' % (d, miss[d]), end='')
    print()

# ===== 最近15期走势明细 =====
print('\n' + '='*60)
print('最近15期走势明细')
print('='*60)
print('  期号      号码          奇偶比  大小比  012路   和值')
for h in history[:15]:
    nums = h['num']
    o,e,b,s = calc_ratios(nums)
    combo = ''.join(str(road(n)) for n in nums)
    sv = sum(nums)
    print('  %s  [%s]  %d:%d     %d:%d     %s   %2d' % (
        h['period'], ' '.join(str(n) for n in nums), o,e, b,s, combo, sv))

# ===== 012路组合统计(5位) =====
print('\n' + '='*60)
print('012路组合统计 TOP15 (全部%d期)' % total)
print('='*60)
combo_stats = {}
for h in history:
    combo = ''.join(str(road(n)) for n in h['num'])
    combo_stats[combo] = combo_stats.get(combo,0)+1
for k in sorted(combo_stats.keys(), key=lambda x: -combo_stats[x])[:15]:
    print('  %s  ->  %2d 次  (%.1f%%)' % (k, combo_stats[k], combo_stats[k]/total*100))

# 最近30期012路组合
print('\n【最近30期 012路组合 TOP10】')
c30 = {}
for h in recent30:
    combo = ''.join(str(road(n)) for n in h['num'])
    c30[combo] = c30.get(combo,0)+1
for k in sorted(c30.keys(), key=lambda x: -c30[x])[:10]:
    print('  %s  ->  %2d 次  (%.1f%%)' % (k, c30[k], c30[k]/30*100))
