/* Renders editable content (from admin) into the existing markup + WhatsApp contact form.
   The static HTML is the default; this only swaps text/links/cards using the SAME classes. */
(function () {
  'use strict';
  var LS_KEY = 'portfolio_content_v1';
  var PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="100%" height="100%" fill="#111"/><text x="50%" y="50%" fill="#555" font-family="Arial" font-size="48" text-anchor="middle">NO IMAGE</text></svg>');

  function $(id) { return document.getElementById(id); }
  function T(t) { return document.createTextNode(t); }
  function E(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function lines(el, text) {
    el.textContent = '';
    String(text == null ? '' : text).split('\n').forEach(function (t, i) {
      if (i) el.appendChild(document.createElement('br'));
      el.appendChild(T(t));
    });
  }
  function safeUrl(u) {
    u = String(u || '').trim();
    if (/^https?:\/\//i.test(u)) return u;
    return '#';
  }
  function safeImg(u) {
    u = String(u || '').trim();
    if (!u) return PLACEHOLDER;
    if (/^(https?:\/\/|data:image\/(jpeg|png|webp|gif);base64,)/i.test(u)) return u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return PLACEHOLDER;   // block javascript: etc.
    return u;                                                  // relative path / same-site url
  }
  function arr(a) { return Array.isArray(a) ? a : null; }

  function renderProjects(list) {
    var grid = $('project-grid'); if (!grid) return;
    grid.textContent = '';
    list.forEach(function (p, i) {
      var a = E('a', 'project-card');
      a.href = safeUrl(p.url);
      a.setAttribute('style', 'text-decoration: none; color: inherit; display: block;');
      a.target = '_blank'; a.rel = 'noopener noreferrer';
      var img = document.createElement('img');
      img.src = safeImg(p.image); img.alt = p.title || 'Project'; img.loading = 'lazy';
      a.appendChild(img);
      var info = E('div', 'project-info');
      info.appendChild(E('div', 'project-num', ('0' + (i + 1)).slice(-2)));
      var txt = E('div', 'project-text');
      txt.appendChild(E('h3', null, p.title || ''));
      txt.appendChild(E('p', null, p.category || ''));
      info.appendChild(txt);
      var ar = E('div', 'arrow'); ar.innerHTML = '&rarr;'; info.appendChild(ar);
      a.appendChild(info);
      grid.appendChild(a);
    });
  }

  function apply(c) {
    if (!c || typeof c !== 'object') return;
    try {
      var h = c.hero;
      if (h) {
        if ($('hero-nav-left')) $('hero-nav-left').textContent = h.navLeft || '';
        var nr = $('hero-nav-right');
        if (nr) { nr.textContent = ''; nr.appendChild(T((h.navRight || '') + ' ')); nr.appendChild(E('span', 'plus', '+')); }
        if ($('hero-greeting')) $('hero-greeting').textContent = h.greeting || '';
        if ($('hero-name')) lines($('hero-name'), h.name);
        if ($('hero-title')) lines($('hero-title'), h.title);
        if ($('hero-desc')) $('hero-desc').textContent = h.desc || '';
        var b = $('hero-badge');
        if (b) { b.textContent = ''; b.appendChild(E('span', 'icon', '🌐')); b.appendChild(T(' ' + (h.badge || ''))); }
        if ($('hero-tagline')) $('hero-tagline').textContent = h.tagline || '';
      }
      if (arr(c.stats) && $('stats-list')) {
        var st = $('stats-list'); st.textContent = '';
        c.stats.forEach(function (s) {
          var d = E('div', 'stat'); d.appendChild(E('span', 'stat-num', s.num || ''));
          var l = E('span', 'stat-label'); lines(l, s.label); d.appendChild(l); st.appendChild(d);
        });
      }
      if (arr(c.projects)) renderProjects(c.projects);
      if (arr(c.education) && $('edu-list')) {
        var ed = $('edu-list'); ed.textContent = '';
        c.education.forEach(function (e) {
          var it = E('div', 'edu-item'); var l = E('div');
          l.appendChild(E('strong', null, e.title || '')); l.appendChild(E('p', null, e.place || ''));
          it.appendChild(l); it.appendChild(E('span', 'year', e.year || '')); ed.appendChild(it);
        });
      }
      if (arr(c.skills) && $('skills-list')) {
        var sk = $('skills-list'); sk.textContent = '';
        c.skills.forEach(function (s) { sk.appendChild(E('span', 'skill-tag', s)); });
      }
      if (arr(c.process) && $('process-list')) {
        var pl = $('process-list'); pl.textContent = '';
        c.process.forEach(function (p, i) {
          var it = E('div', 'process-item');
          it.appendChild(E('div', 'process-num', ('0' + (i + 1)).slice(-2)));
          it.appendChild(E('div', 'process-icon', p.icon || ''));
          var tx = E('div', 'process-text'); tx.appendChild(E('h4', null, p.title || '')); tx.appendChild(E('p', null, p.text || ''));
          it.appendChild(tx); pl.appendChild(it);
        });
      }
      var q = c.quote;
      if (q) {
        if ($('quote-text')) $('quote-text').textContent = q.text || '';
        if ($('quote-signature')) $('quote-signature').textContent = q.signature || '';
        if ($('quote-footer')) lines($('quote-footer'), q.footer);
      }
      var ct = c.contact;
      if (ct) {
        var ch = $('contact-heading');
        if (ch) { lines(ch, ct.heading); ch.appendChild(T(' ')); ch.appendChild(E('span', 'star', '✦')); }
        if ($('contact-text')) $('contact-text').textContent = ct.text || '';
        var ul = $('contact-list');
        if (ul) {
          ul.textContent = '';
          [['&#9993;', ct.email], ['&#128222;', ct.phone], ['&#128205;', ct.address]].forEach(function (r) {
            var li = document.createElement('li'); var ic = E('span', 'icon'); ic.innerHTML = r[0];
            li.appendChild(ic); li.appendChild(T(r[1] || '')); ul.appendChild(li);
          });
        }
      }
      var so = c.socials;
      if (so) {
        if ($('soc-instagram') && so.instagram) $('soc-instagram').href = safeUrl(so.instagram);
        if ($('soc-linkedin') && so.linkedin) $('soc-linkedin').href = safeUrl(so.linkedin);
      }
      if (c.footer && $('footer-copy')) $('footer-copy').textContent = c.footer.copyright || '';
    } catch (err) { if (window.console) console.error('Content render error', err); }
    Site.current = c;
  }

  var Site = window.Site = { apply: apply, current: null, LS_KEY: LS_KEY, safeUrl: safeUrl, safeImg: safeImg, PLACEHOLDER: PLACEHOLDER };

  /* Load order: live data (Vercel API) -> this browser's saved copy -> static HTML as shipped */
  function load() {
    var done = false;
    function useLocal() {
      try { var raw = localStorage.getItem(LS_KEY); if (raw) { apply(JSON.parse(raw)); } } catch (e) { }
    }
    if (!window.fetch) { useLocal(); return; }
    fetch('/api/data?k=content', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { if (j && j.projects) { apply(j); done = true; } else throw 0; })
      .catch(function () { if (!done) useLocal(); });
  }
  load();

  /* Contact form -> WhatsApp */
  var form = $('contact-form');
  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var f = form.elements;
      var num = String((Site.current && Site.current.contact && Site.current.contact.whatsapp) || '917057477861').replace(/\D/g, '');
      var msg = 'Hello Anis, new message from your portfolio website:\n\n' +
        'Name: ' + f.name.value.trim() + '\n' +
        'Email: ' + f.email.value.trim() + '\n' +
        'Subject: ' + f.subject.value.trim() + '\n' +
        'Message: ' + f.message.value.trim();
      var url = 'https://wa.me/' + num + '?text=' + encodeURIComponent(msg);
      var a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      document.body.appendChild(a); a.click(); a.remove();
      form.reset();
    });
  }

  /* Admin (loaded only when needed) */
  var opener = $('admin-open'), loading = false;
  function openAdmin(ev) {
    if (ev) ev.preventDefault();
    if (window.AdminPanel) return window.AdminPanel.open();
    if (loading) return; loading = true;
    var s = document.createElement('script'); s.src = 'admin.js';
    s.onload = function () { loading = false; window.AdminPanel.open(); };
    s.onerror = function () { loading = false; alert('Could not load admin panel.'); };
    document.body.appendChild(s);
  }
  if (opener) opener.addEventListener('click', openAdmin);
  if (location.hash === '#admin') openAdmin();
})();
