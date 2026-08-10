import { readStorage, writeStorage } from "../../lib/storage";
import { addCollectedNumber, deriveOneNumber, fetchDrawSource, formatOne, initLotteryFx, isBack, randomDraw, renderBalls, renderCollection, renderWinNumber, slotValue } from "./lottery-fx";

const ODDS = 21_425_712; // 大乐透头奖概率
const PRICE = 2; // 每注 2 元
const JACKPOT = 10_000_000; // 头奖固定值：1,000 万（大乐透基本投注头奖口径）
const KEY = "bai-lottery-reincarnation-v2";
const RUN_LIMIT = 8;

type RunRecord = { worlds: number; invested: number; winners: number; won: number };
type Collected = { front: number[]; back: number[] };
type GameState = { totalWorlds: number; totalInvested: number; totalWins: number; totalWon: number; collected: Collected; runs: RunRecord[] };
const initialState: GameState = { totalWorlds: 0, totalInvested: 0, totalWins: 0, totalWon: 0, collected: { front: [], back: [] }, runs: [] };
let state: GameState = readStorage(KEY, initialState);
let running = false;

const num = new Intl.NumberFormat("zh-CN");
const q = <T extends HTMLElement>(id: string) => document.querySelector<T>(id);
const startAgeInput = q<HTMLInputElement>("#lottery-start-age"), endAgeInput = q<HTMLInputElement>("#lottery-end-age");
const frequencyButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-frequency]")];
const ticketsInput = q<HTMLInputElement>("#lottery-tickets"), worldsInput = q<HTMLInputElement>("#lottery-worlds");
const presetButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-worlds]")];
const form = q<HTMLFormElement>("#lottery-settings"), runButton = q<HTMLButtonElement>("#lottery-run"), resetButton = q<HTMLButtonElement>("#lottery-reset");
const statusOutput = q<HTMLElement>("#lottery-status"), progressLabel = q<HTMLElement>("#lottery-progress-label"), progressValue = q<HTMLElement>("#lottery-progress-value"), progressBar = q<HTMLElement>("#lottery-progress-bar");
const runningBlock = q<HTMLElement>("#lottery-running"), rollingOutput = q<HTMLElement>("#lottery-rolling");
const planPurchases = q<HTMLElement>("#plan-purchases"), planTickets = q<HTMLElement>("#plan-tickets"), planCost = q<HTMLElement>("#plan-cost");
const collectFront = q<HTMLElement>("#lottery-collect-front"), collectBack = q<HTMLElement>("#lottery-collect-back"), collectProgress = q<HTMLElement>("#lottery-collect-progress");
const report = q<HTMLElement>("#lottery-report"), resultWorlds = q<HTMLElement>("#result-worlds"), resultInvested = q<HTMLElement>("#result-invested"), resultWinners = q<HTMLElement>("#result-winners");
const resultWon = q<HTMLElement>("#result-won"), resultNet = q<HTMLElement>("#result-net"), resultRate = q<HTMLElement>("#result-rate"), resultSummary = q<HTMLElement>("#lottery-result-summary"), winnersText = q<HTMLElement>("#lottery-winners-text");
const totalWorlds = q<HTMLElement>("#total-worlds"), totalInvested = q<HTMLElement>("#total-invested"), totalWins = q<HTMLElement>("#total-wins"), totalWon = q<HTMLElement>("#total-won"), totalNet = q<HTMLElement>("#total-net"), runLog = q<HTMLElement>("#lottery-run-log");
const winOverlay = q<HTMLElement>("#lottery-win"), winTitle = q<HTMLElement>("#lottery-win-title"), winNumber = q<HTMLElement>("#lottery-win-number"), winBasis = q<HTMLElement>("#lottery-win-basis"), winNote = q<HTMLElement>("#lottery-win-note"), winMeta = q<HTMLElement>("#lottery-win-meta"), winClose = q<HTMLButtonElement>("#lottery-win-close");
const fx = initLotteryFx();

const fmtMoney = (value: number): string => {
  const sign = value < 0 ? "-" : "";
  const v = Math.abs(value);
  if (v >= 1e8) return `${sign}${v / 1e8 >= 100 ? Math.round(v / 1e8) : (v / 1e8).toFixed(1)} 亿`;
  if (v >= 1e4) return `${sign}${v / 1e4 >= 1000 ? Math.round(v / 1e4) : (v / 1e4).toFixed(1)} 万`;
  return `${sign}${Math.round(v)} 元`;
};
const fmtAge = (age: number) => age.toFixed(1).replace(/\.0$/, "");

