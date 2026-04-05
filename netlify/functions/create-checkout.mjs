import Stripe from 'stripe';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors() };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  if (!process.env.STRIPE_SECRET_KEY) {
    return { statusCode: 200, headers: cors(), body: JSON.stringify({ error: 'Stripe未設定' }) };
  }

  try {
    const { amount, workout, date } = JSON.parse(event.body);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const host = event.headers.origin
      || (event.headers.host ? `https://${event.headers.host}` : null)
      || process.env.URL
      || 'http://localhost:8888';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: {
            name: `PPL FORCE 罰金 — ${workout} (${date})`,
            description: 'トレーニングをサボった罰金。次は必ずやれ。'
          },
          unit_amount: amount
        },
        quantity: 1
      }],
      success_url: `${host}/?payment=success`,
      cancel_url: `${host}/?payment=cancelled`,
      metadata: { workout, date }
    });

    return { statusCode: 200, headers: cors(), body: JSON.stringify({ url: session.url }) };
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
