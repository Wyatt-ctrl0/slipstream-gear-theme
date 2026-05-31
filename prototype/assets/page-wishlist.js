/* ============================================================
   SLIPSTREAM GEAR — wishlist (the garage) behavior
   Renders the saved-id list (localStorage 'slipstream:saved')
   from the shared product catalog, so ANY saved SKU shows up
   (not just a few hard-coded cards). Cards use a category glyph
   since per-product SVGs are not in the JS catalog. Never throws
   if storage is blocked.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'slipstream:saved';
  var $ = function (s, r) { return (r || document).querySelector(s); };

  function readSaved() {
    try { var a = JSON.parse(window.localStorage.getItem(KEY)); return Array.isArray(a) ? a : null; }
    catch (e) { return null; }
  }
  function writeSaved(ids) {
    try { window.localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) {}
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  var root = $('[data-wishlist]'); if (!root) return;
  var grid = $('[data-wishlist-grid]', root);
  var empty = $('[data-wishlist-empty]', root);
  var countEl = $('[data-wishlist-count]', root);
  if (!grid) return;

  var CATALOG = window.SLIPSTREAM_CATALOG || [];
  var catIcon = window.SLIPSTREAM_CAT_ICON || function () { return ''; };
  var byId = {}; CATALOG.forEach(function (p) { byId[p.id] = p; });
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21C12 21 4 15.5 4 9.5A4.5 4.5 0 0 1 12 7A4.5 4.5 0 0 1 20 9.5C20 15.5 12 21 12 21Z"/></svg>';

  /* seed a demo garage on the first-ever visit so it is not empty */
  var saved = readSaved();
  if (saved === null) {
    saved = ['night-run-dashcam-2k', 'maglock-vent-mount', 'surge-65w-dual-charger'];
    writeSaved(saved);
  }

  function cardHTML(p) {
    return '<article class="pcard" data-saved-card data-id="' + p.id + '">' +
      '<a class="pcard-link" href="product.html?id=' + p.id + '" aria-label="' + esc(p.name) + '"></a>' +
      '<div class="pimg">' +
        '<button class="save-toggle save-corner" type="button" aria-pressed="true" aria-label="Remove ' + esc(p.name) + ' from your garage" data-wishlist-remove>' + HEART + '</button>' +
        '<span class="wl-glyph" aria-hidden="true">' + catIcon(p.cat) + '</span>' +
      '</div>' +
      '<div class="pbody"><h3 class="ttl">' + esc(p.name) + '</h3>' +
        '<div class="spectags"><span>' + esc(p.blurb || p.cat) + '</span></div>' +
        '<div class="prow"><span class="price">$' + p.price + '</span>' +
        '<button class="add" data-add aria-label="Add ' + esc(p.name) + ' to cart">Add</button></div>' +
      '</div></article>';
  }

  function render() {
    var items = saved.map(function (id) { return byId[id]; }).filter(Boolean);
    grid.innerHTML = items.map(cardHTML).join('');
    if (countEl) countEl.textContent = items.length + (items.length === 1 ? ' item saved' : ' items saved');
    var isEmpty = items.length === 0;
    grid.hidden = isEmpty;
    if (empty) empty.hidden = !isEmpty;
  }

  /* remove from garage */
  grid.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-wishlist-remove]');
    if (!btn) return;
    e.preventDefault();
    var card = btn.closest('[data-saved-card]'); if (!card) return;
    var id = card.getAttribute('data-id'), i = saved.indexOf(id);
    if (i !== -1) saved.splice(i, 1);
    writeSaved(saved);
    render();
  });

  render();
})();
