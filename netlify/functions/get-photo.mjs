import { getStore } from '@netlify/blobs';

const QUERIES = {
  Push: 'bench press chest workout gym',
  Pull: 'pull up back workout rowing gym',
  Legs: 'squat leg day gym barbell',
  Rest: 'yoga meditation recovery stretching'
};

export const handler = async (event) => {
  const workout = event.queryStringParameters?.workout ?? 'Push';
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    return {
      statusCode: 200,
      headers: cors(),
      body: JSON.stringify({ url: null, error: 'UNSPLASH_ACCESS_KEY未設定' })
    };
  }

  // 1日1枚キャッシュ
  const store = getStore('ppl-data');
  const jstDate = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const cacheKey = `photo-${workout}-${jstDate}`;

  try {
    const cached = await store.get(cacheKey, { type: 'json' });
    if (cached) return { statusCode: 200, headers: cors(), body: JSON.stringify(cached) };
  } catch { /* no cache */ }

  try {
    const query = QUERIES[workout] ?? 'fitness workout';
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    );

    if (!res.ok) throw new Error(`Unsplash ${res.status}`);

    const photo = await res.json();
    const data = {
      url: photo.urls?.regular,
      blur: photo.blur_hash,
      author: photo.user?.name,
      authorUrl: photo.user?.links?.html + '?utm_source=ppl_force&utm_medium=referral'
    };

    await store.setJSON(cacheKey, data);
    return { statusCode: 200, headers: cors(), body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 200, headers: cors(), body: JSON.stringify({ url: null, error: err.message }) };
  }
};

function cors() {
  return { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
}
