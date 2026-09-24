/* 9rawZid9ra UI components (ES module). Generated from the design system bundle. Styles: ./qz.css + ./tokens.css */
import React from 'react';

  var h = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;

  function cx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) { if (arguments[i]) out.push(arguments[i]); }
    return out.join(' ');
  }
  function rest(props, keys) {
    var o = {};
    for (var k in props) { if (Object.prototype.hasOwnProperty.call(props, k) && keys.indexOf(k) === -1) o[k] = props[k]; }
    return o;
  }

  /* ---- Icons: 24px stroke icons, 1.75 stroke, currentColor (Feather-compatible, as react-icons/fi in the app) ---- */
  var P = {
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
    bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
    message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    check: 'M20 6L9 17l-5-5',
    x: 'M18 6L6 18M6 6l12 12',
    info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
    alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
    up: 'M18 15l-6-6-6 6',
    down: 'M6 9l6 6 6-6',
    right: 'M9 18l6-6-6-6',
    file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
    bookmark: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
    reply: 'M9 17l-5-5 5-5M20 18v-2a4 4 0 0 0-4-4H4',
    flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
    send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z',
    inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
    plus: 'M12 5v14M5 12h14',
    trash: 'M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2',
    sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
    moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
    monitor: 'M3 4h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 21h8M12 17v4',
    menu: 'M3 12h18M3 6h18M3 18h18',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    'log-out': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'
  };
  function Icon(props) {
    return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', width: props.size || 16, height: props.size || 16 },
      h('path', { d: P[props.name] || '' }));
  }

  /* ---- Wordmark ---- */
  function Wordmark(props) {
    var Tag = (props.linkAs && props.href !== null) ? props.linkAs : 'a';
    var p = { className: cx('qz-wordmark', props.size === 'lg' && 'qz-wordmark--lg'), 'aria-label': '9rawZid9ra, accueil' };
    if (Tag === 'a') p.href = props.href || '/'; else p.to = props.href || '/';
    return h(Tag, p,
      props.logoSrc ? h('img', { src: props.logoSrc, alt: '' }) : null,
      h('span', null, '9raw', h('b', null, 'Zid'), '9ra'));
  }

  /* ---- Button ---- */
  function Button(props) {
    var v = props.variant || 'primary';
    var cls = cx('qz-btn', 'qz-btn--' + v, props.size && props.size !== 'md' && 'qz-btn--' + props.size, props.block && 'qz-btn--block', props.iconOnly && 'qz-btn--icon', props.className);
    var p = rest(props, ['variant', 'size', 'block', 'icon', 'iconRight', 'iconOnly', 'loading', 'children', 'className', 'as', 'linkAs']);
    p.className = cls;
    if (props.loading) { p['aria-busy'] = 'true'; p.disabled = true; }
    var Tag = props.as || (props.href ? 'a' : 'button');
    if (props.linkAs && props.href) { Tag = props.linkAs; p.to = p.href; delete p.href; }
    if (Tag === 'button' && !p.type) p.type = 'button';
    return h(Tag, p,
      props.loading ? h('span', { className: 'qz-spinner', 'aria-hidden': 'true' }) : (props.icon ? h(Icon, { name: props.icon }) : null),
      props.iconOnly ? null : props.children,
      props.iconRight ? h(Icon, { name: props.iconRight }) : null);
  }

  /* ---- Input ---- */
  function Input(props) {
    var id = props.id || ('qz-' + String(props.label || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    var p = rest(props, ['label', 'optional', 'hint', 'error', 'multiline', 'maxLength', 'counter', 'id']);
    p.id = id; p.className = 'qz-input';
    if (props.error) p['aria-invalid'] = 'true';
    if (props.hint || props.error) p['aria-describedby'] = id + '-hint';
    if (props.maxLength) p.maxLength = props.maxLength;
    var len = typeof props.value === 'string' ? props.value.length : (typeof props.defaultValue === 'string' ? props.defaultValue.length : 0);
    return h('div', { className: 'qz-field' },
      props.label ? h('label', { className: 'qz-label', htmlFor: id }, props.label, props.optional ? h('small', null, '(optionnel)') : null) : null,
      h(props.multiline ? 'textarea' : 'input', p),
      (props.hint || props.error || props.counter) ? h('div', { style: { display: 'flex', gap: 8 } },
        (props.hint || props.error) ? h('span', { id: id + '-hint', className: cx('qz-hint', props.error && 'qz-hint--error') }, props.error || props.hint) : null,
        props.counter && props.maxLength ? h('span', { className: 'qz-counter' }, len + '/' + props.maxLength) : null) : null);
  }

  /* ---- SearchBar ---- */
  function SearchBar(props) {
    var compact = props.variant === 'compact';
    return h('form', { className: cx('qz-search', compact && 'qz-search--compact'), role: 'search', onSubmit: function (e) { e.preventDefault(); var input = e.currentTarget.querySelector('input'); if (props.onSubmit) props.onSubmit(input ? input.value : '', e); } },
      h(Icon, { name: 'search', size: 18 }),
      h('input', { ref: props.inputRef, type: 'search', placeholder: props.placeholder || 'Module, filière ou école…', defaultValue: props.defaultValue, onChange: props.onChange, 'aria-label': props.placeholder || 'Rechercher' }),
      props.shortcut ? h('span', { className: 'qz-kbd' }, props.shortcut) : null,
      compact ? null : h(Button, { type: 'submit', variant: 'primary' }, props.submitLabel || 'Rechercher'));
  }

  /* ---- Chip ---- */
  function Chip(props) {
    var p = rest(props, ['selected', 'count', 'children']);
    p.className = 'qz-chip'; p.type = 'button'; p['aria-pressed'] = props.selected ? 'true' : 'false';
    return h('button', p, props.children, props.count != null ? h('span', { className: 'qz-count' }, props.count) : null);
  }

  /* ---- Tabs ---- */
  function Tabs(props) {
    var init = props.value || (props.items && props.items[0] && props.items[0].id);
    var st = useState(init); var cur = st[0]; var set = st[1];
    return h('div', { className: cx('qz-tabs', props.variant === 'pill' && 'qz-tabs--pill'), role: 'tablist', 'aria-label': props.label },
      (props.items || []).map(function (it) {
        return h('button', { key: it.id, className: 'qz-tab', role: 'tab', type: 'button', 'aria-selected': cur === it.id ? 'true' : 'false', onClick: function () { set(it.id); if (props.onChange) props.onChange(it.id); } },
          it.label, it.count != null ? h('span', { className: 'qz-count' }, it.count) : null);
      }));
  }

  /* ---- Badge ---- */
  function Badge(props) {
    var tone = props.tone || 'neutral';
    return h('span', { className: cx('qz-badge', tone !== 'neutral' && 'qz-badge--' + tone) },
      props.dot ? h('span', { className: 'qz-dot' }) : (props.icon ? h(Icon, { name: props.icon }) : null), props.children);
  }

  /* ---- DocType ---- */
  var TYPES = {
    examen: ['exam', 'Exam', 'Examen final'], projet_final: ['exam', 'Projet', 'Projet final'],
    cc: ['cc', 'CC', 'Contrôle continu'], td: ['td', 'TD', 'Travaux dirigés'], tp: ['tp', 'TP', 'Travaux pratiques'],
    cours: ['cours', 'Cours', 'Cours'], quiz: ['cours', 'Quiz', 'Quiz'],
    corrige_examen: ['corrige', 'Corr. Exam', 'Corrigé examen'], corrige_td: ['corrige', 'Corr. TD', 'Corrigé TD'], corrige_tp: ['corrige', 'Corr. TP', 'Corrigé TP']
  };
  function DocType(props) {
    var t = TYPES[props.type] || ['', props.type, props.type];
    return h('span', { className: cx('qz-type', t[0] && 'qz-type--' + t[0], props.size === 'lg' && 'qz-type--lg'), title: t[2] }, props.size === 'lg' ? t[1].replace('Corr. ', 'C.') : t[1]);
  }

  /* ---- Card ---- */
  function Card(props) {
    var p = rest(props, ['href', 'flush', 'children', 'className', 'linkAs']);
    p.className = cx('qz-card', props.href && 'qz-card--link', props.flush && 'qz-card--flush', props.className);
    var Tag = props.href ? 'a' : 'div';
    if (props.href) p.href = props.href;
    if (props.linkAs && props.href) { Tag = props.linkAs; p.to = p.href; delete p.href; }
    return h(Tag, p, props.children);
  }

  /* ---- ModuleCard ---- */
  function ModuleCard(props) {
    var pct = Math.max(0, Math.min(100, props.completeness || 0));
    return h(Card, { href: props.href || '#', className: 'qz-module' },
      h('div', { className: 'qz-module__top' },
        h('span', { className: 'qz-eyebrow' }, 'S' + props.semester + (props.school ? ' · ' + props.school : '')),
        props.bookmarked ? h(Badge, { tone: 'brand', icon: 'bookmark' }, 'Suivi') : null),
      h('h3', { className: 'qz-module__name' }, props.name),
      props.filiere ? h('p', { className: 'qz-module__path' }, props.filiere) : null,
      h('div', { className: 'qz-module__types' }, (props.types || []).length ? props.types.map(function (t) { return h(DocType, { key: t, type: t }); }) : h(Badge, { tone: 'warning' }, 'Aucun document — sois le premier')),
      h('div', { className: 'qz-module__foot' },
        h('span', { className: 'qz-meta' }, h('b', null, props.docs || 0), ' docs'),
        h('span', { className: 'qz-bar', title: pct + '% complet', role: 'img', 'aria-label': pct + '% des types de documents disponibles' }, h('span', { style: { width: pct + '%' } }))));
  }

  /* ---- DocumentRow ---- */
  function DocumentRow(props) {
    return h('div', { className: 'qz-row' },
      h(DocType, { type: props.type, size: 'lg' }),
      h('div', { className: 'qz-row__main' },
        h('p', { className: 'qz-row__title' }, props.title),
        h('div', { className: 'qz-meta' },
          props.year ? h('span', null, props.year) : null,
          props.professor ? h('span', null, props.professor) : null,
          props.pages ? h('span', null, props.pages + ' p.') : null,
          props.downloads != null ? h('span', null, props.downloads + ' ↓') : null,
          props.verified ? h(Badge, { tone: 'success', icon: 'check' }, 'Vérifié') : null)),
      h('div', { className: 'qz-row__actions' },
        h(Button, { variant: 'ghost', size: 'sm', icon: 'eye', iconOnly: true, 'aria-label': 'Aperçu' }),
        h(Button, { variant: 'secondary', size: 'sm', icon: 'download' }, 'Télécharger')));
  }

  /* ---- SchoolCard ---- */
  function SchoolCard(props) {
    var tone = { 'Public': 'accent', 'Privé': 'brand', 'Semi-public': 'neutral' }[props.kind] || 'neutral';
    return h(Card, { href: props.href || '#', className: 'qz-school' },
      h('div', { className: 'qz-school__row' }, h('span', { className: 'qz-eyebrow' }, props.abbr), props.kind ? h(Badge, { tone: tone }, props.kind) : null),
      h('h3', { className: 'qz-school__name' }, props.name),
      h('span', { className: 'qz-muted', style: { fontSize: 13, lineHeight: '20px' } }, props.city),
      h('div', { className: 'qz-school__stats' }, h('span', null, h('b', null, props.filieres), ' filières'), h('span', null, h('b', null, props.docs), ' docs')));
  }

  /* ---- StatStrip ---- */
  function StatStrip(props) {
    return h('div', { className: 'qz-stats' }, (props.items || []).map(function (s, i) {
      return h('div', { className: 'qz-stat', key: i }, h('div', { className: 'qz-stat__n' }, s.value), h('div', { className: 'qz-stat__l' }, s.label), s.delta ? h('div', { className: 'qz-stat__d' }, s.delta) : null);
    }));
  }

  /* ---- Avatar ---- */
  function Avatar(props) {
    var initials = String(props.name || '?').split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
    return h('span', { className: cx('qz-avatar', props.size && props.size !== 'md' && 'qz-avatar--' + props.size, props.founder && 'qz-avatar--founder'), title: props.name + (props.founder ? ' · Fondateur' : '') },
      props.src ? h('img', { src: props.src, alt: '' }) : initials,
      props.online ? h('span', { className: 'qz-avatar__status', 'aria-label': 'en ligne' }) : null);
  }

  /* ---- Navbar ---- */
  function Navbar(props) {
    var links = props.links || [{ label: 'Explorer', href: '/browse' }, { label: 'Senpai Zone', href: '/senpai' }, { label: 'Mes modules', href: '/my-modules' }, { label: 'AI Coach', href: '/ai-coach' }];
    var LinkTag = props.linkAs || 'a';
    function navLink(l) {
      if (l.onClick) return h('button', { key: l.href || l.label, type: 'button', 'aria-current': props.current === l.href ? 'page' : undefined, onClick: l.onClick }, l.label);
      var p = { key: l.href, 'aria-current': props.current === l.href ? 'page' : undefined };
      if (LinkTag === 'a') p.href = l.href; else p.to = l.href;
      return h(LinkTag, p, l.label);
    }
    return h('header', { className: cx('qz-navbar', props.className) },
      h(Wordmark, { logoSrc: props.logoSrc, linkAs: props.linkAs, href: '/' }),
      h('nav', { className: 'qz-nav', 'aria-label': 'Principal' }, links.map(navLink)),
      h('div', { className: 'qz-navbar__search' }, h(SearchBar, { variant: 'compact', placeholder: 'Rechercher un module', shortcut: '/', onSubmit: props.onSearch, inputRef: props.searchRef })),
      h('div', { className: 'qz-navbar__end' },
        props.onToggleTheme ? h(ThemeToggle, { mode: props.themeMode, onToggle: props.onToggleTheme }) : null,
        props.user ? [
          h('button', { key: 'm', className: 'qz-iconbtn', 'aria-label': 'Messages' }, h(Icon, { name: 'message' })),
          props.notifications || h('button', { key: 'n', className: 'qz-iconbtn', 'aria-label': (props.unread || 0) + ' notifications' }, h(Icon, { name: 'bell' }), props.unread ? h('span', { className: 'qz-pip' }, props.unread) : null),
          h(Button, { key: 'u', variant: 'primary', size: 'sm', icon: 'upload', href: '/upload', linkAs: props.linkAs }, 'Partager'),
          props.userMenu || h(Avatar, { key: 'a', name: props.user, size: 'sm', founder: props.founder })
        ] : [
          h(Button, { key: 'l', variant: 'ghost', size: 'sm', href: '/login', linkAs: props.linkAs }, 'Connexion'),
          h(Button, { key: 'r', variant: 'primary', size: 'sm', href: '/register', linkAs: props.linkAs }, 'Créer un compte')
        ],
        props.mobileMenu ? h('span', { className: 'qz-navbar__mobile' }, props.mobileMenu) : null));
  }

  /* ---- Breadcrumb ---- */
  function Breadcrumb(props) {
    var items = props.items || [];
    var LinkTag = props.linkAs || 'a';
    return h('nav', { 'aria-label': 'Fil d’Ariane' }, h('ol', { className: 'qz-crumbs' }, items.map(function (it, i) {
      var last = i === items.length - 1;
      if (last) return h('li', { key: i }, h('span', { 'aria-current': 'page' }, it.label));
      var p = {};
      if (LinkTag === 'a') p.href = it.href || '#'; else p.to = it.href || '#';
      return h('li', { key: i }, h(LinkTag, p, it.label));
    })));
  }

  /* ---- EmptyState ---- */
  function EmptyState(props) {
    return h('div', { className: 'qz-empty' },
      h('div', { className: 'qz-empty__icon' }, h(Icon, { name: props.icon || 'inbox' })),
      h('h3', { className: 'qz-h3' }, props.title),
      props.children ? h('p', null, props.children) : null,
      props.action || null);
  }

  /* ---- Modal ---- */
  function Modal(props) {
    var cancelRef = useRef(null);
    useEffect(function () {
      function onKey(e) { if (e.key === 'Escape' && props.onClose) props.onClose(); }
      window.addEventListener('keydown', onKey);
      var t = setTimeout(function () { if (cancelRef.current) cancelRef.current.focus(); }, 0);
      return function () { window.removeEventListener('keydown', onKey); clearTimeout(t); };
    }, []);
    return h('div', { className: 'qz-scrim', onClick: props.onClose },
      h('div', { className: 'qz-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'qz-modal-t', onClick: function (e) { e.stopPropagation(); } },
        h('h2', { className: 'qz-modal__title', id: 'qz-modal-t' }, props.title),
        h('p', { className: 'qz-modal__body' }, props.children),
        h('div', { className: 'qz-modal__actions' },
          props.onClose ? h('button', { type: 'button', ref: cancelRef, className: 'qz-btn qz-btn--secondary', onClick: props.onClose }, props.cancelLabel || 'Annuler') : null,
          h('button', { type: 'button', className: 'qz-btn qz-btn--' + (props.danger ? 'danger' : 'primary'), onClick: props.onConfirm }, props.confirmLabel || 'Confirmer'))));
  }

  /* ---- Toast ---- */
  function Toast(props) {
    var tone = props.tone || 'success';
    var ic = { success: 'check', error: 'x', info: 'info' }[tone];
    return h('div', { className: 'qz-toast qz-toast--' + tone, role: 'status' },
      h('span', { className: 'qz-toast__icon' }, h(Icon, { name: ic })),
      h('div', null, props.title, props.children ? h('small', null, props.children) : null));
  }

  /* ---- Banner ---- */
  function Banner(props) {
    var tone = props.tone || 'info';
    return h('div', { className: cx('qz-banner', tone !== 'info' && 'qz-banner--' + tone), role: tone === 'danger' ? 'alert' : 'status' },
      h(Icon, { name: tone === 'info' ? 'info' : 'alert' }), h('span', null, props.children), props.action || null);
  }

  /* ---- Dropzone ---- */
  function Dropzone(props) {
    var st = useState(false); var over = st[0]; var setOver = st[1];
    return h('div', null,
      h('label', { className: 'qz-drop', 'data-over': over ? 'true' : 'false', onDragOver: function (e) { e.preventDefault(); setOver(true); }, onDragLeave: function () { setOver(false); }, onDrop: function (e) { e.preventDefault(); setOver(false); } },
        h('input', { type: 'file', multiple: true, hidden: true }),
        h('span', { className: 'qz-drop__icon' }, h(Icon, { name: 'upload' })),
        h('strong', null, 'Glisse tes fichiers ici ou ', h('u', null, 'parcours')),
        h('span', { className: 'qz-hint' }, props.hint || 'PDF, DOCX, PPTX, XLSX, TXT, IPYNB ou images · 20 Mo max')),
      (props.files || []).length ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 } }, props.files.map(function (f, i) {
        return h('div', { className: 'qz-file', key: i },
          h('span', { className: 'qz-file__ext' }, f.ext),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontSize: 14, lineHeight: '20px', fontWeight: 550, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, f.name),
            f.progress != null && f.progress < 100 ? h('div', { className: 'qz-progress' }, h('span', { style: { width: f.progress + '%' } })) : h('span', { className: 'qz-meta' }, f.size)),
          f.progress != null && f.progress < 100 ? h('span', { className: 'qz-meta' }, f.progress + '%') : h(Button, { variant: 'ghost', size: 'sm', icon: 'x', iconOnly: true, 'aria-label': 'Retirer ' + f.name }));
      })) : null);
  }

  /* ---- PostCard ---- */
  function PostCard(props) {
    var st = useState(props.voted || false); var voted = st[0]; var setVoted = st[1];
    var score = (props.score || 0) + (voted && !props.voted ? 1 : 0) - (!voted && props.voted ? 1 : 0);
    return h(Card, { className: 'qz-post' },
      h('div', { className: 'qz-vote' },
        h('button', { type: 'button', 'aria-pressed': voted ? 'true' : 'false', 'aria-label': 'Voter utile', onClick: function () { setVoted(!voted); } }, h(Icon, { name: 'up', size: 18 })),
        h('span', null, score)),
      h('div', null,
        h('div', { className: 'qz-post__head' },
          h(Avatar, { name: props.author, size: 'sm', founder: props.founder }),
          h('strong', null, props.author),
          props.founder ? h(Badge, { tone: 'founder', icon: 'star' }, 'Fondateur') : null,
          props.moderator ? h(Badge, { tone: 'accent' }, 'Modérateur') : null,
          h('span', null, '· ' + (props.ago || ''))),
        h('p', { className: 'qz-post__body' }, props.children),
        h('div', { className: 'qz-post__foot' },
          (props.tags || []).map(function (t) { return h(Badge, { key: t }, '#' + t); }),
          h('span', { style: { flex: 1 } }),
          h(Button, { variant: 'ghost', size: 'sm', icon: 'reply' }, (props.replies || 0) + ' réponses'),
          h(Button, { variant: 'ghost', size: 'sm', icon: 'flag', iconOnly: true, 'aria-label': 'Signaler' }))));
  }

  /* ---- Messenger ---- */
  function Messenger(props) {
    return h('div', { className: 'qz-chat' },
      h('div', { className: 'qz-chat__head' },
        h(Avatar, { name: props.name, size: 'sm', online: true }),
        h('div', null, h('strong', null, props.name), h('small', null, 'En ligne')),
        h('button', { className: 'qz-iconbtn', 'aria-label': 'Fermer' }, h(Icon, { name: 'x' }))),
      h('div', { className: 'qz-chat__body' },
        (props.messages || []).map(function (m, i) { return h('div', { key: i, className: 'qz-bubble qz-bubble--' + (m.me ? 'out' : 'in') }, m.text, m.time ? h('time', null, m.time) : null); }),
        props.typing ? h('div', { className: 'qz-typing', 'aria-label': 'en train d’écrire' }, h('i'), h('i'), h('i')) : null),
      h('form', { className: 'qz-chat__compose', onSubmit: function (e) { e.preventDefault(); } },
        h('input', { className: 'qz-input', placeholder: 'Écris un message…', 'aria-label': 'Message', maxLength: 1000 }),
        h(Button, { variant: 'primary', icon: 'send', iconOnly: true, 'aria-label': 'Envoyer', type: 'submit' })));
  }

  /* ---- Paywall ---- */
  function Paywall(props) {
    return h('div', { className: 'qz-paywall' },
      h(Badge, { tone: 'accent', icon: 'sparkle' }, 'Bientôt'),
      h('div', null, h('h3', { className: 'qz-h2' }, props.title || 'AI Coach'), h('p', { className: 'qz-muted', style: { margin: '6px 0 0', fontSize: 14, lineHeight: '22px' } }, props.children)),
      h('div', { className: 'qz-price' }, h('b', null, props.price || '39'), h('span', null, 'MAD / mois')),
      h('ul', { className: 'qz-checks' }, (props.features || []).map(function (f, i) { return h('li', { key: i }, h(Icon, { name: 'check' }), f); })),
      h(Button, { variant: 'primary', size: 'lg', block: true }, props.cta || 'Me prévenir au lancement'),
      h('span', { className: 'qz-hint', style: { textAlign: 'center' } }, props.note || 'Version gratuite avec pubs disponible.'));
  }

  /* ---- Skeleton ---- */
  function Skeleton(props) {
    return h('div', { className: 'qz-skel', 'aria-hidden': 'true', style: { width: props.width || '100%', height: props.height || 16, borderRadius: props.round ? 999 : undefined } });
  }

  /* ---- ThemeToggle ---- */
  function ThemeToggle(props) {
    var mode = props.mode || 'dark';
    var icon = mode === 'light' ? 'sun' : mode === 'system' ? 'monitor' : 'moon';
    var label = mode === 'light' ? 'Thème clair' : mode === 'system' ? 'Thème système' : 'Thème sombre';
    return h('button', { type: 'button', className: 'qz-iconbtn', onClick: props.onToggle, 'aria-label': 'Changer de thème (actuel : ' + label + ')', title: label },
      h(Icon, { name: icon }));
  }

  /* ---- Select ---- */
  function Select(props) {
    var id = props.id || ('qz-' + String(props.label || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    var p = rest(props, ['label', 'optional', 'hint', 'error', 'options', 'id', 'className']);
    p.id = id; p.className = cx('qz-input', 'qz-select', props.className);
    if (props.error) p['aria-invalid'] = 'true';
    if (props.hint || props.error) p['aria-describedby'] = id + '-hint';
    return h('div', { className: 'qz-field' },
      props.label ? h('label', { className: 'qz-label', htmlFor: id }, props.label, props.optional ? h('small', null, '(optionnel)') : null) : null,
      h('select', p, (props.options || []).map(function (o) {
        var val = (o && typeof o === 'object') ? o.value : o;
        var lab = (o && typeof o === 'object') ? o.label : o;
        return h('option', { key: val, value: val }, lab);
      })),
      (props.hint || props.error) ? h('span', { id: id + '-hint', className: cx('qz-hint', props.error && 'qz-hint--error') }, props.error || props.hint) : null);
  }

  /* ---- Switch ---- */
  function Switch(props) {
    var id = props.id || ('qz-switch-' + String(props.label || 'toggle').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    return h('label', { className: 'qz-switch', htmlFor: id },
      h('input', { type: 'checkbox', id: id, role: 'switch', className: 'qz-switch__input', checked: !!props.checked, onChange: props.onChange, disabled: props.disabled }),
      h('span', { className: 'qz-switch__track', 'aria-hidden': 'true' }, h('span', { className: 'qz-switch__thumb' })),
      props.label ? h('span', { className: 'qz-switch__label' }, props.label) : null);
  }

  /* ---- Sheet (bottom sheet / side drawer) ---- */
  function Sheet(props) {
    useEffect(function () {
      function onKey(e) { if (e.key === 'Escape' && props.onClose) props.onClose(); }
      window.addEventListener('keydown', onKey);
      return function () { window.removeEventListener('keydown', onKey); };
    }, []);
    return h('div', { className: 'qz-scrim', onClick: props.onClose },
      h('div', { className: cx('qz-sheet', props.side === 'right' && 'qz-sheet--right'), role: 'dialog', 'aria-modal': 'true', 'aria-label': props.title, onClick: function (e) { e.stopPropagation(); } },
        props.title ? h('div', { className: 'qz-sheet__head' },
          h('h2', { className: 'qz-h3' }, props.title),
          h('button', { type: 'button', className: 'qz-iconbtn', 'aria-label': 'Fermer', onClick: props.onClose }, h(Icon, { name: 'x' }))) : null,
        h('div', { className: 'qz-sheet__body' }, props.children)));
  }

  /* ---- Dropdown (menu list) ---- */
  function Dropdown(props) {
    return h('div', { className: cx('qz-dropdown', props.className), role: 'menu' }, (props.items || []).map(function (it, i) {
      if (it.divider) return h('div', { key: i, className: 'qz-dropdown__sep', role: 'separator' });
      return h('button', { key: i, type: 'button', className: cx('qz-dropdown__item', it.danger && 'qz-dropdown__item--danger'), role: 'menuitem', onClick: it.onClick }, it.icon ? h(Icon, { name: it.icon }) : null, it.label);
    }));
  }

  /* ---- Pagination / LoadMore ---- */
  function Pagination(props) {
    var page = props.page || 1, pages = props.pages || 1;
    return h('nav', { className: 'qz-pagination', 'aria-label': 'Pagination' },
      h(Button, { variant: 'ghost', size: 'sm', iconOnly: true, 'aria-label': 'Page précédente', disabled: page <= 1, onClick: function () { if (props.onChange) props.onChange(page - 1); } }, h('span', { style: { display: 'inline-flex', transform: 'rotate(180deg)' } }, h(Icon, { name: 'right' }))),
      h('span', { className: 'qz-pagination__label' }, page + ' / ' + pages),
      h(Button, { variant: 'ghost', size: 'sm', icon: 'right', iconOnly: true, 'aria-label': 'Page suivante', disabled: page >= pages, onClick: function () { if (props.onChange) props.onChange(page + 1); } }));
  }
  function LoadMore(props) {
    return h('div', { className: 'qz-loadmore' }, h(Button, { variant: 'secondary', loading: props.loading, disabled: props.disabled, onClick: props.onClick }, props.loading ? 'Chargement…' : (props.label || 'Charger plus')));
  }

  /* ---- ProgressBar ---- */
  function ProgressBar(props) {
    var pct = Math.max(0, Math.min(100, props.value || 0));
    return h('div', { className: 'qz-progressbar', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('span', { style: { width: pct + '%' } }));
  }

  export { Wordmark, Button, Input, SearchBar, Chip, Tabs, Badge, DocType, Card, ModuleCard, DocumentRow, SchoolCard, StatStrip, Avatar, Navbar, Breadcrumb, EmptyState, Modal, Toast, Banner, Dropzone, PostCard, Messenger, Paywall, Skeleton, Icon, ThemeToggle, Select, Switch, Sheet, Dropdown, Pagination, LoadMore, ProgressBar };
