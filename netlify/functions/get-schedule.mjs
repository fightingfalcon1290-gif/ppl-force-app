import { getStore } from '@netlify/blobs';

const DEFAULT_SCHEDULE = [
  { day: 0, dayName: '日', workout: 'Rest',  time: '07:00', enabled: false },
  { day: 1, dayName: '月', workout: 'Push',  time: '07:00', enabled: true  },
  { day: 2, dayName: '火', workout: 'Pull',  time: '07:00', enabled: true  },
  { day: 3, dayName: '水', workout: 'Legs',  time: '07:00', enabled: true  },
  { day: 4, dayName: '木', workout: 'Push',  time: '07:00', enabled: true  },
  { day: 5, dayName: '金', workout: 'Pull',  time: '07:00', enabled: true  },
  { day: 6, dayName: '土', workout: 'Legs',  time: '07:00', enabled: true  },
];

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors() };
  }

  try {
    const store = getStore('ppl-data');
    let saved = null;
    try {
      saved = await store.get('schedule', { type: 'json' });
    } catch { /* no schedule saved yet */ }

    return {
      statusCode: 200,
      headers: cors(),
      body: JSON.stringify(saved ?? DEFAULT_SCHEDULE)
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
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };
}
