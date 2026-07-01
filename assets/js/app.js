/* Hey Larmah Enterprise Limited — client interactions */
(() => {
  const BRAND = {
    name: "Hey Larmah Enterprise Limited",
    shortName: "Hey Larmah",
    rc: "RC: 9488632",
    phone: "2347063080605",
    phoneDisplay: "+234 706 308 0605",
    email: "business@heylarmah.tech",
    location: "Lagos, Nigeria",
    handle: "@heylarmah_ltd",
    sectors: "Real Estate • Fintech • Logistics • Shipping",
    tagline: "Building assets. Moving trade. Financing growth."
  };
  window.HEY_LARMAH = BRAND;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function setText(selector, text){ $$(selector).forEach(el => { el.textContent = text; }); }
  function syncBrand(){
    setText('[data-brand-name]', BRAND.name);
    setText('[data-brand-short]', BRAND.shortName);
    setText('[data-rc]', BRAND.rc);
    setText('[data-phone]', BRAND.phoneDisplay);
    setText('[data-email]', BRAND.email);
    setText('[data-location]', BRAND.location);
    setText('[data-handle]', BRAND.handle);
    setText('[data-sectors]', BRAND.sectors);
    setText('[data-tagline]', BRAND.tagline);
    setText('[data-year]', String(new Date().getFullYear()));
  }

  function toast(message){
    const box = $('#toast');
    if(!box) return;
    box.textContent = message;
    box.classList.add('show');
    clearTimeout(window.__larmah_toast);
    window.__larmah_toast = setTimeout(() => box.classList.remove('show'), 2600);
  }

  function formatMessage(topic, fields = {}){
    const lines = [
      `Hello ${BRAND.shortName} Team,`,
      ``,
      `Enquiry: ${topic || 'General Enquiry'}`,
      `${BRAND.name}`,
      `${BRAND.rc}`,
      ``
    ];
    Object.entries(fields).forEach(([key, value]) => {
      const val = String(value || '').trim();
      if(val) lines.push(`${key}: ${val}`);
    });
    lines.push(``, `Source: ${document.title}`, `Location: ${BRAND.location}`);
    return lines.join('\n');
  }

  function openWhatsApp(message){
    const text = message || formatMessage('General Enquiry', { Message: 'I need assistance.' });
    const url = `https://wa.me/${BRAND.phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  window.openWhatsApp = openWhatsApp;
  window.buildMessage = formatMessage;
  window.openWA = openWhatsApp;

  function handleForms(){
    $$('.wa-form').forEach(form => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const topic = form.dataset.topic || 'Website Enquiry';
        const fields = {};
        $$('input, select, textarea', form).forEach(control => {
          if(!control.name) return;
          const label = control.dataset.label || control.getAttribute('aria-label') || control.name.replace(/[-_]/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
          fields[label] = control.value;
        });
        openWhatsApp(formatMessage(topic, fields));
      });
    });
  }

  function initMenu(){
    const menu = $('#mobileMenu');
    const toggle = $('[data-menu-toggle]');
    if(!menu || !toggle) return;
    const setOpen = (open) => {
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
    $$('a', menu).forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => { if(e.key === 'Escape') setOpen(false); });
  }

  function initTheme(){
    const key = 'hey_larmah_theme';
    const root = document.documentElement;
    const saved = localStorage.getItem(key);
    if(saved) root.dataset.theme = saved;
    $$('[data-theme-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = root.dataset.theme === 'light' ? 'dark' : 'light';
        root.dataset.theme = next;
        localStorage.setItem(key, next);
        toast(`${next === 'light' ? 'Light' : 'Dark'} mode enabled`);
      });
    });
  }

  function initCopy(){
    $$('[data-copy]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const value = btn.dataset.copy || btn.textContent.trim();
        try{
          await navigator.clipboard.writeText(value);
          toast('Copied to clipboard');
        }catch{
          toast(value);
        }
      });
    });
  }

  function initCalculator(){
    const amount = $('#fxAmount');
    const rate = $('#fxRate');
    const result = $('#fxResult');
    const recalc = () => {
      if(!amount || !rate || !result) return;
      const a = Number(amount.value || 0);
      const r = Number(rate.value || 0);
      if(!a || !r){ result.textContent = 'Enter amount and agreed rate.'; return; }
      result.textContent = `Indicative value: ₦${(a*r).toLocaleString('en-NG', {maximumFractionDigits:2})}`;
    };
    [amount, rate].forEach(el => el && el.addEventListener('input', recalc));
    recalc();
  }

  document.addEventListener('DOMContentLoaded', () => {
    syncBrand();
    initMenu();
    initTheme();
    initCopy();
    initCalculator();
    handleForms();
    $$('[data-whatsapp]').forEach(btn => btn.addEventListener('click', () => {
      const topic = btn.dataset.whatsapp || 'General Enquiry';
      openWhatsApp(formatMessage(topic, { Message: btn.dataset.message || 'I need assistance.' }));
    }));
  });
})();
