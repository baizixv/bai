import { readStorage, writeStorage } from "../../lib/storage";
const JACKPOT_ODDS = 21_425_712; // 大乐透头奖精确概率 1/21,425,712
const DRAWS_PER_LIFE = 1040; // 30—50 岁，每周一期
const KEY = "bai-lottery-reincarnation-v1";
const HISTORY_LIMIT = 10;
type LifeResult = "win" | "miss";
type HistoryEntry = { life: number; win: boolean };
type GameState = {
  lives: number;
  draws: number;
  wins: number;
  history: HistoryEntry[];
  longestDry: number;
  currentStreak: number;
};
const initialState: GameState = { lives: 0, draws: 0, wins: 0, history: [], longestDry: 0, currentStreak: 0 };
let state: GameState = readStorage(KEY, initialState);
let autoRunning = false;
let busy = false;
const num = new Intl.NumberFormat("zh-CN");
const livesOutput = document.querySelector<HTMLElement>("#lottery-lives");
const drawsOutput = document.querySelector<HTMLElement>("#lottery-draws");
const winsOutput = document.querySelector<HTMLElement>("#lottery-wins");
const avgOutput = document.querySelector<HTMLElement>("#lottery-avg");
const dryOutput = document.querySelector<HTMLElement>("#lottery-dry");
const streakOutput = document.querySelector<HTMLElement>("#lottery-streak");
const progressBar = document.querySelector<HTMLElement>("#lottery-progress-bar");
const lifeLabel = document.querySelector<HTMLElement>("#lottery-life-label");
const lifeResult = document.querySelector<HTMLElement>("#lottery-life-result");
const drawsThisLife = document.querySelector<HTMLElement>("#lottery-draws-this-life");
const historyList = document.querySelector<HTMLElement>("#lottery-history");
const hint = document.querySelector<HTMLElement>("#lottery-hint");
const liveButton = document.querySelector<HTMLButtonElement>("#lottery-live");
const autoButton = document.querySelector<HTMLButtonElement>("#lottery-auto");
const resetButton = document.querySelector<HTMLButtonElement>("#lottery-reset");
const winOverlay = document.querySelector<HTMLElement>("#lottery-win");
const winLife = document.querySelector<HTMLElement>("#lottery-win-life");
const winDraws = document.querySelector<HTMLElement>("#lottery-win-draws");
const winAgain = document.querySelector<HTMLButtonElement>("#lottery-win-again");

const simulateLife = (): LifeResult => {
  for (let i = 0; i < DRAWS_PER_LIFE; i++) {
    if (Math.floor(Math.random() * JACKPOT_ODDS) + 1 === 1) return "win";
  }
  return "miss";
};

const liveOneLife = (): LifeResult => {
  const result = simulateLife();
  state.lives += 1;
  state.draws += DRAWS_PER_LIFE;
  if (result === "win") {
    state.wins += 1;
    state.longestDry = Math.max(state.longestDry, state.currentStreak);
    state.currentStreak = 0;
  } else {
    state.currentStreak += 1;
  }
  state.history.push({ life: state.lives, win: result === "win" });
  if (state.history.length > HISTORY_LIMIT) state.history.shift();
  return result;
};

const persist = () => writeStorage(KEY, state);

const render = () => {
  if (livesOutput) livesOutput.textContent = num.format(state.lives);
  if (drawsOutput) drawsOutput.textContent = num.format(state.draws);
  if (winsOutput) winsOutput.textContent = num.format(state.wins);
  if (avgOutput) avgOutput.textContent = state.wins > 0 ? `约 ${num.format(Math.round(state.lives / state.wins))} 世` : "—";
  if (dryOutput) dryOutput.textContent = state.longestDry > 0 ? `${num.format(state.longestDry)} 世` : "—";
  if (streakOutput) streakOutput.textContent = `${num.format(state.currentStreak)} 世`;
  if (lifeLabel) lifeLabel.textContent = `第 ${num.format(state.lives + 1)} 世`;
  if (!historyList) return;
  historyList.textContent = "";
  if (state.history.length === 0) {
    const li = document.createElement("li");
    li.className = "lottery-history-empty";
    li.textContent = "还没有轮回记录";
    historyList.append(li);
    return;
  }
  [...state.history].reverse().forEach((entry) => {
    const li = document.createElement("li");
    if (entry.win) li.className = "lottery-history-win";
    const life = document.createElement("span");
    life.textContent = `第 ${num.format(entry.life)} 世`;
    const result = document.createElement("b");
    result.textContent = entry.win ? "★ 中奖" : "未中";
    li.append(life, result);
    historyList.append(li);
  });
};

const animateProgress = (duration: number, onDone: () => void) => {
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    if (progressBar) progressBar.style.width = `${(t * 100).toFixed(1)}%`;
    if (drawsThisLife) drawsThisLife.textContent = `${num.format(Math.round(t * DRAWS_PER_LIFE))} / 1040 期`;
    if (t < 1) requestAnimationFrame(step);
    else onDone();
  };
  requestAnimationFrame(step);
};

const showWin = () => {
  if (winLife) winLife.textContent = num.format(state.lives);
  if (winDraws) winDraws.textContent = `共模拟 ${num.format(state.draws)} 期`;
  if (winOverlay) winOverlay.hidden = false;
  launchFireworks();
};

