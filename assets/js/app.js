(function(){
  "use strict";
  const BRAND = "Hey Larmah Enterprise Limited";
  const RC = "RC: 9488632";
  const PHONE = (window.HL_CONFIG && window.HL_CONFIG.whatsappNumber) || "2347063080605";
  const ADMIN_EMAIL = (window.HL_CONFIG && window.HL_CONFIG.adminEmail) || "heylarmahtech@outlook.com";
  const toast = document.getElementById('toast');
  const page = document.body.getAttribute('data-page') || 'home';
  function showToast(message){ if(!toast) return; toast.textContent = message; toast.classList.add('show'); clearTimeout(window.__HLToast); window.__HLToast = setTimeout(()=>toast.classList.remove('show'), 3800); }
  function encode(s){ return encodeURIComponent(String(s||'').trim()); }
  function clean(s){ return String(s || '').trim(); }
  function formFields(form){ return Object.fromEntries(new FormData(form).entries()); }
  function slug(s){ return clean(s).toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'general'; }
  function categoryFrom(value){ const raw = slug(value || page || 'general'); if(raw.includes('real')) return 'real-estate'; if(raw.includes('fintech') || raw.includes('exchange') || raw.includes('fx')) return 'fintech'; if(raw.includes('logistics')) return 'logistics'; if(raw.includes('shipping')) return 'shipping'; if(raw.includes('premium')) return 'premium'; if(raw.includes('contact')) return 'contact'; if(raw.includes('insight') || raw.includes('blog')) return 'insights'; return ['real-estate','fintech','logistics','shipping','premium','contact','insights','whatsapp','general'].includes(raw) ? raw : 'general'; }
  function escapeHTML(value){ return clean(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
  function waUrl(message){ return `https://wa.me/${PHONE}?text=${encode(message)}`; }
  function buildMessage(title, fields){ const lines = [`${BRAND} — ${title}`, RC, '']; Object.entries(fields).forEach(([k,v])=>{ const x = clean(v); if(x) lines.push(`${k}: ${x}`); }); lines.push('', 'Sent from website'); return lines.join('\n'); }
  function requestPayload(title, fields, source){
    const category = categoryFrom(fields.Pillar || fields.Category || fields.category || (source === 'whatsapp-link' ? page : title) || source);
    const contact = clean(fields.Contact || fields.Phone || fields.Email || fields.email || '');
    const session = window.HLDatabase && window.HLDatabase.getSession ? window.HLDatabase.getSession() : null;
    const payload = { category, name: clean(fields.Name || fields.name || ''), phone: contact, details: { title, source: source || 'website', page: location.pathname.split('/').pop() || 'index.html', url: location.href, rc: RC, fields } };
    if(session && session.user && session.user.id) payload.user_id = session.user.id;
    return payload;
  }
  async function saveEnquiry(title, fields, source){ if(!window.HLDatabase || !window.HLDatabase.insert) return null; return window.HLDatabase.insert('requests', requestPayload(title, fields, source), { returning:false }); }

  document.querySelectorAll('[data-year]').forEach(el=>el.textContent = new Date().getFullYear());
  const menuBtn = document.querySelector('.menu-toggle'); const menu = document.getElementById('mobileMenu');
  if(menuBtn && menu){ menuBtn.addEventListener('click', ()=>{ const open = !menu.classList.contains('open'); menu.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-hidden', String(!open)); }); }
  const themeBtn = document.querySelector('[data-theme-toggle]'); const root = document.documentElement;
  try{ const saved = localStorage.getItem('hey_larmah_theme'); if(saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved); }catch{}
  function setThemeIcon(){ if(!themeBtn) return; const icon = themeBtn.querySelector('i'); if(icon) icon.className = root.getAttribute('data-theme') === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'; }
  setThemeIcon();
  if(themeBtn){ themeBtn.addEventListener('click', ()=>{ const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; root.setAttribute('data-theme', next); try{ localStorage.setItem('hey_larmah_theme', next); }catch{} setThemeIcon(); }); }
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries=>{ entries.forEach(entry=>{ if(entry.isIntersecting){ entry.target.classList.add('in'); observer.unobserve(entry.target); } }); }, {threshold:.12}) : null;
  document.querySelectorAll('.reveal').forEach(el=>observer ? observer.observe(el) : el.classList.add('in'));

  function initCookieConsent(){
    const banner = document.querySelector('[data-cookie-consent]'); if(!banner) return;
    let saved = null; try{ saved = localStorage.getItem('hey_larmah_cookie_consent'); }catch{}
    if(saved) return;
    banner.hidden = false;
    const pref = banner.querySelector('[data-cookie-preferences]');
    const analytics = banner.querySelector('[data-analytics-toggle]');
    function save(type){ const payload = { type, analytics: type === 'all' || !!(analytics && analytics.checked), date: new Date().toISOString(), provider:'Cloudflare-ready consent' }; try{ localStorage.setItem('hey_larmah_cookie_consent', JSON.stringify(payload)); document.cookie = `hl_cookie_consent=${type}; path=/; max-age=31536000; SameSite=Lax`; }catch{} banner.hidden = true; }
    banner.querySelector('[data-cookie-accept]')?.addEventListener('click', ()=>save('all'));
    banner.querySelector('[data-cookie-essential]')?.addEventListener('click', ()=>save('essential'));
    banner.querySelector('[data-cookie-manage]')?.addEventListener('click', ()=>{ if(pref) pref.hidden = false; });
    banner.querySelector('[data-cookie-close]')?.addEventListener('click', ()=>{ if(pref) pref.hidden = true; });
    banner.querySelector('[data-cookie-save]')?.addEventListener('click', ()=>save(analytics && analytics.checked ? 'custom-analytics' : 'essential'));
  }
  initCookieConsent();

  document.querySelectorAll('.js-wa-form').forEach(form=>{
    form.addEventListener('submit', ev=>{ ev.preventDefault(); const data = formFields(form); const title = form.getAttribute('data-wa-title') || 'Website Enquiry'; const message = buildMessage(title, data); const url = waUrl(message); const opened = window.open(url, '_blank', 'noopener,noreferrer'); if(!opened) window.location.href = url; saveEnquiry(title, data, 'contact-form').then(()=>showToast('Enquiry saved. Opening WhatsApp chat…')).catch(()=>showToast('Opening WhatsApp chat. Database save will retry after setup.')); form.reset(); });
  });
  document.querySelectorAll('a[href*="wa.me/"]').forEach(link=>{ link.addEventListener('click', ()=>{ const label = clean(link.getAttribute('data-enquiry-title') || link.textContent || link.getAttribute('aria-label') || 'WhatsApp enquiry'); saveEnquiry(label, { Enquiry: label, Link: link.href, Page: location.pathname }, 'whatsapp-link').catch(()=>{}); }, { passive:true }); });

  document.querySelectorAll('[data-auth-form]').forEach(form=>{
    form.addEventListener('submit', async ev=>{
      ev.preventDefault(); const data = formFields(form); const email = clean(data.email || data.Email); const password = clean(data.password || data.Password); const mode = form.getAttribute('data-auth-mode') || 'login'; const redirect = form.getAttribute('data-auth-redirect') || 'dashboard.html';
      if(!email || !password){ showToast('Enter email and password.'); return; } if(!window.HLDatabase){ showToast('Supabase is not configured.'); return; }
      const button = form.querySelector('button[type="submit"]'); const original = button ? button.textContent : '';
      if(button){ button.disabled = true; button.textContent = mode === 'register' ? 'Creating secure access…' : 'Signing in…'; }
      try{ if(mode === 'register'){ await window.HLDatabase.signUp(email, password); showToast('Account created. Opening your premium dashboard…'); } else { await window.HLDatabase.signIn(email, password); showToast('Signed in. Opening secure dashboard…'); } setTimeout(()=>{ window.location.href = redirect; }, 650); }
      catch(err){ showToast(err && err.message ? err.message : 'Unable to continue.'); }
      finally{ if(button){ button.disabled = false; button.textContent = original; } }
    });
  });
  document.querySelectorAll('[data-sign-out]').forEach(btn=>{ btn.addEventListener('click', async()=>{ try{ await window.HLDatabase.signOut(); }catch{} window.location.href = 'auth.html'; }); });

  function setupPagination(section){
    const perPage = Math.max(1, parseInt(section.getAttribute('data-paginate'), 10) || 6); const grid = section.querySelector('[data-page-grid]'); const pager = section.querySelector('[data-pagination]'); if(!grid || !pager) return;
    const items = Array.from(grid.children).filter(el => el.matches('[data-item]')); if(items.length <= perPage){ pager.hidden = true; items.forEach(i=>i.hidden=false); return; }
    let current = 1; const total = Math.ceil(items.length / perPage);
    function make(label, pageNo, disabled=false, active=false){ const btn = document.createElement('button'); btn.type='button'; btn.textContent=label; btn.disabled=disabled; if(active) btn.classList.add('active'); btn.addEventListener('click', ()=>{ current=pageNo; render(true); }); return btn; }
    function render(scroll){ const start=(current-1)*perPage, end=start+perPage; items.forEach((item,i)=>{ item.hidden = !(i>=start && i<end); }); pager.innerHTML=''; pager.appendChild(make('Prev', Math.max(1,current-1), current===1)); for(let i=1;i<=total;i++) pager.appendChild(make(String(i), i, false, i===current)); pager.appendChild(make('Next', Math.min(total,current+1), current===total)); if(scroll) section.scrollIntoView({behavior:'smooth', block:'start'}); }
    render(false);
  }
  function labelForCategory(category){ return ({'real-estate':'Real Estate',fintech:'Fintech',logistics:'Logistics',shipping:'Shipping',premium:'Premium',insights:'Insights'})[category] || 'Enterprise'; }
  function iconForCategory(category){ return ({'real-estate':'fa-solid fa-building',fintech:'fa-solid fa-chart-line',logistics:'fa-solid fa-truck-fast',shipping:'fa-solid fa-ship',premium:'fa-solid fa-crown',insights:'fa-solid fa-lightbulb'})[category] || 'fa-solid fa-layer-group'; }
  function catalogueCard(row){ const category = clean(row.category || 'general'); const title = clean(row.title || 'Enterprise Catalogue Item'); const description = clean(row.description || 'Speak with Hey Larmah Enterprise Limited for details.'); const msg = `Hello Hey Larmah, I want to enquire about ${title}.`; return `<article class="catalogue-card reveal in" data-item><div class="catalogue-icon"><i class="${iconForCategory(category)}"></i></div><span class="catalogue-tag">${escapeHTML(labelForCategory(category))}</span><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p><a class="card-link" href="${waUrl(msg)}" target="_blank" rel="noopener" data-enquiry-title="${escapeHTML(title)}">Enquire <i class="fa-brands fa-whatsapp"></i></a></article>`; }
  function blogCard(row){ const title = clean(row.title || 'Hey Larmah Insight'); const excerpt = clean(row.excerpt || row.body || 'Speak with Hey Larmah Enterprise Limited for details.'); const body = clean(row.body || excerpt); const category = clean(row.category || 'Enterprise'); const read = clean(row.read_time || '4 min read'); const image = clean(row.image_url || ''); return `<article class="blog-card reveal in" data-item data-blog-card data-category="${escapeHTML(category)}" data-title="${escapeHTML(title)}" data-body="${escapeHTML(body)}" data-excerpt="${escapeHTML(excerpt)}" data-read="${escapeHTML(read)}"><div class="blog-meta"><span class="blog-category">${escapeHTML(category)}</span><span>${escapeHTML(read)}</span></div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(excerpt.length > 170 ? excerpt.slice(0,167)+'...' : excerpt)}</p><button class="card-link" type="button" data-read-post>Read article <i class="fa-solid fa-arrow-right"></i></button></article>`; }
  async function hydrateCatalogues(){
    if(!window.HLDatabase || !window.HLDatabase.select) return;
    try{
      if(page === 'insights'){
        const grid = document.querySelector('.blog-grid[data-page-grid]'); if(!grid) return;
        const rows = await window.HLDatabase.select('insights_posts', '?select=title,excerpt,body,category,read_time,pinned,image_url,created_at&active=eq.true&order=pinned.desc,created_at.desc&limit=30');
        if(Array.isArray(rows) && rows.length){ grid.innerHTML = rows.map(blogCard).join(''); initBlogModal(); }
        return;
      }
      if(page === 'home'){
        const grid = document.querySelector('#catalogue-preview .catalogue-grid'); if(!grid) return;
        const rows = await window.HLDatabase.select('catalog_items', '?select=category,title,description,price,tags,image_url&active=eq.true&order=featured.desc,sort_order.asc,created_at.desc&limit=6');
        if(Array.isArray(rows) && rows.length >= 6){ grid.innerHTML = rows.slice(0,6).map(catalogueCard).join(''); }
        return;
      }
      const allowed = ['real-estate','fintech','logistics','shipping','premium'];
      if(allowed.includes(page)){
        const grid = document.querySelector('.catalogue-grid[data-page-grid]'); if(!grid) return;
        const rows = await window.HLDatabase.select('catalog_items', `?select=category,title,description,price,tags,image_url&active=eq.true&category=eq.${page}&order=sort_order.asc,created_at.desc&limit=60`);
        if(Array.isArray(rows) && rows.length){ grid.innerHTML = rows.map(catalogueCard).join(''); }
      }
    }catch(err){ }
  }

  function initBlogModal(){
    const modal = document.querySelector('[data-blog-modal]'); if(!modal) return;
    const titleEl = modal.querySelector('[data-modal-title]'); const bodyEl = modal.querySelector('[data-modal-body]'); const metaEl = modal.querySelector('[data-modal-meta]'); const close = ()=>{ modal.hidden = true; document.body.style.overflow=''; };
    modal.querySelectorAll('[data-modal-close]').forEach(btn=>btn.addEventListener('click', close));
    modal.addEventListener('click', ev=>{ if(ev.target === modal) close(); });
    document.querySelectorAll('[data-read-post]').forEach(btn=>{ btn.addEventListener('click', ()=>{ const card = btn.closest('[data-blog-card]'); if(!card) return; titleEl.textContent = card.getAttribute('data-title') || 'Insight'; metaEl.textContent = `${card.getAttribute('data-category') || 'Enterprise'} • ${card.getAttribute('data-read') || '4 min read'}`; bodyEl.innerHTML = `<p>${escapeHTML(card.getAttribute('data-body') || '').replace(/\n+/g,'</p><p>')}</p>`; modal.hidden = false; document.body.style.overflow='hidden'; }); });
  }
  initBlogModal();
  document.querySelectorAll('[data-blog-filter]').forEach(btn=>{ btn.addEventListener('click', ()=>{ const category = btn.getAttribute('data-blog-filter'); document.querySelectorAll('[data-blog-filter]').forEach(b=>b.classList.toggle('active', b === btn)); document.querySelectorAll('[data-blog-card]').forEach(card=>{ const show = category === 'all' || clean(card.getAttribute('data-category')).toLowerCase() === category.toLowerCase(); card.style.display = show ? '' : 'none'; }); }); });

  document.querySelectorAll('[data-paginate]').forEach(setupPagination);
  hydrateCatalogues().then(()=>document.querySelectorAll('[data-paginate]').forEach(setupPagination));

  async function guardDashboard(){
    if(!document.body.hasAttribute('data-requires-auth')) return;
    if(!window.HLDatabase || !window.HLDatabase.currentAccessToken || !window.HLDatabase.currentAccessToken()){ window.location.href = 'auth.html'; return; }
    try{ const user = await window.HLDatabase.getCurrentUser(); if(!user || !user.id){ await window.HLDatabase.signOut(); window.location.href='auth.html'; return; } document.querySelectorAll('[data-user-email]').forEach(el=>el.textContent = user.email || 'Premium user'); document.querySelectorAll('[data-user-id]').forEach(el=>el.textContent = user.id || ''); await hydrateDashboard(user); }
    catch(err){ window.location.href = 'auth.html'; }
  }
  async function hydrateDashboard(user){
    const grid = document.querySelector('.dash-grid');
    try{
      const rows = await window.HLDatabase.select('requests', '?select=category,status,created_at,details&order=created_at.desc&limit=100');
      if(Array.isArray(rows)){
        const counts = rows.reduce((acc,row)=>{ acc[row.category] = (acc[row.category] || 0) + 1; return acc; }, {});
        const mapping = [['real-estate','Real Estate requests'],['fintech','Fintech enquiries'],['logistics','Logistics movements'],['shipping','Shipping briefs']];
        if(grid){ Array.from(grid.querySelectorAll('.dash-card')).forEach((card,i)=>{ const [key,label]=mapping[i]||[]; const strong=card.querySelector('strong'), span=card.querySelector('span'); if(strong&&key) strong.textContent=String(counts[key]||0); if(span&&label) span.textContent=label; }); }
        const list = document.querySelector('[data-user-requests]'); if(list){ list.innerHTML = rows.length ? rows.slice(0,8).map(row=>`<div class="activity-item"><strong>${escapeHTML(labelForCategory(row.category))}</strong><span>${escapeHTML((row.details && row.details.title) || 'Website enquiry')}</span></div>`).join('') : '<div class="activity-item"><strong>No requests yet</strong><span>Your premium dashboard will show your saved enquiries here.</span></div>'; }
      }
    }catch{}
  }
  guardDashboard();

  async function initAdmin(){
    const adminRoot = document.querySelector('[data-admin-root]'); if(!adminRoot) return;
    const loginPanel = document.querySelector('[data-admin-login-panel]'); const workspace = document.querySelector('[data-admin-workspace]'); const emailLabel = document.querySelector('[data-admin-email-label]');
    function setVisible(isAdmin, email){ if(loginPanel) loginPanel.hidden = !!isAdmin; if(workspace) workspace.hidden = !isAdmin; if(emailLabel) emailLabel.textContent = email || ADMIN_EMAIL; }
    async function check(){
      if(!window.HLDatabase || !window.HLDatabase.currentAccessToken || !window.HLDatabase.currentAccessToken()){ setVisible(false); return null; }
      try{ const user = await window.HLDatabase.getCurrentUser(); if(user && window.HLDatabase.isAdminEmail(user.email)){ setVisible(true, user.email); await hydrateAdmin(); return user; } setVisible(false); showToast('This account is not authorised for admin access.'); return null; }catch{ setVisible(false); return null; }
    }
    document.querySelector('[data-admin-auth]')?.addEventListener('submit', async ev=>{ ev.preventDefault(); const data = formFields(ev.currentTarget); const email = clean(data.email); const password = clean(data.password); if(email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()){ showToast('Use the approved admin email.'); return; } const btn=ev.currentTarget.querySelector('button[type="submit"]'); const original=btn?btn.textContent:''; if(btn){btn.disabled=true;btn.textContent='Verifying admin…';} try{ await window.HLDatabase.signIn(email,password); const user = await check(); if(user) showToast('Admin workspace unlocked.'); }catch(err){ showToast(err && err.message ? err.message : 'Admin sign-in failed.'); }finally{ if(btn){btn.disabled=false;btn.textContent=original;} } });
    document.querySelector('[data-admin-sign-out]')?.addEventListener('click', async()=>{ await window.HLDatabase.signOut(); setVisible(false); showToast('Admin signed out.'); });
    document.querySelector('[data-catalogue-upload]')?.addEventListener('submit', async ev=>{ ev.preventDefault(); const form=ev.currentTarget; const data=formFields(form); const file=form.querySelector('input[name="image_file"]')?.files?.[0]; const btn=form.querySelector('button[type="submit"]'); const original=btn?btn.textContent:''; if(btn){btn.disabled=true;btn.textContent='Publishing catalogue…';} try{ let image_url=clean(data.image_url); if(file) image_url = await window.HLDatabase.uploadMedia(file,'catalogue'); const payload={ category: clean(data.category), title: clean(data.title), description: clean(data.description), price: clean(data.price), image_url, tags: clean(data.tags).split(',').map(x=>x.trim()).filter(Boolean), active: data.active === 'on', featured: data.featured === 'on', sort_order: parseInt(data.sort_order,10)||0 }; await window.HLDatabase.insert('catalog_items', payload); showToast('Catalogue item published to Supabase.'); form.reset(); await hydrateAdmin(); }catch(err){ showToast(err && err.message ? err.message : 'Catalogue upload failed.'); }finally{ if(btn){btn.disabled=false;btn.textContent=original;} } });
    document.querySelector('[data-insight-upload]')?.addEventListener('submit', async ev=>{ ev.preventDefault(); const form=ev.currentTarget; const data=formFields(form); const file=form.querySelector('input[name="image_file"]')?.files?.[0]; const btn=form.querySelector('button[type="submit"]'); const original=btn?btn.textContent:''; if(btn){btn.disabled=true;btn.textContent='Publishing insight…';} try{ let image_url=clean(data.image_url); if(file) image_url = await window.HLDatabase.uploadMedia(file,'insights'); const payload={ title: clean(data.title), category: clean(data.category || 'Enterprise'), excerpt: clean(data.excerpt), body: clean(data.body), read_time: clean(data.read_time || '4 min read'), image_url, pinned: data.pinned === 'on', active: data.active === 'on' }; await window.HLDatabase.insert('insights_posts', payload); showToast('Insight blog post published.'); form.reset(); await hydrateAdmin(); }catch(err){ showToast(err && err.message ? err.message : 'Insight upload failed.'); }finally{ if(btn){btn.disabled=false;btn.textContent=original;} } });
    await check();
  }
  async function hydrateAdmin(){
    try{ const cats = await window.HLDatabase.select('catalog_items','?select=category,title,active,created_at&order=created_at.desc&limit=8'); const list=document.querySelector('[data-admin-catalogue-list]'); if(list && Array.isArray(cats)){ list.innerHTML = cats.length ? cats.map(x=>`<div class="admin-list-item"><span><strong>${escapeHTML(x.title)}</strong><br>${escapeHTML(labelForCategory(x.category))}</span><span>${x.active?'Active':'Draft'}</span></div>`).join('') : '<div class="admin-list-item"><span>No catalogue records yet.</span></div>'; } }catch{}
    try{ const posts = await window.HLDatabase.select('insights_posts','?select=category,title,active,created_at&order=created_at.desc&limit=8'); const list=document.querySelector('[data-admin-insight-list]'); if(list && Array.isArray(posts)){ list.innerHTML = posts.length ? posts.map(x=>`<div class="admin-list-item"><span><strong>${escapeHTML(x.title)}</strong><br>${escapeHTML(x.category)}</span><span>${x.active?'Live':'Draft'}</span></div>`).join('') : '<div class="admin-list-item"><span>No insight posts yet.</span></div>'; } }catch{}
  }
  initAdmin();
})();
