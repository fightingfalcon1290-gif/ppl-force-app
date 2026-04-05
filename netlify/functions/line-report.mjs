export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors() };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const userId = process.env.LINE_USER_ID;
  if (!token || !userId) {
    return { statusCode: 200, headers: cors(), body: JSON.stringify({ error: 'LINE未設定' }) };
  }

  try {
    const { workout, completed, duration, penaltyUrl } = JSON.parse(event.body);
    const message = buildFlexMessage(workout, completed, duration, penaltyUrl);

    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ to: userId, messages: [message] })
    });

    if (!res.ok) {
      const body = await res.text();
      return { statusCode: 502, headers: cors(), body: JSON.stringify({ error: body }) };
    }

    return { statusCode: 200, headers: cors(), body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: err.message }) };
  }
};

function buildFlexMessage(workout, completed, duration, penaltyUrl) {
  const durationText = duration
    ? `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
    : '';

  if (completed) {
    return {
      type: 'flex',
      altText: `✅ PPL FORCE ${workout} 完了！`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box', layout: 'vertical', backgroundColor: '#ff3c3c',
          contents: [{ type: 'text', text: 'PPL FORCE', weight: 'bold', color: '#ffffff', size: 'lg', letterSpacing: '3px' }]
        },
        body: {
          type: 'box', layout: 'vertical', spacing: 'md',
          contents: [
            { type: 'text', text: '✅ MISSION COMPLETE', weight: 'bold', size: 'xl', color: '#3cff7a' },
            { type: 'text', text: `${workout} トレーニング完了`, size: 'md', color: '#333333' },
            ...(durationText ? [{ type: 'text', text: `⏱ ${durationText}`, size: 'sm', color: '#888888' }] : []),
            { type: 'separator' },
            { type: 'text', text: '継続は力なり。明日も頑張れ！💪', size: 'sm', color: '#888888', wrap: true }
          ]
        }
      }
    };
  }

  const footer = penaltyUrl
    ? {
        type: 'box', layout: 'vertical',
        contents: [{
          type: 'button',
          action: { type: 'uri', label: '💳 罰金を支払う', uri: penaltyUrl },
          style: 'primary', color: '#ff3c3c'
        }]
      }
    : undefined;

  return {
    type: 'flex',
    altText: `⚠️ PPL FORCE ${workout} 未完了`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#1a1a1a',
        contents: [{ type: 'text', text: 'PPL FORCE', weight: 'bold', color: '#ff3c3c', size: 'lg', letterSpacing: '3px' }]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: '⚠️ MISSION FAILED', weight: 'bold', size: 'xl', color: '#ff3c3c' },
          { type: 'text', text: `${workout} トレーニング 未完了`, size: 'md', color: '#333333' },
          { type: 'separator' },
          { type: 'text', text: 'サボりを検知しました。罰金を支払うか、明日取り返せ！', size: 'sm', color: '#888888', wrap: true }
        ]
      },
      ...(footer ? { footer } : {})
    }
  };
}

function cors() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}