const runSingleLife = () => {
  if (busy || autoRunning) return;
  busy = true;
  if (lifeResult) lifeResult.textContent = "模拟这一辈子…";
  if (progressBar) {
    progressBar.classList.remove("lottery-bar-win");
    progressBar.style.width = "0%";
  }
  if (winOverlay) winOverlay.hidden = true;
  const result = liveOneLife();
  persist();
  render();
  animateProgress(520, () => {
    if (lifeResult) lifeResult.textContent = result === "win" ? "🎉 这辈子中了！" : `这辈子没中 · 已轮回 ${num.format(state.lives)} 世`;
    if (result === "win" && progressBar) progressBar.classList.add("lottery-bar-win");
    if (result === "win") showWin();
    busy = false;
  });
};

const startAuto = () => {
  autoRunning = true;
  if (autoButton) autoButton.textContent = "停止轮回";
  if (hint) hint.textContent = "自动轮回中…直到中奖或手动停止。";
  if (liveButton) liveButton.disabled = true;
  if (lifeResult) lifeResult.textContent = "自动轮回中…";
  tick();
};

const stopAuto = () => {
  autoRunning = false;
  if (autoButton) autoButton.textContent = "自动轮回";
  if (hint) hint.textContent = "点击按钮，模拟从 30 岁买到 50 岁的全部 1040 期开奖。";
  if (liveButton) liveButton.disabled = false;
};

const tick = () => {
  if (!autoRunning) return;
  let result: LifeResult = "miss";
  for (let i = 0; i < 40 && result !== "win"; i++) result = liveOneLife();
  persist();  render();
  if (result === "win") {
    stopAuto();
    if (progressBar) progressBar.classList.add("lottery-bar-win");
    if (lifeResult) lifeResult.textContent = `🎉 第 ${num.format(state.lives)} 世中了！`;
    showWin();
  } else {
    requestAnimationFrame(tick);
  }
};

liveButton?.addEventListener("click", runSingleLife);
autoButton?.addEventListener("click", () => (autoRunning ? stopAuto() : startAuto()));
winAgain?.addEventListener("click", () => { if (winOverlay) winOverlay.hidden = true; runSingleLife(); });
resetButton?.addEventListener("click", () => {
  if (state.lives > 0 && !window.confirm("确定要清空所有轮回记录吗？")) return;
  stopAuto();
  state = { ...initialState };
  persist();
  render();
  if (progressBar) {
    progressBar.classList.remove("lottery-bar-win");
    progressBar.style.width = "0%";
  }
  if (drawsThisLife) drawsThisLife.textContent = "0 / 1040 期";
  if (lifeResult) lifeResult.textContent = "等待第一次轮回";
  if (winOverlay) winOverlay.hidden = true;
});

// —— 背景金光粒子 + 中奖烟花 ——
const canvas = document.querySelector<HTMLCanvasElement>("#lottery-canvas");
const ctx = canvas?.getContext("2d");
const resize = () => {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};
window.addEventListener("resize", resize);
resize();

const GOLD = ["#f3ca51", "#ffd97a", "#f8b64c", "#fff3c4"];
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
};
let ambient: Particle[] = [];
let bursts: Particle[] = [];
let fireworkEnd = 0;
let nextBurstAt = 0;

const spawnAmbient = () => {
  if (!canvas) return;
  ambient = Array.from({ length: 36 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.14,
    vy: -0.04 - Math.random() * 0.1,
    life: 0,
    maxLife: Infinity,
    size: 0.8 + Math.random() * 1.5,
    color: GOLD[Math.floor(Math.random() * GOLD.length)],
    gravity: 0,
  }));
};

const spawnBurst = () => {
  if (!canvas) return;
  const cx = canvas.width * (0.15 + Math.random() * 0.7);
  const cy = canvas.height * (0.18 + Math.random() * 0.5);
  const color = GOLD[Math.floor(Math.random() * GOLD.length)];
  for (let i = 0; i < 72; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 4.5;
    bursts.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: 60 + Math.random() * 40,
      size: 1 + Math.random() * 2,
      color,
      gravity: 0.06,
    });
  }
};

const launchFireworks = () => {
  fireworkEnd = performance.now() + 3000;
  nextBurstAt = performance.now();
};

const animate = () => {
  if (!canvas || !ctx) return;
  const now = performance.now();
  if (now < fireworkEnd && now >= nextBurstAt) {
    spawnBurst();
    nextBurstAt = now + 240;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ambient.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.y < -10) {
      p.y = canvas.height + 10;
      p.x = Math.random() * canvas.width;
    }
    if (p.x < -10) p.x = canvas.width + 10;
    if (p.x > canvas.width + 10) p.x = -10;
    ctx.globalAlpha = 0.3 + 0.25 * Math.sin(now / 900 + p.x);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  bursts = bursts.filter((p) => {
    p.life += 1;
    p.vy += p.gravity;
    p.x += p.vx;
    p.y += p.vy;
    if (p.life < p.maxLife) {
      ctx.globalAlpha = 1 - p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }
    return false;
  });
  ctx.globalAlpha = 1;
  requestAnimationFrame(animate);
};
spawnAmbient();
animate();

render();
