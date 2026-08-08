import { benchmarkTests } from '../data/benchmark';
const tests = benchmarkTests.filter((test) => test.playable);

const game = document.querySelector<HTMLElement>('#benchmark-game');
const title = document.querySelector<HTMLElement>('#benchmark-title');
const instruction = document.querySelector<HTMLElement>('#benchmark-instruction');
const category = document.querySelector<HTMLElement>('#benchmark-category');
const best = document.querySelector<HTMLElement>('#benchmark-best');
const resultScore = document.querySelector<HTMLElement>('#result-score');
const resultUnit = document.querySelector<HTMLElement>('#result-unit');
const resultMessage = document.querySelector<HTMLElement>('#result-message');
const startButton = document.querySelector<HTMLButtonElement>('#benchmark-start');
const retryButton = document.querySelector<HTMLButtonElement>('#benchmark-retry');
const nextButton = document.querySelector<HTMLButtonElement>('#benchmark-next');
const playStatus = document.querySelector<HTMLElement>('#play-status');
const playPrompt = document.querySelector<HTMLElement>('#play-prompt');
const controls = document.querySelector<HTMLElement>('#play-controls');
const welcome = document.querySelector<HTMLElement>('[data-screen="welcome"]');
const playScreen = document.querySelector<HTMLElement>('[data-screen="play"]');
const resultScreen = document.querySelector<HTMLElement>('[data-screen="result"]');
const tabs = [...document.querySelectorAll<HTMLButtonElement>('.benchmark-test-tab')];

let current = tests[0];
let cleanup: (() => void) | undefined;
let busy = false;
const storageKey = 'bai-benchmark-best';

const getBest = (id: string): string => {
  try { return JSON.parse(localStorage.getItem(storageKey) ?? '{}')[id] ?? '—'; } catch { return '—'; }
};
const setBest = (id: string, value: number) => {
  try {
    const values = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Record<string, number>;
    const previous = values[id];
    const better = id === 'reaction' || id === 'aim' ? (!previous || value < previous) : (!previous || value > previous);
    if (better) { values[id] = value; localStorage.setItem(storageKey, JSON.stringify(values)); }
  } catch { /* private browsing may disable storage */ }
};
const formatBest = (value: string) => value === '—' ? value : `${value} ${current.unit}`;
const showScreen = (screen: 'welcome' | 'play' | 'result') => {
  if (welcome) welcome.hidden = screen !== 'welcome';
  if (playScreen) playScreen.hidden = screen !== 'play';
  if (resultScreen) resultScreen.hidden = screen !== 'result';
};
const clearControls = () => { if (controls) controls.replaceChildren(); };
const setPrompt = (status: string, prompt: string) => { if (playStatus) playStatus.textContent = status; if (playPrompt) playPrompt.textContent = prompt; };
const categoryName = (id: string) => ({ reaction: 'REACTION', number: 'NUMBER MEMORY', visual: 'VISUAL MEMORY', typing: 'TYPING', aim: 'AIM', stroop: 'STROOP' }[id] ?? id.toUpperCase());

const selectTest = (id: string) => {
  const selected = tests.find((test) => test.id === id);
  if (!selected) return;
  cleanup?.(); cleanup = undefined; current = selected; busy = false;
  tabs.forEach((tab) => tab.classList.toggle('selected', tab.dataset.test === id));
  if (title) title.textContent = selected.title;
  if (instruction) instruction.textContent = selected.intro;
  if (category) category.textContent = `${String(tests.indexOf(selected) + 1).padStart(2, '0')} / ${categoryName(selected.id)}`;
  if (best) best.textContent = `最佳：${formatBest(getBest(selected.id))}`;
  clearControls(); showScreen('welcome');
};

const finish = (value: number, message: string) => {
  busy = false; cleanup?.(); cleanup = undefined; setBest(current.id, value);
  if (resultScore) resultScore.textContent = String(value);
  if (resultUnit) resultUnit.textContent = current.unit;
  if (resultMessage) resultMessage.textContent = message;
  if (best) best.textContent = `最佳：${formatBest(getBest(current.id))}`;
  showScreen('result');
};
const nextTest = () => { const index = tests.findIndex((test) => test.id === current.id); selectTest(tests[(index + 1) % tests.length].id); };

