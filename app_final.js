/*
  app_final.js - Final build v2.2
  - Fetch categories and recipes from live URLs
  - Use field `image` for recipe images
  - Ingredients as bullet list (no checkboxes)
  - Steps as ordered list
  - Loader spinner while fetching
  - Service worker registration (sw_final.js)
*/

const DATA_URL = 'https://gampil.github.io/resep/data.json';
const CAT_URL = 'https://gampil.github.io/resep/kategori.json';
let RECIPES = [];
let CATEGORIES = [];
const state = { favorites: new Set() };

function normalizeExternalItem(item){
  const id = item.id ? String(item.id) : (item.judul || Math.random().toString(36).slice(2,9));
  const title = item.judul || item.title || 'Tanpa Judul';
  const slug = (title || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') + '-' + id;
  const description = item.deskripsi || '';
  const category = item.category_name || item.category || '';
  const cid = item.cid !== undefined ? item.cid : null;
  const image = item.image || '';
  // parse bahan -> array of cleaned lines
  let bahanRaw = (item.bahan || '').replace(/<br\s*\/?>/gi, '\n').replace(/\r/g,'');
  const bahanLines = bahanRaw.split('\n').map(s=>s.trim()).filter(s=>s.length>0);
  const ingredients = bahanLines.map(line=> line.replace(/^[-\d\.\)\s]+/, '').trim());
  // parse langkah -> ordered steps
  let langkahRaw = (item.langkah || '').replace(/<br\s*\/?>/gi, '\n').replace(/\r/g,'');
  const stepLines = langkahRaw.split('\n').map(s=>s.trim()).filter(s=>s.length>0);
  return { id, title, slug, description, category, cid, image, ingredients, steps: stepLines, source: item };
}

async function fetchAll(){
  showLoader(true, 'Memuat kategori & resep…');
  try {
    const [catRes, dataRes] = await Promise.all([fetch(CAT_URL, {cache:'no-store'}), fetch(DATA_URL, {cache:'no-store'})]);
    if(!catRes.ok || !dataRes.ok) throw new Error('HTTP error fetching data');
    const cats = await catRes.json();
    const data = await dataRes.json();
    if(Array.isArray(cats)) CATEGORIES = cats.map(c=>({ cid: c.cid, name: c.category_name, image: c.category_image }));
    if(Array.isArray(data)) RECIPES = data.map(normalizeExternalItem);
    // cache for offline fallback
    localStorage.setItem('recipes_cache_final', JSON.stringify(RECIPES));
    localStorage.setItem('cats_cache_final', JSON.stringify(CATEGORIES));
    showLoader(false);
    renderCategories();
  } catch(err){
    console.warn('fetch failed, try cache', err);
    const rc = localStorage.getItem('recipes_cache_final');
    const cc = localStorage.getItem('cats_cache_final');
    if(rc) RECIPES = JSON.parse(rc);
    if(cc) CATEGORIES = JSON.parse(cc);
    showLoader(false, 'Offline — menggunakan data tersimpan');
    renderCategories();
  }
}

function showLoader(visible, text){
  const loader = document.getElementById('loader');
  if(!loader) return;
  loader.style.display = visible ? 'flex' : 'none';
  if(text) loader.querySelector('.loader-text').textContent = text;
}

function saveFavorites(){ localStorage.setItem('favorites', JSON.stringify([...state.favorites])); }
function loadFavorites(){ try{ const v = JSON.parse(localStorage.getItem('favorites')||'[]'); state.favorites = new Set(v); }catch(e){ state.favorites = new Set(); } }

function renderCategories(){
  const page = document.getElementById('page');
  page.innerHTML = '';
  const tpl = document.getElementById('categories-template').content.cloneNode(true);
  page.appendChild(tpl);
  const list = document.getElementById('categoriesList');
  if(!CATEGORIES || CATEGORIES.length===0){
    list.innerHTML = '<div class="card">Tidak ada kategori</div>'; return;
  }
  CATEGORIES.forEach(c=>{
    const card = document.createElement('div'); card.className='cat-card';
    const bg = document.createElement('div'); bg.className='bg'; bg.style.backgroundImage = 'url('+c.image+')';
    const label = document.createElement('div'); label.className='label'; label.textContent = c.name;
    card.appendChild(bg); card.appendChild(label);
    card.addEventListener('click', ()=> location.hash = '#/category/' + c.cid );
    list.appendChild(card);
  });
  // also prepare home feed (recent recipes) below categories? keep category-only home as requested
}

function renderCategoryRecipes(cid){
  const page = document.getElementById('page');
  page.innerHTML = '';
  const tpl = document.getElementById('category-recipes-template').content.cloneNode(true);
  page.appendChild(tpl);
  const cat = CATEGORIES.find(c=>c.cid===cid);
  document.getElementById('catTitle').textContent = cat ? cat.name : 'Kategori';
  document.getElementById('backToCats').addEventListener('click', ()=> location.hash = '#/');
  const list = document.getElementById('recipeListByCat');
  const filtered = RECIPES.filter(r=> r.cid === cid);
  if(filtered.length===0){
    list.innerHTML = '<div class="card">Tidak ada resep di kategori ini</div>'; return;
  }
  filtered.forEach(r=> list.appendChild(createCard(r)));
}

