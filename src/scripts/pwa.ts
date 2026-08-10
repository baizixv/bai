let themeObserver: MutationObserver | undefined;

const setupPwa = () => {
  themeObserver?.disconnect();
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const updateThemeColor = () => {
    if (themeColor) themeColor.content = document.body.classList.contains("dark") ? "#1b1d22" : "#f7f5f1";
  };
  updateThemeColor();
  themeObserver = new MutationObserver(updateThemeColor);
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
};

document.addEventListener("astro:page-load", setupPwa);
setupPwa();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
    // PWA installation is progressive enhancement; the site remains usable without it.
  });
}

export {};
