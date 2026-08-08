import QRCode from "qrcode";
export {};
type ToolName =
  "timestamp" | "base64" | "hash" | "color" | "random-color" | "json" | "qr";
const input = document.querySelector<HTMLTextAreaElement>("#tool-input");
const output = document.querySelector<HTMLTextAreaElement>("#tool-output");
const title = document.querySelector<HTMLElement>("#tool-title");
const kicker = document.querySelector<HTMLElement>("#tool-kicker");
const inputLabel = document.querySelector<HTMLElement>("#tool-input-label");
const outputLabel = document.querySelector<HTMLElement>("#tool-output-label");
const note = document.querySelector<HTMLElement>("#tool-note");
const qrOutput = document.querySelector<HTMLElement>("#qr-output");
const qrDownload = document.querySelector<HTMLButtonElement>("#qr-download");
const colorSwatch = document.querySelector<HTMLElement>("#color-swatch");
const configs: Record<ToolName, [string, string, string, string, string]> = {
  timestamp: [
    "TIME UTILITY",
    "时间戳转换",
    "输入时间戳（毫秒）",
    "转换结果",
    "输入留空时显示当前时间。",
  ],
  base64: [
    "ENCODE / DECODE",
    "Base64 编解码",
    "输入文本或 Base64",
    "转换结果",
    "ASCII 文本优先；中文文本也会正常处理。",
  ],
  hash: [
    "TEXT DIGEST",
    "MD5 摘要",
    "输入需要计算的文本",
    "MD5 结果",
    "摘要是单向结果，不能从 MD5 还原原文。",
  ],
  color: [
    "COLOR UTILITY",
    "颜色值转换",
    "输入 RGBA 或 HEX",
    "转换结果",
    "支持 255, 128, 0 和 #ff8000 两种方向。",
  ],
  json: [
    "DATA UTILITY",
    "JSON 格式化",
    "输入 JSON 字符串",
    "格式化结果",
    "格式化会检查 JSON 语法。",
  ],
  "random-color": [
    "COLOR GENERATOR",
    "随机颜色生成",
    "点击转换生成颜色",
    "颜色值",
    "每次生成一个随机颜色，同时显示 HEX 和 RGB。",
  ],
  qr: [
    "QR GENERATOR",
    "二维码生成",
    "输入文字或链接",
    "二维码信息",
    "二维码在浏览器本地生成，可以下载到本地。",
  ],
};
const base64Encode = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};
const base64Decode = (value: string) => {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};
const md5 = (s: string) => {
  const r = (n: number, c: number) => (n << c) | (n >>> (32 - c));
  const k = Array.from({ length: 64 }, (_, i) =>
    Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296),
  );
  const shifts = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  const bytes = new TextEncoder().encode(s);
  const words = Array.from(
    { length: ((bytes.length + 9 + 63) >> 6) * 16 },
    () => 0,
  );
  bytes.forEach((b, i) => (words[i >> 2] |= b << ((i & 3) * 8)));
  words[bytes.length >> 2] |= 128 << ((bytes.length & 3) * 8);
  words[words.length - 2] = bytes.length * 8;
  let a = 1732584193,
    b = -271733879,
    c = -1732584194,
    d = 271733878;
  for (let i = 0; i < words.length; i += 16) {
    let A = a,
      B = b,
      C = c,
      D = d;
    for (let j = 0; j < 64; j++) {
      let f, g;
      if (j < 16) {
        f = (b & c) | (~b & d);
        g = j;
      } else if (j < 32) {
        f = (d & b) | (~d & c);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        f = b ^ c ^ d;
        g = (3 * j + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * j) % 16;
      }
      const x = (A + f + k[j] + (words[i + g] || 0)) | 0;
      A = d;
      d = c;
      c = b;
      const shift =
        shifts[(j < 16 ? 0 : j < 32 ? 4 : j < 48 ? 8 : 12) + (j % 4)];
      b = (b + r(x, shift)) | 0;
    }
    a = (a + A) | 0;
    b = (b + B) | 0;
    c = (c + C) | 0;
    d = (d + D) | 0;
  }
  return [a, b, c, d]
    .map((n) =>
      [0, 1, 2, 3]
        .map((i) => ((n >>> (8 * i)) & 255).toString(16).padStart(2, "0"))
        .join(""),
    )
    .join("");
};
const randomColor = () => {
  const hex = `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")}`;
  const rgb = [1, 3, 5].map((index) =>
    parseInt(hex.slice(index, index + 2), 16),
  );
  return `${hex}\nRGB(${rgb.join(", ")})`;
};
const convertColor = (value: string) => {
  const v = value.trim();
  if (v.startsWith("#")) {
    const h = v.slice(1);
    const full =
      h.length === 3
        ? h
            .split("")
            .map((x) => x + x)
            .join("")
        : h;
    if (!/^[0-9a-f]{6,8}$/i.test(full)) throw Error("无效的 HEX 颜色");
    const p = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
    const alpha =
      full.length === 8
        ? (parseInt(full.slice(6, 8), 16) / 255).toFixed(2)
        : "1";
    return `rgba(${p.join(", ")}, ${alpha})`;
  }
  const p = v.split(/[,，\s]+/).map(Number);
  if (p.length < 3 || p.slice(0, 3).some(Number.isNaN))
    throw Error("请输入 RGBA 或 HEX 颜色");
  return (
    "#" +
    p
      .slice(0, 3)
      .map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0"))
      .join("") +
    (p[3] !== undefined
      ? Math.round(Math.max(0, Math.min(1, p[3])) * 255)
          .toString(16)
          .padStart(2, "0")
      : "")
  );
};
const run = (name: ToolName, value: string) => {
  if (name === "timestamp") {
    const n = value.trim() ? Number(value) : Date.now();
    if (!Number.isFinite(n)) throw Error("请输入有效的时间戳");
    const d = new Date(n);
    if (Number.isNaN(d.valueOf())) throw Error("时间戳超出范围");
    return `${d.toLocaleString("zh-CN")}\nISO：${d.toISOString()}\nUnix 秒：${Math.floor(n / 1000)}`;
  }
  if (name === "base64") {
    try {
      return base64Decode(value.trim());
    } catch {
      return base64Encode(value);
    }
  }
  if (name === "hash") return md5(value);
  if (name === "color") return convertColor(value);
  if (name === "random-color") return randomColor();
  if (name === "qr") return value.trim() || "请输入文字或链接";
  return JSON.stringify(JSON.parse(value), null, 2);
};
const requestedTool = new URLSearchParams(window.location.search).get("tool");
let current: ToolName =
  requestedTool === "base64" ||
  requestedTool === "hash" ||
  requestedTool === "color" ||
  requestedTool === "random-color" ||
  requestedTool === "json" ||
  requestedTool === "qr"
    ? requestedTool
    : "timestamp";
