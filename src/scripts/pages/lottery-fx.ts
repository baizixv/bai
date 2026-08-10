// 金色粒子背景 + 烟花 + 可验证幸运号码系统
const ODDS_LOTTERY = 21_425_712; // 大乐透头奖概率

export const initLotteryFx = (): { launchFireworks: () => void } => {
  const canvas = document.querySelector<HTMLCanvasElement>("#lottery-canvas");
  const ctx = canvas?.getContext("2d");
  const resize = () => { if (!canvas) return; canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  window.addEventListener("resize", resize);
  resize();
  const GOLD = ["#f3ca51", "#ffd97a", "#f8b64c", "#fff3c4"];
  type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string; gravity: number };
  let ambient: Particle[] = [];
  let bursts: Particle[] = [];
  let fireworkEnd = 0;
  let nextBurstAt = 0;
  const dot = (p: Particle, alpha: number) => { if (!ctx) return; ctx.globalAlpha = alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); };
  const spawnAmbient = () => { if (!canvas) return; ambient = Array.from({ length: 36 }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.14, vy: -0.04 - Math.random() * 0.1, life: 0, maxLife: Infinity, size: 0.8 + Math.random() * 1.5, color: GOLD[Math.floor(Math.random() * GOLD.length)], gravity: 0 })); };
  const spawnBurst = () => {
    if (!canvas) return;
    const cx = canvas.width * (0.15 + Math.random() * 0.7);
    const cy = canvas.height * (0.18 + Math.random() * 0.5);
    const color = GOLD[Math.floor(Math.random() * GOLD.length)];
    for (let i = 0; i < 72; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      bursts.push({ x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0, maxLife: 60 + Math.random() * 40, size: 1 + Math.random() * 2, color, gravity: 0.06 });
    }
  };
  const animate = () => {
    if (!canvas || !ctx) return;
    const now = performance.now();
    if (now < fireworkEnd && now >= nextBurstAt) { spawnBurst(); nextBurstAt = now + 240; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ambient.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
      if (p.x < -10) p.x = canvas.width + 10;
      if (p.x > canvas.width + 10) p.x = -10;
      dot(p, 0.3 + 0.25 * Math.sin(now / 900 + p.x));
    });
    bursts = bursts.filter((p) => {
      p.life += 1;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      if (p.life < p.maxLife) { dot(p, 1 - p.life / p.maxLife); return true; }
      return false;
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(animate);
  };
  spawnAmbient();
  animate();
  return { launchFireworks: () => { fireworkEnd = performance.now() + 3000; nextBurstAt = performance.now(); } };
};

// —— 可验证随机源：公开比特币区块哈希 ——
export type DrawSource = { hash: string; height: string };
let cachedSource: DrawSource | null | undefined;

export const fetchDrawSource = async (): Promise<DrawSource | null> => {
  if (cachedSource !== undefined) return cachedSource;
  cachedSource = null;
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 2500);
    const [hashRes, heightRes] = await Promise.all([
      fetch("https://mempool.space/api/blocks/tip/hash", { signal: controller.signal }),
      fetch("https://mempool.space/api/blocks/tip/height", { signal: controller.signal }),
    ]);
    window.clearTimeout(timer);
    if (hashRes.ok && heightRes.ok) {
      cachedSource = { hash: (await hashRes.text()).trim(), height: (await heightRes.text()).trim() };
    }
  } catch {
    cachedSource = null;
  }
  return cachedSource;
};

const sha256 = async (text: string): Promise<Uint8Array> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return new Uint8Array(digest);
};

// 号码派生：SHA-256(随机源:世界序号:票号) → 拒绝采样出 1..47（47×5=235，拒绝 ≥235 避免模偏差）
// ≤35 为前区号码，>35 为后区号码（减去 35）。确定性、可复算验证。
export const deriveOneNumber = async (source: DrawSource | null, world: number, ticket: number): Promise<number> => {
  const seed = source ? `${source.hash}:${world}:${ticket}` : `local:${world}:${ticket}:${Math.random()}`;
  const bytes = await sha256(seed);
  let i = 0;
  while (true) {
    const b = bytes[i % bytes.length];
    i++;
    if (b < 235) return (b % 47) + 1;
  }
};

export const isBack = (n: number) => n > 35;
export const formatOne = (n: number) => String(n).padStart(2, "0");
export const slotValue = (n: number) => (isBack(n) ? n - 35 : n);

// 开奖画面的滚动球：每次开奖随机一组完整号码（5 前区 + 2 后区），仅作视觉呈现。
const pick = (n: number, max: number): number[] => {
  const pool = Array.from({ length: max }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n).sort((a, b) => a - b);
};
export const randomDraw = (): { front: number[]; back: number[] } => ({ front: pick(5, 35), back: pick(2, 12) });
export const renderBalls = (el: HTMLElement | null, draw: { front: number[]; back: number[] }) => {
  if (!el) return;
  el.textContent = "";
  draw.front.forEach((n) => {
    const s = document.createElement("span");
    s.textContent = formatOne(n);
    s.className = "front";
    el.append(s);
  });
  const sep = document.createElement("i");
  sep.textContent = "+";
  el.append(sep);
  draw.back.forEach((n) => {
    const s = document.createElement("span");
    s.textContent = formatOne(n);
    s.className = "back";
    el.append(s);
  });
};

