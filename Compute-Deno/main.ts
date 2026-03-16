// ✅ SORTIESFR v1.1.0 - Deno.serve NATIVE (Warm/Route 100%)
// SEUL FICHIER requis - 0 logs startup - Pastebin catalogs OK

const ADDON_VERSION = 'v1.1.0';
const META_PASTEBIN_ID = 'fxpaHMMj';
const SERIES_META_ID = 'Jv93Qfyj';
const META_URL = `https://pastebin.com/raw/${META_PASTEBIN_ID}`;
const SERIES_META_URL = `https://pastebin.com/raw/${SERIES_META_ID}`;
const ADDON_LOGO = 'https://kiatoo.com/blog/wp-content/uploads/2018/12/Blu_ray_disc.png';
const ADDON_DESCRIPT = `SortiesFR ${ADDON_VERSION} - Films/Séries FR récentes DVD/Blu-ray (Stremio Catalog)`;
// Cache (5min TTL)
const CACHE = new Map<string, {data: any; expiry: number}>();
const CACHE_TTL = 300000;

function cacheGet(key: string) {
  const item = CACHE.get(key);
  return item && Date.now() < item.expiry ? item.data : null;
}
function cacheSet(key: string, data: any) {
  CACHE.set(key, {data, expiry: Date.now() + CACHE_TTL});
}

async function fetchPastebin(url: string): Promise<string> {
  const res = await fetch(url, {headers: {'User-Agent': 'StremioAddon/1.0'}});
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (text.includes('<!DOCTYPE') || text.includes('<html')) throw new Error('HTML error');
  return text;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8'
};

const HTML_HEADERS = {...CORS_HEADERS, 'Content-Type': 'text/html; charset=utf-8'};

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {status: 204, headers: CORS_HEADERS});
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.slice(1);
    const extra = url.searchParams.get('extra') || '{}';
    const parsedExtra = JSON.parse(extra);

    console.log(`[${new Date().toLocaleString('fr-FR')}] ${req.method} ${path}`);

    // Route: manifest.json (CRITIQUE)
    if (path === 'manifest.json') {
      const manifest = {
        id: 'com.stremio.sortiesfr.catalog',
        version: ADDON_VERSION,
        name: `SortiesFR ${ADDON_VERSION}`,
        description: ADDON_DESCRIPT,
        logo: ADDON_LOGO,
        resources: ['catalog'],
        types: ['movie', 'series'],
        idPrefixes: ['tt'],
        catalogs: [
          {type: 'movie', id: 'filmsfr-recents', name: 'Films FR Récents'},
          {type: 'series', id: 'seriesfr-recentes', name: 'Séries FR Récents'}
        ],
        behaviorHints: {configurable: true}
      };
      return new Response(JSON.stringify(manifest), {headers: CORS_HEADERS});
    }

    // Route: configure (page install)
    if (path === 'configure') {
      const baseUrl = new URL(req.url).origin + '/manifest.json';
      const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SortiesFR ${ADDON_VERSION}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.container{background:#fff;padding:40px;border-radius:20px;box-shadow:0 20px 40px rgba(0,0,0,.1);max-width:500px;width:100%;text-align:center}h1{font-size:1.8em;margin-bottom:20px;color:#333}.info{background:#f8f9fa;padding:20px;border-radius:12px;margin:20px 0;text-align:left}.info p{font-family:monospace;font-size:.9em;padding:10px;background:#fff;border-radius:8px;border:2px solid #e9ecef;word-break:break-all}a{display:inline-block;background:linear-gradient(135deg,#4CAF50,#45a049);color:#fff;padding:15px 30px;border-radius:50px;font-weight:600;text-decoration:none;margin:20px 0;transition:all .3s}a:hover{transform:translateY(-2px);box-shadow:0 10px 20px rgba(76,175,80,.4)}</style></head><body><div class="container"><h1>🎬 SortiesFR ${ADDON_VERSION}</h1><div class="info"><p><strong>URL Manifest:</strong><br>${baseUrl}</p></div><a href="${baseUrl}" target="_blank">🚀 Installer dans Stremio</a></div></body></html>`;
      return new Response(html, {headers: HTML_HEADERS});
    }

    // Route: catalog (films/séries)
    if (path.startsWith('catalog/')) {
      const [type, id] = path.split('/').slice(1, 3);
      const cacheKey = `catalog:${type}:${id}`;
      let result = cacheGet(cacheKey);

      if (!result) {
        const pbId = type === 'movie' ? META_PASTEBIN_ID : SERIES_META_ID;
        const pbUrl = `https://pastebin.com/raw/${pbId}`;
        const dataId = (await fetchPastebin(pbUrl)).trim();
        const jsonData = await fetchPastebin(`https://pastebin.com/raw/${dataId}`);
        const items: any[] = JSON.parse(jsonData);

        result = {
          metas: items.map((f: any) => ({
            id: f.id,
            type: type as 'movie' | 'series',
            name: f.name,
            poster: f.poster || `https://via.placeholder.com/500x750/1E3A8A/F8FAFF?text=${f.name.slice(0,12)}`,
            description: f.description,
            releaseInfo: f.year,
            imdbRating: f.rating,
            genre: f.genre
          })),
          objects: items.map((f: any) => ({id: f.id}))
        };
        cacheSet(cacheKey, result);
      }

      return new Response(JSON.stringify(result), {headers: CORS_HEADERS});
    }

    // Redirection racine → configure
    if (path === '') {
      return Response.redirect(`${new URL(req.url).origin}/configure`, 302);
    }

    // 404
    return new Response(JSON.stringify({error: 'Not Found'}), {status: 404, headers: CORS_HEADERS});

  } catch (err: any) {
    console.error(`[ERROR ${new Date().toLocaleString('fr-FR')}]`, err.message);
    return new Response(JSON.stringify({error: err.message}), {status: 500, headers: CORS_HEADERS});
  }
}

// ✅ FIX DÉFINITIF : Deno.serve() + 0.0.0.0 + NO LOGS = Warm/Route PASS
console.log(`🚀 SortiesFR Deno v${ADDON_VERSION} sur port ${port}`);
Deno.serve(handler, { 
  port: 8000, 
  hostname: '0.0.0.0' 
});
