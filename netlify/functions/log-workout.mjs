import { getStore } from '@netlify/blobs';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors() };
  if (event.httpMethod === 'GET') {
    // 今日のログを取得
    try {
      const store = getStore('ppl-data');
      const dateKey = jstToday();
      const log = (await store.get(`workout-log-${dateKey}`, { type: 'json' })) ?? null;
      return { statusCode: 200, headers: cors(), body: JSON.stringify(log) };
    } catch (err) {
      return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: err.message }) };
    }
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { workout, duration } = JSON.parse(event.body);
    const store = getStore('ppl-data');
    const dateKey = jstToday();

    const log = {
      workout,
      duration: duration ?? 0,
      completed: true,
      completedAt: new Date().toISOString()
    };
    await store.setJSON(`workout-log-${dateKey}`, log);

    return { statusCode: 200, headers: cors(), body: JSON.stringify({ success: true, log }) };
  } catch (err) {
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: err.message }) };
  }
};

function jstToday() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function cors() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
}
