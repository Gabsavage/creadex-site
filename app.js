// Créadex site: data/creadex.json is generated from the game repository by tools/sync_game.py.
import { createBackdrop } from './backdrop.js?v=20261109b';
const TEXT = {
  fr: {
    search: 'Nom, n°, type…', reset: 'Effacer', filters: 'Filtres', type: 'Type', rarity: 'Rareté', show: 'Voir', all: 'Tous',
    none: 'Aucune créature trouvée', creatures: 'Créatures', count: (n, a, m) => `${n} créatures · ${a} illustrées · ${m} en 3D`,
    listCount: n => `${n} affichée${n > 1 ? 's' : ''}`, illustrated: 'Illustrées', in3d: 'En 3D',
    foot: 'Données du jeu : docs/creadex/creadex.csv de creatures-rumble.',
    category: 'Catégorie', hp: 'PV', atk: 'ATQ', spd: 'VIT', basic: 'Base', special: 'Spécial', soon: 'À venir',
    weak: 'Faiblesses', resist: 'Résistances', noneListed: 'Aucune', evolutions: 'Évolutions', size: 'Taille', form: 'Forme',
    zone: 'Zone', unassigned: 'Pas encore', lent: 'Prêtée', view3d: '3D', art: 'Dessin', turn: 'Turnaround', shiny: 'Shiny',
    loading: 'Chargement…', no3d: 'Modèle 3D à venir', noArt: 'Illustration à venir', provisional: 'stats provisoires',
    noStats: 'stats à définir', loadError: 'Impossible de charger le Créadex. Recharge la page.', tips: ['Touche une créature pour la voir en 3D.', 'Fais tourner le modèle 3D du doigt.', 'Le bouton Shiny montre la version rare d\'une créature.', 'Tape / pour chercher une créature.', 'Filtre par type avec les médaillons.'], provisionalHint: 'Stats de départ du jeu (aucune valeur dans le Créadex) · * attaque par défaut du type', prev: 'Précédente', next: 'Suivante', close: 'Fermer', inGame: 'EN JEU', anim: {
      Idle: 'Repos', Walk: 'Marche', Attack: 'Attaque', Special: 'Spécial', Hurt: 'Touché', Victory: 'Victoire', Spawn: 'Arrivée', Wobble: 'Capture', Faint: 'K.O.' },
    stage: ['Indépendante', 'Chibi', 'Medium', 'Imposante'],
  },
  en: {
    search: 'Name, no., type…', reset: 'Clear', filters: 'Filters', type: 'Type', rarity: 'Rarity', show: 'Show', all: 'All',
    none: 'No creatures found', creatures: 'Creatures', count: (n, a, m) => `${n} creatures · ${a} illustrated · ${m} in 3D`,
    listCount: n => `${n} shown`, illustrated: 'Illustrated', in3d: 'In 3D',
    foot: 'Game data: creatures-rumble docs/creadex/creadex.csv.',
    category: 'Category', hp: 'HP', atk: 'ATK', spd: 'SPD', basic: 'Basic', special: 'Special', soon: 'Coming soon',
    weak: 'Weaknesses', resist: 'Resistances', noneListed: 'None', evolutions: 'Evolutions', size: 'Size', form: 'Form',
    zone: 'Zone', unassigned: 'Not yet', lent: 'Lent', view3d: '3D', art: 'Art', turn: 'Turnaround', shiny: 'Shiny',
    loading: 'Loading…', no3d: '3D model coming soon', noArt: 'Artwork coming soon', provisional: 'provisional stats',
    noStats: 'stats to be set', loadError: 'Could not load the Créadex. Please reload the page.', tips: ['Tap a creature to see it in 3D.', 'Drag the 3D model to turn it around.', 'The Shiny button shows a creature\'s rare colors.', 'Press / to search for a creature.', 'Filter by type with the medallions.'], provisionalHint: 'Game starting stats (none in the Créadex yet) · * default attack of the type', prev: 'Previous', next: 'Next', close: 'Close', inGame: 'IN GAME', anim: {
      Idle: 'Idle', Walk: 'Walk', Attack: 'Attack', Special: 'Special', Hurt: 'Hurt', Victory: 'Victory', Spawn: 'Spawn', Wobble: 'Wobble', Faint: 'Faint' },
    stage: ['Independent', 'Chibi', 'Medium', 'Imposing'],
  },
};
const RARITY_FR = { Common: 'Commun', Uncommon: 'Peu commun', Rare: 'Rare', Epic: 'Épique', Legendary: 'Légendaire', Secret: 'Secrète' };
const MORPH_FR = { Biped: 'Bipède', Bird: 'Oiseau', Fish: 'Poisson', Quadruped: 'Quadrupède', Serpent: 'Serpent', Special: 'Spécial' };
const ANIMS = ['Idle', 'Walk', 'Attack', 'Special', 'Victory'];

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode */ } },
};

