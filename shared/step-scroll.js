/* One deliberate wheel/touch/key gesture per screen. Native scrolling outside the story. */
(() => {
  window.createStepScroll = ({ positions, onStep = () => {} }) => {
    let raf = 0, moving = false, lastWheel = -Infinity, wheelDir = 0;
    let claimed = false, sum = 0, targetY = null, touch = null;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const editable = e => e.target.closest?.('input,textarea,select,[contenteditable="true"]');
    const stop = () => { cancelAnimationFrame(raf); moving = false; targetY = null; };
    const move = (y, index) => {
      stop();
      const from = scrollY, start = performance.now(), duration = 620;
      targetY = y; moving = true;
      if (index != null) onStep(index);
      const tick = now => {
        const t = Math.min(1, (now - start) / duration);
        window.scrollTo({ top: from + (y - from) * (1 - Math.pow(1 - t, 3)), behavior: 'instant' });
        if (t < 1) raf = requestAnimationFrame(tick);
        else { moving = false; targetY = null; }
      };
      raf = requestAnimationFrame(tick);
    };
    const destination = (dir, distance) => {
      const stops = positions();
      if (!stops?.length || reduced.matches) return null;
      const first = stops[0], last = stops.at(-1), y = scrollY;
      // Catch a strong gesture approaching the section before it can cross every screen.
      if (y < first - 3) return dir > 0 && y + distance >= first ? [first, 0] : null;
      if (y > last + 3) return dir < 0 && y - distance <= last ? [last, stops.length - 1] : null;
      let i = stops.reduce((best, p, k) => Math.abs(p-y) < Math.abs(stops[best]-y) ? k : best, 0);
      const next = i + dir;
      if (next < 0) return first <= 2 ? [first, 0] : [Math.max(0, first - innerHeight * .7), null];
      if (next >= stops.length) return [last + innerHeight * .85, null];
      return [stops[next], next];
    };
    addEventListener('wheel', e => {
      if (reduced.matches || editable(e) || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
      if (!dy) return;
      const now = performance.now(), dir = Math.sign(dy);
      // A pause or a deliberate direction reversal starts a new gesture. Inertia never queues steps.
      const fresh = now - lastWheel > 190 || (!moving && dir !== wheelDir && Math.abs(dy) > 8);
      lastWheel = now; wheelDir = dir;
      if (fresh && !moving) { claimed = false; sum = 0; }
      if (moving || claimed) { if (e.cancelable) e.preventDefault(); return; }
      sum += Math.abs(dy);
      const dest = destination(dir, Math.abs(dy));
      if (!dest) return;
      if (e.cancelable) e.preventDefault();
      if (sum < 8) return;
      claimed = true;
      move(...dest);
    }, { passive: false });
    addEventListener('touchstart', e => {
      if (e.touches.length !== 1 || editable(e) || reduced.matches) { touch = null; return; }
      touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, consumed: false };
    }, { passive: true });
    addEventListener('touchmove', e => {
      if (!touch || e.touches.length !== 1) return;
      if (touch.consumed) { if (e.cancelable) e.preventDefault(); return; }
      const dy = touch.y - e.touches[0].clientY, dx = touch.x - e.touches[0].clientX;
      if (Math.abs(dx) > Math.abs(dy) || Math.abs(dy) < 8) return;
      const dest = destination(Math.sign(dy), Math.abs(dy));
      if (!dest && !moving) return;
      if (e.cancelable) e.preventDefault();
      if (Math.abs(dy) < 28) return;
      touch.consumed = true;
      if (!moving && dest) move(...dest);
    }, { passive: false });
    for (const type of ['touchend', 'touchcancel']) addEventListener(type, () => { touch = null; }, { passive: true });
    addEventListener('keydown', e => {
      if (editable(e) || e.ctrlKey || e.altKey || e.metaKey || reduced.matches) return;
      if (e.key === 'Home' || e.key === 'End' || e.key === 'Escape') { stop(); claimed = false; return; }
      if (e.key === ' ' && e.target.closest?.('button,a')) return;
      const dir = ({ ArrowDown: 1, PageDown: 1, ' ': e.shiftKey ? -1 : 1, ArrowUp: -1, PageUp: -1 })[e.key];
      if (!dir) return;
      const dest = destination(dir, innerHeight);
      if (!dest) return;
      e.preventDefault();
      if (!moving && !e.repeat) move(...dest);
    });
    // Explicit navigation and viewport changes always take precedence over a pending glide.
    addEventListener('pointerdown', () => { stop(); claimed = false; }, { passive: true });
    addEventListener('resize', stop);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    return { cancel: stop, get moving() { return moving; }, get target() { return targetY; } };
  };
})();
