/* Concept E — Best of: everything after the deck.
   Concept B's stacked sticky cards (explicit z-order, bottom-pinned tall cards, pointer-events off
   while scrolling, Lenis re-synced on every ScrollTrigger refresh) and line-mask reveals; C's live
   "how it's calculated" tips; A's count-ups and engagement dot grid. */
(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)');
const hasGsap = !!window.gsap;
const root = document.documentElement;
root.classList.add('js');
const split = window.splitLines;
const fmtN = (n, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const money = (n, d = 0) => '$' + fmtN(d ? n : Math.round(n), d);
const rafThrottle = fn => { let q = false, a; return (...args) => { a = args; if (!q) { q = true; requestAnimationFrame(() => { q = false; fn(...a); }); } }; };

/* ───────── 1. Headcount calculator (B) ───────── */
const range = $('#headcount');
function nFrom(v) {
  let n = 10 * Math.pow(500, v / 1000);
  n = n < 100 ? Math.round(n) : n < 1000 ? Math.round(n / 5) * 5 : Math.round(n / 25) * 25;
  return Math.min(5000, Math.max(10, n));
}
const N = () => nFrom(+range.value);
const calcState = { n: 250 };
function paintCalc(n) {
  $('#nOut').textContent = fmtN(Math.round(n));
  $('#costOut').textContent = money(120 * n);
  $('#dayOut').textContent = money(375.12 * n);
}
function updateCalc(animate) {
  const n = N();
  range.style.setProperty('--p', (+range.value / 10) + '%');
  range.setAttribute('aria-valuetext', fmtN(n) + ' employees');
  $('#beBar').style.transform = `scaleX(${Math.min(1, 250 / n)})`;
  $('#beText').innerHTML = n <= 250
    ? `One retained employee (≈ $30,000) covers <b>all ${fmtN(n)}</b> of your employees for a year.`
    : `One retained employee (≈ $30,000) covers <b>250 of your ${fmtN(n)}</b> employees. Break-even at about <b>${(n / 250).toFixed(1)}</b> retained employees.`;
  if (animate && hasGsap && !reduce) gsap.to(calcState, { n, duration: .45, ease: 'power3.out', overwrite: true, onUpdate: () => paintCalc(calcState.n) });
  else { calcState.n = n; paintCalc(n); }
}
range.addEventListener('input', () => updateCalc(true));
updateCalc(false);

/* ───────── 2. Engagement example: A's dot grid + C's mix switch ───────── */
const FREQ = [['2x daily', 730, '#4E4FE8'], ['1x daily', 365, '#8273EB'], ['3x weekly', 156, '#E2A7D4'], ['1x weekly', 52, '#6DBCEC'], ['No engagement', 0, null]];
const MIX = {
  deck: { counts: [10, 10, 10, 20, 50], eng: 13520, cpe: .89, note: 'If all 50 engaged employees visited 1x daily: ~$0.66 per engagement.' },
  daily: { counts: [0, 50, 0, 0, 50], eng: 18250, cpe: .66, note: 'The deck’s upper case: the same 50 engaged employees, each visiting once a day.' }
};
let mix = 'deck';
const dots = $('.dots'), legend = $('.eng-legend');
for (let i = 0; i < 100; i++) { const d = document.createElement('i'); d.style.setProperty('--k', i); dots.appendChild(d); }
legend.innerHTML = FREQ.map((f, g) => `<li><button type="button" class="x" data-x="g${g}" data-g="${g}"><i ${f[2] ? `style="--c:${f[2]}"` : 'class="none"'}></i><span><b class="gc">0</b> × ${f[0]}</span><em>${f[1] ? fmtN(f[1]) + ' / yr each' : 'still covered'}</em></button></li>`).join('');
const legBtns = $$('button', legend);
const engState = { n: 50, y: 13520, c: .89 };
function paintMix(animate) {
  const m = MIX[mix];
  let k = 0;
  m.counts.forEach((c, g) => { for (let j = 0; j < c; j++, k++) { const d = dots.children[k]; d.dataset.g = g; if (FREQ[g][2]) { d.style.setProperty('--c', FREQ[g][2]); d.classList.remove('none'); } else { d.style.removeProperty('--c'); d.classList.add('none'); } } });
  legBtns.forEach((b, g) => { b.querySelector('.gc').textContent = m.counts[g]; b.parentElement.style.opacity = m.counts[g] ? '' : '.45'; });
  $('#engNote').textContent = m.note;
  const to = { n: 100 - m.counts[4], y: m.eng, c: m.cpe };
  const paint = () => { $('#engN').textContent = Math.round(engState.n); $('#engY').textContent = fmtN(Math.round(engState.y)); $('#engC').textContent = engState.c.toFixed(2); };
  if (animate && hasGsap && !reduce) gsap.to(engState, { ...to, duration: .8, ease: 'power3.out', overwrite: true, onUpdate: paint });
  else { Object.assign(engState, to); paint(); }
}
const tabs = $$('.seg-tabs [data-mix]'), ind = $('.seg-ind');
const placeInd = () => { const b = tabs.find(t => t.classList.contains('is-on')); if (!b) return; ind.style.width = b.offsetWidth + 'px'; ind.style.transform = `translateX(${b.offsetLeft}px)`; };
tabs.forEach(b => b.addEventListener('click', () => {
  if (mix === b.dataset.mix) return;
  mix = b.dataset.mix;
  tabs.forEach(t => { const on = t === b; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on); });
  placeInd(); paintMix(true);
}));
paintMix(false);
let locked = null;
const showGroup = g => {
  dots.classList.toggle('has-focus', g !== null);
  $$('i', dots).forEach(d => d.classList.toggle('is-g', g !== null && d.dataset.g === String(g)));
  legBtns.forEach(b => b.classList.toggle('is-on', b.dataset.g === String(g)));
};
legBtns.forEach(b => {
  b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') showGroup(b.dataset.g); });
  b.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') showGroup(locked); });
  b.addEventListener('focus', () => showGroup(b.dataset.g));
  b.addEventListener('blur', () => showGroup(locked));
  b.addEventListener('click', () => { locked = locked === b.dataset.g ? null : b.dataset.g; showGroup(locked); });
});

