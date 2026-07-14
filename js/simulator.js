// ====== 摇号模拟器（大乐透 / 双色球 / 排列三）======

// 各彩种配置
const LOTTERY_CONFIGS = {
    // 大乐透：前区 35 选 5，后区 12 选 2
    dlt: {
        name: '大乐透',
        emoji: '🎲',
        areas: [
            { id: 'front', label: '前区', desc: '35选5', count: 5, min: 1, max: 35, unique: true, ballClass: 'front-ball', colorKey: 'front', pad: 2 },
            { id: 'back',  label: '后区', desc: '12选2', count: 2, min: 1, max: 12, unique: true, ballClass: 'back-ball',  colorKey: 'back',  pad: 2 }
        ],
        dataFile: 'data/latest.json',
        separator: '＋'
    },
    // 双色球：红球 33 选 6，蓝球 16 选 1
    ssq: {
        name: '双色球',
        emoji: '🔴',
        areas: [
            { id: 'red',  label: '红球', desc: '33选6', count: 6, min: 1, max: 33, unique: true, ballClass: 'red-ball',  colorKey: 'red',  pad: 2 },
            { id: 'blue', label: '蓝球', desc: '16选1', count: 1, min: 1, max: 16, unique: true, ballClass: 'blue-ball', colorKey: 'blue', pad: 2 }
        ],
        dataFile: 'data/ssq.json',
        separator: '＋'
    },
    // 排列三：0-9 三位（可重复）
    pl3: {
        name: '排列三',
        emoji: '🎯',
        areas: [
            { id: 'num', label: '号码', desc: '0-9选3位', count: 3, min: 0, max: 9, unique: false, ballClass: 'pl3-ball', colorKey: 'pl3', pad: 1 }
        ],
        dataFile: 'data/pl3.json',
        separator: null
    }
};

// 当前激活的彩种
let currentType = 'dlt';

// DOM 元素
const pageTitleEl = document.getElementById('pageTitle');
const tabsEl = document.querySelectorAll('.tab');
const lotteryStageEl = document.getElementById('lotteryStage');
const drawBtn = document.getElementById('drawBtn');
const resetBtn = document.getElementById('resetBtn');
const resultText = document.getElementById('resultText');
const latestContent = document.getElementById('latestContent');
const historyContent = document.getElementById('historyContent');

// 各彩种球区的容器引用（按 type 缓存）
let areaBallsEls = {};

function getCurrentConfig() {
    return LOTTERY_CONFIGS[currentType];
}

// 格式化号码
function formatNumber(n, pad) {
    return String(n).padStart(pad || 2, '0');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 生成号码（支持去重 / 允许重复）
function generateNumbers(area) {
    const numbers = [];
    if (area.unique) {
        while (numbers.length < area.count) {
            const n = Math.floor(Math.random() * (area.max - area.min + 1)) + area.min;
            if (!numbers.includes(n)) numbers.push(n);
        }
        numbers.sort((a, b) => a - b);
    } else {
        // 允许重复（排列三）
        for (let i = 0; i < area.count; i++) {
            numbers.push(Math.floor(Math.random() * (area.max - area.min + 1)) + area.min);
        }
    }
    return numbers;
}

// 构建摇号舞台
function buildStage() {
    const config = getCurrentConfig();
    lotteryStageEl.innerHTML = '';
    areaBallsEls[currentType] = {};

    config.areas.forEach((area, idx) => {
        const areaDiv = document.createElement('div');
        areaDiv.className = 'area ' + area.id + '-area';

        const h2 = document.createElement('h2');
        h2.innerHTML = `${area.label} <span class="area-desc">${area.desc}</span>`;
        areaDiv.appendChild(h2);

        const ballsDiv = document.createElement('div');
        ballsDiv.className = 'balls';
        areaDiv.appendChild(ballsDiv);

        // 占位球
        for (let i = 0; i < area.count; i++) {
            const ball = document.createElement('div');
            ball.className = 'ball empty';
            ball.textContent = '??';
            ballsDiv.appendChild(ball);
        }

        areaBallsEls[currentType][area.id] = ballsDiv;

        // 将球区插入舞台
        lotteryStageEl.appendChild(areaDiv);

        // 区域分隔符
        if (config.separator && idx < config.areas.length - 1) {
            const sep = document.createElement('div');
            sep.className = 'separator';
            sep.textContent = config.separator;
            lotteryStageEl.appendChild(sep);
        }
    });
}

// ====== 摇奖机动画 ======

// 混合阶段：所有球在区域内弹跳翻滚（物理模拟）
function mixBalls(ballEls, duration) {
    const balls = Array.from(ballEls).map(el => {
        el.classList.add('mixing');
        return {
            el,
            x: (Math.random() - 0.5) * 10,
            y: (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 7,
            vy: (Math.random() - 0.5) * 7,
            rot: Math.random() * 360,
            vrot: (Math.random() - 0.5) * 28
        };
    });

    const bounds = 24;
    const startTime = Date.now();

    return new Promise(resolve => {
        function animate() {
            const elapsed = Date.now() - startTime;
            if (elapsed >= duration) {
                balls.forEach(b => {
                    b.el.style.transform = '';
                    b.el.classList.remove('mixing');
                });
                resolve();
                return;
            }

            balls.forEach(b => {
                b.x += b.vx;
                b.y += b.vy;
                b.rot += b.vrot;

                // 边界反弹
                if (Math.abs(b.x) > bounds) { b.vx *= -1; b.x = Math.sign(b.x) * bounds; }
                if (Math.abs(b.y) > bounds) { b.vy *= -1; b.y = Math.sign(b.y) * bounds; }

                // 随机扰动让运动更自然
                b.vx += (Math.random() - 0.5) * 0.9;
                b.vy += (Math.random() - 0.5) * 0.9;
                b.vx = Math.max(-8, Math.min(8, b.vx));
                b.vy = Math.max(-8, Math.min(8, b.vy));

                b.el.style.transform = `translate(${b.x}px, ${b.y}px) rotate(${b.rot}deg)`;
            });

            requestAnimationFrame(animate);
        }
        animate();
    });
}

// 开球：弹起旋转 + 快速变号 + 落定发光
function drawBall(ballEl, finalNumber, area, duration) {
    return new Promise(resolve => {
        ballEl.classList.remove('empty');
        ballEl.classList.add(area.ballClass, 'shooting');

        const startTime = Date.now();
        let lastTick = 0;
        let interval = 30;

        const tick = () => {
            const now = Date.now();
            const elapsed = now - startTime;

            if (now - lastTick >= interval) {
                const randomN = Math.floor(Math.random() * (area.max - area.min + 1)) + area.min;
                ballEl.textContent = formatNumber(randomN, area.pad);
                lastTick = now;
                const progress = elapsed / duration;
                interval = 30 + Math.pow(progress, 2) * 90;
            }

            if (elapsed < duration) {
                requestAnimationFrame(tick);
            } else {
                ballEl.textContent = formatNumber(finalNumber, area.pad);
                ballEl.classList.remove('shooting');
                ballEl.classList.add('landed');
                setTimeout(() => ballEl.classList.remove('landed'), 450);
                resolve();
            }
        };
        requestAnimationFrame(tick);
    });
}

// 摇号主流程
async function draw() {
    const config = getCurrentConfig();
    drawBtn.disabled = true;
    resultText.innerHTML = '🎉 正在摇号中...';

    buildStage();

    const allNumbers = {};
    config.areas.forEach(area => {
        allNumbers[area.id] = generateNumbers(area);
    });

    for (let a = 0; a < config.areas.length; a++) {
        const area = config.areas[a];
        const numbers = allNumbers[area.id];
        const ballsDiv = areaBallsEls[currentType][area.id];
        const ballEls = ballsDiv.querySelectorAll('.ball');

        // 混合阶段：所有球弹跳翻滚（模拟摇奖机）
        ballsDiv.classList.add('mixing');
        await mixBalls(ballEls, 700);
        ballsDiv.classList.remove('mixing');

        // 开球阶段：逐个弹出落定
        for (let i = 0; i < area.count; i++) {
            await drawBall(ballEls[i], numbers[i], area, 500);
            await sleep(60);
        }

        if (a < config.areas.length - 1) {
            await sleep(200);
        }
    }

    // 显示结果
    const parts = config.areas.map(area => {
        return allNumbers[area.id]
            .map(n => `<span class="num ${area.colorKey}">${formatNumber(n, area.pad)}</span>`)
            .join(' ');
    });
    const sep = config.separator ? ` <span style="color:rgba(255,255,255,0.4)">｜</span> ` : ' ';
    resultText.innerHTML = `✅ 摇号结果：${parts.join(sep)}`;

    drawBtn.disabled = false;
}

// 重置
function reset() {
    buildStage();
    resultText.innerHTML = '点击下方按钮开始摇号';
}

// 切换彩种
function switchType(type) {
    if (!LOTTERY_CONFIGS[type]) return;
    currentType = type;
    const config = getCurrentConfig();

    // 更新 tab 状态
    tabsEl.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.type === type);
    });

    // 更新标题
    pageTitleEl.textContent = `${config.emoji} ${config.name}摇号模拟器`;

    // 重置舞台与结果
    buildStage();
    resultText.innerHTML = '点击下方按钮开始摇号';

    // 旋转矩阵按钮仅大乐透可见
    updateMatrixVisibility();

    // 重新加载数据
    loadLotteryData();
}

// 各彩种面板按钮显隐
function updateMatrixVisibility() {
    const dltShow = currentType === 'dlt';
    const pl3Show = currentType === 'pl3';
    document.getElementById('matrixBtn').style.display = dltShow ? '' : 'none';
    document.getElementById('pl3Btn').style.display = pl3Show ? '' : 'none';
    if (!dltShow) document.getElementById('matrixPanel').style.display = 'none';
    if (!pl3Show) document.getElementById('pl3Panel').style.display = 'none';
    document.getElementById('pl3ParityPanel').style.display = pl3Show ? '' : 'none';
    document.getElementById('pl3TrendPanel').style.display = pl3Show ? '' : 'none';
}

// 加载开奖数据
async function loadLotteryData() {
    const config = getCurrentConfig();
    try {
        const response = await fetch(config.dataFile + '?t=' + Date.now());
        if (!response.ok) throw new Error('加载失败');
        const data = await response.json();

        if (!data.latest || data.latest.period === '示例') {
            latestContent.innerHTML = `<p class="loading">⏳ 暂无数据，等待爬虫自动更新</p>`;
            historyContent.innerHTML = `<p class="loading">⏳ 暂无历史数据</p>`;
            return;
        }

        renderLatest(data.latest);
        renderHistory(data.history || []);
        renderPl3Parity(data.history || []);
        renderPl3Trend(data.history || []);
    } catch (e) {
        latestContent.innerHTML = `<p class="loading">⚠️ 暂无${config.name}开奖数据</p>`;
        historyContent.innerHTML = `<p class="loading">⚠️ 暂无历史数据</p>`;
    }
}

function renderLatest(latest) {
    const config = getCurrentConfig();
    const parts = config.areas.map(area => {
        const nums = latest[area.id] || [];
        return nums.map(n => `<div class="ball-mini ${area.colorKey}">${formatNumber(n, area.pad)}</div>`).join('');
    });
    const sep = config.separator
        ? `<div style="font-size:1rem;color:rgba(255,255,255,0.3)">${config.separator}</div>`
        : '';

    latestContent.innerHTML = `
        <div class="latest-draw">
            <div class="draw-info">
                <div>第 ${latest.period || '--'} 期</div>
                <div>${latest.date || '--'}</div>
            </div>
            ${parts.map(p => `<div class="balls-mini">${p}</div>`).join(sep ? sep : '')}
        </div>
    `;
}

