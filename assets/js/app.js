(function(){
  const BRAND = "Hey Larmah Enterprise Limited";
  const RC = "RC: 9488632";
  const PHONE = "2347063080605";
  const toast = document.getElementById('toast');
  function showToast(message){
    if(!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.__HLToast);
    window.__HLToast = setTimeout(()=>toast.classList.remove('show'), 3200);
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

  function encode(s){ return encodeURIComponent(String(s||'').trim()); }
  function buildMessage(title, fields){
    const lines = [`${BRAND} — ${title}`, RC, ''];
    Object.entries(fields).forEach(([key,val])=>{
      const v = String(val || '').trim();
      if(v) lines.push(`${key}: ${v}`);
    });
    lines.push('', 'Sent from website');
    return lines.join('\n');
  }
  document.querySelectorAll('.js-wa-form').forEach(form=>{
    form.addEventListener('submit', ev=>{
      ev.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const title = form.getAttribute('data-wa-title') || 'Website Enquiry';
      const url = `https://wa.me/${PHONE}?text=${encode(buildMessage(title, data))}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      showToast('Opening WhatsApp chat…');
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
  document.querySelectorAll('[data-paginate]').forEach(setupPagination);
})();
