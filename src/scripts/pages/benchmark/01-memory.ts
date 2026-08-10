import type { BenchmarkTestContext } from "../../../types/benchmark";

export const createBenchmarkStarters = (context: BenchmarkTestContext) => {
  const startNumber = () => {
    let level = 1;
    let timer: number | undefined;
    let submitted = false;
    const run = () => {
      context.busy = true;
      submitted = false;
      context.clearControls();
      const digits = Math.min(2 + level, 30);
      const value = Array.from({ length: digits }, () =>
        Math.floor(Math.random() * 10),
      ).join("");
      context.setPrompt(`第 ${level} 级 · ${digits} 位`, value);
      context.clearControls();
      timer = window.setTimeout(
        () => {
          if (!context.busy) return;
          context.setPrompt(
            `第 ${level} 级 · ${digits} 位`,
            "输入你记住的数字",
          );
          const input = document.createElement("input");
          input.className = "benchmark-input";
          input.inputMode = "numeric";
          input.autocomplete = "off";
          input.maxLength = digits;
          const button = document.createElement("button");
          button.className = "benchmark-secondary";
          button.textContent = "确认答案";
          context.controls?.append(input, button);
          input.focus();
          const submit = () => {
            if (submitted) return;
            submitted = true;
            if (input.value === value) {
              level += 1;
              run();
            } else {
              context.finish(
                level - 1,
                `你完成了第 ${level - 1} 级，记住了 ${digits - 1} 位数字。`,
              );
            }
          };
          button.addEventListener("click", submit);
          input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") submit();
          });
        },
        Math.max(1600, 2400 - level * 20),
      );
    };
    context.cleanup = () => {
      window.clearTimeout(timer);
    };
    run();
  };
  const startVisual = () => {
    let level = 1;
    let active: number[] = [];
    let chosen: number[] = [];
    let timer: number | undefined;
    const run = () => {
      context.busy = true;
      chosen = [];
      const count = Math.min(2 + level, 12);
      active = [...Array(16).keys()]
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
      context.clearControls();
      const grid = document.createElement("div");
      grid.className = "visual-grid";
      for (let i = 0; i < 16; i += 1) {
        const tile = document.createElement("button");
        tile.className = `visual-tile ${active.includes(i) ? "lit" : ""}`;
        tile.dataset.index = String(i);
        grid.append(tile);
      }
      context.controls?.append(grid);
      context.setPrompt(`第 ${level} 级`, "记住亮起的方块");
      timer = window.setTimeout(() => {
        grid
          .querySelectorAll(".visual-tile")
          .forEach((tile) => tile.classList.remove("lit"));
        context.setPrompt(`第 ${level} 级`, "点击刚才亮起的方块");
        grid
          .querySelectorAll<HTMLButtonElement>(".visual-tile")
          .forEach((tile) =>
            tile.addEventListener("click", () => {
              if (tile.classList.contains("chosen")) return;
              const index = Number(tile.dataset.index);
              if (!active.includes(index)) {
                context.finish(
                  level - 1,
                  `你完成了第 ${level - 1} 级视觉记忆。`,
                );
                return;
              }
              tile.classList.add("chosen");
              chosen.push(index);
              if (chosen.length === active.length) {
                level += 1;
                run();
              }
            }),
          );
      }, 1200);
    };
    context.cleanup = () => {
      window.clearTimeout(timer);
    };
    run();
  };
  const startChimp = () => {
    let level = 1;
    let expected = 1;
    let timer: number | undefined;
    const run = () => {
      const count = Math.min(4 + level, 16);
      expected = 1;
      context.clearControls();
      context.setPrompt(`第 ${level} 级 · ${count} 个方块`, "按数字顺序点击");
      const grid = document.createElement("div");
      grid.className = "visual-grid";
      const positions = [...Array(16).keys()]
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
      positions.forEach((position, index) => {
        const tile = context.createButton(
          String(index + 1),
          "visual-tile chimp-tile",
        );
        tile.dataset.index = String(index + 1);
        tile.style.gridColumn = `${(position % 4) + 1}`;
        tile.style.gridRow = `${Math.floor(position / 4) + 1}`;
        tile.addEventListener("click", () => {
          if (Number(tile.dataset.index) !== expected) {
            context.finish(level - 1, `完成了第 ${level - 1} 级数字方块。`);
            return;
          }
          tile.textContent = "✓";
          tile.classList.add("chosen");
          expected += 1;
          if (expected > count) {
            level += 1;
            run();
          }
        });
        grid.append(tile);
      });
      context.controls?.append(grid);
      timer = window.setTimeout(() => {
        grid.querySelectorAll(".chimp-tile").forEach((tile) => {
          tile.textContent = "";
        });
        context.setPrompt(`第 ${level} 级`, "按刚才的数字顺序点击");
      }, 1300);
    };
    context.cleanup = () => window.clearTimeout(timer);
    run();
  };
  const startSequential = () => {
    let level = 1;
    let sequence: number[] = [];
    let position = 0;
    let timer: number | undefined;
    const run = () => {
      sequence = Array.from({ length: Math.min(2 + level, 12) }, () =>
        Math.floor(Math.random() * 4),
      );
      position = 0;
      context.clearControls();
      const grid = document.createElement("div");
      grid.className = "sequence-grid";
      for (let i = 0; i < 16; i += 1) {
        const tile = context.createButton("", "visual-tile");
        tile.dataset.index = String(i % 4);
        grid.append(tile);
      }
      context.controls?.append(grid);
      context.setPrompt(`第 ${level} 级`, "记住依次亮起的方块");
      let step = 0;
      const flash = () => {
        grid
          .querySelectorAll(".visual-tile")
          .forEach((tile) => tile.classList.remove("lit"));
        const tiles = grid.querySelectorAll(".visual-tile");
        tiles[sequence[step]]?.classList.add("lit");
        step += 1;
        if (step < sequence.length) timer = window.setTimeout(flash, 500);
        else {
          timer = window.setTimeout(() => {
            tiles.forEach((tile, index) => {
              tile.classList.remove("lit");
              tile.addEventListener("click", () => {
                if (index % 4 !== sequence[position]) {
                  context.finish(level - 1, `完成了第 ${level - 1} 级序列。`);
                  return;
                }
                tile.classList.add("chosen");
                position += 1;
                if (position === sequence.length) {
                  level += 1;
                  run();
                }
              });
            });
            context.setPrompt(`第 ${level} 级`, "按顺序点击亮起的方块");
          }, 600);
        }
      };
      flash();
    };
    context.cleanup = () => window.clearTimeout(timer);
    run();
  };
  return {
    number: startNumber,
    visual: startVisual,
    chimp: startChimp,
    sequential: startSequential,
  };
};