const update = () => {
  const c = configs[current];
  [kicker, title, inputLabel, outputLabel, note].forEach((el, i) => {
    if (el) el.textContent = c[i];
  });
  if (input) input.placeholder = c[2];
  if (output) output.placeholder = c[3];
  if (qrOutput) qrOutput.hidden = true;
  if (qrDownload) qrDownload.hidden = true;
  if (colorSwatch) colorSwatch.hidden = true;
};
document.querySelectorAll<HTMLButtonElement>(".tool-tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    current = tab.dataset.tool as ToolName;
    document.querySelector(".tool-tab.active")?.classList.remove("active");
    tab.classList.add("active");
    if (input) input.value = "";
    if (output) output.value = "";
    history.replaceState(null, "", `?tool=${current}`);
    update();
  }),
);
document
  .querySelector<HTMLButtonElement>(`.tool-tab[data-tool="${current}"]`)
  ?.click();
document.querySelector("#tool-run")?.addEventListener("click", async () => {
  try {
    const value = input?.value ?? "";
    if (output) output.value = run(current, value);
    if (current === "qr" && value.trim() && qrOutput) {
      const dataUrl = await QRCode.toDataURL(value.trim(), {
        width: 240,
        margin: 2,
        errorCorrectionLevel: "M",
      });
      qrOutput.innerHTML = `<img src="${dataUrl}" alt="二维码" />`;
      qrOutput.hidden = false;
      if (qrDownload) {
        qrDownload.hidden = false;
        qrDownload.onclick = () => {
          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = "bai-qr-code.png";
          link.click();
        };
      }
    }
    if (current === "random-color" && colorSwatch && output) {
      colorSwatch.style.background = output.value.split("\\n")[0];
      colorSwatch.hidden = false;
    }
  } catch (error) {
    if (output)
      output.value = error instanceof Error ? error.message : "处理失败";
  }
});
document.querySelector("#tool-copy")?.addEventListener("click", async () => {
  if (output?.value) await navigator.clipboard.writeText(output.value);
});
document.querySelector("#tool-clear")?.addEventListener("click", () => {
  if (input) input.value = "";
  if (output) output.value = "";
  if (qrOutput) qrOutput.hidden = true;
  if (qrDownload) qrDownload.hidden = true;
  if (colorSwatch) colorSwatch.hidden = true;
});
update();
