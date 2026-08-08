import { readStorage, writeStorage } from "../lib/storage";

type Word = {
  id: string;
  word: string;
  phonetic?: string;
  chinese: string;
  category: string;
  icon?: string;
  frequency?: number;
  basic_explanation?: string;
  examples?: { en: string; zh: string; type: string }[];
};

let allWords: Word[] = [];
let filtered: Word[] = [];
let category = "all";
let mode = "browse";
let selected = 0;
let showAnswer = false;
let spellingAnswer = "";

const search = document.querySelector<HTMLInputElement>("#ogden-search");
const content = document.querySelector<HTMLElement>("#ogden-content");
const stageCount = document.querySelector<HTMLElement>("#ogden-stage-count");
const stageLabel = document.querySelector<HTMLElement>("#ogden-stage-label");
const favorites = new Set<string>(readStorage<string[]>("ogden-favorites", []));
const progress = new Set<string>(readStorage<string[]>("ogden-progress", []));

const save = () => {
  writeStorage("ogden-favorites", [...favorites]);
  writeStorage("ogden-progress", [...progress]);
};
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char] || char,
  );
const current = () => filtered[selected % Math.max(filtered.length, 1)];
const categoryCount = (key: string) =>
  key === "all"
    ? allWords.length
    : allWords.filter((word) => word.category === key).length;

const updateCategoryCounts = () => {
  document
    .querySelectorAll<HTMLElement>(".ogden-category")
    .forEach((button) => {
      const span = button.querySelector("span");
      if (span)
        span.textContent = String(
          categoryCount(button.dataset.category || "all"),
        );
    });
};

const wordCard = (word: Word) => `<article class="ogden-word-card">
  <div class="ogden-word-top"><span class="ogden-word-icon">${word.icon || "✦"}</span><button class="ogden-favorite ${favorites.has(word.id) ? "saved" : ""}" data-favorite="${word.id}" type="button">${favorites.has(word.id) ? "♥" : "♡"}</button></div>
  <div class="ogden-word-heading"><h2>${escapeHtml(word.word)}</h2><button class="ogden-speak" data-speak="${escapeHtml(word.word)}" type="button" aria-label="朗读">🔊</button></div>
  <p class="ogden-phonetic">${escapeHtml(word.phonetic || "")}</p><p class="ogden-chinese">${escapeHtml(word.chinese)}</p>
  <div class="ogden-word-meta"><span>${escapeHtml(word.category)}</span><span>${"●".repeat(Math.min(word.frequency || 1, 5))}</span></div>
  <p class="ogden-explanation">${escapeHtml(word.basic_explanation || "用基础词汇和组合表达理解这个词。")}</p>
  ${word.examples?.[0] ? `<div class="ogden-example"><span>BASIC</span><p>${escapeHtml(word.examples[0].en)}</p><small>${escapeHtml(word.examples[0].zh)}</small></div>` : ""}
</article>`;

const browse = () => {
  if (stageCount) stageCount.textContent = `${filtered.length} WORDS`;
  if (stageLabel)
    stageLabel.textContent =
      category === "all" ? "850 WORDS" : category.toUpperCase();
  if (content)
    content.innerHTML = filtered.length
      ? `<div class="ogden-word-grid">${filtered.slice(0, 18).map(wordCard).join("")}</div>`
      : '<div class="ogden-empty">没有找到匹配的词。换个关键词试试。</div>';
};

