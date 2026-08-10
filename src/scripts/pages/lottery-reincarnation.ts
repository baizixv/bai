import { readStorage, writeStorage } from "../../lib/storage";
import { initLotteryFx } from "./lottery-fx";

const ODDS = 21_425_712; // 大乐透头奖概率
const PRICE = 2; // 每注 2 元
const KEY = "bai-lottery-reincarnation-v2";
const RUN_LIMIT = 8;

type RunRecord = { worlds: number; invested: number; winners: number; won: number };
type GameState = { totalWorlds: number; totalInvested: number; totalWins: number; totalWon: number; runs: RunRecord[] };
const initialState: GameState = { totalWorlds: 0, totalInvested: 0, totalWins: 0, totalWon: 0, runs: [] };
let state: GameState = readStorage(KEY, initialState);
let running = false;

const num = new Intl.NumberFormat("zh-CN");
const q = <T extends HTMLElement>(id: string) => document.querySelector<T>(id);
const startAgeInput = q<HTMLInputElement>("#lottery-start-age");
const endAgeInput = q<HTMLInputElement>("#lottery-end-age");
const frequencyInput = q<HTMLInputElement>("#lottery-frequency");
const ticketsInput = q<HTMLInputElement>("#lottery-tickets");
const jackpotInput = q<HTMLInputElement>("#lottery-jackpot");
const worldsInput = q<HTMLInputElement>("#lottery-worlds");
const presetButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-worlds]")];
const form = q<HTMLFormElement>("#lottery-settings");
const runButton = q<HTMLButtonElement>("#lottery-run");
const resetButton = q<HTMLButtonElement>("#lottery-reset");
const statusOutput = q<HTMLElement>("#lottery-status");
const progressLabel = q<HTMLElement>("#lottery-progress-label");
const progressValue = q<HTMLElement>("#lottery-progress-value");
const progressBar = q<HTMLElement>("#lottery-progress-bar");
const planPurchases = q<HTMLElement>("#plan-purchases");
const planTickets = q<HTMLElement>("#plan-tickets");
const planCost = q<HTMLElement>("#plan-cost");
const results = q<HTMLElement>("#lottery-results");
const resultWorlds = q<HTMLElement>("#result-worlds");
const resultInvested = q<HTMLElement>("#result-invested");
const resultWinners = q<HTMLElement>("#result-winners");
const resultWon = q<HTMLElement>("#result-won");
const resultNet = q<HTMLElement>("#result-net");
const resultRate = q<HTMLElement>("#result-rate");
const resultSummary = q<HTMLElement>("#lottery-result-summary");
const winnersBlock = q<HTMLElement>("#lottery-winners");
const winnersText = q<HTMLElement>("#lottery-winners-text");
const totalWorlds = q<HTMLElement>("#total-worlds");
const totalInvested = q<HTMLElement>("#total-invested");
const totalWins = q<HTMLElement>("#total-wins");
const totalWon = q<HTMLElement>("#total-won");
const totalNet = q<HTMLElement>("#total-net");
const runLog = q<HTMLElement>("#lottery-run-log");
const winOverlay = q<HTMLElement>("#lottery-win");
const winTitle = q<HTMLElement>("#lottery-win-title");
const winMeta = q<HTMLElement>("#lottery-win-meta");
const winClose = q<HTMLButtonElement>("#lottery-win-close");
const fx = initLotteryFx();

const fmtMoney = (value: number): string => {
  const sign = value < 0 ? "-" : "";
  const v = Math.abs(value);
  if (v >= 1e8) return `${sign}${v / 1e8 >= 100 ? Math.round(v / 1e8) : (v / 1e8).toFixed(1)} 亿`;
  if (v >= 1e4) return `${sign}${v / 1e4 >= 1000 ? Math.round(v / 1e4) : (v / 1e4).toFixed(1)} 万`;
  return `${sign}${Math.round(v)} 元`;
};