const readSettings = (): { startAge: number; endAge: number; frequency: number; tickets: number; worlds: number } | null => {
  const startAge = Number(startAgeInput?.value ?? 30);
  const endAge = Number(endAgeInput?.value ?? 50);
  const frequency = Number(frequencyButtons.find((b) => b.classList.contains("active"))?.dataset.frequency ?? 1);
  const tickets = Number(ticketsInput?.value ?? 1);
  const worlds = Number(worldsInput?.value ?? 100);
  if (!(startAge >= 1 && endAge <= 120 && startAge < endAge)) {
    if (statusOutput) statusOutput.textContent = "年龄区间无效：开始年龄需小于结束年龄（1—120 岁）。";
    return null;
  }
  if (!(frequency >= 1 && frequency <= 3)) {
    if (statusOutput) statusOutput.textContent = "每周购买次数无效：支持 1—3 次。";
    return null;
  }
  if (!(tickets >= 1 && tickets <= 20)) {
    if (statusOutput) statusOutput.textContent = "注数无效：每次购买需在 1—20 注之间。";
    return null;
  }
  if (!(worlds >= 1 && worlds <= 100_000)) {
    if (statusOutput) statusOutput.textContent = "平行世界数无效：支持 1—100,000。";
    return null;
  }
  return { startAge, endAge, frequency, tickets, worlds };
};

const computePlan = (s: { startAge: number; endAge: number; frequency: number; tickets: number }) => {
  const weeks = (s.endAge - s.startAge) * 52;
  const purchases = weeks * s.frequency;
  const tickets = purchases * s.tickets;
  const ticketsPerWeek = s.frequency * s.tickets;
  return { weeks, purchases, tickets, ticketsPerWeek, cost: tickets * PRICE };
};

const renderPlan = (s: { startAge: number; endAge: number; frequency: number; tickets: number; worlds: number }) => {
  const plan = computePlan(s);
  if (planPurchases) planPurchases.textContent = `${num.format(plan.purchases)} 次`;
  if (planTickets) planTickets.textContent = `${num.format(plan.tickets)} 注`;
  if (planCost) planCost.textContent = fmtMoney(plan.cost);
  if (runButton) runButton.textContent = "开始模拟";
};

const renderTotals = () => {
  if (totalWorlds) totalWorlds.textContent = num.format(state.totalWorlds);
  if (totalInvested) totalInvested.textContent = fmtMoney(state.totalInvested);
  if (totalWins) totalWins.textContent = num.format(state.totalWins);
  if (totalWon) totalWon.textContent = fmtMoney(state.totalWon);
  if (totalNet) totalNet.textContent = fmtMoney(state.totalWon - state.totalInvested);
  renderCollection(collectFront, collectBack, collectProgress, state.collected.front, state.collected.back);
  if (!runLog) return;
  runLog.textContent = "";
  if (state.runs.length === 0) {
    const li = document.createElement("li");
    li.className = "lottery-run-empty";
    li.textContent = "还没有模拟记录";
    runLog.append(li);
    return;
  }
  [...state.runs].reverse().forEach((run, index) => {
    const li = document.createElement("li");
    if (run.winners > 0) li.className = "lottery-run-win";
    const name = document.createElement("span");
    name.textContent = `第 ${state.runs.length - index} 次 · ${num.format(run.worlds)} 个世界`;
    const detail = document.createElement("b");
    detail.textContent = `投入 ${fmtMoney(run.invested)} · 中奖 ${run.winners} 个世界 · ${fmtMoney(run.won - run.invested)}`;
    li.append(name, detail);
    runLog.append(li);
  });
};

type RawWin = { world: number; age: number; ticket: number };
type WinRecord = { world: number; age: number; ticket: number; number: number; added: boolean };
const runWorlds = (n: number, ticketsPerLife: number, ticketsPerWeek: number, startAge: number): RawWin[] => {
  const winners: RawWin[] = [];
  for (let w = 0; w < n; w++) {
    for (let t = 0; t < ticketsPerLife; t++) {
      if (Math.floor(Math.random() * ODDS) + 1 === 1) {
        winners.push({ world: w + 1, age: startAge + Math.floor(t / ticketsPerWeek) / 52, ticket: t + 1 });
        break;
      }
    }
  }
  return winners;
};

