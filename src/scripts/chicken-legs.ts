const countInput = document.querySelector<HTMLInputElement>("#chicken-count");
const runButton = document.querySelector<HTMLButtonElement>("#chicken-run");
const resetButton = document.querySelector<HTMLButtonElement>("#chicken-reset");
const results = document.querySelector<HTMLElement>("#chicken-results");
const statusMessage = document.querySelector<HTMLElement>("#chicken-status");
const progressLabel = document.querySelector<HTMLElement>(
  "#chicken-progress-label",
);
const progressValue = document.querySelector<HTMLElement>(
  "#chicken-progress-value",
);
const progressBar = document.querySelector<HTMLElement>(
  "#chicken-progress-bar",
);
const twoOutput = document.querySelector<HTMLElement>("#chicken-two");
const oneOutput = document.querySelector<HTMLElement>("#chicken-one");
const zeroOutput = document.querySelector<HTMLElement>("#chicken-zero");
const twoPct = document.querySelector<HTMLElement>("#chicken-two-pct");
const onePct = document.querySelector<HTMLElement>("#chicken-one-pct");
const zeroPct = document.querySelector<HTMLElement>("#chicken-zero-pct");
const insight = document.querySelector<HTMLElement>("#chicken-insight-text");

const setProgress = (percent: number, label: string) => {
  if (progressLabel) progressLabel.textContent = label;
  if (progressValue) progressValue.textContent = `${percent}%`;
  if (progressBar) progressBar.style.width = `${percent}%`;
};
const formatNumber = (value: number) =>
  new Intl.NumberFormat("zh-CN").format(value);
const formatPercent = (value: number, total: number) =>
  `${((value / total) * 100).toFixed(3)}%`;

const runSimulation = async () => {
  if (!countInput) return;
  const total = Math.max(
    10,
    Math.min(1_000_000, Math.floor(Number(countInput.value) || 100_000)),
  );
  countInput.value = String(total);
  runButton?.setAttribute("disabled", "true");
  if (results) results.hidden = true;
  if (statusMessage) statusMessage.textContent = "正在抽取并砍腿…";
  let twoLegs = total;
  let oneLeg = 0;
  const chunk = Math.max(5000, Math.floor(total / 40));
  for (let operation = 0; operation < total; operation += 1) {
    const available = twoLegs + oneLeg;
    if (Math.random() * available < twoLegs) {
      twoLegs -= 1;
      oneLeg += 1;
    } else {
      oneLeg -= 1;
    }
    if (operation % chunk === 0 || operation === total - 1) {
      const percent = Math.round(((operation + 1) / total) * 100);
      setProgress(
        percent,
        `第 ${formatNumber(operation + 1)} / ${formatNumber(total)} 次操作`,
      );
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    }
  }
  const zeroLegs = total - twoLegs - oneLeg;
  if (twoOutput) twoOutput.textContent = formatNumber(twoLegs);
  if (oneOutput) oneOutput.textContent = formatNumber(oneLeg);
  if (zeroOutput) zeroOutput.textContent = formatNumber(zeroLegs);
  if (twoPct) twoPct.textContent = formatPercent(twoLegs, total);
  if (onePct) onePct.textContent = formatPercent(oneLeg, total);
  if (zeroPct) zeroPct.textContent = formatPercent(zeroLegs, total);
  if (insight)
    insight.textContent = `本次模拟中，${formatNumber(twoLegs)} 只完好鸡与 ${formatNumber(zeroLegs)} 只零腿鸡互相接近；理论上的大样本完好鸡比例约为 31.7844%。`;
  if (results) results.hidden = false;
  if (statusMessage)
    statusMessage.textContent = "模拟完成，可以修改数量后再次运行。";
  runButton?.removeAttribute("disabled");
};
const reset = () => {
  if (countInput) countInput.value = "100000";
  if (results) results.hidden = true;
  if (statusMessage) statusMessage.textContent = "设置数量后运行一次模拟";
  setProgress(0, "等待开始");
};
runButton?.addEventListener("click", runSimulation);
resetButton?.addEventListener("click", reset);