function renderHistory(history) {
    const config = getCurrentConfig();
    if (!history || history.length === 0) {
        historyContent.innerHTML = `<p class="loading">暂无历史数据</p>`;
        return;
    }

    const headers = ['期号', '开奖日', ...config.areas.map(a => a.label)];
    let html = `<table class="history-table"><thead><tr>`;
    headers.forEach(h => html += `<th>${h}</th>`);
    html += `</tr></thead><tbody>`;

    history.slice(0, 30).forEach(item => {
        html += `<tr><td>${item.period || '--'}</td><td>${item.date || '--'}</td>`;
        config.areas.forEach(area => {
            const nums = item[area.id] || [];
            const balls = nums.map(n => `<span class="h-ball ${area.colorKey}">${formatNumber(n, area.pad)}</span>`).join('');
            html += `<td>${balls}</td>`;
        });
        html += `</tr>`;
    });
    html += '</tbody></table>';
    historyContent.innerHTML = html;
}

// ====== 排列三 百/十/个位 分析（奇偶 / 大小，可选期数）======
let pl3ParityHistory = [];        // 缓存最近一次加载的完整历史
let pl3ParityLimit = 30;          // 当前统计期数
let pl3ParityDimension = 'odd';   // 当前分析维度：odd=奇偶, size=大小
const PL3_PARITY_OPTIONS = [30, 50, 80, 100, 150];

// 维度配置：a=满足条件的一方（奇/大），b=另一方（偶/小）
const PL3_DIMENSIONS = {
    odd: {
        name: '奇偶',
        desc: '奇数 1/3/5/7/9 · 偶数 0/2/4/6/8',
        test: n => n % 2 === 1,
        aChar: '奇', bChar: '偶', aClass: 'odd', bClass: 'even',
        legendA: '奇数（1/3/5/7/9）', legendB: '偶数（0/2/4/6/8）',
        comboKeys: ['奇奇奇', '奇奇偶', '奇偶奇', '奇偶偶', '偶奇奇', '偶奇偶', '偶偶奇', '偶偶偶'],
        comboColor: { 3: '#f12711', 2: '#f5af19', 1: '#4facfe', 0: '#0072e3' },
        dominant: (a, b) => a >= b ? '奇数偏多' : '偶数偏多',
    },
    size: {
        name: '大小',
        desc: '大区 5/6/7/8/9 · 小区 0/1/2/3/4',
        test: n => n >= 5,
        aChar: '大', bChar: '小', aClass: 'big', bClass: 'small',
        legendA: '大数（5/6/7/8/9）', legendB: '小数（0/1/2/3/4）',
        comboKeys: ['大大大', '大大小', '大小大', '大小小', '小大大', '小大小', '小小大', '小小小'],
        comboColor: { 3: '#a855f7', 2: '#d946ef', 1: '#06b6d4', 0: '#10b981' },
        dominant: (a, b) => a >= b ? '大数偏多' : '小数偏多',
    }
};

function renderPl3Parity(history) {
    const panel = document.getElementById('pl3ParityContent');
    if (!panel) return;
    if (currentType !== 'pl3') { panel.innerHTML = ''; return; }

    pl3ParityHistory = history || [];
    const maxAvail = pl3ParityHistory.length;
    const limit = Math.min(pl3ParityLimit, maxAvail);
    const recent = pl3ParityHistory.slice(0, limit);
    if (recent.length === 0) {
        panel.innerHTML = `<p class="loading">暂无历史数据</p>`;
        return;
    }

    const dim = PL3_DIMENSIONS[pl3ParityDimension] || PL3_DIMENSIONS.odd;
    const positions = ['百位', '十位', '个位'];
    const total = recent.length;

    // 每位 a/b 计数
    const stats = positions.map(() => ({ a: 0, b: 0 }));
    recent.forEach(item => {
        const num = item.num || [];
        num.forEach((n, idx) => {
            if (idx < 3) {
                if (dim.test(n)) stats[idx].a++;
                else stats[idx].b++;
            }
        });
    });

    // 三位组合统计（8 种）
    const comboCount = {};
    dim.comboKeys.forEach(k => comboCount[k] = 0);
    recent.forEach(item => {
        const num = item.num || [];
        const form = [0, 1, 2].map(i => dim.test(num[i]) ? dim.aChar : dim.bChar).join('');
        if (comboCount.hasOwnProperty(form)) comboCount[form]++;
    });
    const aCharRe = new RegExp(dim.aChar, 'g');
    const comboRows = dim.comboKeys
        .map(k => ({ key: k, cnt: comboCount[k], aCnt: (k.match(aCharRe) || []).length }))
        .sort((a, b) => b.cnt - a.cnt || dim.comboKeys.indexOf(a.key) - dim.comboKeys.indexOf(b.key));
    const topCombo = comboRows[0];
    const comboBars = comboRows.map(r => {
        const pct = total ? r.cnt / total * 100 : 0;
        const chips = r.key.split('').map(c => `<i class="combo-chip ${c === dim.aChar ? dim.aClass : dim.bClass}">${c}</i>`).join('');
        return `
            <div class="combo-row">
                <div class="combo-label">${chips}</div>
                <div class="combo-bar-wrap">
                    <i class="combo-ref" style="left:12.5%;"></i>
                    <div class="combo-bar" style="width:${pct}%;background:${dim.comboColor[r.aCnt]};"></div>
                    <span class="combo-pct" style="left:calc(${pct}% + 6px);">${pct.toFixed(1)}%</span>
                </div>
                <div class="combo-count">${r.cnt} 次</div>
            </div>
        `;
    }).join('');

    // 汇总：每位一条堆叠条 + 占比
    const summary = positions.map((name, i) => {
        const s = stats[i];
        const aPct = s.a / total * 100;
        const bPct = s.b / total * 100;
        const dominant = dim.dominant(s.a, s.b);
        return `
            <div class="parity-row">
                <div class="parity-label">${name}</div>
                <div class="parity-bar">
                    <div class="parity-seg ${dim.aClass}" style="width:${aPct}%;">${dim.aChar} ${s.a}</div>
                    <div class="parity-seg ${dim.bClass}" style="width:${bPct}%;">${dim.bChar} ${s.b}</div>
                </div>
                <div class="parity-meta">
                    <span class="tag ${dim.aClass}-tag">${dim.aChar} ${aPct.toFixed(1)}%</span>
                    <span class="tag ${dim.bClass}-tag">${dim.bChar} ${bPct.toFixed(1)}%</span>
                    <span class="parity-dominant">${dominant}</span>
                </div>
            </div>
        `;
    }).join('');

    // 逐期明细：N 期 × 3 位，每格显示号码+维度标签
    const timelineHead = `<tr><th>期号</th><th>日期</th>${positions.map(p => `<th>${p}</th>`).join('')}<th>形态</th></tr>`;
    const timelineBody = recent.map(item => {
        const num = item.num || [];
        const cells = [0, 1, 2].map(i => {
            const n = num[i];
            const isA = dim.test(n);
            return `<td><span class="oe-cell ${isA ? dim.aClass : dim.bClass}">${n}<small>${isA ? dim.aChar : dim.bChar}</small></span></td>`;
        }).join('');
        const form = [0, 1, 2].map(i => dim.test(num[i]) ? dim.aChar : dim.bChar).join('');
        return `<tr><td>${item.period || '--'}</td><td>${item.date || '--'}</td>${cells}<td><span class="oe-form">${form}</span></td></tr>`;
    }).join('');

    // 期数选择器（数据不足的期数仍可选，并显示提示）
    const insufficient = pl3ParityLimit > maxAvail;
    const opts = PL3_PARITY_OPTIONS.map(n => {
        const sel = n === pl3ParityLimit ? ' selected' : '';
        const note = n > maxAvail ? '（数据不足）' : '';
        return `<option value="${n}"${sel}>最近 ${n} 期${note}</option>`;
    }).join('');

    // 维度切换按钮
    const dimBtns = Object.keys(PL3_DIMENSIONS).map(k => {
        const active = k === pl3ParityDimension ? ' active' : '';
        return `<button type="button" class="dim-btn${active}" data-dim="${k}">${PL3_DIMENSIONS[k].name}</button>`;
    }).join('');

    panel.innerHTML = `
        <div class="parity-toolbar">
            <div class="dim-switch">${dimBtns}</div>
            <label class="parity-limit-label">统计期数：
                <select id="pl3ParityLimit">
                    ${opts}
                </select>
            </label>
            <span class="parity-avail">可用历史 <b>${maxAvail}</b> 期${insufficient ? ` · 需 <b>${pl3ParityLimit}</b> 期` : ''}</span>
            ${insufficient ? `<button type="button" id="pl3ParityFetch" class="btn btn-primary parity-fetch-btn">📥 补充数据（抓取 ${pl3ParityLimit} 期）</button>` : ''}
        </div>
        ${insufficient ? `<div class="parity-hint" id="pl3ParityHint">当前本地仅有 ${maxAvail} 期数据，点击上方按钮可从 500 彩票网抓取更多期数补充。</div>` : ''}
        <div class="parity-summary">
            <div class="parity-total">共统计 <b>${total}</b> 期（由近到远）· 当前维度：<b>${dim.name}</b>（${dim.desc}）</div>
            ${summary}
            <div class="parity-legend">
                <span class="legend-item"><i class="dot ${dim.aClass}-dot"></i>${dim.legendA}</span>
                <span class="legend-item"><i class="dot ${dim.bClass}-dot"></i>${dim.legendB}</span>
            </div>
        </div>
        <div class="parity-combo">
            <h3>🎲 三位${dim.name}组合占比（共 8 种）</h3>
            <p class="combo-desc">按「百位·十位·个位」${dim.name}组合统计，柱状长度为该组合在 ${total} 期中的占比，虚线为理论均衡线 12.5%。最常出现：<b class="combo-top">${topCombo.key}</b>（${(topCombo.cnt / total * 100).toFixed(1)}%）</p>
            <div class="combo-list">
                ${comboBars}
            </div>
        </div>
        <div class="parity-timeline-wrap">
            <h3>🔢 逐期${dim.name}明细（${total} 期）</h3>
            <div class="parity-table-scroll">
                <table class="parity-timeline"><thead>${timelineHead}</thead><tbody>${timelineBody}</tbody></table>
            </div>
        </div>
    `;

    // 绑定维度切换
    panel.querySelectorAll('.dim-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            pl3ParityDimension = btn.dataset.dim;
            renderPl3Parity(pl3ParityHistory);
        });
    });

    // 绑定期数切换
    const sel = document.getElementById('pl3ParityLimit');
    if (sel) {
        sel.addEventListener('change', e => {
            pl3ParityLimit = parseInt(e.target.value, 10) || 30;
            renderPl3Parity(pl3ParityHistory);
        });
    }

    // 绑定补充数据按钮
    const fetchBtn = document.getElementById('pl3ParityFetch');
    if (fetchBtn) {
        fetchBtn.addEventListener('click', () => fetchPl3ParityMore(pl3ParityLimit));
    }
}

// ====== 排列三 走势图（百/十/个位 + 手动画线）======
let pl3TrendHistory = [];
let pl3TrendLimit = 30;
let pl3TrendPos = 0;            // 0=百位, 1=十位, 2=个位
let pl3TrendDrawMode = false;   // 是否处于画线模式
let pl3TrendDrawStart = null;   // 画线起点（{row, col}）
let pl3TrendDrawings = [];      // 已画线：[{key1, key2}, ...]
const PL3_TREND_DRAW_KEY = 'pl3TrendDrawings';

