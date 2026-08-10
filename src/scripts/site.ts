import { readStorage, writeStorage } from "../lib/storage";

let cleanup: (() => void) | undefined;

const setupSite = () => {
  cleanup?.();

  const body = document.body;
  const themeToggle = document.querySelector<HTMLButtonElement>("#theme-toggle");
  const searchInput = document.querySelector<HTMLInputElement>("#site-search");
  const searchable = [...document.querySelectorAll<HTMLElement>(".searchable-item")];
  const noResults = document.querySelector<HTMLElement>("#no-results");
  const savedTheme = readStorage<"dark" | "light">("bai-theme", "light");
  document.documentElement.dataset.theme = savedTheme;
  body.classList.toggle("dark", savedTheme === "dark");

  const onThemeToggle = () => {
    body.classList.toggle("dark");
    document.documentElement.dataset.theme = body.classList.contains("dark") ? "dark" : "light";
    writeStorage("bai-theme", body.classList.contains("dark") ? "dark" : "light");
    themeToggle?.setAttribute(
      "aria-label",
      body.classList.contains("dark") ? "切换浅色模式" : "切换深色模式",
    );
  };
  themeToggle?.addEventListener("click", onThemeToggle);

  const runSearch = () => {
    const query = searchInput?.value.trim().toLowerCase() ?? "";
    let matches = 0;
    searchable.forEach((item) => {
      const found = !query || `${item.dataset.search ?? ""} ${item.textContent ?? ""}`.toLowerCase().includes(query);
      item.hidden = !found;
      if (found) matches += 1;
    });
    if (noResults) noResults.hidden = Boolean(matches || !query);
  };
  const onSearchInput = () => runSearch();
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "/" && document.activeElement !== searchInput && searchInput) {
      event.preventDefault();
      searchInput.focus();
    }
    if (event.key === "Escape" && searchInput) {
      searchInput.value = "";
      runSearch();
      searchInput.blur();
    }
  };
  searchInput?.addEventListener("input", onSearchInput);
  document.addEventListener("keydown", onKeyDown);

  const navLinks = [...document.querySelectorAll<HTMLAnchorElement>(".main-nav a")];
  const sections = [...document.querySelectorAll<HTMLElement>("main section[id]")];
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `/#${visible.target.id}`));
    },
    { rootMargin: "-25% 0px -65% 0px", threshold: [0, 0.25, 0.6] },
  );
  sections.forEach((section) => observer.observe(section));

  document.querySelectorAll<HTMLAnchorElement>('a[href^="http"]').forEach((link) => {
    try {
      if (new URL(link.href).origin !== window.location.origin) {
        link.target = "_blank";
        link.rel = "noreferrer";
      }
    } catch {
      // Ignore malformed URLs and leave them as regular links.
    }
  });

  cleanup = () => {
    themeToggle?.removeEventListener("click", onThemeToggle);
    searchInput?.removeEventListener("input", onSearchInput);
    document.removeEventListener("keydown", onKeyDown);
    observer.disconnect();
  };
};

document.addEventListener("astro:page-load", setupSite);
setupSite();

export {};
