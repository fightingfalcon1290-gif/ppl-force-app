import Stripe from 'stripe';
import { getStore } from '@netlify/blobs';

export const handler = async (event) => {
  if (!process.env.STRIPE_SECRET_KEY) return { statusCode: 200, body: 'Stripe未設定' };

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = event.headers['stripe-signature'];

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook署名検証失敗:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const store = getStore('ppl-data');

    let payments = [];
    try {
      payments = (await store.get('penalty-payments', { type: 'json' })) ?? [];
    } catch { /* initial */ }

    payments.push({
      sessionId: session.id,
      amount: session.amount_total,
      workout: session.metadata?.workout,
      date: session.metadata?.date,
      paidAt: new Date().toISOString()
    });
    await store.setJSON('penalty-payments', payments);
    console.log(`罰金支払い完了: ¥${session.amount_total} - ${session.metadata?.workout}`);
  }

  return { statusCode: 200, body: 'OK' };
};
