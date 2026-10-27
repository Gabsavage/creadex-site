const TYPE_META={
  'Normal':{color:'#bbcbd1',symbol:'◌',badge:'normal',en:'Normal'},'Feu':{color:'#ff875f',symbol:'✦',badge:'feu',en:'Fire'},'Eau':{color:'#55d7ff',symbol:'◒',badge:'eau',en:'Water'},
  'Nature':{color:'#8fe275',symbol:'❋',badge:'nature',en:'Nature'},'Foudre':{color:'#ffe16b',symbol:'ϟ',badge:'foudre',en:'Lightning'},'Vent':{color:'#8be7da',symbol:'≋',badge:'vent',en:'Wind'},
  'Terre':{color:'#dfad78',symbol:'⬡',badge:'terre',en:'Earth'},'Glace':{color:'#a6e5ff',symbol:'❄',badge:'glace',en:'Ice'},'Toxique':{color:'#d290eb',symbol:'☣',badge:'toxique',en:'Toxic'},
  'Métal':{color:'#c6c9cf',symbol:'⬢',badge:'metal',en:'Metal'},'Ombre':{color:'#ac91ff',symbol:'◐',badge:'ombre',en:'Shadow'},'Lumière':{color:'#fff19a',symbol:'✧',badge:'lumiere',en:'Light'}
};
const TEXT={
  fr:{menu:'MENU',families:'FAMILLES',types:'TYPES',world:'MONDE RUMBLE',exploreMode:'MODE EXPLORATION',dexReady:'CRÉADEX PRÊT',guideTag:'TON GUIDE DES CRÉATURES',tagline:'Toutes les créatures de ton aventure, réunies ici.',creatures:'CRÉATURES',illustrated:'ILLUSTRÉES',featured:'À LA UNE',creatureList:'Les créatures',searchPlaceholder:'Nom, numéro, type…',sortLabel:'TRI : N°',allTypes:'TOUS LES TYPES',filters:'FILTRES',clear:'EFFACER',stageFilter:'STADE',chibi:'Chibi évolutif',medium:'Medium',imposing:'Imposant',independent:'Indépendant',rarityFilter:'RARETÉ',allRarities:'Toutes les raretés',morphologyFilter:'MORPHOLOGIE',allForms:'Toutes les formes',familyFilter:'FAMILLE',allFamilies:'Toutes les familles',noCreatures:'Aucune créature trouvée',tryAnother:'Essaie un autre nom ou retire un filtre.',clearFilters:'Effacer les filtres',notSet:'À DÉFINIR',noWeakness:'Aucune faiblesse renseignée',noResistance:'Aucune résistance renseignée',weaknesses:'FAIBLESSES',resistances:'RÉSISTANCES',stats:'STATS',balance:'· À ÉQUILIBRER',evolutions:'ÉVOLUTIONS',size:'TAILLE',upcoming:'ILLUSTRATION À VENIR',family:'FAMILLE',independentStage:'INDÉPENDANT',chibiStage:'CHIBI',mediumStage:'MEDIUM',imposingStage:'IMPOSANT',legendaryStage:'LÉGENDAIRE',secretStage:'SECRET',morphFree:'Morphologie libre',type:'TYPE',creature:'CRÉATURE',sortAsc:'TRI : N° ↑',sortDesc:'TRI : N° ↓',energy:'ÉNERGIE DU DEX',ready:'PRÊT',close:'Fermer',typeFilterAria:'Filtrer par type'},
  en:{menu:'MENU',families:'FAMILIES',types:'TYPES',world:'RUMBLE WORLD',exploreMode:'EXPLORE MODE',dexReady:'DEX READY',guideTag:'YOUR CREATURE GUIDE',tagline:'Every creature in your adventure, gathered here.',creatures:'CREATURES',illustrated:'ILLUSTRATED',featured:'FEATURED',creatureList:'Creatures',searchPlaceholder:'Name, number, type…',sortLabel:'SORT: NO.',allTypes:'ALL TYPES',filters:'FILTERS',clear:'CLEAR',stageFilter:'STAGE',chibi:'Chibi',medium:'Medium',imposing:'Imposing',independent:'Independent',rarityFilter:'RARITY',allRarities:'All rarities',morphologyFilter:'FORM',allForms:'All forms',familyFilter:'FAMILY',allFamilies:'All families',noCreatures:'No creatures found',tryAnother:'Try another name or remove a filter.',clearFilters:'Clear filters',notSet:'TO BE SET',noWeakness:'No weaknesses listed',noResistance:'No resistances listed',weaknesses:'WEAKNESSES',resistances:'RESISTANCES',stats:'STATS',balance:'· TO BE BALANCED',evolutions:'EVOLUTIONS',size:'SIZE',upcoming:'ARTWORK COMING SOON',family:'FAMILY',independentStage:'INDEPENDENT',chibiStage:'CHIBI',mediumStage:'MEDIUM',imposingStage:'IMPOSING',legendaryStage:'LEGENDARY',secretStage:'SECRET',morphFree:'Free-form',type:'TYPE',creature:'CREATURE',sortAsc:'SORT: NO. ↑',sortDesc:'SORT: NO. ↓',energy:'DEX POWER',ready:'READY',close:'Close',typeFilterAria:'Filter by type'}
};
const RARITY_EN={'Commun':'Common','Peu commun':'Uncommon','Rare':'Rare','Épique':'Epic','Légendaire':'Legendary','Secrète':'Secret'};
const MORPH_EN={'Bipède':'Biped','Oiseau':'Bird','Poisson':'Fish','Quadrupède':'Quadruped','Serpent':'Serpent','Spécial':'Special'};
let language=localStorage.getItem('creadex-language')==='en'?'en':'fr';
const RARITY_COLOR={'Commun':'#a9bac0','Peu commun':'#77d795','Rare':'#68c7ff','Épique':'#d18bff','Légendaire':'#ffd36a','Secrète':'#ff80bd'};
const byNumber=new Map();let species=[];let selectedType='all';let ascending=true;let activeSpecies=null;
const $=id=>document.getElementById(id);
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const typeColor=type=>TYPE_META[type]?.color||'#48e1da';
const clean=value=>String(value??'').trim();
const t=key=>TEXT[language][key]||TEXT.fr[key]||key;
const typeLabel=type=>language==='en'?(TYPE_META[type]?.en||type):type;
const morphLabel=value=>language==='en'?(MORPH_EN[value]||value):value;
const rarityLabel=value=>language==='en'?(RARITY_EN[value]||value):value;
const displayName=s=>language==='en'?(s.nameEn||s.nameFr):s.nameFr;
const familyLabel=family=>{const representative=species.find(s=>s.nameFr===family);return representative?displayName(representative):family};
const stageTitle=s=>({0:t('independentStage'),1:t('chibiStage'),2:t('mediumStage'),3:t('imposingStage'),4:t('legendaryStage'),5:t('secretStage')}[Number(s)]||t('creature'));
const starText=n=>Number(n)>0?'✦'.repeat(Math.min(Number(n),5)):`0★`;
function applyLanguage(){
  document.documentElement.lang=language;
  document.querySelectorAll('[data-i18n]').forEach(node=>{const value=t(node.dataset.i18n);if(node.children.length&&node.firstChild?.nodeType===Node.TEXT_NODE)node.firstChild.nodeValue=value+' ';else node.textContent=value});
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node=>node.placeholder=t(node.dataset.i18nPlaceholder));
  document.querySelectorAll('[data-i18n-aria]').forEach(node=>node.setAttribute('aria-label',t(node.dataset.i18nAria)));
  document.querySelectorAll('[data-rarity]').forEach(option=>option.textContent=rarityLabel(option.dataset.rarity));
  document.querySelectorAll('[data-lang]').forEach(button=>{const active=button.dataset.lang===language;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});
  $('rarity-filter')?.setAttribute('aria-label',language==='en'?'Filter by rarity':'Filtrer par rareté');
  $('morph-filter')?.setAttribute('aria-label',language==='en'?'Filter by form':'Filtrer par morphologie');
  $('family-filter')?.setAttribute('aria-label',language==='en'?'Filter by family':'Filtrer par famille');
}

