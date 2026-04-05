import { getStore } from '@netlify/blobs';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors() };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const schedule = JSON.parse(event.body);
    if (!Array.isArray(schedule) || schedule.length !== 7) {
      return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: '不正なスケジュールデータ' }) };
    }

    const store = getStore('ppl-data');
    await store.setJSON('schedule', schedule);

    return { statusCode: 200, headers: cors(), body: JSON.stringify({ success: true }) };
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
