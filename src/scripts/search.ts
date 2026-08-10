type SearchEntry = {
  id: string;
  kind: string;
  title: string;
  description: string;
  tag: string;
  label: string;
  creator: string;
  status: string;
  date: string;
  url: string;
  body: string;
};

const KIND_LABEL: Record<string, string> = {
  article: "文章",
  idea: "想法",
  project: "项目",
  tool: "工具",
  game: "游戏",
  bookmark: "外链",
  media: "媒体",
};

let searchIndex: SearchEntry[] | undefined;
let searchTimer: number | undefined;
let aiRunning = false;
let navItems: HTMLElement[] = [];
let activeIndex = -1;

const loadSearchIndex = async (): Promise<SearchEntry[]> => {
  if (searchIndex) return searchIndex;
  const res = await fetch("/search-index.json", { cache: "no-store" });
  if (!res.ok) throw new Error("search index unavailable");
  const data = (await res.json()) as SearchEntry[];
  searchIndex = data;
  return data;
};

const rankEntries = (query: string): SearchEntry[] => {
  if (!searchIndex) return [];
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return searchIndex
    .map((entry) => {
      const hay = `${entry.title} ${entry.description} ${entry.tag} ${entry.label} ${entry.creator} ${entry.status} ${entry.body}`.toLowerCase();
      let score = 0;
      for (const word of words) {
        if (!hay.includes(word)) continue;
        score += entry.title.toLowerCase().includes(word) ? 3 : 1;
      }
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.entry.date.localeCompare(a.entry.date))
    .map((item) => item.entry)
    .slice(0, 8);
};

const searchPanel = () => document.querySelector<HTMLDivElement>("#search-panel");
const searchInput = () => document.querySelector<HTMLInputElement>("#site-search");
const searchBox = () => document.querySelector<HTMLElement>(".search-box");
const isMobile = () => window.matchMedia("(max-width: 900px)").matches;

const expandMobile = () => {
  if (isMobile()) searchBox()?.classList.add("expanded");
};
const collapseMobile = () => {
  if (isMobile()) searchBox()?.classList.remove("expanded");
};

const setActive = (index: number) => {
  activeIndex = index;
  navItems.forEach((item, i) => item.classList.toggle("active", i === index));
  navItems[index]?.scrollIntoView({ block: "nearest" });
};

const renderPanel = (query: string, results: SearchEntry[]) => {
  const panel = searchPanel();
  if (!panel) return;
  panel.textContent = "";
  panel.hidden = false;

  const aiRow = document.createElement("button");
  aiRow.type = "button";
  aiRow.id = "ai-search-row";
  aiRow.className = "search-ai-row";
  const aiGlyph = document.createElement("span");
  aiGlyph.textContent = "✦";
  const aiLabel = document.createElement("span");
  aiLabel.textContent = `让 AI 回答：${query}`;
  aiRow.append(aiGlyph, aiLabel);
  aiRow.addEventListener("click", () => runAiSearch(query));

  const list = document.createElement("div");
  list.className = "search-list";
  if (results.length === 0) {
    const empty = document.createElement("div");
    empty.className = "search-empty";
    empty.textContent = "没有找到相关内容，可以让 AI 试着回答。";
    list.append(empty);
  } else {
    results.forEach((entry) => {
      const link = document.createElement("a");
      link.className = "search-result";
      link.href = entry.url;
      if (/^https?:/i.test(entry.url)) {
        link.target = "_blank";
        link.rel = "noreferrer";
      }
      const kind = document.createElement("span");
      kind.className = "search-kind";
      kind.textContent = KIND_LABEL[entry.kind] ?? entry.kind;
      const title = document.createElement("strong");
      title.textContent = entry.title;
      const desc = document.createElement("span");
      desc.className = "search-desc";
      desc.textContent = entry.description;
      link.append(kind, title, desc);
      list.append(link);
    });
  }

  panel.append(aiRow, list);
  navItems = [aiRow, ...list.querySelectorAll<HTMLElement>(".search-result")];
  setActive(0);
};

const runAiSearch = async (query: string) => {
  if (aiRunning || !query) return;
  aiRunning = true;
  const panel = searchPanel();
  if (!panel) return;
  panel.hidden = false;
  panel.querySelector("#ai-search-row")?.remove();

  const aiBox = document.createElement("div");
  aiBox.className = "search-ai-box";
  const question = document.createElement("div");
  question.className = "search-ai-q";
  question.textContent = `AI 回答：${query}`;
  const answer = document.createElement("div");
  answer.className = "search-ai-answer";
  answer.textContent = "思考中…";
  aiBox.append(question, answer);
  panel.insertBefore(aiBox, panel.firstChild);

  try {
    const res = await fetch("/api/ai-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error ?? `AI 搜索失败 (${res.status})`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const chunk = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) answer.textContent += delta;
          } catch {
            // Ignore malformed SSE chunks.
          }
        }
        boundary = buffer.indexOf("\n\n");
      }
    }
    if (answer.textContent === "思考中…") answer.textContent = "AI 没有返回内容，换个问题试试。";
  } catch (error) {
    if (answer.textContent === "思考中…") {
      answer.textContent = error instanceof Error ? error.message : "AI 搜索失败，请稍后重试。";
    } else {
      answer.textContent += "\n\n（回答中断，请重试）";
    }
  } finally {
    aiRunning = false;
    navItems = [...panel.querySelectorAll<HTMLElement>(".search-result")];
    setActive(navItems.length ? 0 : -1);
  }
};

