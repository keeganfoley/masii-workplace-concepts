/* Concept B — Stacked Wave
   Stacked sticky cards, a mark built from four layered segments, line-mask reveals. */
(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGsap = !!window.gsap;
document.documentElement.classList.add('js');

/* ───────── 1. The mark, split into four stacked layers ─────────
   Same path, same userSpace gradient, four step-shaped clips that follow the
   joints between the tab, the two strokes and the foot. A whole, unclipped mark
   sits underneath while assembled so antialiased joints never show a seam. */
const D = 'M541.19,238.12h-51.93v-71.42c0-5.12-4.11-9.26-9.19-9.26h-27.95c-8.06,0-15.74,3.5-21.07,9.59l-53.66,61.41c-5.21,5.97-12.67,9.42-20.54,9.57v-71.31c0-5.12-4.11-9.26-9.19-9.26h-27.95c-8.06,0-15.74,3.5-21.07,9.59l-53.66,61.41c-5.21,5.97-12.67,9.42-20.54,9.57v-72.91c0-4.23-3.43-7.66-7.66-7.66h-27.2c-18.58,0-33.65,15.06-33.65,33.65v51.94c0,3.01,2.44,5.45,5.45,5.45h52.29v73.65c0,5.12,4.11,9.26,9.19,9.26h17.67c7.86,0,15.36-3.32,20.68-9.16l58.82-64.59c5.32-5.84,12.82-9.16,20.68-9.16h5.36v73.65c0,5.12,4.11,9.26,9.19,9.26h17.67c7.86,0,15.36-3.32,20.68-9.16l58.82-64.59c5.32-5.84,12.82-9.16,20.68-9.16h5.36v74.36c0,4.53,3.67,8.2,8.2,8.2h26.43c18.71,0,33.88-15.17,33.88-33.88v-53.21c0-3.21-2.6-5.82-5.82-5.82Z';
const CLIPS = [
  '0,0 224.44,0 224.44,243 213.67,243 213.67,489 0,489',
  '224.44,0 356.85,0 356.85,243 346.07,243 346.07,489 213.67,489 213.67,243 224.44,243',
  '356.85,0 489.26,0 489.26,243 478.47,243 478.47,489 346.07,489 346.07,243 356.85,243',
  '489.26,0 703,0 703,489 478.47,489 478.47,243 489.26,243'
];
const ORIGINS = ['27% 41%', '40.6% 50%', '59.4% 50%', '73% 58%'];
const stage = $('#markStage');
const GRAD = id => `<linearGradient id="${id}" x1="88.72" y1="146.72" x2="557.77" y2="321.11" gradientUnits="userSpaceOnUse">
    <stop offset=".11" stop-color="#4dbef1"/><stop offset=".31" stop-color="#aadbb8"/><stop offset=".58" stop-color="#e2a7d4"/>
    <stop offset=".76" stop-color="#a26bea"/><stop offset=".88" stop-color="#7150e8"/><stop offset="1" stop-color="#4e4fe8"/></linearGradient>`;
const whole = document.createElement('div');
whole.className = 'seg seg-whole';
whole.innerHTML = `<svg viewBox="0 0 702.94 488.82"><defs>${GRAD('mgw')}</defs><path d="${D}" fill="url(#mgw)"/></svg>`;
stage.appendChild(whole);
CLIPS.forEach((pts, i) => {
  const seg = document.createElement('div');
  seg.className = 'seg';
  seg.style.transformOrigin = ORIGINS[i];
  seg.innerHTML = `<svg viewBox="0 0 702.94 488.82" style="transform-origin:${ORIGINS[i]}"><defs>
    ${GRAD('mg'+i)}
    <clipPath id="mc${i}"><polygon points="${pts}"/></clipPath></defs>
    <path d="${D}" fill="url(#mg${i})" clip-path="url(#mc${i})"/></svg>`;
  stage.appendChild(seg);
});
const segs = $$('.seg:not(.seg-whole)', stage);

/* ───────── 2. Line splitter (mask slide-up signature) ───────── */
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function tokenize(el) {
  const out = [];
  el.childNodes.forEach(n => {
    if (n.nodeName === 'BR') out.push({ br: true });
    else if (n.nodeType === 3) n.textContent.split(/\s+/).filter(Boolean).forEach(w => out.push({ w, g: false }));
    else if (n.nodeType === 1) {
      const g = n.classList.contains('grad-text');
      n.textContent.split(/\s+/).filter(Boolean).forEach(w => out.push({ w, g }));
    }
  });
  return out;
}
function split(el) {
  if (!el._src) el._src = el.innerHTML;
  el.innerHTML = el._src;
  const toks = tokenize(el);
  el.innerHTML = toks.map(t => t.br ? '<br>' : `<span class="w">${esc(t.w)}</span>`).join(' ');
  const ws = $$('.w', el), lines = [];
  let last = null, k = 0;
  toks.forEach(t => {
    if (t.br) { last = null; return; }
    const top = Math.round(ws[k++].offsetTop);
    if (last === null || Math.abs(top - last) > 4) { lines.push([]); last = top; }
    lines[lines.length - 1].push(t);
  });
  el.innerHTML = lines.map(line => {
    let html = '', inG = false;
    line.forEach((t, i) => {
      if (t.g && !inG) { html += (i ? ' ' : '') + '<span class="grad-text">'; inG = true; }
      else if (!t.g && inG) { html += '</span> '; inG = false; }
      else if (i) html += ' ';
      html += esc(t.w);
    });
    if (inG) html += '</span>';
    return `<span class="ln"><span class="ln-i">${html}</span></span>`;
  }).join('');
  el.classList.add('split');
  return $$('.ln-i', el);
}
const lineEls = $$('[data-lines]');

/* ───────── 3. Calculator (works with or without motion) ───────── */
const fmt = n => '$' + Math.round(n).toLocaleString('en-US');
const range = $('#headcount');
function nFrom(v) {
  let n = 10 * Math.pow(500, v / 1000);
  n = n < 100 ? Math.round(n) : n < 1000 ? Math.round(n / 5) * 5 : Math.round(n / 25) * 25;
  return Math.min(5000, Math.max(10, n));
}
const calcState = { n: 250 };
function paintCalc(n) {
  $('#nOut').textContent = Math.round(n).toLocaleString('en-US');
  $('#costOut').textContent = fmt(120 * n);
  $('#dayOut').textContent = fmt(375.12 * n);
}
function updateCalc(animate) {
  const n = nFrom(+range.value);
  range.style.setProperty('--p', (+range.value / 10) + '%');
  range.setAttribute('aria-valuetext', n.toLocaleString('en-US') + ' employees');
  const share = Math.min(1, 250 / n);
  $('#beBar').style.transform = `scaleX(${share})`;
  $('#beText').innerHTML = n <= 250
    ? `One retained employee (≈ $30,000) covers <b>all ${n.toLocaleString('en-US')}</b> of your employees for a year.`
    : `One retained employee (≈ $30,000) covers <b>250 of your ${n.toLocaleString('en-US')}</b> employees. Break-even at about <b>${(n / 250).toFixed(1)}</b> retained employees.`;
  if (animate && hasGsap && !reduce) gsap.to(calcState, { n, duration: .45, ease: 'power3.out', overwrite: true, onUpdate: () => paintCalc(calcState.n) });
  else { calcState.n = n; paintCalc(n); }
}
range.addEventListener('input', () => updateCalc(true));
updateCalc(false);

/* ───────── 4. Team flip cards ───────── */
$$('.team').forEach(b => b.addEventListener('click', () => {
  const on = b.classList.toggle('is-flipped');
  b.setAttribute('aria-pressed', on);
}));

/* ───────── 5. Marquee set duplication ───────── */
const track = $('#marquee');
const set = track.firstElementChild;
const clone = set.cloneNode(true); clone.setAttribute('aria-hidden', 'true');
track.appendChild(clone);

if (!hasGsap) { lineEls.forEach(el => el.classList.add('split')); document.documentElement.classList.remove('pre'); return; }

/* ───────── 6. Motion ───────── */
gsap.registerPlugin(ScrollTrigger);
// URL-bar show/hide on phones must never re-measure (and so never move) anything
ScrollTrigger.config({ ignoreMobileResize: true });
const unpre = () => document.documentElement.classList.remove('pre');

const isMob = () => innerWidth <= 820;
const fine = matchMedia('(hover: hover) and (pointer: fine)');

// Smooth wheel only for mouse/trackpad desktops. Touch devices keep 100% native momentum scrolling.
// Nothing ever calls scrollTo: no snapping, no settling, no re-sync jumps.
let lenis = null;
if (!reduce && window.Lenis && fine.matches) {
  lenis = new Lenis({ duration: 1, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  ScrollTrigger.addEventListener('refresh', () => lenis.resize());
  // while the page moves, nothing under a resting cursor should hover, tilt or pop a tooltip
  let st, scrolling = false;
  lenis.on('scroll', () => {
    if (!scrolling) { scrolling = true; document.documentElement.classList.add('is-scrolling'); }
    clearTimeout(st); st = setTimeout(() => { scrolling = false; document.documentElement.classList.remove('is-scrolling'); }, 140);
  });
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

const EASE = 'expo.out';
// don't wait on slow font loads forever: start within 1.5s either way
const startFonts = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 1500))]);
startFonts.then(init);

