import { getStore } from '@netlify/blobs';

export const handler = async () => {
  let settings = {};
  try {
    const store = getStore('ppl-data');
    settings = (await store.get('settings', { type: 'json' })) ?? {};
  } catch { /* no settings yet */ }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      push:     !!process.env.VAPID_PUBLIC_KEY,
      line:     !!(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_USER_ID),
      stripe:   !!process.env.STRIPE_SECRET_KEY,
      unsplash: !!process.env.UNSPLASH_ACCESS_KEY,
      penaltyAmount:  settings.penaltyAmount  ?? 500,
      penaltyEnabled: settings.penaltyEnabled ?? false,
      penaltyHour:    settings.penaltyHour    ?? 23
    })
  };
};
