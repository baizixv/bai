type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let themeObserver: MutationObserver | undefined;
let deferredPrompt: BeforeInstallPromptEvent | undefined;
let cleanupInstall: (() => void) | undefined;
let toastTimer: number | undefined;
let lastToastAt = 0;

const showToast = (message: string) => {
  // userChoice(accepted) 和 appinstalled 可能先后触发，去重避免重复提示。
  const now = Date.now();
  if (now - lastToastAt < 1500) return;
  lastToastAt = now;

  let toast = document.querySelector<HTMLDivElement>("#pwa-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "pwa-toast";
    toast.className = "pwa-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    document.querySelector("#pwa-toast")?.classList.remove("show");
  }, 3200);
};

const updateInstallButton = () => {
  const button = document.querySelector<HTMLButtonElement>("#install-button");
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  if (button) button.hidden = !deferredPrompt || standalone;
};

const setupPwa = () => {
  themeObserver?.disconnect();
  cleanupInstall?.();

  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const updateThemeColor = () => {
    if (themeColor) themeColor.content = document.body.classList.contains("dark") ? "#1b1d22" : "#f7f5f1";
  };
  updateThemeColor();
  themeObserver = new MutationObserver(updateThemeColor);
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });

  const installButton = document.querySelector<HTMLButtonElement>("#install-button");
  const onInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = undefined;
    updateInstallButton();
    if (choice.outcome === "accepted") showToast("安装成功，已添加到主屏幕");
  };
  installButton?.addEventListener("click", onInstallClick);
  cleanupInstall = () => installButton?.removeEventListener("click", onInstallClick);
  updateInstallButton();
};

document.addEventListener("astro:page-load", setupPwa);
setupPwa();

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  updateInstallButton();
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = undefined;
  updateInstallButton();
  showToast("安装成功，已添加到主屏幕");
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
    // PWA installation is progressive enhancement; the site remains usable without it.
  });
}

export {};