export const setupSearch = (): (() => void) => {
  const input = searchInput();
  const box = searchBox();

  const onSearchInput = () => {
    window.clearTimeout(searchTimer);
    const query = input?.value.trim() ?? "";
    if (!query) {
      const panel = searchPanel();
      if (panel) panel.hidden = true;
      navItems = [];
      return;
    }
    searchTimer = window.setTimeout(async () => {
      const current = input?.value.trim() ?? "";
      if (!current) return;
      try {
        await loadSearchIndex();
        renderPanel(current, rankEntries(current));
      } catch {
        const panel = searchPanel();
        if (panel) {
          panel.hidden = false;
          panel.textContent = "搜索索引加载失败，请刷新页面重试。";
        }
      }
    }, 120);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "/" && document.activeElement !== input && input) {
      event.preventDefault();
      expandMobile();
      input.focus();
      return;
    }
    if (!input || document.activeElement !== input) return;
    const panel = searchPanel();
    const isOpen = Boolean(panel && !panel.hidden);
    if (event.key === "Escape") {
      input.value = "";
      if (panel) panel.hidden = true;
      navItems = [];
      collapseMobile();
      input.blur();
      return;
    }
    if (event.key === "ArrowDown" && isOpen && navItems.length) {
      event.preventDefault();
      setActive((activeIndex + 1) % navItems.length);
      return;
    }
    if (event.key === "ArrowUp" && isOpen && navItems.length) {
      event.preventDefault();
      setActive((activeIndex - 1 + navItems.length) % navItems.length);
      return;
    }
    if (event.key === "Enter" && input.value.trim()) {
      event.preventDefault();
      const target = isOpen && navItems.length ? navItems[activeIndex] : undefined;
      if (target instanceof HTMLAnchorElement || target instanceof HTMLButtonElement) {
        target.click();
      } else {
        runAiSearch(input.value.trim());
      }
    }
  };

  const onBoxClick = () => {
    expandMobile();
    input?.focus();
  };
  const onInputBlur = () => {
    if (!input?.value.trim()) collapseMobile();
  };
  const onDocumentClick = (event: MouseEvent) => {
    const wrap = document.querySelector(".search-wrap");
    if (wrap && !wrap.contains(event.target as Node)) {
      const panel = searchPanel();
      if (panel) panel.hidden = true;
      navItems = [];
    }
  };

  input?.addEventListener("input", onSearchInput);
  document.addEventListener("keydown", onKeyDown);
  box?.addEventListener("click", onBoxClick);
  input?.addEventListener("blur", onInputBlur);
  document.addEventListener("click", onDocumentClick);

  return () => {
    input?.removeEventListener("input", onSearchInput);
    document.removeEventListener("keydown", onKeyDown);
    box?.removeEventListener("click", onBoxClick);
    input?.removeEventListener("blur", onInputBlur);
    document.removeEventListener("click", onDocumentClick);
    window.clearTimeout(searchTimer);
  };
};
