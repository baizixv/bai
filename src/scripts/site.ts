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

  // 桌面端：点“联系我”/邮箱按钮弹出联系方式弹窗；移动端保持 mailto。
  const contactModal = document.querySelector<HTMLDivElement>("#contact-modal");
  const isDesktop = () => window.matchMedia("(min-width: 901px)").matches;
  const openContactModal = () => {
    contactModal?.removeAttribute("hidden");
    body.classList.add("modal-open");
  };
  const closeContactModal = () => {
    contactModal?.setAttribute("hidden", "");
    body.classList.remove("modal-open");
  };
  const onMailtoClick = (event: MouseEvent) => {
    if (!isDesktop()) return;
    const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="mailto:"]');
    if (!anchor) return;
    if (anchor.closest("#contact-modal")) return;
    event.preventDefault();
    openContactModal();
  };
  const onModalClick = (event: MouseEvent) => {
    if (event.target === contactModal) closeContactModal();
  };
  const onCopyClick = async (event: MouseEvent) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".contact-copy");
    if (!button) return;
    const value = button.dataset.copy ?? "";
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    button.textContent = "已复制";
    button.classList.add("copied");
    window.setTimeout(() => {
      button.textContent = "复制";
      button.classList.remove("copied");
    }, 1600);
  };
  const onModalKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") closeContactModal();
  };
  contactModal?.addEventListener("click", onModalClick);
  contactModal?.addEventListener("click", onCopyClick);
  document.addEventListener("click", onMailtoClick);
  document.addEventListener("keydown", onModalKeyDown);

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
    contactModal?.removeEventListener("click", onModalClick);
    contactModal?.removeEventListener("click", onCopyClick);
    document.removeEventListener("click", onMailtoClick);
    document.removeEventListener("keydown", onModalKeyDown);
    body.classList.remove("modal-open");
    observer.disconnect();
  };
};

document.addEventListener("astro:page-load", setupSite);
setupSite();

export {};
