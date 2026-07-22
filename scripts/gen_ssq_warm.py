# -*- coding: utf-8 -*-
"""从温号池中筛选10组双色球号码 - 符合概率统计自然规律"""
import json
import random

random.seed(20260721)

with open('e:/dlt-simulator/data/ssq.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

history = data['history']

# 用户定义的温号池
# 红球热码:03 09 16 冷号:01 32 33 → 温号=其余27个
# 蓝球热号:05 08 16 冷号:01 11 12 → 温号=其余10个
red_warm = [2,4,5,6,7,8,10,11,12,13,14,15,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31]
blue_warm = [2,3,4,6,7,9,10,13,14,15]

# 历史统计参数（来自分析）
# 和值均值104.2, 范围41~150, 目标区间90~120(约70%落在此区间)
# 奇偶比: 3:3(27%), 4:2(30%), 2:4(13%) → 主选3:3和4:2
# 大小比(1-16小/17-33大): 2:4(33%), 4:2(30%), 3:3(20%) → 主选2:4和3:3
# 三区比(1-11/12-22/23-33): 2:2:2(20%), 3:1:2(17%), 2:1:3(13%) → 主选2:2:2和3:1:2
# 跨度均值24.2, 目标20~30
# 连号率73.3% → 7成含连号

# 温号频率(用于加权随机)
red_freq = {}
for h in history:
    for r in h['red']:
        red_freq[r] = red_freq.get(r, 0) + 1

# 红球温号按频率加权
warm_weights = [red_freq.get(d, 0) + 1 for d in red_warm]  # +1避免0权重

def get_zone(d):
    if 1 <= d <= 11: return 0
    elif 12 <= d <= 22: return 1
    else: return 2

def validate(reds, blue):
    """验证一组号码是否符合统计规律，返回评分(越高越好)及原因"""
    score = 0
    reasons = []
    
    s = sum(reds)
    # 和值：90~120为佳
    if 90 <= s <= 120:
        score += 20
        reasons.append('和值%d在主区间' % s)
    elif 80 <= s <= 130:
        score += 10
    else:
        score -= 10
        reasons.append('和值%d偏离' % s)
    
    # 奇偶比
    odd = sum(1 for r in reds if r % 2 == 1)
    oe = '%d:%d' % (odd, 6 - odd)
    if oe in ('3:3', '4:2'):
        score += 15
        reasons.append('奇偶%s' % oe)
    elif oe in ('2:4', '5:1'):
        score += 5
    else:
        score -= 5
    
    # 大小比(1-16小/17-33大)
    big = sum(1 for r in reds if r >= 17)
    bs = '%d:%d' % (big, 6 - big)
    if bs in ('2:4', '3:3', '4:2'):
        score += 15
        reasons.append('大小%s' % bs)
    else:
        score -= 5
    
    # 三区比
    zones = [0, 0, 0]
    for r in reds:
        zones[get_zone(r)] += 1
    zkey = '%d:%d:%d' % tuple(zones)
    if zkey in ('2:2:2', '3:1:2', '2:1:3', '3:2:1'):
        score += 15
        reasons.append('三区%s' % zkey)
    elif min(zones) > 0:  # 三区不空
        score += 5
    else:
        score -= 10
        reasons.append('三区%s有断层' % zkey)
    
    # 跨度
    span = max(reds) - min(reds)
    if 20 <= span <= 30:
        score += 10
        reasons.append('跨度%d' % span)
    elif span < 15 or span > 32:
        score -= 10
    else:
        score += 3
    
    # 连号
    r_sorted = sorted(reds)
    has_conn = any(r_sorted[i+1] - r_sorted[i] == 1 for i in range(len(r_sorted)-1))
    if has_conn:
        score += 8
        reasons.append('含连号')
    
    # 蓝球：优先选频率高或遗漏长的温号
    blue_freq_map = {2:4, 3:0, 4:5, 6:1, 7:3, 9:1, 10:0, 13:2, 14:0, 15:2}
    bf = blue_freq_map.get(blue, 0)
    if bf >= 3:
        score += 5
        reasons.append('蓝%02d热' % blue)
    
    return score, reasons

# 生成候选并筛选
candidates = []
attempts = 0
while len(candidates) < 200 and attempts < 50000:
    attempts += 1
    # 加权随机选6个红球温号
    reds = sorted(random.sample(red_warm, 6))
    blue = random.choice(blue_warm)
    
    # 去重检查
    key = tuple(reds) + (blue,)
    if any(c[0] == key for c in candidates):
        continue
    
    score, reasons = validate(reds, blue)
    if score >= 50:  # 门槛分
        candidates.append((key, score, reasons))

# 按评分排序取前10组
candidates.sort(key=lambda x: -x[1])
top10 = candidates[:10]

print('='*70)
print('从温号池中筛选的10组双色球号码')
print('='*70)
print('红球温号池(%d个): %s' % (len(red_warm), ' '.join('%02d'%d for d in red_warm)))
print('蓝球温号池(%d个): %s' % (len(blue_warm), ' '.join('%02d'%d for d in blue_warm)))
print()

# 输出统计验证信息
print('统计规律约束:')
print('  和值主区间: 90~120 (历史均值104.2)')
print('  奇偶比主选: 3:3(27%) / 4:2(30%)')
print('  大小比主选: 2:4(33%) / 3:3(20%) / 4:2(30%)')
print('  三区比主选: 2:2:2(20%) / 3:1:2(17%) / 2:1:3(13%)')
print('  跨度主区间: 20~30 (历史均值24.2)')
print('  连号概率: 73.3%')
print()

for i, (key, score, reasons) in enumerate(top10, 1):
    reds = list(key[:6])
    blue = key[6]
    red_str = ' '.join('%02d' % r for r in reds)
    print('第%02d组  红: %s  蓝: %02d  [评分%d] %s' % (i, red_str, blue, score, '·'.join(reasons)))

# 汇总统计
print('\n' + '='*70)
print('10组号码汇总统计')
print('='*70)
all_sums = [sum(c[0][:6]) for c in top10]
all_oe = ['%d:%d' % (sum(1 for r in c[0][:6] if r%2==1), 6-sum(1 for r in c[0][:6] if r%2==1)) for c in top10]
all_bs = ['%d:%d' % (sum(1 for r in c[0][:6] if r>=17), 6-sum(1 for r in c[0][:6] if r>=17)) for c in top10]
all_span = [max(c[0][:6])-min(c[0][:6]) for c in top10]
conn_cnt = sum(1 for c in top10 if any(sorted(c[0][:6])[i+1]-sorted(c[0][:6])[i]==1 for i in range(5)))

print('  和值: %s (均值%.1f)' % (all_sums, sum(all_sums)/10))
print('  奇偶比分布:', {oe: all_oe.count(oe) for oe in set(all_oe)})
print('  大小比分布:', {bs: all_bs.count(bs) for bs in set(all_bs)})
print('  跨度: %s (均值%.1f)' % (all_span, sum(all_span)/10))
print('  含连号: %d/10 (%.0f%%)' % (conn_cnt, conn_cnt/10*100))

# 蓝球分布
blues = [c[0][6] for c in top10]
print('  蓝球: %s' % ' '.join('%02d'%b for b in blues))
