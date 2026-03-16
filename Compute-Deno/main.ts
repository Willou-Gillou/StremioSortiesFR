// ✅ FONCTION HORODATAGE
function getTimestamp(): string {
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

// ✅ VARIABLES GLOBALES v1.0.5
const ADDON_VERSION = 'v1.0.5';
const META_PASTEBIN_ID = 'fxpaHMMj';        // Meta général (films)
const SERIES_META_ID = 'Jv93Qfyj';         // Meta général (series)
const META_URL = `https://pastebin.com/raw/${META_PASTEBIN_ID}`;
const SERIES_META_URL = `https://pastebin.com/raw/${SERIES_META_ID}`;

const BASEURL = Deno.env.get('KOYEB_SERVICE_URL') || 
                Deno.env.get('BASE_URL') || 
                Deno.env.get('RENDER_EXTERNAL_URL') || 
                'https://yammering-fiann-willorg-17a44322.koyeb.app';

const ADDON_LOGO = 'https://kiatoo.com/blog/wp-content/uploads/2018/12/Blu_ray_disc.png';

const ADDON_DESCRIPTION = `Cet addon est un catalogue présentant les dernières sorties de films ET séries FR récentes (DVD/Bluray). 
Cet addon ne fournit aucun lien et s'appuie sur la base de données de stremio pour présenter le résumé du film et la bande annonce si disponibles. 
Enfin, cet addon est hébergé sur un serveur qui se met en veille en cas d'inutilisation prolongée. 
Une requête vers le serveur le réveillera automatiquement au bout de 30s.`;

console.log(`${getTimestamp()} 🚀 SortiesFR ${ADDON_VERSION} | BASEURL: ${BASEURL} | DÉMARRAGE`);

// ✅ SERVEUR DENO
Deno.serve({ port: 3000 }, async (req: Request) => {
  // ✅ HORODATAGE + Construction de l'URL complète
  const url = new URL(req.url);
  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = req.headers.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const fullBaseUrl = `${protocol}://${host}`;
  
  console.log(`${getTimestamp()} 📡 ${req.method} ${url.pathname} from ${host}`);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Gérer les OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // /configure
  if (url.pathname === '/configure') {
    const manifestUrl = `${fullBaseUrl}/manifest.json`;
    const stremioUrl = manifestUrl.replace('https://', 'stremio://').replace('http://', 'stremio://');
    
    console.log(`${getTimestamp()} 🎨 Page configure chargée`);
    
    const pageHTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🎬📺 SortiesFR ${ADDON_VERSION}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
    .container{background:white;padding:40px;border-radius:20px;box-shadow:0 20px 40px rgba(0,0,0,.1);text-align:center;max-width:500px;width:100%;}
    .logo{width:80px;height:80px;margin:0 auto 20px;border-radius:20px;object-fit:cover;border:4px solid white;box-shadow:0 8px 20px rgba(0,0,0,.2);}
    h1{color:#333;margin-bottom:30px;font-size:1.8em;}
    .info{background:#f8f9fa;padding:20px;border-radius:12px;margin-bottom:30px;text-align:left;}
    .info h3{color:#555;margin-bottom:10px;}
    .info p{word-break:break-all;background:white;padding:12px;border-radius:8px;border:2px solid #e9ecef;font-family:monospace;font-size:.9em;}
    .catalogs{background:#e3f2fd;padding:15px;border-radius:8px;margin:15px 0;text-align:left;}
    .catalogs h4{color:#1976d2;margin-bottom:10px;}
    .catalogs ul{list-style:none;padding-left:0;}
    .catalogs li{padding:5px 0;font-size:.9em;}
    .description{background:#e8f5e8;padding:15px;border-radius:8px;margin-top:15px;font-size:.85em;line-height:1.5;text-align:justify;}
    .version{color:#28a745;font-weight:bold;}
    .buttons{display:flex;gap:15px;flex-wrap:wrap;justify-content:center;}
    button{padding:15px 30px;border:none;border-radius:12px;font-size:1.1em;font-weight:600;cursor:pointer;transition:all .3s;flex:1;min-width:160px;}
    .copy-btn{background:#007bff;color:white;}
    .copy-btn:hover{background:#0056b3;transform:translateY(-2px);}
    .install-btn{background:linear-gradient(45deg,#28a745,#20c997);color:white;}
    .install-btn:hover{background:linear-gradient(45deg,#218838,#1ea88a);transform:translateY(-2px);}
    .copied{background:#28a745!important;animation:pulse .6s;}
    @keyframes pulse{0%{transform:scale(1);}50%{transform:scale(1.05);}100%{transform:scale(1);}}
    @media(max-width:480px){.container{padding:30px 20px;}.buttons{flex-direction:column;}}
  </style>
</head>
<body>
  <div class="container">
    <img src="${ADDON_LOGO}" alt="Logo" class="logo">
    <h1>🎬📺 SortiesFR ${ADDON_VERSION}</h1>
    <div class="info">
      <h3>📋 Informations</h3>
      <p><strong>Version:</strong> <span class="version">${ADDON_VERSION}</span></p>
      <p><strong>URL Manifest:</strong><br><span id="manifestUrl">${manifestUrl}</span></p>
      <div class="catalogs">
        <h4>📂 Catalogues:</h4>
        <ul>
          <li>🎬 Films FR Récents</li>
          <li>📺 Séries FR Récentes</li>
        </ul>
      </div>
      <div class="description">${ADDON_DESCRIPTION.replace(/\\n/g,'<br>')}</div>
    </div>
    <div class="buttons">
      <button class="copy-btn" onclick="copyUrl()">📋 Copier URL</button>
      <button class="install-btn" onclick="installAddon()">🚀 Installer</button>
    </div>
  </div>
  <script>
    const manifestUrl='${manifestUrl}';
    const stremioUrl='${stremioUrl}';
    function copyUrl(){
      navigator.clipboard.writeText(manifestUrl).then(()=>{
        const btn=document.querySelector('.copy-btn');
        btn.textContent='✅ Copié!';
        btn.classList.add('copied');
        setTimeout(()=>{btn.textContent='📋 Copier URL';btn.classList.remove('copied')},2000);
      });
    }
    function installAddon(){
      window.location.href=stremioUrl;
    }
  </script>
</body>
</html>`;

    return new Response(pageHTML, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  else if (url.pathname === '/') {
    console.log(`${getTimestamp()} 🔄 Redirection / → /configure`);
    return Response.redirect('/configure', 302);
  }

  else if (url.pathname === '/manifest.json') {
    console.log(`${getTimestamp()} 📋 Manifest.json servi`);
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
        {"type": "movie", "id": "filmsfr-recents", "name": "🎬 Films FR Récents"},
        {"type": "series", "id": "seriesfr-recentes", "name": "📺 Séries FR Récentes"}
      ],
      "behaviorHints": {"configurable": true, "configurationRequired": false}
    };
    return new Response(JSON.stringify(manifest), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  else if (url.pathname === '/catalog/movie/filmsfr-recents.json') {
    try {
      console.log(`${getTimestamp()} 📡 Fetch films...`);
      const metaData = await fetchPastebin(META_URL);
      const filmsId = metaData.trim();
      const filmsData = await fetchPastebin(`https://pastebin.com/raw/${filmsId}`);
      const films = JSON.parse(filmsData);

      const metas = films.map((f: any) => ({
        id: f.id, type: 'movie', name: f.name,
        poster: f.poster || `https://via.placeholder.com/500x750/1E3A8A/F8FAFF?text=${f.name.substring(0,12)}`,
        description: f.description, releaseInfo: f.year,
        imdbRating: f.rating, genre: f.genre
      }));

      console.log(`${getTimestamp()} ✅ ${metas.length} films envoyés`);
      return new Response(JSON.stringify({ metas }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
      });
    } catch (error: any) {
      console.error(`${getTimestamp()} 💥 Films ERROR:`, error.message);
      const errorMeta = { metas: [{ id: 'error', type: 'movie', name: `ERREUR: ${error.message}`, poster: 'https://via.placeholder.com/500x750/FF6B6B/FFFFFF?text=ERROR' }] };
      return new Response(JSON.stringify(errorMeta), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
  }

  else if (url.pathname === '/catalog/series/seriesfr-recentes.json') {
    try {
      console.log(`${getTimestamp()} 📺 Fetch séries...`);
      const seriesMetaData = await fetchPastebin(SERIES_META_URL);
      const seriesId = seriesMetaData.trim();
      const seriesData = await fetchPastebin(`https://pastebin.com/raw/${seriesId}`);
      const series = JSON.parse(seriesData);

      const metas = series.map((s: any) => ({
        id: s.id, type: 'series', name: s.name,
        poster: s.poster || `https://via.placeholder.com/500x750/4F46E5/FFFFFF?text=${s.name.substring(0,12)}`,
        description: s.description, releaseInfo: s.year,
        imdbRating: s.rating, genre: s.genre
      }));

      console.log(`${getTimestamp()} ✅ ${metas.length} séries envoyées`);
      return new Response(JSON.stringify({ metas }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
      });
    } catch (error: any) {
      console.error(`${getTimestamp()} 💥 Séries ERROR:`, error.message);
      const errorMeta = { metas: [{ id: 'error', type: 'series', name: `ERREUR: ${error.message}`, poster: 'https://via.placeholder.com/500x750/FF6B6B/FFFFFF?text=ERROR' }] };
      return new Response(JSON.stringify(errorMeta), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
  }

  else {
    console.log(`${getTimestamp()} ❌ 404: ${url.pathname}`);
    return new Response('{}', { 
      status: 404,
      headers: corsHeaders 
    });
  }
});

// ✅ FONCTION FETCH PASTEBIN (Deno)
async function fetchPastebin(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }
  
  const data = await response.text();
  
  if (data.includes('<!DOCTYPE') || data.includes('<html')) {
    throw new Error(`HTML error: ${url}`);
  }
  
  return data;
}

const port = parseInt(Deno.env.get('PORT') || '3000');
console.log(`${getTimestamp()} 🚀 v${ADDON_VERSION} sur port ${port} | PRÊT`);
