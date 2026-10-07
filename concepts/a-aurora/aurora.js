/* Concept A — Aurora Flow
   WebGL mesh-gradient light-field · Lenis + GSAP ScrollTrigger · per-word blur+rise reveals
   Card-deck "How it works" · free-drag teams carousel · tilt/magnetic/proximity interaction layer */
(() => {
  const root = document.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const MOTION = !RM && hasGSAP;
  root.classList.add(MOTION ? 'js' : 'rm');
  if (!MOTION) root.classList.remove('js');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ============================================================
     1. LIGHT-FIELD SHADER
     ============================================================ */
  const HEX = { maya: '#6DBCEC', celadon: '#B5DABB', plum: '#E2A7D4', violet: '#8273EB', maj: '#4E4FE8' };
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  // One palette per section (data-pal), built ONLY from the brand stops. [5 colours, strength]
  const PALETTES = [
    [['maya', 'plum', 'violet', 'celadon', 'maya'], .50],    // hero
    [['violet', 'maya', 'plum', 'celadon', 'maya'], .40],    // how it works
    [['celadon', 'maya', 'plum', 'violet', 'celadon'], .42], // teams
    [['maya', 'celadon', 'maya', 'plum', 'celadon'], .32],   // compare (quieter for the table)
    [['plum', 'celadon', 'maya', 'violet', 'plum'], .36],    // cost
    [['celadon', 'plum', 'maya', 'violet', 'celadon'], .38], // rollout
    [['maya', 'celadon', 'plum', 'violet', 'maj'], .58],     // close (most vivid)
  ].map(([cols, s]) => ({ c: cols.flatMap(k => rgb(HEX[k])), s }));

  const field = $('.field');
  const gl = { target: 0, cur: Float32Array.from(PALETTES[0].c), str: PALETTES[0].s };

  function initGL() {
    if (RM) return;
    const cv = $('#aurora');
    const ctx = cv.getContext('webgl', { antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power' });
    if (!ctx) return;
    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const fs = `precision mediump float;
uniform vec2 r;uniform float t;uniform vec3 c[5];uniform float s;uniform vec2 m;
void main(){
  vec2 uv=gl_FragCoord.xy/r; float a=r.x/r.y; vec2 p=vec2(uv.x*a,uv.y);
  float tt=t*.05;
  vec2 q=p+.18*vec2(sin(p.y*2.3+tt*2.1)+sin(p.y*4.1-tt*1.3),cos(p.x*1.9-tt*1.7)+sin(p.x*3.3+tt*1.1));
  vec3 acc=vec3(0.);float ws=0.;
  for(int i=0;i<5;i++){
    float fi=float(i);
    vec2 cp=vec2(a*(.5+.42*sin(tt*(.9+fi*.31)+fi*1.7)),.5+.46*cos(tt*(.7+fi*.23)+fi*2.4));
    cp+=(m-.5)*vec2(a,1.)*.06*(fi-2.);
    vec2 d=q-cp;float w=exp(-dot(d,d)*3.4);
    acc+=c[i]*w;ws+=w;
  }
  vec3 mesh=acc/max(ws,1e-4);
  float cover=smoothstep(.0,1.1,ws);
  float band=.5+.5*sin((q.x*.9+q.y*1.4)*3.2+tt*3.);
  vec3 col=mix(vec3(.965,.969,.949),mesh,s*cover*(.7+.3*band));
  col+=vec3(.035)*(band-.5)*s;
  gl_FragColor=vec4(col,1.);
}`;
    const sh = (type, src) => { const o = ctx.createShader(type); ctx.shaderSource(o, src); ctx.compileShader(o); return ctx.getShaderParameter(o, ctx.COMPILE_STATUS) ? o : null; };
    const v = sh(ctx.VERTEX_SHADER, vs), f = sh(ctx.FRAGMENT_SHADER, fs);
    if (!v || !f) return;
    const pr = ctx.createProgram(); ctx.attachShader(pr, v); ctx.attachShader(pr, f); ctx.linkProgram(pr);
    if (!ctx.getProgramParameter(pr, ctx.LINK_STATUS)) return;
    ctx.useProgram(pr);
    const buf = ctx.createBuffer(); ctx.bindBuffer(ctx.ARRAY_BUFFER, buf);
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), ctx.STATIC_DRAW);
    const loc = ctx.getAttribLocation(pr, 'p'); ctx.enableVertexAttribArray(loc); ctx.vertexAttribPointer(loc, 2, ctx.FLOAT, false, 0, 0);
    const U = n => ctx.getUniformLocation(pr, n);
    const uR = U('r'), uT = U('t'), uC = U('c'), uS = U('s'), uM = U('m');
    // It's a soft blur of light: DPR capped at 1.5, then rendered at ~1/4 of that and upscaled by the compositor.
    const SCALE = Math.min(devicePixelRatio || 1, FINE ? 1.5 : 1) * .26;
    const size = () => { cv.width = Math.max(2, Math.round(innerWidth * SCALE)); cv.height = Math.max(2, Math.round(innerHeight * SCALE)); ctx.viewport(0, 0, cv.width, cv.height); ctx.uniform2f(uR, cv.width, cv.height); };
    size(); addEventListener('resize', size);
    const mouse = [.5, .5], mt = [.5, .5];
    addEventListener('pointermove', e => { mt[0] = e.clientX / innerWidth; mt[1] = 1 - e.clientY / innerHeight; }, { passive: true });
    let time = 20, last = performance.now(), running = true, acc = 0;
    document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { last = performance.now(); requestAnimationFrame(frame); } });
    function frame(now) {
      if (!running) return;
      requestAnimationFrame(frame);
      const dt = Math.min(.1, (now - last) / 1000); last = now;
      const vel = window.__lenis ? Math.min(40, Math.abs(window.__lenis.velocity || 0)) : 0;
      time += dt * (1 + vel * .1);
      // The field moves slowly, so ~30fps is invisible; drop to ~20fps while scrolling fast.
      acc += dt; const step = vel > 2 ? 1 / 15 : 1 / 30;
      if (acc < step) return;
      const k = 1 - Math.pow(.04, acc); acc = 0;
      const tgt = PALETTES[gl.target];
      for (let i = 0; i < 15; i++) gl.cur[i] += (tgt.c[i] - gl.cur[i]) * k;
      gl.str += (tgt.s - gl.str) * k;
      mouse[0] += (mt[0] - mouse[0]) * .08; mouse[1] += (mt[1] - mouse[1]) * .08;
      ctx.uniform1f(uT, time); ctx.uniform3fv(uC, gl.cur); ctx.uniform1f(uS, gl.str); ctx.uniform2f(uM, mouse[0], mouse[1]);
      ctx.drawArrays(ctx.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(frame);
    field.classList.add('is-gl');
  }
  try { initGL(); } catch (e) { /* fallback image stays */ }

  /* ============================================================
     2. PER-WORD SPLIT (blur + rise signature)
     ============================================================ */
  function split(el) {
    const walk = (node, grad) => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.textContent = part;
            if (grad) i.className = 'grad-text gw';
            w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          const g = grad || n.classList.contains('grad-text');
          if (n.classList.contains('grad-text')) { n.classList.remove('grad-text'); n.classList.add('grad-group'); }
          walk(n, g);
        }
      });
    };
    walk(el, false);
    if (MOTION && el.hasAttribute('data-reveal')) gsap.set($$('.w>span', el), { yPercent: 70, opacity: 0 });
    el.classList.add('is-split');
    return $$('.w>span', el);
  }
  // Keep one continuous gradient across words that each animate independently.
  function fitGrad() {
    $$('.grad-group').forEach(g => {
      const ws = $$('.w', g); if (!ws.length) return;
      const rs = ws.map(w => w.getBoundingClientRect());
      const L = Math.min(...rs.map(r => r.left)), R = Math.max(...rs.map(r => r.right));
      ws.forEach((w, i) => { const s = w.firstChild.style; s.backgroundSize = `${R - L}px 100%`; s.backgroundPosition = `${L - rs[i].left}px 0`; });
    });
  }
  const reveals = $$('[data-reveal]').map(el => ({ el, words: split(el) }));
  const slideWords = $$('.how__slide .how__t').map(split);
  const fmt = (v, dec) => dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US');

  // Word reveal: will-change only while running; blur is removed the moment each word lands.
  const revealWords = (words, delay = 0, blur = 14) =>
    gsap.fromTo(words, { yPercent: 70, opacity: 0, filter: `blur(${blur}px)`, willChange: 'transform,opacity,filter' },
      { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 1.15, ease: 'expo.out', stagger: .06, delay, clearProps: 'filter,willChange,transform' });

  /* ============================================================
     3. HOW IT WORKS — card-deck handoff
     ============================================================ */
  const cards = $$('.deck__card'), slides = $$('.how__slide'), segs = $$('.how__seg'), cur = $('.how__cur');
  let curStep = -1, counterTween = null;
  const POSE = d => d < 0
    ? { xPercent: -70, yPercent: 6, rotationY: 38, rotationZ: -12, z: -60, scale: .92, autoAlpha: 0 }      // tossed off to the left
    : d === 0
      ? { xPercent: 0, yPercent: 0, rotationY: 0, rotationZ: 0, z: 0, scale: 1, autoAlpha: 1 }           // front of the deck
      : { xPercent: 10 * d, yPercent: -2.5 * d, rotationY: -14 * d, rotationZ: 3.5 * d, z: -110 * d, scale: 1 - .07 * d, autoAlpha: d === 1 ? .7 : .38 }; // waiting behind

  function confetti(card) {
    const box = $('.confetti', card); if (!box || !MOTION) return;
    box.innerHTML = '';
    const cols = Object.values(HEX).concat('#FFBE22');
    for (let i = 0; i < 22; i++) {
      const p = document.createElement('i');
      p.style.left = (Math.random() * 100) + '%'; p.style.background = cols[i % cols.length];
      box.appendChild(p);
      gsap.fromTo(p, { y: -20, rotate: Math.random() * 180, opacity: 1 },
        { y: 260 + Math.random() * 260, x: (Math.random() - .5) * 80, rotate: '+=' + (200 + Math.random() * 300), opacity: 0, duration: 1.6 + Math.random(), ease: 'power1.in', delay: .2 + Math.random() * .3, onComplete: () => p.remove() });
    }
  }

  function setStep(i, instant) {
    if (i === curStep) return;
    const dir = i > curStep ? 1 : -1, prev = curStep; curStep = i;
    segs.forEach((s, k) => { s.classList.toggle('is-on', k === i); s.classList.toggle('is-done', k <= i); s.setAttribute('aria-selected', k === i); });
    // Cancel the previous handoff before a fast reverse can finish hiding this slide.
    if (MOTION) {
      counterTween?.kill();
      gsap.killTweensOf(cur);
      gsap.set(cur, { yPercent: 0 });
      slides.forEach(s => {
        gsap.killTweensOf([s, ...s.querySelectorAll('.w>span, p')]);
        gsap.set(s, { clearProps: 'opacity,transform' });
      });
    }
    // counter roll
    if (MOTION && !instant) {
      counterTween = gsap.timeline().to(cur, { yPercent: -110 * dir, duration: .22, ease: 'power2.in' })
        .add(() => { cur.textContent = i + 1; }).fromTo(cur, { yPercent: 110 * dir }, { yPercent: 0, duration: .5, ease: 'back.out(2)' });
    } else cur.textContent = i + 1;
    // copy swaps with the phone
    slides.forEach((s, k) => {
      if (k === i) {
        s.classList.add('is-on');
        if (MOTION && !instant) {
          gsap.set($('p', s), { opacity: 0 });
          gsap.fromTo(slideWords[k], { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .9, ease: 'expo.out', stagger: .05, delay: .26, clearProps: 'transform' });
          gsap.fromTo($('p', s), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .8, delay: .38, ease: 'expo.out' });
        }
      } else if (k === prev && MOTION && !instant) {
        gsap.to(s, { opacity: 0, y: -18 * dir, duration: .24, ease: 'power2.in', onComplete: () => { if (k === curStep) return; s.classList.remove('is-on'); gsap.set(s, { clearProps: 'opacity,transform' }); } });
      } else s.classList.remove('is-on');
    });
    // the deck: front card is tossed out / brought back, the next one springs forward
    cards.forEach((c, k) => {
      const d = k - i, pose = POSE(d);
      c.style.zIndex = d < 0 ? (k === prev ? 5 : 1) : 4 - d;
      c.setAttribute('aria-hidden', d !== 0);
      if (!MOTION || instant) { if (hasGSAP) gsap.set(c, pose); else c.style.display = d === 0 ? '' : 'none'; return; }
      const coming = d === 0;
      gsap.to(c, {
        ...pose, overwrite: 'auto',
        duration: coming ? 1.05 : .75,
        ease: coming ? 'back.out(1.35)' : (d < 0 ? 'power3.in' : 'power3.out'),
        delay: coming ? .08 : 0,
        onStart: () => { c.style.willChange = 'transform,opacity'; },
        onComplete: () => { c.style.willChange = ''; if (d < 0) c.style.zIndex = 1; },
      });
    });
    const arc = $('.gp__arc');
    if (arc) { arc.style.transition = MOTION ? 'stroke-dashoffset 1.6s cubic-bezier(.22,1,.36,1) .35s' : 'none'; arc.style.strokeDashoffset = i >= 1 ? '28' : '100'; }
    if (i === 2 && MOTION && !instant) {
      const card = cards[2];
      confetti(card);
      gsap.fromTo($('.win__coin', card), { scale: .4, rotate: -25, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 1, ease: 'back.out(1.8)', delay: .3 });
      gsap.fromTo($('.win__confetti', card), { scale: .7, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, ease: 'expo.out', delay: .35 });
    }
  }
  setStep(0, true);

  /* ============================================================
     4. TEAMS — free-drag carousel (native horizontal scroll, never hijacks vertical)
     ============================================================ */
  function initCarousel() {
    const vp = $('.teams__viewport'); if (!vp) return;
    const bar = $('.teams__bar span'), arrows = $$('.arrow');
    const max = () => vp.scrollWidth - vp.clientWidth;
    const update = () => {
      const m = max(), p = m > 0 ? vp.scrollLeft / m : 1;
      const vis = vp.clientWidth / vp.scrollWidth;
      bar.style.transform = `translateX(${p * (1 - vis) * 100}%) scaleX(${vis})`;
      bar.style.transformOrigin = 'left';
      arrows[0].disabled = vp.scrollLeft < 4; arrows[1].disabled = vp.scrollLeft > m - 4;
    };
    // bar as a scrubber window rather than a fill
    bar.style.width = '100%';
    vp.addEventListener('scroll', update, { passive: true }); addEventListener('resize', update); update();
    const stepW = () => { const c = $('.tcard', vp); return c ? c.getBoundingClientRect().width + 20 : 320; };
    arrows.forEach(a => a.addEventListener('click', () => vp.scrollBy({ left: +a.dataset.dir * stepW() * (innerWidth > 900 ? 2 : 1), behavior: RM ? 'auto' : 'smooth' })));
    vp.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); vp.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * stepW(), behavior: RM ? 'auto' : 'smooth' }); }
    });
    // Trackpad: horizontal-dominant gestures stay inside the carousel (Lenis never sees them).
    vp.addEventListener('wheel', e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.stopPropagation(); }, { passive: true });
    // Mouse drag with a little momentum. Touch uses native swipe.
    let down = false, moved = 0, sx = 0, sl = 0, lx = 0, lt = 0, v = 0, glide = null;
    vp.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = 0; sx = lx = e.clientX; sl = vp.scrollLeft; lt = performance.now(); v = 0;
      if (glide) glide.kill();
    });
    addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
      if (moved > 4) vp.classList.add('is-drag');
      vp.scrollLeft = sl - dx;
      const now = performance.now(); v = (e.clientX - lx) / Math.max(1, now - lt); lx = e.clientX; lt = now;
    });
    addEventListener('pointerup', () => {
      if (!down) return; down = false;
      const end = () => vp.classList.remove('is-drag');
      if (hasGSAP && !RM && Math.abs(v) > .1) {
        const target = Math.max(0, Math.min(max(), vp.scrollLeft - v * 380));
        glide = gsap.to(vp, { scrollLeft: target, duration: .9, ease: 'power3.out', onComplete: end });
      } else end();
    });
    vp.addEventListener('click', e => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
  }
  initCarousel();

  /* ============================================================
     5. INTERACTION LAYER — tilt + pointer glow, magnetic, proximity, tooltips, legend
     ============================================================ */
  function initTilt() {
    $$('[data-tilt]').forEach(el => {
      const max = +el.dataset.tilt || 6;
      if (FINE && hasGSAP && !RM) {
        const rx = gsap.quickTo(el, 'rotationX', { duration: .7, ease: 'power3' }), ry = gsap.quickTo(el, 'rotationY', { duration: .7, ease: 'power3' }), ty = gsap.quickTo(el, 'y', { duration: .7, ease: 'power3' });
        let r = null;
        el.addEventListener('pointerenter', () => { r = el.getBoundingClientRect(); el.classList.add('is-hover'); el.style.willChange = 'transform'; gsap.set(el, { transformPerspective: 900 }); });
        el.addEventListener('pointermove', e => {
          if (!r) r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          el.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
          ry((px - .5) * max * 2); rx(-(py - .5) * max * 2); ty(-6);
        });
        el.addEventListener('pointerleave', () => { r = null; el.classList.remove('is-hover'); rx(0); ry(0); ty(0); setTimeout(() => { if (!el.classList.contains('is-hover')) { el.style.willChange = ''; gsap.set(el, { clearProps: 'transform' }); } }, 900); });
      } else {
        // touch: a tap lights the border glow where you touched
        el.addEventListener('pointerdown', e => {
          if (e.pointerType === 'mouse') return;
          const r = el.getBoundingClientRect();
          el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%'); el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
          el.classList.add('is-hover'); clearTimeout(el.__t); el.__t = setTimeout(() => el.classList.remove('is-hover'), 1100);
        });
      }
    });
  }

  function initMagnetic() {
    if (!FINE || !hasGSAP || RM) return;
    $$('[data-magnetic]').forEach(el => {
      const k = parseFloat(el.dataset.magnetic) || .35;
      const qx = gsap.quickTo(el, 'x', { duration: .45, ease: 'power3' }), qy = gsap.quickTo(el, 'y', { duration: .45, ease: 'power3' });
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); qx((e.clientX - r.left - r.width / 2) * k); qy((e.clientY - r.top - r.height / 2) * k); });
      el.addEventListener('pointerleave', () => { qx(0); qy(0); });
    });
  }

  // 3D assets lean towards the cursor and swell as it gets close.
  function initProximity() {
    if (!FINE || !hasGSAP || RM) return;
    const items = $$('[data-prox]').map(el => ({
      el, R: +el.dataset.proxR || 300, on: false,
      s: gsap.quickTo(el, 'scale', { duration: .6, ease: 'power3' }),
      r: gsap.quickTo(el, 'rotation', { duration: .6, ease: 'power3' }),
      x: gsap.quickTo(el, 'x', { duration: .6, ease: 'power3' }),
      y: gsap.quickTo(el, 'y', { duration: .6, ease: 'power3' }),
    }));
    const io = new IntersectionObserver(es => es.forEach(e => { const it = items.find(i => i.el === e.target); if (it) it.on = e.isIntersecting; }));
    items.forEach(i => io.observe(i.el));
    let px = -1e4, py = -1e4, queued = false;
    const tick = () => {
      queued = false;
      items.forEach(it => {
        if (!it.on) return;
        const b = it.el.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy), p = Math.max(0, 1 - d / it.R);
        const e = p * p * (3 - 2 * p);
        it.s(1 + .1 * e); it.r(dx / it.R * 10 * e); it.x(dx * .06 * e); it.y(dy * .06 * e);
      });
    };
    addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; if (!queued) { queued = true; requestAnimationFrame(tick); } }, { passive: true });
  }

  function initTips() {
    // touch: tap a figure to open its calculation, tap elsewhere to close
    document.addEventListener('click', e => {
      const c = e.target.closest('.calc');
      $$('.calc.is-open').forEach(o => { if (o !== c) o.classList.remove('is-open'); });
      if (c && !FINE) c.classList.toggle('is-open');
    });
  }

  function buildDots() {
    const box = $('.dots'); if (!box || box.children.length) return;
    const groups = [['#4E4FE8', 10], ['#8273EB', 10], ['#E2A7D4', 10], ['#6DBCEC', 20], [null, 50]];
    groups.forEach(([c, n], g) => { for (let i = 0; i < n; i++) { const d = document.createElement('i'); if (c) d.style.setProperty('--c', c); else d.className = 'none'; d.dataset.g = g; box.appendChild(d); } });
  }
  function initLegend() {
    const box = $('.dots'), btns = $$('.eng__legend button'); if (!box) return;
    let locked = null;
    const show = g => {
      box.classList.toggle('has-focus', g !== null);
      $$('i', box).forEach(d => d.classList.toggle('is-g', g !== null && d.dataset.g === String(g)));
      btns.forEach(b => b.classList.toggle('is-on', b.dataset.g === String(g)));
    };
    btns.forEach(b => {
      b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') show(b.dataset.g); });
      b.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') show(locked); });
      b.addEventListener('focus', () => show(b.dataset.g));
      b.addEventListener('blur', () => show(locked));
      b.addEventListener('click', () => { locked = locked === b.dataset.g ? null : b.dataset.g; show(locked); });
    });
  }

  // Pause decorative CSS loops (float, drift, spin) in sections that are off screen.
  const pio = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-paused', !e.isIntersecting)));
  $$('main>section').forEach(sec => pio.observe(sec));

  buildDots(); initLegend(); initTilt(); initMagnetic(); initProximity(); initTips();

  /* ============================================================
     REDUCED MOTION / NO-GSAP: static page, clickable steps
     ============================================================ */
  if (!MOTION) {
    segs.forEach(s => s.addEventListener('click', () => setStep(+s.dataset.go)));
    document.fonts && document.fonts.ready.then(fitGrad);
    addEventListener('resize', fitGrad);
    $$('.rstep').forEach(s => s.classList.add('is-on'));
    $$('.crow--masii').forEach(r => r.classList.add('is-lit'));
    buildRollPath(true);
    $('.dots').classList.add('is-ready');
    return;
  }

  /* ============================================================
     6. SMOOTH SCROLL + SCROLL CHOREOGRAPHY
     ============================================================ */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: 'none' });
  let refreshTimer, lastScrollAt = 0;
  addEventListener('scroll', () => { lastScrollAt = performance.now(); }, { passive: true });
  function safeRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      if (performance.now() - lastScrollAt < 250 || ScrollTrigger.isScrolling() || (lenis && lenis.isScrolling)) return safeRefresh();
      ScrollTrigger.refresh();
    }, 350);
  }
  let layoutW = innerWidth, layoutH = innerHeight;
  addEventListener('resize', () => {
    if (innerWidth === layoutW && (!FINE || innerHeight === layoutH)) return;
    layoutW = innerWidth; layoutH = innerHeight; safeRefresh();
  });
  addEventListener('load', safeRefresh, { once: true });
  let lenis = null;
  if (window.Lenis && FINE) {
    lenis = new Lenis({ lerp: .1, smoothWheel: false, syncTouch: false });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollToY = (y, d = .9) => lenis ? lenis.scrollTo(y, { duration: d, easing: t => 1 - Math.pow(1 - t, 4) }) : scrollTo({ top: y, behavior: 'smooth' });

  function countUp(el, delay = 0) {
    const to = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0, o = { v: 0 };
    el.textContent = fmt(0, dec);
    return gsap.to(o, { v: to, duration: 1.8, delay, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v, dec); } });
  }

  function start() {
    fitGrad();

    /* hero load sequence */
    const hero = reveals.find(r => r.el.dataset.reveal === 'load');
    gsap.set(hero.words, { yPercent: 70, opacity: 0, filter: 'blur(14px)' });
    const tl = gsap.timeline({ delay: .15 });
    tl.to('.hero__eyebrow', { opacity: 1, duration: .8, ease: 'power2.out' })
      .add(revealWords(hero.words), .1)
      .fromTo('.hero__m-wrap', { opacity: 0, scale: .8, filter: 'blur(20px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.8, ease: 'expo.out', clearProps: 'filter,scale' }, .2)
      .fromTo('.hero__glows', { opacity: 0 }, { opacity: 1, duration: 2 }, .2)
      .fromTo('.hero__sub', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, .7)
      .fromTo('.price', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' }, .9);
    $$('.price [data-count]').forEach(el => tl.add(countUp(el), 1.05));

    /* the chrome M: pointer tilt + proximity swell */
    const mw = $('.hero__m-wrap'), glows = $('.hero__glows');
    if (FINE) {
      const rx = gsap.quickTo(mw, 'rotationX', { duration: 1.2, ease: 'power3' }), ry = gsap.quickTo(mw, 'rotationY', { duration: 1.2, ease: 'power3' });
      const sc = gsap.quickTo(mw, 'scale', { duration: 1, ease: 'power3' });
      const gx = gsap.quickTo(glows, 'x', { duration: 1.6, ease: 'power3' }), gy = gsap.quickTo(glows, 'y', { duration: 1.6, ease: 'power3' });
      addEventListener('pointermove', e => {
        if (scrollY > innerHeight) return;
        const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
        ry(x * 22); rx(-y * 16); gx(-x * 40); gy(-y * 30);
        const b = mw.getBoundingClientRect(), d = Math.hypot(e.clientX - (b.left + b.width / 2), e.clientY - (b.top + b.height / 2));
        sc(1 + .07 * Math.max(0, 1 - d / 420));
      }, { passive: true });
    }
    gsap.to('.hero__stage', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__copy', { yPercent: -18, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'center center', end: 'bottom top', scrub: true } });

    /* scroll reveals (one-shot, self-destructing triggers) */
    reveals.filter(r => r.el.dataset.reveal !== 'load').forEach(({ el, words }) => {
      gsap.set(words, { yPercent: 70, opacity: 0, filter: 'blur(14px)' });
      ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => revealWords(words) });
    });
    ScrollTrigger.batch($$('[data-fade]').filter(el => !el.closest('.hero')), {
      start: 'top 90%', once: true,
      onEnter: els => gsap.fromTo(els, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .08, clearProps: 'y' }),
    });

    /* palette per section */
    $$('[data-pal]').forEach(sec => {
      const idx = +sec.dataset.pal;
      ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: s => { if (s.isActive) gl.target = idx; } });
    });

    /* HOW — passive scroll progress; only a segment-button click requests a glide. */
    const SNAP = [0, .5, 1];
    let gliding = false, glideTimer = 0;
    const howST = ScrollTrigger.create({
      trigger: '.how', start: 'top top', end: () => '+=' + Math.round(innerHeight * 1.3), pin: '.how__inner', anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: s => { if (!gliding) setStep(s.progress < .25 ? 0 : s.progress < .75 ? 1 : 2); },
    });
    const yFor = i => howST.start + (howST.end - howST.start) * SNAP[i];
    function glideTo(i, d = .7) {
      setStep(i);                                  // the handoff starts now, not when the scroll lands
      gliding = true;
      const done = () => { gliding = false; clearTimeout(glideTimer); };
      clearTimeout(glideTimer); glideTimer = setTimeout(done, d * 1000 + 200); // Lenis skips onComplete for zero-distance glides
      if (lenis) lenis.scrollTo(yFor(i), { lock: true, force: true, duration: d, easing: t => 1 - Math.pow(1 - t, 4), onComplete: done });
      else { scrollTo({ top: yFor(i), behavior: 'smooth' }); setTimeout(done, d * 1000); }
    }
    const posY = () => (lenis ? lenis.animatedScroll : scrollY);
    const inPin = () => { const y = posY(); return y >= howST.start - 1 && y <= howST.end + 1; };
    // Wheel, touch, scrollbar and keyboard derive the step passively from progress.
    segs.forEach(s => s.addEventListener('click', () => { if (inPin()) glideTo(+s.dataset.go); else scrollToY(yFor(+s.dataset.go) + (+s.dataset.go === 0 ? 1 : 0), 1); }));
    // the whole deck leans slightly towards the pointer
    if (FINE) {
      const deck = $('.deck'), dx = gsap.quickTo(deck, 'rotationY', { duration: 1, ease: 'power3' }), dy = gsap.quickTo(deck, 'rotationX', { duration: 1, ease: 'power3' });
      $('.how').addEventListener('pointermove', e => { const r = deck.getBoundingClientRect(); dx(((e.clientX - r.left) / r.width - .5) * 10); dy(-((e.clientY - r.top) / r.height - .5) * 6); });
      $('.how').addEventListener('pointerleave', () => { dx(0); dy(0); });
    }
    gsap.fromTo('.deck', { y: 70 }, { y: 0, ease: 'none', scrollTrigger: { trigger: '.how', start: 'top bottom', end: 'top top', scrub: 1 } });

    /* TEAMS — cards rise in once */
    gsap.fromTo('.tcard', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .07, clearProps: 'y', scrollTrigger: { trigger: '.teams__viewport', start: 'top 85%', once: true } });

    /* COMPARE — MASii row lights up; its border only spins while on screen */
    const mrow = $('.crow--masii');
    ScrollTrigger.create({ trigger: mrow, start: 'top 85%', end: 'bottom top', onEnter: () => mrow.classList.add('is-lit'), onToggle: s => mrow.classList.toggle('is-live', s.isActive) });
    gsap.fromTo('.crow:not(.crow--masii)', { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: .07, duration: .8, ease: 'expo.out', clearProps: 'opacity,transform', scrollTrigger: { trigger: '.ctable', start: 'top 80%', once: true } });

    /* COST — bars, counters, balance, dots */
    $$('.bar__fill').forEach((b, i) => {
      gsap.fromTo(b, { scaleX: 0 }, { scaleX: parseFloat(getComputedStyle(b).getPropertyValue('--to')), duration: 1.8, delay: i * .25, ease: 'power3.out', scrollTrigger: { trigger: '.bars', start: 'top 80%', once: true } });
    });
    $$('.cbox').forEach(box => {
      const nums = $$('[data-count]', box); if (!nums.length) return;
      nums.forEach(el => { el.textContent = fmt(0, +el.dataset.dec || 0); });
      ScrollTrigger.create({ trigger: box, start: 'top 72%', once: true, onEnter: () => nums.forEach((el, i) => countUp(el, i * .08)) });
    });
    const sc = { trigger: '.scale', start: 'top 85%', end: 'top 35%', scrub: 1 };
    gsap.fromTo('.scale__beam', { rotate: -11 }, { rotate: 0, ease: 'power2.inOut', scrollTrigger: sc });
    gsap.fromTo('.scale__pan', { rotate: 11 }, { rotate: 0, ease: 'power2.inOut', scrollTrigger: { ...sc } });
    gsap.fromTo('.scale__mid', { opacity: 0, scale: .4 }, { opacity: 1, scale: 1, ease: 'back.out(2)', duration: .8, scrollTrigger: { trigger: '.scale__nums', start: 'top 80%', once: true } });
    gsap.fromTo('.dots i', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: .5, ease: 'back.out(2)', stagger: { each: .008 }, clearProps: 'transform,opacity', onComplete: () => $('.dots').classList.add('is-ready'), scrollTrigger: { trigger: '.dots', start: 'top 80%', once: true } });

    /* ROLLOUT — gradient line draws itself */
    buildRollPath(false);

    /* CLOSE */
    gsap.fromTo('.close__m', { opacity: 0, y: 60, scale: .8 }, { opacity: 1, y: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.close', start: 'top 85%', end: 'top 25%', scrub: 1 } });

    safeRefresh();
    ScrollTrigger.addEventListener('refresh', fitGrad);
  }

  function buildRollPath(isStatic) {
    const wrap = $('.roll__steps'), svg = $('.roll__line'); if (!wrap) return;
    const make = () => {
      const wr = wrap.getBoundingClientRect();
      const pts = $$('.rstep__dot', wrap).map(d => { const r = d.getBoundingClientRect(); return [r.left + r.width / 2 - wr.left, r.top + r.height / 2 - wr.top]; });
      if (pts.length < 2) return null;
      svg.setAttribute('viewBox', `0 0 48 ${wr.height}`); svg.style.height = wr.height + 'px';
      let d = `M ${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], amp = i % 2 ? 16 : -16, dy = (y1 - y0) / 3;
        d += ` C ${x0 + amp} ${y0 + dy}, ${x1 + amp} ${y1 - dy}, ${x1} ${y1}`;
      }
      $$('path', svg).forEach(p => p.setAttribute('d', d));
      const draw = $('.roll__draw', svg), len = draw.getTotalLength();
      draw.style.strokeDasharray = len;
      draw.style.strokeDashoffset = isStatic ? 0 : len;
      return { draw, len, pts };
    };
    let geo = make();
    if (isStatic) { addEventListener('resize', make); return; }
    const items = $$('.rstep');
    ScrollTrigger.create({
      trigger: wrap, start: 'top 65%', end: 'bottom 65%',
      onRefresh: s => { geo = make(); if (geo) geo.draw.style.strokeDashoffset = geo.len * (1 - s.progress); },
      onUpdate: s => {
        if (!geo) return;
        geo.draw.style.strokeDashoffset = geo.len * (1 - s.progress);
        const reachY = geo.pts[0][1] + (geo.pts[geo.pts.length - 1][1] - geo.pts[0][1]) * s.progress;
        items.forEach((it, i) => it.classList.toggle('is-on', geo.pts[i][1] <= reachY + 2));
      },
    });
    items[0].classList.add('is-on');
  }

  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(start));
})();
