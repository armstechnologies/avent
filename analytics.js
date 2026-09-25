/* Avent Technical Group — GA4 event layer (G-ZWNTEQ6485) */
(function () {
  if (!window.gtag) return;
  var g = window.gtag;
  var sent = {};
  function once(key, name, params) { if (sent[key]) return; sent[key] = 1; g('event', name, params || {}); }
  function pageType() {
    var p = location.pathname.replace(/\/+$/, '') || '/';
    if (document.documentElement.getAttribute('data-page') === '404') return '404';
    var map = { '/': 'home', '/about': 'about', '/solutions': 'solutions', '/industries': 'industries', '/partners': 'partners', '/contact': 'contact', '/privacy': 'legal', '/terms': 'legal' };
    return map[p] || 'other';
  }
  function zone(el) {
    if (el.closest('header')) return 'header';
    if (el.closest('footer')) return 'footer';
    return 'body';
  }
  function label(el) { return (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100); }

  g('set', 'content_group', pageType());
  g('set', 'user_properties', { visitor_type: localStorage.getItem('avent_seen') ? 'returning' : 'new' });
  try { localStorage.setItem('avent_seen', '1'); } catch (e) {}
  if (pageType() === '404') g('event', 'page_not_found', { page_path: location.pathname, page_referrer: document.referrer });

  // Clicks: phone, email, CTAs, nav, outbound, partner logos
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a, button');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var base = { link_text: label(a), click_location: zone(a), page_type: pageType() };
    if (href.indexOf('tel:') === 0) {
      g('event', 'click_to_call', Object.assign(base, { phone_number: href.slice(4) }));
    } else if (href.indexOf('mailto:') === 0) {
      g('event', 'click_email', Object.assign(base, { email_address: href.slice(7) }));
    } else if (/^https?:/i.test(href) && a.hostname && a.hostname !== location.hostname) {
      g('event', 'outbound_click', Object.assign(base, { link_url: href, link_domain: a.hostname }));
    } else if (a.closest('header, footer') && href) {
      g('event', 'nav_click', Object.assign(base, { link_url: href }));
    } else if (/consult|contact|quote|get in touch|request|learn more|explore|view/i.test(base.link_text)) {
      g('event', 'cta_click', Object.assign(base, { link_url: href }));
    }
  }, true);

  // Scroll depth (GA only tracks 90% by default); resets on SPA navigation
  var marks = [25, 50, 75, 90];
  function onScroll() {
    var h = document.documentElement.scrollHeight - innerHeight;
    if (h <= 0) return;
    var pct = (scrollY / h) * 100;
    marks.forEach(function (m) { if (pct >= m) once(location.pathname + ':s' + m, 'scroll_depth', { percent_scrolled: m, page_type: pageType() }); });
  }
  addEventListener('scroll', onScroll, { passive: true });

  // Engaged reading milestones (visible tab only)
  var active = 0, timeMarks = [30, 60, 120, 300];
  setInterval(function () {
    if (document.visibilityState !== 'visible') return;
    active += 5;
    timeMarks.forEach(function (t) { if (active >= t) once(location.pathname + ':t' + t, 'time_on_page', { seconds: t, page_type: pageType() }); });
  }, 5000);

  // Section visibility (solutions, industries, partner blocks)
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var h = en.target.querySelector('h2, h3');
        var name = h ? label(h) : '';
        if (name) once(location.pathname + ':v:' + name, 'section_view', { section_name: name, page_type: pageType() });
        io.unobserve(en.target);
      });
    }, { threshold: 0.5 });
    function watch() { document.querySelectorAll('section').forEach(function (s) { io.observe(s); }); }
    setTimeout(watch, 1500);
  }

  // Contact form funnel: form_start → generate_lead / form_error
  document.addEventListener('focusin', function (e) {
    var f = e.target.closest && e.target.closest('form');
    if (f) once('form_start:' + location.pathname, 'form_start', { form_name: 'consultation_request', page_type: pageType() });
  });
  document.addEventListener('change', function (e) {
    if (e.target.name === 'interest') g('event', 'service_interest_selected', { service: e.target.value });
  });
  addEventListener('avent:lead', function (e) {
    var d = e.detail || {};
    g('event', 'generate_lead', { form_name: 'consultation_request', service: d.interest || '(not set)', has_company: !!d.company, has_phone: !!d.phone, currency: 'CAD', value: 1 });
  });
  addEventListener('avent:form_error', function () { g('event', 'form_error', { form_name: 'consultation_request' }); });

  // SPA navigations: reset per-page counters (GA enhanced measurement sends page_view on history change)
  var push = history.pushState;
  history.pushState = function () {
    var r = push.apply(this, arguments);
    active = 0;
    setTimeout(function () { g('set', 'content_group', pageType()); if (typeof watch === 'function') watch(); }, 0);
    return r;
  };

  // Core Web Vitals
  var s = document.createElement('script');
  s.src = 'https://unpkg.com/web-vitals@4/dist/web-vitals.iife.js';
  s.async = true;
  s.onload = function () {
    if (!window.webVitals) return;
    function send(m) { g('event', m.name, { value: Math.round(m.name === 'CLS' ? m.value * 1000 : m.value), metric_id: m.id, metric_value: m.value, metric_rating: m.rating, non_interaction: true }); }
    ['onLCP', 'onINP', 'onCLS', 'onFCP', 'onTTFB'].forEach(function (fn) { window.webVitals[fn] && window.webVitals[fn](send); });
  };
  document.head.appendChild(s);
})();
