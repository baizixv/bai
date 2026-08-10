type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let themeObserver: MutationObserver | undefined;
let deferredPrompt: BeforeInstallPromptEvent | undefined;
let cleanupInstall: (() => void) | undefined;

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
    await deferredPrompt.userChoice;
    deferredPrompt = undefined;
    updateInstallButton();
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
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
    // PWA installation is progressive enhancement; the site remains usable without it.
  });
}

export {};
