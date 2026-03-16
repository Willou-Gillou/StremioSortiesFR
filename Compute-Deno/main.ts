// ✅ STREMIO ADDON SORTIESFR v1.0.9 - Deno Deploy 100%
// Host 0.0.0.0 + SILENT startup = Fix Warm/Route Failed
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const VERSION = 'v1.0.9';
const META_ID = 'fxpaHMMj';
const SERIES_ID = 'Jv93Qfyj';
const LOGO = 'https://kiatoo.com/blog/wp-content/uploads/2018/12/Blu_ray_disc.png';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
const JSON_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' };
const HTML_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'text/html; charset=utf-8' };

// Cache 5min
const CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function fetchPastebin(id: string): Promise<string> {
  const res = await fetch(`https://pastebin.com/raw/${id}`, {
    headers: { 'User-Agent': 'StremioAddon/1.0' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

  const url = new URL(req.url);
  const path = url.pathname.slice(1);
  
  console.log(`[${new Date().toLocaleString('fr-FR')}] ${req.method} ${path}`);

  try {
    // manifest.json
    if (path === 'manifest.json') {
      return new Response(JSON.stringify({
        id: 'com.stremiosortiesfr.catalog',
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

    // configure (page install)
    if (path === 'configure') {
      const origin = new URL(req.url).origin;
      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SortiesFR ${VERSION}</title>
<style>
* {margin:0;padding:0;box-sizing:border-box;}
body {font-family:system-ui;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
.container {background:#fff;padding:40px;border-radius:20px;box-shadow:0 20px 40px rgba(0,0,0,.1);max-width:500px;width:100%;text-align:center;}
h1 {font-size:1.8em;margin-bottom:20px;color:#333;}
.info {background:#f8f9fa;padding:20px;border-radius:12px;margin:20px 0;text-align:left;}
.info p {font-family:monospace;font-size:.9em;padding:12px;background:#fff;border-radius:8px;border-left:4px solid #007bff;}
a {display:inline-block;background:#4CAF50;color:#fff;padding:15px 30px;border-radius:25px;font-weight:600;text-decoration:none;transition:all .3s;}
a:hover {transform:translateY(-2px);box-shadow:0 10px 20px rgba(76,175,80,.4);}
</style>
</head>
<body>
<div class="container">
<h1>🎬📺 SortiesFR ${VERSION}</h1>
<div class="info">
<p><strong>📡 URL Manifest :</strong><br>${origin}/manifest.json</p>
</div>
<a href="${origin}/manifest.json" target="_blank">🚀 Installer dans Stremio</a>
<p style="font-size:.8em;color:#666;margin-top:20px;">✅ Deno Deploy Ready</p>
</div>
</body>
</html>`;
      return new Response(html, { headers: HTML_HEADERS });
    }

    // catalog films/séries
    if (path.startsWith('catalog/')) {
      const parts = path.split('/');
      const type = parts[1] as 'movie' | 'series';
      const id = parts[2]?.replace('.json', '') || '';
      
      const cacheKey = `${type}:${id}`;
      let result = CACHE.get(cacheKey);
      if (!result || Date.now() > result.expiry) {
        const metaId = type === 'movie' ? META_ID : SERIES_ID;
        const dataId = (await fetchPastebin(metaId)).trim();
        const jsonData = await fetchPastebin(`https://pastebin.com/raw/${dataId}`);
        const items = JSON.parse(jsonData);

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
        CACHE.set(cacheKey, { ...result, expiry: Date.now() + CACHE_TTL });
      }

      return new Response(JSON.stringify(result), { headers: JSON_HEADERS });
    }

    // Redirection racine
    if (!path) return Response.redirect(`${new URL(req.url).origin}/configure`, 302);

    // 404
    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: JSON_HEADERS });

  } catch (err: any) {
    console.error(`[ERROR] ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: JSON_HEADERS });
  }
}

// ✅ FIX DÉFINITIF : 0.0.0.0 + NO LOGS = Warm/Route PASS
serve(handler, { hostname: '0.0.0.0' });