function loadPl3TrendDrawings() {
    try {
        const raw = localStorage.getItem(PL3_TREND_DRAW_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}

function savePl3TrendDrawings() {
    try {
        localStorage.setItem(PL3_TREND_DRAW_KEY, JSON.stringify(pl3TrendDrawings));
    } catch (e) { /* 忽略 */ }
}

function getCurrentTrendDrawings() {
    // 当前 pos + limit 下的画线
    return pl3TrendDrawings.filter(d => d.pos === pl3TrendPos && d.limit === pl3TrendLimit);
}

function addPl3TrendDrawing(k1, k2) {
    // 避免重复
    const exists = pl3TrendDrawings.some(d => d.pos === pl3TrendPos && d.limit === pl3TrendLimit &&
        ((d.k1 === k1 && d.k2 === k2) || (d.k1 === k2 && d.k2 === k1)));
    if (exists) return false;
    pl3TrendDrawings.push({ pos: pl3TrendPos, limit: pl3TrendLimit, k1, k2 });
    savePl3TrendDrawings();
    return true;
}

function clearPl3TrendDrawings() {
    pl3TrendDrawings = pl3TrendDrawings.filter(d => !(d.pos === pl3TrendPos && d.limit === pl3TrendLimit));
    savePl3TrendDrawings();
}

function renderPl3Trend(history) {
    const panel = document.getElementById('pl3TrendPanel');
    if (!panel) return;
    if (currentType !== 'pl3') return;
    pl3TrendHistory = history || [];
    const recent = pl3TrendHistory.slice(0, pl3TrendLimit);
    // 期号从小到大：最早的在上，最新的（最新一期）在下
    const items = [...recent].reverse();
    const grid = document.getElementById('pl3TrendGrid');
    const thead = grid.querySelector('thead');
    const tbody = grid.querySelector('tbody');
    if (!thead || !tbody) return;

    // 表头
    let head = '<tr><th class="period-col">期号</th>';
    for (let n = 0; n < 10; n++) head += `<th>${n}</th>`;
    head += '</tr>';
    thead.innerHTML = head;

    // 实际数据行
    let body = '';
    items.forEach((item, rowIdx) => {
        const num = item.num || [];
        const n = num[pl3TrendPos];
        body += `<tr><td class="period-cell">${item.period || '--'}</td>`;
        for (let col = 0; col < 10; col++) {
            const hit = (n === col);
            const cls = hit ? ' class="num-cell hit"' : ' class="num-cell"';
            body += `<td${cls} data-row="${rowIdx}" data-col="${col}"><span>${col}</span></td>`;
        }
        body += '</tr>';
    });

    // 预测行（最新一期 + 1，特殊颜色）
    const lastPeriod = items.length > 0 ? parseInt(items[items.length - 1].period, 10) : null;
    const predictPeriod = (lastPeriod && !isNaN(lastPeriod)) ? (lastPeriod + 1) : '';
    const predictRowIdx = items.length;
    body += `<tr class="predict-row"><td class="period-cell predict-cell">🔮 ${predictPeriod}<small>预测</small></td>`;
    for (let col = 0; col < 10; col++) {
        body += `<td class="num-cell" data-row="${predictRowIdx}" data-col="${col}" data-predict="1"><span>${col}</span></td>`;
    }
    body += '</tr>';

    tbody.innerHTML = body;

    // 绘制趋势线与手动画线
    drawTrendSvg();

    // 绑定格子点击（画线）
    tbody.querySelectorAll('.num-cell').forEach(td => {
        td.addEventListener('click', () => onTrendCellClick(td));
    });

    // 绑定模式提示
    updateTrendHint();
}

function onTrendCellClick(td) {
    if (!pl3TrendDrawMode) return;
    const row = parseInt(td.dataset.row, 10);
    const col = parseInt(td.dataset.col, 10);
    const key = `r${row}c${col}`;
    if (!pl3TrendDrawStart) {
        pl3TrendDrawStart = { row, col, key, el: td };
        td.classList.add('draw-start');
    } else {
        if (pl3TrendDrawStart.key === key) {
            // 取消
            pl3TrendDrawStart.el.classList.remove('draw-start');
            pl3TrendDrawStart = null;
        } else {
            addPl3TrendDrawing(pl3TrendDrawStart.key, key);
            pl3TrendDrawStart.el.classList.remove('draw-start');
            pl3TrendDrawStart = null;
            drawTrendSvg();
        }
    }
    updateTrendHint();
}

// 缩短线段两端（避免线条穿进球体）
function shrinkLine(x1, y1, x2, y2, dist) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len <= dist * 2) return [x1, y1, x2, y2]; // 太短不缩
    const ux = dx / len, uy = dy / len;
    return [x1 + ux * dist, y1 + uy * dist, x2 - ux * dist, y2 - uy * dist];
}

function drawTrendSvg() {
    const svg = document.getElementById('pl3TrendSvg');
    const grid = document.getElementById('pl3TrendGrid');
    const tbody = grid.querySelector('tbody');
    if (!svg || !tbody) return;

    // 设置 SVG 大小等于 wrap
    const wrap = document.getElementById('pl3TrendWrap');
    const wrapRect = wrap.getBoundingClientRect();
    svg.setAttribute('width', wrap.scrollWidth);
    svg.setAttribute('height', wrap.scrollHeight);
    svg.setAttribute('viewBox', `0 0 ${wrap.scrollWidth} ${wrap.scrollHeight}`);

    svg.innerHTML = '';

    // 1. 自动趋势线（红色折线连接每行红圈）
    const hits = tbody.querySelectorAll('.num-cell.hit');
    if (hits.length >= 2) {
        const pts = [];
        hits.forEach(td => {
            const r = td.getBoundingClientRect();
            pts.push({
                x: r.left - wrapRect.left + r.width / 2 + wrap.scrollLeft,
                y: r.top - wrapRect.top + r.height / 2 + wrap.scrollTop
            });
        });
        for (let i = 0; i < pts.length - 1; i++) {
            // 缩短端点，使线条不进到球内
            const [x1, y1, x2, y2] = shrinkLine(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, 14);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('stroke', '#f12711');
            line.setAttribute('stroke-width', '1.6');
            line.setAttribute('stroke-linecap', 'round');
            line.setAttribute('opacity', '0.9');
            svg.appendChild(line);
        }
    }

    // 2. 手动画线（绿色虚线）
    const drawings = getCurrentTrendDrawings();
    drawings.forEach(d => {
        const c1 = findTrendCell(d.k1);
        const c2 = findTrendCell(d.k2);
        if (!c1 || !c2) return;
        const r1 = c1.getBoundingClientRect();
        const r2 = c2.getBoundingClientRect();
        const x1c = r1.left - wrapRect.left + r1.width / 2 + wrap.scrollLeft;
        const y1c = r1.top - wrapRect.top + r1.height / 2 + wrap.scrollTop;
        const x2c = r2.left - wrapRect.left + r2.width / 2 + wrap.scrollLeft;
        const y2c = r2.top - wrapRect.top + r2.height / 2 + wrap.scrollTop;
        // 缩短端点
        const [x1, y1, x2, y2] = shrinkLine(x1c, y1c, x2c, y2c, 15);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', '#43e97b');
        line.setAttribute('stroke-width', '2.5');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('stroke-dasharray', '5 3');
        svg.appendChild(line);

        // 在端点画一个小圆点（命中格显示红圆，其他格显示绿圆）
        [{ x: x1c, y: y1c, hit: c1.classList.contains('hit') || c1.dataset.predict === '1' },
         { x: x2c, y: y2c, hit: c2.classList.contains('hit') || c2.dataset.predict === '1' }].forEach(p => {
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', p.x);
            dot.setAttribute('cy', p.y);
            dot.setAttribute('r', '4');
            dot.setAttribute('fill', p.hit ? '#43e97b' : '#43e97b');
            dot.setAttribute('stroke', '#0f4c3a');
            dot.setAttribute('stroke-width', '1.2');
            svg.appendChild(dot);
        });
    });
}

function findTrendCell(key) {
    return document.querySelector(`#pl3TrendGrid td[data-row="${key.match(/r(\d+)/)[1]}"][data-col="${key.match(/c(\d+)/)[1]}"]`);
}

function updateTrendHint() {
    const hint = document.getElementById('pl3TrendHint');
    if (!hint) return;
    const drawBtn = document.getElementById('pl3TrendDraw');
    if (pl3TrendDrawMode) {
        if (!pl3TrendDrawStart) {
            hint.innerHTML = '✏️ <b>画线模式</b>：请点击第一个格子（起点）';
        } else {
            hint.innerHTML = '✏️ <b>画线模式</b>：请点击第二个格子（终点），点击起点可取消';
        }
        hint.className = 'trend-hint draw-on';
        drawBtn.textContent = '✅ 退出画线';
        drawBtn.classList.add('active');
    } else {
        const n = getCurrentTrendDrawings().length;
        hint.innerHTML = n > 0 ? `已画线 <b>${n}</b> 条（绿色虚线，保存于本地）` : '点击「✏️ 进入画线」可手动画线分析';
        hint.className = 'trend-hint';
        drawBtn.textContent = '✏️ 进入画线';
        drawBtn.classList.remove('active');
    }
}

// 切换位置
function setupTrendPosSwitch() {
    document.querySelectorAll('.trend-pos-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            pl3TrendPos = parseInt(btn.dataset.pos, 10);
            pl3TrendDrawStart = null;
            document.querySelectorAll('.trend-pos-btn').forEach(b => b.classList.toggle('active', b === btn));
            renderPl3Trend(pl3TrendHistory);
        });
    });
}

// 初始化走势图相关控件（仅一次）
function setupTrendControls() {
    const limitSel = document.getElementById('pl3TrendLimit');
    if (limitSel) {
        limitSel.addEventListener('change', e => {
            pl3TrendLimit = parseInt(e.target.value, 10) || 30;
            pl3TrendDrawStart = null;
            renderPl3Trend(pl3TrendHistory);
        });
    }
    const drawBtn = document.getElementById('pl3TrendDraw');
    if (drawBtn) {
        drawBtn.addEventListener('click', () => {
            pl3TrendDrawMode = !pl3TrendDrawMode;
            pl3TrendDrawStart = null;
            document.querySelectorAll('.num-cell.draw-start').forEach(el => el.classList.remove('draw-start'));
            updateTrendHint();
        });
    }
    const clearBtn = document.getElementById('pl3TrendClear');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (getCurrentTrendDrawings().length === 0) return;
            if (confirm('确定清空当前维度与期数下的所有手动画线吗？')) {
                clearPl3TrendDrawings();
                drawTrendSvg();
                updateTrendHint();
            }
        });
    }
    setupTrendPosSwitch();

    // 加载本地画线
    pl3TrendDrawings = loadPl3TrendDrawings();

    // 滚动/尺寸变化时重绘
    const wrap = document.getElementById('pl3TrendWrap');
    if (wrap) {
        let raf = null;
        const onScroll = () => {
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(drawTrendSvg);
        };
        wrap.addEventListener('scroll', onScroll);
        window.addEventListener('resize', onScroll);
    }
}

// 按需抓取更多排列三期数并刷新奇偶比分析
async function fetchPl3ParityMore(limit) {
    const btn = document.getElementById('pl3ParityFetch');
    const hint = document.getElementById('pl3ParityHint');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ 正在抓取数据...'; }
    if (hint) { hint.textContent = '正在从 500 彩票网抓取数据，请稍候...'; }

    try {
        const resp = await fetch(`/api/crawl?type=pl3&limit=${limit}&t=${Date.now()}`);
        if (!resp.ok) throw new Error('接口返回 ' + resp.status);
        const data = await resp.json();
        if (!data.ok) throw new Error(data.error || '抓取失败');

        // 用接口返回的数据更新缓存并重渲染
        pl3ParityHistory = data.history || [];
        pl3TrendHistory = data.history || [];
        renderPl3Parity(pl3ParityHistory);
        renderPl3Trend(pl3TrendHistory);

        // 同时刷新最新开奖号码区域
        if (data.latest) {
            try { renderLatest(data.latest); } catch (e) { /* 忽略 */ }
        }
    } catch (e) {
        const msg = `⚠️ 抓取失败：${e.message}。请确认已用「python serve.py」启动本地服务器（普通 http.server 无爬取接口）。`;
        if (hint) { hint.innerHTML = msg; }
        else if (btn) { btn.textContent = '❌ 抓取失败，点此重试'; btn.disabled = false; }
        if (btn) { btn.disabled = false; btn.textContent = '📥 重新补充数据'; }
    }
}