/* count-up: "$30,000" counts from 0 when its block reveals; text is set to 0 while still hidden */
function prepCount(el) {
  const m = el.textContent.match(/^([^\d]*)([\d,]+)(.*)$/);
  if (!m) return null;
  const to = +m[2].replace(/,/g, ''), o = { v: 0 };
  el.setAttribute('aria-label', el.textContent);
  el.textContent = m[1] + '0' + m[3];
  return () => gsap.to(o, { v: to, duration: 1.4, ease: 'power3.out', onUpdate: () => { el.textContent = m[1] + Math.round(o.v).toLocaleString('en-US') + m[3]; } });
}

function init() {
  lineEls.forEach(el => split(el));

  if (reduce) { buildHero(true); explainers(); unpre(); return; }

  /* hero: load-in stack (start state set before anything is shown) */
  const heroLines = $$('.ln-i', $('.hero-story'));
  gsap.set(heroLines, { yPercent: 110 });
  gsap.from(segs.map(s => s.firstElementChild), {
    x: i => ['-60vw', '-10vw', '10vw', '60vw'][i],
    y: i => ['-30vh', '70vh', '-70vh', '30vh'][i],
    rotate: i => [-18, 10, -10, 18][i],
    opacity: 0, duration: 1.6, ease: 'expo.out',
    stagger: { each: .14, from: 'end' }, delay: .1
  });
  gsap.fromTo(whole, { opacity: 0 }, { opacity: 1, duration: .3, delay: 2.1 });
  gsap.to(heroLines, { yPercent: 0, duration: 1.1, ease: EASE, stagger: .09, delay: .85 });
  gsap.from('#heroIntro .eyebrow, .topbar', { opacity: 0, y: 12, duration: 1, ease: EASE, delay: .7 });
  buildHero(false);

  /* line reveals: each line rises from behind its mask */
  lineEls.filter(el => !el.hasAttribute('data-scrub') && !el.hasAttribute('data-instant')).forEach(el => {
    gsap.set($$('.ln-i', el), { yPercent: 110 });
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => { el._shown = true; gsap.to($$('.ln-i', el), { yPercent: 0, duration: 1.15, ease: EASE, stagger: .085 }); }
    });
  });

  /* stagger groups: layers that drop into place (+ count-ups inside them) */
  const groups = [
    ['.price-stack', '.price', { y: 70, rotate: (i) => [-4, 5, -3, 4][i % 4], opacity: 0 }],
    ['.steps3', 'li', { y: 40, opacity: 0 }],
    ['.teams', '.team', { y: 60, opacity: 0, rotate: (i) => (i % 2 ? 2 : -2) }],
    ['.compare', '.crow', { y: 24, opacity: 0 }],
    ['.why', 'li', { y: 30, opacity: 0 }],
    ['.calc', '.calc-main, .calc-side', { y: 50, opacity: 0 }],
    ['.engage-bar', 'span', { scaleY: 0, transformOrigin: '50% 100%' }],
    ['.vs', '.vs-bar i', { scaleX: 0 }],
    ['.eq:not(.eq--two)', '.eq-block, .eq-op', { y: 60, opacity: 0, scale: .9 }],
    ['.eq--two', '.eq-block', { y: 60, opacity: 0, scale: .96 }],
    ['.types', 'li', { y: 40, opacity: 0 }],
    ['.launch-copy', '.drop', { y: 24, opacity: 0 }],
  ];
  groups.forEach(([p, c, from]) => {
    $$(p).forEach(parent => {
      const kids = $$(c, parent);
      gsap.set(kids, from);
      const counts = $$('.price strong, .eq-block strong', parent).map(prepCount).filter(Boolean);
      ScrollTrigger.create({
        trigger: parent, start: 'top 88%', once: true,
        onEnter: () => { gsap.to(kids, { y: 0, rotate: 0, opacity: 1, scale: 1, scaleX: 1, scaleY: 1, duration: 1.1, ease: EASE, stagger: .07 }); counts.forEach(f => f()); }
      });
    });
  });

  /* clip-path reveals, queued so only one or two run at once */
  let clipSlot = 0;
  $$('.clip-rr, .clip-circle').forEach(el => {
    const circle = el.classList.contains('clip-circle');
    const img = el.querySelector('img');
    gsap.set(el, { clipPath: circle ? 'circle(0% at 50% 50%)' : 'inset(46% 46% 46% 46% round 200px)' });
    gsap.set(img, { scale: 1.25 });
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => {
        const now = performance.now() / 1000, at = Math.max(now, clipSlot);
        clipSlot = at + .22;
        const delay = at - now + .12;
        gsap.to(el, { clipPath: circle ? 'circle(72% at 50% 50%)' : 'inset(0% 0% 0% 0% round 28px)', duration: 1.2, ease: EASE, delay,
          onComplete: () => gsap.set(el, { clearProps: 'clipPath' }) });
        gsap.to(img, { scale: 1, duration: 1.5, ease: EASE, delay, clearProps: 'transform' });
      }
    });
  });

  /* close: ii pattern drifts gently as the last section passes */
  gsap.to('.ii', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '#close', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* rollout: stacked deck fans out once, time-based */
  buildDeck();

  /* marquee: direction follows scroll direction, speed follows velocity (no layout reads) */
  let mx = 0, dir = -1, vel = 0, boost = 0, setW = set.offsetWidth, mqVisible = false, run = 1, paused = false;
  const band = $('.marquee');
  new IntersectionObserver(([e]) => { mqVisible = e.isIntersecting; track.style.willChange = mqVisible ? 'transform' : ''; }).observe(band);
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: self => { dir = self.direction > 0 ? -1 : 1; vel = Math.abs(self.getVelocity()) / 90; } });
  const setPause = v => { paused = v; band.classList.toggle('paused', v); };
  band.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') setPause(true); });
  band.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') setPause(false); });
  band.addEventListener('click', () => { if (!fine.matches) setPause(!paused); });
  gsap.ticker.add((t, dt) => {
    vel *= .9;
    if (!mqVisible) return;
    run += ((paused ? 0 : 1) - run) * .12;
    boost += (Math.min(vel * .35, 9) - boost) * .08;
    mx += dir * 70 * (dt / 1000) * (1 + boost) * run;
    if (mx <= -setW) mx += setW; else if (mx > 0) mx -= setW;
    track.style.transform = `translate3d(${mx.toFixed(1)}px,0,0)`;
  });

  interactions();
  explainers();

  /* responsive rebuild: only on a real width change (never on URL-bar height changes) */
  let lastW = innerWidth;
  ScrollTrigger.addEventListener('refreshInit', () => { setW = set.offsetWidth; });
  addEventListener('resize', () => {
    if (innerWidth === lastW) return;
    lastW = innerWidth;
    lineEls.forEach(el => {
      const lines = split(el);
      if (el.hasAttribute('data-scrub')) return;
      gsap.set(lines, { yPercent: (el._shown || el.hasAttribute('data-instant')) ? 0 : 110 });
    });
    buildHero(false);
  });
  ScrollTrigger.refresh();
  unpre();   // every start state is set; now it is safe to show
  // One refresh after load (fonts/images). There are no pins, so a refresh can never move scrollY.
  if (document.readyState !== 'complete') addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}

