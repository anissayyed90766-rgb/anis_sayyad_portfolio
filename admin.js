/* Admin panel. Password check happens on the server when /api is available (Vercel);
   otherwise a hashed local check is used and changes are saved in this browser only. */
(function () {
  'use strict';
  var S = window.Site;
  var LOCAL_HASH = '51526f3cd3dd795def1f892d9544205d63df0125f60e2ed98a5619d825aeb4e8';
  var SS_KEY = 'portfolio_admin_session';
  var root, body, tabsBar, chip, dirtyChip, toastEl;
  var st = { tab: 'projects', live: false, pw: '', dirty: false };
  var draft = null, baseline = null;

  function h(tag, props, kids) {
    var e = document.createElement(tag); props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'value') e.value = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function toast(msg) {
    if (toastEl) toastEl.remove();
    toastEl = h('div', { class: 'adm-toast', text: msg }); document.body.appendChild(toastEl);
    setTimeout(function () { if (toastEl) toastEl.remove(); }, 3200);
  }
  function markDirty() { st.dirty = true; if (dirtyChip) dirtyChip.style.display = ''; }
  function sha(pw) {
    if (!(window.crypto && crypto.subtle)) return Promise.resolve('');
    var data = new TextEncoder().encode('anis-portfolio:' + pw);
    return crypto.subtle.digest('SHA-256', data).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  function api(k, method, payload) {
    return fetch('/api/data?k=' + k, {
      method: method, headers: { 'Content-Type': 'application/json', 'x-admin-password': st.pw },
      body: payload ? JSON.stringify(payload) : '{}'
    });
  }

  /* ---------- login ---------- */
  function authenticate(pw) {
    return fetch('/api/data?k=auth', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': pw }, body: '{}' })
      .then(function (r) {
        if (r.status === 401) return { ok: false };
        if (r.ok) return r.json().then(function (j) { return { ok: true, live: !!j.storage }; });
        throw 0;
      })
      .catch(function () {
        return sha(pw).then(function (hh) { return { ok: !!hh && hh === LOCAL_HASH, live: false }; });
      });
  }
  function showLogin() {
    root.textContent = '';
    var err = h('div', { class: 'adm-err' });
    var pw = h('input', { type: 'password', placeholder: 'Password', autocomplete: 'current-password' });
    var go = function () {
      if (!pw.value) return;
      err.textContent = 'Checking…';
      authenticate(pw.value).then(function (r) {
        if (!r.ok) { err.textContent = 'Wrong password.'; return; }
        st.pw = pw.value; st.live = r.live; sessionStorage.setItem(SS_KEY, pw.value);
        startPanel();
      });
    };
    pw.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    root.appendChild(h('div', { class: 'adm-login' }, [
      h('h2', {}, ['ADMIN ', h('span', { text: 'LOGIN' })]),
      h('p', { text: 'Enter the admin password to edit your portfolio.' }),
      pw,
      h('button', { class: 'adm-btn primary', type: 'button', text: 'LOGIN →', onclick: go }),
      h('button', { class: 'adm-btn', type: 'button', text: 'CLOSE', onclick: close, style: 'margin-top:.6rem' }),
      err
    ]));
    setTimeout(function () { pw.focus(); }, 50);
  }

  /* ---------- panel shell ---------- */
  function startPanel() {
    var base = S.current ? Promise.resolve(S.current) :
      fetch('content.json', { cache: 'no-store' }).then(function (r) { return r.json(); });
    base.then(function (c) { baseline = clone(c); draft = clone(c); buildShell(); })
      .catch(function () { toast('Could not load content.json'); });
  }
  var TABS = [['projects', 'PROJECTS'], ['hero', 'HERO / INTRO'], ['stats', 'STATS'], ['edu', 'EDUCATION & SKILLS'],
    ['process', 'WORK PROCESS'], ['quote', 'QUOTE & CONTACT'], ['social', 'SOCIAL & FOOTER'], ['data', 'BACKUP / DATA']];

  function buildShell() {
    root.textContent = '';
    chip = h('span', { class: 'adm-chip ' + (st.live ? 'live' : 'local'), text: st.live ? '● LIVE SYNC ON' : '● LOCAL MODE (this browser only)' });
    dirtyChip = h('span', { class: 'adm-chip dirty', text: 'UNSAVED CHANGES', style: 'display:none' });
    var head = h('div', { class: 'adm-head' }, [
      h('h2', {}, ['ADMIN ', h('span', { text: 'PANEL' })]),
      h('div', { class: 'adm-actions' }, [chip, dirtyChip,
        h('button', { class: 'adm-btn primary', type: 'button', text: 'SAVE & PUBLISH', onclick: save }),
        h('button', { class: 'adm-btn', type: 'button', text: 'VIEW SITE', onclick: close }),
        h('button', { class: 'adm-btn', type: 'button', text: 'LOGOUT', onclick: logout })])
    ]);
    tabsBar = h('div', { class: 'adm-tabs' });
    TABS.forEach(function (t) {
      tabsBar.appendChild(h('button', { class: 'adm-tab' + (st.tab === t[0] ? ' on' : ''), type: 'button', text: t[1], 'data-t': t[0],
        onclick: function () { st.tab = t[0]; Array.prototype.forEach.call(tabsBar.children, function (b) { b.classList.toggle('on', b.getAttribute('data-t') === st.tab); }); renderTab(); } }));
    });
    body = h('div', { class: 'adm-body' });
    root.appendChild(head); root.appendChild(tabsBar); root.appendChild(body);
    renderTab();
  }
  function renderTab() {
    body.textContent = '';
    var fn = { projects: tabProjects, hero: tabHero, stats: tabStats, edu: tabEdu, process: tabProcess, quote: tabQuote, social: tabSocial, data: tabData }[st.tab];
    body.appendChild(fn());
    body.scrollTop = 0;
  }

  /* ---------- helpers ---------- */
  function fld(label, obj, key, o) {
    o = o || {};
    var inp = o.area ? h('textarea', { rows: o.rows || 3 }) : h('input', { type: 'text' });
    inp.value = obj[key] == null ? '' : obj[key];
    if (o.ph) inp.placeholder = o.ph;
    inp.addEventListener('input', function () { obj[key] = inp.value; markDirty(); });
    return h('label', { class: 'adm-f' + (o.full ? ' full' : '') }, [h('span', { text: label }), inp, o.hint ? h('small', { text: o.hint }) : null]);
  }
  function move(a, i, d) { var j = i + d; if (j < 0 || j >= a.length) return; var t = a[i]; a[i] = a[j]; a[j] = t; markDirty(); renderTab(); }
  function del(a, i, what) { if (confirm('Delete this ' + what + '?')) { a.splice(i, 1); markDirty(); renderTab(); } }
  function ctrls(a, i, what) {
    return h('div', { class: 'adm-row' }, [
      h('button', { class: 'adm-btn sm', type: 'button', text: '↑', title: 'Move up', onclick: function () { move(a, i, -1); } }),
      h('button', { class: 'adm-btn sm', type: 'button', text: '↓', title: 'Move down', onclick: function () { move(a, i, 1); } }),
      h('button', { class: 'adm-btn sm danger', type: 'button', text: 'DELETE', onclick: function () { del(a, i, what); } })
    ]);
  }
  function addBtn(text, fn) { return h('button', { class: 'adm-btn primary', type: 'button', text: text, onclick: function () { fn(); markDirty(); renderTab(); } }); }
  function num2(i) { return ('0' + (i + 1)).slice(-2); }

  /* ---------- image upload ---------- */
  function compress(file, maxW, q) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () {
        var img = new Image();
        img.onload = function () {
          var s = Math.min(1, maxW / img.width), c = document.createElement('canvas');
          c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', q));
        };
        img.onerror = rej; img.src = fr.result;
      };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }
  function uploadImage(file) {
    var tries = [[1280, 0.8], [1100, 0.7], [900, 0.6]], i = 0;
    function attempt() {
      return compress(file, tries[i][0], tries[i][1]).then(function (data) {
        if (data.length > 900000 && i < tries.length - 1) { i++; return attempt(); }
        if (!st.live) {
          if (data.length > 500000) throw new Error('Image too large for local mode');
          return data;
        }
        var id = 'img_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        return api('img', 'POST', { id: id, dataUrl: data }).then(function (r) {
          if (!r.ok) throw new Error('Upload failed (' + r.status + ')');
          return '/api/data?k=img&id=' + id;
        });
      });
    }
    return attempt();
  }

  /* ---------- tabs ---------- */
  function tabProjects() {
    var w = h('div');
    w.appendChild(h('div', { class: 'adm-note', text: 'Each project card: edit name, category, live link and banner image. Click a card on the site opens its link in a new tab. Order here = order on the website (01, 02, 03…).' }));
    draft.projects.forEach(function (p, i) {
      var thumb = h('img', { class: 'adm-thumb', alt: '' }); thumb.src = S.safeImg(p.image);
      var imgIn = h('input', { type: 'text', placeholder: 'Image URL or upload →' });
      imgIn.value = (p.image || '').indexOf('data:') === 0 ? '(uploaded image)' : (p.image || '');
      imgIn.addEventListener('input', function () { p.image = imgIn.value; thumb.src = S.safeImg(p.image); markDirty(); });
      var file = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
      file.addEventListener('change', function () {
        if (!file.files[0]) return; toast('Uploading image…');
        uploadImage(file.files[0]).then(function (url) {
          p.image = url; thumb.src = S.safeImg(url); imgIn.value = url.indexOf('data:') === 0 ? '(uploaded image)' : url; markDirty(); toast('Image ready — press SAVE & PUBLISH');
        }).catch(function (e) { toast(e.message || 'Image failed'); });
      });
      w.appendChild(h('div', { class: 'adm-card' }, [
        h('div', { class: 'adm-card-top' }, [h('strong', { text: num2(i) }), ctrls(draft.projects, i, 'project')]),
        h('div', { class: 'adm-grid' }, [
          fld('Project name', p, 'title'), fld('Category', p, 'category'),
          fld('Live URL (opens in new tab)', p, 'url', { full: true, ph: 'https://…' }),
          h('div', { class: 'adm-f full' }, [h('span', { text: 'Banner image' }),
            h('div', { class: 'adm-imgrow' }, [thumb, imgIn, h('button', { class: 'adm-btn sm', type: 'button', text: 'UPLOAD', onclick: function () { file.click(); } }), file])])
        ])
      ]));
    });
    w.appendChild(addBtn('+ ADD PROJECT', function () { draft.projects.push({ id: 'p' + Date.now(), title: 'NEW PROJECT', category: 'CATEGORY', url: 'https://', image: '' }); }));
    return w;
  }
  function tabHero() {
    var h0 = draft.hero;
    return h('div', { class: 'adm-grid' }, [
      fld('Top bar (left)', h0, 'navLeft', { full: true }), fld('Top bar (right)', h0, 'navRight'), fld('Greeting', h0, 'greeting'),
      fld('Name', h0, 'name', { area: true, rows: 2, full: true, hint: 'Press Enter for a new line' }),
      fld('Title', h0, 'title', { area: true, rows: 2, full: true }),
      fld('Description', h0, 'desc', { area: true, rows: 5, full: true }),
      fld('Availability badge', h0, 'badge'), fld('Tagline', h0, 'tagline', { full: true })
    ]);
  }
  function tabStats() {
    var w = h('div');
    draft.stats.forEach(function (s, i) {
      w.appendChild(h('div', { class: 'adm-card' }, [h('div', { class: 'adm-card-top' }, [h('strong', { text: num2(i) }), ctrls(draft.stats, i, 'stat')]),
        h('div', { class: 'adm-grid' }, [fld('Number', s, 'num', { ph: '5+' }), fld('Label', s, 'label', { area: true, rows: 2 })])]));
    });
    w.appendChild(addBtn('+ ADD STAT', function () { draft.stats.push({ num: '0+', label: 'LABEL' }); }));
    return w;
  }
  function tabEdu() {
    var w = h('div'); w.appendChild(h('div', { class: 'adm-h', text: 'Education' }));
    draft.education.forEach(function (e, i) {
      w.appendChild(h('div', { class: 'adm-card' }, [h('div', { class: 'adm-card-top' }, [h('strong', { text: num2(i) }), ctrls(draft.education, i, 'education entry')]),
        h('div', { class: 'adm-grid' }, [fld('Degree / course', e, 'title'), fld('Institute', e, 'place'), fld('Years', e, 'year')])]));
    });
    w.appendChild(addBtn('+ ADD EDUCATION', function () { draft.education.push({ title: 'Course', place: 'Institute', year: '2026' }); }));
    w.appendChild(h('div', { class: 'adm-h', text: 'Skills' }));
    var tags = h('div', { class: 'adm-tags' });
    draft.skills.forEach(function (s, i) {
      tags.appendChild(h('span', { class: 'adm-tag' }, [s, h('button', { type: 'button', text: '×', title: 'Remove', onclick: function () { draft.skills.splice(i, 1); markDirty(); renderTab(); } })]));
    });
    w.appendChild(tags);
    var ni = h('input', { type: 'text', placeholder: 'New skill' });
    var add = function () { var v = ni.value.trim(); if (v) { draft.skills.push(v); markDirty(); renderTab(); } };
    ni.addEventListener('keydown', function (e) { if (e.key === 'Enter') add(); });
    w.appendChild(h('div', { class: 'adm-row' }, [ni, h('button', { class: 'adm-btn primary', type: 'button', text: 'ADD', onclick: add })]));
    return w;
  }
  function tabProcess() {
    var w = h('div');
    draft.process.forEach(function (p, i) {
      w.appendChild(h('div', { class: 'adm-card' }, [h('div', { class: 'adm-card-top' }, [h('strong', { text: num2(i) }), ctrls(draft.process, i, 'step')]),
        h('div', { class: 'adm-grid' }, [fld('Title', p, 'title'), fld('Icon (emoji / symbol)', p, 'icon'), fld('Text', p, 'text', { area: true, rows: 2, full: true })])]));
    });
    w.appendChild(addBtn('+ ADD STEP', function () { draft.process.push({ icon: '★', title: 'NEW STEP', text: 'Description' }); }));
    return w;
  }
  function tabQuote() {
    return h('div', {}, [
      h('div', { class: 'adm-h', text: 'Quote box' }),
      h('div', { class: 'adm-grid' }, [fld('Quote', draft.quote, 'text', { area: true, full: true }), fld('Signature', draft.quote, 'signature'), fld('Footer text', draft.quote, 'footer', { area: true, rows: 3 })]),
      h('div', { class: 'adm-h', text: 'Contact section' }),
      h('div', { class: 'adm-grid' }, [
        fld('Heading', draft.contact, 'heading', { area: true, rows: 2 }), fld('Text', draft.contact, 'text', { area: true, rows: 2 }),
        fld('Email', draft.contact, 'email'), fld('Phone (shown)', draft.contact, 'phone'), fld('Address', draft.contact, 'address', { full: true }),
        fld('WhatsApp number for messages', draft.contact, 'whatsapp', { full: true, hint: 'Country code + number, digits only. Example: 917057477861. The "Send message" form opens WhatsApp on this number.' })
      ])
    ]);
  }
  function tabSocial() {
    return h('div', { class: 'adm-grid' }, [
      fld('Instagram link', draft.socials, 'instagram', { full: true }), fld('LinkedIn link', draft.socials, 'linkedin', { full: true }),
      fld('Footer copyright text', draft.footer, 'copyright', { full: true })
    ]);
  }
  function tabData() {
    var imp = h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none' });
    imp.addEventListener('change', function () {
      var f = imp.files[0]; if (!f) return; var fr = new FileReader();
      fr.onload = function () { try { var j = JSON.parse(fr.result); if (!j.projects) throw 0; draft = j; markDirty(); renderTab(); toast('Imported — press SAVE & PUBLISH'); } catch (e) { toast('Invalid content file'); } };
      fr.readAsText(f);
    });
    return h('div', {}, [
      h('div', { class: 'adm-note' }, [st.live
        ? h('span', {}, [h('b', { text: 'Live sync is ON. ' }), 'Press SAVE & PUBLISH and the change appears for every visitor immediately.'])
        : h('span', {}, [h('b', { text: 'Local mode. ' }), 'Changes are saved only in this browser. To make them public for everyone: connect Upstash Redis (KV) in Vercel (see README), or download content.json below and replace the file in your project, then redeploy.'])]),
      h('div', { class: 'adm-row', style: 'flex-wrap:wrap' }, [
        h('button', { class: 'adm-btn primary', type: 'button', text: 'DOWNLOAD content.json', onclick: function () {
          var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' })); a.download = 'content.json'; a.click(); } }),
        h('button', { class: 'adm-btn', type: 'button', text: 'IMPORT content.json', onclick: function () { imp.click(); } }), imp,
        h('button', { class: 'adm-btn danger', type: 'button', text: 'RESET TO ORIGINAL', onclick: function () {
          if (!confirm('Reset everything to the original portfolio content?')) return;
          fetch('content.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (c) { draft = c; markDirty(); renderTab(); toast('Reset — press SAVE & PUBLISH'); }); } })
      ])
    ]);
  }

  /* ---------- save ---------- */
  function normUrl(u) { u = String(u || '').trim(); if (u && !/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u; return u; }
  function save() {
    draft.projects.forEach(function (p) { p.url = normUrl(p.url); if (!p.id) p.id = 'p' + Date.now(); });
    if (draft.socials) { draft.socials.instagram = normUrl(draft.socials.instagram); draft.socials.linkedin = normUrl(draft.socials.linkedin); }
    if (draft.contact) draft.contact.whatsapp = String(draft.contact.whatsapp || '').replace(/\D/g, '');
    var done = function (msg) { S.apply(clone(draft)); st.dirty = false; dirtyChip.style.display = 'none'; toast(msg); };
    if (st.live) {
      toast('Saving…');
      api('content', 'POST', { value: draft }).then(function (r) {
        if (r.ok) done('Saved & published ✓');
        else if (r.status === 413) toast('Too large — remove big images or use image URLs');
        else if (r.status === 401) toast('Session expired — login again');
        else toast('Save failed (' + r.status + ')');
      }).catch(function () { toast('Network error'); });
    } else {
      try { localStorage.setItem(S.LS_KEY, JSON.stringify(draft)); done('Saved in this browser ✓'); }
      catch (e) { toast('Browser storage full — use smaller images or image URLs'); }
    }
  }

  /* ---------- open / close ---------- */
  function close() {
    if (st.dirty && !confirm('You have unsaved changes. Close anyway?')) return;
    st.dirty = false; if (root) root.remove(); root = null; document.body.classList.remove('adm-open');
    if (location.hash === '#admin') history.replaceState(null, '', location.pathname + location.search);
  }
  function logout() { sessionStorage.removeItem(SS_KEY); st.pw = ''; st.dirty = false; showLogin(); }
  function open() {
    if (root) return;
    root = h('div', { class: 'adm-overlay' }); document.body.appendChild(root); document.body.classList.add('adm-open');
    var saved = sessionStorage.getItem(SS_KEY);
    if (saved) {
      authenticate(saved).then(function (r) { if (r.ok) { st.pw = saved; st.live = r.live; startPanel(); } else showLogin(); });
    } else showLogin();
  }
  window.AdminPanel = { open: open };
})();
