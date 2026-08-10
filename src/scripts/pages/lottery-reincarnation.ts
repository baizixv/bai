import { readStorage, writeStorage } from "../../lib/storage";
import { addCollectedNumber, countUp, deriveOneNumber, fetchDrawSource, fmtAge, fmtMoney, formatOne, initLotteryFx, isBack, randomDraw, renderBalls, renderCollection, renderWinNumber, renderWinSet, runWorlds, slotValue } from "./lottery-fx";
const PRICE = 2; // 每注 2 元
const JACKPOT = 10_000_000; // 头奖固定值：1,000 万（大乐透基本投注头奖口径）
const KEY = "bai-lottery-reincarnation-v2";
const RUN_LIMIT = 8;
const CHUNK = 5000;
type RunRecord = { worlds: number; invested: number; winners: number; won: number };
type Collected = { front: number[]; back: number[] };
type GameState = { totalWorlds: number; totalInvested: number; totalWins: number; totalWon: number; collected: Collected; runs: RunRecord[] };
const initialState: GameState = { totalWorlds: 0, totalInvested: 0, totalWins: 0, totalWon: 0, collected: { front: [], back: [] }, runs: [] };
let state: GameState = readStorage(KEY, initialState);
let running = false;
let collecting = false;
const num = new Intl.NumberFormat("zh-CN");
const q = <T extends HTMLElement>(id: string) => document.querySelector<T>(id);
const startAgeInput = q<HTMLInputElement>("#lottery-start-age"), endAgeInput = q<HTMLInputElement>("#lottery-end-age");
const frequencyButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-frequency]")], presetButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-worlds]")];
const ticketsInput = q<HTMLInputElement>("#lottery-tickets"), worldsInput = q<HTMLInputElement>("#lottery-worlds");
const form = q<HTMLFormElement>("#lottery-settings"), runButton = q<HTMLButtonElement>("#lottery-run"), collectButton = q<HTMLButtonElement>("#lottery-collect-all"), resetButton = q<HTMLButtonElement>("#lottery-reset");
const statusOutput = q<HTMLElement>("#lottery-status"), progressLabel = q<HTMLElement>("#lottery-progress-label"), progressValue = q<HTMLElement>("#lottery-progress-value"), progressBar = q<HTMLElement>("#lottery-progress-bar");
const runningBlock = q<HTMLElement>("#lottery-running"), rollingOutput = q<HTMLElement>("#lottery-rolling");
const planPurchases = q<HTMLElement>("#plan-purchases"), planTickets = q<HTMLElement>("#plan-tickets"), planCost = q<HTMLElement>("#plan-cost");
const collectFront = q<HTMLElement>("#lottery-collect-front"), collectBack = q<HTMLElement>("#lottery-collect-back"), collectProgress = q<HTMLElement>("#lottery-collect-progress");
const report = q<HTMLElement>("#lottery-report"), resultWorlds = q<HTMLElement>("#result-worlds"), resultInvested = q<HTMLElement>("#result-invested"), resultWinners = q<HTMLElement>("#result-winners");
const resultWon = q<HTMLElement>("#result-won"), resultNet = q<HTMLElement>("#result-net"), resultRate = q<HTMLElement>("#result-rate"), resultSummary = q<HTMLElement>("#lottery-result-summary"), resultSource = q<HTMLElement>("#lottery-report-source"), winnersText = q<HTMLElement>("#lottery-winners-text");
const totalWorlds = q<HTMLElement>("#total-worlds"), totalInvested = q<HTMLElement>("#total-invested"), totalWins = q<HTMLElement>("#total-wins"), totalWon = q<HTMLElement>("#total-won"), totalNet = q<HTMLElement>("#total-net"), runLog = q<HTMLElement>("#lottery-run-log");
const winOverlay = q<HTMLElement>("#lottery-win"), winTitle = q<HTMLElement>("#lottery-win-title"), winNumber = q<HTMLElement>("#lottery-win-number"), winBasis = q<HTMLElement>("#lottery-win-basis"), winNote = q<HTMLElement>("#lottery-win-note"), winMeta = q<HTMLElement>("#lottery-win-meta"), winClose = q<HTMLButtonElement>("#lottery-win-close");
const fx = initLotteryFx();
type WinRecord = { world: number; age: number; ticket: number; number: number; added: boolean };
const isComplete = () => state.collected.front.length === 5 && state.collected.back.length === 2;
const set = (el: HTMLElement | null, value: string) => {
  if (el) el.textContent = value;
};
const readSettings = (): { startAge: number; endAge: number; frequency: number; tickets: number; worlds: number } | null => {
  const startAge = Number(startAgeInput?.value ?? 30);
  const endAge = Number(endAgeInput?.value ?? 50);
  const frequency = Number(frequencyButtons.find((b) => b.classList.contains("active"))?.dataset.frequency ?? 1);
  const tickets = Number(ticketsInput?.value ?? 1);
  const worlds = Number(worldsInput?.value ?? 100);
  const invalid = (bad: boolean, msg: string) => {
    if (bad && statusOutput) statusOutput.textContent = msg;
    return bad;
  };
  if (invalid(!(startAge >= 1 && endAge <= 120 && startAge < endAge), "年龄区间无效：开始年龄需小于结束年龄（1—120 岁）。")) return null;
  if (invalid(!(frequency >= 1 && frequency <= 3), "每周购买次数无效：支持 1—3 次。")) return null;
  if (invalid(!(tickets >= 1 && tickets <= 20), "注数无效：每次购买需在 1—20 注之间。")) return null;
  if (invalid(!(worlds >= 1 && worlds <= 100_000), "平行世界数无效：支持 1—100,000。")) return null;
  return { startAge, endAge, frequency, tickets, worlds };
};
const computePlan = (s: { startAge: number; endAge: number; frequency: number; tickets: number }) => {
  const weeks = (s.endAge - s.startAge) * 52;
  const tickets = weeks * s.frequency * s.tickets;
  return { weeks, purchases: weeks * s.frequency, tickets, ticketsPerWeek: s.frequency * s.tickets, cost: tickets * PRICE };
};
const renderPlan = (s: { startAge: number; endAge: number; frequency: number; tickets: number; worlds: number }) => {
  const plan = computePlan(s);
  set(planPurchases, `${num.format(plan.purchases)} 次`);
  set(planTickets, `${num.format(plan.tickets)} 注`);
  set(planCost, fmtMoney(plan.cost));
  if (runButton) runButton.textContent = "开始模拟";
};
const renderTotals = () => {
  set(totalWorlds, num.format(state.totalWorlds));
  set(totalInvested, fmtMoney(state.totalInvested));
  set(totalWins, num.format(state.totalWins));
  set(totalWon, fmtMoney(state.totalWon));
  set(totalNet, fmtMoney(state.totalWon - state.totalInvested));
  renderCollection(collectFront, collectBack, collectProgress, state.collected.front, state.collected.back);
  if (!runLog) return;
  runLog.textContent = "";
  if (state.runs.length === 0) { const li = document.createElement("li"); li.className = "lottery-run-empty"; li.textContent = "还没有模拟记录"; runLog.append(li); return; }
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
const setProgress = (ratio: number) => {
  if (progressBar) progressBar.style.width = `${(ratio * 100).toFixed(1)}%`;
  if (progressValue) progressValue.textContent = `${(ratio * 100).toFixed(0)}%`;
};
const animateResults = (worlds: number, invested: number, winners: number, won: number) => {
  countUp(resultWorlds, worlds, (v) => num.format(Math.round(v)));
  countUp(resultInvested, invested, (v) => fmtMoney(Math.round(v)));
  countUp(resultWinners, winners, (v) => num.format(Math.round(v)));
  countUp(resultWon, won, (v) => fmtMoney(Math.round(v)));
  countUp(resultNet, won - invested, (v) => fmtMoney(Math.round(v)));
  countUp(resultRate, invested > 0 ? (won / invested) * 100 : 0, (v) => `${v.toFixed(1)}%`);
};
const renderResult = (worlds: number, plan: { purchases: number; tickets: number; cost: number }, winners: WinRecord[], invested: number, won: number, source: { hash: string; height: string } | null) => {
  if (report) report.hidden = false;
  set(resultWorlds, num.format(worlds));
  set(resultInvested, fmtMoney(invested));
  set(resultWinners, `${winners.length} 个世界`);
  set(resultWon, fmtMoney(won));
  if (resultNet) { resultNet.textContent = fmtMoney(won - invested); resultNet.classList.toggle("lottery-net-negative", won - invested < 0); resultNet.classList.toggle("lottery-net-positive", won - invested > 0); }
  set(resultRate, invested > 0 ? `${((won / invested) * 100).toFixed(1)}%` : "—");
  set(resultSummary, `每个世界 ${num.format(plan.purchases)} 次购买 · ${num.format(plan.tickets)} 注 · ${fmtMoney(plan.cost)} · 头奖 ${fmtMoney(JACKPOT)}`);
  set(resultSource, source ? `幸运号码来源：区块 #${source.height} · ${source.hash.slice(0, 14)}… · SHA-256(区块哈希:世界:票号) 派生` : "幸运号码来源：本地随机（未获取到区块源）");
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
  set(winBasis, source ? `开奖依据：区块 #${source.height} · ${source.hash.slice(0, 14)}… · 世界 ${num.format(first.world)} 第 ${num.format(first.ticket)} 张票 · SHA-256 派生` : "开奖依据：本地随机（未获取到区块源）");
  set(winNote, isComplete() && first.added ? "🎉 幸运号码全部集齐！" : first.added ? "新号码已收入收集板" : "重复号码，未新增");
  set(winMeta, `投入 ${fmtMoney(invested)} · 奖金 ${fmtMoney(won)} · 头奖 ${fmtMoney(JACKPOT)}`);
  winOverlay.hidden = false;
  fx.launchFireworks();
};
const showCompleteOverlay = (worlds: number, invested: number, wins: number) => {
  if (!winOverlay) return;
  if (winTitle) winTitle.innerHTML = "🎉 幸运号码<br /><span>全部集齐！</span>";
  renderWinSet(winNumber, state.collected.front, state.collected.back);
  set(winBasis, `本次共模拟 ${num.format(worlds)} 个世界 · 投入 ${fmtMoney(invested)} · 中奖 ${wins} 次`);
  set(winNote, "7 个号码全部收集完成，重置后可重新挑战。");
  set(winMeta, "");
  winOverlay.hidden = false;
  fx.launchFireworks();
};
const deriveWinners = async (raw: { world: number; age: number; ticket: number }[], source: { hash: string; height: string } | null): Promise<WinRecord[]> => {
  const result: WinRecord[] = [];
  for (const w of raw) {
    const n = await deriveOneNumber(source, w.world, w.ticket);
    const added = addCollectedNumber(state.collected.front, state.collected.back, n);
    state.collected = added;
    result.push({ world: w.world, age: w.age, ticket: w.ticket, number: n, added: added.added });
  }
  renderCollection(collectFront, collectBack, collectProgress, state.collected.front, state.collected.back);
  return result;
};
const execute = async () => {
  if (running || collecting) return;
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
  set(rollingOutput, "已模拟 0 个世界");
  progressBar?.classList.add("lottery-running-bar");
  set(statusOutput, `正在开奖：${num.format(settings.worlds)} 个平行世界…`);
  setProgress(0);
  const rawWinners = [];
  let done = 0;
  while (done < settings.worlds) {
    const batch = Math.min(CHUNK, settings.worlds - done);
    const found = runWorlds(batch, plan.tickets, plan.ticketsPerWeek, settings.startAge);
    rawWinners.push(...found.map((w) => ({ world: w.world + done, age: w.age, ticket: w.ticket })));
    done += batch;
    setProgress(done / settings.worlds);
    countUp(rollingOutput, done, (v) => `已模拟 ${num.format(Math.round(v))} 个世界`, 300);
    set(progressLabel, "模拟中…");
    if (done < settings.worlds) await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  const elapsed = performance.now() - startedAt;
  if (elapsed < 800) await new Promise((resolve) => window.setTimeout(resolve, 800 - elapsed));
  if (runningBlock) runningBlock.hidden = true;
  progressBar?.classList.remove("lottery-running-bar");
  const source = await sourcePromise;
  const winners = await deriveWinners(rawWinners, source);
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
  renderResult(settings.worlds, plan, winners, invested, won, source);
  animateResults(settings.worlds, invested, winners.length, won);
  set(progressLabel, "模拟完成");
  set(statusOutput, winners.length > 0 ? `🎉 ${winners.length} 个世界命中头奖！` : `模拟完成：${num.format(settings.worlds)} 个世界全部未中头奖。`);
  if (runButton) runButton.disabled = false;
  running = false;
  if (winners.length > 0) showWin(winners, source, invested, won);
};
const collectAll = async () => {
  if (collecting) {
    collecting = false;
    return;
  }
  if (running) return;
  const settings = readSettings();
  if (!settings) return;
  if (isComplete()) {
    set(statusOutput, "幸运号码已集齐，重置后可重新收集。");
    return;
  }
  collecting = true;
  const plan = computePlan(settings);
  if (collectButton) collectButton.textContent = "停止连抽";
  if (runButton) runButton.disabled = true;
  if (winOverlay) winOverlay.hidden = true;
  if (report) report.hidden = true;
  if (runningBlock) runningBlock.hidden = false;
  renderBalls(q("#lottery-balls"), randomDraw());
  progressBar?.classList.add("lottery-running-bar");
  const source = await fetchDrawSource();
  const session = { worlds: 0, invested: 0, wins: 0, won: 0 };
  while (collecting && !isComplete()) {
    const found = runWorlds(CHUNK, plan.tickets, plan.ticketsPerWeek, settings.startAge);
    session.worlds += CHUNK;
    session.invested += CHUNK * plan.cost;
    session.wins += found.length;
    session.won += found.length * JACKPOT;
    for (const w of found) {
      const n = await deriveOneNumber(source, w.world, w.ticket);
      const r = addCollectedNumber(state.collected.front, state.collected.back, n);
      state.collected = r;
      if (r.added) set(statusOutput, `🎉 号码 ${formatOne(slotValue(n))}（${isBack(n) ? "后区" : "前区"}）已收入收集板`);
    }
    renderCollection(collectFront, collectBack, collectProgress, state.collected.front, state.collected.back);
    set(rollingOutput, `已模拟 ${num.format(session.worlds)} 个世界`);
    set(progressLabel, "幸运号码连抽中…");
    setProgress((state.collected.front.length + state.collected.back.length) / 7);
    if (session.worlds % (CHUNK * 20) === 0) writeStorage(KEY, state);
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  collecting = false;
  state.totalWorlds += session.worlds;
  state.totalInvested += session.invested;
  state.totalWins += session.wins;
  state.totalWon += session.won;
  state.runs.push({ worlds: session.worlds, invested: session.invested, winners: session.wins, won: session.won });
  if (state.runs.length > RUN_LIMIT) state.runs.shift();
  writeStorage(KEY, state);
  renderTotals();
  if (runningBlock) runningBlock.hidden = true;
  progressBar?.classList.remove("lottery-running-bar");
  if (runButton) runButton.disabled = false;
  if (collectButton) collectButton.textContent = "幸运号码连抽";
  renderResult(session.worlds, plan, [], session.invested, session.won, source);
  if (isComplete()) {
    set(statusOutput, `🎉 集齐 7 个幸运号码！共模拟 ${num.format(session.worlds)} 个世界。`);
    showCompleteOverlay(session.worlds, session.invested, session.wins);
  } else {
    set(statusOutput, `已停止连抽：共模拟 ${num.format(session.worlds)} 个世界，已收集 ${state.collected.front.length + state.collected.back.length}/7。`);
  }
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
collectButton?.addEventListener("click", () => void collectAll());
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
  set(statusOutput, "累计记录与幸运号码已清空。");
});
winClose?.addEventListener("click", () => {
  if (winOverlay) winOverlay.hidden = true;
});
const initial = readSettings();
if (initial) renderPlan(initial);
presetButtons.forEach((b) => b.classList.toggle("active", b.dataset.worlds === (worldsInput?.value ?? "100")));
renderTotals();