function createCard(recipe){
  const card = document.createElement('div'); card.className='card'; card.tabIndex=0;
  const thumb = document.createElement('div'); thumb.className='thumb';
  if(recipe.image){
    const img = document.createElement('img'); img.src = recipe.image; img.alt = recipe.title; img.style.width='100%'; img.style.height='100%'; img.style.objectFit='cover'; thumb.textContent=''; thumb.appendChild(img);
  } else { thumb.textContent = recipe.title; }
  const meta = document.createElement('div'); meta.className='meta';
  const h3 = document.createElement('h3'); h3.textContent = recipe.title;
  const p = document.createElement('p'); p.textContent = (recipe.category ? recipe.category + ' • ' : '') + (recipe.steps ? (recipe.steps.length + ' langkah') : '');
  meta.appendChild(h3); meta.appendChild(p);
  card.appendChild(thumb); card.appendChild(meta);
  card.addEventListener('click', ()=> location.hash = '#/recipe/' + recipe.slug );
  return card;
}

function renderSearch(){
  const page = document.getElementById('page');
  page.innerHTML = '';
  const tpl = document.getElementById('search-template').content.cloneNode(true);
  page.appendChild(tpl);
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  function doSearch(q){
    q = q.trim().toLowerCase();
    if(!q){ results.innerHTML=''; return; }
    const filtered = RECIPES.filter(r=> (r.title + ' ' + (r.category||'') + ' ' + (r.ingredients||[]).join(' ')).toLowerCase().includes(q));
    results.innerHTML='';
    if(filtered.length===0){ const p = document.createElement('div'); p.className='card'; p.textContent='Tidak ada hasil'; results.appendChild(p); }
    else filtered.forEach(r=> results.appendChild(createCard(r)));
  }
  input.addEventListener('input', e=> doSearch(e.target.value));
  input.focus();
}

function renderFavorites(){
  const page = document.getElementById('page');
  page.innerHTML = '';
  const tpl = document.getElementById('favorites-template').content.cloneNode(true);
  page.appendChild(tpl);
  const list = document.getElementById('favoritesList');
  const favs = RECIPES.filter(r=> state.favorites.has(r.id));
  if(favs.length===0){ const p = document.createElement('div'); p.className='card'; p.textContent='Belum ada favorit'; list.appendChild(p); }
  else favs.forEach(r=> list.appendChild(createCard(r)));
}

function renderDetail(recipe){
  const page = document.getElementById('page');
  page.innerHTML = '';
  const tpl = document.getElementById('detail-template').content.cloneNode(true);
  page.appendChild(tpl);
  document.getElementById('backBtn').addEventListener('click', ()=> history.back());
  document.getElementById('detailTitle').textContent = recipe.title;
  const cat = CATEGORIES.find(c=>c.cid===recipe.cid);
  document.getElementById('detailCategory').textContent = cat ? cat.name : (recipe.category || '');
  document.getElementById('detailTime').textContent = recipe.totalTime || '';
  document.getElementById('detailServings').textContent = recipe.servings ? recipe.servings + ' porsi' : '';
  document.getElementById('detailDesc').textContent = recipe.description || '';
  // hero image
  const hero = document.getElementById('hero'); hero.innerHTML = '';
  if(recipe.image){
    const img = document.createElement('img'); img.src = recipe.image; img.alt = recipe.title; hero.appendChild(img);
  } else {
    hero.textContent = '';
  }
  // ingredients as bullet list
  const ingrList = document.getElementById('ingredientsList'); ingrList.innerHTML = '';
  (recipe.ingredients||[]).forEach(ing=>{
    const li = document.createElement('li'); li.textContent = ing; ingrList.appendChild(li);
  });
  // steps as ordered list
  const instr = document.getElementById('instructionsList'); instr.innerHTML = '';
  (recipe.steps||[]).forEach(s=>{ const li = document.createElement('li'); li.textContent = s; instr.appendChild(li); });
  // fav button
  const favBtn = document.getElementById('favBtn');
  function updateFavText(){ favBtn.textContent = state.favorites.has(recipe.id) ? '♥ Di Favoritkan' : '♡ Tambah Favorit'; }
  favBtn.addEventListener('click', ()=>{ if(state.favorites.has(recipe.id)) state.favorites.delete(recipe.id); else state.favorites.add(recipe.id); saveFavorites(); updateFavText(); });
  updateFavText();
  // share
  const shareBtn = document.getElementById('shareBtn');
  shareBtn.addEventListener('click', async ()=>{
    if(navigator.share){ try{ await navigator.share({ title: recipe.title, text: recipe.description||'', url: location.href }); }catch(e){ alert('Gagal share: '+e.message); } }
    else { navigator.clipboard.writeText(location.href); alert('Link disalin ke clipboard'); }
  });
}

function renderNotFound(){ const page = document.getElementById('page'); page.innerHTML = '<div class="container"><div class="section-title">Halaman tidak ditemukan</div></div>'; }

window.addEventListener('hashchange', ()=>{
  const hash = location.hash || '#/';
  if(hash === '#/' || hash === '') renderCategories();
  else if(hash.startsWith('#/category/')) { const cid = parseInt(hash.split('/')[2]); renderCategoryRecipes(cid); }
  else if(hash.startsWith('#/search')) renderSearch();
  else if(hash.startsWith('#/favorites')) renderFavorites();
  else if(hash.startsWith('#/recipe/')) { const slug = hash.split('/')[2]; const rec = RECIPES.find(r=>r.slug===slug || r.id===slug); if(rec) renderDetail(rec); else renderNotFound(); }
  else renderNotFound();
});

window.addEventListener('load', async ()=>{
  loadFavorites();
  await fetchAll();
  document.querySelectorAll('.nav-btn').forEach(b=>{ b.addEventListener('click', ()=> { location.hash = b.getAttribute('data-route'); }); });
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw_final.js').catch(()=>{}); }
  // initial route handling
  const h = location.hash || '#/'; if(h && h !== '#/') location.hash = h; else renderCategories();
});
