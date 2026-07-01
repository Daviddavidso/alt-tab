/* ============================================================
   Pop Site clone, interactions
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
    /* START, synchronously hand control back to the page + return focus */
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    if (panel) panel.setAttribute('aria-hidden', 'true');
    setBgInert(false);
    if (returnFocus !== false && burger) burger.focus();
    if (prefersReduce() || !panel) { finishClose(); return; }
    /* DEFERRED, play exit animation, then hide */
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

  /* ============ claim forms (demo), validate non-empty, no backend ============ */
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
        // demo build, no backend; a real submit would create the account
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

  /* ============ easter egg (console only, невидимо для AT) ============ */
  try {
    console.log('%c Alt Tab ⇥ ', 'font:700 26px/1.5 system-ui;color:#fff;background:#2563eb;padding:6px 14px;border-radius:8px;');
    console.log('%cОй, кто-то залез в консоль 👀  Иди на хуй... да шучу 😄\nРаз ты тут копаешься, ты точно из наших. Нам такие нужны.\nПроект или резюме → hello@alttab.studio', 'font:500 13px/1.7 system-ui;color:#9aa0aa;');
  } catch (e) {}

  /* ============ i18n: language switcher with 9 locales ============ */
  var TR = {
    ru: { title:'Alt Tab, студия создания сайтов под ключ', langLabel:'Язык', navHome:'Главная', navWorks:'Работы', navPricing:'Тарифы', cta:'Оставить заявку',
          hero:['Делаем ','охуенные',' сайты под ключ'], heroSub:'Без шаблонов, воды и сорванных сроков. Дизайн, код и запуск за 2-4 недели.',
          designTitle:'Дизайн под ваш бренд, а не шаблон', worksTitle:'Примеры наших работ', processTitle:'Запустим ваш проект под ключ',
          reviewsTitle:'Отзывы клиентов', pricingTitle:'Прозрачные тарифы', finalTitle:'Обсудим ваш проект', payTitle:'Принимаем к оплате' },
    en: { title:'Alt Tab, turn-key website studio', langLabel:'Language', navHome:'Home', navWorks:'Work', navPricing:'Pricing', cta:'Get a quote',
          hero:['We build ','kickass',' websites, turn-key'], heroSub:'No templates, no fluff, no missed deadlines. Design, code, launch in 2-4 weeks.',
          designTitle:'Custom design for your brand, not a template', worksTitle:'Selected work', processTitle:'Your project, end-to-end',
          reviewsTitle:'Client reviews', pricingTitle:'Transparent pricing', finalTitle:'Let’s discuss your project', payTitle:'We accept' },
    de: { title:'Alt Tab, Website-Studio aus einer Hand', langLabel:'Sprache', navHome:'Start', navWorks:'Arbeiten', navPricing:'Preise', cta:'Anfrage senden',
          hero:['Wir bauen ','geile',' Websites, aus einer Hand'], heroSub:'Keine Templates, kein Geschwafel, keine geplatzten Deadlines. Design, Code, Launch in 2-4 Wochen.',
          designTitle:'Design für Ihre Marke, keine Vorlage', worksTitle:'Ausgewählte Arbeiten', processTitle:'Ihr Projekt, von A bis Z',
          reviewsTitle:'Kundenstimmen', pricingTitle:'Transparente Preise', finalTitle:'Lass uns über dein Projekt sprechen', payTitle:'Wir akzeptieren' },
    fr: { title:'Alt Tab, studio de sites clé en main', langLabel:'Langue', navHome:'Accueil', navWorks:'Projets', navPricing:'Tarifs', cta:'Demander un devis',
          hero:['On fait des sites ','de ouf',', clé en main'], heroSub:'Sans templates, sans blabla, sans dépassement. Design, code, mise en ligne en 2-4 semaines.',
          designTitle:'Un design pour votre marque, pas un template', worksTitle:'Nos projets', processTitle:'Votre projet, de A à Z',
          reviewsTitle:'Avis clients', pricingTitle:'Tarifs transparents', finalTitle:'Parlons de votre projet', payTitle:'Nous acceptons' },
    es: { title:'Alt Tab, estudio de sitios llave en mano', langLabel:'Idioma', navHome:'Inicio', navWorks:'Trabajos', navPricing:'Precios', cta:'Pedir presupuesto',
          hero:['Hacemos sitios ','de puta madre',' llave en mano'], heroSub:'Sin plantillas, sin paja, sin plazos rotos. Diseño, código y lanzamiento en 2-4 semanas.',
          designTitle:'Diseño para tu marca, no una plantilla', worksTitle:'Trabajos seleccionados', processTitle:'Tu proyecto, de principio a fin',
          reviewsTitle:'Opiniones de clientes', pricingTitle:'Precios transparentes', finalTitle:'Hablemos de tu proyecto', payTitle:'Aceptamos' },
    it: { title:'Alt Tab, studio di siti chiavi in mano', langLabel:'Lingua', navHome:'Home', navWorks:'Lavori', navPricing:'Prezzi', cta:'Richiedi preventivo',
          hero:['Facciamo siti ','una figata',' chiavi in mano'], heroSub:'Niente template, niente fuffa, niente scadenze saltate. Design, codice e lancio in 2-4 settimane.',
          designTitle:'Design su misura per il tuo brand, non un template', worksTitle:'Lavori selezionati', processTitle:'Il tuo progetto, dall’idea al lancio',
          reviewsTitle:'Recensioni dei clienti', pricingTitle:'Prezzi trasparenti', finalTitle:'Parliamo del tuo progetto', payTitle:'Accettiamo' },
    pl: { title:'Alt Tab, studio stron pod klucz', langLabel:'Język', navHome:'Start', navWorks:'Realizacje', navPricing:'Cennik', cta:'Wyceń projekt',
          hero:['Robimy ','zajebiste',' strony pod klucz'], heroSub:'Bez szablonów, bez lania wody, bez przesuwanych terminów. Projekt, kod i start w 2-4 tygodnie.',
          designTitle:'Design pod twoją markę, nie szablon', worksTitle:'Wybrane realizacje', processTitle:'Twój projekt, od pomysłu do startu',
          reviewsTitle:'Opinie klientów', pricingTitle:'Przejrzysty cennik', finalTitle:'Pogadajmy o projekcie', payTitle:'Akceptujemy' },
    ro: { title:'Alt Tab, studio de site-uri la cheie', langLabel:'Limbă', navHome:'Acasă', navWorks:'Proiecte', navPricing:'Tarife', cta:'Cere ofertă',
          hero:['Facem site-uri ','beton',' la cheie'], heroSub:'Fără șabloane, fără vorbe goale, fără termene ratate. Design, cod și lansare în 2-4 săptămâni.',
          designTitle:'Design pentru brandul tău, nu un șablon', worksTitle:'Proiecte selectate', processTitle:'Proiectul tău, de la cap la coadă',
          reviewsTitle:'Părerile clienților', pricingTitle:'Tarife transparente', finalTitle:'Hai să discutăm proiectul tău', payTitle:'Acceptăm' },
    pt: { title:'Alt Tab, estúdio de sites chave na mão', langLabel:'Idioma', navHome:'Início', navWorks:'Projetos', navPricing:'Preços', cta:'Pedir orçamento',
          hero:['Fazemos sites ','foda',' chave na mão'], heroSub:'Sem templates, sem enrolação, sem prazos furados. Design, código e lançamento em 2-4 semanas.',
          designTitle:'Design para sua marca, não um template', worksTitle:'Projetos selecionados', processTitle:'Seu projeto, do início ao fim',
          reviewsTitle:'Avaliações de clientes', pricingTitle:'Preços transparentes', finalTitle:'Vamos conversar sobre seu projeto', payTitle:'Aceitamos' }
  };
  /* extended translations for the rest of the page */
  var EXT = {
    ru: { designLead:'Рисуем индивидуальный интерфейс под ваши задачи, чисто, современно, с заботой о конверсии. Сайт одинаково выверенно выглядит и работает на телефоне, планшете и десктопе.', worksLead:'Один из проектов, которыми гордимся, кликните, чтобы открыть его вживую.', processLead:'Берём всё на себя, от стратегии и дизайна до кода, интеграций, запуска и поддержки.', feat1Title:'Дизайн под бренд', feat1Text:'Индивидуальный интерфейс, который выделяет вас и работает на доверие.', feat2Title:'Разработка и интеграции', feat2Text:'Чистый код, скорость, CRM, оплата и доставка. Тестируем на всех устройствах.', feat3Title:'Запуск и аналитика', feat3Text:'Публикуем, настраиваем аналитику и метрики, отслеживаем результат.', feat4Title:'Поддержка и развитие', feat4Text:'Сопровождаем после релиза: доработки, A/B-тесты, скорость и SEO.', rev1Q:'«Запустили магазин за три недели, продажи с сайта выросли вдвое уже в первый месяц.»', rev1R:'основатель бренда Lotus', rev2Q:'«Чёткий процесс и ни одного срыва срока. Заявок стало втрое больше прежнего.»', rev2R:'маркетинг-директор Kontur Finance', rev3Q:'«Сделали сложный дашборд понятным. Команда, которой можно доверить продукт целиком.»', rev3R:'CEO Orbita', rev4Q:'«Сайт получился быстрым и красивым. Клиенты сами пишут, что им приятно пользоваться.»', rev4R:'владелица студии Rhythm', rev5Q:'«Сделали ровно то, что обещали, и даже больше. Рекомендую без оговорок.»', rev5R:'основатель Nordica', pricingLead:'Фиксируем стоимость и сроки в договоре до старта. Ниже, ориентир «от».', planFrom:'от', planBadge:'Чаще всего выбирают', plan1Name:'Старт', plan1For:'Лендинг под запуск', plan1F1:'Одна продающая страница', plan1F2:'Адаптив под все экраны', plan1F3:'Форма заявки + мессенджеры', plan1F4:'Подключение аналитики', plan1F5:'Срок 7-10 дней', plan1Pick:'Выбрать «Старт»', plan2Name:'Бизнес', plan2For:'Корпоративный сайт', plan2F1:'До 8 страниц + CMS', plan2F2:'Блог и SEO-структура', plan2F3:'Интеграции: CRM, оплата, формы', plan2F4:'Индивидуальный дизайн', plan2F5:'Срок 2-4 недели', plan2Pick:'Выбрать «Бизнес»', plan3Name:'Премиум', plan3For:'Магазин / веб-приложение', plan3F1:'Каталог или личный кабинет', plan3F2:'Архитектура под нагрузку', plan3F3:'Выделенная команда', plan3F4:'Нагрузочное тестирование', plan3F5:'Поддержка 3 месяца в подарок', plan3Pick:'Выбрать «Премиум»', pricingNote:'Нужно нестандартное решение? Расскажите о задаче, посчитаем точную смету.', finalSub:'Расскажите о задаче, предложим решение и смету в течение рабочего дня.', formLabel:'Ваш email или телефон', formPlaceholder:'ваш email или телефон', formSubmit:'Обсудить проект', footerTagline:'Студия веб-разработки. Создаём сайты под ключ, от идеи до запуска.', footerColStudio:'Студия', footerColContacts:'Контакты', footerProcess:'Процесс', footerContact:'Контакты', footerCopy:'© 2026 Alt Tab. Все права защищены.', footerLove:'Создаём сайты с любовью', egg:['Ну всё, ты долистал до самого низа. Иди на хуй 😉, ','шутим, давай работать','.'] },
    en: { designLead:'We design a tailored interface around your goals, clean, modern, conversion-focused. Looks and works flawlessly on phone, tablet and desktop.', worksLead:'One of the projects we’re proud of, click to see it live.', processLead:'We handle everything, from strategy and design to code, integrations, launch and support.', feat1Title:'Brand-driven design', feat1Text:'A unique interface that sets you apart and builds trust.', feat2Title:'Development & integrations', feat2Text:'Clean code, speed, CRM, payments and delivery. Tested on every device.', feat3Title:'Launch & analytics', feat3Text:'We publish, set up analytics and metrics, and track the outcome.', feat4Title:'Support & growth', feat4Text:'We stick around after launch: tweaks, A/B tests, speed and SEO.', rev1Q:'“Launched the store in three weeks, sales doubled in the first month.”', rev1R:'founder of Lotus', rev2Q:'“A clear process and not a single missed deadline. Leads tripled.”', rev2R:'marketing director, Kontur Finance', rev3Q:'“They turned a complex dashboard into something obvious. A team you can hand the whole product to.”', rev3R:'CEO, Orbita', rev4Q:'“The site came out fast and beautiful. Clients tell us themselves it’s a pleasure to use.”', rev4R:'owner of Rhythm studio', rev5Q:'“They delivered exactly what they promised, and more. Highly recommended.”', rev5R:'founder of Nordica', pricingLead:'Cost and timing locked in the contract before we start. Below, starting prices.', planFrom:'from', planBadge:'Most popular', plan1Name:'Starter', plan1For:'Launch landing page', plan1F1:'One conversion-focused page', plan1F2:'Responsive on all screens', plan1F3:'Lead form + messengers', plan1F4:'Analytics setup', plan1F5:'7-10 days', plan1Pick:'Choose Starter', plan2Name:'Business', plan2For:'Corporate website', plan2F1:'Up to 8 pages + CMS', plan2F2:'Blog and SEO structure', plan2F3:'Integrations: CRM, payments, forms', plan2F4:'Custom design', plan2F5:'2-4 weeks', plan2Pick:'Choose Business', plan3Name:'Premium', plan3For:'Store / web app', plan3F1:'Catalog or user account', plan3F2:'Architecture built for load', plan3F3:'Dedicated team', plan3F4:'Load testing', plan3F5:'3 months of support included', plan3Pick:'Choose Premium', pricingNote:'Need something custom? Tell us about the task, we’ll quote it precisely.', finalSub:'Tell us about the task, we’ll suggest a solution and a quote within one business day.', formLabel:'Your email or phone', formPlaceholder:'your email or phone', formSubmit:'Discuss project', footerTagline:'Web development studio. Turn-key websites, from idea to launch.', footerColStudio:'Studio', footerColContacts:'Contacts', footerProcess:'Process', footerContact:'Contact', footerCopy:'© 2026 Alt Tab. All rights reserved.', footerLove:'Built with love', egg:['So you scrolled all the way down. Go fuck yourself 😉, ','kidding, let’s work','.'] },
    de: { designLead:'Wir entwerfen ein maßgeschneidertes Interface für Ihre Aufgaben, sauber, modern, conversion-orientiert. Funktioniert tadellos auf Handy, Tablet und Desktop.', worksLead:'Eines unserer Projekte, auf das wir stolz sind, klicken, um es live anzusehen.', processLead:'Wir übernehmen alles, von Strategie und Design bis Code, Integrationen, Launch und Support.', feat1Title:'Markendesign', feat1Text:'Ein einzigartiges Interface, das Sie hervorhebt und Vertrauen schafft.', feat2Title:'Entwicklung & Integrationen', feat2Text:'Sauberer Code, Geschwindigkeit, CRM, Zahlungen und Versand. Auf allen Geräten getestet.', feat3Title:'Launch & Analytics', feat3Text:'Wir veröffentlichen, richten Analytics und Metriken ein und verfolgen das Ergebnis.', feat4Title:'Support & Weiterentwicklung', feat4Text:'Wir bleiben nach dem Launch dabei: Optimierungen, A/B-Tests, Speed und SEO.', rev1Q:'„Shop in drei Wochen gelauncht, die Verkäufe haben sich im ersten Monat verdoppelt.“', rev1R:'Gründerin von Lotus', rev2Q:'„Klarer Prozess, keine einzige verpasste Deadline. Dreimal mehr Anfragen.“', rev2R:'Marketing-Direktor, Kontur Finance', rev3Q:'„Aus einem komplexen Dashboard etwas Selbstverständliches gemacht. Ein Team, dem man das Produkt komplett anvertrauen kann.“', rev3R:'CEO, Orbita', rev4Q:'„Die Seite wurde schnell und schön. Kunden schreiben uns selbst, dass die Bedienung Spaß macht.“', rev4R:'Inhaberin Studio Rhythm', rev5Q:'„Genau das geliefert, was sie versprochen haben, und noch mehr. Klare Empfehlung.“', rev5R:'Gründer von Nordica', pricingLead:'Kosten und Zeitplan vor Start im Vertrag fixiert. Unten, Richtpreise „ab“.', planFrom:'ab', planBadge:'Am meisten gewählt', plan1Name:'Starter', plan1For:'Launch-Landingpage', plan1F1:'Eine conversion-orientierte Seite', plan1F2:'Responsiv für alle Bildschirme', plan1F3:'Anfrageformular + Messenger', plan1F4:'Analytics-Setup', plan1F5:'7-10 Tage', plan1Pick:'Starter wählen', plan2Name:'Business', plan2For:'Corporate Website', plan2F1:'Bis 8 Seiten + CMS', plan2F2:'Blog und SEO-Struktur', plan2F3:'Integrationen: CRM, Zahlung, Formulare', plan2F4:'Individuelles Design', plan2F5:'2-4 Wochen', plan2Pick:'Business wählen', plan3Name:'Premium', plan3For:'Shop / Web-App', plan3F1:'Katalog oder Kundenkonto', plan3F2:'Lastfähige Architektur', plan3F3:'Dediziertes Team', plan3F4:'Lasttests', plan3F5:'3 Monate Support inklusive', plan3Pick:'Premium wählen', pricingNote:'Brauchen Sie eine individuelle Lösung? Erzählen Sie uns von der Aufgabe, wir kalkulieren präzise.', finalSub:'Erzähl uns von der Aufgabe, wir schlagen Lösung und Angebot innerhalb eines Werktags vor.', formLabel:'Deine E-Mail oder Telefonnummer', formPlaceholder:'deine E-Mail oder Telefonnummer', formSubmit:'Projekt besprechen', footerTagline:'Web-Entwicklungsstudio. Websites aus einer Hand, von der Idee bis zum Launch.', footerColStudio:'Studio', footerColContacts:'Kontakt', footerProcess:'Prozess', footerContact:'Kontakt', footerCopy:'© 2026 Alt Tab. Alle Rechte vorbehalten.', footerLove:'Mit Liebe gebaut', egg:['Du hast bis ganz unten gescrollt. Verpiss dich 😉, ','Quatsch, lass uns arbeiten','.'] },
    fr: { designLead:'On dessine une interface sur mesure pour vos objectifs, propre, moderne, pensée pour la conversion. Impeccable sur mobile, tablette et desktop.', worksLead:'Un projet dont on est fiers, cliquez pour le voir en vrai.', processLead:'On prend tout en charge, de la stratégie et du design au code, aux intégrations, au lancement et au support.', feat1Title:'Design de marque', feat1Text:'Une interface unique qui vous démarque et inspire confiance.', feat2Title:'Développement & intégrations', feat2Text:'Code propre, rapidité, CRM, paiement et livraison. Testé sur tous les appareils.', feat3Title:'Lancement & analytics', feat3Text:'On publie, configure l’analytics et les métriques, suit le résultat.', feat4Title:'Support & évolution', feat4Text:'On reste après le lancement : ajustements, A/B tests, vitesse et SEO.', rev1Q:'« Boutique lancée en trois semaines, les ventes ont doublé dès le premier mois. »', rev1R:'fondatrice de Lotus', rev2Q:'« Processus clair, pas un seul délai raté. Trois fois plus de demandes. »', rev2R:'directeur marketing, Kontur Finance', rev3Q:'« Ils ont rendu évident un dashboard complexe. Une équipe à qui on peut confier tout le produit. »', rev3R:'CEO, Orbita', rev4Q:'« Le site est rapide et beau. Les clients nous disent eux-mêmes que c’est agréable. »', rev4R:'propriétaire du studio Rhythm', rev5Q:'« Livré exactement ce qui était promis, et même plus. Recommandé sans réserve. »', rev5R:'fondateur de Nordica', pricingLead:'Coût et délais fixés au contrat avant de démarrer. Ci-dessous, repères « à partir de ».', planFrom:'à partir de', planBadge:'Le plus choisi', plan1Name:'Starter', plan1For:'Landing de lancement', plan1F1:'Une page de conversion', plan1F2:'Responsive sur tous les écrans', plan1F3:'Formulaire + messageries', plan1F4:'Mise en place de l’analytics', plan1F5:'7-10 jours', plan1Pick:'Choisir Starter', plan2Name:'Business', plan2For:'Site corporate', plan2F1:'Jusqu’à 8 pages + CMS', plan2F2:'Blog et structure SEO', plan2F3:'Intégrations : CRM, paiement, formulaires', plan2F4:'Design sur mesure', plan2F5:'2-4 semaines', plan2Pick:'Choisir Business', plan3Name:'Premium', plan3For:'Boutique / web app', plan3F1:'Catalogue ou espace client', plan3F2:'Architecture pour la charge', plan3F3:'Équipe dédiée', plan3F4:'Tests de charge', plan3F5:'3 mois de support offerts', plan3Pick:'Choisir Premium', pricingNote:'Besoin d’une solution sur mesure ? Parlez-nous du projet, on calcule un devis précis.', finalSub:'Parlez-nous du projet, on propose une solution et un devis dans la journée.', formLabel:'Votre e-mail ou téléphone', formPlaceholder:'votre e-mail ou téléphone', formSubmit:'Discuter du projet', footerTagline:'Studio de développement web. Sites clé en main, de l’idée au lancement.', footerColStudio:'Studio', footerColContacts:'Contacts', footerProcess:'Processus', footerContact:'Contact', footerCopy:'© 2026 Alt Tab. Tous droits réservés.', footerLove:'Fait avec amour', egg:['Bon, t’as scrollé jusqu’en bas. Va te faire foutre 😉, ','je rigole, on bosse ensemble','.'] },
    es: { designLead:'Diseñamos una interfaz a medida de tus objetivos, limpia, moderna, pensada para conversión. Impecable en móvil, tablet y escritorio.', worksLead:'Un proyecto del que estamos orgullosos, haz clic para verlo en vivo.', processLead:'Nos ocupamos de todo, estrategia, diseño, código, integraciones, lanzamiento y soporte.', feat1Title:'Diseño de marca', feat1Text:'Una interfaz única que te diferencia y genera confianza.', feat2Title:'Desarrollo e integraciones', feat2Text:'Código limpio, velocidad, CRM, pagos y entregas. Probado en todos los dispositivos.', feat3Title:'Lanzamiento y analítica', feat3Text:'Publicamos, configuramos analítica y métricas, seguimos el resultado.', feat4Title:'Soporte y evolución', feat4Text:'Seguimos contigo después del lanzamiento: mejoras, A/B tests, velocidad y SEO.', rev1Q:'«Lanzamos la tienda en tres semanas, las ventas se duplicaron el primer mes.»', rev1R:'fundadora de Lotus', rev2Q:'«Proceso claro y sin un solo plazo perdido. El triple de leads.»', rev2R:'director de marketing, Kontur Finance', rev3Q:'«Convirtieron un dashboard complejo en algo obvio. Un equipo al que puedes confiar todo el producto.»', rev3R:'CEO, Orbita', rev4Q:'«El sitio salió rápido y bonito. Los clientes nos escriben que es un placer usarlo.»', rev4R:'propietaria del estudio Rhythm', rev5Q:'«Entregaron exactamente lo prometido, y más. Recomendado sin reservas.»', rev5R:'fundador de Nordica', pricingLead:'Coste y plazos cerrados en contrato antes de empezar. Abajo, orientativos «desde».', planFrom:'desde', planBadge:'Más elegido', plan1Name:'Starter', plan1For:'Landing de lanzamiento', plan1F1:'Una página orientada a conversión', plan1F2:'Responsive en todas las pantallas', plan1F3:'Formulario + mensajeros', plan1F4:'Analítica configurada', plan1F5:'7-10 días', plan1Pick:'Elegir Starter', plan2Name:'Business', plan2For:'Sitio corporativo', plan2F1:'Hasta 8 páginas + CMS', plan2F2:'Blog y estructura SEO', plan2F3:'Integraciones: CRM, pagos, formularios', plan2F4:'Diseño a medida', plan2F5:'2-4 semanas', plan2Pick:'Elegir Business', plan3Name:'Premium', plan3For:'Tienda / web app', plan3F1:'Catálogo o área de cliente', plan3F2:'Arquitectura para carga alta', plan3F3:'Equipo dedicado', plan3F4:'Tests de carga', plan3F5:'3 meses de soporte de regalo', plan3Pick:'Elegir Premium', pricingNote:'¿Necesitas algo a medida? Cuéntanos el reto, calculamos un presupuesto exacto.', finalSub:'Cuéntanos el reto, proponemos solución y presupuesto en un día laboral.', formLabel:'Tu email o teléfono', formPlaceholder:'tu email o teléfono', formSubmit:'Hablar del proyecto', footerTagline:'Estudio de desarrollo web. Sitios llave en mano, de la idea al lanzamiento.', footerColStudio:'Estudio', footerColContacts:'Contacto', footerProcess:'Proceso', footerContact:'Contacto', footerCopy:'© 2026 Alt Tab. Todos los derechos reservados.', footerLove:'Hecho con amor', egg:['Has llegado al fondo. Vete a la mierda 😉, ','es broma, vamos a trabajar','.'] },
    it: { designLead:'Disegniamo un’interfaccia su misura per i tuoi obiettivi, pulita, moderna, pensata per la conversione. Funziona impeccabile su mobile, tablet e desktop.', worksLead:'Uno dei progetti di cui andiamo fieri, clicca per vederlo dal vivo.', processLead:'Ci occupiamo di tutto, strategia, design, codice, integrazioni, lancio e supporto.', feat1Title:'Design di brand', feat1Text:'Un’interfaccia unica che ti distingue e genera fiducia.', feat2Title:'Sviluppo e integrazioni', feat2Text:'Codice pulito, velocità, CRM, pagamenti e spedizioni. Testato su tutti i device.', feat3Title:'Lancio e analytics', feat3Text:'Pubblichiamo, configuriamo analytics e metriche, monitoriamo il risultato.', feat4Title:'Supporto e crescita', feat4Text:'Restiamo con te dopo il lancio: ottimizzazioni, A/B test, velocità e SEO.', rev1Q:'«Negozio online lanciato in tre settimane, vendite raddoppiate al primo mese.»', rev1R:'fondatrice di Lotus', rev2Q:'«Processo chiaro e nemmeno una scadenza saltata. Lead triplicati.»', rev2R:'direttore marketing, Kontur Finance', rev3Q:'«Hanno reso ovvio un dashboard complesso. Un team a cui puoi affidare l’intero prodotto.»', rev3R:'CEO, Orbita', rev4Q:'«Il sito è venuto veloce e bello. I clienti ci scrivono che è un piacere usarlo.»', rev4R:'titolare dello studio Rhythm', rev5Q:'«Consegnato esattamente quanto promesso, e di più. Consigliato senza riserve.»', rev5R:'fondatore di Nordica', pricingLead:'Costo e tempi fissati in contratto prima di partire. Sotto, orientativi «da».', planFrom:'da', planBadge:'Più scelto', plan1Name:'Starter', plan1For:'Landing di lancio', plan1F1:'Una pagina orientata alla conversione', plan1F2:'Responsive su tutti gli schermi', plan1F3:'Form + messaggistiche', plan1F4:'Configurazione analytics', plan1F5:'7-10 giorni', plan1Pick:'Scegli Starter', plan2Name:'Business', plan2For:'Sito corporate', plan2F1:'Fino a 8 pagine + CMS', plan2F2:'Blog e struttura SEO', plan2F3:'Integrazioni: CRM, pagamenti, form', plan2F4:'Design su misura', plan2F5:'2-4 settimane', plan2Pick:'Scegli Business', plan3Name:'Premium', plan3For:'Shop / web app', plan3F1:'Catalogo o area cliente', plan3F2:'Architettura per alti carichi', plan3F3:'Team dedicato', plan3F4:'Test di carico', plan3F5:'3 mesi di supporto in omaggio', plan3Pick:'Scegli Premium', pricingNote:'Serve qualcosa di custom? Raccontaci il progetto, facciamo un preventivo preciso.', finalSub:'Raccontaci il progetto, proponiamo soluzione e preventivo in giornata.', formLabel:'La tua email o telefono', formPlaceholder:'la tua email o telefono', formSubmit:'Parlare del progetto', footerTagline:'Studio di sviluppo web. Siti chiavi in mano, dall’idea al lancio.', footerColStudio:'Studio', footerColContacts:'Contatti', footerProcess:'Processo', footerContact:'Contatti', footerCopy:'© 2026 Alt Tab. Tutti i diritti riservati.', footerLove:'Fatto con amore', egg:['Beh, sei arrivato fino in fondo. Vaffanculo 😉, ','scherzo, lavoriamo insieme','.'] },
    pl: { designLead:'Projektujemy interfejs skrojony pod twoje cele, czysty, nowoczesny, nastawiony na konwersję. Działa bez zarzutu na telefonie, tablecie i desktopie.', worksLead:'Jeden z projektów, z których jesteśmy dumni, kliknij, żeby zobaczyć na żywo.', processLead:'Bierzemy wszystko na siebie, od strategii i designu po kod, integracje, start i wsparcie.', feat1Title:'Design pod markę', feat1Text:'Unikalny interfejs, który cię wyróżnia i buduje zaufanie.', feat2Title:'Development i integracje', feat2Text:'Czysty kod, szybkość, CRM, płatności i dostawa. Testowane na wszystkich urządzeniach.', feat3Title:'Start i analityka', feat3Text:'Publikujemy, konfigurujemy analitykę i metryki, śledzimy efekt.', feat4Title:'Wsparcie i rozwój', feat4Text:'Zostajemy po starcie: poprawki, testy A/B, szybkość i SEO.', rev1Q:'„Sklep odpaliliśmy w trzy tygodnie, sprzedaż wzrosła dwukrotnie już w pierwszym miesiącu.”', rev1R:'założycielka marki Lotus', rev2Q:'„Jasny proces i ani jeden przesunięty termin. Trzykrotnie więcej leadów.”', rev2R:'dyrektor marketingu, Kontur Finance', rev3Q:'„Skomplikowany dashboard zrobili oczywistym. Zespół, któremu można powierzyć cały produkt.”', rev3R:'CEO, Orbita', rev4Q:'„Strona wyszła szybka i ładna. Klienci sami piszą, że miło z niej korzystać.”', rev4R:'właścicielka studia Rhythm', rev5Q:'„Dostarczyli dokładnie to, co obiecali, i więcej. Polecam bez wahania.”', rev5R:'założyciel marki Nordica', pricingLead:'Koszt i terminy zapisane w umowie przed startem. Niżej, ceny „od”.', planFrom:'od', planBadge:'Najczęściej wybierany', plan1Name:'Starter', plan1For:'Landing pod start', plan1F1:'Jedna strona konwersyjna', plan1F2:'Responsywność na wszystkie ekrany', plan1F3:'Formularz + komunikatory', plan1F4:'Konfiguracja analityki', plan1F5:'7-10 dni', plan1Pick:'Wybierz Starter', plan2Name:'Business', plan2For:'Strona korporacyjna', plan2F1:'Do 8 stron + CMS', plan2F2:'Blog i struktura SEO', plan2F3:'Integracje: CRM, płatności, formularze', plan2F4:'Indywidualny design', plan2F5:'2-4 tygodnie', plan2Pick:'Wybierz Business', plan3Name:'Premium', plan3For:'Sklep / aplikacja web', plan3F1:'Katalog lub panel klienta', plan3F2:'Architektura pod obciążenie', plan3F3:'Dedykowany zespół', plan3F4:'Testy obciążeniowe', plan3F5:'3 miesiące wsparcia w prezencie', plan3Pick:'Wybierz Premium', pricingNote:'Potrzebujesz nietypowego rozwiązania? Opowiedz o zadaniu, wyliczymy dokładnie.', finalSub:'Opowiedz o zadaniu, zaproponujemy rozwiązanie i wycenę w ciągu dnia roboczego.', formLabel:'Twój e-mail lub telefon', formPlaceholder:'twój e-mail lub telefon', formSubmit:'Pogadać o projekcie', footerTagline:'Studio web developmentu. Strony pod klucz, od pomysłu do startu.', footerColStudio:'Studio', footerColContacts:'Kontakt', footerProcess:'Proces', footerContact:'Kontakt', footerCopy:'© 2026 Alt Tab. Wszelkie prawa zastrzeżone.', footerLove:'Robione z miłością', egg:['No to dotarłeś na sam dół. Spierdalaj 😉, ','żartuję, pracujmy razem','.'] },
    ro: { designLead:'Desenăm o interfață croită pe obiectivele tale, curată, modernă, gândită pentru conversie. Funcționează impecabil pe mobil, tabletă și desktop.', worksLead:'Unul dintre proiectele cu care ne mândrim, click pentru a-l vedea live.', processLead:'Ne ocupăm de tot, strategie, design, cod, integrări, lansare și suport.', feat1Title:'Design de brand', feat1Text:'O interfață unică ce te scoate în evidență și inspiră încredere.', feat2Title:'Dezvoltare și integrări', feat2Text:'Cod curat, viteză, CRM, plăți și livrare. Testat pe toate dispozitivele.', feat3Title:'Lansare și analytics', feat3Text:'Publicăm, configurăm analytics și metrici, urmărim rezultatul.', feat4Title:'Suport și creștere', feat4Text:'Rămânem alături după lansare: optimizări, teste A/B, viteză și SEO.', rev1Q:'„Am lansat magazinul în trei săptămâni, vânzările s-au dublat în prima lună.”', rev1R:'fondatoare Lotus', rev2Q:'„Proces clar și niciun termen ratat. Cereri triplate.”', rev2R:'director de marketing, Kontur Finance', rev3Q:'„Au transformat un dashboard complex în ceva evident. O echipă căreia îi poți încredința tot produsul.”', rev3R:'CEO, Orbita', rev4Q:'„Site-ul a ieșit rapid și frumos. Clienții ne spun singuri că e plăcut de folosit.”', rev4R:'proprietara studioului Rhythm', rev5Q:'„Au livrat exact ce au promis, ba chiar mai mult. Recomand fără rețineri.”', rev5R:'fondator Nordica', pricingLead:'Cost și termene fixate în contract înainte de start. Mai jos, orientative „de la”.', planFrom:'de la', planBadge:'Cel mai ales', plan1Name:'Starter', plan1For:'Landing de lansare', plan1F1:'O pagină orientată pe conversie', plan1F2:'Responsive pe toate ecranele', plan1F3:'Formular + mesagerii', plan1F4:'Configurare analytics', plan1F5:'7-10 zile', plan1Pick:'Alege Starter', plan2Name:'Business', plan2For:'Site corporativ', plan2F1:'Până la 8 pagini + CMS', plan2F2:'Blog și structură SEO', plan2F3:'Integrări: CRM, plăți, formulare', plan2F4:'Design la comandă', plan2F5:'2-4 săptămâni', plan2Pick:'Alege Business', plan3Name:'Premium', plan3For:'Magazin / aplicație web', plan3F1:'Catalog sau cont de client', plan3F2:'Arhitectură pentru încărcare', plan3F3:'Echipă dedicată', plan3F4:'Teste de încărcare', plan3F5:'3 luni de suport cadou', plan3Pick:'Alege Premium', pricingNote:'Ai nevoie de ceva personalizat? Spune-ne despre proiect, calculăm o ofertă exactă.', finalSub:'Spune-ne despre proiect, propunem soluție și ofertă într-o zi lucrătoare.', formLabel:'Email-ul sau telefonul tău', formPlaceholder:'email-ul sau telefonul tău', formSubmit:'Discută proiectul', footerTagline:'Studio de dezvoltare web. Site-uri la cheie, de la idee la lansare.', footerColStudio:'Studio', footerColContacts:'Contact', footerProcess:'Proces', footerContact:'Contact', footerCopy:'© 2026 Alt Tab. Toate drepturile rezervate.', footerLove:'Făcut cu drag', egg:['Ei bine, ai ajuns până jos. Du-te-n pizda mă-tii 😉, ','glumesc, hai să lucrăm','.'] },
    pt: { designLead:'Desenhamos uma interface sob medida para os seus objetivos, limpa, moderna, focada em conversão. Impecável no celular, tablet e desktop.', worksLead:'Um dos projetos dos quais nos orgulhamos, clique para ver ao vivo.', processLead:'Cuidamos de tudo, da estratégia e design ao código, integrações, lançamento e suporte.', feat1Title:'Design de marca', feat1Text:'Uma interface única que destaca você e gera confiança.', feat2Title:'Desenvolvimento e integrações', feat2Text:'Código limpo, velocidade, CRM, pagamentos e entregas. Testado em todos os dispositivos.', feat3Title:'Lançamento e analytics', feat3Text:'Publicamos, configuramos analytics e métricas, acompanhamos o resultado.', feat4Title:'Suporte e evolução', feat4Text:'Ficamos com você depois do lançamento: ajustes, testes A/B, velocidade e SEO.', rev1Q:'«Lançamos a loja em três semanas, as vendas dobraram já no primeiro mês.»', rev1R:'fundadora da Lotus', rev2Q:'«Processo claro e nenhum prazo perdido. Triplicamos os contatos.»', rev2R:'diretor de marketing, Kontur Finance', rev3Q:'«Tornaram óbvio um dashboard complexo. Uma equipe a quem se confia o produto inteiro.»', rev3R:'CEO, Orbita', rev4Q:'«O site ficou rápido e bonito. Os clientes nos dizem sozinhos que é um prazer usar.»', rev4R:'dona do estúdio Rhythm', rev5Q:'«Entregaram exatamente o prometido, e mais. Recomendado sem reservas.»', rev5R:'fundador da Nordica', pricingLead:'Custo e prazos travados em contrato antes de começar. Abaixo, preços “a partir de”.', planFrom:'a partir de', planBadge:'Mais escolhido', plan1Name:'Starter', plan1For:'Landing de lançamento', plan1F1:'Uma página focada em conversão', plan1F2:'Responsivo em todas as telas', plan1F3:'Formulário + mensageiros', plan1F4:'Analytics configurado', plan1F5:'7-10 dias', plan1Pick:'Escolher Starter', plan2Name:'Business', plan2For:'Site corporativo', plan2F1:'Até 8 páginas + CMS', plan2F2:'Blog e estrutura de SEO', plan2F3:'Integrações: CRM, pagamentos, formulários', plan2F4:'Design sob medida', plan2F5:'2-4 semanas', plan2Pick:'Escolher Business', plan3Name:'Premium', plan3For:'Loja / web app', plan3F1:'Catálogo ou área do cliente', plan3F2:'Arquitetura para alta carga', plan3F3:'Equipe dedicada', plan3F4:'Testes de carga', plan3F5:'3 meses de suporte de brinde', plan3Pick:'Escolher Premium', pricingNote:'Precisa de algo sob medida? Conte sobre o projeto, calculamos um orçamento exato.', finalSub:'Conte sobre o projeto, propomos solução e orçamento em um dia útil.', formLabel:'Seu e-mail ou telefone', formPlaceholder:'seu e-mail ou telefone', formSubmit:'Conversar sobre o projeto', footerTagline:'Estúdio de desenvolvimento web. Sites chave na mão, da ideia ao lançamento.', footerColStudio:'Estúdio', footerColContacts:'Contato', footerProcess:'Processo', footerContact:'Contato', footerCopy:'© 2026 Alt Tab. Todos os direitos reservados.', footerLove:'Feito com amor', egg:['Bom, você rolou até o fim. Vai se foder 😉, ','brincadeira, bora trabalhar','.'] }
  };
  /* stats strip, same numbers, translated labels + SR sentences */
  var STATS = {
    ru: { stat1Num:'150+', stat1Lbl:'проектов запущено', stat1Sr:'Более 150 проектов запущено', stat2Num:'2-4', stat2Lbl:'недели до запуска', stat2Sr:'Запуск за 2-4 недели', stat3Num:'8 лет', stat3Lbl:'на рынке веб-разработки', stat3Sr:'8 лет на рынке веб-разработки', stat4Num:'98%', stat4Lbl:'клиентов рекомендуют нас', stat4Sr:'98 процентов клиентов рекомендуют нас' },
    en: { stat1Num:'150+', stat1Lbl:'projects launched', stat1Sr:'Over 150 projects launched', stat2Num:'2-4', stat2Lbl:'weeks to launch', stat2Sr:'Launch in 2 to 4 weeks', stat3Num:'8 yrs', stat3Lbl:'in web development', stat3Sr:'8 years in web development', stat4Num:'98%', stat4Lbl:'clients recommend us', stat4Sr:'98 percent of clients recommend us' },
    de: { stat1Num:'150+', stat1Lbl:'Projekte gelauncht', stat1Sr:'Über 150 Projekte gelauncht', stat2Num:'2-4', stat2Lbl:'Wochen bis Launch', stat2Sr:'Launch in 2 bis 4 Wochen', stat3Num:'8 J.', stat3Lbl:'in der Web-Entwicklung', stat3Sr:'8 Jahre in der Web-Entwicklung', stat4Num:'98%', stat4Lbl:'Kunden empfehlen uns', stat4Sr:'98 Prozent der Kunden empfehlen uns' },
    fr: { stat1Num:'150+', stat1Lbl:'projets lancés', stat1Sr:'Plus de 150 projets lancés', stat2Num:'2-4', stat2Lbl:'semaines pour le lancement', stat2Sr:'Lancement en 2 à 4 semaines', stat3Num:'8 ans', stat3Lbl:'dans le développement web', stat3Sr:'8 ans dans le développement web', stat4Num:'98%', stat4Lbl:'clients nous recommandent', stat4Sr:'98 pour cent des clients nous recommandent' },
    es: { stat1Num:'150+', stat1Lbl:'proyectos lanzados', stat1Sr:'Más de 150 proyectos lanzados', stat2Num:'2-4', stat2Lbl:'semanas hasta el lanzamiento', stat2Sr:'Lanzamiento en 2 a 4 semanas', stat3Num:'8 años', stat3Lbl:'en desarrollo web', stat3Sr:'8 años en desarrollo web', stat4Num:'98%', stat4Lbl:'clientes nos recomiendan', stat4Sr:'98 por ciento de los clientes nos recomiendan' },
    it: { stat1Num:'150+', stat1Lbl:'progetti lanciati', stat1Sr:'Oltre 150 progetti lanciati', stat2Num:'2-4', stat2Lbl:'settimane al lancio', stat2Sr:'Lancio in 2 a 4 settimane', stat3Num:'8 anni', stat3Lbl:'nello sviluppo web', stat3Sr:'8 anni nello sviluppo web', stat4Num:'98%', stat4Lbl:'clienti ci raccomandano', stat4Sr:'98 percento dei clienti ci raccomandano' },
    pl: { stat1Num:'150+', stat1Lbl:'wdrożonych projektów', stat1Sr:'Ponad 150 wdrożonych projektów', stat2Num:'2-4', stat2Lbl:'tygodnie do startu', stat2Sr:'Start w 2 do 4 tygodni', stat3Num:'8 lat', stat3Lbl:'w web developmencie', stat3Sr:'8 lat w web developmencie', stat4Num:'98%', stat4Lbl:'klientów nas poleca', stat4Sr:'98 procent klientów nas poleca' },
    ro: { stat1Num:'150+', stat1Lbl:'proiecte lansate', stat1Sr:'Peste 150 de proiecte lansate', stat2Num:'2-4', stat2Lbl:'săptămâni până la lansare', stat2Sr:'Lansare în 2 până la 4 săptămâni', stat3Num:'8 ani', stat3Lbl:'în dezvoltare web', stat3Sr:'8 ani în dezvoltare web', stat4Num:'98%', stat4Lbl:'clienți ne recomandă', stat4Sr:'98 la sută din clienți ne recomandă' },
    pt: { stat1Num:'150+', stat1Lbl:'projetos lançados', stat1Sr:'Mais de 150 projetos lançados', stat2Num:'2-4', stat2Lbl:'semanas até o lançamento', stat2Sr:'Lançamento em 2 a 4 semanas', stat3Num:'8 anos', stat3Lbl:'em desenvolvimento web', stat3Sr:'8 anos em desenvolvimento web', stat4Num:'98%', stat4Lbl:'clientes nos recomendam', stat4Sr:'98 por cento dos clientes nos recomendam' }
  };
  var MAIL = {
    ru:{mailEyebrow:'Есть проект?'}, en:{mailEyebrow:'Got a project?'}, de:{mailEyebrow:'Ein Projekt?'},
    fr:{mailEyebrow:'Un projet ?'}, es:{mailEyebrow:'¿Tienes un proyecto?'}, it:{mailEyebrow:'Hai un progetto?'},
    pl:{mailEyebrow:'Masz projekt?'}, ro:{mailEyebrow:'Ai un proiect?'}, pt:{mailEyebrow:'Tem um projeto?'}
  };
  var MORE = {
    ru:{designEyebrow:'Дизайн и адаптив', worksEyebrow:'Портфолио', contactTitle:'Мы на связи', newTab:'(откроется в новой вкладке)'},
    en:{designEyebrow:'Design & responsive', worksEyebrow:'Portfolio', contactTitle:'We’re in touch', newTab:'(opens in a new tab)'},
    de:{designEyebrow:'Design & Responsive', worksEyebrow:'Portfolio', contactTitle:'Wir sind erreichbar', newTab:'(öffnet in neuem Tab)'},
    fr:{designEyebrow:'Design & responsive', worksEyebrow:'Portfolio', contactTitle:'On reste en contact', newTab:'(s’ouvre dans un nouvel onglet)'},
    es:{designEyebrow:'Diseño y responsive', worksEyebrow:'Portafolio', contactTitle:'Estamos en contacto', newTab:'(se abre en una pestaña nueva)'},
    it:{designEyebrow:'Design e responsive', worksEyebrow:'Portfolio', contactTitle:'Siamo in contatto', newTab:'(si apre in una nuova scheda)'},
    pl:{designEyebrow:'Design i responsywność', worksEyebrow:'Portfolio', contactTitle:'Jesteśmy w kontakcie', newTab:'(otwiera się w nowej karcie)'},
    ro:{designEyebrow:'Design și responsive', worksEyebrow:'Portofoliu', contactTitle:'Suntem în contact', newTab:'(se deschide într-o filă nouă)'},
    pt:{designEyebrow:'Design e responsivo', worksEyebrow:'Portfólio', contactTitle:'Estamos em contato', newTab:'(abre em uma nova aba)'}
  };
  /* merge EXT + STATS + MAIL + MORE into TR */
  Object.keys(EXT).forEach(function(k){ Object.assign(TR[k]||{}, EXT[k]); });
  Object.keys(STATS).forEach(function(k){ Object.assign(TR[k]||{}, STATS[k]); });
  Object.keys(MAIL).forEach(function(k){ Object.assign(TR[k]||{}, MAIL[k]); });
  Object.keys(MORE).forEach(function(k){ Object.assign(TR[k]||{}, MORE[k]); });
  /* overrides: shorter design title/lead + footer social-row label */
  var DZ = {
    ru:{designTitle:'Дизайн, а не шаблон', designLead:'Индивидуальный интерфейс под вашу задачу, выверенный на телефоне, планшете и десктопе.', socialsAria:'Соцсети и мессенджеры'},
    en:{designTitle:'Design, not a template', designLead:'A custom interface built around your goal, flawless on phone, tablet and desktop.', socialsAria:'Social and messaging links'},
    de:{designTitle:'Design statt Vorlage', designLead:'Ein individuelles Interface für Ihr Ziel, einwandfrei auf Handy, Tablet und Desktop.', socialsAria:'Soziale Netzwerke und Messenger'},
    fr:{designTitle:'Du design, pas un template', designLead:'Une interface sur mesure pour votre objectif, impeccable sur mobile, tablette et desktop.', socialsAria:'Réseaux sociaux et messageries'},
    es:{designTitle:'Diseño, no una plantilla', designLead:'Una interfaz a medida de tu objetivo, impecable en móvil, tablet y escritorio.', socialsAria:'Redes sociales y mensajería'},
    it:{designTitle:'Design, non un template', designLead:'Un’interfaccia su misura per il tuo obiettivo, impeccabile su mobile, tablet e desktop.', socialsAria:'Social e messaggistica'},
    pl:{designTitle:'Design, nie szablon', designLead:'Interfejs skrojony pod twój cel, bez zarzutu na telefonie, tablecie i desktopie.', socialsAria:'Media społecznościowe i komunikatory'},
    ro:{designTitle:'Design, nu un șablon', designLead:'O interfață croită pe obiectivul tău, impecabilă pe mobil, tabletă și desktop.', socialsAria:'Rețele sociale și mesagerie'},
    pt:{designTitle:'Design, não um template', designLead:'Uma interface sob medida para seu objetivo, impecável no celular, tablet e desktop.', socialsAria:'Redes sociais e mensageiros'}
  };
  Object.keys(DZ).forEach(function(k){ Object.assign(TR[k]||{}, DZ[k]); });
  var WB = {
    ru:{worksCta:'Все проекты', worksLead:'Живые проекты, а не картинки. Открывайте и кликайте прямо сейчас.'},
    en:{worksCta:'See projects', worksLead:'Live projects, not mockups. Open and click through right now.'},
    de:{worksCta:'Alle Projekte', worksLead:'Echte Projekte, keine Bilder. Öffnen und direkt durchklicken.'},
    fr:{worksCta:'Tous les projets', worksLead:'Des projets en ligne, pas des images. À ouvrir et explorer tout de suite.'},
    es:{worksCta:'Ver proyectos', worksLead:'Proyectos reales, no maquetas. Ábrelos y explóralos ahora mismo.'},
    it:{worksCta:'Tutti i progetti', worksLead:'Progetti veri, non immagini. Aprili ed esplorali subito.'},
    pl:{worksCta:'Wszystkie projekty', worksLead:'Prawdziwe projekty, nie obrazki. Otwórz i klikaj od razu.'},
    ro:{worksCta:'Toate proiectele', worksLead:'Proiecte reale, nu poze. Deschide-le și explorează-le acum.'},
    pt:{worksCta:'Ver projetos', worksLead:'Projetos reais, não imagens. Abra e explore agora mesmo.'}
  };
  Object.keys(WB).forEach(function(k){ Object.assign(TR[k]||{}, WB[k]); });
  /* compose messenger aria-labels = brand + new-tab note, per locale */
  Object.keys(TR).forEach(function(k){
    var nt = TR[k].newTab ? ' ' + TR[k].newTab : '';
    TR[k].igAria = 'Instagram' + nt;
    TR[k].tgAria = 'Telegram' + nt;
    TR[k].waAria = 'WhatsApp' + nt;
  });
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
    var egg = document.querySelector('[data-i18n-html="egg"]');
    if (egg && t.egg) {
      egg.textContent = '';
      egg.appendChild(document.createTextNode(t.egg[0]));
      var a = document.createElement('a'); a.href = '#contact'; a.textContent = t.egg[1];
      egg.appendChild(a);
      egg.appendChild(document.createTextNode(t.egg[2]));
    }
    /* placeholders / aria-labels via data-i18n-attr='{"placeholder":"key"}' */
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      try {
        var map = JSON.parse(el.getAttribute('data-i18n-attr'));
        Object.keys(map).forEach(function (attr) {
          if (t[map[attr]] != null) el.setAttribute(attr, t[map[attr]]);
        });
      } catch (e) {}
    });
    try { localStorage.setItem('locale', loc); } catch (e) {}
    /* sync custom button + listbox state */
    var btn = document.getElementById('lang-btn');
    if (btn) btn.textContent = loc.toUpperCase();
    document.querySelectorAll('#lang-menu li[role="option"]').forEach(function (li) {
      li.setAttribute('aria-selected', li.getAttribute('data-locale') === loc ? 'true' : 'false');
    });
  }
  var initLoc = 'ru';
  try { var s = localStorage.getItem('locale'); if (s && LOCALES.indexOf(s) > -1) initLoc = s; } catch (e) {}
  applyLocale(initLoc);

  /* ============ custom language listbox ============ */
  var langBtn = document.getElementById('lang-btn');
  var langMenu = document.getElementById('lang-menu');
  if (langBtn && langMenu) {
    var langOpts = Array.prototype.slice.call(langMenu.querySelectorAll('li[role="option"]'));
    function openLang() {
      langMenu.hidden = false;
      langBtn.setAttribute('aria-expanded', 'true');
      var cur = langMenu.querySelector('li[aria-selected="true"]') || langOpts[0];
      if (cur) cur.focus();
    }
    function closeLang(returnFocus) {
      if (langMenu.hidden) return;
      langMenu.hidden = true;
      langBtn.setAttribute('aria-expanded', 'false');
      if (returnFocus !== false) langBtn.focus();
    }
    langBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (langMenu.hidden) openLang(); else closeLang();
    });
    langBtn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLang(); }
    });
    langOpts.forEach(function (li) {
      li.addEventListener('click', function (e) {
        e.stopPropagation();
        applyLocale(li.getAttribute('data-locale'));
        closeLang(true);
      });
      li.addEventListener('keydown', function (e) {
        var idx = langOpts.indexOf(li);
        if (e.key === 'ArrowDown') { e.preventDefault(); langOpts[(idx + 1) % langOpts.length].focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); langOpts[(idx - 1 + langOpts.length) % langOpts.length].focus(); }
        else if (e.key === 'Home') { e.preventDefault(); langOpts[0].focus(); }
        else if (e.key === 'End') { e.preventDefault(); langOpts[langOpts.length - 1].focus(); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyLocale(li.getAttribute('data-locale')); closeLang(true); }
        else if (e.key === 'Escape') { e.preventDefault(); closeLang(true); }
        else if (e.key === 'Tab') { closeLang(false); }
      });
    });
    document.addEventListener('mousedown', function (e) {
      if (!langMenu.hidden && !langMenu.contains(e.target) && e.target !== langBtn) closeLang(false);
    });
  }
})();
