# -*- coding: utf-8 -*-
"""排列三 012路 + 走势综合分析"""
import json

with open('e:/dlt-simulator/data/pl3.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

history = data['history']
total = len(history)

# 0路:0,3,6,9  1路:1,4,7  2路:2,5,8
def road(d):
    return d % 3

# 012路组合统计
combo_stats = {}
pos_road_freq = [{'0':0,'1':0,'2':0} for _ in range(3)]

for h in history:
    nums = h['num']
    combo = ''.join(str(road(n)) for n in nums)
    combo_stats[combo] = combo_stats.get(combo, 0) + 1
    for p in range(3):
        pos_road_freq[p][str(road(nums[p]))] += 1

print('=== 012路组合统计 (全部%d期) ===' % total)
for k in sorted(combo_stats.keys(), key=lambda x: -combo_stats[x])[:15]:
    print('  %s  ->  %3d 次  (%.1f%%)' % (k, combo_stats[k], combo_stats[k]/total*100))

print('\n=== 各位 012路频率 (全部%d期) ===' % total)
labels = ['百','十','个']
for p in range(3):
    print('  %s位: 0路=%d(%.0f%%) 1路=%d(%.0f%%) 2路=%d(%.0f%%)' % (
        labels[p], pos_road_freq[p]['0'], pos_road_freq[p]['0']/total*100,
        pos_road_freq[p]['1'], pos_road_freq[p]['1']/total*100,
        pos_road_freq[p]['2'], pos_road_freq[p]['2']/total*100))

# 最近30期 012路
recent30 = history[:30]
pos_road_30 = [{'0':0,'1':0,'2':0} for _ in range(3)]
combo_30 = {}
for h in recent30:
    nums = h['num']
    combo = ''.join(str(road(n)) for n in nums)
    combo_30[combo] = combo_30.get(combo, 0) + 1
    for p in range(3):
        pos_road_30[p][str(road(nums[p]))] += 1

print('\n=== 最近30期 各位 012路频率 ===')
for p in range(3):
    print('  %s位: 0路=%d(%.0f%%) 1路=%d(%.0f%%) 2路=%d(%.0f%%)' % (
        labels[p], pos_road_30[p]['0'], pos_road_30[p]['0']/30*100,
        pos_road_30[p]['1'], pos_road_30[p]['1']/30*100,
        pos_road_30[p]['2'], pos_road_30[p]['2']/30*100))

print('\n=== 最近30期 012路组合TOP10 ===')
for k in sorted(combo_30.keys(), key=lambda x: -combo_30[x])[:10]:
    print('  %s  ->  %2d 次  (%.1f%%)' % (k, combo_30[k], combo_30[k]/30*100))

# 最近15期走势明细
print('\n=== 最近15期 走势明细 ===')
print('  期号      号码      奇偶比  大小比  012路  和值  跨度')
for h in history[:15]:
    nums = h['num']
    odd = sum(1 for n in nums if n%2==1)
    big = sum(1 for n in nums if n>=5)
    combo = ''.join(str(road(n)) for n in nums)
    s = sum(nums)
    sp = max(nums)-min(nums)
    print('  %s  [%d,%d,%d]   %d:%d     %d:%d     %s    %2d    %d' % (
        h['period'], nums[0],nums[1],nums[2], odd,3-odd, big,3-big, combo, s, sp))

# 各位遗漏分析(最近)
print('\n=== 各位数字遗漏 (距上次出现期数) ===')
for p in range(3):
    miss = {}
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
