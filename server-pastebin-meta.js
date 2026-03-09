const https = require('https'); // Pour fetch Pastebin (OUTGOING)

// ✅ VARIABLES GLOBALES
const ADDON_VERSION = 'v1.0.3';  
const META_PASTEBIN_ID = 'fxpaHMMj';  
const META_URL = `https://pastebin.com/raw/${META_PASTEBIN_ID}`;
const BASE_URL = process.env.BASE_URL || `https://stremiosortiesfr.onrender.com`;
const ADDON_LOGO = 'https://kiatoo.com/blog/wp-content/uploads/2018/12/Blu_ray_disc.png';

const ADDON_DESCRIPTION = `Cet addon est un catalogue présentant les dernières sorties de films FR récents (DVD/Bluray). 
Cet addon ne fournit aucun lien et s'appuie sur la base de données de stremio pour présenter le résumé du film et la bande annonce si disponibles. 
Enfin, cet addon est hébergé sur un serveur qui se met en veille en cas d'inutilisation prolongée. 
Une requête vers le serveur le réveillera automatiquement au bout de 30s.`;

console.log('🔍 Meta URL:', META_URL);
console.log('🌐 Base URL:', BASE_URL);
console.log('📦 Version:', ADDON_VERSION);

const server = require('http').createServer(async (req, res) => {
  // ✅ CORS complet
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // ✅ UNIQUEMENT /configure pour Stremio
  if (req.url === '/configure') {
    const manifestUrl = `${BASE_URL}/manifest.json`;
    const stremioUrl = manifestUrl.replace('https://', 'stremio://');
    const pageHTML = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🎬 SortiesFR - Configuration</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 500px;
      width: 100%;
    }
    .logo {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      border-radius: 20px;
      object-fit: cover;
      border: 4px solid white;
      box-shadow: 0 8px 20px rgba(0,0,0,0.2);
    }
    h1 { color: #333; margin-bottom: 30px; font-size: 1.8em; }
    .info {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 30px;
      text-align: left;
    }
    .info h3 { color: #555; margin-bottom: 10px; }
    .info p { 
      word-break: break-all; 
      background: white; 
      padding: 12px; 
      border-radius: 8px; 
      border: 2px solid #e9ecef;
      font-family: monospace;
      font-size: 0.9em;
    }
    .description {
      background: #e8f5e8;
      padding: 15px;
      border-radius: 8px;
      margin-top: 15px;
      font-size: 0.85em;
      line-height: 1.5;
      text-align: justify;
    }
    .version { color: #28a745; font-weight: bold; }
    .buttons {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      justify-content: center;
    }
    button {
      padding: 15px 30px;
      border: none;
      border-radius: 12px;
      font-size: 1.1em;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      flex: 1;
      min-width: 160px;
    }
    .copy-btn {
      background: #007bff;
      color: white;
    }
    .copy-btn:hover { background: #0056b3; transform: translateY(-2px); }
    .install-btn {
      background: linear-gradient(45deg, #28a745, #20c997);
      color: white;
    }
    .install-btn:hover { 
      background: linear-gradient(45deg, #218838, #1ea88a); 
      transform: translateY(-2px); 
    }
    .copied { 
      background: #28a745 !important; 
      animation: pulse 0.6s; 
    }
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    @media (max-width: 480px) {
      .container { padding: 30px 20px; }
      .buttons { flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="${ADDON_LOGO}" alt="SortiesFR Logo" class="logo">
    <h1>SortiesFR Addon</h1>
    
    <div class="info">
      <h3>📋 Informations</h3>
      <p><strong>Version :</strong> <span class="version">${ADDON_VERSION}</span></p>
      <p><strong>URL Manifest :</strong><br>
         <span id="manifestUrl">${manifestUrl}</span>
      </p>
      <div class="description">${ADDON_DESCRIPTION.replace(/\\n/g, '<br>')}</div>
    </div>
    
    <div class="buttons">
      <button class="copy-btn" onclick="copyUrl()">
        📋 Copier URL
      </button>
      <button class="install-btn" onclick="installAddon()">
        🚀 Installer dans Stremio
      </button>
    </div>
  </div>

  <script>
    const manifestUrl = '${manifestUrl}';
    const stremioUrl = '${stremioUrl}';
    
    function copyUrl() {
      navigator.clipboard.writeText(manifestUrl).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = '✅ Copié !';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = '📋 Copier URL';
          btn.classList.remove('copied');
        }, 2000);
      });
    }
    
    function installAddon() {
      window.location.href = stremioUrl;
    }
  </script>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(pageHTML);
  }
  
  // Route racine : redirige vers /configure
  else if (req.url === '/') {
    res.writeHead(302, { Location: `${BASE_URL}/configure` });
    res.end();
  }
  
  // ✅ Manifest avec logo + description
  else if (req.url === '/manifest.json') {
    const manifest = {
      "id": "com.stremiosortiesfr.catalog",
      "version": ADDON_VERSION,
      "name": "🎬 SortiesFR",
      "description": ADDON_DESCRIPTION,
      "logo": ADDON_LOGO,
      "resources": ["catalog"],
      "types": ["movie"],
      "idPrefixes": ["tt"],
      "catalogs": [{
        "type": "movie",
        "id": "filmsfr-recents",
        "name": "🎬 Films FR Récents"
      }],
      "behaviorHints": {
        "configurable": true,
        "configurationRequired": false
      }
    };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(Buffer.from(JSON.stringify(manifest), 'utf-8'));
  }
  
  // ✅ Catalogue films
  else if (req.url === '/catalog/movie/filmsfr-recents.json') {
    try {
      console.log('📡 Meta Pastebin...');
      const metaData = await fetchPastebin(META_URL);
      const filmsId = metaData.trim();
      console.log('✅ Films ID:', filmsId);
      
      const filmsUrl = `https://pastebin.com/raw/${filmsId}`;
      const filmsData = await fetchPastebin(filmsUrl);
      
      const films = JSON.parse(filmsData);
      console.log(`✅ ${films.length} films`);
      
      const metas = films.map(f => ({
        id: f.id, 
        type: 'movie', 
        name: f.name,
        poster: f.poster || `https://via.placeholder.com/500x750/1E3A8A/F8FAFF?text=${f.name.substring(0,12)}`,
        description: f.description, 
        releaseInfo: f.year,
        imdbRating: f.rating, 
        genre: f.genre
      }));
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(Buffer.from(JSON.stringify({ metas }), 'utf-8'));
      
    } catch (error) {
      console.error('💥', error.message);
      const errorMeta = {
        metas: [{
          id: 'error', 
          type: 'movie', 
          name: `ERREUR: ${error.message}`,
          poster: 'https://via.placeholder.com/500x750/FF6B6B/FFFFFF?text=ERROR'
        }]
      };
      res.end(Buffer.from(JSON.stringify(errorMeta), 'utf-8'));
    }
  } 
  else {
    res.statusCode = 404;
    res.end('{}');
  }
});

// 🔧 Fonction Pastebin sécurisée
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

// ✅ Render Cloud: PORT dynamique
const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 StremioSortiesFR v${ADDON_VERSION} sur port ${port}`);
  console.log(`📱 Page config: https://stremiosortiesfr.onrender.com/configure`);
  console.log(`📱 Manifest: https://stremiosortiesfr.onrender.com/manifest.json`);
  console.log(`📱 Stremio URL: stremio://stremiosortiesfr.onrender.com/manifest.json`);
});
