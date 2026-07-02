(function(){
  "use strict";
  const BRAND = "Hey Larmah Enterprise Limited";
  const RC = "RC: 9488632";
  const PHONE = (window.HL_CONFIG && window.HL_CONFIG.whatsappNumber) || "2347063080605";
  const ADMIN_EMAIL = (window.HL_CONFIG && window.HL_CONFIG.adminEmail) || "heylarmahtech@outlook.com";
  const toast = document.getElementById('toast');
  const page = document.body.getAttribute('data-page') || 'home';
  async function dbReady(){ if(window.HLDatabase && window.HLDatabase.ready){ try{ await window.HLDatabase.ready; await window.HLDatabase.syncSession?.(); }catch{} } }
  function showToast(message){ if(!toast) return; toast.textContent = message; toast.classList.add('show'); clearTimeout(window.__HLToast); window.__HLToast = setTimeout(()=>toast.classList.remove('show'), 3800); }
  function encode(s){ return encodeURIComponent(String(s||'').trim()); }
  function clean(s){ return String(s || '').trim(); }
  function formFields(form){
    const out = {};
    new FormData(form).forEach((value, key)=>{
      const isFile = (typeof File !== 'undefined' && value instanceof File) || (value && typeof value === 'object' && 'name' in value && 'size' in value && 'type' in value);
      if(isFile) return;
      out[key] = value;
    });
    return out;
  }
  function slug(s){ return clean(s).toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'general'; }
  function categoryFrom(value){ const raw = slug(value || page || 'general'); if(raw.includes('real')) return 'real-estate'; if(raw.includes('fintech') || raw.includes('exchange') || raw.includes('fx')) return 'fintech'; if(raw.includes('logistics')) return 'logistics'; if(raw.includes('shipping')) return 'shipping'; if(raw.includes('premium')) return 'premium'; if(raw.includes('contact')) return 'contact'; if(raw.includes('insight') || raw.includes('blog')) return 'insights'; return ['real-estate','fintech','logistics','shipping','premium','contact','insights','whatsapp','general'].includes(raw) ? raw : 'general'; }
  function escapeHTML(value){ return clean(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
  function waUrl(message){ return `https://wa.me/${PHONE}?text=${encode(message)}`; }
  function buildMessage(title, fields){ const lines = [`${BRAND} — ${title}`, RC, '']; Object.entries(fields).forEach(([k,v])=>{ const x = clean(v); if(x) lines.push(`${k}: ${x}`); }); lines.push('', 'Sent from website'); return lines.join('\n'); }
  function requestPayload(title, fields, source){
    const category = categoryFrom(fields.Pillar || fields.Category || fields.category || (source === 'whatsapp-link' ? page : title) || source);
    const contact = clean(fields.Contact || fields.Phone || fields.Email || fields.email || '');
    const session = window.HLDatabase && window.HLDatabase.getSession ? window.HLDatabase.getSession() : null;
    const currentUser = window.__HLDashboardUser || (session && session.user) || null;
    const requestTitle = clean(fields.Name || fields.name || fields.Title || fields.title || title || 'Website enquiry');
    const payload = {
      category,
      name: requestTitle,
      phone: contact,
      status: clean(fields.Status || fields.status || 'new') || 'new',
      details: {
        title: requestTitle,
        source: source || 'website',
        page: location.pathname.split('/').pop() || 'index.html',
        url: location.href,
        rc: RC,
        objective: clean(fields.Objective || fields.objective || ''),
        location: clean(fields.Location || fields.location || ''),
        budget: clean(fields.Budget || fields.budget || ''),
        timeline: clean(fields.Timeline || fields.timeline || ''),
        priority: !!(fields.Priority || fields.priority),
        message: clean(fields.Message || fields.message || fields.Details || fields.details || ''),
        next_action: clean(fields.NextAction || fields.next_action || ''),
        fields
      }
    };
    if(currentUser && currentUser.id) payload.user_id = currentUser.id;
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

  function setStatus(target, message, type){
    if(!target) return;
    target.textContent = message || '';
    target.classList.remove('success','error','info');
    if(type) target.classList.add(type);
  }
  async function withButton(button, busyText, task){
    const original = button ? button.innerHTML : '';
    if(button){ button.disabled = true; button.innerHTML = busyText; }
    try{ return await task(); }
    finally{ if(button){ button.disabled = false; button.innerHTML = original; } }
  }
  function authMessageFromUrl(){
    const params = new URLSearchParams(location.search);
    const hash = new URLSearchParams((location.hash || '').replace(/^#/,''));
    const error = params.get('error_description') || hash.get('error_description');
    if(error) showToast(error.replace(/\+/g,' '));
    if(params.get('confirmed')) showToast('Email confirmed. You can now sign in.');
    if(params.get('invited')) showToast('Invitation accepted. Complete your secure sign in.');
    if(params.get('type') === 'recovery' || hash.get('type') === 'recovery'){
      const panels = document.querySelectorAll('[data-password-recovery-panel]');
      if(!panels.length && !/reset-password\.html$/i.test(location.pathname)){
        window.location.href = 'reset-password.html' + (location.search || '?type=recovery') + (location.hash || '');
        return;
      }
      panels.forEach(el=>el.hidden=false);
      showToast('Password recovery session detected. Set a new password.');
    }
  }
  authMessageFromUrl();

  document.querySelectorAll('[data-auth-form]').forEach(form=>{
    form.addEventListener('submit', async ev=>{
      ev.preventDefault();
      const data = formFields(form);
      const email = clean(data.email || data.Email);
      const password = clean(data.password || data.Password);
      const name = clean(data.full_name || data.Name || '');
      const mode = form.getAttribute('data-auth-mode') || 'login';
      const redirect = form.getAttribute('data-auth-redirect') || 'dashboard.html';
      const status = form.querySelector('[data-auth-status]');
      if(!email || !password){ showToast('Enter email and password.'); return; }
      if(!window.HLDatabase){ showToast('Supabase is not configured.'); return; }
      const button = form.querySelector('button[type="submit"]');
      await withButton(button, mode === 'register' ? '<i class="fa-solid fa-spinner fa-spin"></i> Creating account…' : '<i class="fa-solid fa-spinner fa-spin"></i> Signing in…', async()=>{
        await dbReady();
        if(mode === 'register'){
          const result = await window.HLDatabase.signUp(email, password, { full_name: name, account_type: 'premium' });
          if(result && result.session){
            showToast('Account created. Opening your premium dashboard…');
            setTimeout(()=>{ window.location.href = redirect; }, 650);
          }else{
            setStatus(status, 'Account created. Please confirm your email address before signing in.', 'success');
            showToast('Please confirm your email address to activate your account.');
            form.reset();
          }
        }else{
          await window.HLDatabase.signIn(email, password);
          showToast('Signed in. Opening secure dashboard…');
          setTimeout(()=>{ window.location.href = redirect; }, 650);
        }
      }).catch(err=>{ setStatus(status, err && err.message ? err.message : 'Unable to continue.', 'error'); showToast(err && err.message ? err.message : 'Unable to continue.'); });
    });
  });

  document.querySelectorAll('[data-google-signin]').forEach(btn=>{
    btn.addEventListener('click', async()=>{
      if(!window.HLDatabase){ showToast('Supabase is not configured.'); return; }
      await withButton(btn, '<i class="fa-solid fa-spinner fa-spin"></i> Redirecting…', async()=>{
        await dbReady();
        await window.HLDatabase.signInWithGoogle(btn.getAttribute('data-google-redirect') || 'dashboard.html');
      }).catch(err=>showToast(err && err.message ? err.message : 'Google sign-in could not start.'));
    });
  });

  document.querySelectorAll('[data-reset-form]').forEach(form=>{
    form.addEventListener('submit', async ev=>{
      ev.preventDefault(); const data=formFields(form); const email=clean(data.email); const status=form.querySelector('[data-auth-status]');
      if(!email){ showToast('Enter your email address.'); return; }
      const btn=form.querySelector('button[type="submit"]');
      await withButton(btn, '<i class="fa-solid fa-spinner fa-spin"></i> Sending reset…', async()=>{ await dbReady(); await window.HLDatabase.resetPassword(email); setStatus(status, 'Password reset link sent. Check your email.', 'success'); showToast('Password reset email sent.'); }).catch(err=>{ setStatus(status, err.message || 'Unable to send reset link.', 'error'); showToast(err.message || 'Unable to send reset link.'); });
    });
  });

  document.querySelectorAll('[data-update-password-form]').forEach(form=>{
    form.addEventListener('submit', async ev=>{
      ev.preventDefault(); const data=formFields(form); const password=clean(data.password); const status=form.querySelector('[data-auth-status]');
      if(!password || password.length < 8){ showToast('Password must be at least 8 characters.'); return; }
      const btn=form.querySelector('button[type="submit"]');
      await withButton(btn, '<i class="fa-solid fa-spinner fa-spin"></i> Updating…', async()=>{ await dbReady(); await window.HLDatabase.updatePassword(password); setStatus(status, 'Password updated successfully.', 'success'); showToast('Password updated.'); form.reset(); }).catch(err=>{ setStatus(status, err.message || 'Password update failed.', 'error'); showToast(err.message || 'Password update failed.'); });
    });
  });

  document.querySelectorAll('[data-resend-confirmation]').forEach(form=>{
    form.addEventListener('submit', async ev=>{
      ev.preventDefault(); const data=formFields(form); const email=clean(data.email); const type=clean(data.type || 'signup'); const status=form.querySelector('[data-auth-status]');
      if(!email){ showToast('Enter your email address.'); return; }
      const btn=form.querySelector('button[type="submit"]');
      await withButton(btn, '<i class="fa-solid fa-spinner fa-spin"></i> Resending…', async()=>{ await dbReady(); await window.HLDatabase.resendConfirmation(email, type); setStatus(status, 'Verification email resent.', 'success'); showToast('Verification email resent.'); }).catch(err=>{ setStatus(status, err.message || 'Unable to resend verification.', 'error'); showToast(err.message || 'Unable to resend verification.'); });
    });
  });

  document.querySelectorAll('[data-change-email-form]').forEach(form=>{
    form.addEventListener('submit', async ev=>{
      ev.preventDefault(); const data=formFields(form); const email=clean(data.email); const status=form.querySelector('[data-auth-status]');
      if(!email){ showToast('Enter the new email address.'); return; }
      const btn=form.querySelector('button[type="submit"]');
      await withButton(btn, '<i class="fa-solid fa-spinner fa-spin"></i> Requesting change…', async()=>{ await dbReady(); await window.HLDatabase.changeEmail(email); setStatus(status, 'Email change requested. Check both old and new email inboxes if secure email change is enabled.', 'success'); showToast('Email verification sent for the new address.'); }).catch(err=>{ setStatus(status, err.message || 'Email change failed.', 'error'); showToast(err.message || 'Email change failed.'); });
    });
  });

  document.querySelectorAll('[data-reauth-form]').forEach(form=>{
    form.addEventListener('submit', async ev=>{
      ev.preventDefault();
      const data = formFields(form);
      const password = clean(data.password);
      const status = form.querySelector('[data-auth-status]');
      if(!password){ showToast('Enter your current password.'); return; }
      const btn = form.querySelector('button[type="submit"]');
      await withButton(btn, '<i class="fa-solid fa-spinner fa-spin"></i> Confirming…', async()=>{
        await dbReady();
        const user = await window.HLDatabase.getCurrentUser();
        if(!user || !user.email){ throw new Error('Sign in again to continue.'); }
        await window.HLDatabase.signIn(user.email, password);
        setStatus(status, 'Identity confirmed. Your secure session has been refreshed.', 'success');
        showToast('Identity confirmed.');
        form.reset();
      }).catch(err=>{ setStatus(status, err.message || 'Unable to reconfirm identity.', 'error'); showToast(err.message || 'Unable to reconfirm identity.'); });
    });
  });

  document.querySelectorAll('[data-sign-out]').forEach(btn=>{ btn.addEventListener('click', async()=>{ try{ await dbReady(); await window.HLDatabase.signOut(); }catch{} window.location.href = 'auth.html'; }); });

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
  const SERVICE_PAGE_BY_KEY = {
    'real-estate:verified-property-sourcing':'services/real-estate/verified-property-sourcing-nigeria.html',
    'real-estate:verified-property-sourcing-in-nigeria':'services/real-estate/verified-property-sourcing-nigeria.html',
    'real-estate:land-acquisition-support':'services/real-estate/land-acquisition-support-lagos.html',
    'real-estate:land-acquisition-support-in-lagos':'services/real-estate/land-acquisition-support-lagos.html',
    'real-estate:property-investment-support-in-lagos':'services/real-estate/property-investment-support-lagos.html',
    'fintech:merchant-payment-setup':'services/fintech/merchant-payment-setup-nigeria.html',
    'fintech:merchant-payment-setup-in-nigeria':'services/fintech/merchant-payment-setup-nigeria.html',
    'fintech:business-payment-support-for-smes-in-nigeria':'services/fintech/business-payment-support-smes-nigeria.html',
    'fintech:enterprise-transaction-support-in-nigeria':'services/fintech/enterprise-transaction-support-nigeria.html',
    'logistics:corporate-delivery-coordination':'services/logistics/corporate-delivery-coordination-lagos.html',
    'logistics:corporate-delivery-coordination-in-lagos':'services/logistics/corporate-delivery-coordination-lagos.html',
    'logistics:business-logistics-support-in-nigeria':'services/logistics/business-logistics-support-nigeria.html',
    'logistics:last-mile-and-scheduled-delivery-services-in-lagos':'services/logistics/last-mile-scheduled-delivery-lagos.html',
    'shipping:import-and-export-coordination':'services/shipping/import-export-coordination-nigeria.html',
    'shipping:import-export-coordination':'services/shipping/import-export-coordination-nigeria.html',
    'shipping:import-and-export-coordination-in-nigeria':'services/shipping/import-export-coordination-nigeria.html',
    'shipping:shipping-documentation-support-in-nigeria':'services/shipping/shipping-documentation-support-nigeria.html',
    'shipping:freight-and-cargo-coordination-in-nigeria':'services/shipping/freight-cargo-coordination-nigeria.html',
    'premium:priority-enterprise-desk':'services/premium/priority-enterprise-desk.html',
    'premium:premium-business-support-for-investors-and-companies':'services/premium/premium-business-support-investors-companies.html'
  };
  function serviceUrlFor(row){
    const category = clean(row.category || '');
    const title = clean(row.title || '');
    const explicitSlug = clean(row.slug || '');
    let path = '';
    if(explicitSlug){
      const safeSlug = explicitSlug.replace(/^services\//,'').replace(/\.html$/,'').replace(/^\/+|\/+$/g,'');
      if(safeSlug.includes('/')) path = `services/${safeSlug}.html`;
    }
    if(!path) path = SERVICE_PAGE_BY_KEY[`${category}:${slug(title)}`] || '';
    if(!path) return '';
    const depth = location.pathname.split('/').filter(Boolean).length - 1;
    if(depth <= 0) return path;
    return '../'.repeat(depth) + path;
  }
  function mediaTypeFromUrl(url){
    const value = clean(url).toLowerCase();
    if(/\.(mp4|webm|mov|m4v|mpeg|mpg)(\?|#|$)/.test(value)) return 'video';
    if(/\.(jpg|jpeg|png|webp|gif|avif|svg)(\?|#|$)/.test(value)) return 'image';
    return '';
  }
  function mediaKind(fileOrUrl, explicit){
    const type = clean(explicit).toLowerCase();
    if(type === 'video' || type === 'image') return type;
    if(fileOrUrl && fileOrUrl.type){ return fileOrUrl.type.startsWith('video/') ? 'video' : 'image'; }
    return mediaTypeFromUrl(fileOrUrl) || 'image';
  }
  function mediaBlock(url, type, label, variant){
    const src = clean(url); if(!src) return '';
    const kind = mediaKind(src, type);
    const cls = variant === 'blog' ? 'blog-media' : 'catalogue-media';
    if(kind === 'video') return `<div class="${cls}"><video src="${escapeHTML(src)}" controls muted playsinline preload="metadata" aria-label="${escapeHTML(label)} video"></video></div>`;
    return `<div class="${cls}"><img src="${escapeHTML(src)}" alt="${escapeHTML(label)}" loading="lazy" /></div>`;
  }
  function catalogueCard(row){
    const category = clean(row.category || 'general');
    const title = clean(row.title || 'Enterprise Catalogue Item');
    const description = clean(row.description || 'Speak with Hey Larmah Enterprise Limited for details.');
    const mediaUrl = clean(row.media_url || row.video_url || row.image_url || '');
    const mediaType = clean(row.media_type || mediaTypeFromUrl(mediaUrl) || 'image');
    const msg = `Hello Hey Larmah, I want to enquire about ${title}.`;
    const detailsUrl = serviceUrlFor(row);
    const href = detailsUrl || waUrl(msg);
    const attrs = detailsUrl ? '' : ' target="_blank" rel="noopener"';
    const label = detailsUrl ? 'View details' : 'Enquire';
    const icon = detailsUrl ? 'fa-solid fa-arrow-right' : 'fa-brands fa-whatsapp';
    return `<article class="catalogue-card reveal in catalogue-card-rich" data-item>${mediaBlock(mediaUrl, mediaType, title)}<div class="catalogue-icon"><i class="${iconForCategory(category)}"></i></div><span class="catalogue-tag">${escapeHTML(labelForCategory(category))}</span><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p><a class="card-link" href="${escapeHTML(href)}"${attrs} data-enquiry-title="${escapeHTML(title)}">${label} <i class="${icon}"></i></a></article>`;
  }
  function blogCard(row){
    const title = clean(row.title || 'Hey Larmah Insight');
    const excerpt = clean(row.excerpt || row.body || 'Speak with Hey Larmah Enterprise Limited for details.');
    const body = clean(row.body || excerpt);
    const category = clean(row.category || 'Enterprise');
    const read = clean(row.read_time || '4 min read');
    const author = clean(row.author || 'Hey Larmah Editorial Desk');
    const mediaUrl = clean(row.media_url || row.video_url || row.image_url || '');
    const mediaType = clean(row.media_type || mediaTypeFromUrl(mediaUrl) || 'image');
    return `<article class="blog-card reveal in" data-item data-blog-card data-category="${escapeHTML(category)}" data-title="${escapeHTML(title)}" data-body="${escapeHTML(body)}" data-excerpt="${escapeHTML(excerpt)}" data-read="${escapeHTML(read)}" data-author="${escapeHTML(author)}" data-media-url="${escapeHTML(mediaUrl)}" data-media-type="${escapeHTML(mediaType)}">${mediaBlock(mediaUrl, mediaType, title, 'blog')}<div class="blog-meta"><span class="blog-category">${escapeHTML(category)}</span><span>${escapeHTML(read)}</span></div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(excerpt.length > 170 ? excerpt.slice(0,167)+'...' : excerpt)}</p><button class="card-link" type="button" data-read-post>Read article <i class="fa-solid fa-arrow-right"></i></button></article>`;
  }
  async function hydrateCatalogues(){
    if(!window.HLDatabase || !window.HLDatabase.select) return;
    try{
      if(page === 'insights'){
        const grid = document.querySelector('.blog-grid[data-page-grid]'); if(!grid) return;
        const rows = await window.HLDatabase.select('insights_posts', '?select=title,slug,excerpt,body,category,read_time,author,tags,pinned,image_url,media_url,media_type,video_url,gallery,created_at&active=eq.true&order=pinned.desc,created_at.desc&limit=30');
        if(Array.isArray(rows) && rows.length){ grid.innerHTML = rows.map(blogCard).join(''); initBlogModal(); }
        return;
      }
      if(page === 'home'){
        const grid = document.querySelector('#catalogue-preview .catalogue-grid'); if(!grid) return;
        const rows = await window.HLDatabase.select('catalog_items', '?select=category,title,slug,description,price,tags,image_url,media_url,media_type,video_url,gallery&active=eq.true&order=featured.desc,sort_order.asc,created_at.desc&limit=6');
        if(Array.isArray(rows) && rows.length >= 6){ grid.innerHTML = rows.slice(0,6).map(catalogueCard).join(''); }
        return;
      }
      const allowed = ['real-estate','fintech','logistics','shipping','premium'];
      if(allowed.includes(page)){
        const grid = document.querySelector('.catalogue-grid[data-page-grid]'); if(!grid) return;
        const rows = await window.HLDatabase.select('catalog_items', `?select=category,title,slug,description,price,tags,image_url,media_url,media_type,video_url,gallery&active=eq.true&category=eq.${page}&order=sort_order.asc,created_at.desc&limit=60`);
        if(Array.isArray(rows) && rows.length){ grid.innerHTML = rows.map(catalogueCard).join(''); }
      }
    }catch(err){ }
  }

  function initBlogModal(){
    const modal = document.querySelector('[data-blog-modal]'); if(!modal) return;
    const titleEl = modal.querySelector('[data-modal-title]'); const bodyEl = modal.querySelector('[data-modal-body]'); const metaEl = modal.querySelector('[data-modal-meta]'); const close = ()=>{ modal.hidden = true; document.body.style.overflow=''; };
    modal.querySelectorAll('[data-modal-close]').forEach(btn=>btn.addEventListener('click', close));
    modal.addEventListener('click', ev=>{ if(ev.target === modal) close(); });
    document.querySelectorAll('[data-read-post]').forEach(btn=>{ btn.addEventListener('click', ()=>{ const card = btn.closest('[data-blog-card]'); if(!card) return; titleEl.textContent = card.getAttribute('data-title') || 'Insight'; metaEl.textContent = `${card.getAttribute('data-category') || 'Enterprise'} • ${card.getAttribute('data-read') || '4 min read'}`; const mUrl = card.getAttribute('data-media-url') || ''; const mType = card.getAttribute('data-media-type') || ''; const article = `<p>${escapeHTML(card.getAttribute('data-body') || '').replace(/\n+/g,'</p><p>')}</p>`; bodyEl.innerHTML = `${mediaBlock(mUrl, mType, card.getAttribute('data-title') || 'Insight', 'blog')}<p><strong>By ${escapeHTML(card.getAttribute('data-author') || 'Hey Larmah Editorial Desk')}</strong></p>${article}`; modal.hidden = false; document.body.style.overflow='hidden'; }); });
  }
  initBlogModal();
  document.querySelectorAll('[data-blog-filter]').forEach(btn=>{ btn.addEventListener('click', ()=>{ const category = btn.getAttribute('data-blog-filter'); document.querySelectorAll('[data-blog-filter]').forEach(b=>b.classList.toggle('active', b === btn)); document.querySelectorAll('[data-blog-card]').forEach(card=>{ const show = category === 'all' || clean(card.getAttribute('data-category')).toLowerCase() === category.toLowerCase(); card.style.display = show ? '' : 'none'; }); }); });

  document.querySelectorAll('[data-paginate]').forEach(setupPagination);
  hydrateCatalogues().then(()=>document.querySelectorAll('[data-paginate]').forEach(setupPagination));

  async function guardDashboard(){
    if(!document.body.hasAttribute('data-requires-auth')) return;
    await dbReady();
    if(!window.HLDatabase || !window.HLDatabase.currentAccessToken || !window.HLDatabase.currentAccessToken()){ window.location.href = 'auth.html'; return; }
    try{ const user = await window.HLDatabase.getCurrentUser(); if(!user || !user.id){ await window.HLDatabase.signOut(); window.location.href='auth.html'; return; } document.querySelectorAll('[data-user-email]').forEach(el=>el.textContent = user.email || 'Premium user'); document.querySelectorAll('[data-user-id]').forEach(el=>el.textContent = user.id || ''); await hydrateDashboard(user); }
    catch(err){ window.location.href = 'auth.html'; }
  }
  function statusLabel(status){
    const key = slug(status || 'new');
    return ({
      new:'New', submitted:'Submitted', contacted:'Contacted', review:'Under Review', 'under-review':'Under Review',
      'documents-required':'Documents Required', 'in-progress':'In Progress', 'awaiting-client':'Awaiting Client',
      'awaiting-client-response':'Awaiting Client Response', scheduled:'Scheduled', completed:'Completed', closed:'Closed', archived:'Archived'
    })[key] || clean(status || 'New').replace(/-/g,' ').replace(/\b\w/g, m=>m.toUpperCase());
  }
  function statusClass(status){ return slug(status || 'new'); }
  function formatDate(value){ try{ return value ? new Date(value).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}) : 'Not dated'; }catch{ return 'Not dated'; } }
  function detail(row, key){ const d = row && row.details && typeof row.details === 'object' ? row.details : {}; return clean(d[key] || (d.fields && d.fields[key]) || (d.fields && d.fields[key.charAt(0).toUpperCase()+key.slice(1)]) || ''); }
  function requestTitle(row){ return clean(detail(row,'title') || row.name || 'Premium request'); }
  function requestNextAction(row){
    const status = slug(row.status || 'new');
    const custom = detail(row,'next_action');
    if(custom) return custom;
    if(status === 'documents-required') return 'Upload supporting documents in the Document Vault.';
    if(status === 'awaiting-client' || status === 'awaiting-client-response') return 'Respond to the latest admin update or continue on WhatsApp.';
    if(status === 'completed' || status === 'closed') return 'Request completed. Archive or create a new follow-up if needed.';
    if(status === 'in-progress') return 'Hey Larmah desk is coordinating the next stage.';
    return 'Request is saved and awaiting admin review.';
  }
  function statusBadge(status){ return `<span class="status-pill ${escapeHTML(statusClass(status))}">${escapeHTML(statusLabel(status))}</span>`; }
  function renderRequestCard(row){
    const category = clean(row.category || 'general');
    const title = requestTitle(row);
    const objective = detail(row,'objective') || detail(row,'message') || 'No detailed objective supplied yet.';
    const location = detail(row,'location');
    const timeline = detail(row,'timeline');
    const next = requestNextAction(row);
    const msg = `Hello Hey Larmah, I am following up on my ${labelForCategory(category)} request: ${title}.`;
    return `<article class="request-card" data-request-id="${escapeHTML(row.id || '')}"><div><div class="request-card-top"><strong>${escapeHTML(title)}</strong><span class="catalogue-tag">${escapeHTML(labelForCategory(category))}</span></div><p>${escapeHTML(objective.length > 180 ? objective.slice(0,177)+'...' : objective)}</p><div class="request-meta"><span><i class="fa-regular fa-calendar"></i> ${escapeHTML(formatDate(row.created_at))}</span>${location ? `<span><i class="fa-solid fa-location-dot"></i> ${escapeHTML(location)}</span>` : ''}${timeline ? `<span><i class="fa-regular fa-clock"></i> ${escapeHTML(timeline)}</span>` : ''}</div><div class="request-next"><strong>Next action:</strong> <span>${escapeHTML(next)}</span></div><div class="request-actions"><a class="card-link" href="${waUrl(msg)}" target="_blank" rel="noopener" data-enquiry-title="Dashboard request follow-up">Continue on WhatsApp <i class="fa-brands fa-whatsapp"></i></a></div></div><div>${statusBadge(row.status)}</div></article>`;
  }
  function renderPending(rows){
    const target = document.querySelector('[data-pending-actions]'); if(!target) return;
    const active = (rows || []).filter(r => !['completed','closed','archived'].includes(statusClass(r.status))).slice(0,5);
    target.innerHTML = active.length ? active.map(r=>`<div class="activity-item"><div><strong>${escapeHTML(requestNextAction(r))}</strong><span>${escapeHTML(requestTitle(r))} • ${escapeHTML(labelForCategory(r.category))}</span></div>${statusBadge(r.status)}</div>`).join('') : '<div class="activity-item"><strong>No pending action</strong><span>Create a request when you need support across any pillar.</span></div>';
    const countEl = document.querySelector('[data-pending-actions-count]'); if(countEl) countEl.textContent = String(active.length);
  }
  function renderUpdates(rows){
    const target = document.querySelector('[data-dashboard-updates]'); if(!target) return;
    target.innerHTML = (rows && rows.length) ? rows.slice(0,6).map(r=>`<div class="activity-item"><div><strong>${escapeHTML(requestTitle(r))}</strong><span>${escapeHTML(labelForCategory(r.category))} • ${escapeHTML(statusLabel(r.status))} • ${escapeHTML(formatDate(r.created_at))}</span></div></div>`).join('') : '<div class="activity-item"><strong>No updates yet</strong><span>Your dashboard timeline will appear after your first saved request.</span></div>';
  }
  async function hydrateDashboardCatalogue(){
    const grid = document.querySelector('[data-dashboard-catalogue]'); if(!grid || !window.HLDatabase) return;
    try{
      const rows = await window.HLDatabase.select('catalog_items', '?select=category,title,slug,description,price,tags,image_url,media_url,media_type,video_url,gallery&active=eq.true&order=featured.desc,sort_order.asc,created_at.desc&limit=8');
      grid.innerHTML = Array.isArray(rows) && rows.length ? rows.map(catalogueCard).join('') : '<article class="catalogue-card"><span class="catalogue-tag">Catalogue</span><h3>No active catalogue yet</h3><p>Admin catalogue uploads will display here for premium users.</p></article>';
    }catch{ grid.innerHTML = '<article class="catalogue-card"><span class="catalogue-tag">Catalogue</span><h3>Catalogue unavailable</h3><p>Run the Supabase schema and confirm catalogue table access.</p></article>'; }
  }
  function renderDocuments(rows){
    const list = document.querySelector('[data-document-list]'); if(!list) return;
    list.innerHTML = Array.isArray(rows) && rows.length ? rows.slice(0,12).map(doc=>`<div class="document-card"><div><strong>${escapeHTML(doc.title || 'Document')}</strong><span>${escapeHTML(labelForCategory(doc.category))} • ${escapeHTML(formatDate(doc.created_at))} • ${escapeHTML(doc.file_type || 'file')}</span></div><a href="${escapeHTML(doc.file_url || '#')}" target="_blank" rel="noopener">Preview <i class="fa-solid fa-arrow-up-right-from-square"></i></a></div>`).join('') : '<div class="activity-item"><strong>No documents yet</strong><span>Upload property papers, KYC files, invoices, waybills, cargo documents or media proof here.</span></div>';
  }
  async function hydrateDocuments(){
    if(!document.querySelector('[data-document-list]') || !window.HLDatabase) return;
    try{ const docs = await window.HLDatabase.select('request_documents','?select=id,category,title,file_url,file_type,created_at&order=created_at.desc&limit=30'); renderDocuments(docs); }
    catch{ renderDocuments([]); }
  }
  async function hydrateDashboard(user){
    window.__HLDashboardUser = user || window.__HLDashboardUser || null;
    const grid = document.querySelector('.dash-grid');
    try{
      const profile = await window.HLDatabase.getProfile?.();
      if(profile){
        const name = clean(profile.full_name || profile.company || user?.email || 'Premium user');
        document.querySelectorAll('[data-user-name]').forEach(el=>el.textContent = name);
        document.querySelectorAll('[data-profile-role]').forEach(el=>el.textContent = labelForCategory(profile.role === 'admin' ? 'premium' : (profile.role || 'premium')));
        document.querySelectorAll('[data-profile-status]').forEach(el=>el.textContent = profile.is_verified ? 'Verified Premium User' : (profile.account_status === 'suspended' ? 'Suspended' : 'Pending admin verification'));
      }
    }catch{}
    try{
      const rows = await window.HLDatabase.select('requests', '?select=id,category,status,created_at,details,name,phone&order=created_at.desc&limit=120');
      if(Array.isArray(rows)){
        const counts = rows.reduce((acc,row)=>{ acc[row.category] = (acc[row.category] || 0) + 1; return acc; }, {});
        const totalEl = document.querySelector('[data-total-requests]'); if(totalEl) totalEl.textContent = String(rows.length);
        const mapping = [['real-estate','Real Estate requests'],['fintech','Fintech requests'],['logistics','Logistics movements'],['shipping','Shipping briefs']];
        if(grid){ Array.from(grid.querySelectorAll('[data-pillar-stat]')).forEach((card)=>{ const key=card.getAttribute('data-pillar-stat'); const strong=card.querySelector('strong'); const span=card.querySelector('span'); if(strong) strong.textContent=String(counts[key]||0); if(span) span.textContent=(mapping.find(x=>x[0]===key)||['','Requests'])[1]; }); }
        mapping.forEach(([key])=>{ const latest = rows.find(r=>r.category === key); const el = document.querySelector(`[data-pillar-latest="${key}"]`); if(el) el.textContent = latest ? `${statusLabel(latest.status)} • ${requestTitle(latest)}` : 'No request yet'; });
        renderPending(rows); renderUpdates(rows);
        const list = document.querySelector('[data-dashboard-request-list]') || document.querySelector('[data-user-requests]');
        if(list){ list.innerHTML = rows.length ? rows.map(renderRequestCard).join('') : '<div class="activity-item"><strong>No requests yet</strong><span>Create your first structured request using the Request Centre.</span></div>'; }
      }
    }catch(err){
      const list = document.querySelector('[data-dashboard-request-list]') || document.querySelector('[data-user-requests]'); if(list) list.innerHTML = '<div class="activity-item"><strong>Request records unavailable</strong><span>Run the updated Supabase schema and sign in again.</span></div>';
    }
    await hydrateDocuments();
    await hydrateDashboardCatalogue();
  }
  function initDashboardInteractions(){
    const requestForm = document.querySelector('[data-dashboard-request]');
    if(requestForm){ requestForm.addEventListener('submit', async ev=>{
      ev.preventDefault();
      const form = ev.currentTarget;
      const data = formFields(form);
      const file = form.querySelector('input[name="Document"]')?.files?.[0] || null;
      const status = form.querySelector('[data-dashboard-request-status]');
      const btn = form.querySelector('button[type="submit"]');
      await withButton(btn, '<i class="fa-solid fa-spinner fa-spin"></i> Submitting…', async()=>{
        await dbReady();
        const title = clean(data.Name || 'Premium Dashboard Request');
        const payload = requestPayload(title, data, 'premium-dashboard');
        const inserted = await window.HLDatabase.insert('requests', payload);
        const row = Array.isArray(inserted) ? inserted[0] : null;
        if(file){
          try{
            const uploaded = await window.HLDatabase.uploadMediaObject(file, `client-documents/${(window.__HLDashboardUser && window.__HLDashboardUser.id) || 'user'}`);
            if(uploaded){ await window.HLDatabase.insert('request_documents', { request_id: row?.id || null, user_id: (window.__HLDashboardUser && window.__HLDashboardUser.id) || null, category: payload.category, title: clean(file.name || title), file_url: uploaded.url, file_path: uploaded.path, file_type: uploaded.media_type || uploaded.mime_type || 'file', mime_type: uploaded.mime_type || '', size: uploaded.size || 0 }, { returning:false }); }
          }catch(docErr){ console.warn('Dashboard document upload skipped:', docErr); }
        }
        setStatus(status, 'Request saved. Opening WhatsApp for follow-through.', 'success');
        showToast('Premium request saved.');
        const message = buildMessage('Premium Dashboard Request', data);
        const opened = window.open(waUrl(message), '_blank', 'noopener,noreferrer'); if(!opened) window.location.href = waUrl(message);
        form.reset();
        const user = window.__HLDashboardUser || await window.HLDatabase.getCurrentUser(); await hydrateDashboard(user);
      }).catch(err=>{ setStatus(status, err.message || 'Request could not be saved.', 'error'); showToast(err.message || 'Request could not be saved.'); });
    }); }
    document.querySelectorAll('[data-pillar-quick]').forEach(btn=>btn.addEventListener('click', ()=>{
      const pillar = btn.getAttribute('data-pillar-quick') || 'Premium'; const title = btn.getAttribute('data-title') || `${pillar} request`;
      const form = document.querySelector('[data-dashboard-request]'); if(!form) return;
      const pillarInput = form.querySelector('[name="Pillar"]'); const titleInput = form.querySelector('[name="Name"]');
      if(pillarInput) pillarInput.value = pillar; if(titleInput) titleInput.value = title;
      form.scrollIntoView({behavior:'smooth', block:'center'}); titleInput?.focus();
    }));
    const docForm = document.querySelector('[data-document-upload]');
    if(docForm){ docForm.addEventListener('submit', async ev=>{
      ev.preventDefault(); const form = ev.currentTarget; const data = formFields(form); const file = form.querySelector('input[name="file"]')?.files?.[0]; const status = form.querySelector('[data-document-status]'); const btn=form.querySelector('button[type="submit"]');
      if(!file){ showToast('Choose a document to upload.'); return; }
      await withButton(btn, '<i class="fa-solid fa-spinner fa-spin"></i> Uploading…', async()=>{
        await dbReady(); const user = window.__HLDashboardUser || await window.HLDatabase.getCurrentUser();
        const uploaded = await window.HLDatabase.uploadMediaObject(file, `client-documents/${user?.id || 'user'}`);
        await window.HLDatabase.insert('request_documents', { user_id:user?.id || null, category:clean(data.category || 'premium'), title:clean(data.title || file.name), file_url:uploaded.url, file_path:uploaded.path, file_type:uploaded.media_type || 'file', mime_type:uploaded.mime_type || file.type || '', size:uploaded.size || file.size || 0 }, { returning:false });
        setStatus(status, 'Document uploaded to your premium vault.', 'success'); showToast('Document uploaded.'); form.reset(); await hydrateDocuments();
      }).catch(err=>{ setStatus(status, err.message || 'Document upload failed. Run the dashboard schema and storage policy upgrade.', 'error'); showToast(err.message || 'Document upload failed.'); });
    }); }
  }
  initDashboardInteractions();
  guardDashboard();

  async function initAdmin(){
    const adminRoot = document.querySelector('[data-admin-root]'); if(!adminRoot) return;
    const loginPanel = document.querySelector('[data-admin-login-panel]'); const workspace = document.querySelector('[data-admin-workspace]'); const emailLabel = document.querySelector('[data-admin-email-label]');
    function setVisible(isAdmin, email){ if(loginPanel) loginPanel.hidden = !!isAdmin; if(workspace) workspace.hidden = !isAdmin; if(emailLabel) emailLabel.textContent = email || ADMIN_EMAIL; }
    async function check(){
      await dbReady();
      if(!window.HLDatabase || !window.HLDatabase.currentAccessToken || !window.HLDatabase.currentAccessToken()){ setVisible(false); return null; }
      try{ const user = await window.HLDatabase.getCurrentUser(); if(user && window.HLDatabase.isAdminEmail(user.email)){ setVisible(true, user.email); await hydrateAdmin(); return user; } setVisible(false); showToast('This account is not authorised for admin access.'); return null; }catch{ setVisible(false); return null; }
    }
    document.querySelector('[data-admin-auth]')?.addEventListener('submit', async ev=>{ ev.preventDefault(); const data = formFields(ev.currentTarget); const email = clean(data.email); const password = clean(data.password); if(email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()){ showToast('Use the approved admin email.'); return; } const btn=ev.currentTarget.querySelector('button[type="submit"]'); const original=btn?btn.textContent:''; if(btn){btn.disabled=true;btn.textContent='Verifying admin…';} try{ await window.HLDatabase.signIn(email,password); const user = await check(); if(user) showToast('Admin workspace unlocked.'); }catch(err){ showToast(err && err.message ? err.message : 'Admin sign-in failed.'); }finally{ if(btn){btn.disabled=false;btn.textContent=original;} } });
    document.querySelector('[data-admin-sign-out]')?.addEventListener('click', async()=>{ await dbReady(); await window.HLDatabase.signOut(); setVisible(false); showToast('Admin signed out.'); });
    document.querySelector('[data-invite-user]')?.addEventListener('submit', async ev=>{ ev.preventDefault(); const form=ev.currentTarget; const data=formFields(form); const email=clean(data.email); const name=clean(data.full_name); const status=form.querySelector('[data-auth-status]'); if(!email){ showToast('Enter invitee email.'); return; } const btn=form.querySelector('button[type="submit"]'); await withButton(btn, '<i class="fa-solid fa-spinner fa-spin"></i> Sending invite…', async()=>{ await dbReady(); await window.HLDatabase.inviteUser(email, { full_name:name, account_type:'premium', invited_by:ADMIN_EMAIL }); setStatus(status, 'Invitation email sent successfully.', 'success'); showToast('Invitation sent.'); form.reset(); }).catch(err=>{ setStatus(status, err.message || 'Invitation failed. Deploy the invite-user Edge Function and set service role secret.', 'error'); showToast(err.message || 'Invitation failed.'); }); });
    document.querySelector('[data-admin-refresh-users]')?.addEventListener('click', ()=>hydrateAdminUsers(true));
    document.querySelector('[data-admin-refresh-catalogue]')?.addEventListener('click', ()=>hydrateAdminCatalogue(true));
    let userSearchTimer = null;
    document.querySelector('[data-admin-user-search]')?.addEventListener('input', ()=>{ clearTimeout(userSearchTimer); userSearchTimer = setTimeout(()=>hydrateAdminUsers(true), 350); });
    document.querySelector('[data-admin-users-list]')?.addEventListener('submit', async ev=>{ ev.preventDefault(); const form=ev.target.closest('[data-user-editor]'); if(!form) return; const data=formFields(form); const btn=form.querySelector('button[type="submit"]'); const payload={ user_id: clean(data.user_id), full_name: clean(data.full_name), phone: clean(data.phone), company: clean(data.company), role: clean(data.role || 'premium'), account_status: clean(data.account_status || 'pending'), is_verified: !!form.querySelector('input[name="is_verified"]')?.checked, admin_note: clean(data.admin_note) }; await withButton(btn, '<i class="fa-solid fa-spinner fa-spin"></i> Saving…', async()=>{ await dbReady(); await window.HLDatabase.adminUsers('update_user', payload); showToast('User data updated.'); await hydrateAdminUsers(true); }).catch(err=>showToast(err.message || 'User update failed.')); });
    document.querySelector('[data-admin-refresh-requests]')?.addEventListener('click', ()=>hydrateAdminRequests(true));
    document.querySelector('[data-admin-requests-list]')?.addEventListener('submit', async ev=>{ ev.preventDefault(); const form=ev.target.closest('[data-admin-request-editor]'); if(!form) return; const data=formFields(form); const id=clean(data.id); if(!id) return; const btn=form.querySelector('button[type="submit"]'); const prior = await window.HLDatabase.select('requests', `?select=details&id=eq.${encodeURIComponent(id)}&limit=1`).catch(()=>[]); const currentDetails = Array.isArray(prior) && prior[0] && prior[0].details && typeof prior[0].details === 'object' ? prior[0].details : {}; const details=Object.assign({}, currentDetails, { next_action: clean(data.next_action), admin_note: clean(data.admin_note), updated_by: ADMIN_EMAIL, updated_at: new Date().toISOString() }); await withButton(btn, '<i class="fa-solid fa-spinner fa-spin"></i> Saving…', async()=>{ await dbReady(); await window.HLDatabase.update('requests', `?id=eq.${encodeURIComponent(id)}`, { status: clean(data.status || 'new'), details }, { returning:false }); showToast('Request updated for client dashboard.'); await hydrateAdminRequests(true); }).catch(err=>showToast(err.message || 'Request update failed.')); });
    document.querySelector('[data-admin-users-list]')?.addEventListener('click', async ev=>{ const btn=ev.target.closest('[data-verify-user]'); if(!btn) return; const form=btn.closest('[data-user-editor]'); const user_id=form?.querySelector('input[name="user_id"]')?.value; if(!user_id) return; await withButton(btn, '<i class="fa-solid fa-spinner fa-spin"></i> Verifying…', async()=>{ await dbReady(); await window.HLDatabase.adminUsers('verify_user', { user_id }); showToast('User verified successfully.'); await hydrateAdminUsers(true); }).catch(err=>showToast(err.message || 'Verification failed.')); });
    document.querySelector('[data-catalogue-priority-list]')?.addEventListener('click', ev=>{
      const prefill = ev.target.closest('[data-prefill-catalogue]');
      if(prefill){ prefillCatalogueCreate(prefill.getAttribute('data-prefill-catalogue')); return; }
      const jump = ev.target.closest('[data-jump-catalogue]');
      if(jump){ scrollToCatalogueRecord(jump.getAttribute('data-jump-catalogue')); }
    });
    document.querySelector('[data-admin-catalogue-list]')?.addEventListener('submit', async ev=>{
      ev.preventDefault();
      const form = ev.target.closest('[data-catalogue-editor]'); if(!form) return;
      const data = formFields(form); const id = clean(data.id);
      if(!id){ showToast('Catalogue record ID missing.'); return; }
      const file = form.querySelector('input[name="media_file"]')?.files?.[0];
      const btn = form.querySelector('button[type="submit"]');
      await withButton(btn, '<i class="fa-solid fa-spinner fa-spin"></i> Saving…', async()=>{
        await dbReady();
        let media_url = clean(data.media_url); let media_type = mediaKind(media_url, data.media_type);
        let image_url = media_type === 'image' ? media_url : ''; let video_url = media_type === 'video' ? media_url : '';
        if(file){ const uploaded = await window.HLDatabase.uploadMediaObject(file, 'catalogue/updates'); media_url = uploaded.url; media_type = uploaded.media_type; image_url = media_type === 'image' ? media_url : ''; video_url = media_type === 'video' ? media_url : ''; }
        const payload = { category: clean(data.category), title: clean(data.title), description: clean(data.description), price: clean(data.price), media_url, media_type, image_url, video_url, tags: clean(data.tags).split(',').map(x=>x.trim()).filter(Boolean), active: clean(data.active) === 'true', featured: !!form.querySelector('input[name="featured"]')?.checked, sort_order: parseInt(data.sort_order,10)||0, updated_at: new Date().toISOString() };
        await window.HLDatabase.update('catalog_items', `?id=eq.${encodeURIComponent(id)}`, payload);
        showToast('Catalogue record updated.'); await hydrateAdminCatalogue(true);
      }).catch(err=>showToast(err.message || 'Catalogue update failed.'));
    });
    document.querySelector('[data-catalogue-upload]')?.addEventListener('submit', async ev=>{
      ev.preventDefault();
      const form=ev.currentTarget; const data=formFields(form);
      const primary=form.querySelector('input[name="media_file"]')?.files?.[0] || form.querySelector('input[name="image_file"]')?.files?.[0];
      const galleryFiles=Array.from(form.querySelector('input[name="gallery_files"]')?.files || []);
      const btn=form.querySelector('button[type="submit"]'); const status=form.querySelector('[data-catalogue-status]');
      await withButton(btn, '<i class="fa-solid fa-spinner fa-spin"></i> Publishing catalogue…', async()=>{
        await dbReady();
        let media_url=clean(data.media_url || data.image_url); let media_type=mediaKind(media_url, data.media_type);
        let image_url = media_type === 'image' ? media_url : ''; let video_url = media_type === 'video' ? media_url : '';
        if(primary){ const uploaded = await window.HLDatabase.uploadMediaObject(primary,'catalogue'); media_url = uploaded.url; media_type = uploaded.media_type; image_url = media_type === 'image' ? media_url : ''; video_url = media_type === 'video' ? media_url : ''; }
        const gallery=[];
        for(const file of galleryFiles){ const uploaded = await window.HLDatabase.uploadMediaObject(file,'catalogue/gallery'); if(uploaded) gallery.push(uploaded); }
        const payload={ category: clean(data.category), title: clean(data.title), description: clean(data.description), price: clean(data.price), image_url, media_url, media_type, video_url, gallery, tags: clean(data.tags).split(',').map(x=>x.trim()).filter(Boolean), active: data.active === 'on', featured: data.featured === 'on', sort_order: parseInt(data.sort_order,10)||0 };
        await window.HLDatabase.insert('catalog_items', payload);
        setStatus(status, 'Catalogue item published with media support.', 'success');
        showToast('Catalogue item published.'); form.reset(); await hydrateAdmin();
      }).catch(err=>{ setStatus(status, err.message || 'Catalogue upload failed.', 'error'); showToast(err.message || 'Catalogue upload failed.'); });
    });
    document.querySelector('[data-insight-upload]')?.addEventListener('submit', async ev=>{
      ev.preventDefault();
      const form=ev.currentTarget; const data=formFields(form); const primary=form.querySelector('input[name="media_file"]')?.files?.[0] || form.querySelector('input[name="image_file"]')?.files?.[0];
      const btn=form.querySelector('button[type="submit"]'); const status=form.querySelector('[data-insight-status]');
      await withButton(btn, '<i class="fa-solid fa-spinner fa-spin"></i> Publishing blog…', async()=>{
        await dbReady();
        let media_url=clean(data.media_url || data.image_url); let media_type=mediaKind(media_url, data.media_type);
        let image_url = media_type === 'image' ? media_url : ''; let video_url = media_type === 'video' ? media_url : '';
        if(primary){ const uploaded = await window.HLDatabase.uploadMediaObject(primary,'insights'); media_url = uploaded.url; media_type = uploaded.media_type; image_url = media_type === 'image' ? media_url : ''; video_url = media_type === 'video' ? media_url : ''; }
        const payload={ title: clean(data.title), slug: clean(data.slug || slug(data.title)), category: clean(data.category || 'Enterprise'), excerpt: clean(data.excerpt), body: clean(data.body), read_time: clean(data.read_time || '4 min read'), author: clean(data.author || 'Hey Larmah Editorial Desk'), tags: clean(data.tags).split(',').map(x=>x.trim()).filter(Boolean), image_url, media_url, media_type, video_url, pinned: data.pinned === 'on', active: data.active === 'on', published_at: new Date().toISOString() };
        await window.HLDatabase.insert('insights_posts', payload);
        setStatus(status, 'Blog post published successfully.', 'success');
        showToast('Insight blog post published.'); form.reset(); await hydrateAdmin();
      }).catch(err=>{ setStatus(status, err.message || 'Insight upload failed.', 'error'); showToast(err.message || 'Insight upload failed.'); });
    });
    await check();
  }
  const PRIORITY_CATALOGUE_ITEMS = [
    { key:'shipping-import-export', title:'Import & Export Coordination', category:'shipping', description:'Trade documentation and freight coordination for importers and exporters.', tags:'freight, trade', sort_order:40, featured:true },
    { key:'real-estate-land-acquisition', title:'Land Acquisition Support', category:'real-estate', description:'Structured guidance for title checks, surveys and acquisition coordination.', tags:'land, documentation', sort_order:12, featured:true },
    { key:'fintech-merchant-payment', title:'Merchant Payment Setup', category:'fintech', description:'Digital payment readiness support for SMEs and trade-focused businesses.', tags:'payments, sme', sort_order:20, featured:true },
    { key:'logistics-corporate-delivery', title:'Corporate Delivery Coordination', category:'logistics', description:'Structured local and interstate movement support for businesses.', tags:'delivery, movement', sort_order:30, featured:true },
    { key:'real-estate-verified-property', title:'Verified Property Sourcing', category:'real-estate', description:'Curated property options with inspection and documentation guidance.', tags:'property, inspection', sort_order:10, featured:true },
    { key:'premium-priority-enterprise', title:'Priority Enterprise Desk', category:'premium', description:'A private support lane for serious enquiries across all four pillars.', tags:'priority, enterprise', sort_order:50, featured:true }
  ];
  function priorityCatalogueSpec(row){
    return PRIORITY_CATALOGUE_ITEMS.find(spec => clean(row && row.title).toLowerCase() === spec.title.toLowerCase() && clean(row && row.category) === spec.category) || null;
  }
  function priorityIndex(row){ const spec = priorityCatalogueSpec(row); return spec ? PRIORITY_CATALOGUE_ITEMS.findIndex(x => x.key === spec.key) : 999; }
  function priorityCatalogueSort(rows){
    return Array.isArray(rows) ? rows.slice().sort((a,b)=>{
      const ai = priorityIndex(a), bi = priorityIndex(b);
      if(ai !== bi) return ai - bi;
      return (Number(a.sort_order)||0) - (Number(b.sort_order)||0) || clean(a.title).localeCompare(clean(b.title));
    }) : [];
  }
  function setCreateField(form, name, value){ const field=form && form.querySelector(`[name="${name}"]`); if(field) field.value = value == null ? '' : String(value); }
  function setCreateCheck(form, name, value){ const field=form && form.querySelector(`input[name="${name}"]`); if(field) field.checked = !!value; }
  function prefillCatalogueCreate(key){
    const spec = PRIORITY_CATALOGUE_ITEMS.find(x=>x.key === key); const form=document.querySelector('[data-catalogue-upload]');
    if(!spec || !form) return;
    setCreateField(form,'category',spec.category); setCreateField(form,'title',spec.title); setCreateField(form,'description',spec.description); setCreateField(form,'tags',spec.tags); setCreateField(form,'sort_order',spec.sort_order);
    setCreateCheck(form,'featured',spec.featured); setCreateCheck(form,'active',true);
    form.scrollIntoView({ behavior:'smooth', block:'center' }); showToast(`Starter ready: ${spec.title}`);
  }
  function scrollToCatalogueRecord(id){
    const target = document.querySelector(`[data-catalogue-editor][data-record-id="${window.CSS && window.CSS.escape ? window.CSS.escape(id) : id}"]`);
    if(target){ target.scrollIntoView({ behavior:'smooth', block:'center' }); target.classList.add('priority-flash'); setTimeout(()=>target.classList.remove('priority-flash'), 1800); }
  }
  function renderPriorityCatalogueList(rows){
    const target=document.querySelector('[data-catalogue-priority-list]'); if(!target) return;
    const records=Array.isArray(rows) ? rows : [];
    target.innerHTML = PRIORITY_CATALOGUE_ITEMS.map(spec=>{
      const matches = records.filter(item => clean(item.title).toLowerCase() === spec.title.toLowerCase() && clean(item.category) === spec.category);
      if(!matches.length){
        return `<div class="admin-list-item priority-row missing"><span><strong>${escapeHTML(spec.title)}</strong><br>${escapeHTML(labelForCategory(spec.category))} • Missing from database</span><span class="status-pill pending">Create</span><div class="admin-list-actions"><button class="btn btn-ghost btn-sm" type="button" data-prefill-catalogue="${escapeHTML(spec.key)}"><i class="fa-solid fa-plus"></i> Prefill</button></div></div>`;
      }
      return matches.map((item, idx)=>{
        const duplicate = matches.length > 1 ? ` • Duplicate ${idx + 1}/${matches.length}` : '';
        return `<div class="admin-list-item priority-row"><span><strong>${escapeHTML(item.title)}</strong><br>${escapeHTML(labelForCategory(item.category))} • ${item.active ? 'Active' : 'Draft'}${duplicate}</span><span class="status-pill ${item.active ? 'verified' : 'pending'}">${item.active ? 'Active' : 'Draft'}</span><div class="admin-list-actions"><button class="btn btn-primary btn-sm" type="button" data-jump-catalogue="${escapeHTML(item.id || '')}"><i class="fa-solid fa-pen-to-square"></i> Edit</button></div></div>`;
      }).join('');
    }).join('');
  }
  function selected(value, expected){ return clean(value) === clean(expected) ? 'selected' : ''; }
  function checked(value){ return value ? 'checked' : ''; }
  function tagsToText(value){ return Array.isArray(value) ? value.join(', ') : clean(value || ''); }
  function catalogueEditor(row){
    const id = clean(row.id);
    const title = clean(row.title || 'Catalogue item');
    const category = clean(row.category || 'premium');
    const priority = priorityCatalogueSpec(row);
    const description = clean(row.description || '');
    const price = clean(row.price || '');
    const mediaUrl = clean(row.media_url || row.video_url || row.image_url || '');
    const mediaType = clean(row.media_type || mediaTypeFromUrl(mediaUrl) || 'image');
    const tags = tagsToText(row.tags);
    const sortOrder = Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0;
    const priorityBadge = priority ? '<span class="plan-kicker catalogue-priority-kicker">Priority editable</span>' : '';
    return `<form class="admin-catalogue-card ${priority ? 'priority-catalogue-card' : ''}" data-catalogue-editor data-record-id="${escapeHTML(id)}">
      <input type="hidden" name="id" value="${escapeHTML(id)}" />
      <div class="admin-catalogue-top"><div>${priorityBadge}<strong>${escapeHTML(title)}</strong><span>${escapeHTML(labelForCategory(category))} • ${row.active ? 'Active' : 'Draft'}</span></div><span class="status-pill ${row.active ? 'verified' : 'pending'}">${row.active ? 'Active' : 'Draft'}</span></div>
      <div class="admin-user-fields admin-catalogue-fields">
        <div class="form-row"><label>Title</label><input name="title" value="${escapeHTML(title)}" required /></div>
        <div class="form-row"><label>Category</label><select name="category"><option value="real-estate" ${selected(category,'real-estate')}>Real Estate</option><option value="fintech" ${selected(category,'fintech')}>Fintech</option><option value="logistics" ${selected(category,'logistics')}>Logistics</option><option value="shipping" ${selected(category,'shipping')}>Shipping</option><option value="premium" ${selected(category,'premium')}>Premium</option></select></div>
        <div class="form-row"><label>Status</label><select name="active"><option value="true" ${row.active ? 'selected' : ''}>Active</option><option value="false" ${!row.active ? 'selected' : ''}>Draft</option></select></div>
        <div class="form-row"><label>Description</label><textarea name="description">${escapeHTML(description)}</textarea></div>
        <div class="form-row"><label>Media URL</label><input name="media_url" value="${escapeHTML(mediaUrl)}" placeholder="Photo or video URL" /></div>
        <div class="form-row"><label>Replace photo/video</label><input type="file" name="media_file" accept="image/*,video/*" /><small class="field-note">Optional: upload a new primary media file.</small></div>
        <div class="form-row"><label>Price / note</label><input name="price" value="${escapeHTML(price)}" placeholder="Optional" /></div>
        <div class="form-row"><label>Tags</label><input name="tags" value="${escapeHTML(tags)}" placeholder="comma separated" /></div>
        <div class="form-row"><label>Sort order</label><input type="number" name="sort_order" value="${escapeHTML(String(sortOrder))}" /></div>
      </div>
      <div class="catalogue-editor-checks"><label class="check-row"><input type="checkbox" name="featured" ${checked(row.featured)} /> Feature on homepage</label></div>
      <div class="admin-user-actions"><button class="btn btn-primary btn-sm" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save catalogue</button><a class="btn btn-ghost btn-sm" href="${escapeHTML(mediaUrl || '#')}" target="_blank" rel="noopener"><i class="fa-solid fa-up-right-from-square"></i> Preview media</a></div>
    </form>`;
  }
  function userCard(record){
    const user = record.user || record;
    const profile = record.profile || {};
    const id = clean(user.id || profile.id);
    const email = clean(user.email || profile.email || 'No email');
    const fullName = clean(profile.full_name || user.user_metadata?.full_name || '');
    const phone = clean(profile.phone || user.user_metadata?.phone || '');
    const company = clean(profile.company || user.user_metadata?.company || '');
    const role = clean(profile.role || user.user_metadata?.account_type || 'premium');
    const status = clean(profile.account_status || (profile.is_verified ? 'verified' : 'pending'));
    const verified = !!profile.is_verified;
    const note = clean(profile.last_admin_note || '');
    const lastSignIn = clean(user.last_sign_in_at || 'Not yet signed in');
    return `<form class="admin-user-card" data-user-editor data-user-id="${escapeHTML(id)}">
      <input type="hidden" name="user_id" value="${escapeHTML(id)}" />
      <div class="admin-user-top"><div><strong>${escapeHTML(email)}</strong><span>${verified ? 'Verified premium user' : 'Pending verification'} • Last sign in: ${escapeHTML(lastSignIn)}</span></div><span class="status-pill ${verified ? 'verified' : 'pending'}">${verified ? 'Verified' : 'Pending'}</span></div>
      <div class="admin-user-fields">
        <div class="form-row"><label>Full name</label><input name="full_name" value="${escapeHTML(fullName)}" placeholder="Full name" /></div>
        <div class="form-row"><label>Phone</label><input name="phone" value="${escapeHTML(phone)}" placeholder="Phone number" /></div>
        <div class="form-row"><label>Company</label><input name="company" value="${escapeHTML(company)}" placeholder="Company / client profile" /></div>
        <div class="form-row"><label>Role</label><select name="role"><option value="premium" ${selected(role,'premium')}>Premium</option><option value="user" ${selected(role,'user')}>User</option>${email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? `<option value="admin" ${selected(role,'admin')}>Admin</option>` : ``}</select></div>
        <div class="form-row"><label>Status</label><select name="account_status"><option value="pending" ${selected(status,'pending')}>Pending</option><option value="verified" ${selected(status,'verified')}>Verified</option><option value="suspended" ${selected(status,'suspended')}>Suspended</option></select></div>
        <div class="form-row"><label>Admin note</label><input name="admin_note" value="${escapeHTML(note)}" placeholder="Optional internal note" /></div>
      </div>
      <label class="check-row"><input type="checkbox" name="is_verified" ${checked(verified)} /> Verified account</label>
      <div class="admin-user-actions"><button class="btn btn-primary btn-sm" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save data</button><button class="btn btn-ghost btn-sm" type="button" data-verify-user><i class="fa-solid fa-circle-check"></i> Verify user</button></div>
    </form>`;
  }
  function adminRequestCard(row){
    const category = clean(row.category || 'general');
    const title = requestTitle(row);
    const next = requestNextAction(row);
    const adminNote = detail(row,'admin_note');
    return `<article class="admin-request-card"><div class="admin-request-top"><div><strong>${escapeHTML(title)}</strong><span>${escapeHTML(labelForCategory(category))} • ${escapeHTML(formatDate(row.created_at))}</span></div>${statusBadge(row.status)}</div><form class="admin-request-editor" data-admin-request-editor><input type="hidden" name="id" value="${escapeHTML(row.id || '')}" /><div class="form-row"><label>Status</label><select name="status"><option value="new" ${selected(row.status,'new')}>New</option><option value="under-review" ${selected(row.status,'under-review')}>Under Review</option><option value="documents-required" ${selected(row.status,'documents-required')}>Documents Required</option><option value="in-progress" ${selected(row.status,'in-progress')}>In Progress</option><option value="awaiting-client" ${selected(row.status,'awaiting-client')}>Awaiting Client</option><option value="scheduled" ${selected(row.status,'scheduled')}>Scheduled</option><option value="completed" ${selected(row.status,'completed')}>Completed</option><option value="closed" ${selected(row.status,'closed')}>Closed</option><option value="archived" ${selected(row.status,'archived')}>Archived</option></select></div><div class="form-row"><label>Next action</label><input name="next_action" value="${escapeHTML(next)}" /></div><div class="form-row full-span"><label>Admin note</label><textarea name="admin_note" placeholder="Private or client-facing progress note">${escapeHTML(adminNote)}</textarea></div><button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Update request</button></form></article>`;
  }
  async function hydrateAdminRequests(force){
    const list = document.querySelector('[data-admin-requests-list]'); if(!list || !window.HLDatabase) return;
    if(force) list.innerHTML = '<div class="admin-list-item"><span><strong>Loading client requests…</strong><br>Fetching premium request records.</span></div>';
    try{
      const rows = await window.HLDatabase.select('requests','?select=id,category,status,created_at,details,name,phone&order=created_at.desc&limit=80');
      list.innerHTML = Array.isArray(rows) && rows.length ? rows.map(adminRequestCard).join('') : '<div class="admin-list-item"><span><strong>No client requests yet.</strong><br>Premium user dashboard requests will appear here.</span></div>';
    }catch(err){ list.innerHTML = '<div class="admin-list-item"><span><strong>Unable to load requests.</strong><br>Run the updated schema and confirm admin policies.</span></div>'; }
  }

  async function hydrateAdminUsers(force){
    const list=document.querySelector('[data-admin-users-list]'); if(!list || !window.HLDatabase || !window.HLDatabase.adminUsers) return;
    const stats=document.querySelector('[data-admin-user-stats] strong');
    const search=clean(document.querySelector('[data-admin-user-search]')?.value || '');
    if(force) list.innerHTML = '<div class="admin-list-item"><span><strong>Refreshing users…</strong><br>Please wait while the secured admin function responds.</span></div>';
    try{
      const data = await window.HLDatabase.adminUsers('list_users', { search, page:1, per_page:40 });
      const users = Array.isArray(data?.users) ? data.users : [];
      if(stats) stats.textContent = `${users.length} shown`;
      list.innerHTML = users.length ? users.map(userCard).join('') : '<div class="admin-list-item"><span><strong>No users found.</strong><br>Invite or register premium users to manage them here.</span></div>';
    }catch(err){
      if(stats) stats.textContent = 'Function required';
      list.innerHTML = `<div class="admin-list-item"><span><strong>User management is not connected yet.</strong><br>${escapeHTML(err.message || 'Deploy the admin-users Edge Function and set Supabase service role secrets.')}</span></div>`;
    }
  }
  async function hydrateAdminCatalogue(force){
    const list=document.querySelector('[data-admin-catalogue-list]');
    if(!list || !window.HLDatabase || !window.HLDatabase.select) return;
    if(force) list.innerHTML = '<div class="admin-list-item"><span><strong>Refreshing catalogue…</strong><br>Loading editable records from Supabase.</span></div>';
    try{
      const cats = await window.HLDatabase.select('catalog_items','?select=id,category,title,description,price,tags,active,featured,sort_order,image_url,media_url,media_type,video_url,created_at,updated_at&order=category.asc,sort_order.asc,created_at.desc&limit=120');
      const sorted = priorityCatalogueSort(cats);
      renderPriorityCatalogueList(sorted);
      if(Array.isArray(sorted) && sorted.length){
        list.innerHTML = sorted.map(catalogueEditor).join('');
      }else{
        list.innerHTML = '<div class="admin-list-item"><span><strong>No catalogue records yet.</strong><br>Use the upload form above to publish the first record.</span></div>';
      }
    }catch(err){
      list.innerHTML = `<div class="admin-list-item"><span><strong>Catalogue management is not connected yet.</strong><br>${escapeHTML(err.message || 'Run schema.sql and sign in with the admin account.')}</span></div>`;
      const priority=document.querySelector('[data-catalogue-priority-list]');
      if(priority) priority.innerHTML = `<div class="admin-list-item"><span><strong>Priority catalogue records could not load.</strong><br>${escapeHTML(err.message || 'Run schema.sql and sign in with the admin account.')}</span></div>`;
    }
  }
  async function hydrateAdmin(){
    await hydrateAdminCatalogue(false);
    await hydrateAdminRequests(false);
    try{ const posts = await window.HLDatabase.select('insights_posts','?select=category,title,active,media_type,created_at&order=created_at.desc&limit=8'); const list=document.querySelector('[data-admin-insight-list]'); if(list && Array.isArray(posts)){ list.innerHTML = posts.length ? posts.map(x=>`<div class="admin-list-item"><span><strong>${escapeHTML(x.title)}</strong><br>${escapeHTML(x.category)} • ${escapeHTML(x.media_type || 'article')}</span><span>${x.active?'Live':'Draft'}</span></div>`).join('') : '<div class="admin-list-item"><span>No insight posts yet.</span></div>'; } }catch{}
    await hydrateAdminUsers(false);
  }
  initAdmin();
})();
