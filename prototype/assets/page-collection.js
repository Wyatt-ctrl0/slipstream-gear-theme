/* ============================================================
   SLIPSTREAM GEAR — collection page behavior (vanilla)
   Presentational only: filter chips, sort, save toggle, and a
   PAGED grid (8 per page with  <  1  2  >  pagination). No backend.
   Built on top of slipstream.js. Reduce-motion safe.
   ============================================================ */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  var grid = $('[data-grid]');
  if (!grid) return;

  var cards    = $$('[data-product]', grid);
  var chips    = $$('[data-filter]');
  var sortSel  = $('[data-sort]');
  var visEl    = $('[data-count-visible]');
  var totEl    = $('[data-count-total]');
  var empty    = $('[data-empty]');
  var pager    = $('[data-pager]');
  var clearBtn = $('[data-clear-filter]');

  var PER_PAGE = 8;
  var activeFilter = 'all';
  var currentPage = 1;

  if (totEl) totEl.textContent = String(cards.length);

  function matches(card) {
    return activeFilter === 'all' || card.getAttribute('data-cat') === activeFilter;
  }

  var CHEV_L = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  var CHEV_R = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

  /* build the  <  1  2  …  >  controls for the current filter */
  function renderPager(totalPages) {
    if (!pager) return;
    if (totalPages <= 1) { pager.hidden = true; pager.innerHTML = ''; return; }
    pager.hidden = false;
    var h = '<button class="pg-btn pg-prev" type="button" data-page="' + (currentPage - 1) +
      '" aria-label="Previous page"' + (currentPage === 1 ? ' disabled' : '') + '>' + CHEV_L + '</button>';
    for (var n = 1; n <= totalPages; n++) {
      h += '<button class="pg-btn pg-num' + (n === currentPage ? ' is-current' : '') +
        '" type="button" data-page="' + n + '"' + (n === currentPage ? ' aria-current="page"' : '') +
        ' aria-label="Page ' + n + '">' + n + '</button>';
    }
    h += '<button class="pg-btn pg-next" type="button" data-page="' + (currentPage + 1) +
      '" aria-label="Next page"' + (currentPage === totalPages ? ' disabled' : '') + '>' + CHEV_R + '</button>';
    pager.innerHTML = h;
  }

  function render() {
    var inFilter = cards.filter(matches);
    var totalPages = Math.max(1, Math.ceil(inFilter.length / PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    var start = (currentPage - 1) * PER_PAGE, end = start + PER_PAGE;

    // hide everything, then show only this page's slice of the filtered set
    cards.forEach(function (c) { c.hidden = true; });
    inFilter.forEach(function (c, i) { c.hidden = !(i >= start && i < end); });

    if (visEl) visEl.textContent = String(inFilter.length);
    var isEmpty = inFilter.length === 0;
    if (empty) empty.hidden = !isEmpty;
    grid.hidden = isEmpty;
    renderPager(totalPages);
  }

  /* ---- pagination clicks ---- */
  if (pager) {
    pager.addEventListener('click', function (e) {
      var b = e.target.closest('[data-page]'); if (!b || b.disabled) return;
      var n = parseInt(b.getAttribute('data-page'), 10); if (isNaN(n)) return;
      currentPage = n;
      render();
      // bring the top of the grid into view when the page changes
      var y = grid.getBoundingClientRect().top + window.pageYOffset - 90;
      try { window.scrollTo({ top: y, behavior: 'smooth' }); } catch (e2) { window.scrollTo(0, y); }
    });
  }

  /* ---- filter chips (single-select, aria-pressed) ---- */
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
      chip.setAttribute('aria-pressed', 'true');
      chip.classList.remove('just-on'); void chip.offsetWidth; chip.classList.add('just-on');
      activeFilter = chip.getAttribute('data-filter');
      currentPage = 1;            // reset to page 1 when the lane changes
      render();
    });
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      var all = chips.filter(function (c) { return c.getAttribute('data-filter') === 'all'; })[0];
      if (all) all.click();
    });
  }

  /* ---- sort (reorders cards in the DOM, keeps reveal/cart wiring) ---- */
  function priceOf(c) { return parseFloat(c.getAttribute('data-price')) || 0; }
  function nameOf(c)  { return (c.getAttribute('data-name') || '').toLowerCase(); }
  var original = cards.slice();   // featured = authored order
  if (sortSel) {
    sortSel.addEventListener('change', function () {
      var v = sortSel.value, sorted = original.slice();
      if (v === 'price-asc')  sorted.sort(function (a, b) { return priceOf(a) - priceOf(b); });
      if (v === 'price-desc') sorted.sort(function (a, b) { return priceOf(b) - priceOf(a); });
      if (v === 'name')       sorted.sort(function (a, b) { return nameOf(a) < nameOf(b) ? -1 : nameOf(a) > nameOf(b) ? 1 : 0; });
      sorted.forEach(function (c) { grid.appendChild(c); });
      cards = sorted;             // keep render() in DOM order
      currentPage = 1;
      render();
    });
  }

  /* save / wishlist heart toggle is handled centrally in slipstream.js. */

  /* honor ?cat= so Shop-by-Problem lanes + footer links land pre-filtered */
  try {
    var cat = new URLSearchParams(location.search).get('cat');
    if (cat && cat !== 'all') {
      var target = chips.filter(function (c) { return c.getAttribute('data-filter') === cat; })[0];
      if (target) {
        chips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
        target.setAttribute('aria-pressed', 'true');
        activeFilter = cat;
      }
    }
  } catch (e) {}

  render();
})();
