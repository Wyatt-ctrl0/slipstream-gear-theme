/* ============================================================
   SLIPSTREAM GEAR — full cart page behavior
   Full-page mirror of the slide-out drawer in slipstream.js.
   Shares the EXACT same localStorage key ('slipstream:cart') and
   item shape ({id,name,price,qty}), so the drawer and this page
   stay in lock-step: edit here, the header badge + drawer reflect it.

   Reuses page CSS classes from pages.css (.cart-layout, .cart-line,
   .cart-summary, .empty-state) and the PDP .qty-stepper markup.

   Progressive enhancement only. Must NEVER throw if storage is
   blocked (private mode, etc.) — falls back to in-memory state.
   ============================================================ */
(function () {
  'use strict';

  var CKEY = 'slipstream:cart';
  var QMAX = 10;            // per-line qty cap, matches PDP + drawer
  var FREE_SHIP = 50;       // free U.S. shipping threshold

  var $  = function (s, r) { return (r || document).querySelector(s); };

  var page = $('[data-cart-page]');
  if (!page) return;

  var layoutEl = $('[data-cart-layout]', page);
  var linesEl  = $('[data-cart-lines]', page);
  var emptyEl  = $('[data-cart-empty]', page);
  var countEl  = $('[data-cart-page-count]', page);
  var subEl    = $('[data-cart-subtotal]', page);
  var totalEl  = $('[data-cart-total]', page);
  var shipEl   = $('[data-cart-ship]', page);
  var noteEl   = $('[data-cart-note]', page);
  if (!linesEl || !layoutEl || !emptyEl) return;

  var live = $('[data-cart-live]');

  /* ---- safe storage wrapper (never throws) ---- */
  function read() {
    try { var r = JSON.parse(window.localStorage.getItem(CKEY)); return Array.isArray(r) ? r : []; }
    catch (e) { return []; }
  }
  function write(c) {
    try { window.localStorage.setItem(CKEY, JSON.stringify(c)); }
    catch (e) { /* storage blocked: stay in-memory only */ }
  }

  /* ---- formatting (identical to slipstream.js money()) ---- */
  function money(n) { return '$' + (Math.round(n * 100) / 100).toString().replace(/\.0+$/, ''); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var cart = read();

  function count()    { return cart.reduce(function (s, i) { return s + i.qty; }, 0); }
  function subtotal() { return cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0); }

  /* keep the header badge + drawer in sync after an edit on this page */
  function syncBadge() {
    var n = count();
    var dot = $('.cart-dot'), btn = $('[data-cart-btn]');
    if (dot) { dot.textContent = String(n); dot.hidden = n === 0; }
    if (btn) btn.setAttribute('aria-label', n === 0 ? 'Cart, empty'
      : ('Cart, ' + n + ' item' + (n === 1 ? '' : 's')));
  }

  function lineHTML(i) {
    var lineTotal = i.price * i.qty;
    return '<li class="cart-line" data-id="' + esc(i.id) + '">' +
      '<div class="cart-line-media" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M6 7h12l-1 12H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>' +
      '</div>' +
      '<div class="cart-line-info">' +
        '<p class="cart-line-name">' + esc(i.name) + '</p>' +
        '<p class="cart-line-meta">' + money(i.price) + ' each</p>' +
        '<div class="qty-stepper" data-qty>' +
          '<button type="button" aria-label="Decrease quantity of ' + esc(i.name) + '" data-line-dec' +
            (i.qty <= 1 ? ' disabled' : '') + '>&minus;</button>' +
          '<input type="number" value="' + i.qty + '" min="1" max="' + QMAX + '" inputmode="numeric" ' +
            'aria-label="Quantity of ' + esc(i.name) + '" data-line-input>' +
          '<button type="button" aria-label="Increase quantity of ' + esc(i.name) + '" data-line-inc' +
            (i.qty >= QMAX ? ' disabled' : '') + '>+</button>' +
        '</div>' +
      '</div>' +
      '<div class="cart-line-end">' +
        '<span class="cart-line-price">' + money(lineTotal) + '</span>' +
        '<button type="button" class="cart-line-rm" data-line-rm aria-label="Remove ' + esc(i.name) + '">Remove</button>' +
      '</div>' +
    '</li>';
  }

  function render() {
    var empty = cart.length === 0;
    layoutEl.hidden = empty;
    emptyEl.hidden = !empty;

    var n = count();
    if (countEl) countEl.textContent = empty ? '' : (n + (n === 1 ? ' item' : ' items'));

    if (empty) { syncBadge(); return; }

    linesEl.innerHTML = cart.map(lineHTML).join('');

    var sub = subtotal();
    if (subEl)   subEl.textContent = money(sub);
    if (totalEl) totalEl.textContent = money(sub);
    if (shipEl) {
      var rem = FREE_SHIP - sub;
      shipEl.textContent = rem > 0
        ? ('Add ' + money(rem) + ' for free U.S. shipping.')
        : 'You have free U.S. shipping.';
    }
    syncBadge();
  }

  function find(id) {
    for (var k = 0; k < cart.length; k++) { if (cart[k].id === id) return cart[k]; }
    return null;
  }
  function removeId(id) { cart = cart.filter(function (x) { return x.id !== id; }); }

  function setQty(id, qty, name) {
    qty = Math.max(0, Math.min(QMAX, qty | 0));
    if (qty <= 0) {
      removeId(id);
      if (live && name) live.textContent = name + ' removed from cart.';
    } else {
      var item = find(id); if (!item) return;
      item.qty = qty;
    }
    write(cart); render();
  }

  /* ---- delegated controls ---- */
  linesEl.addEventListener('click', function (e) {
    var li = e.target.closest('.cart-line'); if (!li) return;
    var id = li.getAttribute('data-id'), item = find(id);
    if (!item) return;

    if (e.target.closest('[data-line-inc]')) { setQty(id, item.qty + 1, item.name); }
    else if (e.target.closest('[data-line-dec]')) { setQty(id, item.qty - 1, item.name); }
    else if (e.target.closest('[data-line-rm]')) {
      removeId(id); write(cart);
      if (live) live.textContent = item.name + ' removed from cart.';
      render();
    }
  });

  /* typed-in quantity: clamp on change, drop the line if cleared to 0 */
  linesEl.addEventListener('change', function (e) {
    var input = e.target.closest('[data-line-input]'); if (!input) return;
    var li = input.closest('.cart-line'); if (!li) return;
    var id = li.getAttribute('data-id'), item = find(id); if (!item) return;
    var v = parseInt(input.value, 10);
    if (isNaN(v)) v = item.qty;          // ignore non-numeric; keep current
    setQty(id, v, item.name);
  });

  /* demo checkout: reveal the not-wired note, no navigation */
  var checkoutBtn = $('[data-cart-checkout]', page);
  if (checkoutBtn) checkoutBtn.addEventListener('click', function () {
    if (noteEl) noteEl.hidden = false;
    if (live) live.textContent = 'Checkout is not wired in this preview.';
  });

  /* reflect cart edits made in another tab (drawer/page share the key) */
  window.addEventListener('storage', function (e) {
    if (e.key === CKEY) { cart = read(); render(); }
  });

  render();
})();
