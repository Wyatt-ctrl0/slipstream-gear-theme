/* ============================================================
   SLIPSTREAM GEAR — product (PDP) page behavior
   Loads AFTER slipstream.js. Adds only PDP-scoped controls:
   quantity stepper, gallery thumbnail switch, save toggle, and
   the sticky mobile buy-bar (revealed once you scroll past the
   buy-box). Progressive enhancement; reduce-motion safe.
   ============================================================ */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (document.body.classList.contains('motion-off')) reduce = true;

  /* ---------- quantity stepper ---------- */
  function setupQty() {
    var box = $('[data-qty]'); if (!box) return;
    var input = $('[data-qty-input]', box);
    var dec = $('[data-qty-dec]', box), inc = $('[data-qty-inc]', box);
    var min = parseInt(input.getAttribute('min'), 10) || 1;
    var max = parseInt(input.getAttribute('max'), 10) || 99;
    function clamp(v) { v = parseInt(v, 10); if (isNaN(v)) v = min; return Math.max(min, Math.min(max, v)); }
    function sync() {
      var v = clamp(input.value); input.value = v;
      dec.disabled = v <= min; inc.disabled = v >= max;
    }
    function bump() { input.classList.remove('bump'); void input.offsetWidth; input.classList.add('bump'); }
    dec.addEventListener('click', function () { input.value = clamp(input.value) - 1; sync(); bump(); });
    inc.addEventListener('click', function () { input.value = clamp(input.value) + 1; sync(); bump(); });
    input.addEventListener('change', sync);
    sync();
  }

  /* ---------- gallery thumbnail switch ----------
     Swaps the main stage SVG to the picked thumb's artwork. The original
     hero SVG (rich #lensHero gradients) is cached on init so clicking the
     first/default thumb restores the full-fidelity render instead of the
     flat thumb icon. Other thumbs swap in their own art. The injected
     graphic is treated as decorative (aria-hidden) to keep the main stage
     consistently labeled across switches. */
  function setupGallery() {
    var main = $('[data-gallery-main]'); var thumbs = $$('.pdp-thumb');
    if (!main || !thumbs.length) return;
    var originalMain = main.innerHTML;   // cache the lush gradient hero once
    thumbs.forEach(function (t, idx) {
      t.addEventListener('click', function () {
        thumbs.forEach(function (o) {
          o.classList.remove('is-active'); o.setAttribute('aria-pressed', 'false');
        });
        t.classList.add('is-active'); t.setAttribute('aria-pressed', 'true');
        if (idx === 0) {
          // restore the original hero-quality artwork for the default view
          main.innerHTML = originalMain;
          var restored = main.querySelector('svg');
          if (restored) restored.classList.add('prod');
        } else {
          var svg = t.querySelector('svg');
          if (svg) {
            var clone = svg.cloneNode(true);
            clone.setAttribute('class', 'prod');
            // gallery art is decorative; keep it out of the a11y tree
            clone.setAttribute('aria-hidden', 'true');
            main.innerHTML = '';
            main.appendChild(clone);
          }
        }
      });
    });
  }

  /* save / wishlist toggle is handled centrally in slipstream.js
     (shared setupSave: persists to 'slipstream:saved', name-preserving
     aria-label, savePop micro-interaction). Not duplicated here. */

  /* ---------- sticky mobile buy-bar ----------
     Reveal once the buy-box scrolls out of view (past its ATC),
     same gated pattern as the homepage motion. */
  function setupStickyBuy() {
    var bar = $('[data-buybar]'), anchor = $('[data-buybox]');
    if (!bar || !anchor) return;
    // page tail clearance so the fixed bar never covers footer/bundle CTA
    document.body.classList.add('has-buybar');
    var barBtn = $('.btn', bar);
    function show(on) {
      bar.classList.toggle('show', on);
      bar.setAttribute('aria-hidden', on ? 'false' : 'true');
      // gate interactivity so the hidden bar is never a phantom tab stop
      if ('inert' in HTMLElement.prototype) { bar.inert = !on; }
      if (barBtn) { barBtn.tabIndex = on ? 0 : -1; barBtn.disabled = !on; }
    }
    show(false);
    if (!('IntersectionObserver' in window)) { return; }   // CSS keeps it hidden by default
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        // visible once the buy-box has scrolled up and out of view
        show(!e.isIntersecting && e.boundingClientRect.top < 0);
      });
    }, { threshold: 0 });
    io.observe(anchor);
  }

  /* ---------- render the requested product from ?id ----------
     product.html is authored as the Night-Run Dashcam 2K (the default, with its
     hand-built rich gallery). For any other SKU we swap the text + specs + a
     category illustration from PRODUCT_DATA so a card never opens the wrong
     product. Per-product PDPs are generated natively once ported to Shopify. */
  var DEFAULT_ID = 'night-run-dashcam-2k';
  var ART = {
    mount:'<svg viewBox="0 0 240 180" class="prod" role="img" aria-label="Phone vent mount"><g stroke="#23272c" stroke-width="6" stroke-linecap="round" opacity=".7"><line x1="150" y1="46" x2="206" y2="46"/><line x1="150" y1="66" x2="206" y2="66"/><line x1="150" y1="86" x2="206" y2="86"/></g><rect x="150" y="100" width="42" height="12" rx="6" fill="#2b3138"/><g transform="rotate(-8 96 96)"><rect x="58" y="38" width="76" height="120" rx="12" fill="#2b3138" stroke="#11141a" stroke-width="2"/><rect x="66" y="46" width="60" height="104" rx="7" fill="#0e1116"/><circle cx="96" cy="98" r="22" fill="none" stroke="#E11D2A" stroke-width="6" opacity=".9"/><circle cx="96" cy="98" r="10" fill="#E11D2A" opacity=".5"/></g></svg>',
    charger:'<svg viewBox="0 0 240 180" class="prod" role="img" aria-label="Dual USB-C car charger"><rect x="148" y="50" width="56" height="80" rx="12" fill="#23272c" stroke="#11141a" stroke-width="2"/><rect x="88" y="64" width="80" height="52" rx="15" fill="#2b3138" stroke="#11141a" stroke-width="2"/><rect x="48" y="60" width="50" height="60" rx="13" fill="#3a4047" stroke="#11141a" stroke-width="2"/><rect x="58" y="74" width="30" height="10" rx="5" fill="#0e1116"/><rect x="58" y="98" width="30" height="10" rx="5" fill="#0e1116"/><rect x="58" y="74" width="30" height="10" rx="5" fill="#E11D2A" opacity=".22"/><rect x="58" y="98" width="30" height="10" rx="5" fill="#E11D2A" opacity=".22"/><circle cx="128" cy="90" r="10" fill="none" stroke="#E11D2A" stroke-width="3"/><circle cx="128" cy="90" r="3.5" fill="#E11D2A"/></svg>',
    storage:'<svg viewBox="0 0 240 180" class="prod" role="img" aria-label="Folding trunk caddy"><path d="M40 60 H200 L185 150 H55 Z" fill="#2b3138" stroke="#11141a" stroke-width="2"/><path d="M40 60 H200 L191 78 H49 Z" fill="#14171a"/><line x1="96" y1="70" x2="92" y2="150" stroke="#14171a" stroke-width="5"/><line x1="148" y1="70" x2="152" y2="150" stroke="#14171a" stroke-width="5"/><path d="M40 78 q-18 7 -18 24" fill="none" stroke="#3a4047" stroke-width="7" stroke-linecap="round"/><path d="M200 78 q18 7 18 24" fill="none" stroke="#3a4047" stroke-width="7" stroke-linecap="round"/><rect x="40" y="55" width="160" height="8" rx="4" fill="#E11D2A"/></svg>',
    accessory:'<svg viewBox="0 0 240 180" class="prod" role="img" aria-label="Slipstream Gear product"><rect x="72" y="58" width="96" height="64" rx="16" fill="#2b3138" stroke="#11141a" stroke-width="2.5"/><rect x="86" y="74" width="68" height="32" rx="9" fill="#0e1116"/><circle cx="120" cy="90" r="13" fill="none" stroke="#E11D2A" stroke-width="4"/><circle cx="120" cy="90" r="4" fill="#E11D2A"/><rect x="96" y="118" width="48" height="10" rx="5" fill="#3a4047"/></svg>'
  };
  var PRODUCT_DATA = {
    'maglock-vent-mount':{name:'MagLock Vent Mount',price:24,cat:'Charged & Connected',art:'mount',lead:'A magnetic vent mount that grabs your phone one-handed and holds it dead still over rough roads. Clips to most vents in seconds.',tags:['N52 magnets','360° pivot','1-hand'],specs:[['Mount type','Air-vent clip'],['Magnets','6 x N52 neodymium'],['Rotation','360° ball joint'],['Fits','Most cases and plates']]},
    'surge-65w-dual-charger':{name:'Surge 65W Dual Charger',price:32,cat:'Charged & Connected',art:'charger',lead:'Sixty-five watts of GaN power across two USB-C ports, so a phone and a laptop both fast-charge from the 12V socket on the same drive.',tags:['65W PD','USB-C x2','GaN cool'],specs:[['Total output','65W USB-C PD'],['Ports','2 x USB-C'],['Tech','GaN, runs cool'],['Input','12V / 24V socket']]},
    'fold-flat-trunk-caddy':{name:'Fold-Flat Trunk Caddy',price:38,cat:'Tame the Mess',art:'storage',lead:'Three bays keep groceries, tools, and gear from sliding around the trunk, then it folds flat against the wall when you need the space back.',tags:['3 bays','Holds 40lb','Folds flat'],specs:[['Compartments','3 bays'],['Capacity','Up to 40 lb'],['Folds','Flat when not in use'],['Base','Non-slip grip']]},
    'seat-gap-filler-2-pack':{name:'Seat-Gap Filler (2-pack)',price:19,cat:'Tame the Mess',art:'accessory',lead:'Two soft fillers close the gap between seat and console so phones, keys, and coins stop disappearing on the highway.',tags:['2-pack','Universal','PU leather'],specs:[['Quantity','2 fillers'],['Fit','Universal, flexible'],['Material','PU leather'],['Install','Slide in, no tools']]},
    'cordless-cabin-vac':{name:'Cordless Cabin Vac',price:54,cat:'Clean & Detail',art:'accessory',lead:'A cordless vac sized for the cabin, with enough suction for floor mats and crevices and a washable filter so it keeps its bite.',tags:['Cordless','High suction','Washable filter'],specs:[['Power','Cordless rechargeable'],['Filter','Washable HEPA-style'],['Run time','About 25 min'],['Includes','Crevice + brush tools']]},
    'leak-proof-trash-caddy':{name:'Leak-Proof Trash Caddy',price:22,cat:'Tame the Mess',art:'storage',lead:'A lidded, leak-proof bin that keeps cabin trash contained and out of sight, then wipes clean in seconds.',tags:['Leak-proof','2.5L','Lidded'],specs:[['Capacity','2.5 liters'],['Liner','Leak-proof, wipeable'],['Lid','Spring-close'],['Mount','Strap or floor']]},
    'no-slip-dash-pad':{name:'No-Slip Dash Pad',price:14,cat:'Tame the Mess',art:'accessory',lead:'A grippy, heat-safe pad that keeps phones, sunglasses, and change from sliding off the dash through every turn.',tags:['Anti-slip','Heat-safe','Trim-to-fit'],specs:[['Grip','Anti-slip gel'],['Heat','Sun and heat safe'],['Size','Trim to fit'],['Residue','Leaves none']]},
    'headrest-hook-set':{name:'Headrest Hook Set',price:12,cat:'Tame the Mess',art:'accessory',lead:'A pair of headrest hooks that hang bags, groceries, and gear off the back seats instead of letting them tip over in the footwell.',tags:['2-pack','Holds 30lb','Tool-free'],specs:[['Quantity','2 hooks'],['Capacity','Up to 30 lb each'],['Install','Tool-free clip-on'],['Fit','Most headrest posts']]},
    'tire-pressure-pen':{name:'Tire Pressure Pen',price:16,cat:'Road-Trip Ready',art:'accessory',lead:'A pocket pressure gauge with a backlit readout, so you can check all four tires before a long drive without guessing.',tags:['0-60 PSI','Backlit','Pocket-size'],specs:[['Range','0 to 60 PSI'],['Display','Backlit digital'],['Accuracy','+/- 1 PSI'],['Battery','Replaceable cell']]}
  };
  function setText(sel, txt){ var el = $(sel); if (el) el.textContent = txt; }
  function renderProduct(){
    var id; try { id = new URLSearchParams(location.search).get('id'); } catch (e) { id = null; }
    if (!id || id === DEFAULT_ID) return;          // dashcam page, as authored
    var p = PRODUCT_DATA[id]; if (!p) return;       // unknown id: leave the default
    document.title = p.name + ' · Slipstream Gear';
    setText('.breadcrumb [aria-current]', p.name);
    setText('.buybox .eyebrow-line', p.cat);
    setText('.buybox h1', p.name);
    setText('.pdp-price .price', '$' + p.price);
    setText('.pdp-lead', p.lead);
    setText('.bb-name', p.name);
    setText('.bb-price', '$' + p.price);
    var st = $('.spectags'); if (st) st.innerHTML = p.tags.map(function (t){ return '<span>' + t + '</span>'; }).join('');
    var tb = $('.spec-table tbody'); if (tb) tb.innerHTML = p.specs.map(function (r){ return '<tr><th scope="row">' + r[0] + '</th><td>' + r[1] + '</td></tr>'; }).join('');
    var main = $('[data-gallery-main]');
    if (main) { main.removeAttribute('data-readout'); main.innerHTML = ART[p.art] || ART.accessory; }
    var thumbs = $('.pdp-thumbs'); if (thumbs) thumbs.style.display = 'none';   // thumb views are dashcam-specific
  }

  /* ---------- image lightbox (click to enlarge) ----------
     Clicking the main stage opens a full-screen enlarged copy of the current
     SVG. Thumbnails (when shown) switch the enlarged view. Self-contained
     modal: scroll-lock, inert siblings, focus-trap, Escape/scrim/X to close. */
  function setupLightbox() {
    var main = $('[data-gallery-main]'); if (!main) return;
    var pageThumbsWrap = $('.pdp-thumbs');
    var hasThumbs = pageThumbsWrap && getComputedStyle(pageThumbsWrap).display !== 'none';
    var pageThumbs = $$('.pdp-thumb');

    var lb = document.createElement('div');
    lb.className = 'pdp-lightbox'; lb.setAttribute('aria-hidden', 'true');
    lb.innerHTML =
      '<div class="lb-scrim" data-lb-close></div>' +
      '<div class="lb-dialog" role="dialog" aria-modal="true" aria-label="Product image, enlarged">' +
        '<button class="lb-x" type="button" data-lb-close aria-label="Close enlarged image"><svg viewBox="0 0 24 24" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>' +
        '<div class="lb-stage" data-lb-stage></div>' +
        '<div class="lb-thumbs" data-lb-thumbs></div>' +
      '</div>';
    document.body.appendChild(lb);
    var stage = $('[data-lb-stage]', lb), thumbsWrap = $('[data-lb-thumbs]', lb), lastFocus = null;

    function renderStage() {
      var s = main.querySelector('svg');
      stage.innerHTML = s ? s.outerHTML : '';
      var ns = stage.querySelector('svg');
      if (ns) { ns.setAttribute('class', 'lb-img'); ns.setAttribute('role', 'img'); ns.setAttribute('aria-label', 'Product image'); }
    }

    if (hasThumbs && pageThumbs.length) {
      pageThumbs.forEach(function (t, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'lb-thumb' + (t.classList.contains('is-active') ? ' is-active' : '');
        b.setAttribute('aria-label', t.getAttribute('aria-label') || ('View ' + (i + 1)));
        b.innerHTML = t.innerHTML;
        b.addEventListener('click', function () {
          t.click();
          $$('.lb-thumb', lb).forEach(function (x) { x.classList.remove('is-active'); });
          b.classList.add('is-active');
          renderStage();
        });
        thumbsWrap.appendChild(b);
      });
    } else { thumbsWrap.style.display = 'none'; }

    function focusables() { return $$('button:not([disabled])', lb).filter(function (n) { return n.offsetWidth || n.offsetHeight; }); }
    function open() {
      lastFocus = document.activeElement; renderStage();
      lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false');
      [].slice.call(document.body.children).forEach(function (el) { if (el !== lb) el.inert = true; });
      document.body.style.overflow = 'hidden';
      var x = $('[data-lb-close]', lb); if (x) x.focus();
    }
    function close() {
      lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true');
      [].slice.call(document.body.children).forEach(function (el) { if (el !== lb) el.inert = false; });
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    // affordance: zoom cursor + a magnifier badge (sibling, so gallery swaps do not wipe it)
    main.classList.add('zoomable');
    main.setAttribute('role', 'button'); main.setAttribute('tabindex', '0'); main.setAttribute('aria-label', 'Enlarge product image');
    var gal = main.parentElement;
    if (gal && !$('.zoom-badge', gal)) {
      gal.insertAdjacentHTML('afterbegin', '<span class="zoom-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></span>');
    }
    main.addEventListener('click', open);
    main.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    lb.addEventListener('click', function (e) { if (e.target.closest('[data-lb-close]')) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab') {
        var f = focusables(); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  function init() { renderProduct(); setupQty(); setupGallery(); setupLightbox(); setupStickyBuy(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
