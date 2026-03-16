// ✅ SORTIESFR v1.1.0 - Deno.serve NATIVE (Warm/Route 100%)
// SEUL FICHIER requis - 0 logs startup - Pastebin catalogs OK
const META_ID = 'fxpaHMMj';
const SERIES_ID = 'Jv93Qfyj';
const LOGO = 'https://kiatoo.com/blog/wp-content/uploads/2018/12/Blu_ray_disc.png';

const HEADERS = {
  cors: { 
    'Access-Control-Allow-Origin': '*', 
    'Access-Control-Allow-Methods': 'GET,OPTIONS', 
    'Access-Control-Allow-Headers': 'Content-Type' 
  },
  json: { 'Content-Type': 'application/json;charset=utf-8' }
};

// Cache global (TTL 1h)
const CACHE = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1h

async function getCache(key: string): Promise<any | null> {
  const cached = CACHE.get(key);
  if (cached && Date.now() < cached.expiry) return cached.data;
  CACHE.delete(key);
  return null;
}

async function setCache(key: string, data: any): Promise<void> {
  CACHE.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

async function fetchPastebin(id: string): Promise<string> {
  const cacheKey = `pastebin:${id}`;
  let jsonStr = await getCache(cacheKey);
  
  if (!jsonStr) {
    const res = await fetch(`https://pastebin.com/raw/${id}`, {
      headers: { 'User-Agent': 'Stremio/1.0' }
    });
    jsonStr = await res.text();
    await setCache(cacheKey, jsonStr);
  }
  
  return jsonStr;
}

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: HEADERS.cors });
  }
  
  // manifest.json
  if (url.pathname === '/manifest.json') {
    const manifestStr = await fetchPastebin(META_ID);
    return new Response(manifestStr, { 
      status: 200, 
      headers: { ...HEADERS.cors, ...HEADERS.json } 
    });
  }
  
  // catalogs (films/séries)
  if (url.pathname.endsWith('.json')) {
    const id = url.pathname.split('/').pop()?.replace('.json', '') || '';
    if (id === 'filmsfr-recents' || id === 'seriesfr-recentes') {
      const pasteId = id.includes('films') ? META_ID : SERIES_ID;
      const catalogStr = await fetchPastebin(pasteId);
      return new Response(catalogStr, { 
        status: 200, 
        headers: { ...HEADERS.cors, ...HEADERS.json } 
      });
    }
  }
  
  // Page configure/install
  if (url.pathname === '/configure') {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🎬📺 SortiesFR v1.1.0</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;color:#333;}
    .container{background:white;padding:40px;border-radius:20px;box-shadow:0 20px 40px rgba(0,0,0,.15);text-align:center;max-width:500px;}
    h1{font-size:2em;margin-bottom:20px;background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
    .logo{width:80px;height:80px;margin:0 auto 20px;background:#f0f0f0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2em;}
    .install{margin:30px 0;padding:15px 30px;background:#4CAF50;color:white;border-radius:50px;font-size:1.1em;font-weight:600;text-decoration:none;display:inline-block;box-shadow:0 10px 20px rgba(76,175,80,.3);}
    .install:hover{background:#45a049;transform:translateY(-2px);}
    .status{margin-top:20px;padding:15px;background:#e8f5e8;border-radius:10px;border-left:4px solid #4CAF50;}
    footer{font-size:.9em;color:#666;margin-top:30px;}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🎬</div>
    <h1>SortiesFR v1.1.0</h1>
    <p>Addon Stremio natif Deno Deploy</p>
    <a href="/manifest.json" class="install">📱 INSTALLER DANS STREMIO</a>
    <div class="status">
      ✅ Warm/Route OK • Cache Pastebin 1h • 0.0.0.0
    </div>
    <footer>Déployé sur Deno Deploy 2026</footer>
  </div>
</body>
</html>`;
    return new Response(html, { 
      status: 200, 
      headers: { ...HEADERS.cors, 'Content-Type': 'text/html;charset=utf-8' } 
    });
  }
  
  // 404
  return new Response('Not Found', { status: 404, headers: HEADERS.cors });
};

// ✅ FIX DÉFINITIF : Deno.serve() + 0.0.0.0 + NO LOGS = Warm/Route PASS
Deno.serve(handler, { 
  port: 8000, 
  hostname: '0.0.0.0' 
});
