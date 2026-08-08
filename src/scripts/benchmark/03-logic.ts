import type { BenchmarkTestContext } from "../../types/benchmark";

export const createBenchmarkStarters = (context: BenchmarkTestContext) => {
  const startStroop = () => {
    const colors = [
      { name: "蓝色", value: "#4264f5" },
      { name: "粉色", value: "#ed6f79" },
      { name: "绿色", value: "#54a575" },
      { name: "黄色", value: "#d39d00" },
    ];
    let round = 0;
    let correct = 0;
    let answer = "";
    const run = () => {
      const word = colors[Math.floor(Math.random() * colors.length)];
      const ink = colors[Math.floor(Math.random() * colors.length)];
      answer = ink.name;
      context.clearControls();
      context.setPrompt(`第 ${round + 1} / 10 轮`, "选择文字显示的颜色");
      const label = document.createElement("div");
      label.className = "stroop-word";
      label.textContent = word.name;
      label.style.color = ink.value;
      const buttons = document.createElement("div");
      buttons.className = "stroop-options";
      colors.forEach((color) => {
        const button = document.createElement("button");
        button.className = "benchmark-secondary";
        button.textContent = color.name;
        button.addEventListener("click", () => {
          if (color.name === answer) correct += 1;
          round += 1;
          if (round >= 10) context.finish(correct, "十轮中答对的题目数。");
          else run();
        });
        buttons.append(button);
      });
      context.controls?.append(label, buttons);
    };
    run();
  };
  const startColor = () => {
    let round = 0;
    let correct = 0;
    const run = () => {
      const base = [
        "#4264f5",
        "#4264e0",
        "#54a575",
        "#54a58a",
        "#ed9b9f",
        "#ed8a99",
      ][Math.floor(Math.random() * 6)];
      const odd = Math.floor(Math.random() * 16);
      context.clearControls();
      context.setPrompt(`第 ${round + 1} / 10 轮`, "找出颜色不同的方块");
      const grid = document.createElement("div");
      grid.className = "visual-grid";
      for (let index = 0; index < 16; index += 1) {
        const tile = context.createButton("", "visual-tile color-tile");
        tile.style.background = index === odd ? `${base}cc` : base;
        tile.addEventListener("click", () => {
          if (index === odd) correct += 1;
          round += 1;
          if (round >= 10) context.finish(correct, "十轮中找对的方块数量。");
          else run();
        });
        grid.append(tile);
      }
      context.controls?.append(grid);
    };
    run();
  };
  const startVerbal = () => {
    const words = [
      "苹果",
      "河流",
      "灯塔",
      "雨衣",
      "月亮",
      "纸张",
      "森林",
      "钥匙",
      "石头",
      "窗户",
      "咖啡",
      "火车",
      "鲸鱼",
      "花园",
      "相机",
      "风筝",
    ];
    let seen = new Set<string>();
    let round = 0;
    let correct = 0;
    const run = () => {
      const repeated = round > 0 && Math.random() < 0.45;
      const word = repeated
        ? [...seen][Math.floor(Math.random() * seen.size)]
        : words[Math.floor(Math.random() * words.length)];
      const actualSeen = seen.has(word);
      if (!actualSeen) seen.add(word);
      context.clearControls();
      context.setPrompt(`第 ${round + 1} / 20 轮`, "这个词出现过吗？");
      const label = document.createElement("div");
      label.className = "stroop-word";
      label.textContent = word;
      const yes = context.createButton("见过");
      const no = context.createButton("没见过");
      yes.addEventListener("click", () => answer(actualSeen));
      no.addEventListener("click", () => answer(!actualSeen));
      const answer = (right: boolean) => {
        if (right) correct += 1;
        round += 1;
        if (round >= 20) context.finish(correct, "词汇判断正确数量。");
        else run();
      };
      const options = document.createElement("div");
      options.className = "stroop-options";
      options.append(yes, no);
      context.controls?.append(label, options);
    };
    run();
  };
  const startLuck = () => {
    let round = 0;
    let wins = 0;
    const run = () => {
      context.clearControls();
      context.setPrompt(`第 ${round + 1} / 10 轮`, "选择一张卡片");
      const options = document.createElement("div");
      options.className = "card-options";
      for (let i = 0; i < 3; i += 1) {
        const card = context.createButton("✦", "luck-card");
        card.addEventListener("click", () => {
          if (i === Math.floor(Math.random() * 3)) wins += 1;
          round += 1;
          if (round >= 10) context.finish(wins * 10, "随机卡片命中率百分位。");
          else run();
        });
        options.append(card);
      }
      context.controls?.append(options);
    };
    run();
  };
  const startCalculate = () => {
    let round = 0;
    let correct = 0;
    let answer = 0;
    const run = () => {
      const a = 2 + Math.floor(Math.random() * 18);
      const b = 2 + Math.floor(Math.random() * 18);
      const op = Math.random() > 0.5 ? "+" : "-";
      answer = op === "+" ? a + b : a - b;
      context.clearControls();
      context.setPrompt(`第 ${round + 1} / 10 轮`, `${a} ${op} ${b} = ?`);
      const input = document.createElement("input");
      input.className = "benchmark-input";
      input.inputMode = "numeric";
      const button = context.createButton("提交");
      context.controls?.append(input, button);
      input.focus();
      const submit = () => {
        if (Number(input.value) === answer) correct += 1;
        round += 1;
        if (round >= 10) context.finish(correct, "十道题答对的数量。");
        else run();
      };
      button.addEventListener("click", submit);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") submit();
      });
    };
    run();
  };
  const startSchulte = () => {
    let next = 1;
    let started = 0;
    context.clearControls();
    context.setPrompt("3 × 3 方格", "按 1 到 9 的顺序点击");
    const grid = document.createElement("div");
    grid.className = "schulte-grid";
    [...Array(9).keys()]
      .sort(() => Math.random() - 0.5)
      .forEach((value) => {
        const tile = context.createButton(String(value + 1), "schulte-tile");
        tile.addEventListener("click", () => {
          if (!started) started = performance.now();
          if (value + 1 !== next) {
            context.finish(0, "顺序错误，请重新挑战。");
            return;
          }
          tile.classList.add("chosen");
          next += 1;
          if (next > 9)
            context.finish(
              Math.round((performance.now() - started) / 10) / 100,
              "完成方格的用时（秒）。",
            );
        });
        grid.append(tile);
      });
    context.controls?.append(grid);
  };
  const startAcuity = () => {
    let count = 0;
    let timer: number | undefined;
    context.clearControls();
    context.setPrompt("10 个移动目标", "点击移动中的目标");
    const arena = document.createElement("div");
    arena.className = "aim-arena";
    const target = context.createButton("", "aim-target acuity-target");
    arena.append(target);
    context.controls?.append(arena);
    const move = () => {
      target.style.left = `${10 + Math.random() * 80}%`;
      target.style.top = `${10 + Math.random() * 70}%`;
    };
    const onClick = () => {
      count += 1;
      if (count >= 10) context.finish(count, "成功捕捉的移动目标数量。");
      else move();
    };
    target.addEventListener("click", onClick);
    timer = window.setInterval(move, 900);
    context.cleanup = () => {
      window.clearInterval(timer);
      target.removeEventListener("click", onClick);
    };
    move();
  };
  const startAttention = () => {
    let round = 0;
    let score = 0;
    let timer: number | undefined;
    context.clearControls();
    const button = context.createButton("开始", "attention-button");
    context.controls?.append(button);
    const next = () => {
      const positive = Math.random() > 0.35;
      button.textContent = positive ? "点击绿色" : "看到红色不要点";
      button.dataset.signal = positive ? "green" : "red";
      button.style.background = positive ? "#5da878" : "#d96d75";
    };
    const onClick = () => {
      if (button.dataset.signal === "green") score += 1;
      round += 1;
      if (round >= 20) context.finish(score, "持续注意力测试得分。");
      else next();
    };
    button.addEventListener("click", onClick);
    timer = window.setInterval(() => {
      if (button.dataset.signal === "red") round += 1;
      if (round >= 20) context.finish(score, "持续注意力测试得分。");
      else next();
    }, 900);
    context.cleanup = () => {
      window.clearInterval(timer);
      button.removeEventListener("click", onClick);
    };
    next();
  };
  return {
    stroop: startStroop,
    color: startColor,
    verbal: startVerbal,
    luck: startLuck,
    calculate: startCalculate,
    schulte: startSchulte,
    acuity: startAcuity,
    attention: startAttention,
  };
};
