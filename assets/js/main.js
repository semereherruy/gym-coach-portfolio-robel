/* =====================================================================
   Kane Mercer — motion engine
   Vanilla, dependency-free. One rAF loop drives every scroll effect.
   Everything degrades: no JS = full static page, reduced motion = no movement.
   ===================================================================== */
(function () {
  'use strict';

  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqFine   = window.matchMedia('(hover:hover) and (pointer:fine)');
  var reduced  = mqReduce.matches;
  var vh = window.innerHeight, vw = window.innerWidth;

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (n, a, b) { return n < a ? a : n > b ? b : n; };
  var lerp  = function (a, b, t) { return a + (b - a) * t; };

  /* ---------------------------------------------------------------- 1. LOADER */
  function loader() {
    var el = $('#loader'), num = $('#loaderNum'), bar = $('#loaderBar');
    if (!el) return;
    if (reduced) { el.classList.add('is-done'); document.body.classList.remove('is-locked'); start(); return; }

    document.body.classList.add('is-locked');
    var v = 0, done = false;
    var tick = setInterval(function () {
      v = Math.min(100, v + Math.random() * 13 + 4);
      num.textContent = Math.round(v);
      bar.style.transform = 'scaleX(' + (v / 100) + ')';
      if (v >= 100) { clearInterval(tick); finish(); }
    }, 110);

    function finish() {
      if (done) return; done = true;
      setTimeout(function () {
        el.classList.add('is-done');
        document.body.classList.remove('is-locked');
        start();
      }, 380);
    }
    // Hard ceiling so a slow network never traps the page.
    setTimeout(finish, 3200);
  }

  /* ------------------------------------------------------- 2. TEXT SPLITTING */
  // Wraps every word in .word > span, preserving inline markup (<i>, <br>, links).
  function splitWords(el, stagger, base) {
    if (el.dataset.split === 'done') return;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = walker.nextNode())) if (n.nodeValue.trim()) nodes.push(n);

    var i = 0;
    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
        var outer = document.createElement('span');
        outer.className = 'word';
        var inner = document.createElement('span');
        inner.textContent = part;
        inner.style.setProperty('--ld', ((base || 0) + i * stagger).toFixed(3) + 's');
        outer.appendChild(inner);
        frag.appendChild(outer);
        i++;
      });
      node.parentNode.replaceChild(frag, node);
    });
    el.dataset.split = 'done';
  }

  /* ------------------------------------------------------------- 3. REVEALS */
  function reveals() {
    var targets = $$('[data-reveal], [data-split], [data-reveal-group], .mask, .stats__i, .exp__list');
    if (reduced || !('IntersectionObserver' in window)) {
      targets.forEach(function (t) { t.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ------------------------------------------------------------ 4. COUNTERS */
  function counters() {
    var els = $$('[data-count]');
    var run = function (el) {
      var to = parseFloat(el.dataset.count), suf = el.dataset.suffix || '';
      if (reduced) { el.textContent = to + suf; return; }
      var t0 = null, dur = 1600;
      var step = function (t) {
        if (!t0) t0 = t;
        var p = clamp((t - t0) / dur, 0, 1);
        var e = 1 - Math.pow(2, -10 * p);           // easeOutExpo
        el.textContent = Math.round(to * e) + suf;
        if (p < 1) requestAnimationFrame(step); else el.textContent = to + suf;
      };
      requestAnimationFrame(step);
    };
    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------------- 5. NAV */
  function nav() {
    var bar = $('#nav'), burger = $('#burger'), menu = $('#menu');
    var links = $$('.nav__link');
    var last = 0;

    burger.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('is-locked', open);
    });
    $$('a', menu).forEach(function (a) {
      a.addEventListener('click', function () {
        document.body.classList.remove('menu-open', 'is-locked');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) burger.click();
    });

    // Active link
    var secs = links.map(function (l) { return document.querySelector(l.getAttribute('href')); });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) {
          if (!e.isIntersecting) return;
          var i = secs.indexOf(e.target);
          links.forEach(function (l, k) {
            if (k === i) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      secs.forEach(function (s) { if (s) io.observe(s); });
    }

    return function update(y) {
      bar.classList.toggle('is-stuck', y > 40);
      bar.classList.toggle('is-hidden', y > 420 && y > last + 4 && !document.body.classList.contains('menu-open'));
      if (Math.abs(y - last) > 3) last = y;
    };
  }

  /* --------------------------------------------------------- 6. MAGNETIC UI */
  function magnetic() {
    if (reduced || !mqFine.matches) return;
    $$('.mag').forEach(function (el) {
      var r = null;
      el.addEventListener('pointerenter', function () { r = el.getBoundingClientRect(); });
      el.addEventListener('pointermove', function (e) {
        if (!r) r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate3d(' + (dx * 0.26).toFixed(2) + 'px,' + (dy * 0.34).toFixed(2) + 'px,0)';
      });
      el.addEventListener('pointerleave', function () { r = null; el.style.transform = ''; });
    });
  }

  /* -------------------------------------------------------- 7. EXPERTISE UI */
  function expertise() {
    var list = $('#expList'); if (!list) return;
    var items = $$('.exp__item', list);
    var shots = $$('.exp__shot');
    var cap = $('#expCap'), ring = $('#expRing'), ringN = $('#expRingN');
    var LEN = 2 * Math.PI * 46;

    function open(item) {
      items.forEach(function (it) {
        var on = it === item;
        it.classList.toggle('is-open', on);
        $('.exp__btn', it).setAttribute('aria-expanded', String(on));
      });
      var i = parseInt(item.dataset.shot, 10) || 0;
      shots.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      var n = items.indexOf(item) + 1, total = items.length;
      cap.textContent = $('.exp__t', item).textContent;
      ringN.textContent = (n < 10 ? '0' : '') + n;
      ring.style.strokeDashoffset = String(LEN - (LEN * n) / total);
    }

    items.forEach(function (it) {
      $('.exp__btn', it).addEventListener('click', function () { open(it); });
      if (mqFine.matches && !reduced) {
        it.addEventListener('pointerenter', function () { open(it); });
      }
    });
    ring.style.strokeDasharray = String(LEN);
    open(items[0]);
  }

  /* ------------------------------------------------- 8. PROGRAMS (pinned X) */
  function programs() {
    var track = $('#progTrack'), rail = $('#progRail'), bar = $('#progBar'), hint = $('#progHint');
    if (!track || !rail) return { update: function () {}, layout: function () {} };
    var sticky = track.firstElementChild;
    var dist = 0, scrollable = 0, pinned = false;

    function layout() {
      var canPin = !reduced && window.innerWidth > 860;
      dist = rail.scrollWidth - window.innerWidth + 24;
      if (!canPin || dist <= 0) {
        pinned = false;
        track.classList.remove('is-pinned');
        sticky.classList.add('is-free');
        track.style.height = '';
        rail.style.transform = '';
        if (hint) hint.textContent = 'Swipe to explore';
        return;
      }
      pinned = true;
      sticky.classList.remove('is-free');
      track.classList.add('is-pinned');
      track.style.height = '';                       // measure natural sticky height first
      var h = sticky.offsetHeight;
      track.style.height = (h + dist) + 'px';
      scrollable = dist;
      if (hint) hint.textContent = 'Scroll to explore';
    }

    function update() {
      if (!pinned) return;
      var top = track.getBoundingClientRect().top;
      var p = clamp(-top / scrollable, 0, 1);
      rail.style.transform = 'translate3d(' + (-p * dist).toFixed(1) + 'px,0,0)';
      if (bar) bar.style.transform = 'scaleX(' + p.toFixed(3) + ')';
    }
    return { update: update, layout: layout };
  }

  /* ------------------------------------------------ 9. BEFORE / AFTER SLIDER */
  function beforeAfter() {
    $$('[data-ba]').forEach(function (ba) {
      var range = $('.ba__range', ba);
      var set = function (p) {
        p = clamp(p, 0, 100);
        ba.style.setProperty('--p', p + '%');
        if (range.value != p) range.value = p;
      };
      var dragging = false;
      var fromEvent = function (e) {
        var r = ba.getBoundingClientRect();
        set(((e.clientX - r.left) / r.width) * 100);
      };
      ba.addEventListener('pointerdown', function (e) {
        if (e.target === range) return;
        dragging = true; ba.setPointerCapture(e.pointerId); fromEvent(e);
      });
      ba.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e); });
      ['pointerup', 'pointercancel'].forEach(function (t) {
        ba.addEventListener(t, function () { dragging = false; });
      });
      range.addEventListener('input', function () { set(parseFloat(range.value)); });

      // Cinematic first look: sweep once when it scrolls into view.
      if (!reduced && 'IntersectionObserver' in window) {
        set(100);
        var io = new IntersectionObserver(function (en) {
          en.forEach(function (e) {
            if (!e.isIntersecting) return;
            io.unobserve(ba);
            var t0 = null;
            var run = function (t) {
              if (!t0) t0 = t;
              var p = clamp((t - t0) / 1400, 0, 1);
              var eo = 1 - Math.pow(1 - p, 3);
              set(100 - eo * 50);
              if (p < 1) requestAnimationFrame(run);
            };
            setTimeout(function () { requestAnimationFrame(run); }, 260);
          });
        }, { threshold: 0.4 });
        io.observe(ba);
      } else { set(50); }
    });
  }

  /* ----------------------------------------------------------- 10. METHOD */
  function method() {
    var list = $('#methodSteps'); if (!list) return function () {};
    var steps = $$('.method__step', list);
    return function () {
      var r = list.getBoundingClientRect();
      var line = clamp((vh * 0.62 - r.top) / r.height, 0, 1);
      list.style.setProperty('--mp', line.toFixed(3));
      steps.forEach(function (s) {
        var sr = s.getBoundingClientRect();
        s.classList.toggle('is-on', sr.top < vh * 0.66 && sr.bottom > vh * 0.12);
      });
    };
  }

  /* -------------------------------------------- 11. SCROLL SEQUENCE (canvas) */
  /* Dwell-remapped, LERP-smoothed frame playback driven by scroll position.
     Runs on the local still sequence until real frames are extracted; point
     data-frames at frames/manifest.json and the same engine plays those. */
  function sequence() {
    var sec = $('#reel'); if (!sec) return { update: function () {}, layout: function () {} };
    var stage = $('#seqStage'), canvas = $('#seqCanvas');
    var ctx = canvas.getContext('2d', { alpha: false });
    var chapters = $$('.seq__ch', sec);
    var elFrame = $('#seqFrame');

    var DWELL_WIDTH = 0.05, DWELL_PEAK = 2.4, LERP = 0.12, LUT = 1200;
    var centers = chapters.map(function (c) { return parseFloat(c.dataset.center); });

    // Sources: the contact sheet is the single source of truth for the stills.
    var urls = $$('#sheetStrip img').map(function (im) { return im.src.replace(/w=\d+/, 'w=1600').replace(/q=\d+/, 'q=74'); });
    var COUNT = urls.length, smallSet = true;

    var imgs = new Array(COUNT), loaded = new Uint8Array(COUNT);
    var cur = 0, target = 0, lastKey = '', running = false, visible = false;
    var scrollH = '280vh';

    function load(i) {
      if (imgs[i]) return;
      var im = new Image(); imgs[i] = im; im.decoding = 'async';
      im.onload = function () { loaded[i] = 1; lastKey = ''; };
      im.onerror = function () { imgs[i] = null; };
      im.src = urls[i];
    }
    function nearest(i) {
      if (loaded[i]) return i;
      for (var d = 1; d < COUNT; d++) {
        if (i - d >= 0 && loaded[i - d]) return i - d;
        if (i + d < COUNT && loaded[i + d]) return i + d;
      }
      return -1;
    }
    function cover(im) {
      var w = canvas.width, h = canvas.height;
      var sc = Math.max(w / im.naturalWidth, h / im.naturalHeight);
      var dw = im.naturalWidth * sc, dh = im.naturalHeight * sc;
      ctx.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
    }
    function draw(f) {
      var base = Math.floor(f), mix = f - base;
      var a = nearest(clamp(base, 0, COUNT - 1));
      if (a < 0) return;
      var key = a + '|' + (smallSet ? Math.round(clamp((mix - 0.74) / 0.26, 0, 1) * 16) : 0);
      if (key === lastKey) return;
      lastKey = key;
      ctx.fillStyle = '#15181A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      cover(imgs[a]);
      // Short, decisive dissolve at the cut rather than a long double exposure.
      if (smallSet && mix > 0.74) {
        var b = nearest(clamp(base + 1, 0, COUNT - 1));
        if (b >= 0 && b !== a) {
          ctx.globalAlpha = (mix - 0.74) / 0.26; cover(imgs[b]); ctx.globalAlpha = 1;
        }
      }
    }

    // Dwell LUT: readable slow zones centred on each chapter.
    var lut = new Float64Array(LUT + 1);
    (function build() {
      var total = 0, dens = new Float64Array(LUT + 1);
      for (var i = 0; i <= LUT; i++) {
        var e = i / LUT, v = 1;
        for (var k = 0; k < centers.length; k++) {
          var d = (e - centers[k]) / DWELL_WIDTH;
          v += DWELL_PEAK * Math.exp(-0.5 * d * d);
        }
        dens[i] = v;
        if (i > 0) total += (dens[i - 1] + v) * 0.5;
        lut[i] = total;
      }
      for (var j = 0; j <= LUT; j++) lut[j] /= total;
    })();
    function remap(raw) {
      var lo = 0, hi = LUT;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (lut[mid] < raw) lo = mid + 1; else hi = mid; }
      var idx = Math.max(1, lo), l = lut[idx - 1], r = lut[idx];
      return clamp((idx - 1 + (raw - l) / ((r - l) || 1)) / LUT, 0, 1);
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.round(stage.clientWidth * dpr), h = Math.round(stage.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; lastKey = ''; }
    }
    function layout() {
      sec.style.height = reduced ? '' : scrollH;
      resize();
    }

    var activeCh = null;
    function chaptersAt(e) {
      var best = null, near = Infinity;
      chapters.forEach(function (c) {
        var dist = Math.abs(e - parseFloat(c.dataset.center));
        var on = dist <= parseFloat(c.dataset.window);
        if (c.classList.contains('is-on') !== on) c.classList.toggle('is-on', on);
        if (dist < near) { near = dist; best = c; }
      });
      activeCh = best;
    }

    function tick() {
      if (!visible || !pageVisible || reduced) { running = false; return; }
      cur += (target - cur) * LERP;
      draw(cur);
      running = true;
      requestAnimationFrame(tick);
    }

    function update() {
      var r = sec.getBoundingClientRect();
      visible = r.top < vh && r.bottom > 0;
      if (!visible) return;
      var raw = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      var eff = reduced ? 0.1 : remap(raw);
      target = eff * (COUNT - 1);
      chaptersAt(eff);
      var shown = Math.round(target) + 1;
      elFrame.textContent = 'F ' + String(shown).padStart(3, '0') + ' / ' + String(COUNT).padStart(3, '0');
      for (var i = 0; i < COUNT; i++) if (Math.abs(i - target) < 3) load(i);
      if (reduced) { cur = target; draw(cur); return; }
      if (!running) { running = true; requestAnimationFrame(tick); }
    }

    // Optional real footage: data-frames -> frames/manifest.json
    // (schema written by scripts/extract_frames.py)
    var manifest = sec.dataset.frames;
    if (manifest) {
      fetch(manifest).then(function (r) { return r.json(); }).then(function (m) {
        var base = manifest.replace(/[^/]*$/, '');
        var wantMobile = window.innerWidth <= 780 && m.mobile && m.mobile.actual_count;
        var set = wantMobile ? m.mobile : m.desktop;
        var n = (set && set.actual_count) || (m.frames && m.frames.target_count) || 0;
        if (!n) return;
        var dir = base + (wantMobile ? 'mobile' : 'desktop');
        var next = [];
        for (var i = 0; i < n; i++) next.push(dir + '/frame-' + String(i + 1).padStart(4, '0') + '.webp');
        urls = next; COUNT = n; smallSet = false;
        scrollH = m.recommended_scroll_height || '700vh';
        imgs = new Array(COUNT); loaded = new Uint8Array(COUNT); lastKey = '';
        layout();
        // critical frames first (chapter centres), then everything else in batches
        var critical = [0, COUNT - 1].concat(centers.map(function (c) { return Math.round(c * (COUNT - 1)); }));
        critical.forEach(load);
        var i2 = 0;
        (function batch() {
          for (var k = 0; k < 8 && i2 < COUNT; k++, i2++) load(i2);
          if (i2 < COUNT) setTimeout(batch, 120);
        })();
        update();
      }).catch(function () {});
    }

    for (var i = 0; i < COUNT; i++) load(i);
    window.addEventListener('resize', function () { resize(); lastKey = ''; update(); });
    return { update: update, layout: layout };
  }

  /* ------------------------------------------------------- 11b. CONTACT SHEET */
  function contactSheet() {
    var strip = $('#sheetStrip'), hero = $('#sheetHero'); if (!strip) return;
    $$('.sheet__f', strip).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.sheet__f', strip).forEach(function (o) { o.classList.toggle('is-on', o === b); });
        var im = $('img', b);
        hero.src = im.src.replace(/w=\d+/, 'w=1400').replace(/q=\d+/, 'q=72');
        hero.alt = im.alt.replace(/^Frame \d+ — /, 'Selected frame — ');
      });
    });
  }

  /* ------------------------------------------------- 12b. TELEMETRY RAIL */
  /* The one signature device: progress, chapter state and the standing action.
     It replaces both a top progress bar and a floating contact bubble. */
  function rail() {
    var el = $('#rail'); if (!el) return function () {};
    var fill = $('#railFill'), chEl = $('#railCh'), idxEl = $('#railIdx');
    var marks = [
      ['#about', 'About'], ['#expertise', 'Skill'], ['#programs', 'Coaching'],
      ['#results', 'Results'], ['#method', 'Method'], ['#reel', 'Sequence'],
      ['#why', 'Why'], ['#contact', 'Contact']
    ].map(function (m) { return { el: $(m[0]), name: m[1] }; }).filter(function (m) { return m.el; });

    var lastCh = '';

    return function (p, y) {
      el.classList.toggle('is-live', y > vh * 0.55);
      fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      idxEl.textContent = String(Math.round(p * 100)).padStart(2, '0') + '%';

      var i = -1, center = y + vh * 0.45;
      for (var k = 0; k < marks.length; k++) {
        if (center >= marks[k].el.offsetTop) i = k;
      }
      var label = i < 0 ? '00 · Opening' : String(i + 1).padStart(2, '0') + ' · ' + marks[i].name;
      if (label !== lastCh) { lastCh = label; chEl.textContent = label; }
    };
  }

  /* ------------------------------------------------------------ 13. ENGINE */
  var navUpdate, prog, methodUpdate, seq, railUpdate, parallaxEls, darkRanges = [];
  var pageVisible = true;

  function measure() {
    vh = window.innerHeight; vw = window.innerWidth;
    if (prog) prog.layout();
    if (seq) seq.layout();
    darkRanges = $$('[data-theme="dark"]').map(function (el) {
      var r = el.getBoundingClientRect(), y = window.scrollY || window.pageYOffset;
      return [r.top + y, r.bottom + y];
    });
  }

  function frame() {
    var y = window.scrollY || window.pageYOffset;
    var doc = document.documentElement;
    var max = doc.scrollHeight - vh;

    var p = clamp(max > 0 ? y / max : 0, 0, 1);
    if (railUpdate) railUpdate(p, y);

    if (navUpdate) navUpdate(y);
    if (prog) prog.update();
    if (methodUpdate) methodUpdate();
    if (seq) seq.update();

    if (parallaxEls && !reduced) {
      parallaxEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var off = r.top + r.height / 2 - vh / 2;
        el.style.transform = 'translate3d(0,' + (-off * parseFloat(el.dataset.speed)).toFixed(1) + 'px,0)';
      });
    }

    var center = y + vh / 2, onDark = false;
    for (var k = 0; k < darkRanges.length; k++) {
      if (center >= darkRanges[k][0] && center <= darkRanges[k][1]) { onDark = true; break; }
    }
    document.body.classList.toggle('on-dark', onDark);

    ticking = false;
  }

  var ticking = false;
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

  /* --------------------------------------------------------------- 14. BOOT */
  function start() {
    // Hero choreography — kicks off once the loader clears.
    $$('[data-hero]').forEach(function (el, i) {
      if (reduced) { el.classList.add('is-in'); return; }
      el.style.opacity = '0';
      el.style.transform = 'translate3d(0,26px,0)';
      el.style.transition = 'opacity .9s cubic-bezier(.16,1,.3,1) ' + (0.18 + i * 0.09) + 's,' +
                            'transform 1.1s cubic-bezier(.16,1,.3,1) ' + (0.18 + i * 0.09) + 's';
      var show = function () { el.style.opacity = ''; el.style.transform = ''; el.classList.add('is-in'); };
      requestAnimationFrame(function () { requestAnimationFrame(show); });
      setTimeout(show, 200);   // never strand the hero if rAF is throttled (background tab)
    });
    var title = $('.hero__title');
    if (title) setTimeout(function () { title.classList.add('is-in'); }, 260);
    counters();   // held back so numbers never run behind the loader
  }

  function init() {
    $('#year').textContent = new Date().getFullYear();

    if (!reduced) {
      var hero = $('.hero__title');
      if (hero) splitWords(hero, 0.055, 0.05);
      $$('[data-split="lines"]').forEach(function (el) { if (el !== hero) splitWords(el, 0.035, 0); });
    } else {
      $$('[data-split]').forEach(function (el) { el.classList.add('is-in'); });
    }

    navUpdate = nav();
    prog = programs();
    methodUpdate = method();
    seq = sequence();
    railUpdate = rail();
    parallaxEls = $$('[data-speed]');

    reveals();
    expertise();
    beforeAfter();
    contactSheet();
    magnetic();

    measure();
    frame();

    document.addEventListener('visibilitychange', function () {
      pageVisible = !document.hidden;
      if (pageVisible) frame();
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { measure(); frame(); }, 140);
    });
    window.addEventListener('load', function () { measure(); frame(); });
    mqReduce.addEventListener && mqReduce.addEventListener('change', function () { location.reload(); });

    loader();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
