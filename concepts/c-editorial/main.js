/* Concept C — Clear Benefit. Vanilla JS: reveals, count-ups, nav state, tabs, calculator. */
(() => {
  const doc = document.documentElement;
  if (doc.dataset.editorialReady) return;
  doc.dataset.editorialReady = 'true';
  doc.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const IMG = '../../shared/assets/img/';

  /* ---------- reveal: fade + 16px rise, staggered per parent ---------- */
  const groups = new Map();
  $$('[data-reveal]').forEach(el => {
    const p = el.parentElement;
    const i = groups.get(p) || 0;
    groups.set(p, i + 1);
    el.style.setProperty('--d', (Math.min(i, 6) * 0.08).toFixed(2) + 's');
  });

  /* ---------- count-up (once) ---------- */
  const fmt = (n, dec = 0) => n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = 1;
    const to = parseFloat(el.dataset.count), pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    if (reduce || to === 0) { el.textContent = pre + fmt(to) + suf; return; }
    const dur = 1100, t0 = performance.now();
    const step = t => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = pre + fmt(Math.round(to * e)) + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      if (el.classList.contains('is-in')) { io.unobserve(el); return; }
      el.classList.add('is-in');
      // hand the element back to the hover layer once its entrance is done
      setTimeout(() => { el.classList.add('reveal-done'); el.style.removeProperty('--d'); }, 1400);
      $$('[data-count]', el).forEach(countUp);
      if (el.matches('[data-count]')) countUp(el);
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  $$('[data-reveal], [data-timeline]').forEach(el => io.observe(el));

  /* ---------- nav: progress line + active section ---------- */
  const bar = $('.nav__progress span');
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = doc.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
      ticking = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const links = $$('[data-nav]');
  const secs = links.map(a => document.getElementById(a.dataset.nav));
  const navEl = $('.nav nav');
  let current = null;
  const setActive = () => {
    const y = innerHeight * 0.45;
    let id = null;
    secs.forEach(s => { const r = s.getBoundingClientRect(); if (r.top <= y && r.bottom > y) id = s.id; });
    if (id === current) return;
    current = id;
    links.forEach(a => {
      const on = a.dataset.nav === id;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      if (on && navEl.scrollWidth > navEl.clientWidth + 2) navEl.scrollTo({ left: a.offsetLeft - 20, behavior: reduce ? 'auto' : 'smooth' });
    });
  };
  /* back pill: hide while scrolling down, return on scroll up */
  const back = $('.back');
  let lastY = scrollY, setQueued = false;
  addEventListener('scroll', () => {
    if (setQueued) return;
    setQueued = true;
    requestAnimationFrame(() => {
      setQueued = false;
      setActive();
      const y = scrollY, dy = y - lastY;
      if (Math.abs(dy) > 6) { back.classList.toggle('is-hidden', dy > 0 && y > 200); lastY = y; }
    });
  }, { passive: true });
  addEventListener('resize', setActive);
  setActive();

  /* ---------- tabs: who it helps ---------- */
  const chips = (arr, on = 0) => `<div class="mini__row">${arr.map((c, i) => `<span class="mini__chip${i === on ? ' mini__chip--on' : ''}">${c}</span>`).join('')}</div>`;
  const TEAMS = [
    { name: 'People / HR', p: 'Low team connection.', a: 'Make company values part of everyday life.', icon: 'mission-handshake',
      mini: `<p class="mini__k">Today's Play</p><p class="mini__t">Put a company value into action today</p>${chips(['Values', 'Daily'])}` },
    { name: 'Benefits / Rewards', p: 'Benefits get forgotten.', a: 'Give employees a benefit they can use all year.', icon: 'mission-gift-heart',
      mini: `<p class="mini__k">Your benefit</p><p class="mini__t">Employer-paid access · open every day</p><div class="mini__bar"><span style="width:100%"></span></div>` },
    { name: 'CSR / Social Impact', p: 'Low participation.', a: 'Give staff a say in causes and show funded impact.', icon: 'mission-target',
      mini: `<p class="mini__k">Choose your cause</p><p class="mini__t">Employer-approved options</p>${chips(['Education', 'Health', 'Environment'], 1)}` },
    { name: 'Recognition / Culture', p: 'Kindness goes unseen.', a: 'Recognize generosity, consistency and milestones.', icon: 'mission-stars',
      mini: `<p class="mini__k">Milestone</p><p class="mini__t">GoodPrint level reached</p>${chips(['Generosity', 'Consistency', 'Milestones'], 2)}` },
    { name: 'Wellbeing', p: 'A need for connection.', a: 'Offer uplifting content, reflection and small actions.', icon: 'mission-heart-message',
      mini: `<p class="mini__k">Reflection</p><p class="mini__t">What went well today? Private to you.</p>${chips(['Content', 'Reflection', 'Small actions'])}` },
    { name: 'Volunteering', p: 'Momentum fades.', a: 'Keep people involved between volunteer days.', icon: 'mission-handshake',
      mini: `<p class="mini__k">Between volunteer days</p><p class="mini__t">Daily Moves keep the habit going</p><div class="mini__bar"><span style="width:62%"></span></div>` },
    { name: 'Employer Brand', p: 'Claims need proof.', a: 'Use approved employee and impact stories in recruiting.', icon: 'mission-stars',
      mini: `<p class="mini__k">Story</p><p class="mini__t">Employee and impact stories, shared with approval</p>${chips(['Approved', 'Recruiting'])}` },
    { name: 'Employee Experience', p: 'Too many separate apps.', a: 'Bring giving, growth and rewards into one experience.', icon: 'mission-gift-heart',
      mini: `<p class="mini__k">One app</p><p class="mini__t">Giving, growth and rewards together</p>${chips(['Giving', 'Growth', 'Rewards'])}` },
  ];
  // preload icons so tab switches don't flash
  [...new Set(TEAMS.map(t => t.icon))].forEach(n => { const i = new Image(); i.src = IMG + n + '.webp'; });

  const tabs = $$('[role=tab]');
  const panel = $('#panel-team'), inner = $('.panel__inner', panel);
  const fill = i => {
    const t = TEAMS[i];
    $('#p-team').textContent = t.name;
    $('#p-problem').textContent = t.p;
    $('#p-answer').textContent = t.a;
    $('#p-icon').src = IMG + t.icon + '.webp';
    $('#p-mini').innerHTML = t.mini;
  };
  fill(0);
  let swapTimer;
  function select(i, focus) {
    tabs.forEach((t, j) => {
      const on = j === i;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', tabs[i].id);
    moveInd();
    if (focus) tabs[i].focus();
    tabs[i].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    clearTimeout(swapTimer);
    if (reduce) { fill(i); return; }
    inner.classList.add('is-out');
    swapTimer = setTimeout(() => { fill(i); inner.classList.remove('is-out'); }, 200);
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i, false));
    t.addEventListener('keydown', e => {
      const n = tabs.length;
      let k = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') k = (i + 1) % n;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') k = (i - 1 + n) % n;
      if (e.key === 'Home') k = 0;
      if (e.key === 'End') k = n - 1;
      if (k !== null) { e.preventDefault(); select(k, true); }
    });
  });
  const mq = matchMedia('(max-width:1080px)');
  const setOrient = () => $('[role=tablist]').setAttribute('aria-orientation', mq.matches ? 'horizontal' : 'vertical');
  const ind = $('.tabs__ind');
  function moveInd() {
    const t = tabs.find(b => b.getAttribute('aria-selected') === 'true');
    if (!t) return;
    ind.style.width = t.offsetWidth + 'px';
    ind.style.height = t.offsetHeight + 'px';
    ind.style.transform = `translate3d(${t.offsetLeft}px,${t.offsetTop}px,0)`;
  }
  mq.addEventListener('change', () => { setOrient(); moveInd(); }); setOrient();
  addEventListener('resize', moveInd);
  ind.style.transition = 'none';
  moveInd();
  requestAnimationFrame(() => requestAnimationFrame(() => ind.style.removeProperty('transition')));
  document.fonts && document.fonts.ready.then(moveInd);

  /* ---------- ROI calculator ---------- */
  const FREQ = [
    { k: '2x daily', per: 730 },
    { k: '1x daily', per: 365 },
    { k: '3x weekly', per: 156 },
    { k: '1x weekly', per: 52 },
    { k: 'No engagement', per: 0 },
  ];
  const MIX = {
    deck:  { share: [.10, .10, .10, .20, .50], note: "The deck's example mix: half of employees engage at some level." },
    daily: { share: [0, .50, 0, 0, .50], note: 'The deck’s upper case: all engaged employees (50%) visit once a day.' },
    light: { share: [0, .05, .10, .25, .60], note: 'A hypothetical lighter mix for planning. Not a forecast.' },
  };
  const empN = $('#emp'), empR = $('#emp-range');
  const money = (n, d = 0) => '$' + fmt(n, d);
  const tween = (el, to, render) => {
    const from = parseFloat(el.dataset.v || to);
    el.dataset.v = to;
    if (reduce || from === to) { el.textContent = render(to); return; }
    const t0 = performance.now(), dur = 500;
    const step = t => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = render(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  function calc() {
    let n = Math.max(1, Math.min(100000, Math.round(+empN.value || 1)));
    const mix = MIX[$('input[name=mix]:checked').value];
    // integer head-counts per bucket; "no engagement" takes the remainder
    const counts = mix.share.slice(0, 4).map(s => Math.round(s * n));
    let used = counts.reduce((a, b) => a + b, 0);
    while (used > n) { const j = counts.indexOf(Math.max(...counts)); counts[j]--; used--; }
    counts.push(n - used);
    const eng = counts.reduce((a, c, j) => a + c * FREQ[j].per, 0);
    const engaged = n - counts[4];
    const cost = n * 120;
    const cpe = eng ? cost / eng : 0;

    tween($('#o-cost'), cost, v => money(Math.round(v)));
    $('#o-cost-s').textContent = `${fmt(n)} employee${n === 1 ? '' : 's'} × $120`;
    tween($('#o-eng'), eng, v => fmt(Math.round(v)));
    $('#o-engaged').textContent = `${fmt(engaged)} of ${fmt(n)} engage`;
    tween($('#o-cpe'), cpe, v => (eng ? money(v, 2) : '—'));

    $('#mixbars').innerHTML = FREQ.map((f, j) => {
      const pct = n ? counts[j] / n : 0;
      return `<li class="${f.per ? '' : 'none'}"><span>${f.k}</span><span class="t"><span style="transform:scaleX(${pct.toFixed(3)})"></span></span><b>${fmt(counts[j])}</b></li>`;
    }).join('');
    $('#mix-note').textContent = mix.note + ' Visits/yr: 2x daily = 730, 1x daily = 365, 3x weekly = 156, 1x weekly = 52.';

    const parts = counts.slice(0, 4).map((c, j) => c ? `${fmt(c)} × ${FREQ[j].per}` : '').filter(Boolean);
    $('#tip-cost').innerHTML = `Covered employees × $120 a year ($10 a month).<span class="m">${fmt(n)} × $120 = ${money(cost)}</span>`;
    $('#tip-eng').innerHTML = `Employees in each group × visits a year (2x daily = 730, 1x daily = 365, 3x weekly = 156, 1x weekly = 52).<span class="m">${parts.join(' + ') || '0'} = ${fmt(eng)}</span>`;
    $('#tip-cpe').innerHTML = `Annual cost divided by engagements a year. Illustrative, not a forecast.<span class="m">${money(cost)} ÷ ${fmt(eng)} = ${eng ? money(cpe, 2) : '—'}</span>`;

    $('#be-emp').textContent = fmt(n);
    $('#be-cost').textContent = money(cost);
    const be = cost / 30000;
    $('#be-n').textContent = be < 10 ? fmt(be, 1) : fmt(Math.round(be));
  }
  const syncRange = () => {
    const v = +empN.value;
    empR.value = Math.min(2000, Math.max(10, v));
    empR.style.setProperty('--p', ((empR.value - 10) / (2000 - 10) * 100) + '%');
  };
  empR.addEventListener('input', () => { empN.value = empR.value; syncRange(); calc(); });
  empN.addEventListener('input', () => { syncRange(); calc(); });
  empN.addEventListener('blur', () => { if (!(+empN.value >= 1)) empN.value = 1; syncRange(); calc(); });
  $$('input[name=mix]').forEach(r => r.addEventListener('change', calc));
  syncRange(); calc();

  /* ================= interaction layer ================= */
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* --- pointer-following glow border on cards (+ tap equivalent) --- */
  $$('.step, .why__card, .card, .out, .pa, .sponsor, .tabs__panel').forEach(el => el.classList.add('glow'));
  let glowEl = null, gx = 0, gy = 0, glowQ = false;
  const paintGlow = () => {
    glowQ = false;
    if (!glowEl) return;
    const r = glowEl.getBoundingClientRect();
    glowEl.style.setProperty('--mx', (gx - r.left) + 'px');
    glowEl.style.setProperty('--my', (gy - r.top) + 'px');
  };
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    glowEl = e.target.closest && e.target.closest('.glow');
    gx = e.clientX; gy = e.clientY;
    if (glowEl && !glowQ) { glowQ = true; requestAnimationFrame(paintGlow); }
  }, { passive: true });

  // touch: a tap "hovers" the card (and table rows / timeline steps) until something else is tapped
  let hot = null;
  const setHot = el => { if (hot && hot !== el) hot.classList.remove('is-hot'); hot = el; if (el) el.classList.add('is-hot'); };
  document.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    const el = e.target.closest('.glow, .table__row:not(.table__row--head)');
    if (el) { gx = e.clientX; gy = e.clientY; glowEl = el; paintGlow(); }
    setHot(el);
  }, { passive: true });

  /* --- table rows: hover state also via class so keyboard/touch match --- */
  $$('.table__row:not(.table__row--head)').forEach(r => {
    r.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') r.classList.add('is-hot'); });
    r.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') r.classList.remove('is-hot'); });
  });

  /* --- calculator tooltips: hover (CSS), focus (CSS), tap / click toggles --- */
  $$('.out[data-tip]').forEach(o => {
    const btn = $('.out__i', o);
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const open = !o.classList.contains('is-open');
      $$('.out.is-open').forEach(x => x.classList.remove('is-open'));
      o.classList.toggle('is-open', open);
    });
    o.addEventListener('click', e => { if (!canHover && e.target !== btn) btn.click(); });
  });
  document.addEventListener('click', e => { if (!e.target.closest('.out')) $$('.out.is-open').forEach(x => x.classList.remove('is-open')); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $$('.out.is-open').forEach(x => x.classList.remove('is-open')); });

  /* --- rollout timeline: steps light up to the one you point at --- */
  const tl = $('[data-timeline]'), steps = $$('.tl', tl);
  const light = i => {
    tl.classList.toggle('has-hot', i >= 0);
    steps.forEach((s2, j) => { s2.classList.toggle('is-lit', i >= 0 && j <= i); s2.classList.toggle('is-cur', j === i); });
  };
  steps.forEach((st, i) => {
    st.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') light(i); });
    st.addEventListener('click', () => { if (!canHover) light(st.classList.contains('is-cur') ? -1 : i); });
  });
  tl.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') light(-1); });

  /* --- hero: depth parallax on floating assets + 3D phone tilt --- */
  const hero = $('.hero__visual'), heroSec = $('.hero');
  const layers = $$('[data-depth]', hero).map(el => ({ el, d: +el.dataset.depth, t: +(el.dataset.tilt || 0) }));
  const wrap = $('.phone-wrap'), glare = $('.phone__glare');
  let tx = 0, ty = 0, cx = 0, cy = 0, running = false, heroVisible = true;
  new IntersectionObserver(([en]) => { heroVisible = en.isIntersecting; }).observe(hero);
  const tick = () => {
    cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
    layers.forEach(({ el, d, t }) => {
      if (el === wrap) return;
      el.style.translate = `${(cx * d).toFixed(2)}px ${(cy * d).toFixed(2)}px`;
      if (t) el.style.rotate = `${(cx * t).toFixed(2)}deg`;
    });
    wrap.style.transform = `perspective(1100px) translate3d(${(cx * 10).toFixed(2)}px,${(cy * 10).toFixed(2)}px,0) rotateY(${(cx * 12).toFixed(2)}deg) rotateX(${(-cy * 10).toFixed(2)}deg)`;
    glare.style.setProperty('--gx', (50 + cx * 40) + '%');
    glare.style.setProperty('--gy', (20 + cy * 40) + '%');
    if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) requestAnimationFrame(tick);
    else running = false;
  };
  const aim = (x, y) => {
    const r = hero.getBoundingClientRect();
    tx = Math.max(-1, Math.min(1, (x - (r.left + r.width / 2)) / (r.width / 2)));
    ty = Math.max(-1, Math.min(1, (y - (r.top + r.height / 2)) / (r.height / 2)));
    if (!running && heroVisible) { running = true; requestAnimationFrame(tick); }
  };
  if (!reduce) {
    heroSec.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') aim(e.clientX, e.clientY); }, { passive: true });
    heroSec.addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!running) { running = true; requestAnimationFrame(tick); } });
    // touch: tap the visual to tilt towards the finger, then settle back
    let settle;
    hero.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') return;
      aim(e.clientX, e.clientY);
      clearTimeout(settle);
      settle = setTimeout(() => { tx = 0; ty = 0; if (!running) { running = true; requestAnimationFrame(tick); } }, 1400);
    }, { passive: true });
  }
})();
