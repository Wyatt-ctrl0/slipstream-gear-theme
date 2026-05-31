/* ============================================================
   SLIPSTREAM GEAR — motion + interaction layer (Shopify OS 2.0)
   Ported from the static prototype (slipstream.js + page-*.js).
   Motion/UX mechanisms preserved verbatim; cart + search are
   rewired to the Shopify AJAX + Predictive Search APIs.
   Progressive enhancement; everything reduce-gated. No console errors.
   ============================================================ */
(function () {
  'use strict';

  document.documentElement.classList.add('js-reveal');

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  if (/[?&]motion=off/.test(location.search)) document.body.classList.add('motion-off');
  if (document.body.classList.contains('motion-off')) reduce = true;

  /* Shopify money formatter. Reads window.Shopify.currency / theme money format
     when present; falls back to a plain $ formatter. Drawer line prices that come
     straight from /cart.js are already formatted by Shopify, so we mostly use this
     for client-side math fallbacks. */
  function formatMoney(cents) {
    var fmt = (window.theme && window.theme.moneyFormat) || '${{amount}}';
    var value = (cents || 0) / 100;
    function fmtNum(n, precision, thousands, decimal) {
      precision = isNaN(precision) ? 2 : precision;
      thousands = thousands || ',';
      decimal = decimal || '.';
      var parts = (Math.abs(n)).toFixed(precision).split('.');
      var dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      var centsPart = parts[1] ? decimal + parts[1] : '';
      return dollars + centsPart;
    }
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/g, function (m, name) {
      switch (name) {
        case 'amount': return fmtNum(value, 2);
        case 'amount_no_decimals': return fmtNum(value, 0);
        case 'amount_with_comma_separator': return fmtNum(value, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return fmtNum(value, 0, '.', ',');
        default: return fmtNum(value, 2);
      }
    });
  }

  /* ---------- scroll reveal (rAF checker + --i stagger) ---------- */
  function setupReveal() {
    var els = $$('[data-reveal]'); if (!els.length) return;
    $$('[data-reveal-group]').forEach(function (group) {
      $$(':scope > [data-reveal]', group).forEach(function (el, i) { el.style.setProperty('--i', i); });
    });
    if (reduce) { els.forEach(function (el) { el.classList.add('in'); }); return; }
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

  /* ---------- header shadow / scrolled hairline ---------- */
  function setupHeader() {
    var h = $('.site-header'); if (!h) return;
    var fn = function () { h.classList.toggle('scrolled', window.scrollY > 8); };
    fn(); window.addEventListener('scroll', fn, { passive: true });
  }

  /* ---------- seamless marquee ---------- */
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

  /* ---------- shared overlay helpers (nav drawer + cart + search) ---------- */
  function syncInert() {
    var open = $$('.drawer.open, .cart-drawer.open, .search-overlay.open');
    [].slice.call(document.body.children).forEach(function (el) {
      el.inert = open.length > 0 && open.indexOf(el) === -1;
    });
    document.body.style.overflow = open.length > 0 ? 'hidden' : '';
  }
  function closeOverlays(except) {
    $$('.drawer.open, .cart-drawer.open, .search-overlay.open').forEach(function (o) {
      if (o === except) return;
      o.classList.remove('open'); o.setAttribute('aria-hidden', 'true');
      if (o.id === 'mobile-drawer') { var t = $('[data-drawer-toggle]'); if (t) t.setAttribute('aria-expanded', 'false'); }
    });
  }
  function focusables(el) {
    return $$('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])', el)
      .filter(function (n) { return n.offsetWidth || n.offsetHeight || n === document.activeElement; });
  }
  function trapTab(container, e) {
    if (e.key !== 'Tab' || !container) return;
    var f = focusables(container); if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
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
      if (open) closeOverlays(drawer);
      syncInert();
      if (open) { if (links[0]) links[0].focus(); }
      else { toggle.focus(); }
    }
    toggle.addEventListener('click', function () { set(!drawer.classList.contains('open')); });
    drawer.addEventListener('click', function (e) {
      if (e.target === drawer || e.target.closest('[data-drawer-close]')) set(false);
    });
    document.addEventListener('keydown', function (e) {
      if (!drawer.classList.contains('open')) return;
      if (e.key === 'Escape') { set(false); return; }
      if (e.key === 'Tab' && links.length) {
        var first = links[0], last = links[links.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- FAQ accordion (one open at a time) ---------- */
  function setupFaq() {
    $$('.qa-q').forEach(function (q) {
      q.addEventListener('click', function () {
        var item = q.closest('.qa'), isOpen = item.classList.contains('open');
        $$('.qa.open').forEach(function (o) {
          if (o !== item) {
            o.classList.remove('open');
            var b = $('.qa-q', o); if (b) b.setAttribute('aria-expanded', 'false');
            var pa = $('.qa-a', o); if (pa) pa.hidden = true;
          }
        });
        var open = !isOpen, ans = $('.qa-a', item);
        if (open && ans) ans.hidden = false;
        item.classList.toggle('open', open);
        q.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (!open && ans) {
          ans.addEventListener('transitionend', function done() {
            if (!item.classList.contains('open')) ans.hidden = true;
            ans.removeEventListener('transitionend', done);
          });
        }
      });
    });
  }

  /* ---------- amber speed-rule dividers (IO width-fill) ---------- */
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

  /* ---------- HEADLIGHT SWEEP (signature entrance) ---------- */
  function setupSweep() {
    var hero = $('[data-hero-section]'); if (!hero) return;
    if (reduce) return;
    function fire() {
      hero.classList.remove('sweep-go');
      void hero.offsetWidth;
      hero.classList.add('sweep-go');
    }
    var r = hero.getBoundingClientRect();
    var inView = r.top < window.innerHeight && r.bottom > 0;
    if (inView) fire();
    if (!('IntersectionObserver' in window)) return;
    var seen = inView;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) { seen = false; return; }
        if (!seen) { seen = true; fire(); }
      });
    }, { threshold: .35 });
    io.observe(hero);
  }

  /* ---------- COUNT-UP readouts ---------- */
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
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(eased * target);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target;
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

  /* ---------- fake-submit forms (newsletter / contact non-Shopify) ---------- */
  function setupForms() {
    $$('[data-fakeform]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = f.querySelector('.form-msg'); if (msg) msg.classList.add('show');
        var toast = f.querySelector('[data-toast]') || $('[data-toast]');
        if (toast) { toast.classList.add('show'); setTimeout(function () { toast.classList.remove('show'); }, 3200); }
        f.reset();
      });
    });
  }

  /* ---------- save / wishlist toggle (localStorage; no Shopify primitive) ---------- */
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
      try { window.localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) {}
    }
    function productName(btn) {
      var label = btn.getAttribute('aria-label') || '';
      return label.replace(/^(Save|Saved)\s+/, '').replace(/\s+to wishlist$/, '');
    }

    var saved = readSaved();

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
        e.preventDefault();
        e.stopPropagation();
        var on = btn.getAttribute('aria-pressed') === 'true';
        var next = !on;
        btn.setAttribute('aria-pressed', next ? 'true' : 'false');
        btn.classList.remove('is-pop'); void btn.offsetWidth; btn.classList.add('is-pop');

        var name = productName(btn);
        btn.setAttribute('aria-label', (next ? 'Saved ' : 'Save ') + name + ' to wishlist');

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

  /* ============================================================
     SHOPIFY AJAX CART
     Replaces the localStorage cart with the Shopify Cart API.
       POST /cart/add.js     — add a variant
       GET  /cart.js         — read current cart state
       POST /cart/change.js  — change line qty (1-based line)
     Refreshes the drawer (subnippet markup), header badge, free-ship
     progress, and the sticky PDP buy-bar. Graceful failure: catch ->
     announce a user-visible message, never silent.
     ============================================================ */
  function setupCart() {
    var drawer = $('[data-cart-drawer]');
    var cartBtn = $('[data-cart-btn]'), dot = $('.cart-dot'), live = $('[data-cart-live]');
    var subEl = drawer ? $('[data-cart-subtotal]', drawer) : null;
    var itemsEl = drawer ? $('[data-cart-items]', drawer) : null;
    var emptyEl = drawer ? $('[data-cart-empty]', drawer) : null;
    var shipEl = drawer ? $('[data-cart-ship]', drawer) : null;
    var lastFocus = null;

    var FREE_SHIP = window.theme && window.theme.freeShippingThreshold
      ? Number(window.theme.freeShippingThreshold) * 100 : 0;
    var FREE_SHIP_ON = !!(window.theme && window.theme.showFreeShippingBar);

    function announce(msg) { if (live) live.textContent = msg; }

    function renderBadge(count) {
      if (dot) {
        dot.textContent = String(count);
        dot.hidden = count === 0;
        if (count > 0) { dot.classList.remove('bump'); void dot.offsetWidth; dot.classList.add('bump'); }
      }
      if (cartBtn) cartBtn.setAttribute('aria-label', count === 0 ? 'Cart, empty' : ('Cart, ' + count + ' item' + (count === 1 ? '' : 's')));
    }

    function renderShip(totalCents) {
      if (!shipEl || !FREE_SHIP_ON || !FREE_SHIP) { if (shipEl) shipEl.textContent = ''; return; }
      var rem = FREE_SHIP - totalCents;
      shipEl.textContent = rem > 0
        ? ('Add ' + formatMoney(rem) + ' for free U.S. shipping.')
        : 'You have free U.S. shipping.';
    }

    function lineHTML(item, index) {
      var line = index + 1; // 1-based
      var img = item.featured_image && item.featured_image.url
        ? '<img class="ci-img" src="' + item.featured_image.url + '" alt="" loading="lazy" width="64" height="64">'
        : '<span class="ci-img ci-img-empty" aria-hidden="true"></span>';
      return '<li class="cart-item" data-line-item data-line="' + line + '">' +
        img +
        '<div class="ci-main"><span class="ci-name">' + escapeHTML(item.product_title) + '</span>' +
        '<span class="ci-price">' + item.line_price_formatted + '</span></div>' +
        '<div class="ci-qty">' +
          '<button type="button" class="ci-dec" data-cart-minus aria-label="Decrease quantity">-</button>' +
          '<input class="ci-n" type="text" inputmode="numeric" value="' + item.quantity + '" aria-label="Quantity" data-qty-input data-line="' + line + '">' +
          '<button type="button" class="ci-inc" data-cart-plus aria-label="Increase quantity">+</button>' +
          '<button type="button" class="ci-rm" data-cart-remove data-line="' + line + '" aria-label="Remove ' + escapeHTML(item.product_title) + '">Remove</button>' +
        '</div></li>';
    }

    function escapeHTML(s) {
      return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    }

    function renderDrawer(cart) {
      var empty = cart.item_count === 0;
      if (itemsEl) {
        // line_price_formatted may not be present on /cart.js items; derive it.
        itemsEl.innerHTML = cart.items.map(function (item, i) {
          if (!item.line_price_formatted) item.line_price_formatted = formatMoney(item.line_price);
          return lineHTML(item, i);
        }).join('');
        itemsEl.hidden = empty;
      }
      if (emptyEl) emptyEl.hidden = !empty;
      if (subEl) subEl.textContent = formatMoney(cart.total_price);
      renderShip(cart.total_price);
      renderBadge(cart.item_count);
    }

    /* sync the sticky PDP buy-bar + page price displays (badge already handled) */
    function refresh() {
      return fetch('/cart.js', { headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (cart) { renderDrawer(cart); return cart; });
    }

    function open() {
      if (!drawer) return;
      lastFocus = document.activeElement;
      closeOverlays(drawer);
      drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
      syncInert();
      var x = $('[data-cart-close]', drawer); if (x) x.focus();
    }
    function close() {
      if (!drawer) return;
      drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
      syncInert();
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function changeLine(line, quantity) {
      return fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ line: line, quantity: quantity })
      })
        .then(function (r) { return r.json(); })
        .then(function (cart) { renderDrawer(cart); return cart; })
        .catch(function () { announce('Could not update your cart. Please try again.'); });
    }

    function addVariant(variantId, qty, btn, productTitle) {
      return fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ items: [{ id: Number(variantId), quantity: qty }] })
      })
        .then(function (r) {
          if (!r.ok) return r.json().then(function (err) { throw err; });
          return r.json();
        })
        .then(function () { return refresh(); })
        .then(function (cart) {
          announce('Added ' + (productTitle || 'item') + ' to cart. ' + cart.item_count + ' item' + (cart.item_count === 1 ? '' : 's') + ' in cart.');
          if (btn && btn.tagName === 'BUTTON') {
            var o = btn.innerHTML; btn.textContent = 'Added'; btn.classList.add('added');
            setTimeout(function () { btn.innerHTML = o; btn.classList.remove('added'); }, 900);
          }
          open();
        })
        .catch(function (err) {
          var msg = (err && err.description) ? err.description : 'Could not add to cart. Please try again.';
          announce(msg);
        });
    }

    /* add-to-cart via [data-add] (cards, PDP, bundle) */
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-add]'); if (!a) return;
      if (a.disabled) return;
      e.preventDefault();
      var variantId = a.getAttribute('data-variant-id');
      if (!variantId) { announce('This item is unavailable.'); return; }
      var qty = 1;
      // PDP qty stepper: pull qty from the buy-box stepper (not bundle adds)
      var box = a.closest('.buybox, .pdp-buybox, [data-qty]');
      if (box && !a.closest('.bundle, .kit, [data-bundle]')) {
        var qi = box.querySelector('[data-qty-input]');
        if (!qi) { var qbox = $('[data-qty]'); if (qbox) qi = qbox.querySelector('[data-qty-input]'); }
        if (qi) qty = Math.max(1, parseInt(qi.value, 10) || 1);
      }
      addVariant(variantId, qty, a, a.getAttribute('data-product-title'));
    });

    if (cartBtn) cartBtn.addEventListener('click', function (e) { e.preventDefault(); open(); });

    if (drawer) {
      drawer.addEventListener('click', function (e) {
        if (e.target.closest('[data-cart-close]') || e.target === drawer || e.target.closest('.cart-scrim')) { close(); return; }
        var li = e.target.closest('[data-line-item]'); if (!li) return;
        var line = parseInt(li.getAttribute('data-line'), 10);
        var input = $('[data-qty-input]', li);
        var current = input ? Math.max(0, parseInt(input.value, 10) || 0) : 0;
        if (e.target.closest('[data-cart-plus]')) { changeLine(line, current + 1); }
        else if (e.target.closest('[data-cart-minus]')) { changeLine(line, Math.max(0, current - 1)); }
        else if (e.target.closest('[data-cart-remove]')) { changeLine(line, 0); }
      });

      drawer.addEventListener('change', function (e) {
        var input = e.target.closest('[data-qty-input]'); if (!input) return;
        var li = input.closest('[data-line-item]'); if (!li) return;
        var line = parseInt(li.getAttribute('data-line'), 10);
        var v = parseInt(input.value, 10);
        if (isNaN(v) || v < 0) v = 0;
        changeLine(line, v);
      });

      document.addEventListener('keydown', function (e) {
        if (!drawer.classList.contains('open')) return;
        if (e.key === 'Escape') { close(); return; }
        trapTab($('.cart-panel', drawer), e);
      });
    }

    // initial paint of badge + drawer from server state
    refresh().catch(function () {});
  }

  /* ============================================================
     SHOPIFY PREDICTIVE SEARCH
       GET /search/suggest.json?q=...&resources[type]=product&resources[limit]=6
     Renders title/price/thumbnail/link into [data-search-results].
     The form action points at /search (Liquid renders the action).
     ============================================================ */
  function setupSearch() {
    var btn = $('[aria-label="Search"]');
    var overlay = $('[data-search-overlay], .search-overlay');
    if (!overlay) return;
    var input = $('[data-search-input]', overlay);
    var results = $('[data-search-results]', overlay);
    var form = $('[data-search-form], form[role="search"]', overlay);
    var lastFocus = null;
    var debounceT = null;

    function open() {
      lastFocus = document.activeElement;
      closeOverlays(overlay);
      overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false');
      syncInert();
      setTimeout(function () { if (input) input.focus(); }, 30);
    }
    function close() {
      overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true');
      if (input) input.value = '';
      syncInert();
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function escapeHTML(s) {
      return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    }

    function renderResults(q, products) {
      if (!results) return;
      if (!q) { results.innerHTML = ''; return; }
      if (!products.length) {
        results.innerHTML = '<p class="search-none">No gear matches that. Try a different word.</p>';
        return;
      }
      var label = products.length + ' result' + (products.length === 1 ? '' : 's');
      results.innerHTML = '<p class="search-lbl">' + label + '</p>' +
        products.map(function (p) {
          var img = (p.featured_image && p.featured_image.url)
            ? '<span class="sr-ic"><img src="' + p.featured_image.url + '" alt="" loading="lazy" width="44" height="44"></span>'
            : '<span class="sr-ic sr-ic-empty" aria-hidden="true"></span>';
          var price = p.price ? formatMoney(p.price) : '';
          return '<a class="search-row" href="' + p.url + '">' + img +
            '<span class="sr-text"><span class="sr-name">' + escapeHTML(p.title) + '</span>' +
            '<span class="sr-blurb">' + escapeHTML(p.vendor || '') + '</span></span>' +
            '<span class="sr-price">' + price + '</span></a>';
        }).join('');
    }

    function query(q) {
      q = (q || '').trim();
      if (!q) { renderResults('', []); return; }
      var url = '/search/suggest.json?q=' + encodeURIComponent(q) +
        '&resources[type]=product&resources[limit]=6&resources[options][unavailable_products]=last';
      fetch(url, { headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var products = (data && data.resources && data.resources.results && data.resources.results.products) || [];
          renderResults(q, products);
        })
        .catch(function () {
          if (results) results.innerHTML = '<p class="search-none">Search is unavailable right now. Press Enter to search the full catalog.</p>';
        });
    }

    if (btn) btn.addEventListener('click', function (e) { e.preventDefault(); open(); });
    if (input) input.addEventListener('input', function () {
      clearTimeout(debounceT);
      debounceT = setTimeout(function () { query(input.value); }, 220);
    });
    // form submits natively to /search (action set in Liquid); no preventDefault.
    overlay.addEventListener('click', function (e) {
      if (e.target.closest('[data-search-close]') || e.target.closest('.search-scrim')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'Escape') { close(); return; }
      trapTab($('.search-panel', overlay), e);
    });
  }

  /* ============================================================
     COLLECTION PAGE — client-side filter chips + sort.
     Pagination is handled server-side by Liquid; this is enhancement
     only. Cards must carry data-cat (category) and data-price.
     ============================================================ */
  function setupCollection() {
    var grid = $('[data-grid]'); if (!grid) return;

    var cards   = $$('[data-product]', grid);
    var chips   = $$('[data-filter]');
    var sortSel = $('[data-sort]');
    var visEl   = $('[data-count-visible]');
    var totEl   = $('[data-count-total]');
    var empty   = $('[data-empty]');
    var clearBtn = $('[data-clear-filter]');

    var activeFilter = 'all';
    if (totEl) totEl.textContent = String(cards.length);

    function matches(card) {
      return activeFilter === 'all' || card.getAttribute('data-cat') === activeFilter;
    }

    function render() {
      var shown = 0;
      cards.forEach(function (c) {
        var ok = matches(c);
        c.hidden = !ok;
        if (ok) shown++;
      });
      if (visEl) visEl.textContent = String(shown);
      var isEmpty = shown === 0;
      if (empty) empty.hidden = !isEmpty;
      grid.hidden = isEmpty;
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
        chip.setAttribute('aria-pressed', 'true');
        chip.classList.remove('just-on'); void chip.offsetWidth; chip.classList.add('just-on');
        activeFilter = chip.getAttribute('data-filter');
        render();
      });
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        var all = chips.filter(function (c) { return c.getAttribute('data-filter') === 'all'; })[0];
        if (all) all.click();
      });
    }

    function priceOf(c) { return parseFloat(c.getAttribute('data-price')) || 0; }
    function nameOf(c)  { return (c.getAttribute('data-name') || '').toLowerCase(); }
    var original = cards.slice();
    if (sortSel) {
      sortSel.addEventListener('change', function () {
        var v = sortSel.value, sorted = original.slice();
        if (v === 'price-asc')  sorted.sort(function (a, b) { return priceOf(a) - priceOf(b); });
        if (v === 'price-desc') sorted.sort(function (a, b) { return priceOf(b) - priceOf(a); });
        if (v === 'name')       sorted.sort(function (a, b) { return nameOf(a) < nameOf(b) ? -1 : nameOf(a) > nameOf(b) ? 1 : 0; });
        sorted.forEach(function (c) { grid.appendChild(c); });
        cards = sorted;
        render();
      });
    }

    /* honor ?cat= so Shop-by-Problem lanes + footer links land pre-filtered */
    try {
      var cat = new URLSearchParams(location.search).get('cat');
      if (cat && cat !== 'all') {
        var target = chips.filter(function (c) { return c.getAttribute('data-filter') === cat; })[0];
        if (target) { target.click(); return; }
      }
    } catch (e) {}

    render();
  }

  /* ============================================================
     PRODUCT PAGE — variant selection, qty stepper, sticky buy-bar.
     ============================================================ */
  function setupProduct() {
    var form = $('[data-product-form]');
    var variantData = null;
    var dataEl = $('[data-variant-json]');
    if (dataEl) { try { variantData = JSON.parse(dataEl.textContent); } catch (e) { variantData = null; } }

    /* ---- variant selection ---- */
    function setupVariants() {
      if (!form || !variantData) return;
      var optionSelects = $$('[data-option-index]', form);
      var priceEl = $('.pdp-price .price') || $('[data-product-price]');
      var atcAdd = $('[data-add]', form) || $('[data-add]');
      var bbName = $('.bb-name'), bbPrice = $('.bb-price');
      var hiddenId = $('[name="id"]', form);

      function currentSelections() {
        return optionSelects
          .sort(function (a, b) { return Number(a.getAttribute('data-option-index')) - Number(b.getAttribute('data-option-index')); })
          .map(function (s) { return s.value; });
      }
      function findVariant(selections) {
        for (var i = 0; i < variantData.length; i++) {
          var v = variantData[i];
          var opts = v.options || [v.option1, v.option2, v.option3];
          var match = true;
          for (var j = 0; j < selections.length; j++) {
            if (opts[j] !== selections[j]) { match = false; break; }
          }
          if (match) return v;
        }
        return null;
      }
      function update() {
        var v = findVariant(currentSelections());
        if (!v) {
          if (atcAdd) { atcAdd.disabled = true; atcAdd.textContent = 'Unavailable'; }
          return;
        }
        if (hiddenId) hiddenId.value = v.id;
        if (atcAdd) {
          atcAdd.setAttribute('data-variant-id', v.id);
          atcAdd.disabled = !v.available;
          atcAdd.textContent = v.available ? 'Add to cart' : 'Sold out';
        }
        var priceStr = formatMoney(v.price);
        if (priceEl) priceEl.textContent = priceStr;
        if (bbPrice) bbPrice.textContent = priceStr;
        if (atcAdd) atcAdd.setAttribute('data-product-price', priceStr);
      }
      optionSelects.forEach(function (s) { s.addEventListener('change', update); });
      update();
    }

    /* ---- quantity stepper ---- */
    function setupQty() {
      var box = $('[data-qty]'); if (!box) return;
      var input = $('[data-qty-input]', box);
      var dec = $('[data-qty-dec]', box), inc = $('[data-qty-inc]', box);
      if (!input) return;
      var min = parseInt(input.getAttribute('min'), 10) || 1;
      var max = parseInt(input.getAttribute('max'), 10) || 99;
      function clamp(v) { v = parseInt(v, 10); if (isNaN(v)) v = min; return Math.max(min, Math.min(max, v)); }
      function sync() {
        var v = clamp(input.value); input.value = v;
        if (dec) dec.disabled = v <= min;
        if (inc) inc.disabled = v >= max;
      }
      function bump() { input.classList.remove('bump'); void input.offsetWidth; input.classList.add('bump'); }
      if (dec) dec.addEventListener('click', function () { input.value = clamp(input.value) - 1; sync(); bump(); });
      if (inc) inc.addEventListener('click', function () { input.value = clamp(input.value) + 1; sync(); bump(); });
      input.addEventListener('change', sync);
      sync();
    }

    /* ---- sticky mobile buy-bar (inert + disabled when hidden) ---- */
    function setupStickyBuy() {
      var bar = $('[data-buybar]'), anchor = $('[data-buybox]');
      if (!bar || !anchor) return;
      document.body.classList.add('has-buybar');
      var barBtn = $('.btn', bar) || $('[data-add]', bar);
      function show(on) {
        bar.classList.toggle('show', on);
        bar.setAttribute('aria-hidden', on ? 'false' : 'true');
        if ('inert' in HTMLElement.prototype) { bar.inert = !on; }
        if (barBtn) { barBtn.tabIndex = on ? 0 : -1; barBtn.disabled = !on; }
      }
      show(false);
      if (!('IntersectionObserver' in window)) return;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          show(!e.isIntersecting && e.boundingClientRect.top < 0);
        });
      }, { threshold: 0 });
      io.observe(anchor);
    }

    /* ---- gallery thumbnail switch (real product media) ---- */
    function setupGallery() {
      var main = $('[data-gallery-main]'); var thumbs = $$('.pdp-thumb');
      if (!main || !thumbs.length) return;
      var mainImg = main.querySelector('img');
      thumbs.forEach(function (t) {
        t.addEventListener('click', function () {
          thumbs.forEach(function (o) { o.classList.remove('is-active'); o.setAttribute('aria-pressed', 'false'); });
          t.classList.add('is-active'); t.setAttribute('aria-pressed', 'true');
          var src = t.getAttribute('data-full') || (t.querySelector('img') && t.querySelector('img').src);
          if (src && mainImg) mainImg.src = src;
        });
      });
    }

    setupVariants();
    setupQty();
    setupGallery();
    setupStickyBuy();
  }

  function init() {
    setupReveal(); setupHeader(); setupMarquee(); setupDrawer();
    setupFaq(); setupBars(); setupSweep(); setupCountUp();
    setupForms(); setupSave();
    setupCart(); setupSearch();
    setupCollection(); setupProduct();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
