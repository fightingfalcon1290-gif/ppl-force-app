import webPush from 'web-push';

const keys = webPush.generateVAPIDKeys();
console.log('\n=== VAPID Keys ===');
console.log('Netlify環境変数に以下を設定してください:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:your@email.com`);
console.log('\n==================\n');