/* hero scroll: layers spread apart in depth, headline rises from behind them */
let heroTL;
function buildHero(staticEnd) {
  if (heroTL) { heroTL.scrollTrigger && heroTL.scrollTrigger.kill(); heroTL.kill(); }
  const hero = $('#hero');
  const mob = () => isMob();
  const P = () => mob()
    ? [{ x: -.2, y: -.34, s: .9, r: -10 }, { x: -.16, y: .36, s: 1.25, r: 7 }, { x: .16, y: -.36, s: .95, r: -6 }, { x: .2, y: .33, s: 1.45, r: 10 }]
    : [{ x: -.30, y: -.30, s: .8, r: -9 }, { x: -.25, y: .33, s: 1.3, r: 6 }, { x: .22, y: -.36, s: .95, r: -6 }, { x: .27, y: .30, s: 1.55, r: 9 }];
  const DUR = [1, .7, .85, .6]; // different speeds = layered parallax
  const h1 = $$('.ln-i', $('#hero-h')), sub = $$('.ln-i', $('.hero-sub'));
  heroTL = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: staticEnd ? null : {
      trigger: hero, start: 'top top', end: 'bottom bottom',
      scrub: .6, invalidateOnRefresh: true
    }
  });
  heroTL
    .to('#heroIntro', { opacity: 0, y: -40, duration: .3, ease: 'power2.in' }, 0)
    .to('#scrollCue', { opacity: 0, duration: .15 }, 0)
    .fromTo(whole, { autoAlpha: 1 }, { autoAlpha: 0, duration: .02, immediateRender: false }, 0);
  segs.forEach((s, i) => {
    heroTL.to(s, {
      x: () => P()[i].x * innerWidth, y: () => P()[i].y * innerHeight,
      scale: () => P()[i].s, rotate: () => P()[i].r,
      duration: DUR[i], ease: 'power2.inOut'
    }, 0);
  });
  heroTL
    .fromTo(h1, { yPercent: 110 }, { yPercent: 0, duration: .45, stagger: .1, ease: 'power3.out' }, .3)
    .fromTo('.hero-eyebrow', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .3 }, .35)
    .fromTo(sub, { yPercent: 110 }, { yPercent: 0, duration: .4, stagger: .08, ease: 'power3.out' }, .6)
    .to({}, { duration: .25 });
  if (staticEnd) { heroTL.progress(1); gsap.set('#heroIntro', { display: 'none' }); }
}

