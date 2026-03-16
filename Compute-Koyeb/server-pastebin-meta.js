const https = require('https'); // Module pour faire des requêtes HTTPS vers Pastebin

// ✅ FONCTION HORODATAGE : Génère un timestamp formaté en français pour tous les logs
function getTimestamp() {
  const now = new Date();
  const time = now.toLocaleTimeString('fr-FR', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  const date = now.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
  return `[${date} ${time}]`;
}

// ✅ VARIABLES GLOBALES 
const ADDON_VERSION = 'v1.0.5'; // Version de l'addon
const META_PASTEBIN_ID = 'fxpaHMMj'; // ID Pastebin pour métas films généraux
const SERIES_META_ID = 'Jv93Qfyj'; // ID Pastebin pour métas séries
const META_URL = `https://pastebin.com/raw/${META_PASTEBIN_ID}`; // URL complète films
const SERIES_META_URL = `https://pastebin.com/raw/${SERIES_META_ID}`; // URL complète séries

// ✅ URL DYNAMIQUE : Détecte l'URL du serveur (Koyeb, Render, etc.) ou fallback
const BASEURL = process.env.KOYEB_SERVICE_URL || 
                process.env.BASE_URL || 
                process.env.RENDER_EXTERNAL_URL;

const ADDON_LOGO = 'https://kiatoo.com/blog/wp-content/uploads/2018/12/Blu_ray_disc.png'; // Logo addon
const ADDON_DESCRIPTION = `Cet addon est un catalogue présentant les dernières sorties de films ET séries FR récentes (DVD/Bluray). 
Cet addon ne fournit aucun lien et s'appuie sur la base de données de stremio pour présenter le résumé du film et la bande annonce si disponibles. 
Enfin, cet addon est hébergé sur un serveur qui se met en veille en cas d'inutilisation prolongée. Une requête vers le serveur le réveillera automatiquement au bout de 30s.`; // Description pour Stremio

// Log de démarrage avec timestamp et URL de base
console.log(`${getTimestamp()} 🚀 SortiesFR ${ADDON_VERSION} | BASEURL: ${BASEURL} | DÉMARRAGE`);

// ✅ CRÉATION DU SERVEUR HTTP : Gère toutes les requêtes Stremio
const server = require('http').createServer(async (req, res) => {
  // ✅ HORODATAGE + Construction de l'URL complète avec hostname réel (gère proxies)
  const host = req.headers.host || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const fullBaseUrl = `${protocol}://${host}`;
  console.log(`${getTimestamp()} 📡 ${req.method} ${req.url} from ${host}`);

  // ✅ CORS : Autorise toutes origines pour Stremio
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Gestion OPTIONS pour preflight CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ✅ ROUTE /configure : Page HTML d'installation pour Stremio avec URL manifest
  if (req.url === '/configure') {
    const manifestUrl = `${fullBaseUrl}/manifest.json`;
    const stremioUrl = manifestUrl.replace('https://', 'stremio://').replace('http://', 'stremio://');
    console.log(`${getTimestamp()} 🎨 Page configure chargée`);
    const pageHTML = `
<!DOCTYPE html>
<html>
<head><title>SortiesFR ${ADDON_VERSION}</title></head>
<body style="font-family:Arial;text-align:center;padding:50px;background:#1a1a1a;color:white;">
<h1>🎬 SortiesFR ${ADDON_VERSION}</h1>
<p>${ADDON_DESCRIPTION}</p>
<h2>Installation Stremio</h2>
<ol>
<li>Copier l'URL manifest : <strong>${manifestUrl}</strong></li>
<li>Ouvrir Stremio → Puzzles → +Custom Addon → Coller l'URL</li>
</ol>
<p><a href="${stremioUrl}" style="color:#00ff00;">🔗 Ouvrir Stremio directement</a></p>
<p><img src="${ADDON_LOGO}" width="200" style="margin:20px;"></p>
</body>
</html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(pageHTML);
    return;
  }

  // ✅ ROUTES STREMIO : Parse JSON body pour POST
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    let data = {};
    if (req.method === 'POST' && body) {
      try {
        data = JSON.parse(body);
      } catch (e) {
        console.error(`${getTimestamp()} ❌ JSON parse error:`, e);
      }
    }

    // ✅ /manifest.json : Retourne le manifest Stremio (obligatoire)
    if (req.url === '/manifest.json') {
      const manifest = {
        id: 'fr.sorties',
        version: ADDON_VERSION,
        name: 'Sorties FR',
        description: ADDON_DESCRIPTION,
        logo: ADDON_LOGO,
        background: ADDON_LOGO,
        resources: ['catalog', 'meta'],
        types: ['movie', 'series'],
        idPrefixes: ['sortiesfr_'],
        catalogs: [
          {
            type: 'movie',
            id: 'films',
            name: '🎬 Films FR'
          },
          {
            type: 'series',
            id: 'series',
            name: '📺 Séries FR'
          }
        ]
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(manifest));
      return;
    }

    // ✅ HANDLER CACHE : Vide le cache Stremio (/cache)
    if (req.url === '/cache') {
      console.log(`${getTimestamp()} 🗑️ Cache vidé`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // ✅ HANDLER META : Fournit métadonnées depuis Pastebin
    if (data && data.type === 'meta' && data.extra && data.extra.metaId) {
      console.log(`${getTimestamp()} 🔍 Meta request: ${data.extra.metaId}`);
      const isSeries = data.type === 'series';
      const pastebinUrl = isSeries ? SERIES_META_URL : META_URL;
      
      // Récupère contenu Pastebin
      https.get(pastebinUrl, (pasteRes) => {
        let pasteData = '';
        pasteRes.on('data', chunk => pasteData += chunk);
        pasteRes.on('end', () => {
          try {
            const metas = JSON.parse(pasteData);
            const meta = metas.find(m => m.id === data.extra.metaId);
            if (meta) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ metas: [meta] }));
            } else {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ metas: [] }));
            }
          } catch (e) {
            console.error(`${getTimestamp()} ❌ Pastebin parse error:`, e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ metas: [] }));
          }
        });
      }).on('error', (e) => {
        console.error(`${getTimestamp()} ❌ Pastebin fetch error:`, e);
        res.writeHead(500);
        res.end();
      });
      return;
    }

    // ✅ HANDLER CATALOG : Liste les sorties (même logique que meta mais retourne tous)
    if (data && data.type === 'catalog' && data.extra && data.extra.metaId) {
      console.log(`${getTimestamp()} 📋 Catalog request: ${data.extra.metaId}`);
      const isSeries = data.type === 'series';
      const pastebinUrl = isSeries ? SERIES_META_URL : META_URL;
      
      https.get(pastebinUrl, (pasteRes) => {
        let pasteData = '';
        pasteRes.on('data', chunk => pasteData += chunk);
        pasteRes.on('end', () => {
          try {
            const metas = JSON.parse(pasteData);
            const items = metas.map(m => ({
              id: m.id,
              type: data.type,
              name: m.name,
              poster: m.poster,
              description: m.releaseDate
            }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ metas: items }));
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ metas: [] }));
          }
        });
      });
      return;
    }

    // ✅ HANDLER STREAM : Ne fournit pas de liens (addon catalogue seulement)
    if (data && data.type === 'stream') {
      console.log(`${getTimestamp()} 🚫 Stream request bloqué (catalogue only)`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ streams: [] }));
      return;
    }

    // 404 par défaut
    res.writeHead(404);
    res.end('Not Found');
  });
});

// Démarre le serveur sur le port standard (process.env.PORT pour hébergement)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`${getTimestamp()} ✅ Serveur démarré sur port ${PORT}`);
  console.log(`${getTimestamp()} 🌐 URL: ${BASEURL}`);
});
