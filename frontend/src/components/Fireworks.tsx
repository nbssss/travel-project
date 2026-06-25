import { useEffect, useRef, useState } from "react";

const COLORS = [
  "#FF0066", "#FF4500", "#FF8C00", "#FFD700",
  "#00E676", "#00BCD4", "#7C4DFF", "#FF69B4",
  "#E040FB", "#FFFFFF",
];

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  alpha: number;
  color: string;
  radius: number;
  decay: number;
}

function burst(x: number, y: number, out: Particle[]) {
  const count = 70;
  const baseColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
    const speed = 2.5 + Math.random() * 5.5;
    out.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      color: Math.random() < 0.6 ? baseColor : COLORS[Math.floor(Math.random() * COLORS.length)],
      radius: 1.5 + Math.random() * 3,
      decay: 0.010 + Math.random() * 0.008,
    });
  }
}

const BURSTS = [
  { rx: 0.25, ry: 0.35, delay: 100 },
  { rx: 0.70, ry: 0.25, delay: 350 },
  { rx: 0.50, ry: 0.18, delay: 600 },
  { rx: 0.15, ry: 0.45, delay: 850 },
  { rx: 0.82, ry: 0.40, delay: 1100 },
  { rx: 0.38, ry: 0.28, delay: 1350 },
  { rx: 0.62, ry: 0.22, delay: 1600 },
  { rx: 0.50, ry: 0.38, delay: 1850 },
  { rx: 0.30, ry: 0.15, delay: 2100 },
  { rx: 0.72, ry: 0.32, delay: 2350 },
];

export function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasAlpha, setCanvasAlpha] = useState(1);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];

    BURSTS.forEach(({ rx, ry, delay }) => {
      timers.push(setTimeout(() => {
        burst(canvas.width * rx, canvas.height * ry, particles);
      }, delay));
    });

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.09;    // gravity
        p.vx *= 0.985;   // air drag
        p.vy *= 0.985;
        p.alpha -= p.decay;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(draw);
    };
    draw();

    // Fade canvas out after bursts are done
    const fadeTimer = setTimeout(() => {
      setCanvasAlpha(0);
    }, 3200);

    // Unmount after fade
    const removeTimer = setTimeout(() => {
      setGone(true);
    }, 4200);

    timers.push(fadeTimer, removeTimer);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", resize);
    };
  }, []);

  if (gone) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      style={{
        opacity: canvasAlpha,
        transition: "opacity 1s ease-out",
        width: "100vw",
        height: "100vh",
      }}
    />
  );
}
