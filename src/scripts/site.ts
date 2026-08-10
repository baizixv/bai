import { readStorage, writeStorage } from "../lib/storage";
import { setupSearch } from "./search";

let cleanup: (() => void) | undefined;

const setupSite = () => {
  cleanup?.();

  const body = document.body;
  const themeToggle = document.querySelector<HTMLButtonElement>("#theme-toggle");
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

  const cleanupSearch = setupSearch();

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
    cleanupSearch();
    observer.disconnect();
  };
};

document.addEventListener("astro:page-load", setupSite);
setupSite();

export {};
