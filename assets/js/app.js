(function(){
  "use strict";

  const BRAND = "Hey Larmah Enterprise Limited";
  const RC = "RC: 9488632";
  const PHONE = (window.HL_CONFIG && window.HL_CONFIG.whatsappNumber) || "2347063080605";
  const toast = document.getElementById('toast');

  function showToast(message){
    if(!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.__HLToast);
    window.__HLToast = setTimeout(()=>toast.classList.remove('show'), 3600);
  }

  function encode(s){ return encodeURIComponent(String(s||'').trim()); }
  function clean(s){ return String(s || '').trim(); }
  function slug(s){
    return clean(s).toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'general';
  }
  function categoryFrom(value){
    const raw = slug(value || document.body.getAttribute('data-page') || 'general');
    if(raw.includes('real')) return 'real-estate';
    if(raw.includes('fintech') || raw.includes('exchange') || raw.includes('fx')) return 'fintech';
    if(raw.includes('logistics')) return 'logistics';
    if(raw.includes('shipping')) return 'shipping';
    if(raw.includes('premium')) return 'premium';
    if(raw.includes('contact')) return 'contact';
    if(raw.includes('insight')) return 'insights';
    if(['real-estate','fintech','logistics','shipping','premium','contact','insights','whatsapp','general'].includes(raw)) return raw;
    return 'general';
  }
  function buildMessage(title, fields){
    const lines = [`${BRAND} — ${title}`, RC, ''];
    Object.entries(fields).forEach(([key,val])=>{
      const v = clean(val);
      if(v) lines.push(`${key}: ${v}`);
    });
    lines.push('', 'Sent from website');
    return lines.join('\n');
  }
  function formFields(form){
    return Object.fromEntries(new FormData(form).entries());
  }
  function requestPayload(title, fields, source){
    const category = categoryFrom(fields.Pillar || fields.Category || (source === 'whatsapp-link' ? document.body.getAttribute('data-page') : title) || source);
    const contact = clean(fields.Contact || fields.Phone || fields.Email || fields.email || '');
    return {
      category,
      name: clean(fields.Name || fields.name || ''),
      phone: contact,
      details: {
        title,
        source: source || 'website',
        page: location.pathname.split('/').pop() || 'index.html',
        url: location.href,
        rc: RC,
        fields
      }
    };
  }
  async function saveEnquiry(title, fields, source){
    if(!window.HLDatabase || !window.HLDatabase.insert) return null;
    return window.HLDatabase.insert('requests', requestPayload(title, fields, source), { returning: false });
  }

  document.querySelectorAll('[data-year]').forEach(el=>el.textContent = new Date().getFullYear());

  const menuBtn = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobileMenu');
  if(menuBtn && menu){
    menuBtn.addEventListener('click', ()=>{
      const open = !menu.classList.contains('open');
      menu.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
    });
  }

  const themeBtn = document.querySelector('[data-theme-toggle]');
  const root = document.documentElement;
  try{
    const saved = localStorage.getItem('hey_larmah_theme');
    if(saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
  }catch{}
  function setThemeIcon(){
    if(!themeBtn) return;
    const icon = themeBtn.querySelector('i');
    if(icon) icon.className = root.getAttribute('data-theme') === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
  setThemeIcon();
  if(themeBtn){
    themeBtn.addEventListener('click', ()=>{
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try{ localStorage.setItem('hey_larmah_theme', next); }catch{}
      setThemeIcon();
    });
  }

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries=>{
    entries.forEach(entry=>{ if(entry.isIntersecting){ entry.target.classList.add('in'); observer.unobserve(entry.target); } });
  }, {threshold:.12}) : null;
  document.querySelectorAll('.reveal').forEach(el=>observer ? observer.observe(el) : el.classList.add('in'));

  document.querySelectorAll('.js-wa-form').forEach(form=>{
    form.addEventListener('submit', ev=>{
      ev.preventDefault();
      const data = formFields(form);
      const title = form.getAttribute('data-wa-title') || 'Website Enquiry';
      const message = buildMessage(title, data);
      const url = `https://wa.me/${PHONE}?text=${encode(message)}`;
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if(!opened) window.location.href = url;
      saveEnquiry(title, data, 'contact-form')
        .then(()=>showToast('Enquiry saved. Opening WhatsApp chat…'))
        .catch(()=>showToast('Opening WhatsApp chat. Database save will retry after setup.'));
      form.reset();
    });
  });

  document.querySelectorAll('a[href*="wa.me/"]').forEach(link=>{
    link.addEventListener('click', ()=>{
      const label = clean(link.textContent) || link.getAttribute('aria-label') || 'WhatsApp enquiry';
      const title = link.getAttribute('data-enquiry-title') || label;
      const fields = { Enquiry: title, Link: link.href, Page: location.pathname };
      saveEnquiry(title, fields, 'whatsapp-link').catch(()=>{});
    }, { passive:true });
  });

  document.querySelectorAll('[data-auth-form]').forEach(form=>{
    form.addEventListener('submit', async ev=>{
      ev.preventDefault();
      const data = formFields(form);
      const email = clean(data.email || data.Email);
      const password = clean(data.password || data.Password);
      const mode = form.getAttribute('data-auth-mode') || 'login';
      if(!email || !password){ showToast('Enter email and password.'); return; }
      if(!window.HLDatabase){ showToast('Supabase is not configured.'); return; }
      const button = form.querySelector('button[type="submit"]');
      const original = button ? button.textContent : '';
      if(button){ button.disabled = true; button.textContent = mode === 'register' ? 'Creating account…' : 'Signing in…'; }
      try{
        if(mode === 'register'){
          await window.HLDatabase.signUp(email, password);
          showToast('Account created. Check email if confirmation is required.');
        } else {
          await window.HLDatabase.signIn(email, password);
          showToast('Signed in. Opening dashboard…');
        }
        setTimeout(()=>{ window.location.href = 'dashboard.html'; }, 800);
      }catch(err){
        showToast(err && err.message ? err.message : 'Unable to continue.');
      }finally{
        if(button){ button.disabled = false; button.textContent = original; }
      }
    });
  });

  document.querySelectorAll('[data-demo-auth]').forEach(form=>{
    form.addEventListener('submit', ev=>{
      ev.preventDefault();
      showToast('Demo access confirmed. Opening dashboard…');
      setTimeout(()=>{ window.location.href='dashboard.html'; }, 700);
    });
  });

  function setupPagination(section){
    const perPage = Math.max(1, parseInt(section.getAttribute('data-paginate'), 10) || 6);
    const grid = section.querySelector('[data-page-grid]');
    const pager = section.querySelector('[data-pagination]');
    if(!grid || !pager) return;
    const items = Array.from(grid.children).filter(el => el.matches('[data-item]'));
    if(items.length <= perPage){ pager.hidden = true; return; }
    let current = 1;
    const total = Math.ceil(items.length / perPage);
    function button(label, page, disabled=false, active=false){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.disabled = disabled;
      if(active) btn.classList.add('active');
      btn.addEventListener('click', ()=>{ current = page; render(true); });
      return btn;
    }
    function render(scroll){
      const start = (current - 1) * perPage;
      const end = start + perPage;
      items.forEach((item, i)=>{ item.hidden = !(i >= start && i < end); });
      pager.innerHTML = '';
      pager.appendChild(button('Prev', Math.max(1,current-1), current === 1));
      for(let i=1;i<=total;i++) pager.appendChild(button(String(i), i, false, i === current));
      pager.appendChild(button('Next', Math.min(total,current+1), current === total));
      if(scroll) section.scrollIntoView({behavior:'smooth', block:'start'});
    }
    render(false);
  }

  function escapeHTML(value){
    return clean(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }
  function labelForCategory(category){
    return ({
      'real-estate':'Real Estate',
      fintech:'Fintech',
      logistics:'Logistics',
      shipping:'Shipping',
      premium:'Premium',
      insights:'Insights'
    })[category] || 'Enterprise';
  }
  function iconForCategory(category){
    return ({
      'real-estate':'fa-solid fa-building',
      fintech:'fa-solid fa-chart-line',
      logistics:'fa-solid fa-truck-fast',
      shipping:'fa-solid fa-ship',
      premium:'fa-solid fa-crown',
      insights:'fa-solid fa-lightbulb'
    })[category] || 'fa-solid fa-layer-group';
  }
  function catalogueCard(row){
    const category = clean(row.category || 'general');
    const title = clean(row.title || 'Enterprise Catalogue Item');
    const description = clean(row.description || 'Speak with Hey Larmah Enterprise Limited for details.');
    const msg = `Hello Hey Larmah, I want to enquire about ${title}.`;
    return `<article class="catalogue-card reveal in" data-item>
          <div class="catalogue-icon"><i class="${iconForCategory(category)}"></i></div>
          <span class="catalogue-tag">${escapeHTML(labelForCategory(category))}</span>
          <h3>${escapeHTML(title)}</h3>
          <p>${escapeHTML(description)}</p>
          <a class="card-link" href="https://wa.me/${PHONE}?text=${encode(msg)}" target="_blank" rel="noopener" data-enquiry-title="${escapeHTML(title)}">Enquire <i class="fa-brands fa-whatsapp"></i></a>
        </article>`;
  }
  function insightCard(row){
    const title = clean(row.title || 'Hey Larmah Insight');
    const body = clean(row.body || 'Speak with Hey Larmah Enterprise Limited for details.');
    const msg = `Hello Hey Larmah, I read your insight: ${title}. I would like to enquire.`;
    return `<article class="article-card card reveal in" data-item>
          <span>Insight</span>
          <h3>${escapeHTML(title)}</h3>
          <p>${escapeHTML(body.length > 180 ? body.slice(0, 177) + '...' : body)}</p>
          <a class="card-link" href="https://wa.me/${PHONE}?text=${encode(msg)}" target="_blank" rel="noopener" data-enquiry-title="${escapeHTML(title)}">Discuss this <i class="fa-brands fa-whatsapp"></i></a>
        </article>`;
  }
  async function hydrateCatalogues(){
    if(!window.HLDatabase || !window.HLDatabase.select) return;
    const page = document.body.getAttribute('data-page') || 'home';
    try{
      if(page === 'insights'){
        const grid = document.querySelector('.article-grid[data-page-grid]');
        if(!grid) return;
        const rows = await window.HLDatabase.select('insights_posts', '?select=title,body,pinned,created_at&active=eq.true&order=pinned.desc,created_at.desc&limit=18');
        if(Array.isArray(rows) && rows.length){
          grid.innerHTML = rows.map(insightCard).join('');
        }
        return;
      }
      const allowed = ['real-estate','fintech','logistics','shipping','premium'];
      if(page === 'home'){
        const grid = document.querySelector('#catalogue-preview .catalogue-grid');
        if(!grid) return;
        const rows = await window.HLDatabase.select('catalog_items', '?select=category,title,description,price,tags,image_url&active=eq.true&order=sort_order.asc,created_at.desc&limit=6');
        if(Array.isArray(rows) && rows.length >= 6){
          grid.innerHTML = rows.slice(0,6).map(catalogueCard).join('');
        }
        return;
      }
      if(allowed.includes(page)){
        const grid = document.querySelector('.catalogue-grid[data-page-grid]');
        if(!grid) return;
        const rows = await window.HLDatabase.select('catalog_items', `?select=category,title,description,price,tags,image_url&active=eq.true&category=eq.${page}&order=sort_order.asc,created_at.desc&limit=48`);
        if(Array.isArray(rows) && rows.length){
          grid.innerHTML = rows.map(catalogueCard).join('');
        }
      }
    }catch(err){
      // Static catalogue stays visible if database content is not ready yet.
    }
  }

  document.querySelectorAll('[data-paginate]').forEach(setupPagination);
  hydrateCatalogues().then(()=>document.querySelectorAll('[data-paginate]').forEach(setupPagination));

  async function hydrateDashboard(){
    const grid = document.querySelector('.dash-grid');
    if(!grid || !window.HLDatabase) return;
    try{
      const rows = await window.HLDatabase.select('requests', '?select=category&limit=1000');
      if(!Array.isArray(rows)) return;
      const counts = rows.reduce((acc,row)=>{ acc[row.category] = (acc[row.category] || 0) + 1; return acc; }, {});
      const mapping = [
        ['real-estate','Real Estate requests'],
        ['fintech','Fintech enquiries'],
        ['logistics','Logistics movements'],
        ['shipping','Shipping briefs']
      ];
      Array.from(grid.querySelectorAll('.dash-card')).forEach((card, i)=>{
        const key = mapping[i] && mapping[i][0];
        const label = mapping[i] && mapping[i][1];
        const strong = card.querySelector('strong');
        const span = card.querySelector('span');
        if(strong && key) strong.textContent = String(counts[key] || 0);
        if(span && label) span.textContent = label;
      });
    }catch{}
  }
  hydrateDashboard();
})();
