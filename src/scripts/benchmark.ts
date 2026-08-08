import { benchmarkTests } from "../data/benchmark";
import { readStorage, writeStorage } from "../lib/storage";
import { createBenchmarkStarters as createMemoryStarters } from "./benchmark/01-memory";
import type { BenchmarkTestContext } from "../types/benchmark";
import { createBenchmarkStarters as createSpeedStarters } from "./benchmark/02-speed";
import { createBenchmarkStarters as createLogicStarters } from "./benchmark/03-logic";
const tests = benchmarkTests.filter((test) => test.playable);

const game = document.querySelector<HTMLElement>("#benchmark-game");
const title = document.querySelector<HTMLElement>("#benchmark-title");
const instruction = document.querySelector<HTMLElement>(
  "#benchmark-instruction",
);
const category = document.querySelector<HTMLElement>("#benchmark-category");
const best = document.querySelector<HTMLElement>("#benchmark-best");
const normalReference =
  document.querySelector<HTMLElement>("#benchmark-normal");
const averageReference =
  document.querySelector<HTMLElement>("#benchmark-average");
const professionalReference = document.querySelector<HTMLElement>(
  "#benchmark-professional",
);
const humanBestReference = document.querySelector<HTMLElement>(
  "#benchmark-human-best",
);
const positionReference = document.querySelector<HTMLElement>(
  "#benchmark-position",
);
const resultScore = document.querySelector<HTMLElement>("#result-score");
const resultUnit = document.querySelector<HTMLElement>("#result-unit");
const resultMessage = document.querySelector<HTMLElement>("#result-message");
const startButton =
  document.querySelector<HTMLButtonElement>("#benchmark-start");
const retryButton =
  document.querySelector<HTMLButtonElement>("#benchmark-retry");
const nextButton = document.querySelector<HTMLButtonElement>("#benchmark-next");
const playStatus = document.querySelector<HTMLElement>("#play-status");
const playPrompt = document.querySelector<HTMLElement>("#play-prompt");
const controls = document.querySelector<HTMLElement>("#play-controls");
const welcome = document.querySelector<HTMLElement>('[data-screen="welcome"]');
const playScreen = document.querySelector<HTMLElement>('[data-screen="play"]');
const resultScreen = document.querySelector<HTMLElement>(
  '[data-screen="result"]',
);
const tabs = [
  ...document.querySelectorAll<HTMLButtonElement>(".benchmark-test-tab"),
];

let current = tests[0];
const storageKey = "bai-benchmark-best";
const lowerIsBetter = new Set([
  "reaction",
  "aim",
  "time",
  "coordination",
  "schulte",
]);

const getBest = (id: string): string =>
  String(readStorage<Record<string, number>>(storageKey, {})[id] ?? "—");
const setBest = (id: string, value: number) => {
  const values = readStorage<Record<string, number>>(storageKey, {});
  const previous = values[id];
  const better = lowerIsBetter.has(id)
    ? !previous || value < previous
    : !previous || value > previous;
  if (better) values[id] = value;
  writeStorage(storageKey, values);
};
const formatBest = (value: string) =>
  value === "—" ? value : `${value} ${current.unit}`;
const formatReference = (value: number) => `${value} ${current.unit}`;
const updateReferences = () => {
  const [low, high] = current.normalRange;
  if (normalReference)
    normalReference.textContent = `${formatReference(low)} — ${formatReference(high)}`;
  if (averageReference)
    averageReference.textContent = formatReference(current.average);
  if (professionalReference)
    professionalReference.textContent = formatReference(current.professional);
  if (humanBestReference)
    humanBestReference.textContent = formatReference(current.humanBest);
  if (positionReference) positionReference.hidden = true;
};
const getPosition = (value: number) => {
  const [low, high] = current.normalRange;
  if (value >= low && value <= high) return "正常范围";
  if (current.higherIsBetter) {
    if (value >= current.humanBest) return "接近人类最高水平";
    if (value >= current.professional) return "职业水平";
    if (value > high) return "高于正常范围";
    return "低于正常范围";
  }
  if (value <= current.humanBest) return "接近人类最高水平";
  if (value <= current.professional) return "职业水平";
  if (value < low) return "高于正常范围";
  return "低于正常范围";
};
const showScreen = (screen: "welcome" | "play" | "result") => {
  if (welcome) welcome.hidden = screen !== "welcome";
  if (playScreen) playScreen.hidden = screen !== "play";
  if (resultScreen) resultScreen.hidden = screen !== "result";
};
const clearControls = () => {
  if (controls) controls.replaceChildren();
};
const setPrompt = (status: string, prompt: string) => {
  if (playStatus) playStatus.textContent = status;
  if (playPrompt) playPrompt.textContent = prompt;
};
const categoryName = (id: string) =>
  ({
    reaction: "REACTION",
    number: "NUMBER MEMORY",
    visual: "VISUAL MEMORY",
    typing: "TYPING",
    aim: "AIM",
    stroop: "STROOP",
  })[id] ?? id.toUpperCase();

const selectTest = (id: string) => {
  const selected = tests.find((test) => test.id === id);
  if (!selected) return;
  context.cleanup?.();
  context.cleanup = undefined;
  current = selected;
  context.busy = false;
  tabs.forEach((tab) =>
    tab.classList.toggle("selected", tab.dataset.test === id),
  );
  if (title) title.textContent = selected.title;
  if (instruction) instruction.textContent = selected.intro;
  if (category)
    category.textContent = `${String(tests.indexOf(selected) + 1).padStart(2, "0")} / ${categoryName(selected.id)}`;
  if (best) best.textContent = `最佳：${formatBest(getBest(selected.id))}`;
  updateReferences();
  clearControls();
  showScreen("welcome");
};

const finish = (value: number, message: string) => {
  context.busy = false;
  context.cleanup?.();
  context.cleanup = undefined;
  setBest(current.id, value);
  if (resultScore) resultScore.textContent = String(value);
  if (resultUnit) resultUnit.textContent = current.unit;
  if (resultMessage) resultMessage.textContent = message;
  if (positionReference) {
    positionReference.textContent = `你的定位：${getPosition(value)}（${formatReference(value)}）`;
    positionReference.hidden = false;
  }
  if (best) best.textContent = `最佳：${formatBest(getBest(current.id))}`;
  showScreen("result");
};
const nextTest = () => {
  const index = tests.findIndex((test) => test.id === current.id);
  selectTest(tests[(index + 1) % tests.length].id);
};

const createButton = (text: string, className = "benchmark-secondary") => {
  const button = document.createElement("button");
  button.className = className;
  button.type = "button";
  button.textContent = text;
  return button;
};

const context: BenchmarkTestContext = {
  game,
  playScreen,
  controls,
  busy: false,
  cleanup: undefined,
  finish,
  clearControls,
  setPrompt,
  createButton,
};
const starters = {
  ...createMemoryStarters(context),
  ...createSpeedStarters(context),
  ...createLogicStarters(context),
};

const startCurrent = () => {
  context.cleanup?.();
  game?.classList.remove("reaction-ready");
  clearControls();
  showScreen("play");
  starters[current.id as keyof typeof starters]?.();
};

tabs.forEach((tab) =>
  tab.addEventListener("click", () =>
    selectTest(tab.dataset.test ?? "reaction"),
  ),
);
startButton?.addEventListener("click", startCurrent);
retryButton?.addEventListener("click", startCurrent);
nextButton?.addEventListener("click", nextTest);
selectTest("reaction");