/* ───────── interaction layer ───────── */
function interactions() {
  const raf = fn => { let q = false, a; return (...args) => { a = args; if (!q) { q = true; requestAnimationFrame(() => { q = false; fn(...a); }); } }; };

  /* hero: the four layers follow the cursor in depth (tap = they bounce apart and resettle) */
  const svgs = segs.map(s => s.firstElementChild);
  const DEPTH = [.55, .9, 1.25, 1.75];
  let ready = false;
  gsap.delayedCall(2.2, () => { ready = true; });
  const qs = svgs.map(el => ({
    x: gsap.quickTo(el, 'x', { duration: .9, ease: 'power3.out' }), y: gsap.quickTo(el, 'y', { duration: .9, ease: 'power3.out' }),
    rx: gsap.quickTo(el, 'rotationX', { duration: 1.1, ease: 'power3.out' }), ry: gsap.quickTo(el, 'rotationY', { duration: 1.1, ease: 'power3.out' })
  }));
  const hero = $('#hero');
  const heroLive = () => window.scrollY < hero.offsetHeight;
  const aim = (nx, ny) => qs.forEach((q, i) => { const d = DEPTH[i]; q.x(nx * 26 * d); q.y(ny * 18 * d); q.ry(nx * 14); q.rx(-ny * 10); });
  addEventListener('pointermove', raf(e => {
    if (!ready || e.pointerType !== 'mouse' || !heroLive()) return;
    stage.classList.add('parallaxing');
    aim(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1);
  }), { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { if (ready) { aim(0, 0); stage.classList.remove('parallaxing'); } });
  hero.addEventListener('pointerdown', e => {
    if (!ready || e.pointerType === 'mouse') return;
    const nx = e.clientX / innerWidth * 2 - 1, ny = e.clientY / innerHeight * 2 - 1;
    stage.classList.add('parallaxing');
    gsap.timeline({ onComplete: () => stage.classList.remove('parallaxing') })
      .to(svgs, { x: i => (i - 1.5) * 22 - nx * 20 * DEPTH[i], y: i => (i % 2 ? -1 : 1) * 16 - ny * 14 * DEPTH[i], rotationY: nx * -12, duration: .28, ease: 'power2.out' })
      .to(svgs, { x: 0, y: 0, rotationY: 0, rotationX: 0, duration: 1.2, ease: 'elastic.out(1, .45)', stagger: .04 });
  });

  /* tiles: lift + tilt, with a glow that follows the pointer */
  const tiles = $$('.price, .why li, .types li, .eq-block, .calc-main, .calc-side, .crow:not(.chead), .drop');
  const TILT = el => !el.matches('.calc-main, .calc-side, .crow');   // big panels and table rows only glow
  tiles.forEach(el => {
    el.classList.add('lift');
    if (el.matches('.price--main, .eq-block:not(.eq-block--total), .crow--masii')) el.classList.add('on-dark');
    let r;
    const move = raf(e => {
      if (!r) return;
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      if (TILT(el) && e.pointerType === 'mouse' && !gsap.isTweening(el)) gsap.to(el, { rotationY: (px - .5) * 8, rotationX: (.5 - py) * 8, y: -6, transformPerspective: 700, duration: .45, ease: 'power3.out', overwrite: 'auto' });
    });
    el.addEventListener('pointerenter', e => { r = el.getBoundingClientRect(); el.classList.add('is-lit'); move(e); });
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', () => { r = null; el.classList.remove('is-lit'); if (TILT(el) && !gsap.isTweening(el)) gsap.to(el, { rotationY: 0, rotationX: 0, y: 0, duration: .7, ease: 'power3.out', overwrite: 'auto' }); });
    el.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') return;   // touch: a quick lift-and-glow pulse at the tap point
      r = el.getBoundingClientRect(); move(e); el.classList.add('is-lit');
      gsap.timeline().to(el, { y: -6, scale: 1.015, duration: .2, ease: 'power2.out', overwrite: 'auto' }).to(el, { y: 0, scale: 1, duration: .6, ease: 'elastic.out(1,.5)' });
      setTimeout(() => el.classList.remove('is-lit'), 700);
    });
  });

  /* team flip cards: glow follows the pointer on whichever face is showing, slight lift */
  $$('.team').forEach(el => {
    let r;
    const move = raf(e => { if (!r) return; el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%'); });
    el.addEventListener('pointerenter', e => { r = el.getBoundingClientRect(); el.classList.add('is-lit'); move(e); if (e.pointerType === 'mouse') gsap.to(el, { y: -6, duration: .4, ease: 'power3.out', overwrite: 'auto' }); });
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', () => { r = null; el.classList.remove('is-lit'); gsap.to(el, { y: 0, duration: .6, ease: 'power3.out', overwrite: 'auto' }); });
  });

  /* rollout: hovered card lifts, neighbours lean away (tap on touch) */
  const ins = $$('.step-in');
  let lifted = -1;
  const liftStep = i => {
    lifted = i;
    ins.forEach((el, j) => gsap.to(el, i < 0 ? { x: 0, y: 0, rotation: 0, scale: 1, duration: .7, ease: 'power3.out', overwrite: 'auto' }
      : j === i ? { y: -18, rotation: (i - 2) * 1.3, scale: 1.035, x: 0, duration: .5, ease: 'back.out(2)', overwrite: 'auto' }
      : { x: Math.sign(j - i) * (isMob() ? 0 : 16), y: 4, rotation: Math.sign(j - i) * 1.5, scale: .985, duration: .55, ease: 'power3.out', overwrite: 'auto' }));
  };
  ins.forEach((el, i) => {
    el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') liftStep(i); });
    el.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') liftStep(-1); });
    el.addEventListener('click', () => { if (!fine.matches) liftStep(lifted === i ? -1 : i); });
  });
}

/* calculator explainers: hover / focus / tap a figure to see how it is calculated */
function explainers() {
  const tip = $('#tip');
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  const N = () => nFrom(+range.value), n$ = () => N().toLocaleString('en-US');
  const T = {
    n: () => ['Covered employees', `Drag from 10 to 5,000. Every figure on this card recalculates for ${n$()} people.`],
    cost: () => ['$120 × covered employees', `$10 a month × 12 = $120 per person.<br><code>$120 × ${n$()} = ${money(120 * N())}</code>`],
    day: () => ['One volunteer day, same team', `$46.89/hour (BLS, June 2026, wages + benefits) × 8 hours = $375.12 per person.<br><code>$375.12 × ${n$()} = ${money(375.12 * N())}</code><br>Labor value, not automatic cash savings.`],
    be: () => ['Break-even', `One replacement ≈ $30,000 (illustrative). <code>$30,000 ÷ $120 = 250</code> employees covered for a year.<br>` +
      (N() <= 250 ? `Your ${n$()} employees are fully covered by one retained employee.` : `<code>${n$()} ÷ 250 = ${(N() / 250).toFixed(1)}</code> retained employees to break even.`)],
    vsm: () => ['A year of MASii', '<code>$10 × 12 months = $120</code> per covered employee. $0 for employees, no added fees.'],
    vsd: () => ['One volunteer day', '<code>$46.89/hour × 8 hours = $375.12</code>: one workday of wages + benefits (BLS, June 2026).'],
    pct: () => ['68% below', '<code>1 − ($120 ÷ $375.12) = 0.68</code><br>A full year of MASii costs 68% less than one 8-hour workday.'],
    eng: () => ['Cost per engagement', '100 employees × $120 = $12,000 a year.<br><code>$12,000 ÷ ~13,520 ≈ $0.89</code><br>All 50 engaged, once a day: <code>50 × 365 = 18,250</code> → ≈ $0.66.'],
    e1: () => ['2× daily', '<code>10 people × 2 × 365 = 7,300</code> engagements a year.'],
    e2: () => ['1× daily', '<code>10 people × 365 = 3,650</code> engagements a year.'],
    e3: () => ['3× weekly', '<code>10 people × 3 × 52 = 1,560</code> engagements a year.'],
    e4: () => ['1× weekly', '<code>20 people × 52 = 1,040</code> engagements a year.'],
    e5: () => ['No engagement', '50 people do not use it in this example. They are still covered, and still part of the $12,000.'],
    q250: () => ['Employees', 'The example company size for the break-even.'],
    q120: () => ['Per year', '<code>$10 per employee per month × 12 = $120</code>'],
    q30: () => ['MASii for a year', '<code>250 × $120 = $30,000</code> covers every employee for a year.'],
    qrep: () => ['Replacing one employee', 'An illustrative recruiting and training cost. Not a measured MASii retention result.']
  };
  let cur = null;
  const show = el => {
    const f = T[el.dataset.x]; if (!f) return;
    const [h, body] = f();
    tip.innerHTML = `<b>${h}</b>${body}`;
    tip.hidden = false;
    const r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = r.left + r.width / 2 - tw / 2; x = Math.max(12, Math.min(innerWidth - tw - 12, x));
    let y = r.top - th - 12; if (y < 12) y = r.bottom + 12;
    tip.style.setProperty('--tx', x + 'px'); tip.style.setProperty('--ty', y + 'px');
    requestAnimationFrame(() => tip.classList.add('show'));
    if (cur && cur !== el) cur.classList.remove('x-on');
    cur = el; el.classList.add('x-on');
  };
  const hide = () => { tip.classList.remove('show'); if (cur) cur.classList.remove('x-on'); cur = null; };
  $$('.x').forEach(el => {
    el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') show(el); });
    el.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hide(); });
    el.addEventListener('focus', () => show(el));
    el.addEventListener('blur', hide);
    el.addEventListener('click', e => { if (fine.matches) return; e.stopPropagation(); cur === el ? hide() : show(el); });
  });
  document.addEventListener('click', e => { if (cur && !e.target.closest('.x')) hide(); });
  const onScroll = () => { if (cur && document.activeElement !== cur) hide(); };
  if (lenis) lenis.on('scroll', onScroll); else addEventListener('scroll', onScroll, { passive: true });
  range.addEventListener('input', () => { if (cur) show(cur); });
}

