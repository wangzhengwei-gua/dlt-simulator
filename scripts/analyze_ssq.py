# -*- coding: utf-8 -*-
"""双色球热温冷验证 + 温号筛选10组"""
import json
import random

random.seed(20260721)

with open('e:/dlt-simulator/data/ssq.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

history = data['history']
total = len(history)
print('总期数:', total)

# 红球频率统计
red_freq = [0] * 34
blue_freq = [0] * 17
for h in history:
    for r in h['red']:
        red_freq[r] += 1
    for b in h['blue']:
        blue_freq[b] += 1

print('\n=== 红球频率 (全部%d期) ===' % total)
for d in range(1, 34):
    print('  %02d: %d次 (%.1f%%)' % (d, red_freq[d], red_freq[d]/total*100))

# 红球遗漏
print('\n=== 红球遗漏 (距上次出现期数) ===')
for d in range(1, 34):
    miss = total
    for i, h in enumerate(history):
        if d in h['red']:
            miss = i
            break
    print('  %02d: 遗漏%d期' % (d, miss), end='')
    if d % 5 == 0:
        print()
    else:
        print('  ', end='')

# 蓝球频率
print('\n\n=== 蓝球频率 ===')
for d in range(1, 17):
    print('  %02d: %d次 (%.1f%%)' % (d, blue_freq[d], blue_freq[d]/total*100))

# 用户定义的热温冷
# 红球热码: 03 09 16；冷号: 01 32 33；其余温号
red_hot = {3, 9, 16}
red_cold = {1, 32, 33}
red_warm = set(range(1,34)) - red_hot - red_cold
print('\n=== 用户分类验证 ===')
print('红球热码(3个):', sorted(red_hot))
print('  频率:', {d: red_freq[d] for d in sorted(red_hot)})
print('红球冷号(3个):', sorted(red_cold))
print('  频率:', {d: red_freq[d] for d in sorted(red_cold)})
print('红球温号(%d个):' % len(red_warm), sorted(red_warm))
print('  频率:', {d: red_freq[d] for d in sorted(red_warm)})

# 蓝球热号: 05 08 16；冷号: 01 11 12；其余温号
# 注意用户说"其余是冷号"，但前面已经列了冷号，这里应该是笔误，理解为其余是温号
blue_hot = {5, 8, 16}
blue_cold = {1, 11, 12}
blue_warm = set(range(1,17)) - blue_hot - blue_cold
print('\n蓝球热码(3个):', sorted(blue_hot))
print('  频率:', {d: blue_freq[d] for d in sorted(blue_hot)})
print('蓝球冷号(3个):', sorted(blue_cold))
print('  频率:', {d: blue_freq[d] for d in sorted(blue_cold)})
print('蓝球温号(%d个):' % len(blue_warm), sorted(blue_warm))
print('  频率:', {d: blue_freq[d] for d in sorted(blue_warm)})

# 最近30期红球频率
recent30 = history[:30]
red30 = [0]*34
for h in recent30:
    for r in h['red']:
        red30[r] += 1
print('\n=== 最近30期 红球频率 ===')
for d in range(1,34):
    if red30[d] > 0:
        print('  %02d: %d次' % (d, red30[d]), end='  ')
print()

# 最近30期蓝球频率
blue30 = [0]*17
for h in recent30:
    for b in h['blue']:
        blue30[b] += 1
print('\n=== 最近30期 蓝球频率 ===')
for d in range(1,17):
    if blue30[d] > 0:
        print('  %02d: %d次' % (d, blue30[d]), end='  ')
print()

# ===== 温号筛选逻辑 =====
# 红球温号池(25个): 从中选6个
# 蓝球温号池(9个): 从中选1个
print('\n' + '='*60)
print('从温号中筛选10组号码')
print('='*60)

red_warm_list = sorted(red_warm)  # 25个温号
blue_warm_list = sorted(blue_warm)  # 9个温号

# 历史和值统计(红球6个的和)
sum_stats = []
for h in history:
    s = sum(h['red'])
    sum_stats.append(s)
avg_sum = sum(sum_stats)/len(sum_stats)
print('\n历史红球和值均值: %.1f' % avg_sum)
print('历史红球和值范围: %d~%d' % (min(sum_stats), max(sum_stats)))

# 奇偶比统计
print('\n历史红球奇偶比分布:')
oe_stats = {}
for h in history:
    odd = sum(1 for r in h['red'] if r%2==1)
    oe_stats['%d:%d'%(odd, 6-odd)] = oe_stats.get('%d:%d'%(odd, 6-odd), 0) + 1
for k in sorted(oe_stats.keys()):
    print('  %s -> %d次 (%.1f%%)' % (k, oe_stats[k], oe_stats[k]/total*100))

# 大小比统计(1-16小, 17-33大)
print('\n历史红球大小比分布(1-16小/17-33大):')
bs_stats = {}
for h in history:
    big = sum(1 for r in h['red'] if r>=17)
    bs_stats['%d:%d'%(big, 6-big)] = bs_stats.get('%d:%d'%(big, 6-big), 0) + 1
for k in sorted(bs_stats.keys()):
    print('  %s -> %d次 (%.1f%%)' % (k, bs_stats[k], bs_stats[k]/total*100))

# 三区比统计(1-11一区/12-22二区/23-33三区)
print('\n历史红球三区比分布(1-11/12-22/23-33):')
zone_stats = {}
for h in history:
    z1 = sum(1 for r in h['red'] if 1<=r<=11)
    z2 = sum(1 for r in h['red'] if 12<=r<=22)
    z3 = sum(1 for r in h['red'] if 23<=r<=33)
    key = '%d:%d:%d' % (z1,z2,z3)
    zone_stats[key] = zone_stats.get(key, 0) + 1
for k in sorted(zone_stats.keys(), key=lambda x: -zone_stats[x])[:8]:
    print('  %s -> %d次 (%.1f%%)' % (k, zone_stats[k], zone_stats[k]/total*100))

# 跨度统计(最大-最小)
spans = [max(h['red'])-min(h['red']) for h in history]
print('\n历史红球跨度: 均值%.1f, 范围%d~%d' % (sum(spans)/len(spans), min(spans), max(spans)))

# 连号统计
print('\n历史连号情况:')
has_conn = 0
for h in history:
    r = sorted(h['red'])
    for i in range(len(r)-1):
        if r[i+1]-r[i] == 1:
            has_conn += 1
            break
print('  含连号: %d次 (%.1f%%)' % (has_conn, has_conn/total*100))

# 温号频率排序(用于加权)
print('\n=== 红球温号频率排序 ===')
warm_freq_sorted = sorted(red_warm_list, key=lambda d: -red_freq[d])
for d in warm_freq_sorted:
    print('  %02d: %d次 遗漏%d期' % (d, red_freq[d], next((i for i,h in enumerate(history) if d in h['red']), total)))

print('\n=== 蓝球温号频率排序 ===')
for d in sorted(blue_warm_list, key=lambda d: -blue_freq[d]):
    print('  %02d: %d次 遗漏%d期' % (d, blue_freq[d], next((i for i,h in enumerate(history) if d in h['blue']), total)))