let lang = store.get('creadex-language') === 'fr' ? 'fr' : 'en';
let data = { elements: {}, rarities: {}, species: [] };
let habitats = {};
const state = { query: '', element: 'all', rarities: new Set(), flags: new Set(), ascending: true };
const byNumber = new Map();
let shown = [];
let active = null;
const view = { mode: '3d', shiny: false };
let viewer = null, viewerPromise = null;
let backdrop = null; // animated type backdrop of the detail page (backdrop.js)

const t = key => TEXT[lang][key];
const nameOf = s => lang === 'fr' ? s.nameFr : s.name;
const otherName = s => lang === 'fr' ? s.name : s.nameFr;
const elementName = e => lang === 'fr' ? (data.elements[e]?.fr || e) : e;
const rarityName = r => lang === 'fr' ? (RARITY_FR[r] || r) : r;
const morphName = m => lang === 'fr' ? (MORPH_FR[m] || m) : m;
const rarityColor = r => data.rarities[r] || '#bebebe';
const elementColor = e => data.elements[e]?.color || '#2d3032';
const tileOf = r => `url(assets/ui/tile_${String(r || 'Common').toLowerCase()}.png)`;
const elementIcon = (e, cls = 'el') => data.elements[e] ? `<img class="${cls}" src="assets/elements/${esc(e)}.webp" alt="${esc(elementName(e))}" title="${esc(elementName(e))}">` : '';
const artOf = s => s.portrait || s.image;

function tile(s, { number = true } = {}) {
  const art = artOf(s)
    ? `<img class="art" src="${esc(artOf(s))}" alt="" loading="lazy">`
    : `<img class="ghost" src="assets/elements/${esc(s.element)}.webp" alt="" loading="lazy">`;
  return `<div class="tile" style="--tile:${tileOf(s.rarity)}">${art}${elementIcon(s.element)}${number ? `<span class="num ol">${esc(s.number)}</span>` : ''}${s.model && number ? `<span class="flag ol">3D</span>` : ''}</div>`;
}

function card(s) {
  return `<button type="button" class="card" data-number="${esc(s.number)}" aria-label="${esc(nameOf(s))}, #${esc(s.number)}">
    ${tile(s)}<span class="card-name">${esc(nameOf(s))}</span><span class="card-sub">${esc(otherName(s))}</span></button>`;
}

function filtered() {
  const q = state.query.trim().toLocaleLowerCase();
  const list = data.species.filter(s => {
    if (state.element !== 'all' && s.element !== state.element) return false;
    if (state.rarities.size && !state.rarities.has(s.rarity)) return false;
    if (state.flags.has('art') && !s.image) return false;
    if (state.flags.has('3d') && !s.model) return false;
    if (!q) return true;
    return [s.number, s.name, s.nameFr, s.element, elementName(s.element), s.category, s.categoryFr, s.id]
      .some(v => String(v || '').toLocaleLowerCase().includes(q));
  });
  return list.sort((a, b) => (state.ascending ? 1 : -1) * a.number.localeCompare(b.number));
}

