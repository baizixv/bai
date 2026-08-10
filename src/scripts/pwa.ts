const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

const updateThemeColor = () => {
  if (!themeColor) return;
  themeColor.content = document.body.classList.contains("dark") ? "#1b1d22" : "#f7f5f1";
};

updateThemeColor();
new MutationObserver(updateThemeColor).observe(document.body, {
  attributes: true,
  attributeFilter: ["class"],
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // PWA installation is progressive enhancement; the site remains usable without it.
    });
  });
}

