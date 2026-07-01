(function(){
  "use strict";

  const config = {
    supabaseUrl: "https://ipohjsdhakjbetyievmv.supabase.co",
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlwb2hqc2RoYWtqYmV0eWlldm12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjUwMTYsImV4cCI6MjA5ODUwMTAxNn0.qdcQ4bFpUmvWJstWMGnfrFwY9DBBVEqBo0mV6mGxcz4",
    whatsappNumber: "2347063080605",
    socials: {
      instagram: "https://www.instagram.com/heylarmah_ltd/",
      x: "https://x.com/heylarmah_ltd",
      tiktok: "https://www.tiktok.com/@heylarmah_ltd",
      whatsapp: "https://wa.me/2347063080605?text=Hello%20Hey%20Larmah%2C%20I%20need%20assistance."
    }
  };

  const STORAGE_KEY = "hey_larmah_supabase_session";

  function baseHeaders(token){
    return {
      "apikey": config.supabaseAnonKey,
      "Authorization": `Bearer ${token || config.supabaseAnonKey}`,
      "Content-Type": "application/json"
    };
  }

  async function supabaseFetch(path, options){
    const url = `${config.supabaseUrl}${path}`;
    const opts = Object.assign({ method: "GET" }, options || {});
    opts.headers = Object.assign({}, baseHeaders(opts.token), opts.headers || {});
    delete opts.token;

    const response = await fetch(url, opts);
    let data = null;
    const text = await response.text();
    if(text){
      try { data = JSON.parse(text); } catch { data = text; }
    }
    if(!response.ok){
      const message = (data && (data.message || data.error_description || data.error)) || `Supabase request failed with ${response.status}`;
      const err = new Error(message);
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function getSession(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setSession(session){
    try {
      if(session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  function currentAccessToken(){
    const session = getSession();
    return session && session.access_token ? session.access_token : null;
  }

  async function insert(table, payload, options){
    const prefer = (options && options.returning === false) ? "return=minimal" : "return=representation";
    return supabaseFetch(`/rest/v1/${encodeURIComponent(table)}`, {
      method: "POST",
      headers: { "Prefer": prefer },
      token: currentAccessToken(),
      body: JSON.stringify(payload)
    });
  }

  async function select(table, query, options){
    return supabaseFetch(`/rest/v1/${encodeURIComponent(table)}${query || ""}`, {
      method: "GET",
      token: options && options.token ? options.token : currentAccessToken()
    });
  }

  async function signUp(email, password){
    const data = await supabaseFetch("/auth/v1/signup", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if(data && data.access_token) setSession(data);
    return data;
  }

  async function signIn(email, password){
    const data = await supabaseFetch("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if(data && data.access_token) setSession(data);
    return data;
  }

  async function signOut(){
    const token = currentAccessToken();
    if(token){
      try { await supabaseFetch("/auth/v1/logout", { method: "POST", token }); } catch {}
    }
    setSession(null);
  }

  window.HL_CONFIG = config;
  window.HLDatabase = {
    config,
    request: supabaseFetch,
    insert,
    select,
    signUp,
    signIn,
    signOut,
    getSession,
    setSession,
    currentAccessToken
  };
})();
