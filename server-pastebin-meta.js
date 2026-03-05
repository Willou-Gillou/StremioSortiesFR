const https = require('https'); // Pour fetch Pastebin (OUTGOING)

const META_PASTEBIN_ID = 'fxpaHMMj';  // Ton meta ID
const META_URL = `https://pastebin.com/raw/${META_PASTEBIN_ID}`;

console.log('🔍 Meta URL:', META_URL);

const server = require('http').createServer(async (req, res) => {
  // ✅ FIX UTF-8 + CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  if (req.url === '/manifest.json') {
    const manifest = {
      "id": "com.stremiosortiesfr.catalog",
      "version": "1.0.1",
      "name": "🎬 StremioSortiesFR",
      "description": "Sorties films FR récents (DVD/Blu-ray)",
      "logo": "https://via.placeholder.com/256x256/1E3A8A/FFFFFF?text=SF",
      "resources": ["catalog"],
      "types": ["movie"],
      "idPrefixes": ["tt"],
      "catalogs": [{
        "type": "movie",
        "id": "filmsfr-recents",
        "name": "🎬 Films FR Récents"
      }]
    };
    // ✅ FIX UTF-8: Buffer.from
    res.end(Buffer.from(JSON.stringify(manifest), 'utf-8'));
  }
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
      
      // ✅ FIX UTF-8
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
  } else {
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
  console.log(`🚀 StremioSortiesFR sur port ${port}`);
  console.log(`📱 https://stremiosortiesfr.onrender.com/manifest.json`);
});