/* ───────── 3. Team flip cards ───────── */
$$('.team').forEach(b => {
  $$('.face', b).forEach(f => f.appendChild(Object.assign(document.createElement('span'), { className: 'glowl' })));
  b.addEventListener('click', () => { const on = b.classList.toggle('is-flipped'); b.setAttribute('aria-pressed', on); });
});

/* ───────── 4. Math on hover / focus / tap, for every number ───────── */
const tip = $('#tip');
const T = {
  p10: () => ['$10 per covered employee', 'One monthly contribution: charitable giving with Workplace access included.*'],
  p120: () => ['$120 per year', '<code>$10 × 12 months = $120</code> per covered employee.'],
  p0: () => ['$0 for employees', 'The company funds it. Employees claim employer-paid access. No card needed.'],
  pnone: () => ['No added fees', 'Giving and app access sit inside the one monthly contribution.'],
  row10: () => ['$10 / employee / month', '<code>$10 × 12 = $120</code> per covered employee a year, with no added program fees.'],
  n: () => ['Covered employees', `Drag from 10 to 5,000. Every figure on this card recalculates for ${fmtN(N())} people.`],
  cost: () => ['$120 × covered employees', `$10 a month × 12 = $120 per person.<br><code>$120 × ${fmtN(N())} = ${money(120 * N())}</code>`],
  day: () => ['One volunteer day, same team', `$46.89/hour (BLS, June 2026, wages + benefits) × 8 hours = $375.12 per person.<br><code>$375.12 × ${fmtN(N())} = ${money(375.12 * N())}</code><br>Labor value, not automatic cash savings.`],
  be: () => ['Break-even', 'One replacement ≈ $30,000 (illustrative). <code>$30,000 ÷ $120 = 250</code> employees covered for a year.<br>' +
    (N() <= 250 ? `Your ${fmtN(N())} employees are fully covered by one retained employee.` : `<code>${fmtN(N())} ÷ 250 = ${(N() / 250).toFixed(1)}</code> retained employees to break even.`)],
  vsm: () => ['A year of MASii', '<code>$10 × 12 months = $120</code> per covered employee. $0 for employees, no added fees.'],
  vsd: () => ['One volunteer day', '<code>$46.89/hour × 8 hours = $375.12</code>: one workday of wages + benefits (BLS, June 2026).'],
  pct: () => ['68% below', '<code>1 − ($120 ÷ $375.12) = 0.68</code><br>A full year of MASii costs 68% less than the labor value of one 8-hour workday.'],
  engN: () => ['Who engages', mix === 'deck' ? '<code>10 + 10 + 10 + 20 = 50</code> of 100 employees engage at some frequency; 50 do not.' : 'The same 50 engaged employees; the other 50 do not engage.'],
  engY: () => ['Engagements a year', mix === 'deck'
    ? 'Visits a year: 2x daily = 730, 1x daily = 365, 3x weekly = 156, 1x weekly = 52.<br><code>10×730 + 10×365 + 10×156 + 20×52 = 13,550</code><br>The deck rounds this to ~13,520.'
    : '<code>50 people × 365 days = 18,250</code> engagements a year.'],
  engC: () => ['Cost per engagement', mix === 'deck'
    ? '100 employees × $120 = $12,000 a year.<br><code>$12,000 ÷ ~13,520 ≈ $0.89</code>'
    : '<code>$12,000 ÷ 18,250 ≈ $0.66</code>'],
  q250: () => ['Employees', 'The example company size for the break-even.'],
  q120: () => ['Per year', '<code>$10 per employee per month × 12 = $120</code>'],
  q30: () => ['MASii for a year', '<code>250 × $120 = $30,000</code> covers every employee for a year.'],
  qrep: () => ['Replacing one employee', 'An illustrative recruiting and training cost. Not a measured MASii retention result.']
};
FREQ.forEach((f, g) => { T['g' + g] = () => { const c = MIX[mix].counts[g]; return [f[0], f[1] ? `<code>${c} people × ${fmtN(f[1])} = ${fmtN(c * f[1])}</code> engagements a year.` : `${c} people do not use it in this example. They are still covered, and still part of the $12,000.`]; }; });
let tipCur = null;
const showTip = el => {
  const f = T[el.dataset.x]; if (!f) return;
  const [h, body] = f();
  tip.innerHTML = `<small>How it’s calculated</small><b>${h}</b>${body}`;
  tip.hidden = false;
  const r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = r.left + r.width / 2 - tw / 2; x = Math.max(12, Math.min(innerWidth - tw - 12, x));
  let y = r.top - th - 12; if (y < 12) y = r.bottom + 12;
  tip.style.setProperty('--tx', x + 'px'); tip.style.setProperty('--ty', y + 'px');
  requestAnimationFrame(() => tip.classList.add('show'));
  if (tipCur && tipCur !== el) tipCur.classList.remove('x-on');
  tipCur = el; el.classList.add('x-on');
};
const hideTip = () => { tip.classList.remove('show'); if (tipCur) tipCur.classList.remove('x-on'); tipCur = null; };
$$('.x').forEach(el => {
  el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') showTip(el); });
  el.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hideTip(); });
  el.addEventListener('focus', () => showTip(el));
  el.addEventListener('blur', hideTip);
  el.addEventListener('click', e => { if (fine.matches) return; e.stopPropagation(); tipCur === el ? hideTip() : showTip(el); });
});
document.addEventListener('click', e => { if (tipCur && !e.target.closest('.x')) hideTip(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });
range.addEventListener('input', () => { if (tipCur) showTip(tipCur); });
tabs.forEach(b => b.addEventListener('click', () => { if (tipCur) showTip(tipCur); }));

/* ───────── 5. Concept pill: hides on the way down, returns on the way up ───────── */
let lastY = scrollY;
const pill = y => { const d = y - lastY; if (Math.abs(d) < 4) return; root.classList.toggle('tag-hide', d > 0 && y > 60); lastY = y; };

/* ───────── 6. Interaction layer (works with or without motion) ───────── */
function interactions() {
  const G = hasGsap && !reduce;
  /* pointer-following glow (+ tilt and lift on the small tiles) */
  const tiles = $$('.why li, .types li, .eq-block, .drop, .crow:not(.chead), .step-in, .glow');
  const TILT = el => el.matches('.why li, .types li, .eq-block, .drop');
  tiles.forEach(el => {
    if (!el.classList.contains('glow')) el.classList.add('lift');
    if (el.matches('.eq-block:not(.eq-block--total), .crow--masii, .step:first-child .step-in')) el.classList.add('on-dark');
    let r;
    const move = rafThrottle(e => {
      if (!r) return;
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      if (G && TILT(el) && e.pointerType === 'mouse') gsap.to(el, { rotationY: (px - .5) * 8, rotationX: (.5 - py) * 8, y: -6, transformPerspective: 700, duration: .45, ease: 'power3.out', overwrite: 'auto' });
    });
    el.addEventListener('pointerenter', e => { r = el.getBoundingClientRect(); el.classList.add('is-lit'); move(e); });
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', () => { r = null; el.classList.remove('is-lit'); if (G && TILT(el)) gsap.to(el, { rotationY: 0, rotationX: 0, y: 0, duration: .7, ease: 'power3.out', overwrite: 'auto' }); });
    el.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') return;   // touch: a lift-and-glow pulse at the tap point
      r = el.getBoundingClientRect(); move(e); el.classList.add('is-lit');
      if (G && !el.matches('.step-in')) gsap.timeline().to(el, { y: -6, scale: 1.015, duration: .2, ease: 'power2.out', overwrite: 'auto' }).to(el, { y: 0, scale: 1, duration: .6, ease: 'elastic.out(1,.5)' });
      setTimeout(() => el.classList.remove('is-lit'), 700);
    });
  });
  /* comparison rows: touch taps "hover" a row */
  $$('.crow:not(.chead)').forEach(rw => rw.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; $$('.crow.is-hot').forEach(x => x !== rw && x.classList.remove('is-hot')); rw.classList.toggle('is-hot'); }));
  /* team cards: glow follows the pointer on whichever face shows, slight lift */
  $$('.team').forEach(el => {
    let r;
    const move = rafThrottle(e => { if (!r) return; el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%'); });
    el.addEventListener('pointerenter', e => { r = el.getBoundingClientRect(); el.classList.add('is-lit'); move(e); if (G && e.pointerType === 'mouse') gsap.to(el, { y: -6, duration: .4, ease: 'power3.out', overwrite: 'auto' }); });
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', () => { r = null; el.classList.remove('is-lit'); if (G) gsap.to(el, { y: 0, duration: .6, ease: 'power3.out', overwrite: 'auto' }); });
  });
  /* magnetic pills */
  if (G) $$('.seg-tabs button, .eng-legend button, .concept-tag, .skip-site').forEach(el => {
    const qx = gsap.quickTo(el, 'x', { duration: .5, ease: 'power3.out' }), qy = gsap.quickTo(el, 'y', { duration: .5, ease: 'power3.out' });
    el.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const r = el.getBoundingClientRect(); qx((e.clientX - r.left - r.width / 2) * .22); qy((e.clientY - r.top - r.height / 2) * .3); });
    el.addEventListener('pointerleave', () => { qx(0); qy(0); });
  });
  /* cursor-reactive 3D assets: coin, heart + photo, closing mark */
  const react = (zone, fn, reset) => {
    const mv = rafThrottle(e => { const r = zone.getBoundingClientRect(); fn((e.clientX - r.left) / r.width * 2 - 1, (e.clientY - r.top) / r.height * 2 - 1); });
    zone.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') mv(e); });
    zone.addEventListener('pointerleave', reset);
    zone.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; mv(e); setTimeout(reset, 900); });
  };
  const coin = $('.coin3d'), side = $('.calc-side');
  react(side, (x, y) => { coin.style.setProperty('--ry', (x * 34).toFixed(1) + 'deg'); coin.style.setProperty('--rx', (-y * 22).toFixed(1) + 'deg'); }, () => { coin.style.setProperty('--ry', '0deg'); coin.style.setProperty('--rx', '0deg'); });
  side.addEventListener('click', () => { coin.style.setProperty('--ry', '360deg'); setTimeout(() => coin.style.setProperty('--ry', '0deg'), 650); });
  const heart = $('.heart3d'), photo = $('.photo img'), lv = $('.launch-visual');
  react(lv, (x, y) => { heart.style.setProperty('--ry', (x * 26).toFixed(1) + 'deg'); heart.style.setProperty('--rx', (-y * 18).toFixed(1) + 'deg'); heart.style.setProperty('--hx', (x * 16).toFixed(1) + 'px'); heart.style.setProperty('--hy', (y * 12).toFixed(1) + 'px'); photo.style.setProperty('--ix', (-x * 10).toFixed(1) + 'px'); photo.style.setProperty('--iy', (-y * 8).toFixed(1) + 'px'); },
    () => ['--ry', '--rx', '--hx', '--hy'].forEach(p => heart.style.removeProperty(p)) || ['--ix', '--iy'].forEach(p => photo.style.removeProperty(p)));
  const art = $('.close-art'), close = $('#close');
  react(close, (x, y) => { art.style.setProperty('--px', x.toFixed(3)); art.style.setProperty('--py', y.toFixed(3)); art.style.setProperty('--ry', (x * 22).toFixed(1) + 'deg'); art.style.setProperty('--rx', (-y * 14).toFixed(1) + 'deg'); },
    () => ['--px', '--py', '--ry', '--rx'].forEach(p => art.style.removeProperty(p)));
  art.addEventListener('click', () => { art.classList.remove('pop'); void art.offsetWidth; art.classList.add('pop'); });
  /* rollout: hovered card lifts, neighbours lean away (tap on touch) */
  const ins = $$('.step-in'); let lifted = -1;
  const mob = () => innerWidth <= 800;
  const liftStep = i => {
    lifted = i; if (!G) return;
    ins.forEach((el, j) => gsap.to(el, i < 0 ? { x: 0, y: 0, rotation: 0, scale: 1, duration: .7, ease: 'power3.out', overwrite: 'auto' }
      : j === i ? { y: mob() ? 0 : -18, x: mob() ? 8 : 0, rotation: mob() ? 0 : (i - 2) * 1.3, scale: 1.035, duration: .5, ease: 'back.out(2)', overwrite: 'auto' }
      : { x: mob() ? 0 : Math.sign(j - i) * 16, y: mob() ? Math.sign(j - i) * 4 : 4, rotation: mob() ? 0 : Math.sign(j - i) * 1.5, scale: .985, duration: .55, ease: 'power3.out', overwrite: 'auto' }));
  };
  ins.forEach((el, i) => {
    el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') liftStep(i); });
    el.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') liftStep(-1); });
    el.addEventListener('click', () => { if (!fine.matches) liftStep(lifted === i ? -1 : i); });
  });
}

