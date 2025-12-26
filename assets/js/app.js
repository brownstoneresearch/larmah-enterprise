// Global state management
let __insightsAll = [];
let __currentFilter = 'all';
let __currentSource = 'all';
let __rates = [];
let __ratesMap = {};
let __supabaseClient = null;

/** * 1. Supabase Initialization
 * Optimized to handle Edge Function data types
 */
function getSupabaseClient() {
    if (window.LARMAH && LARMAH.supabase) return LARMAH.supabase;
    if (__supabaseClient) return __supabaseClient;

    const SUPABASE_URL = 'https://mskbumvopqnrhddfycfd.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2J1bXZvcHFucmhkZGZ5Y2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjA3ODYsImV4cCI6MjA4MTg5Njc4Nn0.68529BHKUz50dHP0ARptYC_OBXFLzpsvlK1ctbDOdZ4';

    __supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return __supabaseClient;
}

/**
 * 2. Ticker & Rate Logic
 * Matches your 'rates' table structure
 */
async function loadRates() {
    const sb = getSupabaseClient();
    const { data, error } = await sb.from('rates').select('*').eq('status', 'active');

    if (error) return console.error('Rates Error:', error);

    __rates = data || [];
    __ratesMap = {};
    __rates.forEach(r => { __ratesMap[r.pair] = r; });
    renderMarketBoard();
}

function renderMarketBoard() {
    const board = document.getElementById('marketBoard');
    if (!board) return;

    // Define priority display
    const pairs = ['USDT/NGN', 'BTC/USDT', 'BTC/NGN', 'ETH/USDT'];
    
    board.innerHTML = pairs.map(pair => {
        const r = __ratesMap[pair] || { pair, buy: 0, sell: 0, quote: 'NGN' };
        const val = r.sell > 0 ? (r.quote === 'NGN' ? `₦${r.sell.toLocaleString()}` : r.sell) : '—';
        
        return `
            <div class="ticker-card">
                <div class="ticker-pair">${pair}</div>
                <div class="ticker-val">${val}</div>
                <div class="ticker-sub">Desk Rate</div>
            </div>
        `;
    }).join('');

    // Update Hero Badge
    const hero = __ratesMap['USDT/NGN'];
    if (hero && document.getElementById('heroRateMain')) {
        document.getElementById('heroRateMain').textContent = `₦${hero.sell.toLocaleString()}`;
    }
}

/**
 * 3. Insights Logic
 * Blended with Edge Function fields: source_name, article_url, image_urls
 */
async function loadInsights() {
    const sb = getSupabaseClient();
    const { data, error } = await sb.from('insights')
        .select('*')
        .eq('status', 'active')
        .order('published_at', { ascending: false })
        .limit(40);

    if (error) return;

    __insightsAll = data || [];
    updateSourceOptions();
    renderInsights();
}

function renderInsights() {
    const mount = document.getElementById('newsMount');
    if (!mount) return;

    let filtered = __insightsAll.filter(i => {
        const catMatch = __currentFilter === 'all' || i.category === __currentFilter;
        const srcMatch = __currentSource === 'all' || i.source_name === __currentSource;
        return catMatch && srcMatch;
    });

    // Update Counter in Hero
    const countEl = document.getElementById('heroInsightCount');
    if (countEl) countEl.textContent = filtered.length;

    mount.innerHTML = `<div class="grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
        ${filtered.map(item => {
            const img = item.image_url || (item.image_urls && item.image_urls[0]) || 'assets/images/larmah-placeholder.jpeg';
            return `
                <div class="card slide-up">
                    <div class="card-media">
                        <img src="${img}" alt="news" loading="lazy" style="width:100%; height:180px; object-fit:cover; border-radius:12px;">
                    </div>
                    <div class="card-body" style="padding:15px 0;">
                        <span class="blog-date" style="color:var(--accent); font-size:0.8rem;">${new Date(item.published_at).toLocaleDateString()}</span>
                        <h3 style="font-size:1.1rem; margin:8px 0;">
                            <a href="${item.article_url}" target="_blank" style="text-decoration:none; color:inherit;">${item.title}</a>
                        </h3>
                        <p class="blog-snip" style="font-size:0.9rem; color:var(--muted); opacity:0.8;">${item.summary || ''}</p>
                        <div class="source-pill" style="margin-top:10px; display:inline-block; padding:4px 10px; background:rgba(255,255,255,0.05); border-radius:50px; font-size:0.75rem;">
                            <i class="fa-solid fa-rss"></i> ${item.source_name}
                        </div>
                    </div>
                </div>
            `;
        }).join('')}
    </div>`;
}

// UI Helpers
function setInsightFilter(category, btn) {
    __currentFilter = category;
    document.querySelectorAll('.pillbar .btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderInsights();
}

function updateSourceOptions() {
    const select = document.getElementById('sourceFilter');
    if (!select) return;
    const sources = [...new Set(__insightsAll.map(i => i.source_name))];
    select.innerHTML = '<option value="all">All Sources</option>' + 
        sources.map(s => `<option value="${s}">${s}</option>`).join('');
}

// Lifecycle
document.addEventListener('DOMContentLoaded', () => {
    loadRates();
    loadInsights();
    setInterval(loadRates, 30000); // 30s refresh
});
