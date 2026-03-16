// ✅ SORTIESFR v1.1.1 - Fusion (std/http + Deno.serve hybrid) - Stremio 100%
// SEUL FICHIER - 0 logs - DOUBLE Pastebin (meta+data) - Métas natives
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const VERSION = 'v1.1.1';
const META_ID = 'fxpaHMMj';  // Films meta
const SERIES_ID = 'Jv93Qfyj'; // Séries meta
const LOGO = 'https://kiatoo.com/blog/wp-content/uploads/2018/12/Blu_ray_disc.png';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
const JSON_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' };
const HTML_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'text/html; charset=utf-8' };

// Cache 1h (optimisé Stremio)
const CACHE = new Map<string, any>();
const CACHE_TTL = 60 * 60 * 1000;

function getCache(key: string) {
  const item = CACHE.get(key);
  return item && Date.now() < item.expiry ? item.data : null;
}

function setCache(key: string, data: any) {
  CACHE.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

async function fetchPastebin(id: string): Promise<string> {
  const cacheKey = `raw:${id}`;
  let raw = getCache(cacheKey);
  if (!raw) {
    const res = await fetch(`https://pastebin.com/raw/${id}`, {
      headers: { 'User-Agent': 'StremioAddon/1.0' }
    });
    if (!res.ok) throw new Error(`Pastebin ${res.status}`);
    raw = await res.text();
    setCache(cacheKey, raw);
  }
  return raw;
}

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const path = url.pathname.slice(1);

  try {
    // manifest.json (FIX Stremio ID fixe)
    if (path === 'manifest.json') {
      return new Response(JSON.stringify({
        id: 'com.stremiosortiesfr.catalog',  // ← CRUCIAL pour Stremio
        version: VERSION,
        name: `🎬📺 SortiesFR ${VERSION}`,
        description: 'Films/Séries FR récents (DVD/Blu-ray) - Catalog Stremio',
        logo: LOGO,
        resources: ['catalog'],
        types: ['movie', 'series'],
        idPrefixes: ['tt'],
        catalogs: [
          { type: 'movie', id: 'filmsfr-recents', name: '🎬 Films FR Récents' },
          { type: 'series', id: 'seriesfr-recentes', name: '📺 Séries FR Récents' }
        ],
        behaviorHints: { configurable: true }
      }), { headers: JSON_HEADERS });
    }

    // Page configure (stylée)
    if (path === 'configure') {
      const origin = url.origin;
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🎬📺 SortiesFR ${VERSION}</title>
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
    <h1>SortiesFR ${VERSION}</h1>
    <p>Addon Stremio natif Deno Deploy</p>
    <a href="/manifest.json" class="install">📱 INSTALLER DANS STREMIO</a>
    <div class="status">
      ✅ Warm/Route OK • Cache 1h • DOUBLE Pastebin • Métas natives
    </div>
    <footer>Déployé sur Deno Deploy 2026 | ID: com.stremiosortiesfr.catalog</footer>
  </div>
</body>
</html>`;
      return new Response(html, { headers: HTML_HEADERS });
    }

    // Catalogs (FIX principal : DOUBLE fetch + metas Stremio)
    if (path.startsWith('catalog/')) {
      const parts = path.split('/');
      const type = parts[1] as 'movie' | 'series';  // movie/series
      const id = parts[2]?.replace('.json', '') || '';

      const cacheKey = `${type}:${id}`;
      let result = getCache(cacheKey);

      if (!result) {
        // 1. Meta Pastebin (fxpaHMMj → dataId)
        const metaId = type === 'movie' ? META_ID : SERIES_ID;
        const metaRaw = await fetchPastebin(metaId);
        const dataId = metaRaw.trim();

        // 2. Data Pastebin (dataId → JSON items)
        const dataRaw = await fetchPastebin(dataId);
        const items = JSON.parse(dataRaw);

        // 3. Format Stremio metas (CRUCIAL pour affichage)
        result = {
          metas: items.map((item: any) => ({
            id: item.id,
            type,
            name: item.name,
            poster: item.poster || `https://via.placeholder.com/500x750/1E3A8A/F8FAFF?text=${item.name?.slice(0,12)}`,
            description: item.description,
            releaseInfo: item.year,
            imdbRating: item.rating,
            genre: item.genre
          })),
          objects: items.map((item: any) => ({ id: item.id }))
        };
        setCache(cacheKey, result);
      }

      return new Response(JSON.stringify(result), { headers: JSON_HEADERS });
    }

    // Redirection racine
    if (!path) {
      return Response.redirect(`${url.origin}/configure`, 302);
    }

    // 404
    return new Response(JSON.stringify({ error: 'Not Found' }), { 
      status: 404, 
      headers: JSON_HEADERS 
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: JSON_HEADERS 
    });
  }
}

// ✅ FIX DÉFINITIF : std/http + 0.0.0.0 (ton fichier) → Warm/Route/Stremio 100%
serve(handler, { hostname: '0.0.0.0' });