const startReaction = () => {
  const surface = playScreen;
  let round = 0;
  const times: number[] = [];
  let timer: number | undefined;
  let startedAt = 0;
  let state: 'waiting' | 'ready' = 'waiting';
  const onPointerDown = (event: PointerEvent) => {
    if (!busy || event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement) return;
    event.preventDefault();
    if (state === 'waiting') {
      window.clearTimeout(timer);
      finish(0, '太快了。等待绿色出现后再点击。');
      return;
    }
    times.push(Math.round(performance.now() - startedAt));
    round += 1;
    if (round >= 3) finish(Math.round(times.reduce((total, value) => total + value, 0) / times.length), '三轮平均反应时间。');
    else runRound();
  };
  const runRound = () => {
    busy = true;
    state = 'waiting';
    game?.classList.remove('reaction-ready');
    setPrompt(`第 ${round + 1} / 3 轮`, '等待绿色出现…');
    timer = window.setTimeout(() => {
      if (!busy) return;
      state = 'ready';
      startedAt = performance.now();
      game?.classList.add('reaction-ready');
      setPrompt(`第 ${round + 1} / 3 轮`, '点击测试区域！');
    }, 1500 + Math.random() * 2500);
  };
  surface?.addEventListener('pointerdown', onPointerDown);
  cleanup = () => { surface?.removeEventListener('pointerdown', onPointerDown); window.clearTimeout(timer); game?.classList.remove('reaction-ready'); };
  runRound();
};

const startNumber = () => {
  let level = 1;
  let timer: number | undefined;
  let submitted = false;
  const run = () => {
    busy = true;
    submitted = false;
    clearControls();
    const digits = Math.min(2 + level, 30);
    const value = Array.from({ length: digits }, () => Math.floor(Math.random() * 10)).join('');
    setPrompt(`第 ${level} 级 · ${digits} 位`, value);
    clearControls();
    timer = window.setTimeout(() => {
      if (!busy) return;
      setPrompt(`第 ${level} 级 · ${digits} 位`, '输入你记住的数字');
      const input = document.createElement('input');
      input.className = 'benchmark-input';
      input.inputMode = 'numeric';
      input.autocomplete = 'off';
      input.maxLength = digits;
      const button = document.createElement('button');
      button.className = 'benchmark-secondary';
      button.textContent = '确认答案';
      controls?.append(input, button);
      input.focus();
      const submit = () => {
        if (submitted) return;
        submitted = true;
        if (input.value === value) {
          level += 1;
          run();
        } else {
          finish(level - 1, `你完成了第 ${level - 1} 级，记住了 ${digits - 1} 位数字。`);
        }
      };
      button.addEventListener('click', submit);
      input.addEventListener('keydown', (event) => { if (event.key === 'Enter') submit(); });
    }, Math.max(1600, 2400 - level * 20));
  };
  cleanup = () => { window.clearTimeout(timer); };
  run();
};

const startVisual = () => {
  let level = 1; let active: number[] = []; let chosen: number[] = []; let timer: number | undefined;
  const run = () => { busy = true; chosen = []; const count = Math.min(2 + level, 12); active = [...Array(16).keys()].sort(() => Math.random() - .5).slice(0, count); clearControls(); const grid = document.createElement('div'); grid.className = 'visual-grid'; for (let i = 0; i < 16; i += 1) { const tile = document.createElement('button'); tile.className = `visual-tile ${active.includes(i) ? 'lit' : ''}`; tile.dataset.index = String(i); grid.append(tile); } controls?.append(grid); setPrompt(`第 ${level} 级`, '记住亮起的方块'); timer = window.setTimeout(() => { grid.querySelectorAll('.visual-tile').forEach((tile) => tile.classList.remove('lit')); setPrompt(`第 ${level} 级`, '点击刚才亮起的方块'); grid.querySelectorAll<HTMLButtonElement>('.visual-tile').forEach((tile) => tile.addEventListener('click', () => { if (tile.classList.contains('chosen')) return; const index = Number(tile.dataset.index); if (!active.includes(index)) { finish(level - 1, `你完成了第 ${level - 1} 级视觉记忆。`); return; } tile.classList.add('chosen'); chosen.push(index); if (chosen.length === active.length) { level += 1; run(); } })); }, 1200); };
  cleanup = () => { window.clearTimeout(timer); }; run();
};