function buildDeck() {
  const deck = $('#deck'), steps = $$('.step', deck), bar = $('#deckBar'), vp = deck.parentElement;
  // starts stacked like a deck, fans out once when it scrolls into view (time-based, never pinned)
  const stacked = () => isMob()
    ? { x: i => steps[0].offsetLeft - steps[i].offsetLeft + i * 10, y: i => i * -8, rotate: i => [0, 5, -5, 8, -8][i], scale: 1 }
    : { x: i => deck.offsetWidth / 2 - (steps[i].offsetLeft + steps[i].offsetWidth / 2) + i * 14, y: i => i * -10, rotate: i => [0, 5, -5, 9, -9][i], scale: i => 1 - i * .02 };
  gsap.set(steps, stacked());
  ScrollTrigger.create({
    trigger: deck, start: 'top 78%', once: true,
    onEnter: () => {
      gsap.to(steps, { x: 0, y: 0, rotate: 0, scale: 1, duration: 1.3, ease: 'power3.inOut', stagger: .09, delay: .15, clearProps: 'transform' });
      if (!isMob()) gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 1.7, ease: 'power2.inOut', delay: .15 });
    }
  });
  // phones: the fanned row is a native horizontal swipe; the bar tracks it (passive, rAF-batched)
  let q = false;
  vp.addEventListener('scroll', () => {
    if (q) return; q = true;
    requestAnimationFrame(() => { q = false; const m = vp.scrollWidth - vp.clientWidth; bar.style.transform = `scaleX(${m > 0 ? .2 + .8 * vp.scrollLeft / m : 1})`; });
  }, { passive: true });
  if (isMob()) bar.style.transform = 'scaleX(.2)';
}
})();
