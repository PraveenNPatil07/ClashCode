import { useEffect, useRef } from 'react';

export function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot  = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    // Don't show on touch devices
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const dotEl = dot;
    const ringEl = ring;
    dotEl.style.display  = 'block';
    ringEl.style.display = 'block';

    let mx = 0, my = 0;
    let rx = 0, ry = 0;
    let raf: number;

    function onMove(e: MouseEvent) {
      mx = e.clientX;
      my = e.clientY;
      dotEl.style.transform = `translate(${mx - 4}px, ${my - 4}px)`;
    }

    function animateRing() {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ringEl.style.transform = `translate(${rx - 16}px, ${ry - 16}px)`;
      raf = requestAnimationFrame(animateRing);
    }

    function onEnterInteractive() { ringEl.classList.add('hovered'); }
    function onLeaveInteractive() { ringEl.classList.remove('hovered'); }

    const interactives = document.querySelectorAll<HTMLElement>(
      'a, button, [role="button"], input, select, textarea, [tabindex]'
    );
    interactives.forEach(el => {
      el.addEventListener('mouseenter', onEnterInteractive);
      el.addEventListener('mouseleave', onLeaveInteractive);
    });

    window.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(animateRing);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
      interactives.forEach(el => {
        el.removeEventListener('mouseenter', onEnterInteractive);
        el.removeEventListener('mouseleave', onLeaveInteractive);
      });
    };
  }, []);

  return (
    <>
      <div ref={dotRef}  className="cursor-dot"  style={{ display: 'none' }} aria-hidden="true" />
      <div ref={ringRef} className="cursor-ring" style={{ display: 'none' }} aria-hidden="true" />
    </>
  );
}
