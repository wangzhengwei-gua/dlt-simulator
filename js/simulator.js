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

    // 重新加载数据
    loadLotteryData();
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

    history.slice(0, 10).forEach(item => {
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

// 事件绑定
drawBtn.addEventListener('click', draw);
resetBtn.addEventListener('click', reset);
tabsEl.forEach(tab => {
    tab.addEventListener('click', () => switchType(tab.dataset.type));
});

// 启动
buildStage();
loadLotteryData();
