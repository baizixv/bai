const DEATH_PROBABILITY = 1e-8;
const MONEY_PER_SECOND = 100_000_000_000n;
const SECOND = 1;
const DAY = 86_400;
const MONTH = 2_592_000;
const YEAR = 31_536_000;
const thresholds = [DAY, MONTH, YEAR, YEAR * 3, YEAR * 10, YEAR * 20];

const actionButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-count]")];
const resetButton = document.querySelector<HTMLButtonElement>("#wealth-reset");
const results = document.querySelector<HTMLElement>("#wealth-results");
const wealthStatus = document.querySelector<HTMLElement>("#wealth-status");
const stageTitle = document.querySelector<HTMLElement>("#wealth-stage-title");
const countOutput = document.querySelector<HTMLElement>("#wealth-count");
const averageOutput = document.querySelector<HTMLElement>("#wealth-average");
const maximumOutput = document.querySelector<HTMLElement>("#wealth-maximum");
const moneyOutput = document.querySelector<HTMLElement>("#wealth-money");
const survivorOutput = document.querySelector<HTMLElement>("#wealth-survivors");
const verdictOutput = document.querySelector<HTMLElement>("#wealth-verdict-text");
const barRows = [...document.querySelectorAll<HTMLElement>("[data-bin]")];

const numberFormat = new Intl.NumberFormat("zh-CN");
const sampleLifetime = () =>
  Math.max(0, Math.floor(Math.log1p(-Math.random()) / Math.log1p(-DEATH_PROBABILITY)));

const formatTime = (value: number) => {
  if (value < 60 * SECOND) return `${value} 秒`;
  if (value < 3_600) return `${(value / 60).toFixed(1)} 分钟`;
  if (value < DAY) return `${(value / 3_600).toFixed(1)} 小时`;
  if (value < YEAR) return `${(value / DAY).toFixed(1)} 天`;
  const years = Math.floor(value / YEAR);
  const days = Math.floor((value % YEAR) / DAY);
  return days ? `${years} 年 ${days} 天` : `${years} 年`;
};

const moneyUnits = [
  [10n ** 24n, "秭"],
  [10n ** 20n, "垓"],
  [10n ** 16n, "京"],
  [10n ** 12n, "万亿"],
  [10n ** 8n, "亿"],
] as const;

const formatMoney = (value: bigint) => {
  const [unit, label] = moneyUnits.find(([unitValue]) => value >= unitValue) ?? [1n, "元"];
  const whole = value / unit;
  const decimal = ((value % unit) * 100n) / unit;
  return `¥ ${numberFormat.format(whole)}.${decimal.toString().padStart(2, "0")} ${label}`;
};

const getBin = (seconds: number) => {
  const index = thresholds.findIndex((threshold) => seconds < threshold);
  return index === -1 ? thresholds.length : index;
};

const setBusy = (busy: boolean, activeCount?: number) => {
  actionButtons.forEach((button) => {
    button.disabled = busy;
    button.classList.toggle("active", Number(button.dataset.count) === activeCount);
  });
};

const updateDistribution = (bins: number[], total: number) => {
  const max = Math.max(...bins, 1);
  barRows.forEach((row, index) => {
    const count = bins[index] ?? 0;
    const percent = (count / total) * 100;
    const bar = row.querySelector<HTMLElement>(".wealth-bar-track span");
    const countElement = row.querySelector<HTMLElement>(".wealth-bar-value strong");
    const percentElement = row.querySelector<HTMLElement>(".wealth-bar-value small");
    if (bar) bar.style.width = `${(count / max) * 100}%`;
    if (countElement) countElement.textContent = numberFormat.format(count);
    if (percentElement) percentElement.textContent = `${percent.toFixed(2)}%`;
  });
};

const runSimulation = async (total: number) => {
  setBusy(true, total);
  if (wealthStatus) wealthStatus.textContent = `正在展开 ${numberFormat.format(total)} 个平行世界…`;
  if (stageTitle) stageTitle.textContent = "命运正在进行一亿分之一的判定。";
  if (results) results.hidden = true;
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));

  const bins = new Array<number>(7).fill(0);
  let sum = 0;
  let maximum = 0;
  for (let index = 0; index < total; index += 1) {
    const lifetime = sampleLifetime();
    sum += lifetime;
    maximum = Math.max(maximum, lifetime);
    bins[getBin(lifetime)] += 1;
  }

  const average = Math.floor(sum / total);
  const overTenYears = bins[5] + bins[6];
  if (countOutput) countOutput.textContent = numberFormat.format(total);
  if (averageOutput) averageOutput.textContent = formatTime(average);
  if (maximumOutput) maximumOutput.textContent = formatTime(maximum);
  if (moneyOutput) moneyOutput.textContent = formatMoney(BigInt(sum) * MONEY_PER_SECOND);
  if (survivorOutput) survivorOutput.textContent = `${numberFormat.format(overTenYears)} 人活过 10 年`;
  updateDistribution(bins, total);

  const unlucky = bins[0];
  if (verdictOutput) verdictOutput.textContent = total === 1
    ? `这个世界里的你存活了 ${formatTime(maximum)}，并获得 ${formatMoney(BigInt(maximum) * MONEY_PER_SECOND)}。再按一次，命运可能完全不同。`
    : `${numberFormat.format(unlucky)} 人没能撑过第一天，${numberFormat.format(overTenYears)} 人活过了十年。本次平均值为 ${formatTime(average)}。`;
  if (wealthStatus) wealthStatus.textContent = "判定完成 · 契约已经结算";
  if (stageTitle) stageTitle.textContent = `${numberFormat.format(total)} 段命运已经写完。`;
  if (results) results.hidden = false;
  setBusy(false, total);
  results?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const reset = () => {
  setBusy(false);
  if (results) results.hidden = true;
  if (wealthStatus) wealthStatus.textContent = "等待你签下这份契约";
  if (stageTitle) stageTitle.textContent = "每一次选择，都会产生一组新的命运。";
};

actionButtons.forEach((button) => button.addEventListener("click", () => runSimulation(Number(button.dataset.count))));
resetButton?.addEventListener("click", reset);

export {};