const readSettings = (): { startAge: number; endAge: number; frequency: number; tickets: number; jackpot: number; worlds: number } | null => {
  const startAge = Number(startAgeInput?.value ?? 30);
  const endAge = Number(endAgeInput?.value ?? 50);
  const frequency = Number(frequencyInput?.value ?? 3);
  const tickets = Number(ticketsInput?.value ?? 1);
  const jackpot = Number(jackpotInput?.value ?? 10_000_000);
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
  if (!(jackpot >= 10_000)) {
    if (statusOutput) statusOutput.textContent = "头奖金额无效：至少 1 万元。";
    return null;
  }
  if (!(worlds >= 1 && worlds <= 100_000)) {
    if (statusOutput) statusOutput.textContent = "平行世界数无效：支持 1—100,000。";
    return null;
  }
  return { startAge, endAge, frequency, tickets, jackpot, worlds };
};

const computePlan = (s: { startAge: number; endAge: number; frequency: number; tickets: number }) => {
  const weeks = (s.endAge - s.startAge) * 52;
  const purchases = weeks * s.frequency;
  const tickets = purchases * s.tickets;
  const ticketsPerWeek = s.frequency * s.tickets;
  return { weeks, purchases, tickets, ticketsPerWeek, cost: tickets * PRICE };
};

const renderPlan = (s: { startAge: number; endAge: number; frequency: number; tickets: number; jackpot: number; worlds: number }) => {
  const plan = computePlan(s);
  if (planPurchases) planPurchases.textContent = `${num.format(plan.purchases)} 次`;
  if (planTickets) planTickets.textContent = `${num.format(plan.tickets)} 注`;
  if (planCost) planCost.textContent = fmtMoney(plan.cost);
  if (runButton) runButton.textContent = `开始模拟 ${num.format(s.worlds)} 个平行世界`;
};

const renderTotals = () => {
  if (totalWorlds) totalWorlds.textContent = num.format(state.totalWorlds);
  if (totalInvested) totalInvested.textContent = fmtMoney(state.totalInvested);
  if (totalWins) totalWins.textContent = num.format(state.totalWins);
  if (totalWon) totalWon.textContent = fmtMoney(state.totalWon);
  if (totalNet) totalNet.textContent = fmtMoney(state.totalWon - state.totalInvested);
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
    name.textContent = `第 ${state.runs.length - index} 次 · ${num.format(run.worlds)} 世`;
    const detail = document.createElement("b");
    detail.textContent = `投入 ${fmtMoney(run.invested)} · 中奖 ${run.winners} 世 · ${fmtMoney(run.won - run.invested)}`;
    li.append(name, detail);
    runLog.append(li);
  });
};

const fmtAge = (age: number) => age.toFixed(1).replace(/\.0$/, "");

type WinRecord = { world: number; age: number };
const runWorlds = (n: number, ticketsPerLife: number, ticketsPerWeek: number, startAge: number): WinRecord[] => {
  const winners: WinRecord[] = [];
  for (let w = 0; w < n; w++) {
    for (let t = 0; t < ticketsPerLife; t++) {
      if (Math.floor(Math.random() * ODDS) + 1 === 1) {
        winners.push({ world: w + 1, age: startAge + Math.floor(t / ticketsPerWeek) / 52 });
        break;
      }
    }
  }
  return winners;
};

const setProgress = (ratio: number) => {
  if (progressBar) progressBar.style.width = `${(ratio * 100).toFixed(1)}%`;
  if (progressValue) progressValue.textContent = `${(ratio * 100).toFixed(0)}%`;
};

const renderResult = (worlds: number, plan: { purchases: number; tickets: number; cost: number }, jackpot: number, winners: WinRecord[], invested: number, won: number) => {
  if (results) results.hidden = false;
  if (resultWorlds) resultWorlds.textContent = num.format(worlds);
  if (resultInvested) resultInvested.textContent = fmtMoney(invested);
  if (resultWinners) resultWinners.textContent = `${winners.length} 世`;
  if (resultWon) resultWon.textContent = fmtMoney(won);
  if (resultNet) {
    resultNet.textContent = fmtMoney(won - invested);
    resultNet.classList.toggle("lottery-net-negative", won - invested < 0);
    resultNet.classList.toggle("lottery-net-positive", won - invested > 0);
  }
  if (resultRate) resultRate.textContent = invested > 0 ? `${((won / invested) * 100).toFixed(1)}%` : "—";
  if (resultSummary) resultSummary.textContent = `每世 ${num.format(plan.purchases)} 次购买 · ${num.format(plan.tickets)} 注 · ${fmtMoney(plan.cost)} · 头奖 ${fmtMoney(jackpot)}`;
  if (!winnersBlock || !winnersText) return;
  winnersBlock.hidden = winners.length === 0;
  winnersText.textContent = winners.length > 0 ? `中奖世界：${winners.slice(0, 8).map((w) => `#${num.format(w.world)} 号 · 约 ${fmtAge(w.age)} 岁`).join("、")}${winners.length > 8 ? ` 等 ${winners.length} 个` : ""}` : "";
};