const countUp = (el: HTMLElement | null, to: number, fmt: (v: number) => string, duration = 900) => {
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

const setProgress = (ratio: number) => {
  if (progressBar) progressBar.style.width = `${(ratio * 100).toFixed(1)}%`;
  if (progressValue) progressValue.textContent = `${(ratio * 100).toFixed(0)}%`;
};

const execute = async () => {
  if (running) return;
  const settings = readSettings();
  if (!settings) return;
  running = true;
  const plan = computePlan(settings);
  const startedAt = performance.now();
  const sourcePromise = fetchDrawSource();
  if (runButton) runButton.disabled = true;
  if (winOverlay) winOverlay.hidden = true;
  if (report) report.hidden = true;
  if (runningBlock) runningBlock.hidden = false;
  renderBalls(q("#lottery-balls"), randomDraw());
  if (rollingOutput) rollingOutput.textContent = "已模拟 0 个世界";
  progressBar?.classList.add("lottery-running-bar");
  if (statusOutput) statusOutput.textContent = `正在开奖：${num.format(settings.worlds)} 个平行世界…`;
  setProgress(0);
  const rawWinners: RawWin[] = [];
  const CHUNK = 5000;
  let done = 0;
  while (done < settings.worlds) {
    const batch = Math.min(CHUNK, settings.worlds - done);
    const found = runWorlds(batch, plan.tickets, plan.ticketsPerWeek, settings.startAge);
    rawWinners.push(...found.map((w) => ({ world: w.world + done, age: w.age, ticket: w.ticket })));
    done += batch;
    setProgress(done / settings.worlds);
    countUp(rollingOutput, done, (v) => `已模拟 ${num.format(Math.round(v))} 个世界`, 300);
    if (progressLabel) progressLabel.textContent = "模拟中…";
    if (done < settings.worlds) await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  const elapsed = performance.now() - startedAt;
  if (elapsed < 800) await new Promise((resolve) => window.setTimeout(resolve, 800 - elapsed));
  if (runningBlock) runningBlock.hidden = true;
  progressBar?.classList.remove("lottery-running-bar");
  const source = await sourcePromise;
  // 每次中奖由真实随机源派生一个号码，并收入幸运号码收集板
  const winners: WinRecord[] = [];
  for (const w of rawWinners) {
    const n = await deriveOneNumber(source, w.world, w.ticket);
    const result = addCollectedNumber(state.collected.front, state.collected.back, n);
    state.collected = result;
    winners.push({ world: w.world, age: w.age, ticket: w.ticket, number: n, added: result.added });
    if (result.complete && result.added) fx.launchFireworks();
  }
  renderCollection(collectFront, collectBack, collectProgress, state.collected.front, state.collected.back);
  const invested = plan.cost * settings.worlds;
  const won = winners.length * JACKPOT;
  state.totalWorlds += settings.worlds;
  state.totalInvested += invested;
  state.totalWins += winners.length;
  state.totalWon += won;
  state.runs.push({ worlds: settings.worlds, invested, winners: winners.length, won });
  if (state.runs.length > RUN_LIMIT) state.runs.shift();
  writeStorage(KEY, state);
  renderTotals();
  renderResult(settings.worlds, plan, winners, invested, won);
  countUp(resultWorlds, settings.worlds, (v) => num.format(Math.round(v)));
  countUp(resultInvested, invested, (v) => fmtMoney(Math.round(v)));
  countUp(resultWinners, winners.length, (v) => num.format(Math.round(v)));
  countUp(resultWon, won, (v) => fmtMoney(Math.round(v)));
  countUp(resultNet, won - invested, (v) => fmtMoney(Math.round(v)));
  countUp(resultRate, invested > 0 ? (won / invested) * 100 : 0, (v) => `${v.toFixed(1)}%`);
  if (progressLabel) progressLabel.textContent = "模拟完成";
  if (statusOutput) statusOutput.textContent = winners.length > 0 ? `🎉 ${winners.length} 个世界命中头奖！` : `模拟完成：${num.format(settings.worlds)} 个世界全部未中头奖。`;
  if (runButton) runButton.disabled = false;
  running = false;
  if (winners.length > 0) showWin(winners, source, invested, won);
};

const renderResult = (worlds: number, plan: { purchases: number; tickets: number; cost: number }, winners: WinRecord[], invested: number, won: number) => {
  if (report) report.hidden = false;
  if (resultWorlds) resultWorlds.textContent = num.format(worlds);
  if (resultInvested) resultInvested.textContent = fmtMoney(invested);
  if (resultWinners) resultWinners.textContent = `${winners.length} 个世界`;
  if (resultWon) resultWon.textContent = fmtMoney(won);
  if (resultNet) {
    resultNet.textContent = fmtMoney(won - invested);
    resultNet.classList.toggle("lottery-net-negative", won - invested < 0);
    resultNet.classList.toggle("lottery-net-positive", won - invested > 0);
  }
  if (resultRate) resultRate.textContent = invested > 0 ? `${((won / invested) * 100).toFixed(1)}%` : "—";
  if (resultSummary) resultSummary.textContent = `每个世界 ${num.format(plan.purchases)} 次购买 · ${num.format(plan.tickets)} 注 · ${fmtMoney(plan.cost)} · 头奖 ${fmtMoney(JACKPOT)}`;
  if (!winnersText) return;
  winnersText.hidden = winners.length === 0;
  winnersText.textContent = winners.length > 0 ? `中奖世界：${winners.slice(0, 8).map((w) => `#${num.format(w.world)} 号 · 约 ${fmtAge(w.age)} 岁 · 号码 ${formatOne(slotValue(w.number))}（${isBack(w.number) ? "后区" : "前区"}）`).join("、")}${winners.length > 8 ? ` 等 ${winners.length} 个` : ""}` : "";
};

const showWin = (winners: WinRecord[], source: { hash: string; height: string } | null, invested: number, won: number) => {
  if (!winOverlay) return;
  const first = winners[0];
  if (winTitle) {
    winTitle.innerHTML =
      winners.length === 1
        ? `第 <span>${num.format(first.world)}</span> 号世界在约 <span>${fmtAge(first.age)}</span> 岁中了头奖！`
        : `<span>${winners.length}</span> 个平行世界中奖！最早约 ${fmtAge(first.age)} 岁`;
  }
  renderWinNumber(winNumber, first.number);
  if (winBasis) {
    winBasis.textContent = source
      ? `开奖依据：区块 #${source.height} · ${source.hash.slice(0, 14)}… · 世界 ${num.format(first.world)} 第 ${num.format(first.ticket)} 张票 · SHA-256 派生`
      : "开奖依据：本地随机（未获取到区块源）";
  }
  if (winNote) {
    const complete = state.collected.front.length === 5 && state.collected.back.length === 2;
    winNote.textContent = complete && first.added ? "🎉 幸运号码全部集齐！" : first.added ? "新号码已收入收集板" : "重复号码，未新增";
  }
  if (winMeta) winMeta.textContent = `投入 ${fmtMoney(invested)} · 奖金 ${fmtMoney(won)} · 头奖 ${fmtMoney(JACKPOT)}`;
  winOverlay.hidden = false;
  fx.launchFireworks();
};

frequencyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    frequencyButtons.forEach((b) => b.classList.toggle("active", b === button));
    const settings = readSettings();
    if (settings) renderPlan(settings);
  });
});
presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (worldsInput) worldsInput.value = button.dataset.worlds ?? "100";
    presetButtons.forEach((b) => b.classList.toggle("active", b === button));
  });
});
form?.addEventListener("submit", (event) => {
  event.preventDefault();
  void execute();
});
[startAgeInput, endAgeInput, ticketsInput, worldsInput].forEach((input) => {
  input?.addEventListener("input", () => {
    const settings = readSettings();
    if (settings) renderPlan(settings);
  });
});
resetButton?.addEventListener("click", () => {
  if (state.totalWorlds > 0 && !window.confirm("确定要清空所有累计记录和幸运号码吗？")) return;
  state = { ...initialState, collected: { front: [], back: [] } };
  writeStorage(KEY, state);
  renderTotals();
  if (statusOutput) statusOutput.textContent = "累计记录与幸运号码已清空。";
});
winClose?.addEventListener("click", () => {
  if (winOverlay) winOverlay.hidden = true;
});

const initial = readSettings();
if (initial) renderPlan(initial);
presetButtons.forEach((b) => b.classList.toggle("active", b.dataset.worlds === (worldsInput?.value ?? "100")));
renderTotals();