function typeButton(type){
  const meta=TYPE_META[type]||{color:'#48e1da',symbol:'◈'};
  return `<button class="type-chip" data-type="${escapeHTML(type)}" style="--type-color:${meta.color}">${typeIcon(type,'type-symbol')}${escapeHTML(typeLabel(type).toUpperCase())}</button>`;
}
function typeIcon(type,className='type-icon'){
  const meta=TYPE_META[type];
  return meta?.badge?`<img class="${className}" src="assets/types/${meta.badge}.png" alt="" aria-hidden="true">`:`<span class="${className}" aria-hidden="true">${meta?.symbol||'◈'}</span>`;
}
function speciesTypes(s){return String(s.typeFr||'').split(/[;,/+]/).map(clean).filter(type=>TYPE_META[type]);}
function fillSelect(id,values,label,format=value=>value){
  const select=$(id); if(!select)return;
  const selected=select.value;const unique=[...new Set(values.map(clean).filter(Boolean))].sort((a,b)=>format(a).localeCompare(format(b),language));
  const first=select.options[0]; select.innerHTML='';select.append(first);
  unique.forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=format(value);select.append(option)});
  if([...select.options].some(option=>option.value===selected))select.value=selected;
}
function initFilters(){
  const types=[...new Set(species.map(s=>clean(s.typeFr)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));
  $('type-filters').innerHTML=types.map(typeButton).join('');
  fillSelect('morph-filter',species.map(s=>s.morphology),t('allForms'),morphLabel);
  fillSelect('family-filter',species.map(s=>s.family),t('allFamilies'),familyLabel);
  $('total-count').textContent=species.length.toString().padStart(3,'0');
  $('illustrated-count').textContent=species.filter(s=>s.image).length.toString().padStart(2,'0');
  const familySizes=species.reduce((counts,s)=>{const family=clean(s.family)||s.nameFr;counts.set(family,(counts.get(family)||0)+1);return counts},new Map());
  $('family-count').textContent=[...familySizes.values()].filter(count=>count>1).length.toString().padStart(2,'0');
  const feature=species.find(s=>s.image)||species[0];
  if(feature){$('hero-creature').innerHTML=feature.image?`<img src="${escapeHTML(feature.image)}" alt="">`:`<span class="hero-placeholder">✦</span>`;$('hero-readout').innerHTML=`<span>${t('featured')} · #${feature.number}</span><b>${escapeHTML(displayName(feature).toUpperCase())}</b>`}
  $('hero-creature').setAttribute('aria-hidden','true');
}
function selectedStars(){return [...document.querySelectorAll('input[name="star"]:checked')].map(input=>Number(input.value))}
function getFiltered(){
  const query=clean($('search').value).toLocaleLowerCase(language==='en'?'en':'fr');
  const rarity=$('rarity-filter').value,morph=$('morph-filter').value,family=$('family-filter').value,stars=selectedStars();
  const list=species.filter(s=>{
    const matchesQuery=!query||[s.number,s.nameFr,s.nameEn,s.typeFr,s.typeEn,s.family,familyLabel(s.family),s.morphology,morphLabel(s.morphology),s.descriptionFr,s.descriptionEn,s.categoryFr,s.categoryEn].some(v=>clean(v).toLocaleLowerCase(language==='en'?'en':'fr').includes(query));
    return matchesQuery&&(selectedType==='all'||speciesTypes(s).includes(selectedType))&&(rarity==='all'||s.rarity===rarity)&&(morph==='all'||s.morphology===morph)&&(family==='all'||s.family===family)&&(!stars.length||stars.includes(Number(s.stars)));
  });
  return list.sort((a,b)=>ascending?a.number.localeCompare(b.number):b.number.localeCompare(a.number));
}
function card(s){
  const meta=TYPE_META[s.typeFr]||{color:'#48e1da',symbol:'◈'};const rarity=RARITY_COLOR[s.rarity]||'#a9bac0';
  const types=speciesTypes(s);const name=displayName(s);const art=s.image?`<img src="${escapeHTML(s.image)}" alt="${language==='en'?'Illustration of':'Illustration de'} ${escapeHTML(name)}" loading="lazy">`:`<div class="art-missing"><span class="sigil">${typeIcon(s.typeFr,'sigil-icon')}</span><small>${t('upcoming')}</small></div>`;
  return `<article class="creature-card" data-number="${escapeHTML(s.number)}" tabindex="0" role="button" aria-label="${language==='en'?'Open':'Ouvrir'} ${escapeHTML(name)}">
    <div class="card-top"><span class="dex-number"><b>${language==='en'?'NO.':'N°'}</b> ${escapeHTML(s.number)}</span><span class="card-stars" title="${escapeHTML(stageTitle(s.stars))}">${starText(s.stars)}</span></div>
    <div class="card-art" style="--art-accent:${meta.color}">${art}</div>
    <div class="card-info"><div class="card-name-row"><span class="card-name">${escapeHTML(name)}</span><i class="rarity-dot" style="--rarity:${rarity}" title="${escapeHTML(rarityLabel(s.rarity))}"></i></div>
      <div class="card-name-en">${escapeHTML(language==='en'?s.nameFr:s.nameEn)}</div>
      <div class="card-tags">${types.length?types.map(type=>`<span class="tag type" style="--type-color:${typeColor(type)}">${typeIcon(type,'tag-type-icon')}${escapeHTML(typeLabel(type))}</span>`).join(''):`<span class="tag type">${t('notSet')}</span>`}<span class="tag">${escapeHTML(morphLabel(s.morphology)||t('morphFree'))}</span></div>
      <div class="card-family">${t('family')} <b>${escapeHTML(familyLabel(s.family||s.nameFr))}</b></div>
    </div></article>`;
}
function render(){
  const list=getFiltered();$('creature-grid').innerHTML=list.map(card).join('');$('filtered-count').textContent=list.length.toString().padStart(3,'0');$('results-label').textContent=`${list.length} ${t('creatures')}`;
  $('empty-state').hidden=list.length!==0;$('creature-grid').hidden=list.length===0;
  document.querySelectorAll('.creature-card').forEach(el=>{const activate=()=>openDetail(byNumber.get(el.dataset.number));el.addEventListener('click',activate);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate()}})});
}
function familyMembers(s){return species.filter(item=>(clean(s.family)&&clean(item.family)===clean(s.family))||item.number===s.number).sort((a,b)=>a.number.localeCompare(b.number));}
function typePill(type){const meta=TYPE_META[type]||{color:'#48e1da',symbol:'◈'};return `<span class="detail-type" style="color:${meta.color};background:${meta.color}12">${typeIcon(type,'detail-type-icon')}${escapeHTML(typeLabel(type).toUpperCase())}</span>`}
function typeSummary(types,empty){return types.length?types.filter(t=>TYPE_META[t]).map(t=>`<span class="summary-type">${typeIcon(t,'summary-type-icon')}${escapeHTML(typeLabel(t))}</span>`).join(''):`<span>${empty}</span>`}
function weaknessSummary(s){return typeSummary(s.weaknesses,t('noWeakness'))}
function resistanceSummary(s){return typeSummary(s.resistances.filter(value=>value!=='—'),t('noResistance'))}
function statRow(label,value){const n=Number(value);const width=Number.isFinite(n)&&n>0?Math.min(100,Math.max(5,n/2)) : 0;return `<div class="stat-row"><span>${label}</span><div class="stat-track"><div class="stat-fill" style="--fill:${width}%"></div></div><span class="stat-value">${n||'—'}</span></div>`}
function openDetail(s){
  if(!s)return;activeSpecies=s;const members=familyMembers(s);const name=displayName(s);const art=s.image?`<img src="${escapeHTML(s.image)}" alt="${language==='en'?'Illustration of':'Illustration de'} ${escapeHTML(name)}">`:`<span class="detail-no-art">${typeIcon(s.typeFr,'detail-placeholder-icon')}</span>`;
  const types=speciesTypes(s).map(typePill).join('');
  $('detail-content').innerHTML=`<div class="detail-layout"><div class="detail-visual">${art}<div class="detail-visual-label">#${s.number} / ${escapeHTML(stageTitle(s.stars))}</div></div>
  <div class="detail-data"><div class="detail-overline">${escapeHTML(language==='en'?(s.categoryEn||'Creature'):s.categoryFr||'Créature')}</div><div class="detail-title-row"><h2 class="detail-title">${escapeHTML(name)}</h2><span class="detail-number">#${escapeHTML(s.number)}</span></div>
  <div class="detail-english">${escapeHTML(language==='en'?s.nameFr:s.nameEn)} · ${escapeHTML(language==='en'?(s.categoryEn||'Creature'):s.categoryFr||'Créature')}</div><div class="detail-category">${escapeHTML(stageTitle(s.stars))} <span style="color:#ffe04b">${starText(s.stars)}</span>　/　${escapeHTML(morphLabel(s.morphology)||t('morphFree'))}</div>
  <p class="detail-desc">${escapeHTML(language==='en'?(s.descriptionEn||s.descriptionFr||''):s.descriptionFr||'')}</p><div class="detail-types">${types}</div>
  <div class="detail-split"><div class="detail-mini"><span>${t('weaknesses')}</span><b>${weaknessSummary(s)}</b></div><div class="detail-mini"><span>${t('resistances')}</span><b>${resistanceSummary(s)}</b></div></div>
  <section class="detail-stats"><h3>${t('stats')} <i style="font-style:normal;color:#ffdf42">${t('balance')}</i></h3>${statRow(language==='en'?'HP':'PV',s.hp)}${statRow(language==='en'?'ATK':'ATQ',s.atk)}${statRow(language==='en'?'SPD':'VIT',s.speed)}</section>
  <section class="evo-section"><h3 class="evo-title">${t('evolutions')}</h3><div class="evo-chain">${members.map((m,i)=>`${i?'<span class="evo-arrow">›</span>':''}<button class="evo-node ${m.number===s.number?'active':''}" data-evo="${m.number}"><b>${escapeHTML(displayName(m))}</b><span>#${escapeHTML(m.number)} · ${escapeHTML(stageTitle(m.stars))}</span></button>`).join('')}</div></section>
  <div class="detail-footer">${speciesTypes(s).map(typeLabel).map(escapeHTML).join(' / ')||t('notSet')}　·　${t('size')}: ${escapeHTML(s.studs||'—')} ${language==='en'?'STUDS':'STUDS'}</div></div></div>`;
  const dlg=$('detail-dialog');$('dialog-backdrop').classList.add('open');dlg.showModal();
  dlg.querySelectorAll('[data-evo]').forEach(button=>button.addEventListener('click',()=>openDetail(byNumber.get(button.dataset.evo))));
}
function closeDetail(){const dlg=$('detail-dialog');if(dlg.open)dlg.close();$('dialog-backdrop').classList.remove('open')}
function resetFilters(){selectedType='all';$('search').value='';$('rarity-filter').value='all';$('morph-filter').value='all';$('family-filter').value='all';document.querySelectorAll('input[name="star"]').forEach(i=>i.checked=false);document.querySelectorAll('.type-chip').forEach(b=>b.classList.toggle('selected',b.dataset.type==='all'));render()}
async function start(){
  applyLanguage();
  try{const response=await fetch('data/species.json');species=await response.json();species.forEach(s=>byNumber.set(s.number,s));initFilters();render();}
  catch(error){console.error(error);$('creature-grid').innerHTML='<p class="load-error">Impossible de charger les données du Créadex.</p>';}
  $('search').addEventListener('input',render);$('rarity-filter').addEventListener('change',render);$('morph-filter').addEventListener('change',render);$('family-filter').addEventListener('change',render);
  document.querySelectorAll('input[name="star"]').forEach(input=>input.addEventListener('change',render));
  $('type-filters').addEventListener('click',event=>{const button=event.target.closest('[data-type]');if(!button)return;selectedType=button.dataset.type;document.querySelectorAll('.type-chip').forEach(el=>el.classList.toggle('selected',el.dataset.type===selectedType));render()});
  document.querySelector('.type-chip[data-type="all"]').addEventListener('click',()=>{selectedType='all';document.querySelectorAll('.type-chip').forEach(el=>el.classList.toggle('selected',el.dataset.type==='all'));render()});
  $('sort-button').addEventListener('click',()=>{ascending=!ascending;$('sort-button').querySelector('span').textContent=ascending?'TRI : N° ↑':'TRI : N° ↓';render()});
  $('reset-filters').addEventListener('click',resetFilters);$('empty-reset').addEventListener('click',resetFilters);$('dialog-close').addEventListener('click',closeDetail);$('dialog-backdrop').addEventListener('click',closeDetail);$('detail-dialog').addEventListener('close',()=>$('dialog-backdrop').classList.remove('open'));
  $('families-shortcut').addEventListener('click',()=>{$('family-filter').focus();$('family-filter').scrollIntoView({behavior:'smooth',block:'center'})});$('types-shortcut').addEventListener('click',()=>$('type-filters').scrollIntoView({behavior:'smooth',block:'center'}));
  document.querySelector('.language-toggle').addEventListener('click',event=>{const button=event.target.closest('[data-lang]');if(button)changeLanguage(button.dataset.lang)});
  $('mobile-menu').addEventListener('click',()=>$('filter-panel').classList.toggle('mobile-open'));
  document.addEventListener('keydown',event=>{if(event.key==='/'&&document.activeElement.tagName!=='INPUT'){event.preventDefault();$('search').focus()}if(event.key==='Escape')closeDetail()});
}
function changeLanguage(next){
  if(!['fr','en'].includes(next)||next===language)return;
  language=next;localStorage.setItem('creadex-language',language);applyLanguage();initFilters();
  document.querySelectorAll('.type-chip').forEach(button=>button.classList.toggle('selected',button.dataset.type===selectedType));
  render();if(activeSpecies)openDetail(byNumber.get(activeSpecies.number));
}
start();
