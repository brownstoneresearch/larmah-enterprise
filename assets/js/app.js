// CONFIGURATION
SUPABASE_URL = "https://drchjifufpsvvlzgpaiy.supabase.co";

SUPABASE_ANON_KEY =

    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyY2hqaWZ1ZnBzdnZsemdwYWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwOTMwNDEsImV4cCI6MjA4MTY2OTA0MX0.MLr1iCF4gjz0wnT1IFISCV9eJtnbq96_W_i7wAMOSbY";




// INITIALIZE
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const LARMAH = {
  user: null,
  profile: null,

  // --- UTILS ---
  toast: (msg, type='info') => {
    const t = document.getElementById('toast');
    if(!t) return;
    t.textContent = msg;
    t.style.borderLeft = type === 'error' ? '4px solid #ff5a67' : '4px solid #00d981';
    t.style.display = 'block';
    t.className = "toast show";
    setTimeout(() => { t.style.display = 'none'; }, 3000);
  },

  escapeHtml: (str) => {
    if(!str) return '';
    return String(str).replace(/[&<>"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m];
    });
  },

  formatCurrency: (amount, currency = 'NGN') => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: currency }).format(amount);
  },

  // --- AUTH ---
  async checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    this.user = session?.user || null;
    
    const page = document.body.getAttribute('data-page');
    
    // Redirect logic
    if (this.user) {
      if (page === 'auth') window.location.href = 'dashboard.html';
      await this.loadProfile();
    } else {
      if (['dashboard', 'admin'].includes(page)) window.location.href = 'auth.html';
    }
  },

  async loadProfile() {
    if(!this.user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', this.user.id)
      .single();
    
    if(data) this.profile = data;
    
    // Update UI name if element exists
    const nameEl = document.getElementById('user_name_display');
    if(nameEl && this.profile) nameEl.textContent = this.profile.full_name || 'User';
  },

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    window.location.href = 'dashboard.html';
  },

  async signup(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw error;
    this.toast("Account created! Please verify email.", "success");
  },

  async logout() {
    await supabase.auth.signOut();
    window.location.href = 'auth.html';
  },

  // --- DATA FETCHING ---
  async fetchCatalog(category) {
    // Return real DB data or fallbacks for demo
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('category', category)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if(data && data.length) return data;
    
    // Fallback Mock Data for Demo Purposes
    if(category === 'real-estate') return [
        { id:1, title:"Lekki Phase 1 Luxury Apt", price:"₦120k/night", tags:["Shortlet","Pool"], image_url:"assets/images/placeholder-home.jpg" },
        { id:2, title:"Banana Island 4-Bed", price:"₦850M", tags:["Sale","Waterfront"], image_url:"" }
    ];
    if(category === 'logistics') return [
        { id:1, title:"Airport Protocol (Priority)", price:"₦45,000", tags:["Escort","SUV"] },
        { id:2, title:"Interstate Haulage (30T)", price:"Request Quote", tags:["Truck","Haulage"] }
    ];
    return [];
  },

  // --- WHATSAPP UTILS ---
  openWhatsApp(text) {
    const phone = "2347063080605"; 
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  },

  buildMessage(header, fields) {
    let msg = `*LARMAH | ${header}*\n------------------\n`;
    for (const [key, val] of Object.entries(fields)) {
      if(val) msg += `*${key}:* ${val}\n`;
    }
    msg += `\n_Sent from heylarmah.tech_`;
    return msg;
  },
  
  // --- IMAGE UTILS ---
  normalizeImageUrls(item) {
    if (!item) return [];
    if (Array.isArray(item.images) && item.images.length > 0) return item.images;
    if (item.image_url) return [item.image_url];
    return [];
  },

  galleryHtml(urls, title, idPrefix) {
    if(!urls.length) return '';
    const isMulti = urls.length > 1;
    return `
      <div class="gallery ${isMulti ? 'multi' : ''}" id="gal-${idPrefix}">
        ${urls.map((u, i) => `
          <img src="${this.escapeHtml(u)}" class="gallery-img ${i===0?'active':''}" style="${i===0?'display:block':'display:none'}" alt="${this.escapeHtml(title)}" loading="lazy">
        `).join('')}
        ${isMulti ? `
          <div class="gallery-dots">
            ${urls.map((_, i) => `<div class="gallery-dot ${i===0?'active':''}"></div>`).join('')}
          </div>
          <div class="gallery-hint">Tap to view</div>
        ` : ''}
      </div>
    `;
  },

  bindGalleries(container) {
    const gals = container.querySelectorAll('.gallery.multi');
    gals.forEach(g => {
      let idx = 0;
      const imgs = g.querySelectorAll('.gallery-img');
      const dots = g.querySelectorAll('.gallery-dot');
      
      g.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        imgs[idx].style.display = 'none';
        dots[idx].classList.remove('active');
        
        idx = (idx + 1) % imgs.length;
        
        imgs[idx].style.display = 'block';
        dots[idx].classList.add('active');
      });
    });
  },
  
  toggleMenu() {
    document.body.classList.toggle('nav-open');
    const overlay = document.getElementById('mobileNavOverlay');
    if(overlay) overlay.classList.toggle('active');
  }
};

// Auto-run session check
document.addEventListener('DOMContentLoaded', () => {
  LARMAH.checkSession();
});
