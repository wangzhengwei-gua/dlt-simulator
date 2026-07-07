// ====== 大乐透摇号模拟器 ======
const FRONT_COUNT = 5;
const BACK_COUNT = 2;
const FRONT_MAX = 35;
const BACK_MAX = 12;

const frontBallsEl = document.getElementById('frontBalls');
const backBallsEl = document.getElementById('backBalls');
const drawBtn = document.getElementById('drawBtn');
const resetBtn = document.getElementById('resetBtn');
const resultText = document.getElementById('resultText');
const latestContent = document.getElementById('latestContent');
const historyContent = document.getElementById('historyContent');

// 初始化球
function initBalls() {
    frontBallsEl.innerHTML = '';
    backBallsEl.innerHTML = '';
    for (let i = 0; i < FRONT_COUNT; i++) {
        const ball = document.createElement('div');
        ball.className = 'ball empty';
        ball.textContent = '??';
        frontBallsEl.appendChild(ball);
    }
    for (let i = 0; i < BACK_COUNT; i++) {
        const ball = document.createElement('div');
        ball.className = 'ball empty';
        ball.textContent = '??';
        backBallsEl.appendChild(ball);
    }
}

// 生成不重复随机数（已排序）
function generateUniqueNumbers(count, max) {
    const numbers = [];
    while (numbers.length < count) {
        const n = Math.floor(Math.random() * max) + 1;
        if (!numbers.includes(n)) numbers.push(n);
    }
    return numbers.sort((a, b) => a - b);
}

function formatNumber(n) {
    return String(n).padStart(2, '0');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 单个球滚动动画（先快后慢减速）
function rollBall(ballEl, finalNumber, duration, isBack) {
    return new Promise(resolve => {
        ballEl.classList.remove('empty');
        ballEl.classList.add(isBack ? 'back-ball' : 'front-ball', 'rolling');

        const startTime = Date.now();
        let lastTick = 0;
        let interval = 50;

        const tick = () => {
            const now = Date.now();
            const elapsed = now - startTime;

            if (now - lastTick >= interval) {
                const max = isBack ? BACK_MAX : FRONT_MAX;
                ballEl.textContent = formatNumber(Math.floor(Math.random() * max) + 1);
                lastTick = now;
                // 二次曲线减速
                const progress = elapsed / duration;
                interval = 50 + Math.pow(progress, 2) * 250;
            }

            if (elapsed < duration) {
                requestAnimationFrame(tick);
            } else {
                ballEl.textContent = formatNumber(finalNumber);
                ballEl.classList.remove('rolling');
                ballEl.classList.add('settled');
                setTimeout(() => ballEl.classList.remove('settled'), 400);
                resolve();
            }
        };
        requestAnimationFrame(tick);
    });
}

// 摇号主流程
async function draw() {
    drawBtn.disabled = true;
    resultText.innerHTML = '🎉 正在摇号中...';

    initBalls();

    const frontNumbers = generateUniqueNumbers(FRONT_COUNT, FRONT_MAX);
    const backNumbers = generateUniqueNumbers(BACK_COUNT, BACK_MAX);

    const frontBallEls = frontBallsEl.querySelectorAll('.ball');
    const backBallEls = backBallsEl.querySelectorAll('.ball');

    // 摇前区5个球（依次开出）
    for (let i = 0; i < FRONT_COUNT; i++) {
        await rollBall(frontBallEls[i], frontNumbers[i], 1800 + i * 200, false);
        await sleep(150);
    }

    await sleep(300);

    // 摇后区2个球
    for (let i = 0; i < BACK_COUNT; i++) {
        await rollBall(backBallEls[i], backNumbers[i], 1500 + i * 200, true);
        await sleep(150);
    }

    // 显示结果
    const frontHtml = frontNumbers.map(n => `<span class="num front">${formatNumber(n)}</span>`).join(' ');
    const backHtml = backNumbers.map(n => `<span class="num back">${formatNumber(n)}</span>`).join(' ');
    resultText.innerHTML = `✅ 摇号结果：${frontHtml} ｜ ${backHtml}`;

    drawBtn.disabled = false;
}

// 重置
function reset() {
    initBalls();
    resultText.innerHTML = '点击下方按钮开始摇号';
}

// 加载开奖数据
async function loadLotteryData() {
    try {
        const response = await fetch('data/latest.json?t=' + Date.now());
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
        latestContent.innerHTML = `<p class="loading">⚠️ 数据加载失败，请稍后重试</p>`;
        historyContent.innerHTML = `<p class="loading">⚠️ 数据加载失败</p>`;
    }
}

function renderLatest(latest) {
    const front = latest.front || [];
    const back = latest.back || [];
    const frontHtml = front.map(n => `<div class="ball-mini front">${formatNumber(n)}</div>`).join('');
    const backHtml = back.map(n => `<div class="ball-mini back">${formatNumber(n)}</div>`).join('');
    latestContent.innerHTML = `
        <div class="latest-draw">
            <div class="draw-info">
                <div>第 ${latest.period || '--'} 期</div>
                <div>${latest.date || '--'}</div>
            </div>
            <div class="balls-mini">${frontHtml}</div>
            <div style="font-size:1rem;color:rgba(255,255,255,0.3)">＋</div>
            <div class="balls-mini">${backHtml}</div>
        </div>
    `;
}

function renderHistory(history) {
    if (!history || history.length === 0) {
        historyContent.innerHTML = `<p class="loading">暂无历史数据</p>`;
        return;
    }
    let html = `<table class="history-table"><thead><tr><th>期号</th><th>开奖日</th><th>前区</th><th>后区</th></tr></thead><tbody>`;
    history.slice(0, 10).forEach(item => {
        const front = (item.front || []).map(n => `<span class="h-ball front">${formatNumber(n)}</span>`).join('');
        const back = (item.back || []).map(n => `<span class="h-ball back">${formatNumber(n)}</span>`).join('');
        html += `<tr><td>${item.period || '--'}</td><td>${item.date || '--'}</td><td>${front}</td><td>${back}</td></tr>`;
    });
    html += '</tbody></table>';
    historyContent.innerHTML = html;
}

// 事件绑定
drawBtn.addEventListener('click', draw);
resetBtn.addEventListener('click', reset);

// 启动
initBalls();
loadLotteryData();