function renderGrid() {
  shown = filtered();
  $('grid').innerHTML = shown.map(card).join('');
  $('empty').hidden = shown.length > 0;
  $('list-count').textContent = t('listCount')(shown.length);
  $('sort-label').textContent = `N° ${state.ascending ? '↑' : '↓'}`;
}

function renderFilters() {
  const elements = Object.keys(data.elements);
  const pressed = on => `aria-pressed="${on}"`;
  $('type-row').innerHTML = `<button type="button" class="type-btn all ol" data-element="all" ${pressed(state.element === 'all')}>${esc(t('all'))}</button>`
    + elements.map(e => `<button type="button" class="type-btn" data-element="${esc(e)}" ${pressed(state.element === e)} aria-label="${esc(elementName(e))}" title="${esc(elementName(e))}"><img src="assets/elements/${esc(e)}.webp" alt=""></button>`).join('');
  const used = new Set(data.species.map(s => s.rarity));
  $('rarity-row').innerHTML = Object.keys(data.rarities).filter(r => used.has(r))
    .map(r => `<button type="button" class="pill ol" style="--c:${rarityColor(r)}" data-rarity="${esc(r)}" ${pressed(state.rarities.has(r))}>${esc(rarityName(r))}</button>`).join('');
  $('flag-row').innerHTML = [['art', t('illustrated')], ['3d', t('in3d')]]
    .map(([k, label]) => `<button type="button" class="pill neutral ol" data-flag="${k}" ${pressed(state.flags.has(k))}>${esc(label)}</button>`).join('');
  renderFilterDot();
}

function renderFilterDot() {
  $('filters-dot').hidden = !(state.rarities.size || state.flags.size);
}