const showWin = (winners: WinRecord[], settings: { jackpot: number }, invested: number, won: number) => {
  if (!winOverlay) return;
  const first = winners[0];
  if (winTitle) {
    winTitle.innerHTML =
      winners.length === 1
        ? `第 <span>${num.format(first.world)}</span> 号世界在约 <span>${fmtAge(first.age)}</span> 岁中了头奖！`
        : `<span>${winners.length}</span> 个平行世界中奖！最早约 ${fmtAge(first.age)} 岁`;
  }
  if (winMeta) winMeta.textContent = `投入 ${fmtMoney(invested)} · 奖金 ${fmtMoney(won)} · 头奖 ${fmtMoney(settings.jackpot)}`;
  winOverlay.hidden = false;
  fx.launchFireworks();
};

const execute = async () => {
  if (running) return;
  const settings = readSettings();
  if (!settings) return;
  running = true;
  const plan = computePlan(settings);
  if (runButton) runButton.disabled = true;
  if (winOverlay) winOverlay.hidden = true;
  if (results) results.hidden = true;
  if (statusOutput) statusOutput.textContent = `正在模拟 ${num.format(settings.worlds)} 个平行世界…`;
  setProgress(0);
  const winners: WinRecord[] = [];
  const CHUNK = 5000;
  let done = 0;
  while (done < settings.worlds) {
    const batch = Math.min(CHUNK, settings.worlds - done);
    const found = runWorlds(batch, plan.tickets, plan.ticketsPerWeek, settings.startAge);
    winners.push(...found.map((w) => ({ world: w.world + done, age: w.age })));
    done += batch;
    setProgress(done / settings.worlds);
    if (progressLabel) progressLabel.textContent = `模拟中… 世界 ${num.format(done)} / ${num.format(settings.worlds)}`;
    if (done < settings.worlds) await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  const invested = plan.cost * settings.worlds;
  const won = winners.length * settings.jackpot;
  state.totalWorlds += settings.worlds;
  state.totalInvested += invested;
  state.totalWins += winners.length;
  state.totalWon += won;
  state.runs.push({ worlds: settings.worlds, invested, winners: winners.length, won });
  if (state.runs.length > RUN_LIMIT) state.runs.shift();
  writeStorage(KEY, state);
  renderTotals();
  renderResult(settings.worlds, plan, settings.jackpot, winners, invested, won);
  if (progressLabel) progressLabel.textContent = "模拟完成";
  if (statusOutput) statusOutput.textContent = winners.length > 0 ? `🎉 ${winners.length} 个世界命中头奖！` : `模拟完成：${num.format(settings.worlds)} 个世界全部未中头奖。`;
  if (runButton) runButton.disabled = false;
  running = false;
  if (winners.length > 0) showWin(winners, settings, invested, won);
};

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (worldsInput) worldsInput.value = button.dataset.worlds ?? "100";
    void execute();
  });
});
form?.addEventListener("submit", (event) => {
  event.preventDefault();
  void execute();
});
[startAgeInput, endAgeInput, frequencyInput, ticketsInput, jackpotInput, worldsInput].forEach((input) => {
  input?.addEventListener("input", () => {
    const settings = readSettings();
    if (settings) renderPlan(settings);
  });
});
resetButton?.addEventListener("click", () => {
  if (state.totalWorlds > 0 && !window.confirm("确定要清空所有累计记录吗？")) return;
  state = { ...initialState };
  writeStorage(KEY, state);
  renderTotals();
  if (statusOutput) statusOutput.textContent = "累计记录已清空。";
});
winClose?.addEventListener("click", () => {
  if (winOverlay) winOverlay.hidden = true;
});

const initial = readSettings();
if (initial) renderPlan(initial);
renderTotals();
