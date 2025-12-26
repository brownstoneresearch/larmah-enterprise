<script>
  // Global variables
  let __insightsAll = [];
  let __currentFilter = 'all';
  let __currentSource = 'all';
  let __rates = [];
  let __ratesMap = {};
  let __activeInsightsCount = 0;
  let __supabaseClient = null;

  // Initialize Supabase client
  function initSupabase() {
    if (__supabaseClient) return __supabaseClient;
    
    const SUPABASE_URL = 'https://mskbumvopqnrhddfycfd.supabase.co'; // REPLACE WITH YOUR URL
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2J1bXZvcHFucmhkZGZ5Y2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjA3ODYsImV4cCI6MjA4MTg5Njc4Nn0.68529BHKUz50dHP0ARptYC_OBXFLzpsvlK1ctbDOdZ4'; // REPLACE WITH YOUR KEY
    
    try {
      __supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      console.log('Supabase client initialized');
      return __supabaseClient;
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      return null;
    }
  }

  // Get Supabase client (with fallback)
  function getSupabaseClient() {
    // Try LARMAH.supabase first
    if (window.LARMAH && LARMAH.supabase) {
      return LARMAH.supabase;
    }
    
    // Try our initialized client
    if (!__supabaseClient) {
      return initSupabase();
    }
    
    return __supabaseClient;
  }

  // Utility functions
  function formatNumber(num, decimals = 2) {
    if (num == null || isNaN(num)) return '—';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function formatCurrency(amount, currency = '₦') {
    if (amount == null || isNaN(amount)) return '—';
    return currency + formatNumber(amount);
  }

  function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Insights functions
  function updateSourceOptions(insights) {
    const sources = [...new Set(insights.map(i => i.source_name).filter(Boolean))];
    const select = document.getElementById('sourceFilter');
    if (!select) return;
    
    // Keep current value
    const currentValue = select.value;
    select.innerHTML = '<option value="all">All sources</option>';
    
    sources.forEach(source => {
      const option = document.createElement('option');
      option.value = source;
      option.textContent = source;
      select.appendChild(option);
    });
    
    // Restore selection if possible
    if (sources.includes(currentValue)) {
      select.value = currentValue;
    }
  }

  function setInsightFilter(category) {
    __currentFilter = category;
    renderInsights();
    
    // Update active button state
    document.querySelectorAll('.pillbar .btn').forEach(btn => {
      btn.classList.remove('active');
    });
    event.target.classList.add('active');
  }

  function setSourceFilter(source) {
    __currentSource = source;
    renderInsights();
  }

  function renderInsights() {
    const mount = document.getElementById('newsMount');
    if (!mount) return;
    
    // Filter insights
    let filtered = __insightsAll;
    
    if (__currentFilter !== 'all') {
      filtered = filtered.filter(i => i.category === __currentFilter);
    }
    
    if (__currentSource !== 'all') {
      filtered = filtered.filter(i => i.source_name === __currentSource);
    }
    
    __activeInsightsCount = filtered.length;
    updateInsightCount();
    
    if (filtered.length === 0) {
      mount.innerHTML = `
        <div class="notice" style="grid-column:1/-1;text-align:center;padding:32px">
          <i class="fa-solid fa-newspaper" style="font-size:2rem;margin-bottom:12px;opacity:.5"></i>
          <div><strong>No insights yet</strong></div>
          <div class="small" style="margin-top:6px">Check back soon for updates</div>
        </div>
      `;
      return;
    }
    
    // Render insights grid
    const html = filtered.slice(0, 12).map(insight => {
      const dateStr = insight.published_at || insight.created_at;
      const imageUrls = insight.image_urls || (insight.image_url ? [insight.image_url] : []);
      const firstImage = imageUrls.length > 0 ? imageUrls[0] : null;
      const imageCount = imageUrls.length;
      const sourceName = insight.source_name || 'Unknown';
      
      return `
        <div class="card slide-up">
          ${firstImage ? `
            <div class="card-media" data-images='${JSON.stringify(imageUrls)}'>
              <img src="${firstImage}" alt="${insight.title}" loading="lazy">
              ${imageCount > 1 ? `
                <div class="media-nav">
                  <button class="media-btn prev-btn" onclick="navMedia(this, -1)"><i class="fa-solid fa-chevron-left"></i></button>
                  <button class="media-btn next-btn" onclick="navMedia(this, 1)"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
                <div class="media-dots">
                  ${imageUrls.map((_, i) => `<div class="media-dot ${i === 0 ? 'active' : ''}"></div>`).join('')}
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          <div class="card-body">
            <span class="blog-date">${formatTimestamp(dateStr)}</span>
            <h3 class="card-title" style="font-size:1rem;margin-bottom:8px">
              <a href="${insight.article_url}" target="_blank" rel="noopener">${insight.title}</a>
            </h3>
            
            ${insight.summary ? `<p class="blog-snip">${insight.summary}</p>` : ''}
            
            <div class="source-pill">
              <i class="fa-solid fa-rss"></i> ${sourceName}
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    mount.innerHTML = `
      <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
        ${html}
      </div>
    `;
    
    // Update hero count
    updateInsightCount();
  }

  function updateInsightCount() {
    const countEl = document.getElementById('heroInsightCount');
    if (countEl) {
      countEl.textContent = __activeInsightsCount || '—';
    }
  }

  // Media navigation
  function navMedia(btn, direction) {
    const mediaEl = btn.closest('.card-media');
    if (!mediaEl) return;
    
    const images = JSON.parse(mediaEl.dataset.images || '[]');
    if (images.length <= 1) return;
    
    const imgEl = mediaEl.querySelector('img');
    const dots = mediaEl.querySelectorAll('.media-dot');
    const currentIndex = images.findIndex(src => src === imgEl.src);
    let nextIndex = (currentIndex + direction + images.length) % images.length;
    
    imgEl.src = images[nextIndex];
    imgEl.alt = `Insight image ${nextIndex + 1}`;
    
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === nextIndex);
    });
  }

  // Rates functions
  function normalizeRateRow(row) {
    return {
      id: row.id,
      asset: row.asset || '',
      base: row.base || '',
      quote: row.quote || '',
      pair: row.pair || `${row.base}/${row.quote}`,
      buy: parseFloat(row.buy) || 0,
      sell: parseFloat(row.sell) || 0,
      status: row.status || 'inactive',
      updated_at: row.updated_at,
      created_at: row.created_at
    };
  }

  function renderMarketBoard() {
    const board = document.getElementById('marketBoard');
    if (!board) return;
    
    // Clear loading states
    board.querySelectorAll('.rate-loading').forEach(el => {
      el.classList.remove('rate-loading');
    });
    
    // Define the pairs we want to display
    const targetPairs = ['USDT/NGN', 'BTC/USDT', 'BTC/NGN', 'ETH/USDT'];
    const defaultPairs = ['USD/NGN', 'EUR/NGN', 'GBP/NGN'];
    
    // Get rates for target pairs
    const displayRates = targetPairs.map(pair => {
      if (__ratesMap[pair]) {
        return __ratesMap[pair];
      }
      
      // If not found, try to find similar
      const similar = __rates.find(r => 
        r.pair.includes(pair.split('/')[0]) || 
        r.pair.includes(pair.split('/')[1])
      );
      
      return similar || { pair, buy: null, sell: null };
    });
    
    // If no rates found, use defaults
    if (__rates.length === 0) {
      displayRates.length = 0;
      defaultPairs.forEach(pair => {
        displayRates.push({ pair, buy: null, sell: null });
      });
    }
    
    // Render each rate card
    board.innerHTML = displayRates.map(rate => {
      const hasBuy = rate.buy != null && !isNaN(rate.buy) && rate.buy > 0;
      const hasSell = rate.sell != null && !isNaN(rate.sell) && rate.sell > 0;
      
      // Format values
      let tickerVal = '—';
      if (hasBuy && hasSell) {
        const avg = (rate.buy + rate.sell) / 2;
        tickerVal = rate.quote === 'NGN' ? formatCurrency(avg) : formatNumber(avg);
      } else if (hasBuy) {
        tickerVal = rate.quote === 'NGN' ? formatCurrency(rate.buy) : formatNumber(rate.buy);
      } else if (hasSell) {
        tickerVal = rate.quote === 'NGN' ? formatCurrency(rate.sell) : formatNumber(rate.sell);
      }
      
      const buyText = hasBuy ? (rate.quote === 'NGN' ? formatCurrency(rate.buy) : formatNumber(rate.buy)) : '—';
      const sellText = hasSell ? (rate.quote === 'NGN' ? formatCurrency(rate.sell) : formatNumber(rate.sell)) : '—';
      
      return `
        <div class="ticker-card">
          <div class="ticker-pair">${rate.pair}</div>
          <div class="ticker-val">${tickerVal}</div>
          <div class="rate-display">
            <span class="rate-buy">${buyText}</span>
            <span class="rate-separator">|</span>
            <span class="rate-sell">${sellText}</span>
          </div>
          <div class="ticker-sub">Buy / Sell</div>
        </div>
      `;
    }).join('');
    
    // Update hero rate
    updateHeroRate();
  }

  function updateHeroRate() {
    const heroRateEl = document.getElementById('heroRateMain');
    const heroUpdatedEl = document.getElementById('heroRateUpdated');
    
    if (!heroRateEl) return;
    
    // Try to get USDT/NGN sell rate
    const usdtngn = __ratesMap['USDT/NGN'];
    if (usdtngn && usdtngn.sell) {
      heroRateEl.textContent = usdtngn.quote === 'NGN' ? 
        formatCurrency(usdtngn.sell) : 
        formatNumber(usdtngn.sell);
      
      if (heroUpdatedEl && usdtngn.updated_at) {
        const timeAgo = formatTimestamp(usdtngn.updated_at);
        heroUpdatedEl.textContent = timeAgo ? `Updated ${timeAgo}` : 'Live from Admin';
      }
    } else {
      // Fallback to any rate
      const firstRate = __rates.find(r => r.sell);
      if (firstRate) {
        heroRateEl.textContent = firstRate.quote === 'NGN' ? 
          formatCurrency(firstRate.sell) : 
          formatNumber(firstRate.sell);
      } else {
        heroRateEl.textContent = '—';
      }
    }
  }

  async function loadRates() {
    const sb = getSupabaseClient();
    if (!sb) {
      showToast('⚠️ Database connection issue', 'error');
      return;
    }
    
    try {
      const { data, error } = await sb
        .from('rates')
        .select('*')
        .eq('status', 'active')
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('Failed to load rates:', error);
        showToast('⚠️ Failed to load rates', 'error');
        return;
      }
      
      __rates = (data || []).map(normalizeRateRow);
      __ratesMap = {};
      __rates.forEach(r => {
        __ratesMap[r.pair] = r;
      });
      
      renderMarketBoard();
    } catch (error) {
      console.error('Error loading rates:', error);
      showToast('⚠️ Error loading rates', 'error');
    }
  }

  async function loadInsights() {
    const sb = getSupabaseClient();
    const mount = document.getElementById('newsMount');
    
    if (!sb) {
      if (mount) {
        mount.innerHTML = `
          <div class="notice" style="border-color:rgba(255,90,103,.35)">
            <strong>Database connection required</strong>
            <div class="small" style="margin-top:4px">
              Please check your Supabase configuration in app.js
            </div>
            <button onclick="location.reload()" class="btn small" style="margin-top:12px">
              <i class="fa-solid fa-rotate-right"></i> Retry Connection
            </button>
          </div>
        `;
      }
      return;
    }
    
    try {
      const { data, error } = await sb
        .from('insights')
        .select('*')
        .eq('status', 'active')
        .order('published_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Failed to load insights:', error);
        if (mount) {
          mount.innerHTML = `
            <div class="notice" style="border-color:rgba(255,90,103,.35)">
              <strong>Could not load insights</strong>
              <div class="small" style="margin-top:4px">${error.message}</div>
              <button onclick="loadInsights()" class="btn small" style="margin-top:12px">
                <i class="fa-solid fa-rotate-right"></i> Retry
              </button>
            </div>
          `;
        }
        return;
      }
      
      __insightsAll = data || [];
      updateSourceOptions(__insightsAll);
      renderInsights();
    } catch (error) {
      console.error('Error loading insights:', error);
      if (mount) {
        mount.innerHTML = `
          <div class="notice" style="border-color:rgba(255,90,103,.35)">
            <strong>Network error loading insights</strong>
            <div class="small" style="margin-top:4px">Please check your connection</div>
          </div>
        `;
      }
    }
  }

  // Toast notification helper
  function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.opacity = '1';
    
    setTimeout(() => {
      toast.style.opacity = '0';
    }, 3000);
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    const yearEl = document.getElementById('year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
    
    // Set up source filter event listener
    const sourceFilter = document.getElementById('sourceFilter');
    if (sourceFilter) {
      sourceFilter.addEventListener('change', (e) => {
        setSourceFilter(e.target.value);
      });
    }
    
    // Initialize Supabase
    const sb = initSupabase();
    
    // Load initial data after a short delay
    setTimeout(() => {
      loadRates();
      loadInsights();
    }, 100);
    
    // Set up auto-refresh every 30 seconds
    setInterval(() => {
      loadRates();
      loadInsights();
    }, 30000);
    
    // Also refresh when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        loadRates();
        loadInsights();
      }
    });
  });

  // Add this CSS for toast
  const toastStyle = document.createElement('style');
  toastStyle.textContent = `
    .toast.info { background: rgba(59, 130, 246, 0.9); }
    .toast.error { background: rgba(239, 68, 68, 0.9); }
    .toast.success { background: rgba(34, 197, 94, 0.9); }
  `;
  document.head.appendChild(toastStyle);
</script>
