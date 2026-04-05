import { schedule } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import webPush from 'web-push';
import Stripe from 'stripe';

// 毎分実行
export const handler = schedule('* * * * *', async () => {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_EMAIL) return { statusCode: 200 };

  webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const store = getStore('ppl-data');

  // JST現在時刻
  const nowUtc = new Date();
  const jstDate = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000);
  const currentDay  = jstDate.getUTCDay();
  const currentHour = jstDate.getUTCHours();
  const currentMin  = jstDate.getUTCMinutes();
  const currentTime = `${pad(currentHour)}:${pad(currentMin)}`;
  const todayKey    = jstDate.toISOString().slice(0, 10);

  // サブスクリプション取得
  let subscriptions = [];
  try {
    subscriptions = (await store.get('subscriptions', { type: 'json' })) ?? [];
  } catch { return { statusCode: 200 }; }

  const daySchedules = (await store.get('schedule', { type: 'json' }).catch(() => [])) ?? [];
  const settings     = (await store.get('settings',  { type: 'json' }).catch(() => null)) ?? {};
  const notifications = [];

  // ─── スヌーズジョブ確認 ────────────────────────────────────────────────
  const allSnoozeJobs = (await store.get('snooze-jobs', { type: 'json' }).catch(() => [])) ?? [];
  const nowIso = nowUtc.toISOString();
  const dueJobs = allSnoozeJobs.filter(j => j.snoozeAt <= nowIso);

  for (const job of dueJobs) {
    notifications.push({
      title: `PPL FORCE — ${job.workout} ⏰`,
      body: `スヌーズ終了！今すぐ始めろ！`,
      workout: job.workout,
      notificationId: `snooze-${Date.now()}`
    });
  }
  if (dueJobs.length > 0) {
    await store.setJSON('snooze-jobs', allSnoozeJobs.filter(j => j.snoozeAt > nowIso));
  }

  // ─── 通常スケジュール確認 ───────────────────────────────────────────────
  const tasks = (await store.get('tasks', { type: 'json' }).catch(() => [])) ?? [];
  const todayDayEntry = daySchedules.find(s => s.day === currentDay);
  const todaySlots = (todayDayEntry?.slots ?? []).filter(sl => {
    if (!sl.enabled || sl.time !== currentTime) return false;
    const task = tasks.find(t => t.id === sl.taskId);
    return task && !task.isRest;
  });
  for (const sl of todaySlots) {
    const task = tasks.find(t => t.id === sl.taskId);
    notifications.push({
      title: `PPL FORCE — ${task.name}`,
      body: workoutMessage(task.name),
      workout: task.name,
      notificationId: `ppl-${currentDay}-${currentTime}-${sl.id}`
    });
  }

  // ─── 罰金チェック (23:00 JST) ─────────────────────────────────────────
  const penaltyHour = settings.penaltyHour ?? 23;
  if (currentHour === penaltyHour && currentMin === 0 && settings.penaltyEnabled) {
    const penaltySlots = (todayDayEntry?.slots ?? []).filter(sl => {
      if (!sl.enabled) return false;
      const task = tasks.find(t => t.id === sl.taskId);
      return task && !task.isRest;
    });
    if (penaltySlots.length > 0) {
      const log = await store.get(`workout-log-${todayKey}`, { type: 'json' }).catch(() => null);
      if (!log?.completed) {
        const firstTask = tasks.find(t => t.id === penaltySlots[0].taskId);
        const workoutName = firstTask?.name ?? 'タスク';
        // 未完了 → 罰金処理
        let penaltyUrl = null;
        if (process.env.STRIPE_SECRET_KEY && settings.penaltyAmount > 0) {
          try {
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            const session = await stripe.checkout.sessions.create({
              mode: 'payment',
              line_items: [{
                price_data: {
                  currency: 'jpy',
                  product_data: {
                    name: `PPL FORCE 罰金 — ${workoutName} (${todayKey})`,
                    description: 'サボった罰金。次こそやれ。'
                  },
                  unit_amount: settings.penaltyAmount
                },
                quantity: 1
              }],
              success_url: `${process.env.URL ?? 'http://localhost:8888'}/?payment=success`,
              cancel_url:  `${process.env.URL ?? 'http://localhost:8888'}/?payment=cancelled`,
              metadata: { workout: workoutName, date: todayKey }
            });
            penaltyUrl = session.url;
          } catch (e) {
            console.error('Stripe checkout作成失敗:', e.message);
          }
        }

        // LINE通知
        if (process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_USER_ID) {
          await sendLine(workoutName, false, null, penaltyUrl);
        }

        // Push通知
        notifications.push({
          title: `PPL FORCE — ⚠️ サボり検知`,
          body: `${workoutName}未完了。罰金が発生しました。`,
          workout: workoutName,
          notificationId: `penalty-${todayKey}`
        });
      }
    }
  }

  // ─── Push送信 ──────────────────────────────────────────────────────────
  if (notifications.length === 0 || subscriptions.length === 0) return { statusCode: 200 };

  const failedEndpoints = new Set();
  for (const payload of notifications) {
    const results = await Promise.allSettled(
      subscriptions.map(sub => webPush.sendNotification(sub, JSON.stringify(payload)))
    );
    results.forEach((r, i) => {
      if (r.status === 'rejected' && (r.reason?.statusCode === 410 || r.reason?.statusCode === 404)) {
        failedEndpoints.add(subscriptions[i].endpoint);
      }
    });
  }
  if (failedEndpoints.size > 0) {
    await store.setJSON('subscriptions', subscriptions.filter(s => !failedEndpoints.has(s.endpoint)));
  }

  console.log(`送信: ${notifications.length}件 / ${subscriptions.length}宛`);
  return { statusCode: 200 };
});

async function sendLine(workout, completed, duration, penaltyUrl) {
  const message = buildLineMessage(workout, completed, duration, penaltyUrl);
  try {
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({ to: process.env.LINE_USER_ID, messages: [message] })
    });
  } catch (e) {
    console.error('LINE送信失敗:', e.message);
  }
}

function buildLineMessage(workout, completed, duration, penaltyUrl) {
  if (completed) {
    return { type: 'text', text: `✅ PPL FORCE 完了！\n\n${workout} トレーニング完了\nお疲れ様でした💪` };
  }
  let text = `⚠️ PPL FORCE 未完了\n\n${workout} トレーニングが未完了です。\nサボりを検知しました！`;
  if (penaltyUrl) text += `\n\n💳 罰金リンク:\n${penaltyUrl}`;
  return { type: 'text', text };
}

function workoutMessage(w) {
  return {
    Push: '胸・肩・三頭筋！限界まで追い込め！',
    Pull: '背中・二頭筋！フォームを意識して！',
    Legs: '脚・臀部！スクワットで記録更新！'
  }[w] ?? `${w}トレーニングの時間！`;
}

function pad(n) { return String(n).padStart(2, '0'); }
