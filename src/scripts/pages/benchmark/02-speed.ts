import type { BenchmarkTestContext } from "../../../types/benchmark";

export const createBenchmarkStarters = (context: BenchmarkTestContext) => {
  const startReaction = () => {
    const surface = context.playScreen;
    let round = 0;
    const times: number[] = [];
    let timer: number | undefined;
    let startedAt = 0;
    let state: "waiting" | "ready" = "waiting";
    const onPointerDown = (event: PointerEvent) => {
      if (
        !context.busy ||
        event.target instanceof HTMLButtonElement ||
        event.target instanceof HTMLInputElement
      )
        return;
      event.preventDefault();
      if (state === "waiting") {
        window.clearTimeout(timer);
        context.finish(0, "太快了。等待绿色出现后再点击。");
        return;
      }
      times.push(Math.round(performance.now() - startedAt));
      round += 1;
      if (round >= 3)
        context.finish(
          Math.round(
            times.reduce((total, value) => total + value, 0) / times.length,
          ),
          "三轮平均反应时间。",
        );
      else runRound();
    };
    const runRound = () => {
      context.busy = true;
      state = "waiting";
      context.game?.classList.remove("reaction-ready");
      context.setPrompt(`第 ${round + 1} / 3 轮`, "等待绿色出现…");
      timer = window.setTimeout(
        () => {
          if (!context.busy) return;
          state = "ready";
          startedAt = performance.now();
          context.game?.classList.add("reaction-ready");
          context.setPrompt(`第 ${round + 1} / 3 轮`, "点击测试区域！");
        },
        1500 + Math.random() * 2500,
      );
    };
    surface?.addEventListener("pointerdown", onPointerDown);
    context.cleanup = () => {
      surface?.removeEventListener("pointerdown", onPointerDown);
      window.clearTimeout(timer);
      context.game?.classList.remove("reaction-ready");
    };
    runRound();
  };
  const startTyping = () => {
    const sample = "The quietest ideas often become the most useful things.";
    let started = 0;
    let timer: number | undefined;
    context.clearControls();
    context.setPrompt("15 秒测试", "照着下面的句子输入");
    const text = document.createElement("p");
    text.className = "typing-sample";
    text.textContent = sample;
    const input = document.createElement("textarea");
    input.className = "benchmark-textarea";
    input.rows = 3;
    input.placeholder = "在这里开始输入…";
    context.controls?.append(text, input);
    input.focus();
    const finishTyping = () => {
      if (!started) return;
      const elapsed = Math.max(1, (performance.now() - started) / 1000);
      const correct = [...input.value].filter(
        (char, index) => char === sample[index],
      ).length;
      context.finish(
        Math.round((correct / elapsed) * 60),
        "按照正确字符数估算的每分钟速度。",
      );
    };
    const onInput = () => {
      if (!started) {
        started = performance.now();
        timer = window.setTimeout(finishTyping, 15000);
      }
      if (input.value === sample) finishTyping();
    };
    input.addEventListener("input", onInput);
    context.cleanup = () => {
      window.clearTimeout(timer);
      input.removeEventListener("input", onInput);
    };
  };
  const startAim = () => {
    let count = 0;
    let started = 0;
    const times: number[] = [];
    context.clearControls();
    context.setPrompt("5 个目标", "点击出现的圆点");
    const arena = document.createElement("div");
    arena.className = "aim-arena";
    const target = document.createElement("button");
    target.className = "aim-target";
    target.setAttribute("aria-label", "目标");
    arena.append(target);
    context.controls?.append(arena);
    const move = () => {
      target.style.left = `${10 + Math.random() * 80}%`;
      target.style.top = `${10 + Math.random() * 70}%`;
      started = performance.now();
    };
    const onClick = () => {
      times.push(performance.now() - started);
      count += 1;
      if (count >= 5)
        context.finish(
          Math.round(times.reduce((a, b) => a + b, 0) / times.length),
          "五个目标的平均点击时间。",
        );
      else move();
    };
    target.addEventListener("click", onClick);
    context.cleanup = () => target.removeEventListener("click", onClick);
    move();
  };
  const startTime = () => {
    let timer: number | undefined;
    let started = 0;
    let running = false;
    context.clearControls();
    context.setPrompt("3 秒测试", "等你认为 3 秒到了时点击");
    const button = context.createButton("开始计时", "time-button");
    context.controls?.append(button);
    const onClick = () => {
      if (!running) {
        running = true;
        started = performance.now();
        button.textContent = "我认为 3 秒到了";
        timer = window.setTimeout(() => {
          button.textContent = "现在可以点击";
        }, 3000);
        return;
      }
      context.finish(
        Math.round(Math.abs(performance.now() - started - 3000)),
        "与 3 秒目标之间的误差。",
      );
    };
    button.addEventListener("click", onClick);
    context.cleanup = () => {
      window.clearTimeout(timer);
      button.removeEventListener("click", onClick);
    };
  };
  const startCoordination = () => {
    let count = 0;
    const times: number[] = [];
    let started = 0;
    context.clearControls();
    context.setPrompt("10 个目标", "跟随目标并点击");
    const arena = document.createElement("div");
    arena.className = "aim-arena";
    const target = context.createButton("", "aim-target");
    arena.append(target);
    context.controls?.append(arena);
    const move = () => {
      target.style.left = `${10 + Math.random() * 80}%`;
      target.style.top = `${10 + Math.random() * 70}%`;
      started = performance.now();
    };
    const onClick = () => {
      times.push(performance.now() - started);
      count += 1;
      if (count >= 10)
        context.finish(
          Math.round(times.reduce((a, b) => a + b, 0) / times.length),
          "十个移动目标的平均点击时间。",
        );
      else move();
    };
    target.addEventListener("click", onClick);
    context.cleanup = () => target.removeEventListener("click", onClick);
    move();
  };
  return {
    reaction: startReaction,
    typing: startTyping,
    aim: startAim,
    coordination: startCoordination,
    time: startTime,
  };
};
