import { getStore } from '@netlify/blobs';

const DEFAULTS = [
  { id: 'push', name: 'Push',  color: '#ff3c3c', isRest: false },
  { id: 'pull', name: 'Pull',  color: '#3c8fff', isRest: false },
  { id: 'legs', name: 'Legs',  color: '#3cff7a', isRest: false },
  { id: 'rest', name: 'Rest',  color: '#888899', isRest: true  },
];

export const handler = async () => {
  try {
    const store = getStore('ppl-data');
    const saved = await store.get('tasks', { type: 'json' }).catch(() => null);
    return {
      statusCode: 200,
      headers: cors(),
      body: JSON.stringify(saved ?? DEFAULTS)
    };
  } catch (err) {
    return { statusCode: 200, headers: cors(), body: JSON.stringify(DEFAULTS) };
  }
};

function cors() {
  return { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
}
