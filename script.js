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
  var menuClosing = false;
  var closeTimer = null;
  function finishClose() {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    if (!menu || menu.hidden) { menuClosing = false; return; }
    menu.hidden = true;
    menu.classList.remove('is-closing');
    var p = menu.querySelector('.mobile-menu-panel');
    if (p) p.removeAttribute('aria-hidden');
    document.body.classList.remove('menu-open');
    menuClosing = false;
  }
  function openMenu() {
    if (!menu) return;
    if (menuClosing) finishClose();
    menu.classList.remove('is-closing');
    menu.hidden = false;
    document.body.classList.add('menu-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Закрыть меню');
    setBgInert(true);
    (closeBtn || menu).focus();
  }
  function closeMenu(returnFocus) {
    if (!menu || menu.hidden || menuClosing) return;
    var panel = menu.querySelector('.mobile-menu-panel');
    /* START — synchronously hand control back to the page + return focus */
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    if (panel) panel.setAttribute('aria-hidden', 'true');
    setBgInert(false);
    if (returnFocus !== false && burger) burger.focus();
    if (prefersReduce() || !panel) { finishClose(); return; }
    /* DEFERRED — play exit animation, then hide */
    menuClosing = true;
    menu.classList.add('is-closing');
    var done = function (e) {
      if (e && (e.target !== panel || e.animationName !== 'dropOut')) return;
      panel.removeEventListener('animationend', done);
      finishClose();
    };
    panel.addEventListener('animationend', done);
    closeTimer = setTimeout(finishClose, 420);
  }
  if (burger) burger.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', function () { closeMenu(true); });
  if (menu) {
    menu.addEventListener('click', function (e) { if (e.target === menu) closeMenu(true); });
    menu.addEventListener('keydown', function (e) {
      if (menuClosing) { if (e.key === 'Escape' || e.key === 'Tab') e.preventDefault(); return; }
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
    if (!ev.matches || !menu || menu.hidden) return;
    /* resize to desktop: tear down immediately, no exit animation/flash */
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    var panel = menu.querySelector('.mobile-menu-panel');
    if (panel) panel.setAttribute('aria-hidden', 'true');
    setBgInert(false);
    finishClose();
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
      var paused = tPause.getAttribute('aria-pressed') !== 'true';
      tPause.setAttribute('aria-pressed', String(paused));
      tMarquee.classList.toggle('is-paused', paused);
    });
  }

  /* ============ floating chat (demo) ============ */
  var chat = document.querySelector('.chat-fab');
  if (chat) chat.addEventListener('click', function () { /* demo: would open chat widget */ });

  /* ============ easter egg (console only — невидимо для AT) ============ */
  try {
    console.log('%c Alt Tab ⇥ ', 'font:700 26px/1.5 system-ui;color:#fff;background:#2563eb;padding:6px 14px;border-radius:8px;');
    console.log('%cОй, кто-то залез в консоль 👀  Иди на хуй... да шучу 😄\nРаз ты тут копаешься — ты точно из наших. Нам такие нужны.\nПроект или резюме → hello@alttab.studio', 'font:500 13px/1.7 system-ui;color:#9aa0aa;');
  } catch (e) {}

  /* ============ i18n: language switcher with 9 locales ============ */
  var TR = {
    ru: { title:'Alt Tab — студия создания сайтов под ключ', langLabel:'Язык', navHome:'Главная', navWorks:'Работы', navPricing:'Тарифы', cta:'Оставить заявку',
          hero:['Делаем ','охуенные',' сайты под ключ'], heroSub:'Без шаблонов, воды и сорванных сроков. Дизайн, код и запуск за 2–4 недели.',
          designTitle:'Дизайн под ваш бренд, а не шаблон', worksTitle:'Примеры наших работ', processTitle:'Запустим ваш проект под ключ',
          reviewsTitle:'Отзывы клиентов', pricingTitle:'Прозрачные тарифы', finalTitle:'Обсудим ваш проект', payTitle:'Принимаем к оплате' },
    en: { title:'Alt Tab — turn-key website studio', langLabel:'Language', navHome:'Home', navWorks:'Work', navPricing:'Pricing', cta:'Get a quote',
          hero:['We build ','kickass',' websites — turn-key'], heroSub:'No templates, no fluff, no missed deadlines. Design, code, launch in 2–4 weeks.',
          designTitle:'Custom design for your brand, not a template', worksTitle:'Selected work', processTitle:'Your project, end-to-end',
          reviewsTitle:'Client reviews', pricingTitle:'Transparent pricing', finalTitle:'Let’s discuss your project', payTitle:'We accept' },
    de: { title:'Alt Tab — Website-Studio aus einer Hand', langLabel:'Sprache', navHome:'Start', navWorks:'Arbeiten', navPricing:'Preise', cta:'Anfrage senden',
          hero:['Wir bauen ','geile',' Websites — aus einer Hand'], heroSub:'Keine Templates, kein Geschwafel, keine geplatzten Deadlines. Design, Code, Launch in 2–4 Wochen.',
          designTitle:'Design für Ihre Marke, keine Vorlage', worksTitle:'Ausgewählte Arbeiten', processTitle:'Ihr Projekt — von A bis Z',
          reviewsTitle:'Kundenstimmen', pricingTitle:'Transparente Preise', finalTitle:'Lass uns über dein Projekt sprechen', payTitle:'Wir akzeptieren' },
    fr: { title:'Alt Tab — studio de sites clé en main', langLabel:'Langue', navHome:'Accueil', navWorks:'Projets', navPricing:'Tarifs', cta:'Demander un devis',
          hero:['On fait des sites ','de ouf',', clé en main'], heroSub:'Sans templates, sans blabla, sans dépassement. Design, code, mise en ligne en 2–4 semaines.',
          designTitle:'Un design pour votre marque, pas un template', worksTitle:'Nos projets', processTitle:'Votre projet, de A à Z',
          reviewsTitle:'Avis clients', pricingTitle:'Tarifs transparents', finalTitle:'Parlons de votre projet', payTitle:'Nous acceptons' },
    es: { title:'Alt Tab — estudio de sitios llave en mano', langLabel:'Idioma', navHome:'Inicio', navWorks:'Trabajos', navPricing:'Precios', cta:'Pedir presupuesto',
          hero:['Hacemos sitios ','de puta madre',' llave en mano'], heroSub:'Sin plantillas, sin paja, sin plazos rotos. Diseño, código y lanzamiento en 2–4 semanas.',
          designTitle:'Diseño para tu marca, no una plantilla', worksTitle:'Trabajos seleccionados', processTitle:'Tu proyecto, de principio a fin',
          reviewsTitle:'Opiniones de clientes', pricingTitle:'Precios transparentes', finalTitle:'Hablemos de tu proyecto', payTitle:'Aceptamos' },
    it: { title:'Alt Tab — studio di siti chiavi in mano', langLabel:'Lingua', navHome:'Home', navWorks:'Lavori', navPricing:'Prezzi', cta:'Richiedi preventivo',
          hero:['Facciamo siti ','una figata',' chiavi in mano'], heroSub:'Niente template, niente fuffa, niente scadenze saltate. Design, codice e lancio in 2–4 settimane.',
          designTitle:'Design su misura per il tuo brand, non un template', worksTitle:'Lavori selezionati', processTitle:'Il tuo progetto, dall’idea al lancio',
          reviewsTitle:'Recensioni dei clienti', pricingTitle:'Prezzi trasparenti', finalTitle:'Parliamo del tuo progetto', payTitle:'Accettiamo' },
    pl: { title:'Alt Tab — studio stron pod klucz', langLabel:'Język', navHome:'Start', navWorks:'Realizacje', navPricing:'Cennik', cta:'Wyceń projekt',
          hero:['Robimy ','zajebiste',' strony pod klucz'], heroSub:'Bez szablonów, bez lania wody, bez przesuwanych terminów. Projekt, kod i start w 2–4 tygodnie.',
          designTitle:'Design pod twoją markę, nie szablon', worksTitle:'Wybrane realizacje', processTitle:'Twój projekt — od pomysłu do startu',
          reviewsTitle:'Opinie klientów', pricingTitle:'Przejrzysty cennik', finalTitle:'Pogadajmy o projekcie', payTitle:'Akceptujemy' },
    ro: { title:'Alt Tab — studio de site-uri la cheie', langLabel:'Limbă', navHome:'Acasă', navWorks:'Proiecte', navPricing:'Tarife', cta:'Cere ofertă',
          hero:['Facem site-uri ','beton',' la cheie'], heroSub:'Fără șabloane, fără vorbe goale, fără termene ratate. Design, cod și lansare în 2–4 săptămâni.',
          designTitle:'Design pentru brandul tău, nu un șablon', worksTitle:'Proiecte selectate', processTitle:'Proiectul tău, de la cap la coadă',
          reviewsTitle:'Părerile clienților', pricingTitle:'Tarife transparente', finalTitle:'Hai să discutăm proiectul tău', payTitle:'Acceptăm' },
    pt: { title:'Alt Tab — estúdio de sites chave na mão', langLabel:'Idioma', navHome:'Início', navWorks:'Projetos', navPricing:'Preços', cta:'Pedir orçamento',
          hero:['Fazemos sites ','foda',' chave na mão'], heroSub:'Sem templates, sem enrolação, sem prazos furados. Design, código e lançamento em 2–4 semanas.',
          designTitle:'Design para sua marca, não um template', worksTitle:'Projetos selecionados', processTitle:'Seu projeto, do início ao fim',
          reviewsTitle:'Avaliações de clientes', pricingTitle:'Preços transparentes', finalTitle:'Vamos conversar sobre seu projeto', payTitle:'Aceitamos' }
  };
  var LOCALES = ['ru','en','de','fr','es','it','pl','ro','pt'];
  function applyLocale(loc) {
    if (!TR[loc]) loc = 'ru';
    var t = TR[loc];
    document.documentElement.lang = loc;
    document.title = t.title;
    var md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute('content', t.heroSub);
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (t[key] != null) el.textContent = t[key];
    });
    var hero = document.querySelector('[data-i18n-html="hero"]');
    if (hero && t.hero) {
      hero.textContent = '';
      hero.appendChild(document.createTextNode(t.hero[0]));
      var m = document.createElement('span'); m.className = 'mark'; m.textContent = t.hero[1];
      hero.appendChild(m);
      hero.appendChild(document.createTextNode(t.hero[2]));
    }
    try { localStorage.setItem('locale', loc); } catch (e) {}
    var sel = document.getElementById('lang-select'); if (sel) sel.value = loc;
  }
  var initLoc = 'ru';
  try { var s = localStorage.getItem('locale'); if (s && LOCALES.indexOf(s) > -1) initLoc = s; } catch (e) {}
  applyLocale(initLoc);
  var langSel = document.getElementById('lang-select');
  if (langSel) langSel.addEventListener('change', function () { applyLocale(langSel.value); });
})();
