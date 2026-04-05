import { getStore } from '@netlify/blobs';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { notificationId, workout } = JSON.parse(event.body);
    const snoozeAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const store = getStore('ppl-data');
    let jobs = [];
    try {
      jobs = (await store.get('snooze-jobs', { type: 'json' })) ?? [];
    } catch { /* no jobs yet */ }

    jobs.push({ notificationId, workout, snoozeAt });
    await store.setJSON('snooze-jobs', jobs);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, snoozeAt })
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