const startTyping = () => {
  const sample = 'The quietest ideas often become the most useful things.'; let started = 0; let timer: number | undefined;
  clearControls(); setPrompt('15 秒测试', '照着下面的句子输入'); const text = document.createElement('p'); text.className = 'typing-sample'; text.textContent = sample; const input = document.createElement('textarea'); input.className = 'benchmark-textarea'; input.rows = 3; input.placeholder = '在这里开始输入…'; controls?.append(text, input); input.focus();
  const finishTyping = () => { if (!started) return; const elapsed = Math.max(1, (performance.now() - started) / 1000); const correct = [...input.value].filter((char, index) => char === sample[index]).length; finish(Math.round(correct / elapsed * 60), '按照正确字符数估算的每分钟速度。'); };
  const onInput = () => { if (!started) { started = performance.now(); timer = window.setTimeout(finishTyping, 15000); } if (input.value === sample) finishTyping(); };
  input.addEventListener('input', onInput); cleanup = () => { window.clearTimeout(timer); input.removeEventListener('input', onInput); };
};

const startAim = () => {
  let count = 0; let started = 0; const times: number[] = []; clearControls(); setPrompt('5 个目标', '点击出现的圆点'); const arena = document.createElement('div'); arena.className = 'aim-arena'; const target = document.createElement('button'); target.className = 'aim-target'; target.setAttribute('aria-label', '目标'); arena.append(target); controls?.append(arena);
  const move = () => { target.style.left = `${10 + Math.random() * 80}%`; target.style.top = `${10 + Math.random() * 70}%`; started = performance.now(); };
  const onClick = () => { times.push(performance.now() - started); count += 1; if (count >= 5) finish(Math.round(times.reduce((a, b) => a + b, 0) / times.length), '五个目标的平均点击时间。'); else move(); }; target.addEventListener('click', onClick); cleanup = () => target.removeEventListener('click', onClick); move();
};

const startStroop = () => {
  const colors = [{ name: '蓝色', value: '#4264f5' }, { name: '粉色', value: '#ed6f79' }, { name: '绿色', value: '#54a575' }, { name: '黄色', value: '#d39d00' }]; let round = 0; let correct = 0; let answer = '';
  const run = () => { const word = colors[Math.floor(Math.random() * colors.length)]; const ink = colors[Math.floor(Math.random() * colors.length)]; answer = ink.name; clearControls(); setPrompt(`第 ${round + 1} / 10 轮`, '选择文字显示的颜色'); const label = document.createElement('div'); label.className = 'stroop-word'; label.textContent = word.name; label.style.color = ink.value; const buttons = document.createElement('div'); buttons.className = 'stroop-options'; colors.forEach((color) => { const button = document.createElement('button'); button.className = 'benchmark-secondary'; button.textContent = color.name; button.addEventListener('click', () => { if (color.name === answer) correct += 1; round += 1; if (round >= 10) finish(correct, '十轮中答对的题目数。'); else run(); }); buttons.append(button); }); controls?.append(label, buttons); };
  run();
};

const startCurrent = () => { cleanup?.(); game?.classList.remove('reaction-ready'); clearControls(); showScreen('play'); if (current.id === 'reaction') startReaction(); if (current.id === 'number') startNumber(); if (current.id === 'visual') startVisual(); if (current.id === 'typing') startTyping(); if (current.id === 'aim') startAim(); if (current.id === 'stroop') startStroop(); };

tabs.forEach((tab) => tab.addEventListener('click', () => selectTest(tab.dataset.test ?? 'reaction')));
startButton?.addEventListener('click', startCurrent); retryButton?.addEventListener('click', startCurrent); nextButton?.addEventListener('click', nextTest);
selectTest('reaction');