// ====== 旋转矩阵模块（大乐透）======

// 生成 C(n, k) 的所有组合（返回元素数组，元素为 arr 的子集）
function combinations(arr, k) {
    const result = [];
    const n = arr.length;
    if (k > n || k < 0) return result;
    const idx = Array.from({ length: k }, (_, i) => i);
    while (true) {
        result.push(idx.map(i => arr[i]));
        let i = k - 1;
        while (i >= 0 && idx[i] === n - k + i) i--;
        if (i < 0) break;
        idx[i]++;
        for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
    }
    return result;
}

// 旋转矩阵（贪婪集合覆盖）：
// 从 pool 中每注选 pick 个，保证 pool 中任意 guar 个号码的组合至少被某一注包含。
// 即：若开奖的 pick 个号码全部落在 pool 内，则至少有一注命中 guar 个。
function rotationMatrix(pool, pick, guar) {
    pool = pool.slice().sort((a, b) => a - b);
    if (guar > pick || guar > pool.length) return [];

    // guar === pick 时，每注只覆盖自身，直接返回全部组合
    if (guar === pick) return combinations(pool, pick);

    // 需要覆盖的目标：pool 的所有 guar 元子集
    const targetKeys = new Set(combinations(pool, guar).map(t => t.join(',')));
    const uncovered = new Set(targetKeys);

    // 所有可能的注
    const allBets = combinations(pool, pick);
    // 预计算每注覆盖的目标键
    const betCovers = allBets.map(bet =>
        combinations(bet, guar).map(s => s.join(','))
    );

    const chosen = [];
    const used = new Array(allBets.length).fill(false);

    while (uncovered.size > 0) {
        let bestIdx = -1;
        let bestCount = -1;
        for (let i = 0; i < allBets.length; i++) {
            if (used[i]) continue;
            const covers = betCovers[i];
            let count = 0;
            for (const key of covers) if (uncovered.has(key)) count++;
            if (count > bestCount) {
                bestCount = count;
                bestIdx = i;
            }
        }
        if (bestCount <= 0) break;
        chosen.push(allBets[bestIdx]);
        used[bestIdx] = true;
        for (const key of betCovers[bestIdx]) uncovered.delete(key);
    }
    return chosen;
}

// 矩阵模块 DOM 引用
const matrixBtn = document.getElementById('matrixBtn');
const matrixPanel = document.getElementById('matrixPanel');
const frontPoolEl = document.getElementById('frontPool');
const backPoolEl = document.getElementById('backPool');
const frontCountEl = document.getElementById('frontCount');
const backCountEl = document.getElementById('backCount');
const frontGuaranteeEl = document.getElementById('frontGuarantee');
const backGuaranteeEl = document.getElementById('backGuarantee');
const genMatrixBtn = document.getElementById('genMatrixBtn');
const testMatrixBtn = document.getElementById('testMatrixBtn');
const clearMatrixBtn = document.getElementById('clearMatrixBtn');
const matrixResultEl = document.getElementById('matrixResult');
const smartBtn = document.getElementById('smartBtn');
const autoPickBtn = document.getElementById('autoPickBtn');

let frontSelected = new Set();
let backSelected = new Set();
let lastMatrix = null; // { frontBets, backBets }
let matrixMode = 'matrix'; // 'matrix' | 'compound'
const DISPLAY_LIMIT = 200; // 结果渲染上限，避免 DOM 过多卡顿

// 渲染号码池
function buildMatrixPool(container, max, selectedSet, pad) {
    container.innerHTML = '';
    for (let n = 1; n <= max; n++) {
        const ball = document.createElement('div');
        ball.className = 'm-ball' + (selectedSet.has(n) ? ' selected' : '');
        ball.textContent = formatNumber(n, pad);
        ball.dataset.num = n;
        ball.addEventListener('click', () => {
            if (selectedSet.has(n)) selectedSet.delete(n);
            else selectedSet.add(n);
            ball.classList.toggle('selected');
            updateMatrixCounts();
        });
        container.appendChild(ball);
    }
}

function updateMatrixCounts() {
    frontCountEl.textContent = `已选 ${frontSelected.size}（需 5-15 个）`;
    backCountEl.textContent = `已选 ${backSelected.size}（需 2-6 个）`;
}

// 初始化矩阵号码池
function initMatrixPools() {
    buildMatrixPool(frontPoolEl, 35, frontSelected, 2);
    buildMatrixPool(backPoolEl, 12, backSelected, 2);
    updateMatrixCounts();
}

// 通用渲染：展示组合列表（超过上限仅渲染前 DISPLAY_LIMIT 注）
function renderMatrixResult(frontBets, backBets, summaryHtml, poolHtml) {
    const total = frontBets.length * backBets.length;
    matrixResultEl.innerHTML = `
        <div class="matrix-summary">${summaryHtml}<span class="tag tag-total">合计 <b>${total}</b> 注</span></div>
        ${poolHtml || ''}
        ${total > DISPLAY_LIMIT ? `<p class="loading">⚠️ 注数较多，仅展示前 ${DISPLAY_LIMIT} 注（共 ${total} 注）</p>` : ''}
        <div class="matrix-bets"></div>
    `;
    fillBetsBox(matrixResultEl.querySelector('.matrix-bets'), frontBets, backBets);
    testMatrixBtn.disabled = false;
}

// 填充组合列表到容器（带渲染上限）
function fillBetsBox(betsBox, frontBets, backBets) {
    let idx = 0;
    outer:
    for (const fb of frontBets) {
        for (const bb of backBets) {
            if (idx >= DISPLAY_LIMIT) break outer;
            idx++;
            const row = document.createElement('div');
            row.className = 'm-bet';
            const frontHtml = fb.map(n => `<span class="m-num front">${formatNumber(n, 2)}</span>`).join('');
            const backHtml = bb.map(n => `<span class="m-num back">${formatNumber(n, 2)}</span>`).join('');
            row.innerHTML = `<span class="m-idx">${idx}</span>${frontHtml}<span class="m-sep">＋</span>${backHtml}`;
            betsBox.appendChild(row);
        }
    }
}

// 生成旋转矩阵
function generateMatrix() {
    const frontPool = Array.from(frontSelected).sort((a, b) => a - b);
    const backPool = Array.from(backSelected).sort((a, b) => a - b);

    if (frontPool.length < 5 || frontPool.length > 15) {
        matrixResultEl.innerHTML = `<p class="loading">⚠️ 前区请选择 5-15 个号码（当前 ${frontPool.length} 个）</p>`;
        return;
    }
    if (backPool.length < 2 || backPool.length > 6) {
        matrixResultEl.innerHTML = `<p class="loading">⚠️ 后区请选择 2-6 个号码（当前 ${backPool.length} 个）</p>`;
        return;
    }

    const frontGuar = parseInt(frontGuaranteeEl.value, 10);
    const backGuar = parseInt(backGuaranteeEl.value, 10);

    const frontBets = rotationMatrix(frontPool, 5, frontGuar);
    const backBets = rotationMatrix(backPool, 2, backGuar);
    lastMatrix = { frontBets, backBets };

    const summaryHtml = `
        <span class="tag">前区 ${frontPool.length}选5 保${frontGuar} → <b>${frontBets.length}</b> 注</span>
        <span class="tag">后区 ${backPool.length}选2 保${backGuar} → <b>${backBets.length}</b> 注</span>`;
    renderMatrixResult(frontBets, backBets, summaryHtml);
}

// 生成复式投注（全组合展开）。frontN/backN 指定后，从已选号码中取前 N 个
function generateCompound(frontN, backN) {
    let frontPool = Array.from(frontSelected).sort((a, b) => a - b);
    let backPool = Array.from(backSelected).sort((a, b) => a - b);

    if (frontN) {
        if (frontPool.length < frontN) {
            matrixResultEl.innerHTML = `<p class="loading">⚠️ ${frontN}+5 方案需前区选 ${frontN} 个（当前 ${frontPool.length} 个），请继续选号</p>`;
            return;
        }
        frontPool = frontPool.slice(0, frontN);
    }
    if (backN) {
        if (backPool.length < backN) {
            matrixResultEl.innerHTML = `<p class="loading">⚠️ 该方案需后区选 ${backN} 个（当前 ${backPool.length} 个），请继续选号</p>`;
            return;
        }
        backPool = backPool.slice(0, backN);
    }

    if (frontPool.length < 5) {
        matrixResultEl.innerHTML = `<p class="loading">⚠️ 前区至少选 5 个（当前 ${frontPool.length} 个）</p>`;
        return;
    }
    if (backPool.length < 2) {
        matrixResultEl.innerHTML = `<p class="loading">⚠️ 后区至少选 2 个（当前 ${backPool.length} 个）</p>`;
        return;
    }

    const frontBets = combinations(frontPool, 5);
    const backBets = combinations(backPool, 2);
    lastMatrix = { frontBets, backBets };

    const scheme = frontN ? `${frontN}+${backN}` : `${frontPool.length}+${backPool.length}`;
    const summaryHtml = `
        <span class="tag">复式 ${scheme}：前区 ${frontPool.length}选5 = <b>${frontBets.length}</b> 注</span>
        <span class="tag">后区 ${backPool.length}选2 = <b>${backBets.length}</b> 注</span>`;
    const poolHtml = `<div class="recommend-pool">本方案号码：前区 ${frontPool.map(n => `<span class="pl front">${formatNumber(n, 2)}</span>`).join('')} ＋ 后区 ${backPool.map(n => `<span class="pl back">${formatNumber(n, 2)}</span>`).join('')}</div>`;
    renderMatrixResult(frontBets, backBets, summaryHtml, poolHtml);
}

// 复式方案：算法分析后给出一组 N+5 推荐号码（可复制），不展开全部组合
async function generateSchemePick(frontN, backN) {
    if (frontSelected.size < frontN || backSelected.size < backN) {
        matrixResultEl.innerHTML = `<p class="loading">🎲 正在用算法分析历史并选号...</p>`;
        await sleep(20);
        await pickNumbersCore();
    }
    const frontPool = Array.from(frontSelected).sort((a, b) => a - b).slice(0, frontN);
    const backPool = Array.from(backSelected).sort((a, b) => a - b).slice(0, backN);
    const frontStr = frontPool.map(n => formatNumber(n, 2)).join(' ');
    const backStr = backPool.map(n => formatNumber(n, 2)).join(' ');
    const copyText = `前区: ${frontStr}  后区: ${backStr}`;
    const totalComb = combinations(frontPool, 5).length * combinations(backPool, 2).length;
    const algoMatch = lastAlgoReport ? lastAlgoReport.match(/启用 <b>(\d+)<\/b>/) : null;
    const algoCount = algoMatch ? algoMatch[1] : 12;

    const frontBalls = frontPool.map(n => `<span class="pl front big">${formatNumber(n, 2)}</span>`).join('');
    const backBalls = backPool.map(n => `<span class="pl back big">${formatNumber(n, 2)}</span>`).join('');

    matrixResultEl.innerHTML = `
        <div class="scheme-pick">
            <div class="scheme-pick-title">🎯 算法推荐 ${frontN}+${backN} 复式组合</div>
            <div class="scheme-pick-balls">前区 ${frontBalls}<span class="sp-sep">＋</span>后区 ${backBalls}</div>
            <div class="scheme-pick-text">${copyText}</div>
            <button type="button" class="btn btn-primary copy-scheme-btn">📋 复制号码</button>
            <p class="rec-note">由 ${algoCount} 个算法融合分析历史开奖得出。该复式共 ${totalComb} 注，可直接作为一张 ${frontN}+${backN} 复式票投注。</p>
        </div>
    `;
    const btn = matrixResultEl.querySelector('.copy-scheme-btn');
    btn.addEventListener('click', () => {
        const done = () => { btn.textContent = '✅ 已复制'; setTimeout(() => { btn.textContent = '📋 复制号码'; }, 1500); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(copyText).then(done).catch(() => fallbackCopy(copyText, done));
        } else {
            fallbackCopy(copyText, done);
        }
    });
    testMatrixBtn.disabled = true;
}

