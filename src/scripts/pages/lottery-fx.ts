// 金色粒子背景 + 中奖烟花（canvas 特效，独立模块便于主脚本控制行数）
export const initLotteryFx = (): { launchFireworks: () => void } => {
  const canvas = document.querySelector<HTMLCanvasElement>("#lottery-canvas");
  const ctx = canvas?.getContext("2d");
  const resize = () => {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener("resize", resize);
  resize();

  const GOLD = ["#f3ca51", "#ffd97a", "#f8b64c", "#fff3c4"];
  type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string; gravity: number };
  let ambient: Particle[] = [];
  let bursts: Particle[] = [];
  let fireworkEnd = 0;
  let nextBurstAt = 0;

  const spawnAmbient = () => {
    if (!canvas) return;
    ambient = Array.from({ length: 36 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.14,
      vy: -0.04 - Math.random() * 0.1,
      life: 0,
      maxLife: Infinity,
      size: 0.8 + Math.random() * 1.5,
      color: GOLD[Math.floor(Math.random() * GOLD.length)],
      gravity: 0,
    }));
  };

  const spawnBurst = () => {
    if (!canvas) return;
    const cx = canvas.width * (0.15 + Math.random() * 0.7);
    const cy = canvas.height * (0.18 + Math.random() * 0.5);
    const color = GOLD[Math.floor(Math.random() * GOLD.length)];
    for (let i = 0; i < 72; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      bursts.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 60 + Math.random() * 40,
        size: 1 + Math.random() * 2,
        color,
        gravity: 0.06,
      });
    }
  };

  const animate = () => {
    if (!canvas || !ctx) return;
    const now = performance.now();
    if (now < fireworkEnd && now >= nextBurstAt) {
      spawnBurst();
      nextBurstAt = now + 240;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ambient.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) {
        p.y = canvas.height + 10;
        p.x = Math.random() * canvas.width;
      }
      if (p.x < -10) p.x = canvas.width + 10;
      if (p.x > canvas.width + 10) p.x = -10;
      ctx.globalAlpha = 0.3 + 0.25 * Math.sin(now / 900 + p.x);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    bursts = bursts.filter((p) => {
      p.life += 1;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      if (p.life < p.maxLife) {
        ctx.globalAlpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        return true;
      }
      return false;
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(animate);
  };
  spawnAmbient();
  animate();

  return {
    launchFireworks: () => {
      fireworkEnd = performance.now() + 3000;
      nextBurstAt = performance.now();
    },
  };
};
