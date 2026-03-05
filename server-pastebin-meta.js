const https = require('https'); // Pour fetch Pastebin (OUTGOING)

const META_PASTEBIN_ID = 'fxpaHMMj';  // Ton meta ID
const META_URL = `https://pastebin.com/raw/${META_PASTEBIN_ID}`;

console.log('🔍 Meta URL:', META_URL);

const server = require('http').createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/manifest.json') {
    res.end(JSON.stringify({
      "id": "com.stremiosortiesfr.catalog",
      "version": "1.0.0",
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
    }));
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
        id: f.id, type: 'movie', name: f.name,
        poster: f.poster || `https://via.placeholder.com/500x750/1E3A8A/F8FAFF?text=${f.name.substring(0,12)}`,
        description: f.description, releaseInfo: f.year,
        imdbRating: f.rating, genre: f.genre
      }));
      
      res.end(JSON.stringify({ metas }));
    } catch (error) {
      console.error('💥', error.message);
      res.end(JSON.stringify({ metas: [{
        id: 'error', type: 'movie', name: `ERREUR: ${error.message}`,
        poster: 'https://via.placeholder.com/500x750/FF6B6B/FFFFFF?text=ERROR'
      }] }));
    }
  } else {
    res.statusCode = 404;
    res.end('{}');
  }
});

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
  console.log(`🚀 StremioSortiesFR sur port ${port}`);
  console.log(`📱 https://stremiosortiesfr.onrender.com/manifest.json`);
});