export const handler = async () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return {
      statusCode: 500,
      headers: cors(),
      body: JSON.stringify({ error: 'VAPID_PUBLIC_KEY が未設定です。npm run generate-vapid を実行してください。' })
    };
  }

  return {
    statusCode: 200,
    headers: cors(),
    body: JSON.stringify({ publicKey })
  };
};

function cors() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };
}