/* ───────── 7. Motion ───────── */
if (!hasGsap || reduce) {
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    $$('[data-lines]').forEach(el => split ? split(el) : el.classList.add('split'));
    placeInd(); layoutStatic();
  });
  $$('.vs, .scale').forEach(el => el.classList.add('in'));
  $$('.deck-progress i').forEach(i => i.style.transform = 'none');
  interactions();
  addEventListener('scroll', () => pill(scrollY), { passive: true });
  addEventListener('resize', () => { placeInd(); layoutStatic(); });
  function layoutStatic() {}
  return;
}

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });
const cards = $$('.stack > .card');
cards.forEach((c, i) => { c.style.zIndex = i + 1; });   // explicit, increasing z-order: no bleed-through
const marks = cards.map(c => { const m = document.createElement('div'); m.className = 'flow-mark'; c.before(m); return m; });
const absTop = el => el.getBoundingClientRect().top + window.scrollY;
const cardTop = i => absTop(marks[i]) + marks[i].offsetHeight;
function flowTop(el) {
  const card = el.closest('.card');
  if (!card) return absTop(el);
  let y = 0, n = el;
  while (n && n !== card) { y += n.offsetTop; n = n.offsetParent; }
  return cardTop(cards.indexOf(card)) + y;
}

let lenis = null;
if (window.Lenis) {
  // Wheel events the deck consumed (chapter glides) carry e.__deck and are never smoothed by Lenis.
  lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true, virtualScroll: d => !(d.event && d.event.__deck) });
  lenis.on('scroll', ScrollTrigger.update);
  ScrollTrigger.addEventListener('refresh', () => { lenis.resize(); lenis.scrollTo(window.scrollY, { immediate: true, force: true }); });
  let st, scrolling = false;
  lenis.on('scroll', e => {
    pill(e.animatedScroll);
    if (e.animatedScroll < 4) return;
    if (!scrolling) { scrolling = true; root.classList.add('is-scrolling'); }
    clearTimeout(st); st = setTimeout(() => { scrolling = false; root.classList.remove('is-scrolling'); }, 140);
  });
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  if (window.deck) window.deck.scrollTo = t => lenis.scrollTo(t, { duration: 1.4 });
} else addEventListener('scroll', () => pill(scrollY), { passive: true });