const practice = () => {
  const word = current();
  if (!word || !content) return;
  if (stageCount)
    stageCount.textContent = `${selected + 1} / ${filtered.length}`;
  if (stageLabel) stageLabel.textContent = mode.toUpperCase();
  if (mode === "flashcard") {
    content.innerHTML = `<div class="ogden-practice-card"><span class="ogden-practice-label">FLASHCARD</span><div class="ogden-practice-word">${showAnswer ? `<strong>${escapeHtml(word.word)}</strong><small>${escapeHtml(word.phonetic || "")}</small><p>${escapeHtml(word.chinese)}</p>` : `<strong>${word.icon || "✦"}</strong><p>你知道这个词吗？</p>`}</div><button class="benchmark-primary" id="practice-reveal" type="button">${showAnswer ? "记住了，下一张" : "显示答案"} ↗</button></div>`;
  } else if (mode === "choice") {
    const options = [
      word,
      ...allWords
        .filter((item) => item.id !== word.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3),
    ].sort(() => Math.random() - 0.5);
    content.innerHTML = `<div class="ogden-practice-card"><span class="ogden-practice-label">MULTIPLE CHOICE</span><div class="ogden-practice-word"><strong>${escapeHtml(word.word)}</strong><small>${escapeHtml(word.phonetic || "")}</small></div><div class="ogden-choice-grid">${options.map((option) => `<button class="ogden-choice" data-answer="${option.id}" type="button">${escapeHtml(option.chinese)}</button>`).join("")}</div><p class="ogden-feedback" id="ogden-feedback"></p></div>`;
  } else if (mode === "expression") {
    const example = word.examples?.[0];
    content.innerHTML = `<div class="ogden-practice-card"><span class="ogden-practice-label">BUILD AN EXPRESSION</span><div class="ogden-practice-word"><strong>${escapeHtml(word.word)}</strong><small>${escapeHtml(word.chinese)}</small><p>${escapeHtml(example?.zh || "用这个词写一个简单句子")}</p></div><div class="ogden-expression-hint">${escapeHtml(example?.en || `Try to use “${word.word}” in a sentence.`)}</div><textarea class="ogden-expression-input" id="expression-input" rows="3" placeholder="Write your own sentence..."></textarea><button class="benchmark-primary" id="expression-check" type="button">完成练习 ✓</button><p class="ogden-feedback" id="ogden-feedback"></p></div>`;
  } else {
    content.innerHTML = `<div class="ogden-practice-card"><span class="ogden-practice-label">SPELLING</span><div class="ogden-practice-word"><strong>${escapeHtml(word.chinese)}</strong><small>输入对应的英文单词</small></div><input class="ogden-spelling-input" id="spelling-input" value="${escapeHtml(spellingAnswer)}" placeholder="type the word" autocomplete="off" /><button class="benchmark-primary" id="spelling-check" type="button">检查 ✓</button><p class="ogden-feedback" id="ogden-feedback"></p></div>`;
  }
};
const render = () => (mode === "browse" ? browse() : practice());
const applyFilters = () => {
  const query = search?.value.trim().toLowerCase() || "";
  filtered = allWords.filter(
    (word) =>
      (category === "all" || word.category === category) &&
      (!query ||
        word.word.toLowerCase().includes(query) ||
        word.chinese.includes(query) ||
        (word.phonetic || "").includes(query)),
  );
  selected = 0;
  render();
};

document
  .querySelectorAll<HTMLButtonElement>(".ogden-category")
  .forEach((button) =>
    button.addEventListener("click", () => {
      category = button.dataset.category || "all";
      document
        .querySelector(".ogden-category.active")
        ?.classList.remove("active");
      button.classList.add("active");
      applyFilters();
    }),
  );
document.querySelectorAll<HTMLButtonElement>(".ogden-mode").forEach((button) =>
  button.addEventListener("click", () => {
    mode = button.dataset.mode || "browse";
    document.querySelector(".ogden-mode.active")?.classList.remove("active");
    button.classList.add("active");
    showAnswer = false;
    selected = 0;
    render();
  }),
);
search?.addEventListener("input", applyFilters);
content?.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const favorite = target.closest<HTMLElement>("[data-favorite]");
  if (favorite) {
    const id = favorite.dataset.favorite!;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    save();
    render();
    return;
  }
  const speak = target.closest<HTMLElement>("[data-speak]")?.dataset.speak;
  if (speak && "speechSynthesis" in window)
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(speak));
  const answer = target.closest<HTMLElement>("[data-answer]");
  if (answer) {
    const feedback = document.querySelector<HTMLElement>("#ogden-feedback");
    const correct = answer.dataset.answer === current()?.id;
    if (feedback)
      feedback.textContent = correct
        ? "正确。"
        : `再想想，${current()?.chinese}`;
    if (correct) progress.add(current().id);
    save();
  }
  if (target.id === "practice-reveal") {
    if (showAnswer) {
      selected = (selected + 1) % filtered.length;
      showAnswer = false;
    } else showAnswer = true;
    render();
  }
  if (target.id === "spelling-check") {
    const value = document
      .querySelector<HTMLInputElement>("#spelling-input")
      ?.value.trim()
      .toLowerCase();
    const feedback = document.querySelector<HTMLElement>("#ogden-feedback");
    if (value === current()?.word.toLowerCase()) {
      if (feedback) feedback.textContent = "正确。";
      progress.add(current().id);
      selected = (selected + 1) % filtered.length;
      spellingAnswer = "";
    } else {
      if (feedback) feedback.textContent = `答案是 ${current()?.word}`;
      spellingAnswer = value || "";
    }
    save();
  }
  if (target.id === "expression-check") {
    const value = document
      .querySelector<HTMLTextAreaElement>("#expression-input")
      ?.value.trim();
    const feedback = document.querySelector<HTMLElement>("#ogden-feedback");
    if (value) {
      progress.add(current().id);
      if (feedback) feedback.textContent = "完成。继续用下一个词表达。";
      save();
    } else if (feedback) feedback.textContent = "先写下一句，再完成练习。";
  }
});

const start = async () => {
  try {
    const response = await fetch("/data/ogden850.json");
    allWords = (await response.json()) as Word[];
    filtered = allWords;
    updateCategoryCounts();
    render();
  } catch {
    if (content)
      content.innerHTML =
        '<div class="ogden-empty">词汇数据加载失败，请刷新页面重试。</div>';
  }
};
start();
