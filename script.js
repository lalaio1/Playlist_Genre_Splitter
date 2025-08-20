// ========== SPOTIFY PLAYLIST GENRE-SPLITTER (console) ==========
// Usage: Cole no console numa aba onde tenha sessão Spotify. Ajuste `token`.
// This script will find the playlist named "#", read all tracks, group them by artist genre,
// create per-genre playlists for your user and add tracks.
// =================================================================

(async () => {
  // --- CONFIG --- (cole seu token aqui)
  const token = `###`;

  const PLAYLIST_NAME = '###'; // nome da playlist a ser dividida
  const CREATE_PUBLIC = false;   // true para playlists públicas, false para privadas
  const DESCRIPTION_PREFIX = 'Split from playlist "###" by genre — auto-generated';

  // --- helpers HTTP / retries ---
  async function fetchApi(path, method = 'GET', body = null, extraHeaders = {}) {
    const headers = {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...extraHeaders
    };
    const opts = { method, headers };
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
      opts.body = JSON.stringify(body);
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fetch('https://api.spotify.com' + path, opts);
      if (res.status === 429) {
        const wait = (parseInt(res.headers.get('Retry-After') || '1', 10) + 1) * 1000;
        console.warn('Rate limited, waiting', wait, 'ms');
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      if (res.status >= 500 && attempt < 4) {
        const wait = (500 * (attempt + 1));
        console.warn('Server error, retrying in', wait, 'ms');
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      const text = await res.text();
      try { return JSON.parse(text); } catch(e){ return text; }
    }
    throw new Error('fetchApi failed repeatedly: ' + path);
  }

  // --- Step 0: get current user id ---
  console.log('Obtendo perfil do usuário...');
  const me = await fetchApi('/v1/me', 'GET');
  if (!me || !me.id) { console.error('Não foi possível obter perfil. Verifique token/scopes.'); return; }
  const userId = me.id;
  console.log('Usuário:', userId);

  // --- Step 1: find playlist named PLAYLIST_NAME among user's playlists (paginated) ---
  console.log(`Procurando playlist chamada "${PLAYLIST_NAME}"...`);
  async function findPlaylistByName(name) {
    let offset = 0, limit = 50;
    while (true) {
      const res = await fetchApi(`/v1/me/playlists?limit=${limit}&offset=${offset}`, 'GET');
      if (!res || !res.items) break;
      for (const p of res.items) {
        if (p && p.name === name) return p; 
      }
      if (res.items.length < limit) break;
      offset += limit;
    }
    return null;
  }

  const playlist = await findPlaylistByName(PLAYLIST_NAME);
  if (!playlist) { console.error(`Playlist "${PLAYLIST_NAME}" não encontrada no seu perfil.`); return; }
  console.log('Playlist encontrada:', playlist.name, '(', playlist.id, ')', 'total tracks:', playlist.tracks?.total);

  console.log('Lendo faixas da playlist (paginação) ...');
  async function getAllPlaylistTracks(playlistId) {
    const all = [];
    let offset = 0, limit = 100;
    while (true) {
      const res = await fetchApi(`/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`, 'GET');
      if (!res || !res.items) break;
      all.push(...res.items);
      if (res.items.length < limit) break;
      offset += limit;
    }
    return all;
  }

  const rawTracks = await getAllPlaylistTracks(playlist.id);
  console.log('Total de itens obtidos (incluindo possíveis nulls):', rawTracks.length);

  const tracks = []; // { uri, id, artistIds: [] }
  for (const item of rawTracks) {
    if (!item || !item.track) continue;
    const t = item.track;
    if (!t.uri || !t.artists) continue;
    const artistIds = (t.artists || []).map(a => a.id).filter(Boolean);
    tracks.push({ uri: t.uri, id: t.id, name: t.name, artistIds });
  }
  console.log('Faixas válidas para processar:', tracks.length);

  const artistIdSet = new Set();
  tracks.forEach(t => t.artistIds.forEach(a => artistIdSet.add(a)));
  const allArtistIds = Array.from(artistIdSet).filter(Boolean);
  console.log('Artistas únicos a consultar:', allArtistIds.length);

  async function fetchArtistsBatch(ids) {
    const q = ids.join(',');
    return await fetchApi(`/v1/artists?ids=${encodeURIComponent(q)}`, 'GET');
  }

  const artistGenres = {}; // artistId -> genres[]
  for (let i = 0; i < allArtistIds.length; i += 50) {
    const batch = allArtistIds.slice(i, i + 50);
    const res = await fetchArtistsBatch(batch);
    if (res && res.artists) {
      res.artists.forEach(a => { artistGenres[a.id] = a.genres || []; });
    }

    await new Promise(r => setTimeout(r, 200));
  }

  function pickGenreForTrack(track) {
    for (const aid of track.artistIds) {
      const g = artistGenres[aid];
      if (g && g.length) return g[0]; 
    }
    return 'Unknown';
  }

  const grouped = new Map(); // genre -> [uris]
  for (const t of tracks) {
    const genre = pickGenreForTrack(t) || 'Unknown';
    if (!grouped.has(genre)) grouped.set(genre, []);
    grouped.get(genre).push(t.uri);
  }

  console.log('Agrupamento por gênero concluído. Nº gêneros:', grouped.size);
  console.table(Array.from(grouped.entries()).map(([g, list]) => ({genre:g, count:list.length})));

  async function createPlaylistForGenre(genre) {
    const safeName = `${PLAYLIST_NAME} — ${genre}`.slice(0, 100);
    const body = { name: safeName, public: CREATE_PUBLIC, description: `${DESCRIPTION_PREFIX}: ${genre}` };
    const created = await fetchApi(`/v1/users/${encodeURIComponent(userId)}/playlists`, 'POST', body);
    if (created && created.id) { console.log('Criada playlist:', safeName); return created; }
    console.warn('Falha ao criar playlist para', genre, created);
    return null;
  }

  async function addTracksToPlaylist(playlistId, uris) {
    
    for (let i = 0; i < uris.length; i += 100) {
      const batch = uris.slice(i, i + 100);
      const body = { uris: batch };
      const res = await fetchApi(`/v1/playlists/${playlistId}/tracks`, 'POST', body);
      
      await new Promise(r => setTimeout(r, 250)); 
    }
  }

  
  const createdPlaylists = {};
  for (const [genre, uris] of grouped.entries()) {
    try {
      const pl = await createPlaylistForGenre(genre);
      if (!pl || !pl.id) { console.warn('Pulando gênero', genre); continue; }
      createdPlaylists[genre] = pl;
      console.log(`Adicionando ${uris.length} faixas à playlist "${pl.name}"...`);
      await addTracksToPlaylist(pl.id, uris);
      console.log(`Concluído ${genre}: ${uris.length} faixas adicionadas.`);
    } catch (err) {
      console.error('Erro processando gênero', genre, err);
    }
  }

  console.log('Processo finalizado. Playlists criadas:', Object.keys(createdPlaylists).length);
  console.log('Resumo:');
  for (const [g, pl] of Object.entries(createdPlaylists)) {
    console.log(g, '=>', pl.name, pl.external_urls?.spotify || pl.id);
  }

  
})();