// 降级复制
function fallbackCopy(text, cb) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); cb(); } catch (e) {}
    document.body.removeChild(ta);
}

// ====== 多算法智能选号系统 ======

let lastAlgoReport = null; // 最近的算法分析报告 HTML

// 算法配置区构建
function buildAlgoConfig() {
    const grid = document.getElementById('algoGrid');
    if (!grid || grid.childElementCount > 0) return;
    grid.innerHTML = ALGORITHMS.map(a => `
        <label class="algo-item" data-id="${a.id}">
            <input type="checkbox" class="algo-check" checked>
            <span class="algo-label">${a.name}<em>${a.desc}</em></span>
            <input type="number" class="algo-weight" value="${a.weight}" min="0" max="5" step="0.1" title="权重">
        </label>`).join('');
}

// 统计基础：频率与遗漏
function buildStats(history, max, field) {
    const freq = new Array(max + 1).fill(0);
    const miss = new Array(max + 1).fill(history.length);
    history.forEach((item, idx) => {
        (item[field] || []).forEach(n => {
            if (n >= 1 && n <= max) {
                freq[n]++;
                if (miss[n] === history.length) miss[n] = idx;
            }
        });
    });
    return { freq, miss };
}

// 各算法：返回长度 max+1 的分数数组(0-1)，索引=号码
function algoHot(st, max) {
    const mx = Math.max(...st.freq.slice(1)) || 1;
    const s = new Array(max + 1).fill(0);
    for (let n = 1; n <= max; n++) s[n] = st.freq[n] / mx;
    return s;
}
function algoMiss(st, max) {
    const mx = Math.max(...st.miss.slice(1)) || 1;
    const s = new Array(max + 1).fill(0);
    for (let n = 1; n <= max; n++) s[n] = st.miss[n] / mx;
    return s;
}
function algoRoad(history, max, field) {
    const c = [0, 0, 0];
    history.forEach(it => (it[field] || []).forEach(n => { if (n >= 1 && n <= max) c[n % 3]++; }));
    const tot = c[0] + c[1] + c[2] || 1;
    const r = c.map(x => x / tot);
    const s = new Array(max + 1).fill(0);
    for (let n = 1; n <= max; n++) s[n] = r[n % 3];
    return s;
}
function algoBigSmall(history, max, field, isBack) {
    const sm = isBack ? 6 : 17;
    let big = 0, small = 0;
    history.forEach(it => (it[field] || []).forEach(n => { if (n >= 1 && n <= max) { n <= sm ? small++ : big++; } }));
    const tot = big + small || 1;
    const br = big / tot;
    const s = new Array(max + 1).fill(0);
    for (let n = 1; n <= max; n++) s[n] = n <= sm ? (1 - br) : br;
    return s;
}
function algoOddEven(history, max, field) {
    let odd = 0, even = 0;
    history.forEach(it => (it[field] || []).forEach(n => { if (n >= 1 && n <= max) { n % 2 ? odd++ : even++; } }));
    const tot = odd + even || 1;
    const or = odd / tot;
    const s = new Array(max + 1).fill(0);
    for (let n = 1; n <= max; n++) s[n] = n % 2 ? or : (1 - or);
    return s;
}
function algoPrime(history, max, field) {
    const primes = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31].filter(p => p <= max));
    let p = 0, c = 0;
    history.forEach(it => (it[field] || []).forEach(n => { if (n >= 1 && n <= max) { primes.has(n) ? p++ : c++; } }));
    const tot = p + c || 1;
    const pr = p / tot;
    const s = new Array(max + 1).fill(0);
    for (let n = 1; n <= max; n++) s[n] = primes.has(n) ? pr : (1 - pr);
    return s;
}
function algoZone(history, max, field, isBack) {
    const zones = isBack ? 3 : 5;
    const size = isBack ? 4 : 7;
    const zc = new Array(zones).fill(0);
    history.forEach(it => (it[field] || []).forEach(n => { if (n >= 1 && n <= max) zc[Math.floor((n - 1) / size)]++; }));
    const tot = zc.reduce((a, b) => a + b, 0) || 1;
    const r = zc.map(x => x / tot);
    const s = new Array(max + 1).fill(0);
    for (let n = 1; n <= max; n++) s[n] = r[Math.floor((n - 1) / size)];
    return s;
}
function algoSum(history, max, field, pickCount) {
    const sums = history.map(h => (h[field] || []).reduce((a, b) => a + b, 0)).filter(x => x > 0);
    const avg = sums.length ? sums.reduce((a, b) => a + b, 0) / sums.length / pickCount : max / 2;
    const s = new Array(max + 1).fill(0);
    for (let n = 1; n <= max; n++) s[n] = Math.max(0, 1 - Math.abs(n - avg) / max);
    return s;
}
function algoRepeat(history, max, field) {
    if (history.length < 2) return new Array(max + 1).fill(0.5);
    let rs = 0;
    for (let i = 0; i < history.length - 1; i++) {
        const cur = new Set(history[i][field] || []);
        const prev = new Set(history[i + 1][field] || []);
        cur.forEach(n => { if (prev.has(n)) rs++; });
    }
    const pc = (history[0][field] || []).length || 5;
    const rate = rs / (history.length - 1) / pc; // 平均重号率
    const last = new Set(history[0][field] || []);
    const s = new Array(max + 1).fill(0);
    for (let n = 1; n <= max; n++) s[n] = last.has(n) ? Math.min(1, rate * 2.5) : (1 - rate);
    return s;
}
function algoBayes(st, max, history, pickCount) {
    const tot = history.length * pickCount;
    const alpha = 1;
    const s = new Array(max + 1).fill(0);
    for (let n = 1; n <= max; n++) s[n] = (st.freq[n] + alpha) / (tot + alpha * max) * max;
    return s;
}
function algoPair(history, max, field) {
    const pc = new Array(max + 1).fill(0);
    history.forEach(it => {
        const set = new Set(it[field] || []);
        for (let n = 1; n <= max; n++) {
            if (set.has(n) && ((n > 1 && set.has(n - 1)) || (n < max && set.has(n + 1)))) pc[n]++;
        }
    });
    const mx = Math.max(...pc.slice(1)) || 1;
    const s = new Array(max + 1).fill(0);
    for (let n = 1; n <= max; n++) s[n] = pc[n] / mx;
    return s;
}
function algoFib(max) {
    const fib = new Set();
    let a = 1, b = 2;
    while (a <= max) { fib.add(a); [a, b] = [b, a + b]; }
    const s = new Array(max + 1).fill(0.3);
    for (let n = 1; n <= max; n++) if (fib.has(n)) s[n] = 1;
    return s;
}

// 算法注册表
const ALGORITHMS = [
    { id: 'hot',      name: '热号频率',   desc: '近期出现频率归一化',     weight: 1.0, run: c => algoHot(c.stats, c.max) },
    { id: 'miss',     name: '遗漏回补',   desc: '遗漏越大回补期望越高',   weight: 1.0, run: c => algoMiss(c.stats, c.max) },
    { id: 'road',     name: '012路',      desc: 'mod3分路按历史占比',     weight: 1.0, run: c => algoRoad(c.history, c.max, c.field) },
    { id: 'bigsmall', name: '大小比',     desc: '大小号码分布偏向',       weight: 1.0, run: c => algoBigSmall(c.history, c.max, c.field, c.isBack) },
    { id: 'oddeven',  name: '奇偶比',     desc: '奇偶分布偏向',           weight: 1.0, run: c => algoOddEven(c.history, c.max, c.field) },
    { id: 'prime',    name: '质合比',     desc: '质数/合数分布偏向',      weight: 1.0, run: c => algoPrime(c.history, c.max, c.field) },
    { id: 'zone',     name: '区间分布',   desc: '分区均衡占比',           weight: 1.0, run: c => algoZone(c.history, c.max, c.field, c.isBack) },
    { id: 'sum',      name: '和值回归',   desc: '趋近历史平均和值均位',   weight: 1.0, run: c => algoSum(c.history, c.max, c.field, c.pickCount) },
    { id: 'repeat',   name: '重号分析',   desc: '与上期重复参考重号率',   weight: 0.8, run: c => algoRepeat(c.history, c.max, c.field) },
    { id: 'bayes',    name: '贝叶斯后验', desc: '拉普拉斯平滑后验',       weight: 1.0, run: c => algoBayes(c.stats, c.max, c.history, c.pickCount) },
    { id: 'pair',     name: '连号分析',   desc: '连号出现倾向',           weight: 0.5, run: c => algoPair(c.history, c.max, c.field) },
    { id: 'fib',      name: '斐波那契',   desc: '斐波那契位置加权(趣味)', weight: 0.3, run: c => algoFib(c.max) },
];

// 取分数前 k 的号码
function topN(scores, k, max) {
    const arr = [];
    for (let n = 1; n <= max; n++) arr.push({ n, s: scores[n] });
    arr.sort((a, b) => b.s - a.s);
    return arr.slice(0, k).map(x => x.n).sort((a, b) => a - b);
}

// 多算法加权融合选号
function fuseAndPick(ctx, count, enabled, weights) {
    const fused = new Array(ctx.max + 1).fill(0);
    let wsum = 0;
    const algoScores = [];
    ALGORITHMS.forEach(a => {
        if (!enabled[a.id]) return;
        const w = weights[a.id] || 0;
        if (w <= 0) return;
        const s = a.run(ctx);
        algoScores.push({ id: a.id, name: a.name, scores: s });
        for (let n = 1; n <= ctx.max; n++) fused[n] += s[n] * w;
        wsum += w;
    });
    if (wsum === 0) {
        const picked = generateNumbers({ count, min: 1, max: ctx.max, unique: true });
        return { picked, algoScores, fused };
    }
    for (let n = 1; n <= ctx.max; n++) fused[n] /= wsum;
    const nums = [];
    for (let n = 1; n <= ctx.max; n++) nums.push({ n, score: fused[n] });
    nums.sort((a, b) => b.score - a.score);
    const picked = nums.slice(0, count).map(x => x.n).sort((a, b) => a - b);
    return { picked, algoScores, fused };
}

// 构建算法分析报告 HTML
function buildAlgoReport(historyLen, fr, br) {
    const frontPool = fr.picked.map(n => `<span class="pl front">${formatNumber(n, 2)}</span>`).join('');
    const backPool = br.picked.map(n => `<span class="pl back">${formatNumber(n, 2)}</span>`).join('');
    const frontTags = fr.algoScores.map(a => {
        const top = topN(a.scores, 5, 35);
        return `<div class="algo-row"><span class="algo-name">${a.name}</span>${top.map(n => `<span class="pl front">${formatNumber(n, 2)}</span>`).join('')}</div>`;
    }).join('');
    const backTags = br.algoScores.map(a => {
        const top = topN(a.scores, 3, 12);
        return `<div class="algo-row"><span class="algo-name">${a.name}</span>${top.map(n => `<span class="pl back">${formatNumber(n, 2)}</span>`).join('')}</div>`;
    }).join('');
    return `
        <div class="algo-report">
            <div class="algo-info">📊 基于 <b>${historyLen}</b> 期历史，启用 <b>${fr.algoScores.length}</b> 个算法加权融合选号</div>
            <div class="algo-pool">融合选号池：前区 ${frontPool} ＋ 后区 ${backPool}</div>
            <details class="algo-details"><summary>查看各算法独立推荐（前区Top5 / 后区Top3）</summary>
                <div class="algo-section"><h4>前区</h4>${frontTags}</div>
                <div class="algo-section"><h4>后区</h4>${backTags}</div>
            </details>
        </div>`;
}

