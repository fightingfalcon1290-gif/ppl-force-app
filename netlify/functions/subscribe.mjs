import { getStore } from '@netlify/blobs';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors() };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const subscription = JSON.parse(event.body);
    if (!subscription?.endpoint) {
      return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: '不正なサブスクリプション' }) };
    }

    const store = getStore('ppl-data');
    let subscriptions = [];
    try {
      subscriptions = (await store.get('subscriptions', { type: 'json' })) ?? [];
    } catch { /* 初回は空 */ }

    const alreadyExists = subscriptions.some(s => s.endpoint === subscription.endpoint);
    if (!alreadyExists) {
      subscriptions.push(subscription);
      await store.setJSON('subscriptions', subscriptions);
    }

    return {
      statusCode: 200,
      headers: cors(),
      body: JSON.stringify({ success: true, count: subscriptions.length })
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: err.message }) };
  }
};

function cors() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}
