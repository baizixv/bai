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

  // AI 搜索占位：后续版本接入 DeepSeek 后启用。
  const aiSoon = document.createElement("div");
  aiSoon.className = "search-ai-row search-ai-soon";
  const aiGlyph = document.createElement("span");
  aiGlyph.textContent = "✦";
  const aiLabel = document.createElement("span");
  aiLabel.textContent = "AI 搜索 · 即将上线";
  aiSoon.append(aiGlyph, aiLabel);

  const list = document.createElement("div");
  list.className = "search-list";
  if (results.length === 0) {
    const empty = document.createElement("div");
    empty.className = "search-empty";
    empty.textContent = "没有找到相关内容，换个关键词试试。";
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

  panel.append(aiSoon, list);
  navItems = [...list.querySelectorAll<HTMLElement>(".search-result")];
  setActive(navItems.length ? 0 : -1);
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