// 智能选号：多算法融合分析历史开奖，选出号码池并自动接智能推荐
// 选号核心：执行多算法融合选号，不接智能推荐。返回是否成功
async function pickNumbersCore() {
    buildAlgoConfig();
    let history;
    try {
        const resp = await fetch('data/latest.json?t=' + Date.now());
        const data = await resp.json();
        history = (data.history || []).filter(h => h.front && h.back);
    } catch (e) { history = []; }

    const enabled = {}, weights = {};
    document.querySelectorAll('.algo-item').forEach(el => {
        const id = el.dataset.id;
        enabled[id] = el.querySelector('.algo-check').checked;
        const w = parseFloat(el.querySelector('.algo-weight').value);
        weights[id] = isNaN(w) ? 0 : w;
    });

    if (history.length < 5) {
        pickRandomPool();
        lastAlgoReport = null;
        initMatrixPools();
        return false;
    }

    const frontCtx = { stats: buildStats(history, 35, 'front'), history, max: 35, field: 'front', pickCount: 5, isBack: false };
    const backCtx  = { stats: buildStats(history, 12, 'back'),  history, max: 12, field: 'back',  pickCount: 2, isBack: true  };

    const fr = fuseAndPick(frontCtx, 12, enabled, weights);
    const br = fuseAndPick(backCtx, 5, enabled, weights);
    frontSelected = new Set(fr.picked);
    backSelected = new Set(br.picked);
    initMatrixPools();
    lastAlgoReport = buildAlgoReport(history.length, fr, br);
    return true;
}

// 智能选号：选号 + 算法报告 + 自动接智能推荐
async function smartPickNumbers() {
    matrixResultEl.innerHTML = `<p class="loading">🎲 正在用多算法融合分析历史开奖...</p>`;
    await sleep(20);
    const ok = await pickNumbersCore();
    if (!ok) {
        matrixResultEl.innerHTML = `<p class="loading">⚠️ 历史数据不足，已随机选号。建议先运行爬虫获取数据。</p>`;
    } else {
        matrixResultEl.innerHTML = lastAlgoReport;
    }
    await sleep(20);
    await smartRecommend();
}

// 清除算法报告（切换彩种/清空选择时调用）
function clearAlgoReport() {
    lastAlgoReport = null;
}

// 数据不足时随机选号池
function pickRandomPool() {
    frontSelected = new Set(generateNumbers({ count: 12, min: 1, max: 35, unique: true }));
    backSelected = new Set(generateNumbers({ count: 5, min: 1, max: 12, unique: true }));
}

// 智能推荐：自动枚举多种"复式规模+旋转矩阵保级"方案，模拟开奖评估，选性价比最佳并展开
async function smartRecommend() {
    const frontPool = Array.from(frontSelected).sort((a, b) => a - b);
    const backPool = Array.from(backSelected).sort((a, b) => a - b);

    if (frontPool.length < 7 || frontPool.length > 15) {
        matrixResultEl.innerHTML = `<p class="loading">⚠️ 智能推荐需前区选 7-15 个（当前 ${frontPool.length} 个）</p>`;
        return;
    }
    if (backPool.length < 3 || backPool.length > 6) {
        matrixResultEl.innerHTML = `<p class="loading">⚠️ 智能推荐需后区选 3-6 个（当前 ${backPool.length} 个）</p>`;
        return;
    }

    matrixResultEl.innerHTML = `<p class="loading">🤖 正在枚举方案并模拟开奖评估，请稍候...</p>`;
    await sleep(30);

    // 候选方案：不同前区规模 × (旋转矩阵保4 / 复式保5)
    const frontSizes = [7, 8, 9, 10, 12, 15].filter(s => s <= frontPool.length);
    const candidates = [];
    frontSizes.forEach(fs => {
        const fp = frontPool.slice(0, fs);
        candidates.push({ name: `${fs}+${backPool.length}`, frontPool: fp, backPool, frontGuar: 4, backGuar: 1, type: '旋转矩阵' });
        candidates.push({ name: `${fs}+${backPool.length}`, frontPool: fp, backPool, frontGuar: 5, backGuar: 2, type: '复式' });
    });

    const SIM = 50;
    const results = [];
    for (const c of candidates) {
        const frontBets = rotationMatrix(c.frontPool, 5, c.frontGuar);
        const backBets = rotationMatrix(c.backPool, 2, c.backGuar);
        const total = frontBets.length * backBets.length;
        // 蒙特卡洛：每期取所有注中最佳命中（前区命中×2 + 后区命中）
        let sumBest = 0;
        for (let i = 0; i < SIM; i++) {
            const df = generateNumbers({ count: 5, min: 1, max: 35, unique: true });
            const db = generateNumbers({ count: 2, min: 1, max: 12, unique: true });
            let best = -1;
            for (const fb of frontBets) {
                const fh = fb.filter(n => df.includes(n)).length;
                for (const bb of backBets) {
                    const bh = bb.filter(n => db.includes(n)).length;
                    const sc = fh * 2 + bh;
                    if (sc > best) best = sc;
                }
            }
            sumBest += best;
        }
        const avgHit = sumBest / SIM;
        const costEff = avgHit / Math.log2(total + 1); // 性价比：单位对数注数的命中贡献
        results.push({ ...c, frontBets, backBets, total, avgHit, costEff });
        await sleep(0); // 让出主线程，避免 UI 冻结
    }

    // 按性价比降序，自动选中最佳
    results.sort((a, b) => b.costEff - a.costEff);
    const best = results[0];
    lastMatrix = { frontBets: best.frontBets, backBets: best.backBets };

    const rows = results.map(r => `
        <tr class="${r === best ? 'rec-best-row' : ''}">
            <td>${r.name}</td><td>${r.type}</td><td>${r.total}</td>
            <td>${r.avgHit.toFixed(2)}</td><td>${r.costEff.toFixed(3)}</td>
        </tr>`).join('');

    matrixResultEl.innerHTML = `
        ${lastAlgoReport || ''}
        <div class="recommend-report">
            <div class="recommend-best">🤖 最佳推荐：<b>${best.name} ${best.type}</b> · 共 <b>${best.total}</b> 注 · 平均最高命中 <b>${best.avgHit.toFixed(2)}</b> · 性价比 <b>${best.costEff.toFixed(3)}</b></div>
            <div class="recommend-pool">备选号码池：前区 ${frontPool.map(n => `<span class="pl front">${formatNumber(n, 2)}</span>`).join('')} ＋ 后区 ${backPool.map(n => `<span class="pl back">${formatNumber(n, 2)}</span>`).join('')}</div>
            <table class="recommend-table">
                <thead><tr><th>方案</th><th>类型</th><th>注数</th><th>平均命中</th><th>性价比</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <p class="rec-note">已自动模拟 ${SIM} 期开奖并选中性价比最高方案。平均命中＝每期所有注中最佳一注的（前区命中×2＋后区命中）均值；性价比＝平均命中 ÷ log₂(注数+1)，越高表示花越少注数换来越高命中潜力。</p>
        </div>
        ${best.total > DISPLAY_LIMIT ? `<p class="loading">⚠️ 注数较多，仅展示前 ${DISPLAY_LIMIT} 注（共 ${best.total} 注）</p>` : ''}
        <div class="matrix-bets"></div>
    `;
    fillBetsBox(matrixResultEl.querySelector('.matrix-bets'), best.frontBets, best.backBets);
    testMatrixBtn.disabled = false;
}

// 模拟验证：随机模拟开奖，高亮命中最多的一注
function testMatrix() {
    if (!lastMatrix) return;
    const drawFront = generateNumbers({ count: 5, min: 1, max: 35, unique: true });
    const drawBack = generateNumbers({ count: 2, min: 1, max: 12, unique: true });

    let bestIdx = -1, bestFrontHit = -1, bestBackHit = -1, bestTotal = -1;
    const rows = matrixResultEl.querySelectorAll('.m-bet');
    let idx = 0;
    lastMatrix.frontBets.forEach(fb => {
        lastMatrix.backBets.forEach(bb => {
            const fh = fb.filter(n => drawFront.includes(n)).length;
            const bh = bb.filter(n => drawBack.includes(n)).length;
            const total = fh + bh;
            if (total > bestTotal) {
                bestTotal = total; bestIdx = idx; bestFrontHit = fh; bestBackHit = bh;
            }
            idx++;
        });
    });

    rows.forEach((r, i) => r.classList.toggle('best', i === bestIdx));

    const drawFrontHtml = drawFront.map(n => `<span class="m-num front">${formatNumber(n, 2)}</span>`).join('');
    const drawBackHtml = drawBack.map(n => `<span class="m-num back">${formatNumber(n, 2)}</span>`).join('');
    const hint = document.querySelector('.matrix-verify') || (() => {
        const d = document.createElement('div');
        d.className = 'matrix-verify';
        matrixResultEl.insertBefore(d, matrixResultEl.firstChild);
        return d;
    })();
    hint.innerHTML = `🧪 模拟开奖：<span class="m-draw">${drawFrontHtml} ＋ ${drawBackHtml}</span> → 最佳第 ${bestIdx + 1} 注：前区中 <b>${bestFrontHit}</b>，后区中 <b>${bestBackHit}</b>`;
}

// 清空选择
function clearMatrix() {
    frontSelected.clear();
    backSelected.clear();
    clearAlgoReport();
    initMatrixPools();
    matrixResultEl.innerHTML = `<p class="loading">请在上方选择备选号码，然后点击「生成」</p>`;
    testMatrixBtn.disabled = true;
    lastMatrix = null;
}

// 切换投注模式
function switchMatrixMode(mode) {
    matrixMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    const isCompound = mode === 'compound';
    document.getElementById('compoundSchemes').style.display = isCompound ? '' : 'none';
    document.querySelectorAll('.guar-row').forEach(r => r.style.display = isCompound ? 'none' : '');
    genMatrixBtn.textContent = isCompound ? '⚡ 生成复式' : '⚡ 生成';
}

// 矩阵面板展开/收起
matrixBtn.addEventListener('click', () => {
    const open = matrixPanel.style.display !== 'none';
    matrixPanel.style.display = open ? 'none' : '';
    if (!open) { initMatrixPools(); buildAlgoConfig(); }
});
document.querySelectorAll('.mode-btn').forEach(b => {
    b.addEventListener('click', () => switchMatrixMode(b.dataset.mode));
});
document.querySelectorAll('.scheme-btn').forEach(b => {
    b.addEventListener('click', () => generateSchemePick(parseInt(b.dataset.f, 10), 5));
});
autoPickBtn.addEventListener('click', smartPickNumbers);
smartBtn.addEventListener('click', smartRecommend);
genMatrixBtn.addEventListener('click', () => {
    if (matrixMode === 'compound') generateCompound();
    else generateMatrix();
});
testMatrixBtn.addEventListener('click', testMatrix);
clearMatrixBtn.addEventListener('click', clearMatrix);

// ====== 排列三 5×5×5 复式直选算法 ======

const PL3_ALGORITHMS = [
    { id: 'road',   name: '012路均衡(修正)', desc: '路内数字归一化占比',  weight: 1.0 },
    { id: 'big',    name: '大小均衡',        desc: '0-4小/5-9大占比',     weight: 1.0 },
    { id: 'odd',    name: '奇偶均衡',        desc: '奇偶占比',            weight: 1.0 },
    { id: 'repeat', name: '重号分析',        desc: '与上期该位重复参考',  weight: 0.8 },
    { id: 'hot',    name: '位频率',          desc: '该位高频数字优先',     weight: 0.6 },
    { id: 'miss',   name: '位遗漏(弱)',      desc: '该位遗漏(弱参考)',    weight: 0.2 },
];

