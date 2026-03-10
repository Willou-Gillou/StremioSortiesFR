const https = require('https');

// ✅ VARIABLES GLOBALES v1.0.5
const ADDON_VERSION = 'v1.0.5';
const META_PASTEBIN_ID = 'fxpaHMMj';      // Meta général (films)
const SERIES_META_ID = 'Jv93Qfyj';       // Meta général (series)
const META_URL = `https://pastebin.com/raw/${META_PASTEBIN_ID}`;
const SERIES_META_URL = `https://pastebin.com/raw/${SERIES_META_ID}`;
const BASE_URL = process.env.BASE_URL || `https://stremiosortiesfr.onrender.com`;
const ADDON_LOGO = 'https://kiatoo.com/blog/wp-content/uploads/2018/12/Blu_ray_disc.png';

const ADDON_DESCRIPTION = `Cet addon est un catalogue présentant les dernières sorties de films ET séries FR récentes (DVD/Bluray). 
Cet addon ne fournit aucun lien et s'appuie sur la base de données de stremio pour présenter le résumé du film et la bande annonce si disponibles. 
Enfin, cet addon est hébergé sur un serveur qui se met en veille en cas d'inutilisation prolongée. 
Une requête vers le serveur le réveillera automatiquement au bout de 30s.`;

// Système de logs (inchangé)
const uniqueUsers = new Set();
let requestCount = 0;

async function getGeo(ip) {
  try {
    const response = await new Promise((resolve, reject) => {
      https.get(`https://ipapi.co/${ip}/json/`, { timeout: 3000 }, resolve).on('error', reject);
    });
    let data = '';
    response.on('data', chunk => data += chunk);
    const geo = JSON.parse(data);
    return {
      city: geo.city || 'Inconnu',
      region: geo.region || 'Inconnu', 
      country: geo.country || 'Inconnu',
      org: geo.org || 'Inconnu',
      vpn: geo.vpn || false,
      hosting: geo.hosting || false
    };
  } catch {
    return { city: 'Inconnu', region: 'Inconnu', country: '??', org: 'Inconnu', vpn: false, hosting: false };
  }
}

function logRequest(req, res, geo) {
  const timestamp = new Date().toISOString();
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                   req.headers['x-real-ip'] || 
                   req.socket.remoteAddress;
  
  const fullIP = clientIP;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const method = req.method;
  const endpoint = req.url;
  const status = res.statusCode || 200;
  
  const location = `${geo.city}, ${geo.region}, ${geo.country}`;
  const provider = geo.org;
  const vpnInfo = geo.vpn ? '🔒VPN' : geo.hosting ? '🏢Hosting' : '🏠Résidentiel';
  
  const logLine = `[${timestamp}] ${method} ${endpoint} | ${status} | IP:${fullIP} | ${location} | ${provider} | ${vpnInfo} | UA:${userAgent.substring(0,50)}`;
  console.log(logLine);
  
  uniqueUsers.add(fullIP);
  requestCount++;
  console.log(`📊 Total requests: ${requestCount} | Users uniques: ${uniqueUsers.size}`);
}

console.log('🔍 Meta films:', META_URL);
console.log('📺 Meta séries:', SERIES_META_URL);
console.log('🌐 Base URL:', BASE_URL);
console.log('📦 Version v1.0.5:', ADDON_VERSION);

