'use client';

import { useEffect, useRef } from 'react';

const SPACING = 28;
const DOT_RADIUS = 1;
const INFLUENCE = 140;
const MAX_DISPLACEMENT = 22;

export function DotGrid({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const target = useRef({ x: -9999, y: -9999 });
  const raf = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    let w = 0, h = 0;

    function resize() {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      // Smooth lerp toward real mouse position
      mouse.current.x += (target.current.x - mouse.current.x) * 0.09;
      mouse.current.y += (target.current.y - mouse.current.y) * 0.09;

      const mx = mouse.current.x;
      const my = mouse.current.y;
      const cols = Math.ceil(w / SPACING) + 2;
      const rows = Math.ceil(h / SPACING) + 2;

      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const gx = i * SPACING;
          const gy = j * SPACING;

          const dx = gx - mx;
          const dy = gy - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let ox = 0, oy = 0, r = DOT_RADIUS;

          if (dist < INFLUENCE && dist > 0) {
            const t = 1 - dist / INFLUENCE;
            const force = t * t;
            // Repel dots away from cursor
            ox = -(dx / dist) * force * MAX_DISPLACEMENT;
            oy = -(dy / dist) * force * MAX_DISPLACEMENT;
            // Grow dots near cursor
            r = DOT_RADIUS * (1 + t * 2.5);
          }

          const alpha = 0.45 + (dist < INFLUENCE ? (1 - dist / INFLUENCE) * 0.45 : 0);
          ctx.beginPath();
          ctx.arc(gx + ox, gy + oy, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(161,161,170,${alpha})`;
          ctx.fill();
        }
      }

      raf.current = requestAnimationFrame(draw);
    }

    function onMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      target.current.x = e.clientX - rect.left;
      target.current.y = e.clientY - rect.top;
    }

    function onLeave() {
      target.current.x = -9999;
      target.current.y = -9999;
    }

    resize();
    draw();

    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('resize', resize);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} style={{ pointerEvents: 'none' }} />;
}