// 构建排列三算法配置
function buildPl3AlgoConfig() {
    const grid = document.getElementById('pl3AlgoGrid');
    if (!grid || grid.childElementCount > 0) return;
    grid.innerHTML = PL3_ALGORITHMS.map(a => `
        <label class="algo-item" data-id="${a.id}">
            <input type="checkbox" class="algo-check" checked>
            <span class="algo-label">${a.name}<em>${a.desc}</em></span>
            <input type="number" class="algo-weight" value="${a.weight}" min="0" max="5" step="0.1" title="权重">
        </label>`).join('');
}

// 位统计：每位 0-9 的频率与遗漏
function buildPl3Stats(history) {
    const freq = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
    const miss = [new Array(10).fill(history.length), new Array(10).fill(history.length), new Array(10).fill(history.length)];
    history.forEach((item, idx) => {
        const nums = item.num || [];
        for (let pos = 0; pos < 3; pos++) {
            const d = nums[pos];
            if (d != null && d >= 0 && d <= 9) {
                freq[pos][d]++;
                if (miss[pos][d] === history.length) miss[pos][d] = idx;
            }
        }
    });
    return { freq, miss };
}

// 位算法：返回该位 0-9 分数数组(长度10)
function pl3AlgoHot(freq, pos) {
    const mx = Math.max(...freq[pos]) || 1;
    const s = new Array(10).fill(0);
    for (let d = 0; d <= 9; d++) s[d] = freq[pos][d] / mx;
    return s;
}
function pl3AlgoMiss(miss, pos) {
    const mx = Math.max(...miss[pos]) || 1;
    const s = new Array(10).fill(0);
    for (let d = 0; d <= 9; d++) s[d] = miss[pos][d] / mx;
    return s;
}
// 012路均衡(修正)：按路内数字数量归一化，避免0路(4个数字)虚高
function pl3AlgoRoad(history, pos) {
    const roadSize = [4, 3, 3]; // 0路:0,3,6,9  1路:1,4,7  2路:2,5,8
    const c = [0, 0, 0];
    history.forEach(it => { const d = (it.num || [])[pos]; if (d != null && d >= 0 && d <= 9) c[d % 3]++; });
    const norm = c.map((cnt, r) => cnt / (roadSize[r] * history.length)); // 每数字平均频率
    const mx = Math.max(...norm) || 1;
    const r = norm.map(x => x / mx);
    const s = new Array(10).fill(0);
    for (let d = 0; d <= 9; d++) s[d] = r[d % 3];
    return s;
}
function pl3AlgoBig(history, pos) {
    let big = 0, small = 0;
    history.forEach(it => { const d = (it.num || [])[pos]; if (d != null && d >= 0 && d <= 9) { d >= 5 ? big++ : small++; } });
    const tot = big + small || 1;
    const br = big / tot;
    const s = new Array(10).fill(0);
    for (let d = 0; d <= 9; d++) s[d] = d >= 5 ? br : (1 - br);
    return s;
}
function pl3AlgoOdd(history, pos) {
    let odd = 0, even = 0;
    history.forEach(it => { const d = (it.num || [])[pos]; if (d != null && d >= 0 && d <= 9) { d % 2 ? odd++ : even++; } });
    const tot = odd + even || 1;
    const or = odd / tot;
    const s = new Array(10).fill(0);
    for (let d = 0; d <= 9; d++) s[d] = d % 2 ? or : (1 - or);
    return s;
}
// 重号分析：与上期该位重复参考历史重号率
function pl3AlgoRepeat(history, pos) {
    if (history.length < 2) return new Array(10).fill(0.5);
    let repeatCnt = 0;
    for (let i = 0; i < history.length - 1; i++) {
        const cur = (history[i].num || [])[pos];
        const prev = (history[i + 1].num || [])[pos];
        if (cur != null && prev != null && cur === prev) repeatCnt++;
    }
    const rate = repeatCnt / (history.length - 1);
    const last = (history[0].num || [])[pos];
    const boost = Math.min(1, rate * 4);
    const s = new Array(10).fill((1 - boost) / 9);
    if (last != null && last >= 0 && last <= 9) s[last] = boost;
    return s;
}

// 每位融合打分，返回 topK 候选(已排序)
function pl3FusePick(pos, stats, history, enabled, weights, topK) {
    const fused = new Array(10).fill(0);
    let wsum = 0;
    const runners = {
        hot: () => pl3AlgoHot(stats.freq, pos),
        miss: () => pl3AlgoMiss(stats.miss, pos),
        road: () => pl3AlgoRoad(history, pos),
        big: () => pl3AlgoBig(history, pos),
        odd: () => pl3AlgoOdd(history, pos),
        repeat: () => pl3AlgoRepeat(history, pos),
    };
    PL3_ALGORITHMS.forEach(a => {
        if (!enabled[a.id]) return;
        const w = weights[a.id] || 0;
        if (w <= 0) return;
        const s = runners[a.id]();
        for (let d = 0; d <= 9; d++) fused[d] += s[d] * w;
        wsum += w;
    });
    if (wsum === 0) {
        const r = generateNumbers({ count: topK || 8, min: 0, max: 9, unique: true });
        return r.sort((a, b) => a - b);
    }
    for (let d = 0; d <= 9; d++) fused[d] /= wsum;
    const arr = [];
    for (let d = 0; d <= 9; d++) arr.push({ d, s: fused[d] });
    arr.sort((a, b) => b.s - a.s);
    return arr.slice(0, topK || 8).map(x => x.d).sort((a, b) => a - b);
}

// 历史组合级统计：和值分布、和值均值、跨度均值、形态比例
function pl3HistStats(history) {
    const sumDist = new Array(28).fill(0);
    let spanSum = 0, rawSum = 0, zu3 = 0, zu6 = 0, bao = 0;
    // 每位 0-9 频率，用于计算 top5 高频号
    const posFreq = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
    history.forEach(it => {
        const n = it.num || [];
        if (n.length === 3) {
            const s = n[0] + n[1] + n[2];
            const sp = Math.max(...n) - Math.min(...n);
            sumDist[s]++;
            spanSum += sp;
            rawSum += s;
            if (n[0] === n[1] && n[1] === n[2]) bao++;
            else if (n[0] === n[1] || n[1] === n[2] || n[0] === n[2]) zu3++;
            else zu6++;
            for (let p = 0; p < 3; p++) posFreq[p][n[p]]++;
        }
    });
    const tot = history.length || 1;
    // 每位 top5 高频数字
    const posTop5 = posFreq.map(freq => {
        const arr = [];
        for (let d = 0; d <= 9; d++) arr.push({ d, f: freq[d] });
        arr.sort((a, b) => b.f - a.f);
        return arr.slice(0, 5).map(x => x.d);
    });
    // 每位历史大号占比
    const posBigRatio = posFreq.map(freq => {
        let big = 0, all = 0;
        for (let d = 0; d <= 9; d++) { all += freq[d]; if (d >= 5) big += freq[d]; }
        return all ? big / all : 0.5;
    });
    return {
        sumDist: sumDist.map(x => x / tot),
        sumAvg: rawSum / tot,
        spanAvg: spanSum / tot,
        form: { zu6: zu6 / tot, zu3: zu3 / tot, bao: bao / tot },
        posTop5, posBigRatio
    };
}

// 组合级评分：覆盖率(直接关系命中率) + 和值/跨度/形态 + 强制去重
function pl3ComboScore(bai, shi, ge, hist) {
    const sumDist = new Array(28).fill(0);
    let spanSum = 0, zu3 = 0, zu6 = 0, bao = 0;
    bai.forEach(a => shi.forEach(b => ge.forEach(c => {
        const sum = a + b + c;
        const span = Math.max(a, b, c) - Math.min(a, b, c);
        sumDist[sum]++;
        spanSum += span;
        if (a === b && b === c) bao++;
        else if (a === b || b === c || a === c) zu3++;
        else zu6++;
    })));
    let sumHit = 0;
    for (let s = 0; s <= 27; s++) if (hist.sumDist[s] >= 0.03) sumHit += sumDist[s];
    const sumScore = sumHit / 125;
    const spanAvg = spanSum / 125;
    const spanScore = Math.max(0, 1 - Math.abs(spanAvg - hist.spanAvg) / 5);
    const f6 = zu6 / 125, f3 = zu3 / 125, fb = bao / 125;
    const formScore = Math.max(0, 1 - (Math.abs(f6 - hist.form.zu6) + Math.abs(f3 - hist.form.zu3) + Math.abs(fb - hist.form.bao)) / 2);
    // 位覆盖率：每位5个数字覆盖历史top5高频号的比例（直接关系命中率，主导）
    const covBai = hist.posTop5[0].filter(d => bai.includes(d)).length / 5;
    const covShi = hist.posTop5[1].filter(d => shi.includes(d)).length / 5;
    const covGe = hist.posTop5[2].filter(d => ge.includes(d)).length / 5;
    const coverageScore = (covBai + covShi + covGe) / 3;
    const uniqBai = new Set(bai).size, uniqShi = new Set(shi).size, uniqGe = new Set(ge).size;
    const uniqPenalty = ((5 - uniqBai) + (5 - uniqShi) + (5 - uniqGe)) * 1.0;
    return {
        total: coverageScore * 0.35 + sumScore * 0.25 + spanScore * 0.2 + formScore * 0.2 - uniqPenalty,
        coverageScore, sumScore, spanScore, formScore
    };
}

// 组合级贪心优化：仅替换 cur 中每位尚未覆盖的候选，且强制每位 5 个互不相同
function pl3Optimize(bai, shi, ge, candidates, hist) {
    const cur = [bai.slice(), shi.slice(), ge.slice()];
    let best = pl3ComboScore(cur[0], cur[1], cur[2], hist);
    let improved = true, rounds = 0;
    while (improved && rounds < 20) {
        improved = false; rounds++;
        for (let pos = 0; pos < 3; pos++) {
            const bench = candidates[pos].filter(d => !cur[pos].includes(d));
            for (let i = 0; i < cur[pos].length; i++) {
                const orig = cur[pos][i];
                if (cur[pos].filter(x => x === orig).length > 1) {
                    // 已有重复时强制换出
                    for (const d of bench) {
                        cur[pos][i] = d;
                        if (new Set(cur[pos]).size === cur[pos].length) {
                            improved = true; break;
                        }
                        cur[pos][i] = orig;
                    }
                    continue;
                }
                for (const d of bench) {
                    cur[pos][i] = d;
                    if (new Set(cur[pos]).size !== cur[pos].length) { cur[pos][i] = orig; continue; }
                    const sc = pl3ComboScore(cur[0], cur[1], cur[2], hist);
                    if (sc.total > best.total + 0.0005) {
                        best = sc; improved = true;
                        break;
                    } else {
                        cur[pos][i] = orig;
                    }
                }
            }
        }
    }
    return {
        bai: cur[0].slice().sort((a, b) => a - b),
        shi: cur[1].slice().sort((a, b) => a - b),
        ge: cur[2].slice().sort((a, b) => a - b),
        score: best
    };
}

// 125 注形态分析
function pl3Analyze(bai, shi, ge) {
    let zu3 = 0, zu6 = 0, bao = 0;
    let sumMin = 27, sumMax = 0, spanMin = 9, spanMax = 0;
    bai.forEach(a => shi.forEach(b => ge.forEach(c => {
        const sum = a + b + c;
        const span = Math.max(a, b, c) - Math.min(a, b, c);
        if (a === b && b === c) bao++;
        else if (a === b || b === c || a === c) zu3++;
        else zu6++;
        if (sum < sumMin) sumMin = sum;
        if (sum > sumMax) sumMax = sum;
        if (span < spanMin) spanMin = span;
        if (span > spanMax) spanMax = span;
    })));
    return { total: 125, zu3, zu6, bao, sumMin, sumMax, spanMin, spanMax };
}