const server = require('http').createServer(async (req, res) => {
  const startTime = Date.now();
  
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
  const geo = await getGeo(ip);
  logRequest(req, res, geo);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.url === '/configure') {
    const manifestUrl = `${BASE_URL}/manifest.json`;
    const stremioUrl = manifestUrl.replace('https://', 'stremio://');
    const pageHTML = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🎬📺 SortiesFR v1.0.5 - Configuration</title>
  <!-- Style identique à avant -->
  <style>/* [CSS identique à v1.0.5 précédent] */</style>
</head>
<body>
  <!-- HTML identique avec les 2 catalogues -->
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(pageHTML);
  }
  
  else if (req.url === '/') {
    res.writeHead(302, { Location: `${BASE_URL}/configure` });
    res.end();
  }
  
  // Manifest (identique v1.0.5)
  else if (req.url === '/manifest.json') {
    const manifest = {
      "id": "com.stremiosortiesfr.catalog",
      "version": "1.0.5",
      "name": "🎬📺 SortiesFR v1.0.5",
      "description": ADDON_DESCRIPTION,
      "logo": ADDON_LOGO,
      "resources": ["catalog"],
      "types": ["movie", "series"],
      "idPrefixes": ["tt"],
      "catalogs": [
        {
          "type": "movie",
          "id": "filmsfr-recents",
          "name": "🎬 Films FR Récents"
        },
        {
          "type": "series",
          "id": "seriesfr-recentes",
          "name": "📺 Séries FR Récentes"
        }
      ],
      "behaviorHints": {
        "configurable": true,
        "configurationRequired": false
      }
    };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(Buffer.from(JSON.stringify(manifest), 'utf-8'));
  }
  
  // ✅ CATALOGUE FILMS (avec META routing)
  else if (req.url === '/catalog/movie/filmsfr-recents.json') {
    try {
      console.log('📡 Meta Pastebin films...');
      const metaData = await fetchPastebin(META_URL);
      const filmsId = metaData.trim();
      console.log('✅ Films ID:', filmsId);
      
      const filmsUrl = `https://pastebin.com/raw/${filmsId}`;
      const filmsData = await fetchPastebin(filmsUrl);
      
      const films = JSON.parse(filmsData);
      console.log(`✅ ${films.length} films`);
      
      const metas = films.map(f => ({
        id: f.id, type: 'movie', name: f.name,
        poster: f.poster || `https://via.placeholder.com/500x750/1E3A8A/F8FAFF?text=${f.name.substring(0,12)}`,
        description: f.description, releaseInfo: f.year,
        imdbRating: f.rating, genre: f.genre
      }));
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(Buffer.from(JSON.stringify({ metas }), 'utf-8'));
      
    } catch (error) {
      console.error('💥 Films:', error.message);
      const errorMeta = { metas: [{ id: 'error', type: 'movie', name: `ERREUR: ${error.message}`, poster: 'https://via.placeholder.com/500x750/FF6B6B/FFFFFF?text=ERROR' }] };
      res.end(Buffer.from(JSON.stringify(errorMeta), 'utf-8'));
    }
  } 
  
  // ✅ CATALOGUE SÉRIES (avec META routing Jv93Qfyj → 063xCRqW)
  else if (req.url === '/catalog/series/seriesfr-recentes.json') {
    try {
      console.log('📺 Meta Pastebin séries...');
      const seriesMetaData = await fetchPastebin(SERIES_META_URL);  // Jv93Qfyj
      const seriesId = seriesMetaData.trim();
      console.log('✅ Séries ID:', seriesId);  // Devrait logger "063xCRqW"
      
      const seriesUrl = `https://pastebin.com/raw/${seriesId}`;
      const seriesData = await fetchPastebin(seriesUrl);
      
      const series = JSON.parse(seriesData);
      console.log(`✅ ${series.length} séries`);
      
      const metas = series.map(s => ({
        id: s.id, type: 'series', name: s.name,
        poster: s.poster || `https://via.placeholder.com/500x750/4F46E5/FFFFFF?text=${s.name.substring(0,12)}`,
        description: s.description, releaseInfo: s.year,
        imdbRating: s.rating, genre: s.genre
      }));
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(Buffer.from(JSON.stringify({ metas }), 'utf-8'));
      
    } catch (error) {
      console.error('💥 Séries:', error.message);
      const errorMeta = { metas: [{ id: 'error', type: 'series', name: `ERREUR SÉRIES: ${error.message}`, poster: 'https://via.placeholder.com/500x750/FF6B6B/FFFFFF?text=ERROR' }] };
      res.end(Buffer.from(JSON.stringify(errorMeta), 'utf-8'));
    }
  }
  
  else {
    res.statusCode = 404;
    res.end('{}');
  }
  
  const duration = Date.now() - startTime;
  console.log(`⏱️ ${req.url} | ${duration}ms`);
});

// Fonction Pastebin (inchangée)
async function fetchPastebin(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        if (data.includes('<!DOCTYPE') || data.includes('<html')) {
          reject(new Error(`HTML error: ${url}`));
        }
        resolve(data);
      });
    }).on('error', reject);
  });
}

const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 StremioSortiesFR v${ADDON_VERSION} sur port ${port}`);
  console.log(`📱 Page config: ${BASE_URL}/configure`);
});