function applyLanguage() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(n => { n.textContent = t(n.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(n => { n.placeholder = t(n.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  $('list-title').textContent = t('creatures');
  const all = data.species;
  $('head-count').textContent = t('count')(all.length, all.filter(s => s.image).length, all.filter(s => s.model).length);
  $('prev').setAttribute('aria-label', t('prev'));
  $('next').setAttribute('aria-label', t('next'));
  $('close').setAttribute('aria-label', t('close'));
}

// ── Detail page ─────────────────────────────────────────
function family(s) {
  return data.species.filter(x => x.family === s.family).sort((a, b) => a.number.localeCompare(b.number));
}

function statCase(key, icon, value, max = 110) {
  const w = value ? Math.max(6, Math.min(100, value / max * 100)) : 0;
  return `<div class="case stat"><span class="label-yellow ol"><img src="assets/icons/${icon}.webp" alt="">${esc(t(key))}</span><b class="ol">${value ?? '—'}</b><div class="bar"><i style="--w:${w}%"></i></div></div>`;
}

function attackRow(slot, attack) {
  const glyph = attack ? `assets/ui/glyph_attack_${attack.shape}.png` : 'assets/ui/glyph_lock.png';
  return `<div class="case attack"><img src="${glyph}" alt=""><span class="label-yellow ol">${esc(t(slot))}</span>${attack ? `<b class="ol">${esc(attack.name)}${attack.fallback ? ' <small>*</small>' : ''}</b>` : `<span class="muted">${esc(t('soon'))}</span>`}</div>`;
}

function iconsCase(key, list) {
  const icons = list.length ? list.map(e => elementIcon(e, '')).join('') : `<span class="none">${esc(t('noneListed'))}</span>`;
  return `<div class="case"><span class="label-yellow ol">${esc(t(key))}</span><div class="icons-row">${icons}</div></div>`;
}

function renderInfo(s) {
  const members = family(s);
  const stats = s.stats;
  const zone = s.zone && s.zone !== 'unassigned' ? s.zone[0].toUpperCase() + s.zone.slice(1) : t('unassigned');
  $('info').innerHTML = `
    <div class="info-top"><span class="label-yellow ol">${esc(lang === 'fr' ? s.categoryFr : s.category)}</span><span class="big ol">#${esc(s.number)}</span></div>
    <div class="stats">${statCase('hp', 'stat_hp', stats?.hp)}${statCase('atk', 'stat_atk', stats?.atk)}${statCase('spd', 'stat_spd', stats?.spd)}</div>
    ${stats?.fallback ? `<span class="hint">${esc(t('provisionalHint'))}</span>` : ''}
    ${attackRow('basic', s.basic)}${attackRow('special', s.special)}
    <div class="pair">${iconsCase('weak', s.weaknesses)}${iconsCase('resist', s.resistances)}</div>
    <div class="case"><p class="desc">${esc(lang === 'fr' ? s.descriptionFr : s.description)}</p></div>
    ${members.length > 1 ? `<div class="case"><span class="label-yellow ol">${esc(t('evolutions'))}</span><div class="evo">${members.map((m, i) =>
      `${i ? '<img class="evo-arrow" src="assets/ui/glyph_arrow.png" alt="">' : ''}<button type="button" class="evo-tile" data-number="${esc(m.number)}" ${m.number === s.number ? 'aria-current="true"' : ''}>${tile(m, { number: false })}<span class="ol">${esc(nameOf(m))}</span></button>`).join('')}</div></div>` : ''}
    <div class="facts">
      <div class="case"><span class="label-yellow ol">${esc(t('size'))}</span><b class="ol">${esc(s.size || '—')} · ${esc(s.studs ?? '—')} studs</b></div>
      <div class="case"><span class="label-yellow ol">${esc(t('form'))}</span><b class="ol">${esc(morphName(s.morphology) || '—')}</b></div>
      <div class="case"><span class="label-yellow ol">${esc(t('zone'))}</span><b class="ol">${esc(s.lent ? t('lent') : zone)}</b></div>
    </div>`;
}

function renderNameRow(s) {
  $('detail-name').textContent = nameOf(s);
  $('detail-tab').textContent = `Créadex · #${s.number}`;
  const shinyMark = view.shiny ? '<img class="shiny-star" src="assets/icons/shiny.webp" alt="Shiny">' : '';
  $('name-row').innerHTML = `<span class="rarity-pill ol" style="--c:${rarityColor(s.rarity)}">${esc(rarityName(s.rarity))}</span>${elementIcon(s.element, 'el-medal')}${shinyMark}`;
}

function modes(s) {
  return [['3d', 'glyph_camera', t('view3d'), true], ['art', 'glyph_collection', t('art'), !!s.image], ['turn', 'glyph_swap', t('turn'), !!s.turnaround]];
}

function renderSide(s) {
  const canShiny = s.model ? !!s.shinyTexture : !!s.portraitShiny; // a 3D model needs its own shiny texture
  $('side-col').innerHTML = modes(s).map(([mode, glyph, label, ok]) =>
    `<div class="square-cap"><button type="button" class="square" data-mode="${mode}" aria-pressed="${view.mode === mode}" ${ok ? '' : 'disabled'}><img src="assets/ui/${glyph}.png" alt=""></button><span class="ol">${esc(label)}</span></div>`).join('')
    + `<div class="square-cap"><button type="button" class="square" data-shiny aria-pressed="${view.shiny}" ${canShiny ? '' : 'disabled'}><img src="assets/ui/sparkle.png" alt=""></button><span class="ol">${esc(t('shiny'))}</span></div>`;
}

async function getViewer() {
  if (!viewerPromise) viewerPromise = import('./viewer.js?v=20261109b').then(m => m.createViewer);
  return viewerPromise;
}

function flat(html, note) {
  return `<div class="flat">${html}</div>${note ? `<span class="note ol">${esc(note)}</span>` : ''}`;
}

async function renderStage(s) {
  const stage = $('stage');
  $('stage-actions').innerHTML = '';
  const releaseViewer = () => { viewer?.dispose(); viewer = null; };
  if (view.mode === 'art' && s.image) { releaseViewer(); stage.innerHTML = flat(`<img src="${esc(s.image)}" alt="${esc(nameOf(s))}">`); return; }
  if (view.mode === 'turn' && s.turnaround) { releaseViewer(); stage.innerHTML = flat(`<img class="turn" src="${esc(s.turnaround)}" alt="${esc(nameOf(s))} turnaround">`); return; }
  // 3D: the habitat of its type, the creature on it when it has a model.
  const fallback = s.model ? null : (artOf(s) ? `<img src="${esc(view.shiny && s.portraitShiny ? s.portraitShiny : artOf(s))}" alt="${esc(nameOf(s))}">` : `<img class="ghost" src="assets/elements/${esc(s.element)}.webp" alt="">`);
  // Loading card (the viewer's code, then the model): label + bar filled by the download progress.
  const loading = `<div class="loading"><span class="ol">${esc(t('loading'))}</span><div class="mini-bar"><i></i></div></div>`;
  if (!viewer) stage.innerHTML = loading;
  const setBar = k => { const bar = stage.querySelector('.mini-bar i'); if (bar) bar.style.width = `${Math.round(8 + k * 92)}%`; };
  try {
    const create = await getViewer();
    if (active !== s || view.mode !== '3d') return;
    if (!viewer) { stage.innerHTML = ''; viewer = create(stage); }
    stage.querySelectorAll('.flat, .note, .loading').forEach(n => n.remove());
    if (fallback) stage.insertAdjacentHTML('beforeend', flat(fallback, s.image ? t('no3d') : t('noArt')));
    else stage.insertAdjacentHTML('beforeend', loading);
    const shown3d = await viewer.show({ model: s.model, shinyTexture: s.shinyTexture, element: s.element, color: elementColor(s.element), habitats, shiny: view.shiny, onProgress: setBar });
    if (active === s) stage.querySelectorAll('.loading').forEach(n => n.remove());
    if (!shown3d || active !== s) return;
    $('stage-actions').innerHTML = ANIMS.filter(a => shown3d.actions.includes(a)).map(a =>
      `<button type="button" class="btn ${a === 'Idle' ? 'btn-gold' : 'btn-secondary'}" data-anim="${a}"><span class="ol">${esc(t('anim')[a])}</span></button>`).join('');
  } catch (error) {
    console.error(error);
    releaseViewer();
    if (active === s) stage.innerHTML = flat(fallback || (artOf(s) ? `<img src="${esc(artOf(s))}" alt="">` : ''), t('no3d'));
  }
}

function openDetail(s, { push = true } = {}) {
  if (!s) return;
  const changed = active !== s;
  active = s;
  if (changed) { view.shiny = false; view.mode = '3d'; }
  $('detail').style.setProperty('--el', elementColor(s.element));
  $('detail-back').style.setProperty('--el', elementColor(s.element));
  backdrop ??= createBackdrop($('detail-back'));
  backdrop.setType(s.element, elementColor(s.element));
  backdrop.start();
  paintBrowserChrome(backdrop.lightColor());
  renderNameRow(s); renderSide(s); renderInfo(s);
  if (changed) renderStage(s);
  const dlg = $('detail');
  if (dlg.hidden) { dlg.hidden = false; document.body.classList.add('locked'); dlg.scrollTop = 0; $('close').focus({ preventScroll: true }); }
  if (push && location.hash !== `#${s.id}`) {
    // The phone's back button closes the page: one history entry while the page is open.
    if (history.state?.dex) history.replaceState({ dex: true }, '', `#${s.id}`);
    else history.pushState({ dex: true }, '', `#${s.id}`);
  }
}

// Safari draws the page under its translucent bars: while a sheet is open, the document itself
// takes the type's color (and the list behind is hidden), so nothing of the list shows there.
const themeMeta = document.querySelector('meta[name="theme-color"]');
const defaultTheme = themeMeta?.content;
function paintBrowserChrome(color) {
  document.documentElement.style.backgroundColor = color || '';
  if (themeMeta) themeMeta.content = color || defaultTheme;
}

function closeDetail({ fromHistory = false } = {}) {
  if ($('detail').hidden) return;
  $('detail').hidden = true;
  backdrop?.stop();
  paintBrowserChrome(null);
  document.body.classList.remove('locked');
  viewer?.dispose(); viewer = null;
  const last = active; active = null;
  if (!fromHistory) {
    if (history.state?.dex) history.back();
    else history.replaceState(null, '', location.pathname + location.search);
  }
  document.querySelector(`.card[data-number="${last?.number}"]`)?.focus({ preventScroll: false });
}

function step(delta) {
  const list = shown.length ? shown : data.species;
  const i = list.indexOf(active);
  openDetail(list[(i + delta + list.length) % list.length]);
}

function bind() {
  $('search').addEventListener('input', e => { state.query = e.target.value; renderGrid(); });
  $('filters-btn').addEventListener('click', () => {
    const open = $('more-filters').classList.toggle('open');
    $('filters-btn').setAttribute('aria-expanded', String(open));
  });
  $('sort').addEventListener('click', () => { state.ascending = !state.ascending; renderGrid(); });
  const reset = () => { state.query = ''; $('search').value = ''; state.element = 'all'; state.rarities.clear(); state.flags.clear(); renderFilters(); renderGrid(); };
  $('reset').addEventListener('click', reset);
  $('empty-reset').addEventListener('click', reset);
  $('type-row').addEventListener('click', e => { const b = e.target.closest('[data-element]'); if (!b) return; state.element = b.dataset.element; renderFilters(); renderGrid(); });
  $('rarity-row').addEventListener('click', e => { const b = e.target.closest('[data-rarity]'); if (!b) return; const r = b.dataset.rarity; state.rarities.has(r) ? state.rarities.delete(r) : state.rarities.add(r); renderFilters(); renderGrid(); });
  $('flag-row').addEventListener('click', e => { const b = e.target.closest('[data-flag]'); if (!b) return; const f = b.dataset.flag; state.flags.has(f) ? state.flags.delete(f) : state.flags.add(f); renderFilters(); renderGrid(); });
  $('grid').addEventListener('click', e => { const c = e.target.closest('.card'); if (c) openDetail(byNumber.get(c.dataset.number)); });
  document.querySelector('.lang').addEventListener('click', e => {
    const b = e.target.closest('[data-lang]'); if (!b || b.dataset.lang === lang) return;
    lang = b.dataset.lang; store.set('creadex-language', lang); applyLanguage(); renderFilters(); renderGrid();
    if (active) { renderNameRow(active); renderSide(active); renderInfo(active); renderStage(active); }
  });
  $('close').addEventListener('click', () => closeDetail());
  $('prev').addEventListener('click', () => step(-1));
  $('next').addEventListener('click', () => step(1));
  $('info').addEventListener('click', e => { const b = e.target.closest('[data-number]'); if (b) openDetail(byNumber.get(b.dataset.number)); });
  $('side-col').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled || !active) return;
    if (b.dataset.mode) { if (view.mode === b.dataset.mode) return; view.mode = b.dataset.mode; renderSide(active); renderStage(active); return; }
    view.shiny = !view.shiny; renderSide(active); renderNameRow(active);
    if (viewer && active.model) viewer.setShiny(view.shiny); else if (view.mode === '3d') renderStage(active);
  });
  $('stage-actions').addEventListener('click', e => {
    const b = e.target.closest('[data-anim]'); if (!b) return;
    viewer?.play(b.dataset.anim);
    $('stage-actions').querySelectorAll('.btn').forEach(x => { x.classList.toggle('btn-gold', x === b); x.classList.toggle('btn-secondary', x !== b); });
  });
  document.addEventListener('keydown', e => {
    if (!$('detail').hidden) {
      if (e.key === 'Escape') closeDetail();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      return;
    }
    if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') { e.preventDefault(); $('search').focus(); }
  });
  window.addEventListener('hashchange', openFromHash);
  $('detail').addEventListener('scroll', () => $('detail').classList.toggle('scrolled', $('detail').scrollTop > 8), { passive: true });
}

function openFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  const s = id && data.species.find(x => x.id === id || x.number === id);
  if (s) openDetail(s, { push: false }); else if (!id) closeDetail({ fromHistory: true });
}

// ── Loading screen (markup and style inline in index.html) ─────────────
const loaderUi = {
  shown: performance.now(),
  value: 0.04,
  set(k) {
    this.value = Math.max(this.value, Math.min(1, k));
    const fill = $('loader-fill');
    if (fill) fill.style.width = `${Math.round(this.value * 100)}%`;
  },
  tip() {
    const tips = t('tips');
    const el = $('loader-tip');
    if (el && tips) el.textContent = tips[Math.floor(Math.random() * tips.length)];
  },
  async done() {
    this.set(1);
    const wait = Math.max(250, 900 - (performance.now() - this.shown)); // never a flash
    await new Promise(r => setTimeout(r, wait));
    const el = $('loader');
    if (!el) return;
    el.classList.add('done');
    setTimeout(() => el.remove(), 600);
    // Warm the 3D viewer's code while the reader looks at the list.
    const idle = window.requestIdleCallback || (f => setTimeout(f, 1200));
    idle(() => getViewer().catch(() => {}));
  },
  fail() {
    const label = $('loader-label');
    if (label) label.textContent = t('loadError');
    $('loader')?.querySelector('.loader-bar')?.remove();
  },
};

// Images of the first cards on screen: the list appears with its pictures, not empty tiles.
function preloadFirstCards(onEach) {
  const perRow = Math.max(2, Math.floor((innerWidth - 40) / (innerWidth < 720 ? 104 : 164)));
  const rows = Math.ceil(innerHeight / (innerWidth < 720 ? 170 : 230)) + 1;
  const first = shown.slice(0, perRow * rows);
  const urls = [...new Set(first.map(s => artOf(s) || `assets/elements/${s.element}.webp`))];
  if (!urls.length) return Promise.resolve();
  let count = 0;
  return Promise.all(urls.map(url => new Promise(resolve => {
    const img = new Image();
    img.onload = img.onerror = () => { count += 1; onEach(count / urls.length); resolve(); };
    img.src = url;
  })));
}

async function start() {
  bind();
  applyLanguage();
  loaderUi.tip();
  loaderUi.set(0.1);
  const fonts = (document.fonts?.ready || Promise.resolve()).then(() => loaderUi.set(loaderUi.value + 0.1));
  try {
    const [creadex, hab] = await Promise.all([
      fetch('data/creadex.json?v=20261109b', { cache: 'no-cache' }).then(r => r.json()),
      fetch('data/habitats.json?v=20261109b').then(r => r.json()).catch(() => ({ habitats: {} })),
    ]);
    data = creadex; habitats = hab.habitats || {};
    data.species.forEach(s => byNumber.set(s.number, s));
  } catch (error) {
    console.error(error);
    $('grid').innerHTML = `<p class="ol">${esc(t('loadError'))}</p>`;
    loaderUi.fail();
    return;
  }
  loaderUi.set(0.45);
  applyLanguage(); renderFilters(); renderGrid();
  // The pictures of the first screen (50 % of the bar), at most 8 s: a slow image never blocks the site.
  const base = loaderUi.value;
  await Promise.race([
    Promise.all([fonts, preloadFirstCards(k => loaderUi.set(base + k * (0.97 - base)))]),
    new Promise(r => setTimeout(r, 8000)),
  ]);
  await loaderUi.done();
  openFromHash();
}

start();