// 每位 5 个数字的分布
function pl3Dist(arr) {
    const road = [0, 0, 0];
    let big = 0, odd = 0;
    arr.forEach(d => { road[d % 3]++; if (d >= 5) big++; if (d % 2) odd++; });
    return { road: road.join('/'), big, small: arr.length - big, odd, even: arr.length - odd };
}

// 排列三智能选号：层1每位打分选候选 + 层2组合级优化
async function pl3Pick() {
    const resultEl = document.getElementById('pl3Result');
    buildPl3AlgoConfig();
    const enabled = {}, weights = {};
    document.querySelectorAll('#pl3AlgoGrid .algo-item').forEach(el => {
        const id = el.dataset.id;
        enabled[id] = el.querySelector('.algo-check').checked;
        const w = parseFloat(el.querySelector('.algo-weight').value);
        weights[id] = isNaN(w) ? 0 : w;
    });

    resultEl.innerHTML = `<p class="loading">🎲 正在分析历史并优化组合(和值/跨度/形态)...</p>`;
    await sleep(20);

    let history;
    try {
        const resp = await fetch('data/pl3.json?t=' + Date.now());
        const data = await resp.json();
        history = (data.history || []).filter(h => h.num && h.num.length === 3);
    } catch (e) { history = []; }

    if (history.length < 5) {
        resultEl.innerHTML = `<p class="loading">⚠️ 历史数据不足（仅 ${history.length} 期），建议先运行爬虫获取数据。</p>`;
        return;
    }

    const stats = buildPl3Stats(history);
    const hist = pl3HistStats(history);

    // 层1：每位打分取 top8 候选
    const candBai = pl3FusePick(0, stats, history, enabled, weights, 8);
    const candShi = pl3FusePick(1, stats, history, enabled, weights, 8);
    const candGe = pl3FusePick(2, stats, history, enabled, weights, 8);

    // 层2：组合级贪心优化，从 top8 中选最优 top5
    const opt = pl3Optimize(candBai.slice(0, 5), candShi.slice(0, 5), candGe.slice(0, 5), [candBai, candShi, candGe], hist);
    const bai = opt.bai, shi = opt.shi, ge = opt.ge;
    lastPl3Pick = { bai: bai.slice(), shi: shi.slice(), ge: ge.slice() };
    const an = pl3Analyze(bai, shi, ge);
    console.log('%c[PL3 智能选号]', 'color:#43e97b;font-weight:bold');
    console.log('  候选池 百位:', candBai, '十位:', candShi, '个位:', candGe);
    console.log('  最终推荐 百位:', bai, '十位:', shi, '个位:', ge);
    console.log('  组合级评分:', opt.score);
    console.log('  历史每位top5:', hist.posTop5);
    console.log('  形态:', an);
    const sc = opt.score;

    const baiBalls = bai.map(d => `<span class="pl3-num">${d}</span>`).join('');
    const shiBalls = shi.map(d => `<span class="pl3-num">${d}</span>`).join('');
    const geBalls = ge.map(d => `<span class="pl3-num">${d}</span>`).join('');
    const copyText = `百位: ${bai.join(' ')}  十位: ${shi.join(' ')}  个位: ${ge.join(' ')}`;
    const bd = pl3Dist(bai), sd = pl3Dist(shi), gd = pl3Dist(ge);

    resultEl.innerHTML = `
        <div class="scheme-pick">
            <div class="scheme-pick-title">🎯 排列三 5×5×5 复式直选推荐</div>
            <div class="pl3-positions">
                <div class="pl3-pos"><span class="pos-label">百位</span>${baiBalls}</div>
                <div class="pl3-pos"><span class="pos-label">十位</span>${shiBalls}</div>
                <div class="pl3-pos"><span class="pos-label">个位</span>${geBalls}</div>
            </div>
            <div class="scheme-pick-text">${copyText}</div>
            <button type="button" class="btn btn-primary copy-pl3-btn">📋 复制号码</button>
            <div class="pl3-analysis">
                <div>📊 共 <b>${an.total}</b> 注 · 和值 <b>${an.sumMin}~${an.sumMax}</b> · 跨度 <b>${an.spanMin}~${an.spanMax}</b></div>
                <div class="pl3-form">形态：组六(三不同) <b>${an.zu6}</b> 注 · 组三(两同) <b>${an.zu3}</b> 注 · 豹子(三同) <b>${an.bao}</b> 注</div>
                <div class="pl3-combo">🎯 组合级贴合度：<b>${(sc.total * 100).toFixed(1)}%</b>（和值 ${(sc.sumScore * 100).toFixed(0)}% · 跨度 ${(sc.spanScore * 100).toFixed(0)}% · 形态 ${(sc.formScore * 100).toFixed(0)}%）</div>
                <div class="pl3-balance">
                    <span class="pos-balance">百位：012路 ${bd.road} · 大小 ${bd.big}:${bd.small} · 奇偶 ${bd.odd}:${bd.even}</span>
                    <span class="pos-balance">十位：012路 ${sd.road} · 大小 ${sd.big}:${sd.small} · 奇偶 ${sd.odd}:${sd.even}</span>
                    <span class="pos-balance">个位：012路 ${gd.road} · 大小 ${gd.big}:${gd.small} · 奇偶 ${gd.odd}:${gd.even}</span>
                </div>
                <div class="pl3-balance" style="margin-top:6px;font-size:0.72rem;color:rgba(255,255,255,0.45)">历史参考：和值均值 <b>${hist.sumAvg.toFixed(1)}</b> · 跨度均值 <b>${hist.spanAvg.toFixed(1)}</b> · 形态 组六${(hist.form.zu6 * 100).toFixed(0)}%/组三${(hist.form.zu3 * 100).toFixed(0)}%/豹子${(hist.form.bao * 100).toFixed(0)}%</div>
            </div>
        </div>
    `;

    const btn = resultEl.querySelector('.copy-pl3-btn');
    btn.addEventListener('click', () => {
        const done = () => { btn.textContent = '✅ 已复制'; setTimeout(() => { btn.textContent = '📋 复制号码'; }, 1500); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(copyText).then(done).catch(() => fallbackCopy(copyText, done));
        } else {
            fallbackCopy(copyText, done);
        }
    });
}

// 排列三回测：当前推荐号码（智能选号的输出） vs 最近 N 期开奖
let lastPl3Pick = null; // 保存最近一次智能选号的号码

async function pl3Backtest() {
    const resultEl = document.getElementById('pl3Result');
    if (!lastPl3Pick) {
        resultEl.innerHTML = `<p class="loading">⚠️ 请先点击「智能选号」生成 5×5×5 号码，再点回测验证该号码在历史中的命中情况。</p>`;
        return;
    }

    resultEl.innerHTML = `<p class="loading">🔬 正在用当前推荐号码比对最近历史...</p>`;
    await sleep(20);

    let history;
    try {
        const resp = await fetch('data/pl3.json?t=' + Date.now());
        const data = await resp.json();
        history = (data.history || []).filter(h => h.num && h.num.length === 3);
    } catch (e) { history = []; }

    if (history.length < 1) {
        resultEl.innerHTML = `<p class="loading">⚠️ 历史数据为空</p>`;
        return;
    }

    const maxBack = Math.min(history.length, 20);
    let hit = 0, tested = 0;
    const results = [];

    console.log('%c[PL3 回测] 用推荐号码验证最近 ' + maxBack + ' 期', 'color:#43e97b;font-weight:bold');
    console.log('  推荐号码 百位:', lastPl3Pick.bai, '十位:', lastPl3Pick.shi, '个位:', lastPl3Pick.ge);
    for (let i = 0; i < maxBack; i++) {
        const draw = history[i].num;
        const isHit = lastPl3Pick.bai.includes(draw[0]) && lastPl3Pick.shi.includes(draw[1]) && lastPl3Pick.ge.includes(draw[2]);
        if (isHit) hit++;
        tested++;
        results.push({ period: history[i].period, date: history[i].date, draw, hit: isHit });
        console.log(`  ${history[i].period} (${history[i].date}) 开奖 ${draw.join('')} ${isHit ? '✅命中' : '✗'}  累计 ${hit}/${tested}`);
    }
    console.log(`%c[PL3 回测] 完成: ${hit}/${tested} 命中, 命中率 ${tested ? (hit / tested * 100).toFixed(1) : 0}%`, 'color:#43e97b;font-weight:bold');

    const rate = tested ? (hit / tested * 100) : 0;
    const theory = 12.5;
    const diff = rate - theory;

    const baiCells = lastPl3Pick.bai.map(d => `<span class="bt-num">${d}</span>`).join('');
    const shiCells = lastPl3Pick.shi.map(d => `<span class="bt-num">${d}</span>`).join('');
    const geCells = lastPl3Pick.ge.map(d => `<span class="bt-num">${d}</span>`).join('');

    const rows = results.map(r => {
        const drawCells = r.draw.map(d => `<span class="bt-num bt-draw">${d}</span>`).join('');
        return `
            <tr class="${r.hit ? 'bt-hit' : 'bt-miss'}">
                <td>${r.period}</td>
                <td>${r.date}</td>
                <td>${drawCells}</td>
                <td>${r.hit ? '✅ 命中' : '✗'}</td>
            </tr>`;
    }).join('');

    resultEl.innerHTML = `
        <div class="backtest-report">
            <div class="bt-summary">
                <div class="bt-rate">当前推荐 <b>${hit}</b>/<b>${tested}</b> 期命中 · 命中率 <b>${rate.toFixed(1)}%</b></div>
                <div class="bt-theory">理论命中率 12.5% · ${diff >= 0 ? '超越 +' : '低于 '}${Math.abs(diff).toFixed(1)} 个百分点</div>
            </div>
            <div class="pl3-positions" style="margin-bottom:14px;padding:10px;background:rgba(255,255,255,0.03);border-radius:8px">
                <div class="pl3-pos"><span class="pos-label">百位</span>${baiCells}</div>
                <div class="pl3-pos"><span class="pos-label">十位</span>${shiCells}</div>
                <div class="pl3-pos"><span class="pos-label">个位</span>${geCells}</div>
            </div>
            <table class="backtest-table">
                <thead><tr><th>期号</th><th>日期</th><th>开奖</th><th>结果</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <p class="rec-note">回测方法：直接用「智能选号」生成的 5×5×5 复式号码，验证它在最近 ${tested} 期历史中能命中多少期。命中 = 开奖号三位均落在对应位的 5 个候选内。理论命中率 = (5/10)³ = 12.5%。</p>
        </div>
    `;
}

// 排列三面板事件
const pl3Btn = document.getElementById('pl3Btn');
const pl3PickBtn = document.getElementById('pl3PickBtn');
const pl3ClearBtn = document.getElementById('pl3ClearBtn');
pl3Btn.addEventListener('click', () => {
    const panel = document.getElementById('pl3Panel');
    const open = panel.style.display !== 'none';
    panel.style.display = open ? 'none' : '';
    if (!open) buildPl3AlgoConfig();
});
pl3PickBtn.addEventListener('click', pl3Pick);
const pl3BacktestBtn = document.getElementById('pl3BacktestBtn');
pl3BacktestBtn.addEventListener('click', pl3Backtest);
pl3ClearBtn.addEventListener('click', () => {
    document.getElementById('pl3Result').innerHTML = `<p class="loading">点击「智能选号」生成 5×5×5 复式推荐</p>`;
});

// 事件绑定
drawBtn.addEventListener('click', draw);
resetBtn.addEventListener('click', reset);
tabsEl.forEach(tab => {
    tab.addEventListener('click', () => switchType(tab.dataset.type));
});

// 启动
buildStage();
updateMatrixVisibility();
setupTrendControls();
loadLotteryData();