// 收集板：一次中奖加入一个号码；重复则不加；集齐 5 前区 + 2 后区为完成。
export const addCollectedNumber = (front: number[], back: number[], n: number): { front: number[]; back: number[]; added: boolean; complete: boolean } => {
  const value = slotValue(n);
  const intoBack = isBack(n);
  const target = intoBack ? back : front;
  if (target.includes(value)) return { front, back, added: false, complete: front.length === 5 && back.length === 2 };
  const next = [...target, value].sort((a, b) => a - b);
  const newFront = intoBack ? front : next;
  const newBack = intoBack ? next : back;
  return { front: newFront, back: newBack, added: true, complete: newFront.length === 5 && newBack.length === 2 };
};

const slot = (value: number | null, kind: "front" | "back") => {
  const span = document.createElement("span");
  span.className = `lottery-slot ${kind}`;
  if (value === null) {
    span.textContent = "·";
  } else {
    span.textContent = formatOne(value);
    span.classList.add("filled");
  }
  return span;
};

export const renderCollection = (frontEl: HTMLElement | null, backEl: HTMLElement | null, progressEl: HTMLElement | null, front: number[], back: number[]) => {
  if (frontEl) {
    frontEl.textContent = "";
    for (let i = 0; i < 5; i++) frontEl.append(slot(front[i] ?? null, "front"));
  }
  if (backEl) {
    backEl.textContent = "";
    for (let i = 0; i < 2; i++) backEl.append(slot(back[i] ?? null, "back"));
  }
  if (progressEl) progressEl.textContent = `${front.length + back.length} / 7`;
};

export const renderWinNumber = (el: HTMLElement | null, n: number) => {
  if (!el) return;
  el.textContent = "";
  const chip = document.createElement("span");
  chip.textContent = formatOne(slotValue(n));
  chip.className = isBack(n) ? "back" : "front";
  const label = document.createElement("i");
  label.textContent = isBack(n) ? "后区" : "前区";
  el.append(chip, label);
};

export const renderWinSet = (el: HTMLElement | null, front: number[], back: number[]) => {
  if (!el) return;
  el.textContent = "";
  front.forEach((n) => {
    const s = document.createElement("span");
    s.textContent = formatOne(n);
    s.className = "front";
    el.append(s);
  });
  const sep = document.createElement("i");
  sep.textContent = "+";
  el.append(sep);
  back.forEach((n) => {
    const s = document.createElement("span");
    s.textContent = formatOne(n);
    s.className = "back";
    el.append(s);
  });
};

// —— 通用工具（供主脚本复用）——
export const fmtMoney = (value: number): string => {
  const sign = value < 0 ? "-" : "";
  const v = Math.abs(value);
  if (v >= 1e8) return `${sign}${v / 1e8 >= 100 ? Math.round(v / 1e8) : (v / 1e8).toFixed(1)} 亿`;
  if (v >= 1e4) return `${sign}${v / 1e4 >= 1000 ? Math.round(v / 1e4) : (v / 1e4).toFixed(1)} 万`;
  return `${sign}${Math.round(v)} 元`;
};
export const fmtAge = (age: number) => age.toFixed(1).replace(/\.0$/, "");

export type RawWin = { world: number; age: number; ticket: number };
export const runWorlds = (n: number, ticketsPerLife: number, ticketsPerWeek: number, startAge: number): RawWin[] => {
  const winners: RawWin[] = [];
  for (let w = 0; w < n; w++) {
    for (let t = 0; t < ticketsPerLife; t++) {
      if (Math.floor(Math.random() * ODDS_LOTTERY) + 1 === 1) {
        winners.push({ world: w + 1, age: startAge + Math.floor(t / ticketsPerWeek) / 52, ticket: t + 1 });
        break;
      }
    }
  }
  return winners;
};

export const countUp = (el: HTMLElement | null, to: number, fmt: (v: number) => string, duration = 900) => {
  if (!el) return;
  el.textContent = fmt(0);
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = fmt(to * eased);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  }
};

export const formatSet = (front: number[], back: number[]): string => {
  const parts: string[] = [];
  if (front.length) parts.push(front.map(formatOne).join(" "));
  if (back.length) parts.push(back.map(formatOne).join(" "));
  return parts.length ? parts.join(" + ") : "";
};

export const initNumberCopy = (copyEl: HTMLButtonElement | null, getCollected: () => { front: number[]; back: number[] }) => {
  if (!copyEl) return;
  copyEl.addEventListener("click", async () => {
    const { front, back } = getCollected();
    const text = formatSet(front, back);
    if (!text) {
      copyEl.textContent = "暂无可复制号码";
      window.setTimeout(() => { copyEl.textContent = "复制号码"; }, 1200);
      return;
    }
    const ok = await copyText(text);
    copyEl.textContent = ok ? "已复制 ✓" : "复制失败";
    copyEl.classList.toggle("copied", ok);
    window.setTimeout(() => { copyEl.textContent = "复制号码"; copyEl.classList.remove("copied"); }, 1500);
  });
};
