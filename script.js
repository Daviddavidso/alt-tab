/* ============================================================
   Pop Site clone — interactions
   ============================================================ */
(function () {
  'use strict';

  var docEl = document.documentElement;
  docEl.classList.add('js');

  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var prefersReduce = function () { return reduceMQ.matches; };

  /* ============ smooth-scroll anchors + focus management ============ */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href').slice(1);
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      if (link.hasAttribute('data-close-menu')) closeMenu(false);
      target.scrollIntoView({ behavior: prefersReduce() ? 'auto' : 'smooth', block: 'start' });
      target.focus({ preventScroll: true });
      if (document.activeElement !== target &&
          !target.matches('a[href], button, input, select, textarea, [tabindex]')) {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    });
  });

  /* ============ mobile menu (modal overlay) ============ */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobile-menu');
  var closeBtn = document.getElementById('menu-close');
  var bgEls = [document.getElementById('main'), document.querySelector('.site-header'), document.querySelector('.site-footer')];

  function focusables(container) {
    return Array.prototype.slice.call(
      container.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return el.getClientRects().length > 0 && !el.closest('[hidden], [inert]'); });
  }
  function setBgInert(on) {
    bgEls.forEach(function (el) {
      if (!el) return;
      if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
      else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
    });
  }
  function openMenu() {
    if (!menu) return;
    menu.hidden = false;
    document.body.classList.add('menu-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Close menu');
    setBgInert(true);
    (closeBtn || menu).focus();
  }
  function closeMenu(returnFocus) {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    document.body.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
    setBgInert(false);
    if (returnFocus !== false && burger) burger.focus();
  }
  if (burger) burger.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', function () { closeMenu(true); });
  if (menu) {
    menu.addEventListener('click', function (e) { if (e.target === menu) closeMenu(true); });
    menu.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); return; }
      if (e.key !== 'Tab') return;
      var panel = menu.querySelector('.mobile-menu-panel');
      var f = focusables(panel || menu);
      if (!f.length) { e.preventDefault(); if (panel) panel.focus(); return; }
      var first = f[0], last = f[f.length - 1], active = document.activeElement;
      if (!(panel || menu).contains(active)) { e.preventDefault(); first.focus(); return; }
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    });
  }
  window.matchMedia('(min-width: 861px)').addEventListener('change', function (ev) {
    if (ev.matches) closeMenu(false);
  });

  /* ============ scrollspy → aria-current on nav links ============ */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-desktop a[href^="#"]'));
  var linkById = {};
  navLinks.forEach(function (l) { linkById[l.getAttribute('href').slice(1)] = l; });
  var watched = Object.keys(linkById).map(function (id) { return document.getElementById(id); }).filter(Boolean);
  if ('IntersectionObserver' in window && watched.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (l) { l.removeAttribute('aria-current'); });
        var active = linkById[entry.target.id];
        if (active) active.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    watched.forEach(function (sec) { spy.observe(sec); });
  }

  /* ============ reveal on scroll ============ */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (prefersReduce() || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); obs.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    reveals.forEach(function (el) { io.observe(el); });
    window.addEventListener('load', function () {
      setTimeout(function () {
        reveals.forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight) el.classList.add('is-in');
        });
      }, 400);
    });
  }

  /* ============ claim forms (demo) — validate non-empty, no backend ============ */
  document.querySelectorAll('form.claim').forEach(function (form) {
    var input = form.querySelector('input');
    if (input) {
      input.addEventListener('input', function () { input.removeAttribute('aria-invalid'); });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!input) return;
      if (!input.value.trim()) {
        input.setAttribute('aria-invalid', 'true');
        input.focus();
      } else {
        input.removeAttribute('aria-invalid');
        // demo build — no backend; a real submit would create the account
      }
    });
  });

  /* ============ services showcase: collapse / show all ============ */
  var scToggle = document.getElementById('showcase-toggle');
  var scGrid = document.getElementById('showcase-grid');
  if (scToggle && scGrid) {
    scToggle.addEventListener('click', function () {
      var collapsed = scGrid.classList.toggle('is-collapsed');
      scToggle.setAttribute('aria-expanded', String(!collapsed));
      scToggle.textContent = collapsed ? 'Показать все разделы' : 'Свернуть';
      if (!collapsed) {
        scGrid.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-in'); });
      }
    });
  }

  /* ============ testimonials marquee pause toggle ============ */
  var tPause = document.getElementById('t-pause');
  var tMarquee = document.querySelector('.t-marquee');
  if (tPause && tMarquee) {
    tPause.addEventListener('click', function () {
      var paused = tMarquee.classList.toggle('is-paused');
      var ico = tPause.querySelector('.t-ico');
      var lbl = tPause.querySelector('.t-lbl');
      if (ico) ico.textContent = paused ? '▶' : '⏸';
      if (lbl) lbl.textContent = paused ? ' Продолжить' : ' Пауза';
    });
  }

  /* ============ floating chat (demo) ============ */
  var chat = document.querySelector('.chat-fab');
  if (chat) chat.addEventListener('click', function () { /* demo: would open chat widget */ });
})();