const isMob = () => innerWidth <= 800;
function layoutCards() {}

const EASE = 'expo.out';
(document.fonts ? document.fonts.ready : Promise.resolve()).then(init);

function init() {
  const lineEls = $$('[data-lines]');
  lineEls.forEach(el => split(el));
  placeInd();
  layoutCards();

  /* line-mask reveals */
  const onEnter = (el, fn, at = .86) => ScrollTrigger.create({ start: () => flowTop(el) - innerHeight * at, end: 'max', once: true, invalidateOnRefresh: true, onEnter: fn });
  lineEls.forEach(el => {
    gsap.set($$('.ln-i', el), { yPercent: 110 });
    onEnter(el, () => { el._shown = true; gsap.to($$('.ln-i', el), { yPercent: 0, duration: 1.15, ease: EASE, stagger: .085 }); });
  });

  /* stagger groups: layers that drop into place */
  [
    ['.teams', '.team', { y: 60, opacity: 0, rotate: i => (i % 2 ? 2 : -2) }],
    ['.compare', '.crow', { y: 24, opacity: 0 }],
    ['.why', 'li', { y: 30, opacity: 0 }],
    ['.calc', '.calc-main, .calc-side', { y: 50, opacity: 0 }],
    ['.eng-stats', 'div', { y: 24, opacity: 0 }],
    ['.eq:not(.eq--two)', '.eq-block, .eq-op', { y: 60, opacity: 0, scale: .9 }],
    ['.eq--two', '.eq-block', { y: 60, opacity: 0, scale: .96 }],
    ['.types', 'li', { y: 40, opacity: 0 }],
    ['.launch-copy', '.drop', { y: 24, opacity: 0 }],
  ].forEach(([p, c, from]) => $$(p).forEach(parent => {
    const kids = $$(c, parent);
    gsap.set(kids, from);
    onEnter(parent, () => gsap.to(kids, { y: 0, rotate: 0, opacity: 1, scale: 1, duration: 1.1, ease: EASE, stagger: .07, clearProps: 'opacity,scale,rotate' }), .88);
  }));

  /* A's count-ups (everything outside the deck; the deck counts its own price card) */
  $$('[data-count]').filter(el => !el.closest('.chapter')).forEach(el => {
    const to = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0, o = { v: 0 };
    el.textContent = fmtN(0, dec);
    onEnter(el, () => gsap.to(o, { v: to, duration: 1.8, ease: 'power3.out', delay: .15, onUpdate: () => { el.textContent = fmtN(o.v, dec); } }), .82);
  });
  /* bars, dots, balance */
  onEnter($('.vs'), () => $('.vs').classList.add('in'), .8);
  dots.classList.add('pre');
  onEnter(dots, () => dots.classList.remove('pre'), .82);
  onEnter($('.scale'), () => $('.scale').classList.add('in'), .8);

  /* photo clip reveal */
  $$('.clip-rr').forEach(el => {
    const img = el.querySelector('img');
    gsap.set(el, { clipPath: 'inset(46% 46% 46% 46% round 200px)' });
    onEnter(el, () => {
      gsap.to(el, { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.2, ease: EASE, delay: .1, onComplete: () => gsap.set(el, { clearProps: 'clipPath' }) });
      gsap.fromTo(img, { scale: 1.25 }, { scale: 1.04, duration: 1.5, ease: EASE, delay: .1, clearProps: 'scale' });
    }, .9);
  });
  gsap.set('.heart3d', { scale: .4, opacity: 0, rotate: -25 });
  onEnter($('.launch-visual'), () => gsap.fromTo('.heart3d', { scale: .4, opacity: 0, rotate: -25 }, { scale: 1, opacity: 1, rotate: 0, duration: 1.3, ease: 'back.out(1.8)', delay: .45, clearProps: 'scale,rotate,opacity' }), .85);

  /* rollout: the pile fans out once, on arrival. Time-based: nothing pins, nothing turns sideways. */
  buildDeck(onEnter);

  /* close */
  gsap.to('.ii', { yPercent: -8, ease: 'none', scrollTrigger: { start: () => cardTop(cards.length - 1) - innerHeight, end: 'max', scrub: true, invalidateOnRefresh: true } });
  const art = $('.close-art');
  gsap.set($$('img', art), { opacity: 0, y: 40 });
  onEnter(art, () => gsap.to($$('img', art), { opacity: 1, y: 0, duration: 1.3, ease: EASE, stagger: { each: .1, from: 'end' }, clearProps: 'transform' }), .85);

  interactions();

  /* responsive rebuild */
  let lastW = innerWidth;
  ScrollTrigger.addEventListener('refreshInit', layoutCards);
  addEventListener('resize', () => {
    placeInd();
    if (innerWidth === lastW) return;
    lastW = innerWidth;
    lineEls.forEach(el => { const lines = split(el); gsap.set(lines, { yPercent: el._shown ? 0 : 110 }); });
  });
  ScrollTrigger.refresh();
  let rt;
  const safeRefresh = () => { clearTimeout(rt); rt = setTimeout(() => (lenis && lenis.isScrolling) ? safeRefresh() : ScrollTrigger.refresh(), 350); };
  if (document.readyState !== 'complete') addEventListener('load', safeRefresh, { once: true });
}

function buildDeck(onEnter) {
  const deck = $('#deck'), steps = $$('.step', deck), bar = $('#deckBar');
  const pile = () => {
    const mob = isMob();
    gsap.set(steps, mob
      ? { y: i => steps[0].offsetTop - steps[i].offsetTop + i * 8, x: 0, rotate: i => [0, 2, -2, 3, -3][i], scale: i => 1 - i * .02 }
      : { x: i => deck.offsetWidth / 2 - (steps[i].offsetLeft + steps[i].offsetWidth / 2) + i * 14, y: i => i * -10, rotate: i => [0, 5, -5, 9, -9][i], scale: i => 1 - i * .02 });
  };
  let done = false;
  pile();
  gsap.set(bar, { scaleX: 0 });
  onEnter(deck, () => {
    done = true;
    gsap.to(steps, { x: 0, y: 0, rotate: 0, scale: 1, duration: 1.25, ease: 'expo.inOut', stagger: .07, clearProps: 'transform' });
    gsap.to(bar, { scaleX: 1, duration: 1.6, ease: 'power2.inOut' });
  }, .62);
  addEventListener('resize', () => { if (!done) pile(); });
}
})();
