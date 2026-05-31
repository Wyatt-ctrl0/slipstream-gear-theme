/* ============================================================
   SLIPSTREAM GEAR — motion + interaction layer (vanilla)
   Mechanism reused from SnagNest's nest.js (rAF reveal checker,
   header-scrolled toggle, seamless marquee, IO bar-fill); the
   LOOK + the Night-Run signature motion are invented fresh.
   Progressive enhancement; everything reduce-gated.
   ============================================================ */
(function () {
  'use strict';

  /* First action: confirm JS is running so the hidden reveal start-state
     (scoped to .js-reveal in CSS) engages. If this never runs, content
     stays fully visible — no opacity:0 trap. */
  document.documentElement.classList.add('js-reveal');

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* motion-off escape hatch (URL ?motion=off or a persisted flag) */
  if (/[?&]motion=off/.test(location.search)) document.body.classList.add('motion-off');
  if (document.body.classList.contains('motion-off')) reduce = true;

  /* ---------- scroll reveal (rAF checker + --i stagger) ----------
     Verbatim mechanism from nest.js. The streak/blur start-state
     lives in CSS, so this code is untouched in spirit. */
  function setupReveal() {
    var els = $$('[data-reveal]'); if (!els.length) return;
    $$('[data-reveal-group]').forEach(function (group) {
      $$(':scope > [data-reveal]', group).forEach(function (el, i) { el.style.setProperty('--i', i); });
    });
    if (reduce) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    /* clear the transient compositor hint once each element finishes revealing */
    function reveal(el) {
      el.style.willChange = 'opacity, transform';
      el.classList.add('in');
      el.addEventListener('transitionend', function done() {
        el.style.willChange = '';
        el.removeEventListener('transitionend', done);
      });
    }
    var pending = els;
    function check() {
      var trigger = window.innerHeight * 0.9;
      pending = pending.filter(function (el) {
        if (el.getBoundingClientRect().top < trigger) { reveal(el); return false; }
        return true;
      });
      if (!pending.length) { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); }
    }
    var ticking = false;
    function onScroll() { if (ticking) return; ticking = true; requestAnimationFrame(function () { ticking = false; check(); }); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    requestAnimationFrame(function () { requestAnimationFrame(check); });
  }

  /* ---------- header shadow / scrolled hairline ----------
     Verbatim from nest.js setupHeader. */
  function setupHeader() {
    var h = $('.site-header'); if (!h) return;
    var fn = function () { h.classList.toggle('scrolled', window.scrollY > 8); };
    fn(); window.addEventListener('scroll', fn, { passive: true });
  }

  /* ---------- seamless marquee ----------
     Verbatim mechanism from nest.js setupMarquee (widen one group
     past the ribbon, duplicate, steady 70px/s). */
  function setupMarquee() {
    var track = $('[data-marquee]'); if (!track || reduce) return;
    var ribbon = track.parentElement;
    var baseHTML = track.innerHTML;
    var rebuilding = false;
    function build() {
      track.style.animation = 'none';
      track.innerHTML = baseHTML;
      var group = baseHTML, guard = 0;
      while (track.scrollWidth < ribbon.offsetWidth && guard++ < 40) {
        track.insertAdjacentHTML('beforeend', baseHTML);
        group = track.innerHTML;
      }
      var groupW = track.scrollWidth;
      track.innerHTML = group + group;
      void track.offsetWidth;
      var dur = Math.max(18, groupW / 70);
      track.style.animation = 'marquee ' + dur.toFixed(1) + 's linear infinite';
    }
    build();
    var t;
    window.addEventListener('resize', function () {
      if (rebuilding) return; rebuilding = true;
      clearTimeout(t);
      t = setTimeout(function () { rebuilding = false; build(); }, 200);
    });
  }

  /* ---------- mobile nav drawer ---------- */
  function setupDrawer() {
    var toggle = $('[data-drawer-toggle]'), drawer = $('[data-drawer]');
    if (!toggle || !drawer) return;
    var panel = $('.drawer-panel', drawer);
    var links = $$('a', panel);
    function set(open) {
      drawer.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      // Body scroll-lock is handled centrally in syncInert() (recomputed from
      // whether ANY overlay is open) so cart/search/nav stay consistent and the
      // lock can never leak when one overlay closes another.
      // Shared inert handling (see syncInert/closeOverlays): inert is recomputed
      // from which overlays are open, so cart/search/nav can never leave the page
      // permanently inert or stacked. `inert` blocks focus/tab + a11y tree.
      if (open) closeOverlays(drawer);
      syncInert();
      if (open) { if (links[0]) links[0].focus(); }
      else { toggle.focus(); }   // return focus to the burger
    }
    toggle.addEventListener('click', function () { set(!drawer.classList.contains('open')); });
    drawer.addEventListener('click', function (e) {
      if (e.target === drawer || e.target.closest('[data-drawer-close]')) set(false);
    });
    document.addEventListener('keydown', function (e) {
      if (!drawer.classList.contains('open')) return;
      if (e.key === 'Escape') { set(false); return; }
      if (e.key === 'Tab' && links.length) {
        // trap Tab within the drawer links
        var first = links[0], last = links[links.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- FAQ accordion (one open at a time) ----------
     Mechanism from nest.js setupFaq. */
  function setupFaq() {
    $$('.qa-q').forEach(function (q) {
      q.addEventListener('click', function () {
        var item = q.closest('.qa'), isOpen = item.classList.contains('open');
        $$('.qa.open').forEach(function (o) {
          if (o !== item) {
            o.classList.remove('open');
            var b = $('.qa-q', o); if (b) b.setAttribute('aria-expanded', 'false');
            var pa = $('.qa-a', o); if (pa) pa.hidden = true;   // drop from a11y tree + tab order
          }
        });
        var open = !isOpen, ans = $('.qa-a', item);
        // un-hide BEFORE opening so the max-height transition can run
        if (open && ans) ans.hidden = false;
        item.classList.toggle('open', open);
        q.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (!open && ans) {
          // re-hide after the collapse transition finishes
          ans.addEventListener('transitionend', function done() {
            if (!item.classList.contains('open')) ans.hidden = true;
            ans.removeEventListener('transitionend', done);
          });
        }
      });
    });
  }

  /* ---------- amber speed-rule dividers (IO width-fill) ----------
     Mechanism from nest.js setupBars: fill [data-pct] on enter. */
  function setupBars() {
    var bars = $$('[data-pct]'); if (!bars.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      bars.forEach(function (b) { b.style.width = b.getAttribute('data-pct') + '%'; });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.style.width = en.target.getAttribute('data-pct') + '%'; io.unobserve(en.target); }
      });
    }, { threshold: .4 });
    bars.forEach(function (b) { io.observe(b); });
  }

  /* ---------- HEADLIGHT SWEEP (signature entrance) ----------
     Toggle .sweep-go on the hero on load, and re-trigger each time
     the hero re-enters view (same IO pattern as setupStickyBuy). */
  function setupSweep() {
    var hero = $('[data-hero-section]'); if (!hero) return;
    if (reduce) return;                 // reduced motion => clean static lit hero
    function fire() {
      hero.classList.remove('sweep-go');
      void hero.offsetWidth;            // reflow so the animation restarts
      hero.classList.add('sweep-go');
    }
    // only fire on load if the hero is actually in view; otherwise wait for entry
    var r = hero.getBoundingClientRect();
    var inView = r.top < window.innerHeight && r.bottom > 0;
    if (inView) fire();
    if (!('IntersectionObserver' in window)) return;
    var seen = inView;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) { seen = false; return; }
        if (!seen) { seen = true; fire(); }   // fire on first/re-entry
      });
    }, { threshold: .35 });
    io.observe(hero);
  }

  /* ---------- COUNT-UP readouts (vanilla rAF, no library) ----------
     Verifiable trust numbers only. Snaps to final under reduce. */
  function setupCountUp() {
    var nums = $$('[data-countup]'); if (!nums.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      nums.forEach(function (n) { n.textContent = n.getAttribute('data-countup'); });
      return;
    }
    function run(el) {
      var target = parseInt(el.getAttribute('data-countup'), 10) || 0;
      var dur = 1100, start = null;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);              // ease-out cubic
        el.textContent = Math.round(eased * target);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target;                    // exact final value
      }
      requestAnimationFrame(step);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: .6 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ---------- fake-submit forms (newsletter) ----------
     Mechanism from nest.js setupForms. */
  function setupForms() {
    $$('[data-fakeform]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = f.querySelector('.form-msg'); if (msg) msg.classList.add('show');
        f.reset();
      });
    });
  }

  /* ---------- save / wishlist toggle (shared across collection + PDP) ----------
     Single source of truth: reads/writes the same 'slipstream:saved'
     localStorage array used by page-wishlist.js, so a save on the grid
     or PDP persists to the garage. Safe-storage wrapper never throws.
     Name-preserving aria-label (mirrors the wishlist remove buttons) so the
     screen-reader announcement is identical on every page. */
  function setupSave() {
    var KEY = 'slipstream:saved';
    var saveBtns = $$('[data-save]'); if (!saveBtns.length) return;
    var live = $('[data-cart-live]');

    function readSaved() {
      try {
        var raw = window.localStorage.getItem(KEY);
        var arr = raw ? JSON.parse(raw) : null;
        return Array.isArray(arr) ? arr : [];
      } catch (e) { return []; }
    }
    function writeSaved(ids) {
      try { window.localStorage.setItem(KEY, JSON.stringify(ids)); }
      catch (e) { /* storage blocked: stay in-memory only */ }
    }
    function productName(btn) {
      var label = btn.getAttribute('aria-label') || '';
      return label.replace(/^(Save|Saved)\s+/, '').replace(/\s+to wishlist$/, '');
    }

    var saved = readSaved();

    // reflect persisted state on load so it is consistent across pages
    saveBtns.forEach(function (btn) {
      var id = btn.getAttribute('data-id');
      if (id && saved.indexOf(id) !== -1) {
        btn.setAttribute('aria-pressed', 'true');
        var nm = productName(btn);
        btn.setAttribute('aria-label', 'Saved ' + nm + ' to wishlist');
      }
    });

    saveBtns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();        // never follow the card link
        e.stopPropagation();
        var on = btn.getAttribute('aria-pressed') === 'true';
        var next = !on;
        btn.setAttribute('aria-pressed', next ? 'true' : 'false');
        // restart the savePop micro-interaction via reflow
        btn.classList.remove('is-pop'); void btn.offsetWidth; btn.classList.add('is-pop');

        var name = productName(btn);
        btn.setAttribute('aria-label', (next ? 'Saved ' : 'Save ') + name + ' to wishlist');

        // persist to the shared garage array
        var id = btn.getAttribute('data-id');
        if (id) {
          saved = readSaved();
          var i = saved.indexOf(id);
          if (next && i === -1) saved.push(id);
          else if (!next && i !== -1) saved.splice(i, 1);
          writeSaved(saved);
        }
        if (live) live.textContent = next ? (name + ' saved to wishlist.') : (name + ' removed from wishlist.');
      });
    });
  }

  /* ---------- product catalog (drives search; cart reads from the page) ---------- */
  var CATALOG = [
    {id:'night-run-dashcam-2k',name:'Night-Run Dashcam 2K',price:89,cat:'Charged & Connected',blurb:'Sharp 2K, day or night'},
    {id:'maglock-vent-mount',name:'MagLock Vent Mount',price:24,cat:'Charged & Connected',blurb:'One-hand magnetic hold'},
    {id:'fold-flat-trunk-caddy',name:'Fold-Flat Trunk Caddy',price:38,cat:'Tame the Mess',blurb:'Tames the trunk, folds flat'},
    {id:'surge-65w-dual-charger',name:'Surge 65W Dual Charger',price:32,cat:'Charged & Connected',blurb:'Two ports, full speed'},
    {id:'seat-gap-filler-2-pack',name:'Seat-Gap Filler (2-pack)',price:19,cat:'Tame the Mess',blurb:'No more lost phones'},
    {id:'cordless-cabin-vac',name:'Cordless Cabin Vac',price:54,cat:'Clean & Detail',blurb:'Cordless cabin clean-up'},
    {id:'leak-proof-trash-caddy',name:'Leak-Proof Trash Caddy',price:22,cat:'Tame the Mess',blurb:'Keeps cabin trash contained'},
    {id:'no-slip-dash-pad',name:'No-Slip Dash Pad',price:14,cat:'Tame the Mess',blurb:'Nothing slides off the dash'},
    {id:'headrest-hook-set',name:'Headrest Hook Set',price:12,cat:'Tame the Mess',blurb:'Hang bags off the seats'},
    {id:'tire-pressure-pen',name:'Tire Pressure Pen',price:16,cat:'Road-Trip Ready',blurb:'Check all four in seconds'}
  ];
  window.SLIPSTREAM_CATALOG = CATALOG;
  function money(n){ return '$' + (Math.round(n * 100) / 100).toString().replace(/\.0+$/, ''); }
  function parsePrice(t){ var m = (t || '').replace(/[^0-9.]/g, ''); return parseFloat(m) || 0; }
  function slug(s){ return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

  /* ---------- shared overlay helpers (nav drawer + cart + search) ----------
     One source of truth for inert + focus-trap so two dialogs can never leave
     the page permanently inert or stacked. inert is recomputed from which
     overlays are actually open, not toggled blindly. */
  function syncInert(){
    var open = $$('.drawer.open, .cart-drawer.open, .search-overlay.open');
    [].slice.call(document.body.children).forEach(function (el){
      el.inert = open.length > 0 && open.indexOf(el) === -1;
    });
    // Single source of truth for body scroll-lock: locked whenever ANY overlay
    // (nav drawer, cart, or search) is open, restored when all are closed. This
    // keeps the three overlays consistent and prevents an overflow:hidden leak
    // when one overlay closes another via closeOverlays().
    document.body.style.overflow = open.length > 0 ? 'hidden' : '';
  }
  function closeOverlays(except){
    $$('.drawer.open, .cart-drawer.open, .search-overlay.open').forEach(function (o){
      if (o === except) return;
      o.classList.remove('open'); o.setAttribute('aria-hidden', 'true');
      if (o.id === 'mobile-drawer') { var t = $('[data-drawer-toggle]'); if (t) t.setAttribute('aria-expanded', 'false'); }
    });
  }
  function focusables(el){
    return $$('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])', el)
      .filter(function (n){ return n.offsetWidth || n.offsetHeight || n === document.activeElement; });
  }
  function trapTab(container, e){
    if (e.key !== 'Tab' || !container) return;
    var f = focusables(container); if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- working cart drawer ---------- */
  function setupCart() {
    var CKEY = 'slipstream:cart';
    var cartBtn = $('[data-cart-btn]'), dot = $('.cart-dot'), live = $('[data-cart-live]');
    function read(){ try { var r = JSON.parse(window.localStorage.getItem(CKEY)); return Array.isArray(r) ? r : []; } catch (e) { return []; } }
    function write(c){ try { window.localStorage.setItem(CKEY, JSON.stringify(c)); } catch (e) {} }
    var cart = read();

    var d = document.createElement('div');
    d.className = 'cart-drawer'; d.setAttribute('data-cart-drawer', ''); d.setAttribute('aria-hidden', 'true');
    d.innerHTML =
      '<div class="cart-scrim" data-cart-close></div>' +
      '<aside class="cart-panel" role="dialog" aria-modal="true" aria-label="Your cart">' +
        '<div class="cart-head"><h2>Your cart</h2>' +
          '<button class="cart-x" type="button" data-cart-close aria-label="Close cart"><svg viewBox="0 0 24 24" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button></div>' +
        '<div class="cart-body"><ul class="cart-items" data-cart-items></ul>' +
          '<p class="cart-empty" data-cart-empty>Your cart is empty. <a href="collection.html" data-cart-close>Shop all gear</a>.</p></div>' +
        '<div class="cart-foot"><div class="cart-sub"><span>Subtotal</span><span data-cart-subtotal>$0</span></div>' +
          '<p class="cart-ship" data-cart-ship></p>' +
          '<button class="btn btn-amber cart-checkout" type="button" data-cart-checkout>Checkout</button>' +
          '<a class="cart-viewcart" href="cart.html" data-cart-close>View full cart</a>' +
          '<p class="cart-note" data-cart-note hidden>Checkout is not wired in this preview.</p></div></aside>';
    document.body.appendChild(d);

    var itemsEl = $('[data-cart-items]', d), emptyEl = $('[data-cart-empty]', d),
        subEl = $('[data-cart-subtotal]', d), shipEl = $('[data-cart-ship]', d), noteEl = $('[data-cart-note]', d);
    var lastFocus = null;

    function count(){ return cart.reduce(function (s, i){ return s + i.qty; }, 0); }
    function subtotal(){ return cart.reduce(function (s, i){ return s + i.price * i.qty; }, 0); }

    function renderBadge(){
      var n = count();
      if (dot) { dot.textContent = String(n); dot.hidden = n === 0;
        if (n > 0) { dot.classList.remove('bump'); void dot.offsetWidth; dot.classList.add('bump'); } }
      if (cartBtn) cartBtn.setAttribute('aria-label', n === 0 ? 'Cart, empty' : ('Cart, ' + n + ' item' + (n === 1 ? '' : 's')));
    }
    function renderDrawer(){
      itemsEl.innerHTML = cart.map(function (i){
        return '<li class="cart-item" data-id="' + i.id + '">' +
          '<div class="ci-main"><span class="ci-name">' + i.name + '</span><span class="ci-price">' + money(i.price) + '</span></div>' +
          '<div class="ci-qty"><button type="button" class="ci-dec" aria-label="Decrease quantity">-</button>' +
          '<span class="ci-n">' + i.qty + '</span>' +
          '<button type="button" class="ci-inc" aria-label="Increase quantity">+</button>' +
          '<button type="button" class="ci-rm" aria-label="Remove ' + i.name + '">Remove</button></div></li>';
      }).join('');
      var empty = cart.length === 0;
      emptyEl.hidden = !empty; itemsEl.hidden = empty;
      subEl.textContent = money(subtotal());
      var rem = 50 - subtotal();
      shipEl.textContent = rem > 0 ? ('Add ' + money(rem) + ' for free U.S. shipping.') : 'You have free U.S. shipping.';
    }
    function render(){ renderBadge(); renderDrawer(); }

    function open(){
      lastFocus = document.activeElement;
      closeOverlays(d);
      d.classList.add('open'); d.setAttribute('aria-hidden', 'false');
      syncInert();
      var x = $('[data-cart-close]', d); if (x) x.focus();
    }
    function close(){
      d.classList.remove('open'); d.setAttribute('aria-hidden', 'true');
      syncInert();
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function addItem(p, qty){
      qty = qty || 1;
      var ex = null, k;
      for (k = 0; k < cart.length; k++) { if (cart[k].id === p.id) { ex = cart[k]; break; } }
      if (ex) ex.qty += qty; else cart.push({ id: p.id, name: p.name, price: p.price, qty: qty });
      write(cart); render();
      if (live) live.textContent = 'Added ' + p.name + ' to cart. ' + count() + ' item' + (count() === 1 ? '' : 's') + ' in cart.';
    }
    function getProduct(el){
      var card = el.closest('.pcard');
      if (card) { var t = card.querySelector('.ttl'), p = card.querySelector('.price'), sv = card.matches('[data-id]') ? card : card.querySelector('[data-id]');
        var nm = t ? t.textContent.trim() : 'Item';
        return { id: (sv && sv.getAttribute('data-id')) || slug(nm), name: nm, price: p ? parsePrice(p.textContent) : 0 }; }
      var kit = el.closest('.bundle, .kit, [data-bundle]');
      if (kit) { var eb = kit.querySelector('.bundle-eyebrow'), bp = kit.querySelector('.bundle-price .price, .price');
        var knm = eb ? eb.textContent.trim() : 'Starter kit';
        return { id: slug(knm) || 'starter-kit', name: knm, price: bp ? parsePrice(bp.textContent) : 0 }; }
      var box = el.closest('.buybar, .buybox, .pdp-buybox, .product');
      if (box) { var h = box.querySelector('.bb-name, h1, .pdp-title, .ttl'), pp = box.querySelector('.bb-price, .price');
        var nm2 = h ? h.textContent.trim() : 'Item';
        return { id: slug(nm2) || 'item', name: nm2, price: pp ? parsePrice(pp.textContent) : 0 }; }
      return { id: 'item', name: 'Item', price: 0 };
    }

    document.addEventListener('click', function (e){
      var a = e.target.closest && e.target.closest('[data-add]'); if (!a) return;
      e.preventDefault();
      var qty = 1, bx = a.closest('.buybox, .pdp-buybox');
      if (bx && !a.closest('.bundle, .kit, [data-bundle]')) { var qi = bx.querySelector('[data-qty-input], .qty-stepper input, input[type="number"]'); if (qi) qty = Math.max(1, parseInt(qi.value, 10) || 1); }
      addItem(getProduct(a), qty);
      if (a.tagName === 'BUTTON') { var o = a.innerHTML; a.textContent = 'Added'; a.classList.add('added');
        setTimeout(function (){ a.innerHTML = o; a.classList.remove('added'); }, 900); }
      open();
    });
    if (cartBtn) cartBtn.addEventListener('click', function (e){ e.preventDefault(); open(); });
    d.addEventListener('click', function (e){
      if (e.target.closest('[data-cart-close]')) { close(); return; }
      if (e.target.closest('[data-cart-checkout]')) { if (noteEl) noteEl.hidden = false; return; }
      var li = e.target.closest('.cart-item'); if (!li) return;
      var id = li.getAttribute('data-id'), item = null, k;
      for (k = 0; k < cart.length; k++) { if (cart[k].id === id) { item = cart[k]; break; } }
      if (!item) return;
      if (e.target.closest('.ci-inc')) item.qty = Math.min(10, item.qty + 1); // cap at 10 to match PDP qty max
      else if (e.target.closest('.ci-dec')) { item.qty -= 1; if (item.qty <= 0) cart = cart.filter(function (x){ return x.id !== id; }); }
      else if (e.target.closest('.ci-rm')) cart = cart.filter(function (x){ return x.id !== id; });
      else return;
      write(cart); render();
    });
    document.addEventListener('keydown', function (e){
      if (!d.classList.contains('open')) return;
      if (e.key === 'Escape') { close(); return; }
      trapTab($('.cart-panel', d), e);
    });

    render();
  }

  /* ---------- working search overlay ---------- */
  /* category glyphs for the search result tiles (one per shop-by-problem bucket) */
  var CAT_ICON = {
    'Tame the Mess':'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 11h18M9 6v13"/>',
    'Clean & Detail':'<path d="M9 3h4l1 4H8z"/><path d="M10 7v3M12 10c-3 0-4 2-4 5v6h8v-6c0-3-1-5-4-5z"/>',
    'Charged & Connected':'<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
    'Road-Trip Ready':'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'
  };
  function catIcon(cat){
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (CAT_ICON[cat] || CAT_ICON['Tame the Mess']) + '</svg>';
  }
  window.SLIPSTREAM_CAT_ICON = catIcon;

  function setupSearch() {
    var btn = $('[aria-label="Search"]'); if (!btn) return;
    var o = document.createElement('div');
    o.className = 'search-overlay'; o.setAttribute('data-search-overlay', ''); o.setAttribute('aria-hidden', 'true');
    o.innerHTML =
      '<div class="search-scrim" data-search-close></div>' +
      '<div class="search-panel" role="dialog" aria-modal="true" aria-label="Search gear">' +
        '<div class="search-inner">' +
          '<form class="search-form" data-search-form role="search">' +
            '<svg class="search-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>' +
            '<input type="search" class="search-input" data-search-input placeholder="Search gear, e.g. dashcam or charger" aria-label="Search gear" autocomplete="off">' +
            '<button type="button" class="search-x" data-search-close aria-label="Close search"><svg viewBox="0 0 24 24" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>' +
          '</form>' +
          '<div class="search-chips" aria-label="Shop by problem">' +
            '<a class="s-chip" href="collection.html?cat=mess">Tame the Mess</a>' +
            '<a class="s-chip" href="collection.html?cat=clean">Clean &amp; Detail</a>' +
            '<a class="s-chip" href="collection.html?cat=charged">Charged &amp; Connected</a>' +
            '<a class="s-chip" href="collection.html?cat=road">Road-Trip Ready</a>' +
          '</div>' +
          '<div class="search-results" data-search-results role="status" aria-live="polite" aria-atomic="true"></div>' +
        '</div></div>';
    document.body.appendChild(o);
    var input = $('[data-search-input]', o), results = $('[data-search-results]', o);
    var lastFocus = null;

    function render(q){
      q = (q || '').trim().toLowerCase();
      var list = q ? CATALOG.filter(function (p){ return (p.name + ' ' + p.cat + ' ' + (p.blurb || '')).toLowerCase().indexOf(q) !== -1; }) : CATALOG.slice(0, 6);
      if (!list.length) {
        results.innerHTML = '<p class="search-none">No gear matches that. Try “dashcam”, “charger”, or “trunk”.</p>';
        return;
      }
      var label = q ? (list.length + ' result' + (list.length === 1 ? '' : 's')) : 'Popular right now';
      results.innerHTML = '<p class="search-lbl">' + label + '</p>' +
        list.map(function (p){
          return '<a class="search-row" href="product.html?id=' + p.id + '">' +
            '<span class="sr-ic">' + catIcon(p.cat) + '</span>' +
            '<span class="sr-text"><span class="sr-name">' + p.name + '</span>' +
            '<span class="sr-blurb">' + (p.blurb || p.cat) + '</span></span>' +
            '<span class="sr-price">' + money(p.price) + '</span></a>';
        }).join('');
    }
    function open(){ lastFocus = document.activeElement; closeOverlays(o); o.classList.add('open'); o.setAttribute('aria-hidden', 'false');
      syncInert(); render(''); setTimeout(function (){ input.focus(); }, 30); }
    function close(){ o.classList.remove('open'); o.setAttribute('aria-hidden', 'true'); input.value = '';
      syncInert(); if (lastFocus && lastFocus.focus) lastFocus.focus(); }

    btn.addEventListener('click', function (e){ e.preventDefault(); open(); });
    input.addEventListener('input', function (){ render(input.value); });
    $('[data-search-form]', o).addEventListener('submit', function (e){ e.preventDefault();
      var first = results.querySelector('.search-row');
      window.location.href = first ? first.getAttribute('href') : 'collection.html'; });
    o.addEventListener('click', function (e){ if (e.target.closest('[data-search-close]')) close(); });
    document.addEventListener('keydown', function (e){
      if (!o.classList.contains('open')) return;
      if (e.key === 'Escape') { close(); return; }
      trapTab($('.search-panel', o), e);
    });
  }

  function init() {
    setupReveal(); setupHeader(); setupMarquee(); setupDrawer();
    setupFaq(); setupBars(); setupSweep(); setupCountUp();
    setupForms(); setupCart(); setupSave(); setupSearch();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
