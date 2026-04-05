import { getStore } from '@netlify/blobs';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors() };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { penaltyAmount, penaltyEnabled, penaltyHour } = JSON.parse(event.body);
    const store = getStore('ppl-data');

    const existing = (await store.get('settings', { type: 'json' }).catch(() => null)) ?? {};
    const updated = {
      ...existing,
      ...(penaltyAmount  !== undefined && { penaltyAmount:  Number(penaltyAmount)  }),
      ...(penaltyEnabled !== undefined && { penaltyEnabled: Boolean(penaltyEnabled) }),
      ...(penaltyHour    !== undefined && { penaltyHour:    Number(penaltyHour)    })
    };
    await store.setJSON('settings', updated);

    return { statusCode: 200, headers: cors(), body: JSON.stringify({ success: true }) };
  } catch (err) {
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
