const https = require('https');
const fs = require('fs');

const META_PASTEBIN_ID = 'fxpaHMMj';  // ← Pastebin contenant l'ID films
const META_URL = `https://pastebin.com/raw/${META_PASTEBIN_ID}`;

console.log('🔍 Meta URL:', META_URL);

const options = {
  key: fs.readFileSync('certs/key.pem'),
  cert: fs.readFileSync('certs/cert.pem')
};

const server = https.createServer(options, async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/manifest.json') {
    res.end(JSON.stringify({
  "id": "com.filmsfr.dynamic",
  "version": "1.0.1",
  "name": "Allociné / Dernières sorties FR", 
  "description": "Films et séries françaises récentes DVD/BluRay",
  "logo": "https://m.media-amazon.com/images/I/51y2h75fMoL.png",
  "resources": ["catalog"],
  "types": ["movie", "series"],
  "idPrefixes": ["tt"],
  "catalogs": [
    {
      "type": "movie",
      "id": "filmsfr-recents", 
      "name": "🎬 Allociné / Dernières sorties FR"
    },
    {
      "type": "series", 
      "id": "seriesfr-recentes",
      "name": "📺 Allociné / Dernières sorties FR"
    }
  ]
    }));
  }
  else if (req.url === '/catalog/movie/filmsfr-recents.json') {
    try {
      // 1️⃣ Récupère ID depuis META Pastebin
      console.log('📡 Meta Pastebin (ID films)...');
      const metaData = await fetchPastebin(META_URL);
      const filmsPastebinId = metaData.trim();
      console.log('✅ ID films:', filmsPastebinId);
      
      // 2️⃣ Récupère films depuis le Pastebin pointé
      const filmsUrl = `https://pastebin.com/raw/${filmsPastebinId}`;
      console.log('📡 Films Pastebin:', filmsUrl);
      const filmsData = await fetchPastebin(filmsUrl);
      
      const films = JSON.parse(filmsData);
      console.log(`✅ ${films.length} films:`, films.map(f => f.name));
      
      const metas = films.map(f => ({
        id: f.id,
        type: 'movie',
        name: f.name,
        poster: `https://via.placeholder.com/500x750/1E3A8A/F8FAFF?text=${f.name.substring(0,12)}`,
        description: f.description,
        releaseInfo: f.year,
        imdbRating: f.rating,
        genre: f.genre
      }));
      
      res.end(JSON.stringify({ metas }));
      
    } catch (error) {
      console.error('💥 ERREUR:', error.message);
      // Fallback 3 films
      const demoFilms = [{"id":"tt14883538","name":"Arco (2025)","description":"Animation fantastique française","year":"2025","rating":7.5,"genre":"Animation"},{"id":"tt34794183","name":"Dossier 137 (2025)","description":"Thriller policier français","year":"2025","rating":7.3,"genre":"Thriller"},{"id":"tt36243564","name":"L'Étranger (2025)","description":"Adaptation Camus par Ozon","year":"2025","rating":7.0,"genre":"Drame"}];
      res.end(JSON.stringify({ metas: demoFilms.map(f=>({id:f.id,type:'movie',name:f.name,poster:`https://via.placeholder.com/500x750/1E3A8A/F8FAFF?text=${f.name.substring(0,12)}`,description:f.description,releaseInfo:f.year,imdbRating:f.rating,genre:f.genre})) }));
    }
  } else {
    res.statusCode = 404;
    res.end('{}');
  }
});

// 🔧 Fonction universelle Pastebin
async function fetchPastebin(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        if (data.includes('<!DOCTYPE') || data.includes('<html')) {
          reject(new Error(`HTML erreur sur ${url}`));
        }
        resolve(data);
      });
    }).on('error', reject);
  });
}

server.listen(7000, '127.0.0.1', () => {
  console.log('🚀 META-Serveur: https://127.0.0.1:7000/manifest.json');
});
