import { getStore } from '@netlify/blobs';

export const handler = async () => {
  try {
    const store = getStore('ppl-data');
    const saved = await store.get('tasks', { type: 'json' }).catch(() => null);
    return {
      statusCode: 200,
      headers: cors(),
      body: JSON.stringify(saved ?? [])
    };
  } catch (err) {
    return { statusCode: 200, headers: cors(), body: JSON.stringify([]) };
  }
};

function cors() {
  return { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
}
